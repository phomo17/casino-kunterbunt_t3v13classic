<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Psr\Log\LoggerInterface;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

/**
 * Der Buchungsdienst (CONCEPT.md D.7).
 *
 * DER SERVER IST DIE ALLEINIGE WAHRHEIT (D.7.2). Der Browser schickt keinen
 * neuen Gesamtstand und auch keine fertigen Änderungsbeträge für einzelne
 * Töpfe, sondern einen VORGANG mit höchstens einem Betrag — „Einwurf 100",
 * „Einsatz 1", „Treffer". Welche der drei Zahlen sich dadurch wie ändern,
 * rechnet ausschließlich diese Klasse. Ein manipulierter Browser kann damit
 * keine Verrechnung erfinden, die es nicht gibt; er kann nur einen Vorgang
 * behaupten (was D.9 ausdrücklich hinnimmt).
 *
 * WARUM VORGÄNGE UND NICHT DREI DELTAS: mit Deltas müsste der Browser
 * wissen, dass ein eingelöster Leiter-Gewinn den Gewinnspeicher leert UND
 * den Gerätekredit erhöht — zwei Zahlen, die in derselben Buchung stimmen
 * müssen. Ein Vorgang „Gewinn 8" erledigt beides in einem Schritt, und das
 * Gesamtvermögen ist zu keinem Zeitpunkt falsch.
 */
final readonly class BookingService
{
    /** Höchststand jedes einzelnen Betrags — derselbe wie credit.js MAX_CREDITS. */
    public const MAX = 999999999;

    /** Alle Vorgänge. Was hier nicht steht, wird abgewiesen. */
    public const ARTEN = [
        'uebernahme', 'einwurf', 'auszahlung', 'einsatz', 'gewinn',
        'angebot', 'verdoppeln', 'verloren',
        'aufladen', 'abbuchen', 'setzen',
    ];

    /** Nur diese drei darf ein Admin, und nur ein Admin darf sie (D.7.3, D.9). */
    public const NUR_ADMIN = ['aufladen', 'abbuchen', 'setzen'];

    public function __construct(
        private ConnectionPool $connectionPool,
        private LoggerInterface $logger,
    ) {}

    /**
     * Führt einen Vorgang aus und liefert IMMER den Stand, den der Browser
     * anzeigen soll.
     *
     * @param int      $playerUid der Spielende der LAUFENDEN SITZUNG. Eine
     *                 Kennung aus dem Aufruf wird nie verwendet (D.9) —
     *                 diese Zahl kommt aus dem Anfragemerkmal, das QrGate
     *                 gesetzt hat.
     * @param string   $kunde  Kennung des schreibenden Browsers, 1–32 Zeichen
     * @param int      $nummer fortlaufende Nummer dieses Browsers, ab 1
     * @param string   $art    einer aus ARTEN
     * @param int|null $betrag ganze Zahl ab 0, oder null bei 'auszahlung' (= alles)
     *
     * @return array{ok: bool, grund?: string, kasse: int, geraet: int,
     *               gewinn: int, gesamt: int, bewegt: int, gekappt: bool,
     *               doppelt: bool}
     */
    public function buchen(int $playerUid, string $kunde, int $nummer, string $art, ?int $betrag): array
    {
        $connection = $this->connectionPool->getConnectionForTable(PlayerRepository::TABLE);
        $connection->beginTransaction();
        try {
            $zeile = $connection->executeQuery(
                'SELECT uid, balance_cash, balance_machine, balance_win, is_admin,'
                . ' booking_seq, booking_client FROM ' . PlayerRepository::TABLE
                . ' WHERE uid = ? AND deleted = 0 AND hidden = 0 FOR UPDATE',
                [$playerUid],
                [Connection::PARAM_INT]
            )->fetchAssociative();

            if ($zeile === false) {
                $connection->rollBack();
                return $this->absage('unbekannt', ['kasse' => 0, 'geraet' => 0, 'gewinn' => 0]);
            }

            $stand = [
                'kasse' => (int)$zeile['balance_cash'],
                'geraet' => (int)$zeile['balance_machine'],
                'gewinn' => (int)$zeile['balance_win'],
            ];

            // DOPPELT GESENDET? (D.7.2) — nur, wenn derselbe Browser dieselbe
            // oder eine ältere Nummer noch einmal schickt. Ein ANDERER Browser
            // zählt seine eigenen Nummern und wird nie fälschlich verworfen.
            if ($kunde === (string)$zeile['booking_client'] && $nummer <= (int)$zeile['booking_seq']) {
                $connection->commit();
                return $this->antwort(true, $stand, 0, false, true);
            }

            if (in_array($art, self::NUR_ADMIN, true) && (int)$zeile['is_admin'] !== 1) {
                $connection->rollBack();
                $this->logger->warning(
                    'Abgewiesen: Vorgang {art} ist Admins vorbehalten, Spielender {uid} ist keiner.',
                    ['art' => $art, 'uid' => $playerUid]
                );
                return $this->absage('kein_admin', $stand);
            }

            $ergebnis = $this->rechnen($art, $betrag, $stand);
            if ($ergebnis['ok'] === false) {
                $connection->rollBack();
                $this->logger->notice(
                    'Buchung abgewiesen: {art} über {betrag} für Spielenden {uid} — {grund}.',
                    ['art' => $art, 'betrag' => $betrag ?? 'alles', 'uid' => $playerUid, 'grund' => $ergebnis['grund']]
                );
                return $this->absage($ergebnis['grund'], $stand);
            }

            $connection->update(
                PlayerRepository::TABLE,
                [
                    'balance_cash' => $ergebnis['kasse'],
                    'balance_machine' => $ergebnis['geraet'],
                    'balance_win' => $ergebnis['gewinn'],
                    'booking_seq' => $nummer,
                    'booking_client' => $kunde,
                    'tstamp' => (int)($GLOBALS['EXEC_TIME'] ?? time()),
                ],
                ['uid' => $playerUid],
                [Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT,
                 Connection::PARAM_INT, Connection::PARAM_STR, Connection::PARAM_INT]
            );
            $connection->commit();

            return $this->antwort(true, $ergebnis, $ergebnis['bewegt'], $ergebnis['gekappt'], false);
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /**
     * Nur lesen — für den Abgleich (GET /stand) und für den Zustandsblock.
     *
     * @return array{ok: bool, grund?: string, kasse: int, geraet: int,
     *               gewinn: int, gesamt: int, bewegt: int, gekappt: bool,
     *               doppelt: bool}
     */
    public function stand(int $playerUid): array
    {
        $connection = $this->connectionPool->getConnectionForTable(PlayerRepository::TABLE);
        $zeile = $connection->executeQuery(
            'SELECT balance_cash, balance_machine, balance_win FROM ' . PlayerRepository::TABLE
            . ' WHERE uid = ? AND deleted = 0 AND hidden = 0',
            [$playerUid],
            [Connection::PARAM_INT]
        )->fetchAssociative();

        if ($zeile === false) {
            return $this->absage('unbekannt', ['kasse' => 0, 'geraet' => 0, 'gewinn' => 0]);
        }

        $stand = [
            'kasse' => (int)$zeile['balance_cash'],
            'geraet' => (int)$zeile['balance_machine'],
            'gewinn' => (int)$zeile['balance_win'],
        ];
        return $this->antwort(true, $stand, 0, false, false);
    }

    /**
     * Die ganze Verrechnung, an einer Stelle und ohne Datenbank.
     *
     * KEIN BETRAG KANN UNTER 0 FALLEN (D.7.2): jeder abbuchende Vorgang
     * prüft vorher und weist ab, statt zu kappen — dieselbe Zusage „alles
     * oder nichts", die credit.subtract() im Browser seit Ausbaustufe 2 gibt.
     * Jeder gutschreibende Vorgang kappt dagegen bei MAX und meldet das über
     * 'gekappt', damit nichts verschwindet, ohne dass es jemand erfährt
     * (Entscheidung vom 2026-09-02, „Ist die Kasse voll, bleibt der Rest im
     * Gerät stehen").
     *
     * @return array{ok:true, kasse:int, geraet:int, gewinn:int, bewegt:int, gekappt:bool}
     *              |array{ok:false, grund:string}
     */
    private function rechnen(string $art, ?int $betrag, array $stand): array
    {
        [$kasse, $geraet, $gewinn] = [$stand['kasse'], $stand['geraet'], $stand['gewinn']];

        return match ($art) {
            // Platz übernehmen: Gerätekredit UND Gewinnspeicher zurück in die
            // Kasse. Der EINZIGE Weg, auf dem ein nach einem Absturz stehen
            // gebliebener offener Gewinn wieder eingesammelt wird — deshalb
            // getrennt von 'auszahlung', das nur den Gerätekredit anfasst.
            // Gerufen wird er ausschließlich beim Öffnen eines Geräts
            // (machine-credit.js) — dieselbe Rolle wie claim() im Browser.
            'uebernahme' => $this->gutschrift($kasse, $geraet + $gewinn, 0, 0),

            'einwurf' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : ($kasse < $betrag ? $this->fehler('kasse_zu_gering')
                    : $this->umbuchen($kasse - $betrag, $geraet, $betrag, $gewinn)),

            // null = alles (CASH OUT), sonst ein Teilbetrag (ein Chip zurück).
            'auszahlung' => (function () use ($betrag, $kasse, $geraet, $gewinn) {
                $wunsch = $betrag ?? $geraet;
                if ($wunsch < 0 || $wunsch > $geraet) { return $this->fehler('geraet_zu_gering'); }
                $passt = min($wunsch, self::MAX - $kasse);
                return $this->fertig($kasse + $passt, $geraet - $passt, $gewinn, $passt, $passt < $wunsch);
            })(),

            'einsatz' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : ($geraet < $betrag ? $this->fehler('geraet_zu_gering')
                    : $this->fertig($kasse, $geraet - $betrag, $gewinn, $betrag, false)),

            // GUTSCHRIFT EINES GEWINNS. Sie leert den Gewinnspeicher zuerst:
            // ein Gewinn, der über die Risiko-Leiter gelaufen ist, steht dort
            // und darf nicht zweimal gezählt werden. Ohne Leiter ist der
            // Speicher 0 und es wird schlicht gutgeschrieben. Genau deshalb
            // braucht die Leiter für das Einlösen KEINE eigene Buchung —
            // Gewinnspeicher runter und Gerätekredit rauf geschehen in
            // derselben Zeile, das Gesamtvermögen stimmt lückenlos.
            'gewinn' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : (function () use ($betrag, $kasse, $geraet, $gewinn) {
                    $ausSpeicher = min($gewinn, $betrag);
                    $passt = min($betrag, self::MAX - $geraet);
                    return $this->fertig($kasse, $geraet + $passt, $gewinn - $ausSpeicher, $passt, $passt < $betrag);
                })(),

            'angebot' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : (function () use ($betrag, $kasse, $geraet, $gewinn) {
                    $passt = min($betrag, self::MAX - $gewinn);
                    return $this->fertig($kasse, $geraet, $gewinn + $passt, $passt, $passt < $betrag);
                })(),

            // Verdoppeln rechnet der SERVER, nicht der Browser (D.7.2). Er
            // sättigt bei MAX — die Leiter zeigt danach an, was der Server
            // zurückgegeben hat (Entscheidung 9.5).
            'verdoppeln' => $gewinn < 1 ? $this->fehler('kein_gewinn')
                : $this->fertig($kasse, $geraet, min($gewinn * 2, self::MAX), $gewinn, $gewinn * 2 > self::MAX),

            'verloren' => $this->fertig($kasse, $geraet, 0, $gewinn, false),

            'aufladen' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : (function () use ($betrag, $kasse, $geraet, $gewinn) {
                    $passt = min($betrag, self::MAX - $kasse);
                    return $this->fertig($kasse + $passt, $geraet, $gewinn, $passt, $passt < $betrag);
                })(),

            'abbuchen' => $betrag === null || $betrag < 1 ? $this->fehler('betrag')
                : ($kasse < $betrag ? $this->fehler('kasse_zu_gering')
                    : $this->fertig($kasse - $betrag, $geraet, $gewinn, $betrag, false)),

            // Das freie Setzen. DIESELBE REGEL WIE IM BACKEND (D.3.3): der
            // eingetragene Betrag ist das GESAMTVERMÖGEN und landet
            // vollständig in der Kasse, Gerätekredit und Gewinnspeicher gehen
            // auf 0. Zwei verschiedene Regeln für dieselbe Handlung an zwei
            // Bedienstellen wären eine Falle.
            'setzen' => $betrag === null || $betrag < 0 || $betrag > self::MAX ? $this->fehler('betrag')
                : $this->fertig(min($betrag, self::MAX), 0, 0, $betrag, false),

            default => $this->fehler('unbekannte_art'),
        };
    }

    /**
     * Bucht einen Betrag vollständig auf die Kasse, mit Kappung bei MAX —
     * genutzt für 'uebernahme' (Gerätekredit + Gewinnspeicher zurück in die
     * Kasse, $geraetNachher und $gewinnNachher stehen dafür beide auf 0).
     * Was nicht mehr in die Kasse passt, bleibt im GERÄT stehen (nicht im
     * Gewinnspeicher) — dieselbe Regel wie bei 'auszahlung'/'gewinn'
     * (Entscheidung vom 2026-09-02, „Ist die Kasse voll, bleibt der Rest im
     * Gerät stehen").
     *
     * @return array{ok:true, kasse:int, geraet:int, gewinn:int, bewegt:int, gekappt:bool}
     */
    private function gutschrift(int $kasse, int $betrag, int $geraetNachher, int $gewinnNachher): array
    {
        $passt = min($betrag, self::MAX - $kasse);
        $rest = $betrag - $passt;
        return $this->fertig($kasse + $passt, $geraetNachher + $rest, $gewinnNachher, $passt, $passt < $betrag);
    }

    /** Reine Umbuchung Kasse -> Gerät ohne Kappung (der Höchststand der Kasse schließt ein Überlaufen bereits aus). */
    private function umbuchen(int $kasse, int $geraet, int $bewegt, int $gewinn): array
    {
        return $this->fertig($kasse, $geraet + $bewegt, $gewinn, $bewegt, false);
    }

    /** @return array{ok:true, kasse:int, geraet:int, gewinn:int, bewegt:int, gekappt:bool} */
    private function fertig(int $kasse, int $geraet, int $gewinn, int $bewegt, bool $gekappt): array
    {
        return ['ok' => true, 'kasse' => $kasse, 'geraet' => $geraet, 'gewinn' => $gewinn, 'bewegt' => $bewegt, 'gekappt' => $gekappt];
    }

    /** @return array{ok:false, grund:string} */
    private function fehler(string $grund): array
    {
        return ['ok' => false, 'grund' => $grund];
    }

    /**
     * @param array{kasse:int, geraet:int, gewinn:int} $stand
     * @return array{ok: true, kasse: int, geraet: int, gewinn: int, gesamt: int,
     *               bewegt: int, gekappt: bool, doppelt: bool}
     */
    private function antwort(bool $ok, array $stand, int $bewegt, bool $gekappt, bool $doppelt): array
    {
        return [
            'ok' => $ok,
            'kasse' => $stand['kasse'],
            'geraet' => $stand['geraet'],
            'gewinn' => $stand['gewinn'],
            'gesamt' => $stand['kasse'] + $stand['geraet'] + $stand['gewinn'],
            'bewegt' => $bewegt,
            'gekappt' => $gekappt,
            'doppelt' => $doppelt,
        ];
    }

    /**
     * @param array{kasse:int, geraet:int, gewinn:int} $stand
     * @return array{ok: false, grund: string, kasse: int, geraet: int, gewinn: int,
     *               gesamt: int, bewegt: int, gekappt: bool, doppelt: bool}
     */
    private function absage(string $grund, array $stand): array
    {
        return [
            'ok' => false,
            'grund' => $grund,
            'kasse' => $stand['kasse'],
            'geraet' => $stand['geraet'],
            'gewinn' => $stand['gewinn'],
            'gesamt' => $stand['kasse'] + $stand['geraet'] + $stand['gewinn'],
            'bewegt' => 0,
            'gekappt' => false,
            'doppelt' => false,
        ];
    }
}
