<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Middleware;

use Phomo17\CasinoAccount\Domain\CoinFieldRepository;
use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Service\AccountStorage;
use Phomo17\CasinoAccount\Service\BookingService;
use Phomo17\CasinoAccount\Service\QrMode;
use Phomo17\CasinoAccount\Service\ShadowUserService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Site\Entity\Site;

/**
 * Der Buchungsendpunkt (CONCEPT.md D.7.2). Er beantwortet drei Adressen
 * selbst und reicht alles andere durch.
 *
 * WARUM ER VOR `qr-gate` LIEGT: stünde er dahinter, bekäme ein Aufruf ohne
 * Sitzung die Torseite als HTML zurück — ein JSON-Aufrufer kann damit nichts
 * anfangen und würde sie als Serverausfall deuten und das Gerät sperren. Vor
 * dem Tor kann er stattdessen sauber 401 mit JSON antworten. Er liegt NACH
 * `typo3/cms-frontend/authentication`, weil er die Sitzung braucht.
 */
final readonly class BookingEndpoint implements MiddlewareInterface
{
    public const PFAD_BUCHUNG = '/casino-konto/buchung';
    public const PFAD_STAND   = '/casino-konto/stand';
    public const PFAD_FELD    = '/casino-konto/feld';

    /** Mehr Speicherstände nimmt ein einzelner Aufruf nicht an — ein Gerät mit zwei Speicherstellen braucht keine dritte Anfrage. */
    private const MAX_SPEICHERSTAENDE = 4;

    public function __construct(
        private QrMode $qrMode,
        private BookingService $bookings,
        private CoinFieldRepository $coinFields,
        private PlayerRepository $players,
        private ShadowUserService $shadowUsers,
        private AccountStorage $storage,
        private Context $context,
        private LoggerInterface $logger,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        // Schalterabfrage ZUERST — dieselbe Zusage, die verify-gate G-3 für
        // die beiden anderen Schichten festhält. Bei ausgeschaltetem Modus
        // gibt es diese Adressen nicht; sie laufen weiter und enden in der
        // gewöhnlichen 404-Seite. „Bei ausgeschaltetem QR-Modus ändert sich
        // nichts" (D.1) gilt damit auch für den Endpunkt.
        if (!$this->qrMode->isOn()) {
            return $handler->handle($request);
        }
        $pfad = $this->pfadOhneBasis($request);
        if (!in_array($pfad, [self::PFAD_BUCHUNG, self::PFAD_STAND, self::PFAD_FELD], true)) {
            return $handler->handle($request);
        }

        // Der Spielende kommt AUSSCHLIESSLICH aus der laufenden Sitzung
        // (D.9: „Eine Kennung im Aufruf wird ignoriert."). Es gibt in dieser
        // Klasse keine einzige Zeile, die einen Bezeichner aus $request liest.
        $spielender = $this->angemeldeterSpielender();
        if ($spielender === null) {
            return $this->json(['ok' => false, 'grund' => 'keine_sitzung'], 401);
        }

        $erlaubt = $pfad === self::PFAD_STAND ? ['GET'] : ['POST'];
        if (!in_array($request->getMethod(), $erlaubt, true)) {
            return $this->json(['ok' => false, 'grund' => 'methode'], 405);
        }

        if ($pfad === self::PFAD_STAND) {
            return $this->json(['ok' => true] + $this->bookings->stand($spielender->uid), 200);
        }

        // NUR JSON. Das ist zugleich der Schutz gegen einen untergeschobenen
        // Aufruf von einer fremden Seite: ein HTML-Formular kann keinen
        // Content-Type application/json senden, und ein Skript einer fremden
        // Seite bekommt dafür eine Vorabanfrage (preflight), die hier
        // unbeantwortet bleibt. Zusammen mit dem Sitzungsplätzchen, das
        // SameSite=Lax trägt (in D2 gemessen), ist der Fall abgedeckt.
        if (!str_contains($request->getHeaderLine('Content-Type'), 'application/json')) {
            return $this->json(['ok' => false, 'grund' => 'inhaltstyp'], 415);
        }
        $eingabe = json_decode((string)$request->getBody(), true);
        if (!is_array($eingabe)) {
            return $this->json(['ok' => false, 'grund' => 'unlesbar'], 400);
        }

        if ($pfad === self::PFAD_FELD) {
            return $this->feld($spielender, $eingabe);
        }

        $kunde = $this->kundenKennung($eingabe['kunde'] ?? null);
        $nummer = (int)($eingabe['nummer'] ?? 0);
        $art = (string)($eingabe['art'] ?? '');
        $betrag = array_key_exists('betrag', $eingabe) && $eingabe['betrag'] !== null
            ? (int)$eingabe['betrag'] : null;

        if ($kunde === null || $nummer < 1 || !in_array($art, BookingService::ARTEN, true)) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }

        return $this->json($this->bookings->buchen($spielender->uid, $kunde, $nummer, $art, $betrag), 200);
    }

    /**
     * Der Spielende hinter der laufenden Sitzung — oder null (D.9: „Eine
     * Kennung im Aufruf wird ignoriert."). Dieselbe Herleitung wie
     * QrGate::angemeldeterSpielender(), nur ohne das Abmelden eines
     * ungültig gewordenen Kontos — das ist QrGates Aufgabe, und diese
     * Schicht liegt VOR ihr in der Kette.
     */
    private function angemeldeterSpielender(): ?Player
    {
        $userAspect = $this->context->getAspect('frontend.user');
        if (!$userAspect->isLoggedIn()) {
            return null;
        }
        $feUserUid = (int)$userAspect->get('id');
        if ($feUserUid <= 0) {
            return null;
        }
        $playerUid = $this->shadowUsers->playersForUsers([$feUserUid])[$feUserUid] ?? 0;
        if ($playerUid <= 0) {
            return null;
        }
        $player = $this->players->findByUid($playerUid);
        if ($player === null || $player->hidden) {
            return null;
        }
        return $player;
    }

    /**
     * Der angefragte Pfad ohne den Grundpfad der Site, mit führendem
     * Schrägstrich — dieselbe Rechnung wie QrGate::istOffeneRoute().
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
     * ABLEHNUNG IST KEIN FEHLER. Eine Buchung, die der Server nicht ausführt
     * (zu wenig Geld, kein Admin), kommt mit Rückgabewert 200 und
     * `ok: false` zurück. Nur was der Browser NICHT als Antwort erkennt —
     * Netzabbruch, 5xx, unlesbares JSON — führt zur Sperre des Geräts
     * (D.7.2). Ohne diese Trennung sperrte sich ein Automat schon dann, wenn
     * jemand mehr einwerfen will, als er hat.
     */
    private function json(array $daten, int $status): ResponseInterface
    {
        return new JsonResponse($daten, $status, ['Cache-Control' => 'no-store, private']);
    }

    /** 1–32 Zeichen aus [A-Za-z0-9_-]; alles andere ist null. */
    private function kundenKennung(mixed $roh): ?string
    {
        if (!is_string($roh)) {
            return null;
        }
        return preg_match('/^[A-Za-z0-9_-]{1,32}$/', $roh) === 1 ? $roh : null;
    }

    /**
     * { "stände": { "<schlüssel>": "<text>", … } } — mehrere Schlüssel in
     * einem Aufruf, damit ein Gerät mit zwei Speicherstellen nicht zwei
     * Anfragen braucht. Der Endpunkt kennt keinen einzigen Schlüsselnamen.
     * Grenzen: höchstens MAX_SPEICHERSTAENDE Schlüssel, je höchstens
     * CoinFieldRepository::MAX_LAENGE Zeichen, Schlüssel nach dem Muster
     * [A-Za-z0-9._-]{1,191}. KEINE Buchungsnummer, KEIN Betrag — das Feld ist
     * kein Geld (D.8, Plan Befund 3).
     */
    private function feld(Player $spielender, array $eingabe): ResponseInterface
    {
        $staende = $eingabe['stände'] ?? null;
        if (!is_array($staende) || count($staende) > self::MAX_SPEICHERSTAENDE) {
            return $this->json(['ok' => false, 'grund' => 'unbrauchbar'], 400);
        }
        foreach ($staende as $schluessel => $text) {
            if (!is_string($schluessel) || preg_match('/^[A-Za-z0-9._-]{1,191}$/', $schluessel) !== 1) {
                return $this->json(['ok' => false, 'grund' => 'schluessel'], 400);
            }
            if (!is_string($text) || strlen($text) > CoinFieldRepository::MAX_LAENGE) {
                return $this->json(['ok' => false, 'grund' => 'zu_lang'], 400);
            }
        }

        $storagePid = $this->storage->ensure();
        if ($storagePid <= 0) {
            return $this->json(['ok' => false, 'grund' => 'kein_ordner'], 500);
        }
        foreach ($staende as $schluessel => $text) {
            $this->coinFields->save($spielender->uid, $storagePid, (string)$schluessel, (string)$text);
        }
        return $this->json(['ok' => true], 200);
    }
}
