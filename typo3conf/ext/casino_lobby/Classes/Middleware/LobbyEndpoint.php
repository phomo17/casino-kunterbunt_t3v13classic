<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Middleware;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Middleware\QrGate;
use Phomo17\CasinoAccount\Service\QrMode;
use Phomo17\CasinoLobby\Domain\Lobby;
use Phomo17\CasinoLobby\Domain\LobbyRepository;
use Phomo17\CasinoLobby\Domain\Seat;
use Phomo17\CasinoLobby\Lobby\LobbyGames;
use Phomo17\CasinoLobby\Service\LobbyService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Site\Entity\Site;

/**
 * Der Lobby-Endpunkt (CONCEPT.md D.10.5): drei Adressen, die JSON
 * beantworten, alles andere reicht er durch.
 *
 * WARUM ER NACH `casino_account/qr-gate` LIEGT, ANDERS ALS DER
 * BUCHUNGSENDPUNKT: diese Schicht liegt INNERHALB des Tores
 * (Configuration/RequestMiddlewares.php). Wer keine Sitzung hat, bekommt vom
 * Tor die Torseite mit Rückgabewert 200 (bei ausgeschaltetem Modus reicht das
 * Tor ohnehin unverändert durch) — und genau das ist für die Lobby die
 * richtige Auskunft. Ein Aufruf OHNE das Merkmal ATTRIBUTE_PLAYER (Sitzung
 * lief in der Zwischenzeit ab, obwohl der Modus an ist) bekommt 401 mit JSON;
 * lobby-live.js behandelt das ausdrücklich (D4c) und lädt die Seite neu.
 *
 * SICHERHEIT (D.9, Plan 4.17.7): der Spielende kommt AUSSCHLIESSLICH aus dem
 * Merkmal, das QrGate gesetzt hat. Keine Methode dieser Klasse liest eine
 * Kennung, eine player-Nummer oder das Wort role aus der Anfrage. Der einzige
 * Bezeichner, den ein Aufruf mitbringen darf, ist die Lobby-Nummer beim
 * Beitreten — ein öffentlicher Tisch, keine Person.
 */
final readonly class LobbyEndpoint implements MiddlewareInterface
{
    public const PFAD_STAND = '/casino-lobby/stand';
    public const PFAD_UEBERSICHT = '/casino-lobby/uebersicht';
    public const PFAD_HANDLUNG = '/casino-lobby/handlung';

    /** Alle Handlungen. Was hier nicht steht, wird abgewiesen — dieselbe Bauart wie BookingService::ARTEN. */
    public const ARTEN = ['eroeffnen', 'beitreten', 'verlassen', 'starten', 'ergebnis',
                          'einsatz', 'bilanz', 'zug', 'shooter'];

    /** Die erlaubten Blackjack-Entscheidungen. Was hier nicht steht, gibt es nicht. */
    public const ZUEGE = ['h', 's', 'd', 'p', 'i', 'n'];

    /** Höchstens so viele Felder je Platz und Runde — eine Anzeigegrenze, keine Geldgrenze. */
    private const MAX_FELDER = 24;

    public function __construct(
        private QrMode $qrMode,
        private LobbyService $lobbies,
        private LobbyRepository $lobbyRepository,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        // Schalterabfrage ZUERST — dieselbe Hausregel, die verify-gate G-3
        // für die Schichten von casino_account festhält. Bei ausgeschaltetem
        // Modus gibt es diese drei Adressen nicht; sie laufen weiter und
        // enden in der gewöhnlichen 404-Seite.
        if (!$this->qrMode->isOn()) {
            return $handler->handle($request);
        }
        $pfad = $this->pfadOhneBasis($request);
        if (!in_array($pfad, [self::PFAD_STAND, self::PFAD_UEBERSICHT, self::PFAD_HANDLUNG], true)) {
            return $handler->handle($request);
        }

        // Der Spielende kommt AUSSCHLIESSLICH aus dem Merkmal, das QrGate
        // gesetzt hat (D.9). In dieser Klasse steht keine Zeile, die einen
        // Bezeichner einer PERSON aus der Anfrage liest.
        $spielender = $request->getAttribute(QrGate::ATTRIBUTE_PLAYER);
        if (!$spielender instanceof Player) {
            return $this->json(['ok' => false, 'grund' => 'keine_sitzung'], 401);
        }

        $erlaubt = $pfad === self::PFAD_HANDLUNG ? ['POST'] : ['GET'];
        if (!in_array($request->getMethod(), $erlaubt, true)) {
            return $this->json(['ok' => false, 'grund' => 'methode'], 405);
        }

        $jetzt = (int)($GLOBALS['EXEC_TIME'] ?? time());

        if ($pfad === self::PFAD_STAND) {
            return $this->stand($spielender, $jetzt, $request);
        }
        if ($pfad === self::PFAD_UEBERSICHT) {
            return $this->uebersicht($jetzt, $request);
        }

        // NUR JSON — derselbe Schutz gegen einen untergeschobenen Aufruf von
        // fremder Seite wie beim Buchungsendpunkt (BookingEndpoint.php).
        if (!str_contains($request->getHeaderLine('Content-Type'), 'application/json')) {
            return $this->json(['ok' => false, 'grund' => 'inhaltstyp'], 415);
        }
        $eingabe = json_decode((string)$request->getBody(), true);
        if (!is_array($eingabe)) {
            return $this->json(['ok' => false, 'grund' => 'unlesbar'], 400);
        }

        return $this->handlung($spielender, $eingabe, $jetzt);
    }

    /**
     * GET /casino-lobby/stand?r=<zuletzt gesehene Stand-Nummer> — die
     * Abfrage am Tisch. Hat sich nichts geändert, antwortet der Server
     * HTTP 204 „No Content" — null Byte Rumpf (Entscheidung 4.0.2).
     */
    private function stand(Player $spielender, int $jetzt, ServerRequestInterface $request): ResponseInterface
    {
        $ergebnis = $this->lobbies->stand($spielender, $jetzt);
        if (isset($ergebnis['weg'])) {
            return $this->json(['r' => 0, 'weg' => 1], 200);
        }

        $gesehen = $request->getQueryParams()['r'] ?? null;
        if ($gesehen !== null && (string)$gesehen === (string)$ergebnis['r']) {
            return new Response('php://temp', 204, ['Cache-Control' => 'no-store, private']);
        }

        return $this->json($ergebnis, 200);
    }

    /**
     * GET /casino-lobby/uebersicht?spiel=<schlüssel>&r=<zuletzt gesehen> —
     * Takt 3 Sekunden. `r` ist hier keine Zahl, sondern eine Zeichenkette aus
     * drei Teilen (LobbyRepository::overviewRevision()).
     */
    private function uebersicht(int $jetzt, ServerRequestInterface $request): ResponseInterface
    {
        $spiel = (string)($request->getQueryParams()['spiel'] ?? '');
        if (!LobbyGames::kennt($spiel)) {
            return $this->json(['ok' => false, 'grund' => 'unbekanntes_spiel'], 400);
        }

        $this->lobbies->aufraeumen($spiel, $jetzt);

        $revision = $this->lobbyRepository->overviewRevision($spiel);
        $gesehen = $request->getQueryParams()['r'] ?? null;
        if ($gesehen !== null && (string)$gesehen === $revision) {
            return new Response('php://temp', 204, ['Cache-Control' => 'no-store, private']);
        }

        $lobbys = $this->lobbyRepository->findByGame($spiel);
        $belegung = $this->lobbyRepository->occupancyByGame($spiel);

        return $this->json([
            'r' => $revision,
            'max' => LobbyGames::plaetze($spiel),
            'neu' => count($lobbys) < LobbyGames::MAX_LOBBYS ? 1 : 0,
            'l' => array_map(
                static fn (Lobby $lobby) => ['u' => $lobby->uid, 'n' => $belegung[$lobby->uid] ?? 0, 'z' => $lobby->state],
                $lobbys
            ),
        ], 200);
    }

    /**
     * POST /casino-lobby/handlung — Rumpf application/json,
     * {"art": …, "lobby": …, "wert": …}.
     *
     * ABLEHNUNG IST KEIN FEHLER (dieselbe Regel wie beim Buchungsendpunkt):
     * „voll", „zu spät", „Uhr läuft", „bereits andernorts" kommen mit
     * Rückgabewert 200 und ok:false zurück — NIE 500, auch nicht bei einem
     * Wettlauf zweier nahezu gleichzeitiger Anfragen derselben Person
     * (Protokollfund 2026-09-11: UniqueConstraintViolationException auf
     * UNIQUE KEY player flog vorher ungefangen bis hierher durch;
     * LobbyService::eroeffnen()/::beitreten() fangen sie jetzt selbst ab
     * und liefern grund:'bereits_andernorts' oder — sitzt die Person schon
     * genau am Ziel — ok:true mit ihrem tatsächlichen Platz).
     */
    private function handlung(Player $spielender, array $eingabe, int $jetzt): ResponseInterface
    {
        $art = (string)($eingabe['art'] ?? '');
        if (!in_array($art, self::ARTEN, true)) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }

        return match ($art) {
            'eroeffnen' => $this->antwortSitzplatz(
                $this->lobbies->eroeffnen($this->spiel($eingabe), $spielender, $jetzt)
            ),
            'beitreten' => $this->antwortSitzplatz(
                $this->lobbies->beitreten($this->lobbyNummer($eingabe), $spielender, $jetzt)
            ),
            'verlassen' => $this->verlassen($spielender),
            'starten' => $this->json($this->lobbies->starten($spielender, $jetzt), 200),
            'ergebnis' => $this->ergebnis($spielender, $eingabe, $jetzt),
            'einsatz' => $this->einsatz($spielender, $eingabe, $jetzt),
            'bilanz' => $this->bilanz($spielender, $eingabe),
            'zug' => $this->zug($spielender, $eingabe, $jetzt),
            'shooter' => $this->json(
                $this->lobbies->shooter($spielender, ($eingabe['ein'] ?? false) === true),
                200
            ),
        };
    }

    /**
     * @param array<string, mixed> $eingabe {"art":"einsatz","runde":7,"felder":[{"f":"rot","b":5}]}
     */
    private function einsatz(Player $spielender, array $eingabe, int $jetzt): ResponseInterface
    {
        $felder = $this->felder($eingabe);
        if ($felder === null) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }
        return $this->json(
            $this->lobbies->einsatz($spielender, (int)($eingabe['runde'] ?? 0), $felder, $jetzt),
            200
        );
    }

    /** @param array<string, mixed> $eingabe {"art":"bilanz","runde":7,"aus":{"rot":-5,"17":175}} */
    private function bilanz(Player $spielender, array $eingabe): ResponseInterface
    {
        $roh = $eingabe['aus'] ?? null;
        if (!is_array($roh) || count($roh) > self::MAX_FELDER) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }
        $ausgaenge = [];
        foreach ($roh as $feld => $wert) {
            if (!$this->istFeldname((string)$feld) || !is_int($wert) || abs($wert) > 1000000) {
                return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
            }
            $ausgaenge[(string)$feld] = $wert;
        }
        return $this->json($this->lobbies->bilanz($spielender, (int)($eingabe['runde'] ?? 0), $ausgaenge), 200);
    }

    /** @param array<string, mixed> $eingabe {"art":"zug","runde":7,"zug":"h","fertig":false} */
    private function zug(Player $spielender, array $eingabe, int $jetzt): ResponseInterface
    {
        $zug = $eingabe['zug'] ?? '';
        if (!is_string($zug) || !in_array($zug, self::ZUEGE, true)) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }
        return $this->json(
            $this->lobbies->zug(
                $spielender,
                (int)($eingabe['runde'] ?? 0),
                $zug,
                ($eingabe['fertig'] ?? false) === true,
                $jetzt
            ),
            200
        );
    }

    /**
     * Prüft und normiert die gemeldete Einsatzliste.
     *
     * DREI GRENZEN, UND WARUM GENAU DIESE: die Zahl der Felder (eine
     * Platzleiste, die 157 Einträge zeichnen müsste, ist keine Platzleiste
     * mehr), die Form des Feldnamens (er landet als Text im HTML anderer
     * Leute) und die Größe des Betrags (eine Zahl, die keine Zahl mehr ist,
     * bricht die Anzeige). KEINE dieser Grenzen ist eine Geldgrenze — Geld
     * bewegt diese Datei nicht.
     *
     * @return list<array{feld: string, betrag: int}>|null
     */
    private function felder(array $eingabe): ?array
    {
        $roh = $eingabe['felder'] ?? null;
        if (!is_array($roh) || count($roh) > self::MAX_FELDER) {
            return null;
        }
        $felder = [];
        foreach ($roh as $eintrag) {
            if (!is_array($eintrag)) {
                return null;
            }
            $feld = (string)($eintrag['f'] ?? '');
            $betrag = $eintrag['b'] ?? null;
            if (!$this->istFeldname($feld) || !is_int($betrag) || $betrag < 1 || $betrag > 1000000) {
                return null;
            }
            $felder[] = ['feld' => $feld, 'betrag' => $betrag];
        }
        return $felder;
    }

    /** 1–32 Zeichen aus [A-Za-z0-9_-]; dieselbe Form wie die Feldkennungen der drei Tische. */
    private function istFeldname(string $feld): bool
    {
        return preg_match('/^[A-Za-z0-9_-]{1,32}$/', $feld) === 1;
    }

    /**
     * Formt die Antworten von LobbyService::eroeffnen()/::beitreten() (die
     * Lobby- und Seat-Objekte tragen) auf die knappe Draht-Form
     * {"ok":true,"lobby":9,"platz":1} um.
     *
     * @param array{ok:true, lobby:Lobby, platz:Seat}|array{ok:false, grund:string} $ergebnis
     */
    private function antwortSitzplatz(array $ergebnis): ResponseInterface
    {
        if (!$ergebnis['ok']) {
            return $this->json($ergebnis, 200);
        }
        return $this->json([
            'ok' => true,
            'lobby' => $ergebnis['lobby']->uid,
            'platz' => $ergebnis['platz']->seatNo,
        ], 200);
    }

    private function verlassen(Player $spielender): ResponseInterface
    {
        $this->lobbies->verlassen($spielender);
        return $this->json(['ok' => true], 200);
    }

    /**
     * @param array<string, mixed> $eingabe
     */
    private function ergebnis(Player $spielender, array $eingabe, int $jetzt): ResponseInterface
    {
        $wert = $this->wert($eingabe);
        if ($wert === null) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }
        return $this->json($this->lobbies->ergebnis($spielender, $wert, $jetzt), 200);
    }

    private function spiel(array $eingabe): string
    {
        $spiel = $eingabe['spiel'] ?? '';
        return is_string($spiel) ? $spiel : '';
    }

    private function lobbyNummer(array $eingabe): int
    {
        return (int)($eingabe['lobby'] ?? 0);
    }

    /** 1–64 Zeichen aus [A-Za-z0-9_-] (die Probeziehung aus lobby-seed.js hat die Form "12-4-31"); alles andere ist null. */
    private function wert(array $eingabe): ?string
    {
        $wert = $eingabe['wert'] ?? null;
        if (!is_string($wert) || preg_match('/^[A-Za-z0-9_-]{1,64}$/', $wert) !== 1) {
            return null;
        }
        return $wert;
    }

    /**
     * Der angefragte Pfad ohne den Grundpfad der Site, mit führendem
     * Schrägstrich — dieselbe Rechnung wie QrGate::istOffeneRoute() und
     * BookingEndpoint::pfadOhneBasis().
     */
    private function pfadOhneBasis(ServerRequestInterface $request): string
    {
        $site = $request->getAttribute('site');
        $basisPfad = $site instanceof Site ? trim($site->getBase()->getPath(), '/') : '';
        $pfad = ltrim($request->getUri()->getPath(), '/');
        if ($basisPfad !== '' && str_starts_with($pfad, $basisPfad . '/')) {
            $pfad = substr($pfad, strlen($basisPfad) + 1);
        }
        return '/' . $pfad;
    }

    /**
     * Alle Antworten Cache-Control: no-store, private — in ihnen stehen
     * Namen anderer Personen (uebersicht, stand).
     */
    private function json(array $daten, int $status): ResponseInterface
    {
        return new JsonResponse($daten, $status, ['Cache-Control' => 'no-store, private']);
    }
}
