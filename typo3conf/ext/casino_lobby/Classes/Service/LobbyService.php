<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Service;

use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoLobby\Domain\Lobby;
use Phomo17\CasinoLobby\Domain\LobbyRepository;
use Phomo17\CasinoLobby\Domain\Seat;
use Phomo17\CasinoLobby\Lobby\LobbyGames;
use Psr\Log\LoggerInterface;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

/**
 * Die Lobbyverwaltung (CONCEPT.md D.10.3, D.10.4, D.10.5, D.10.6).
 *
 * Alles, was diese Abschnitte an Verhalten verlangen, steht hier — und NUR
 * hier. Middleware und Endpunkt (Umsetzungsstück D4b) rufen auf, entscheiden
 * aber nichts. Derselbe Schnitt wie BookingService in casino_account, der
 * aus demselben Grund alles Rechnen an sich gezogen hat.
 *
 * SICHERHEIT (D.9, siehe 4.17.7 des Plans): der Spielende kommt in jeder
 * Methode dieser Klasse als bereits aufgelöstes Player-Objekt aus der
 * laufenden Sitzung. Keine Methode nimmt eine Kennung, eine player-Nummer
 * oder einen Namen aus einer Anfrage entgegen — der einzige Bezeichner, den
 * ein Aufruf mitbringen darf, ist die Lobby-Nummer beim Beitreten, und die
 * ist keine Person, sondern ein öffentlicher Tisch. Das Wort 'role' kommt in
 * dieser Extension nicht vor (Teil E).
 */
final readonly class LobbyService
{
    public function __construct(
        private ConnectionPool $connectionPool,
        private LobbyRepository $lobbies,
        private LoggerInterface $logger,
    ) {}

    /**
     * Das Kehrblech: läuft am Anfang jeder Handlung und jeder Abfrage dieses
     * Spiels (D.10.3, D.10.5, D.10.6). Zieht alle Lobbys eines Spiels nach.
     */
    public function aufraeumen(string $spiel, int $jetzt): void
    {
        foreach ($this->lobbies->findByGame($spiel) as $lobby) {
            $this->aufraeumenEinzeln($lobby->uid, $jetzt);
        }
    }

    /**
     * Räumt genau eine Lobby auf, mit Zeilensperre in eigener Transaktion.
     *
     * Vier Schritte (siehe Plan, Abschnitt 4.17.1):
     *   1. Zustandswechsel nachziehen — beim Blackjack ERST die abgelaufene
     *      Frist EINES Platzes (1a, zugWeiterschalten()), NUR wenn die nicht
     *      zutrifft der allgemeine Wechsel samt echter Notbremse
     *      (1b, RoundClock::faellig()) — Behebungslauf D5-4, siehe dortiger
     *      Kommentar: beide Fristen leben in derselben Spalte state_until,
     *      und RoundClock::faellig() kann sie nicht unterscheiden.
     *   2. Abgelaufene Plätze entfernen — nur, wenn RoundClock::fristLaeuft().
     *   3. Wird die Lobby dabei leer, wird sie gelöscht (D.10.3).
     *   4. Bleibt genau ein Platz übrig und lief eine Uhr, wird sie angehalten.
     */
    private function aufraeumenEinzeln(int $lobbyUid, int $jetzt): void
    {
        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $lobby = $this->lobbies->lockByUid($connection, $lobbyUid);
            if ($lobby === null) {
                $connection->commit();
                return;
            }

            $besetzt = count($this->lobbies->seatsOf($lobby->uid));
            $revision = $lobby->revision;
            $state = $lobby->state;
            $stateUntil = $lobby->stateUntil;

            // 1a. Blackjack: die 20 Sekunden EINES PLATZES sind um — GEPRÜFT
            //    VOR dem allgemeinen Zustandswechsel (Schritt 1b unten).
            //
            //    BEHEBUNGSLAUF, GEFUNDEN AM GEGENSTAND (probe-lobby-blackjack.mjs,
            //    live mit zwei echten Browsern; ausführlich in DECISIONS.md):
            //    state_until trägt beim Blackjack ZWEI verschiedene Fristen in
            //    derselben Spalte — die 20 Sekunden EINES Platzes (turn_seat > 0)
            //    UND, sobald turn_seat wieder 0 ist, die allgemeine "niemand hat
            //    ein Ergebnis gemeldet"-Notbremse (Plan 4.1, Kommentar zu
            //    turn_seat: "dieselbe Spalte, dieselbe Bedeutung"). RoundClock::
            //    faellig() ist eine REINE Funktion, die keine Plätze kennt und
            //    beide Fälle deshalb nicht unterscheiden kann — sie behandelte
            //    JEDE abgelaufene Einzelplatz-Frist als hätte niemand ein
            //    Ergebnis gemeldet und brach die ganze Runde zur Setzzeit ab,
            //    OHNE je zum nächsten Platz weiterzuschalten (state wechselte
            //    in Schritt 2 sofort zu SETZEN, wodurch die anschließende
            //    Prüfung "$state === RoundClock::LAEUFT" nie mehr zutraf). Die
            //    Reihenfolge hier löst das: läuft GENAU die Einzelplatz-Frist
            //    ab (turn_seat > 0), wird ausschließlich weitergeschaltet: die
            //    allgemeine Prüfung (und mit ihr die echte Notbremse, die beim
            //    Blackjack erst greift, sobald turn_seat wieder 0 ist) läuft
            //    für diesen Umlauf dann bewusst NICHT — state_until wurde gerade
            //    erst neu gesetzt und wäre ohnehin nicht abgelaufen.
            if ($state === RoundClock::LAEUFT
                && $lobby->game === 'blackjack'
                && $lobby->turnSeat > 0
                && $stateUntil > 0 && $jetzt >= $stateUntil
            ) {
                $revision++;
                $this->zugWeiterschalten($lobby, 's', $jetzt, $revision);
            } else {
                // 1b. Allgemeiner Zustandswechsel — einschließlich der echten
                //    Notbremse (niemand hat 'ergebnis' gemeldet; beim
                //    Blackjack erst relevant, sobald turn_seat bereits 0 ist,
                //    siehe Schritt 1a oben).
                $schritt = RoundClock::faellig($state, $stateUntil, $jetzt, $besetzt, $lobby->game);
                if ($schritt !== null) {
                    $revision++;
                    $werte = [
                        'state' => $schritt['zustand'],
                        'state_until' => $schritt['bis'],
                        'revision' => $revision,
                    ];
                    if ($schritt['saat']) {
                        $werte['seed'] = bin2hex(random_bytes(8));
                    }
                    if ($schritt['runde']) {
                        $werte['round_no'] = $lobby->roundNo + 1;
                        // Anhang I: „Wird nach der Auswertung nicht aufbewahrt."
                        $this->lobbies->deleteBetsBefore($lobby->uid, $lobby->roundNo + 1);
                    }
                    if ($schritt['zuege']) {
                        $werte['moves'] = '';
                        $werte['turn_seat'] = 0;
                    }
                    if ($schritt['zug']) {
                        // Der erste Platz, der in dieser Runde gefragt wird: der
                        // kleinste, der VOR dem Rundenbeginn schon saß. Wer
                        // mitten in der Setzzeit dazukam (joined_round === der
                        // laufenden Runde), spielt erst ab der nächsten mit —
                        // seine Karten wären sonst Teil einer Kartenfolge, die
                        // die anderen bereits ohne ihn gerechnet haben.
                        $werte['turn_seat'] = RoundClock::naechsterZug($this->zugNummern($lobby), 0);
                    }
                    $this->lobbies->updateLobby($lobby->uid, $werte);
                    $state = $schritt['zustand'];
                    $stateUntil = $schritt['bis'];
                }
            }

            // 2. Abgelaufene Plätze entfernen — nur, solange die Frist läuft.
            if (RoundClock::fristLaeuft($state)) {
                $abgelaufen = $this->lobbies->staleSeats($lobby->uid, $jetzt - RoundClock::FRIST);
                foreach ($abgelaufen as $seat) {
                    // „Wer mitten in einer Runde geht, verliert seine
                    // gesetzten Einsätze" (D.10.3). Das GELD ist dabei
                    // längst weg — es steckt seit dem Ablegen des Chips
                    // nicht mehr im Gerätekredit (table-buyin.js). Diese
                    // Zeile löscht nur die ANZEIGE, damit an einem leeren
                    // Platz keine Einsätze mehr liegen. Sie ist ausdrücklich
                    // KEINE Rückbuchung.
                    $this->lobbies->deleteBetsOfPlayer($lobby->uid, $seat->player);
                    $this->lobbies->deleteSeat($seat->uid);
                    $besetzt--;
                    $revision++;
                }
                if ($abgelaufen !== []) {
                    $this->lobbies->updateLobby($lobby->uid, ['revision' => $revision]);
                }
            }

            // 3. Leere Lobby schließt sich von selbst (D.10.3).
            if ($besetzt <= 0) {
                $this->lobbies->deleteLobby($lobby->uid);
                $connection->commit();
                return;
            }

            // 4. Genau eine Person übrig, Uhr lief: anhalten.
            if ($besetzt === 1 && $state === RoundClock::SETZEN && $stateUntil > 0) {
                $this->lobbies->updateLobby($lobby->uid, ['state_until' => 0]);
            }

            $connection->commit();
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /**
     * Die Platznummern, die in der laufenden Runde beim Blackjack gefragt
     * werden: alle, die vor Rundenbeginn saßen, aufsteigend.
     *
     * @return list<int>
     */
    private function zugNummern(Lobby $lobby): array
    {
        $nummern = [];
        foreach ($this->lobbies->seatsOf($lobby->uid) as $platz) {
            if ($platz->joinedRound < $lobby->roundNo) {
                $nummern[] = $platz->seatNo;
            }
        }
        sort($nummern);
        return $nummern;
    }

    /**
     * Hängt einen Zug an das Protokoll und schaltet auf den nächsten Platz
     * weiter. Ist keiner mehr übrig, endet die Entscheidungsreihe: turn_seat
     * wird 0 und state_until auf die Notbremse gesetzt — ab hier zieht der
     * Geber, und der Melder schreibt das Ergebnis fest.
     *
     * DER EINE ORT, AN DEM DAS PROTOKOLL WÄCHST. Ob der Zug vom Browser kam
     * (zug()) oder von der abgelaufenen Frist (aufraeumenEinzeln()), spielt
     * hier keine Rolle mehr — und genau deshalb kann kein Weg das
     * Weiterschalten vergessen.
     */
    private function zugWeiterschalten(Lobby $lobby, string $buchstabe, int $jetzt, int $revision): void
    {
        $moves = $lobby->moves . $lobby->turnSeat . $buchstabe;
        $naechster = RoundClock::naechsterZug($this->zugNummern($lobby), $lobby->turnSeat);

        $this->lobbies->updateLobby($lobby->uid, [
            'moves' => substr($moves, 0, 255),
            'turn_seat' => $naechster,
            'state_until' => $naechster > 0
                ? $jetzt + RoundClock::ZUGZEIT
                : $jetzt + RoundClock::LAUFFRIST,
            'revision' => $revision,
        ]);
    }

    /** Wer hält die Würfel? Kleinste Wartelistennummer > 0; sonst der kleinste Platz. @param list<Seat> $sitzende */
    private function shooterNummer(array $sitzende): int
    {
        $warteliste = [];
        foreach ($sitzende as $platz) {
            if ($platz->shooterNo > 0) {
                $warteliste[$platz->shooterNo] = $platz->seatNo;
            }
        }
        if ($warteliste !== []) {
            ksort($warteliste);
            return (int)reset($warteliste);
        }
        // EIGENE FESTLEGUNG (siehe Abschnitt 9): trägt sich niemand ein,
        // hält der kleinste besetzte Platz die Würfel. An einem echten Tisch
        // muss jemand werfen; ein Tisch ohne Shooter wäre ein Tisch, an dem
        // sich nichts bewegt, bis sich jemand einträgt.
        return $this->melderNummer($sitzende);
    }

    /**
     * Der Browser meldet, was gerade auf seinem Tuch liegt (D.10.6: „Jeder
     * sieht in Echtzeit, was die anderen setzen").
     *
     * DIE LOBBY BUCHT NICHTS (D.10.7). Diese Methode schreibt eine
     * ANZEIGEZEILE, kein Geld. Der Betrag ist zu diesem Zeitpunkt längst
     * über den Buchungsendpunkt aus D.7 aus dem Gerätekredit heraus — die
     * Einsatztabelle erfährt nur davon, damit die anderen am Tisch es sehen.
     * Wer hier eine Buchung einbaut, hat den zweiten Geldweg gebaut, den
     * D.10.7 ausschließt.
     *
     * WARUM DAS KEINE BETRUGSFLÄCHE IST: gemeldet wird ausschließlich, was
     * andere ANGEZEIGT bekommen. Ein erfundener Betrag kostet den Erfinder
     * nichts und bringt ihm nichts — sein eigener Gewinn wird aus seinem
     * eigenen Gerätekredit gerechnet, den der Server führt (D.7.2). Die
     * Grenzen unten sind deshalb keine Geldgrenzen, sondern Größen- und
     * Formgrenzen für eine Anzeige.
     *
     * @param list<array{feld: string, betrag: int}> $felder
     * @return array{ok:true}|array{ok:false, grund:string}
     */
    public function einsatz(Player $spielender, int $runde, array $felder, int $jetzt): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }
        $lobby = $this->lobbies->findByUid($platz->lobby);
        if ($lobby === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }
        // Nur während der Setzzeit, und nur für die laufende Runde. Danach
        // ist gesperrt: „nichts mehr dazulegen, nichts mehr zurücknehmen"
        // (D.10.6).
        if ($lobby->state !== RoundClock::SETZEN || $runde !== $lobby->roundNo) {
            return ['ok' => false, 'grund' => 'zu_spaet'];
        }

        $this->lobbies->replaceBets($lobby->uid, $spielender->uid, $lobby->roundNo, $felder);
        $this->lobbies->updateLobby($lobby->uid, ['revision' => $lobby->revision + 1]);
        $this->lobbies->touchSeat($platz->uid, $jetzt);
        return ['ok' => true];
    }

    /**
     * Nach der eigenen Abrechnung: was ist aus jedem eigenen Feld geworden.
     * Reine Anzeige für die Platzleiste der anderen („was die anderen
     * gewinnen", D.10.6) — wieder ohne jede Buchung.
     *
     * @param array<string, int> $ausgaenge Feldname => Ausgang, darf negativ sein
     * @return array{ok:true}|array{ok:false, grund:string}
     */
    public function bilanz(Player $spielender, int $runde, array $ausgaenge): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }
        $lobby = $this->lobbies->findByUid($platz->lobby);
        if ($lobby === null || $runde !== $lobby->roundNo) {
            return ['ok' => false, 'grund' => 'zu_spaet'];
        }
        $this->lobbies->settleBets($lobby->uid, $spielender->uid, $runde, $ausgaenge);
        $this->lobbies->updateLobby($lobby->uid, ['revision' => $lobby->revision + 1]);
        return ['ok' => true];
    }

    /**
     * Eine Blackjack-Entscheidung (D.10.6). Nur vom gefragten Platz, nur im
     * Zustand 'laeuft', nur für die laufende Runde.
     *
     * ZWEI DINGE IN EINEM AUFRUF, und das ist Absicht: der Buchstabe (welche
     * Entscheidung) und die Angabe, ob der Platz damit fertig ist. „Karte"
     * beendet den Zug nicht, „stehen" und „verdoppeln" schon, „teilen" nicht
     * — welche das sind, weiß das Regelmodul im Browser, nicht der Server.
     * Der Server ist hier bewusst dumm: er führt Protokoll und schaltet
     * weiter, er spielt nicht mit. Dieselbe Aufteilung wie bei D.10.4, wo er
     * das Ergebnis festschreibt, ohne es nachrechnen zu können.
     *
     * @param string $buchstabe genau EIN Zeichen aus ZUEGE
     * @return array{ok:true, t:int}|array{ok:false, grund:string}
     */
    public function zug(Player $spielender, int $runde, string $buchstabe, bool $fertig, int $jetzt): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }

        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $lobby = $this->lobbies->lockByUid($connection, $platz->lobby);
            if ($lobby === null || $lobby->game !== 'blackjack'
                || $lobby->state !== RoundClock::LAEUFT || $runde !== $lobby->roundNo) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'unpassend'];
            }
            if ($lobby->turnSeat !== $platz->seatNo) {
                return $this->abbrechen($connection, 'nicht_dran');
            }
            if (strlen($lobby->moves) >= 250) {
                // Das Protokoll ist voll. Statt es überlaufen zu lassen wird
                // der Platz gestanden — ein abgeschnittenes Protokoll ließe
                // alle Browser ab dieser Stelle andere Karten ziehen.
                $this->zugWeiterschalten($lobby, 's', $jetzt, $lobby->revision + 1);
                $connection->commit();
                return ['ok' => false, 'grund' => 'zu_lang'];
            }

            if ($fertig) {
                $this->zugWeiterschalten($lobby, $buchstabe, $jetzt, $lobby->revision + 1);
            } else {
                $this->lobbies->updateLobby($lobby->uid, [
                    'moves' => $lobby->moves . $lobby->turnSeat . $buchstabe,
                    // Die Frist beginnt bei jeder Entscheidung neu: wer eine
                    // Karte nimmt, bekommt wieder 20 Sekunden für die
                    // nächste. Alles andere wäre eine Runde, in der die
                    // dritte Karte nicht mehr überlegt werden darf.
                    'state_until' => $jetzt + RoundClock::ZUGZEIT,
                    'revision' => $lobby->revision + 1,
                ]);
            }
            $this->lobbies->touchSeat($platz->uid, $jetzt);
            $connection->commit();

            $neu = $this->lobbies->findByUid($lobby->uid);
            return ['ok' => true, 't' => $neu?->turnSeat ?? 0];
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /** @return array{ok:false, grund:string} */
    private function abbrechen(Connection $connection, string $grund): array
    {
        $connection->rollBack();
        return ['ok' => false, 'grund' => $grund];
    }

    /**
     * Ein- und Austragen in die Shooter-Warteliste (D.10.6: „Wer Shooter sein
     * will, trägt sich ein; bis er dran ist, setzt er auf die Würfe der
     * anderen.").
     *
     * Die Nummer ist die Reihenfolge des Eintragens, nicht die Platznummer.
     * Wer sich austrägt, bekommt 0; die Nummern der anderen bleiben stehen,
     * weil nur ihre REIHENFOLGE zählt und ein Nachrücken aller Nummern eine
     * zweite Wahrheit über dieselbe Reihenfolge wäre.
     *
     * @return array{ok:true, nr:int}|array{ok:false, grund:string}
     */
    public function shooter(Player $spielender, bool $ein): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }
        $lobby = $this->lobbies->findByUid($platz->lobby);
        if ($lobby === null || $lobby->game !== 'craps') {
            return ['ok' => false, 'grund' => 'unpassend'];
        }

        $nummer = 0;
        if ($ein) {
            $hoechste = 0;
            foreach ($this->lobbies->seatsOf($lobby->uid) as $s) {
                $hoechste = max($hoechste, $s->shooterNo);
            }
            $nummer = $hoechste + 1;
        }
        $this->lobbies->setShooterNo($platz->uid, $nummer);
        $this->lobbies->updateLobby($lobby->uid, ['revision' => $lobby->revision + 1]);
        return ['ok' => true, 'nr' => $nummer];
    }

    /**
     * Die Umsetzung von D.10.3, gerufen von LobbyTable (D4b).
     *
     * @return array{sitzt: true, platz: Seat, lobby: Lobby}|array{sitzt: false, lobbys: list<Lobby>}
     */
    public function platzHolen(Player $spielender, string $spiel, int $jetzt): array
    {
        $this->aufraeumen($spiel, $jetzt);

        $vorhandenerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($vorhandenerPlatz !== null) {
            $vorhandeneLobby = $this->lobbies->findByUid($vorhandenerPlatz->lobby);
            if ($vorhandeneLobby !== null && $vorhandeneLobby->game === $spiel) {
                return ['sitzt' => true, 'platz' => $vorhandenerPlatz, 'lobby' => $vorhandeneLobby];
            }

            // Ein anderes Spiel: der Platz wird freigegeben — eine Person
            // steht immer nur an einem Gerät (D.7.2), und UNIQUE KEY player
            // hält das ohnehin fest. Besser eine ausdrückliche Freigabe als
            // ein Schlüsselfehler.
            $this->lobbies->deleteSeatsOfPlayer($spielender->uid);
            if ($vorhandeneLobby !== null) {
                $this->lobbies->updateLobby($vorhandeneLobby->uid, ['revision' => $vorhandeneLobby->revision + 1]);
            }
        }

        $lobbys = $this->lobbies->findByGame($spiel);
        if ($lobbys === []) {
            // „Wer ein Lobbyspiel öffnet und findet keine Lobby vor,
            // eröffnet automatisch eine." (D.10.3)
            $eroeffnung = $this->eroeffnen($spiel, $spielender, $jetzt);
            if ($eroeffnung['ok']) {
                return ['sitzt' => true, 'platz' => $eroeffnung['platz'], 'lobby' => $eroeffnung['lobby']];
            }
            return ['sitzt' => false, 'lobbys' => []];
        }

        return ['sitzt' => false, 'lobbys' => $lobbys];
    }

    /**
     * Eröffnet eine neue Lobby und besetzt Platz 1 mit der eröffnenden
     * Person (D.10.3).
     *
     * BEHOBENER FEHLER (Protokollfund 2026-09-11, 07:15:12):
     * UNIQUE KEY player auf tx_casinolobby_seat lässt nur einen Platz je
     * Person im ganzen Haus zu (ext_tables.sql), aber weder diese Methode
     * noch beitreten() prüften das VOR dem Einfügen — die Datenbank hielt
     * die Zusage, der Dienst warf die Ausnahme ungefangen bis zum
     * Middleware-Dispatcher durch: HTTP 500 statt einer Absage.
     *
     * ZWEI ABSICHERUNGEN, nicht nur eine:
     *   1. Der ordentliche Weg — eine Prüfung INNERHALB der Transaktion,
     *      vor jedem Schreibversuch: sitzt die Person schon, wird gar nicht
     *      erst versucht einzufügen.
     *   2. Der Wettlauf-Weg — zwei nahezu gleichzeitige Anfragen derselben
     *      Person können BEIDE die Prüfung aus (1) bestehen, bevor die
     *      erste geschrieben hat (klassisches TOCTOU, unvermeidbar ohne
     *      eine Sperre auf eine noch gar nicht existierende Zeile). Hier
     *      entscheidet allein die Datenbank, und die zweite Anfrage fängt
     *      UniqueConstraintViolationException ab, statt sie weiterzureichen
     *      — dieselbe Bauart wie CoinFieldRepository::save() in
     *      casino_account.
     *
     * DIE ANTWORT, WENN SIE SCHON SITZT — zwei Fälle, bewusst
     * unterschiedlich beantwortet (Auftrag vom 2026-09-11):
     *   - sitzt sie bereits an einem Tisch DIESES Spiels: ok:true mit ihrem
     *     TATSÄCHLICHEN Platz. lobby-live.js schickt beim Wiederaufwachen
     *     (Registerkartenwechsel, Netzwiederkehr) durchaus einen zweiten
     *     'eroeffnen'/'beitreten' — das ist dann kein Fehler, sondern der
     *     aktuelle Stand.
     *   - sitzt sie an einem ANDEREN Spiel: ok:false, grund:
     *     'bereits_andernorts'. Ein automatischer Umzug wäre hier falsch:
     *     das ist Aufgabe von platzHolen() beim Seitenaufruf (D.7.2, „eine
     *     Person steht immer nur an einem Gerät"), nicht die einer
     *     ausdrücklichen API-Handlung, die ihren eigenen Zieltisch nennt.
     *
     * @return array{ok:true, lobby:Lobby, platz:Seat}|array{ok:false, grund:string}
     */
    public function eroeffnen(string $spiel, Player $spielender, int $jetzt): array
    {
        if (!LobbyGames::kennt($spiel)) {
            return ['ok' => false, 'grund' => 'unbekanntes_spiel'];
        }

        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $vorhandenerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
            if ($vorhandenerPlatz !== null) {
                $connection->rollBack();
                return $this->antwortSitztSchonFuerSpiel($vorhandenerPlatz, $spiel);
            }

            $vorhandene = $this->lobbies->findByGame($spiel);
            if (count($vorhandene) >= LobbyGames::MAX_LOBBYS) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'zu_viele'];
            }

            $plaetze = LobbyGames::plaetze($spiel);
            $lobbyUid = $this->lobbies->insertLobby($spiel, $plaetze, $spielender->uid, $jetzt);
            $this->lobbies->insertSeat($lobbyUid, $spielender->uid, 1, 0, $jetzt);
            $connection->commit();
        } catch (UniqueConstraintViolationException) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            $vorhandenerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
            if ($vorhandenerPlatz === null) {
                // Nach einer UNIQUE-Verletzung praktisch ausgeschlossen —
                // trotzdem ein sauberer Ausgang statt eines Rätsels.
                return ['ok' => false, 'grund' => 'unbekannt'];
            }
            return $this->antwortSitztSchonFuerSpiel($vorhandenerPlatz, $spiel);
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }

        $lobby = $this->lobbies->findByUid($lobbyUid);
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($lobby === null || $platz === null) {
            // Nach einem erfolgreichen COMMIT praktisch ausgeschlossen;
            // sauberer Abbruch statt eines stillen Fehlers.
            return ['ok' => false, 'grund' => 'unbekannt'];
        }
        return ['ok' => true, 'lobby' => $lobby, 'platz' => $platz];
    }

    /**
     * Baut die Antwort für eroeffnen(), wenn die Person bereits einen Platz
     * hat: ok:true mit ihrem tatsächlichen Platz, wenn der zu einem Tisch
     * DIESES Spiels gehört, sonst ok:false mit grund:'bereits_andernorts'.
     * Siehe Klassenkommentar von eroeffnen() für die Begründung.
     *
     * @return array{ok:true, lobby:Lobby, platz:Seat}|array{ok:false, grund:string}
     */
    private function antwortSitztSchonFuerSpiel(Seat $vorhandenerPlatz, string $spiel): array
    {
        $vorhandeneLobby = $this->lobbies->findByUid($vorhandenerPlatz->lobby);
        if ($vorhandeneLobby !== null && $vorhandeneLobby->game === $spiel) {
            return ['ok' => true, 'lobby' => $vorhandeneLobby, 'platz' => $vorhandenerPlatz];
        }
        return ['ok' => false, 'grund' => 'bereits_andernorts'];
    }

    /**
     * Tritt einer bestehenden Lobby bei: kleinste freie Platznummer,
     * joined_round auf die laufende Rundennummer, Stand-Nummer erhöht, Uhr
     * nach RoundClock nachgezogen.
     *
     * BEHOBENER FEHLER (Protokollfund 2026-09-11, 07:15:12) — dieselbe
     * Lücke und dieselbe zweifache Absicherung wie in eroeffnen(), dessen
     * Klassenkommentar die Begründung im Einzelnen trägt: eine ordentliche
     * Prüfung VOR dem Einfügen (der Normalfall) plus ein Auffangen von
     * UniqueConstraintViolationException für den echten Wettlauf zweier
     * nahezu gleichzeitiger Anfragen.
     *
     * DIE ANTWORT, WENN SIE SCHON SITZT: sitzt sie bereits GENAU AN DIESER
     * Lobby-Nummer, ist das kein Fehler — ok:true mit ihrem tatsächlichen
     * Platz (derselbe Grund wie bei eroeffnen(): ein zweiter 'beitreten'
     * beim Wiederaufwachen ist der Normalfall, nicht die Ausnahme). Sitzt
     * sie an einer ANDEREN Lobby (egal welchen Spiels), ist es eine Absage
     * mit grund:'bereits_andernorts' — kein stillschweigender Umzug.
     *
     * @return array{ok:true, lobby:Lobby, platz:Seat}|array{ok:false, grund:string}
     */
    public function beitreten(int $lobbyUid, Player $spielender, int $jetzt): array
    {
        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $vorhandenerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
            if ($vorhandenerPlatz !== null) {
                $connection->rollBack();
                return $this->antwortSitztSchonFuerLobby($vorhandenerPlatz, $lobbyUid);
            }

            $lobby = $this->lobbies->lockByUid($connection, $lobbyUid);
            if ($lobby === null) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'unbekannt'];
            }

            $sitzende = $this->lobbies->seatsOf($lobby->uid);
            $belegteNummern = array_map(static fn (Seat $s) => $s->seatNo, $sitzende);

            $freieNummer = null;
            for ($nr = 1; $nr <= $lobby->seatsMax; $nr++) {
                if (!in_array($nr, $belegteNummern, true)) {
                    $freieNummer = $nr;
                    break;
                }
            }
            if ($freieNummer === null) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'voll'];
            }

            $this->lobbies->insertSeat($lobby->uid, $spielender->uid, $freieNummer, $lobby->roundNo, $jetzt);

            $besetzt = count($sitzende) + 1;
            $werte = ['revision' => $lobby->revision + 1];
            if ($lobby->state === RoundClock::SETZEN) {
                $neueUhr = RoundClock::setzUhr($jetzt, $besetzt);
                if ($neueUhr !== $lobby->stateUntil) {
                    $werte['state_until'] = $neueUhr;
                }
            }
            $this->lobbies->updateLobby($lobby->uid, $werte);

            $connection->commit();
        } catch (UniqueConstraintViolationException) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            $vorhandenerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
            if ($vorhandenerPlatz === null) {
                return ['ok' => false, 'grund' => 'unbekannt'];
            }
            return $this->antwortSitztSchonFuerLobby($vorhandenerPlatz, $lobbyUid);
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }

        $neuerPlatz = $this->lobbies->seatOfPlayer($spielender->uid);
        $neueLobby = $this->lobbies->findByUid($lobbyUid);
        if ($neuerPlatz === null || $neueLobby === null) {
            return ['ok' => false, 'grund' => 'unbekannt'];
        }
        return ['ok' => true, 'lobby' => $neueLobby, 'platz' => $neuerPlatz];
    }

    /**
     * Baut die Antwort für beitreten(), wenn die Person bereits einen Platz
     * hat: ok:true mit ihrem tatsächlichen Platz, wenn er zu GENAU DIESER
     * Lobby-Nummer gehört, sonst ok:false mit grund:'bereits_andernorts'.
     * Siehe beitreten()-Kommentar für die Begründung.
     *
     * @return array{ok:true, lobby:Lobby, platz:Seat}|array{ok:false, grund:string}
     */
    private function antwortSitztSchonFuerLobby(Seat $vorhandenerPlatz, int $lobbyUid): array
    {
        if ($vorhandenerPlatz->lobby === $lobbyUid) {
            $vorhandeneLobby = $this->lobbies->findByUid($lobbyUid);
            if ($vorhandeneLobby !== null) {
                return ['ok' => true, 'lobby' => $vorhandeneLobby, 'platz' => $vorhandenerPlatz];
            }
        }
        return ['ok' => false, 'grund' => 'bereits_andernorts'];
    }

    /**
     * Verlässt den eigenen Platz. Ist die weggehende Person der owner,
     * bleibt die Lobby bestehen — wer meldet, hängt nicht am Eröffner
     * (siehe ergebnis()). Wird die Lobby dabei leer, schließt sie sich
     * (D.10.3).
     */
    public function verlassen(Player $spielender): void
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return;
        }

        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $lobby = $this->lobbies->lockByUid($connection, $platz->lobby);
            // „Wer mitten in einer Runde geht, verliert seine gesetzten
            // Einsätze" (D.10.3). Das GELD ist dabei längst weg — es steckt
            // seit dem Ablegen des Chips nicht mehr im Gerätekredit
            // (table-buyin.js). Diese Zeile löscht nur die ANZEIGE, damit
            // an einem leeren Platz keine Einsätze mehr liegen. Sie ist
            // ausdrücklich KEINE Rückbuchung.
            $this->lobbies->deleteBetsOfPlayer($platz->lobby, $spielender->uid);
            $this->lobbies->deleteSeat($platz->uid);

            if ($lobby !== null) {
                $verbleibend = count($this->lobbies->seatsOf($lobby->uid));
                if ($verbleibend <= 0) {
                    $this->lobbies->deleteLobby($lobby->uid);
                } else {
                    $this->lobbies->updateLobby($lobby->uid, ['revision' => $lobby->revision + 1]);
                }
            }

            $connection->commit();
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /**
     * Die Abfrage (D.10.5) — der meistgerufene Weg des ganzen Systems.
     * Deshalb genau so knapp wie möglich: Platz laden, aufräumen, Lobby und
     * Plätze laden, Lebenszeichen höchstens alle 5 Sekunden schreiben,
     * Antwort bauen.
     *
     * @return array{weg:1}|array{r:int, z:string, rest:int, n:int, runde:int, m:int,
     *               saat:string, erg:string, ergR:int, t:int, mv:string, w:int,
     *               p:list<array{s:int,v:string,i?:int,sn?:int,e?:int,o?:int,f?:list<array{f:string,b:int}>}>}
     */
    public function stand(Player $spielender, int $jetzt): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['weg' => 1];
        }

        $lobby = $this->lobbies->findByUid($platz->lobby);
        if ($lobby === null) {
            return ['weg' => 1];
        }

        $this->aufraeumenEinzeln($lobby->uid, $jetzt);

        // Nach dem Aufräumen kann sich der eigene Platz aufgelöst haben
        // (30-Sekunden-Frist, oder die Lobby wurde leer und gelöscht).
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['weg' => 1];
        }
        $lobby = $this->lobbies->findByUid($platz->lobby);
        if ($lobby === null) {
            return ['weg' => 1];
        }

        if ($jetzt - $platz->lastSeen >= 5) {
            $this->lobbies->touchSeat($platz->uid, $jetzt);
        }

        $sitzende = $this->lobbies->seatsOf($lobby->uid);
        $melderNummer = $this->melderNummer($sitzende);
        $ergebnis = $lobby->ergebnis();
        $einsaetze = $this->lobbies->betsOfRound($lobby->uid, $lobby->roundNo);
        $shooter = $this->shooterNummer($sitzende);

        return [
            'r' => $lobby->revision,
            'z' => $lobby->state,
            'rest' => $lobby->restMs($jetzt),
            'n' => count($sitzende),
            'runde' => $lobby->roundNo,
            'm' => $platz->seatNo === $melderNummer ? 1 : 0,
            // DIE ZEILE, OHNE DIE D5 NICHT LÄUFT: lobby-live.js startet die
            // Runde nur, wenn daten.saat da ist. In D4 fehlte sie — siehe
            // Plan, Abschnitt 1, Befund 1.
            'saat' => $lobby->seed,
            // Das festgeschriebene Ergebnis der Runde, zu der es gehört.
            // lobby-live.js liest daten.erg bereits (Befund 2).
            'erg' => $ergebnis['wert'],
            'ergR' => $ergebnis['runde'],
            // Blackjack: wer ist gefragt, und was wurde bisher entschieden.
            't' => $lobby->turnSeat,
            'mv' => $lobby->moves,
            // Craps: wer hält die Würfel.
            'w' => $shooter,
            'p' => array_map(
                static function (Seat $s) use ($platz, $einsaetze): array {
                    $eintrag = ['s' => $s->seatNo, 'v' => $s->name];
                    if ($s->seatNo === $platz->seatNo) {
                        $eintrag['i'] = 1;
                    }
                    if ($s->shooterNo > 0) {
                        $eintrag['sn'] = $s->shooterNo;
                    }
                    $felder = $einsaetze[$s->seatNo] ?? [];
                    if ($felder !== []) {
                        // e = Summe (das, was in der Platzleiste als Zahl steht),
                        // f = die einzelnen Felder (das, was der Tisch auf dem
                        // Tuch der anderen zeichnet), o = Summe der Ausgänge.
                        $eintrag['e'] = array_sum(array_column($felder, 'betrag'));
                        $eintrag['o'] = array_sum(array_column($felder, 'ausgang'));
                        $eintrag['f'] = array_map(
                            static fn (array $f) => ['f' => $f['feld'], 'b' => $f['betrag']],
                            $felder
                        );
                    }
                    return $eintrag;
                },
                $sitzende
            ),
        ];
    }

    /**
     * Löst die Runde selbst aus. Nur zulässig, wenn RoundClock::darfStarten()
     * — also allein am Tisch und ohne laufende Uhr. Setzt state_until auf
     * jetzt; die nächste Abfrage findet den Zustand abgelaufen und sperrt
     * regulär (ein einziger Weg in den Zustand 'gesperrt', nicht zwei).
     *
     * @return array{ok:true}|array{ok:false, grund:string}
     */
    public function starten(Player $spielender, int $jetzt): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }

        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $lobby = $this->lobbies->lockByUid($connection, $platz->lobby);
            if ($lobby === null) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'kein_platz'];
            }

            $besetzt = count($this->lobbies->seatsOf($lobby->uid));
            if (!RoundClock::darfStarten($lobby->state, $lobby->stateUntil, $besetzt)) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'uhr_laeuft'];
            }

            $this->lobbies->updateLobby($lobby->uid, [
                'state_until' => $jetzt,
                'revision' => $lobby->revision + 1,
            ]);
            $connection->commit();
            return ['ok' => true];
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /**
     * Schreibt das Ergebnis einer Runde einmal fest (D.10.4). Zulässig nur
     * im Zustand 'laeuft' und nur vom Melder — dem besetzten Platz mit der
     * kleinsten Nummer (nicht dem owner, siehe Plan Abschnitt 9: „Steht der
     * Eröffner auf, meldet niemand mehr"). Ein abweichendes Ergebnis eines
     * anderen Platzes ändert nichts und wird protokolliert.
     *
     * @return array{ok:true}|array{ok:false, grund:string}
     */
    public function ergebnis(Player $spielender, string $wert, int $jetzt): array
    {
        $platz = $this->lobbies->seatOfPlayer($spielender->uid);
        if ($platz === null) {
            return ['ok' => false, 'grund' => 'kein_platz'];
        }

        $connection = $this->connectionPool->getConnectionForTable(LobbyRepository::TABLE_LOBBY);
        $connection->beginTransaction();
        try {
            $lobby = $this->lobbies->lockByUid($connection, $platz->lobby);
            if ($lobby === null || $lobby->state !== RoundClock::LAEUFT) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'unpassend'];
            }

            $sitzende = $this->lobbies->seatsOf($lobby->uid);
            if ($platz->seatNo !== $this->melderNummer($sitzende)) {
                $connection->rollBack();
                return ['ok' => false, 'grund' => 'nicht_melder'];
            }

            $bisher = $lobby->ergebnis();
            $schonFest = $bisher['runde'] === $lobby->roundNo;

            if ($schonFest && $bisher['wert'] !== $wert) {
                $this->logger->warning(
                    'Abweichendes Ergebnis für Lobby {lobby}, Runde {runde}: festgeschrieben {fest}, gemeldet {gemeldet}.',
                    ['lobby' => $lobby->uid, 'runde' => $lobby->roundNo, 'fest' => $bisher['wert'], 'gemeldet' => $wert]
                );
                $connection->commit();
                return ['ok' => true];
            }

            if (!$schonFest) {
                $this->lobbies->updateLobby($lobby->uid, [
                    // RUNDENMARKIERT (siehe Lobby::ergebnis()): die Nummer
                    // davor, damit ein Browser, der eine Runde verpasst hat,
                    // erkennt, ob dieses Ergebnis noch gilt.
                    'result' => $lobby->roundNo . '-' . $wert,
                    'state' => RoundClock::AUSWERTEN,
                    'state_until' => $jetzt + RoundClock::ERGEBNISZEIT,
                    'turn_seat' => 0,
                    'revision' => $lobby->revision + 1,
                ]);

                // „Der Shooter wechselt nach einem Seven-out zur nächsten
                // Person in der Liste" (D.10.6). Der Server RECHNET das
                // nicht aus — er liest eine Marke im festgeschriebenen
                // Ergebnis, so wie er auch die Kugel nicht nachrechnet
                // (D.10.4). Die Marke setzt lobby-craps.js.
                if ($lobby->game === 'craps' && str_contains($wert, '_so')) {
                    $this->shooterWeitergeben($lobby);
                }
            }

            $connection->commit();
            return ['ok' => true];
        } catch (\Throwable $fehler) {
            if ($connection->isTransactionActive()) {
                $connection->rollBack();
            }
            throw $fehler;
        }
    }

    /** Der Melder ist der besetzte Platz mit der kleinsten Nummer (4.17.5). @param list<Seat> $sitzende */
    private function melderNummer(array $sitzende): int
    {
        $nummern = array_map(static fn (Seat $s) => $s->seatNo, $sitzende);
        return $nummern === [] ? 0 : min($nummern);
    }

    /**
     * Nach einem Seven-out: der bisherige Shooter verlässt die Warteliste,
     * die Würfel gehen an den Nächsten (D.10.6).
     *
     * Hat sich niemand eingetragen (Shooter war der kleinste Platz per
     * Festlegung), passiert nichts — es gibt keine Liste, aus der jemand
     * ausscheiden könnte.
     */
    private function shooterWeitergeben(Lobby $lobby): void
    {
        $sitzende = $this->lobbies->seatsOf($lobby->uid);
        $aktuell = $this->shooterNummer($sitzende);
        foreach ($sitzende as $platz) {
            if ($platz->seatNo === $aktuell && $platz->shooterNo > 0) {
                $this->lobbies->setShooterNo($platz->uid, 0);
                return;
            }
        }
    }
}
