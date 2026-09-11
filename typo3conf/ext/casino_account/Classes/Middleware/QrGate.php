<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Middleware;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Frontend\GatePage;
use Phomo17\CasinoAccount\Service\AccountBookkeeper;
use Phomo17\CasinoAccount\Service\PlayerUrlBuilder;
use Phomo17\CasinoAccount\Service\QrMode;
use Phomo17\CasinoAccount\Service\ShadowUserService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\SecurityAspect;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Http\Stream;
use TYPO3\CMS\Core\Security\RequestToken;
use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

/**
 * Das Tor aus D.9: „Jede Frontend-Adresse ohne gültige Sitzung landet auf der
 * Anmeldung … damit es keinen Weg daran vorbei gibt." Zugleich der Ort der
 * sauberen Umleitung aus D.6.2.
 *
 * WO DIE TORSEITE LEBT: die Middleware rendert sie SELBST, unter der
 * angefragten Adresse — kein Datensatz im Seitenbaum, der fehlen könnte,
 * keine zweite Adresse, die man umgehen könnte (siehe Plan, Abschnitt 4.21
 * für die verworfenen Alternativen).
 *
 * BEFUND N-07 GEPRÜFT UND BEWUSST NICHT BEHOBEN (Audit 2026-09-10, Teil 2;
 * Rücknahme einer ersten, inzwischen verworfenen Fassung, die hier 401
 * zurückgab): der Rückgabewert bleibt 200 — aus zwei Gründen, nicht nur
 * einem, und beide wiegen schwerer als der gemeldete Soft-404:
 *   1. Ein 401 OHNE den Kopf `WWW-Authenticate` ist keine vollständige,
 *      regelkonforme Antwort — RFC 9110 verlangt diesen Kopf bei 401, er
 *      gehört zum HTTP-eigenen Anmeldeverfahren (Basic/Digest & Co.). Unsere
 *      Anmeldung ist ein gewöhnliches Formular mit Sitzungsplätzchen, kein
 *      HTTP-Anmeldeverfahren — den Kopf zu setzen wäre falsch (mancher
 *      Browser öffnete sein EIGENES Anmeldefenster, was die Torseite
 *      überlagert hätte), ihn wegzulassen heißt: eine unvollständige 401.
 *      Keine der beiden Möglichkeiten ist sauberer als schlicht 200.
 *   2. Die Torseite ist KEIN Fehlerzustand — sie ist die Seite, die ein
 *      nicht angemeldeter Gast SEHEN SOLL, vollständig und beabsichtigt.
 *      Sie als Fehler zu kennzeichnen wäre inhaltlich falsch, auch wenn es
 *      nebenbei den Soft-404 erschlagen hätte.
 * DER SOFT-404 SELBST bleibt dadurch offen, ist aber kosmetisch, nicht
 * strukturell: bei eingeschaltetem Modus trägt JEDE Antwort des Tores
 * `noindex, nofollow` — im Kopf UND als `X-Robots-Tag` (GatePage::render())
 * —, ein Suchmaschinen-Crawler hat also nichts, was er indizieren könnte,
 * unabhängig vom Statuscode. Ausgenommen bleibt REASON_RATE_LIMITED (429,
 * korrekt und unverändert, QrTokenLogin.php) — die Begrenzung der
 * Anmeldeversuche IST ein echter, regelkonform zu meldender Fehlerzustand.
 *
 * DIE AUSNAHMELISTE wird aus der Site-Konfiguration ABGELEITET
 * (Site::getConfiguration()['routes']), nicht als feste Liste eingetragen:
 * eine abgeschriebene Liste geht auseinander, sobald jemand eine vierte
 * Route anlegt.
 *
 * AUSDRÜCKLICH NICHT AUSGENOMMEN: sitemap.xml. Das ist eine gewöhnliche
 * Seitenanfrage mit einem anderen Seitentyp, kein statische Route.
 *
 * ENTSCHEIDUNG ZU N-06 (Audit 2026-09-10, Teil 2, weiterhin behoben — hängt
 * NICHT am Statuscode von N-07): robots.txt nennt `Sitemap: …/sitemap.xml`,
 * aber sitemap.xml liegt (siehe oben, mit voller Absicht) hinter dem Tor.
 * Solange der Modus an ist, würde ein Bot also einer eigenen Verweis-Zeile
 * zu einer Adresse folgen, die ihm ohnehin nur die Torseite zurückgibt.
 * ZWEI Wege standen zur Wahl:
 *   (a) sitemap.xml speziell mit 404 beantworten, robots.txt unverändert
 *       lassen — „der Verweis ist ehrlich tot";
 *   (b) die Sitemap:-Zeile in robots.txt weglassen, solange der Modus an
 *       ist — der Bot bekommt die Adresse dann gar nicht erst genannt.
 * GEWÄHLT: (b), umgesetzt in ohneSitemapZeile() unten — erkannt über den
 * tatsächlichen Inhalt der Antwort, nicht über den Routennamen (siehe dort).
 * VERWORFEN: (a) — ein 404 wäre seinerseits nicht ganz ehrlich: es behauptet
 * „es gibt hier keine Sitemap", dabei gibt es eine, nur eben (mit Absicht)
 * nicht für diesen Besucher in diesem Zustand — das ist ein anderer
 * Sachverhalt als „nicht vorhanden". (b) sagt stattdessen gar nichts über
 * die Adresse, was dem tatsächlichen Sachverhalt näherkommt, und braucht
 * keine zusätzliche, sitemap.xml-spezifische Fallunterscheidung in dieser
 * Klasse.
 */
final readonly class QrGate implements MiddlewareInterface
{
    /** Der angemeldete Spielende, für alles, was innen liegt (heute: die Kontenleiste, D2d). */
    public const ATTRIBUTE_PLAYER = 'casino_account.player';

    /** Dieselbe Liste wie in GatePage::ANMELDESPUREN — siehe Kommentar dort. */
    private const ANMELDESPUREN = [
        PlayerUrlBuilder::PARAMETER,
        'logintype',
        'user',
        'pass',
        'permalogin',
        RequestToken::PARAM_NAME,
    ];

    public function __construct(
        private QrMode $qrMode,
        private PlayerRepository $players,
        private ShadowUserService $shadowUsers,
        private AccountBookkeeper $bookkeeper,
        private GatePage $gate,
        private Context $context,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->qrMode->isOn() || $this->istOffeneRoute($request)) {
            $antwort = $handler->handle($request);
            // BEHOBENER BEFUND (Audit 2026-09-10, Teil 2, N-06): nur bei
            // eingeschaltetem Modus — die Entscheidung samt verworfener
            // Alternative steht im Klassenkopf. ohneSitemapZeile() greift nur,
            // wenn der Körper tatsächlich eine "Sitemap:"-Zeile enthält
            // (unverändert für jede andere offene Route, z. B. llms.txt oder
            // favicon.ico) — absichtlich NICHT über den Routennamen erkannt:
            // G-4 verbietet fest eingetragene Routennamen in dieser Klasse,
            // und der Inhalt selbst sagt zuverlässiger, worum es geht, als der
            // Name der Route es könnte.
            if ($this->qrMode->isOn()) {
                return $this->ohneSitemapZeile($antwort);
            }
            return $antwort;
        }

        $spielender = $this->angemeldeterSpielender($request);
        $versuch = $request->getAttribute(QrTokenLogin::ATTRIBUTE_LOGIN_ATTEMPT) === true;

        if ($spielender !== null) {
            $this->bookkeeper->touch($spielender->uid, (int)($GLOBALS['EXEC_TIME'] ?? time()));

            if ($versuch) {
                // D.6.2: „Nach erfolgreicher Anmeldung wird SOFORT auf eine
                // saubere Adresse umgeleitet, damit die Kennung nicht im
                // Verlauf, in der Adresszeile oder im Verweis-Kopf
                // hängenbleibt." 303 „See Other" ist der richtige Wert: der
                // Browser holt die neue Adresse mit GET, auch wenn er gerade
                // ein Formular abgeschickt hat.
                return new RedirectResponse($this->sauber($request), 303);
            }
            return $handler->handle($request->withAttribute(self::ATTRIBUTE_PLAYER, $spielender));
        }

        // Ab hier: niemand ist angemeldet.
        $body = is_array($request->getParsedBody()) ? $request->getParsedBody() : [];
        if (($body['logintype'] ?? '') === 'logout') {
            // Gerade abgemeldet (der Kern hat es in der Schicht darüber
            // erledigt, samt Buchung durch BookOnLogout). Auch hier eine
            // Umleitung, damit ein Neuladen nicht „logout" wiederholt.
            return new RedirectResponse($this->sauber($request), 303);
        }

        // 200, NICHT 401 (Rücknahme nach dem Behebungslauf zu N-07) — zwei
        // Gründe, ausführlich im Klassenkopf: ein 401 ohne WWW-Authenticate
        // ist keine vollständige Antwort (RFC 9110, und unsere Anmeldung ist
        // kein HTTP-eigenes Anmeldeverfahren), und die Torseite ist ohnehin
        // kein Fehlerzustand, sondern der beabsichtigte Inhalt für einen
        // nicht angemeldeten Gast.
        return $this->gate->render($request, $this->grund($request, $versuch), 200);
    }

    /**
     * Der Spielende hinter der laufenden Sitzung — oder null.
     *
     * DREI GRÜNDE FÜR null, und der dritte ist der wichtige:
     *   1. gar keine Sitzung,
     *   2. eine Sitzung ohne Frontend-Benutzer (anonym),
     *   3. eine Sitzung, deren Spielender gelöscht oder stillgelegt wurde.
     *
     * Im dritten Fall wird die Sitzung ausdrücklich BEENDET ($user->logoff()),
     * nicht bloß ignoriert: sonst liefe jemand mit einem Plätzchen herum, das
     * auf ein Konto zeigt, das es nicht mehr gibt, und bekäme bei jedem
     * Seitenaufruf die Torseite, ohne dass sein Zustand je aufgeräumt würde.
     * logoff() löst dabei BeforeUserLogoutEvent aus — die Buchung aus D.8
     * läuft also auch in diesem Fall (BookOnLogout, Umsetzungsstück D2b).
     */
    private function angemeldeterSpielender(ServerRequestInterface $request): ?Player
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
            $frontendUser = $request->getAttribute('frontend.user');
            if ($frontendUser instanceof FrontendUserAuthentication) {
                $frontendUser->logoff();
            }
            return null;
        }
        return $player;
    }

    /**
     * Ist der Pfad eine statische Route der Site? Verglichen wird der Pfad
     * ohne den Grundpfad der Site, ohne führenden Schrägstrich, zeichengenau
     * — kein „beginnt mit", das wäre ein Loch. Dieselbe Rechnung wie
     * StaticRouteResolver::getApplicableStaticRoute() des Kerns (nachgesehen,
     * nicht angenommen — Plan, Abschnitt 4.21).
     */
    private function istOffeneRoute(ServerRequestInterface $request): bool
    {
        $site = $request->getAttribute('site');
        if (!$site instanceof Site) {
            return false;
        }
        $konfiguration = $site->getConfiguration()['routes'] ?? [];
        $pfad = ltrim($request->getUri()->getPath(), '/');
        $basisPfad = trim($site->getBase()->getPath(), '/');

        foreach ($konfiguration as $route) {
            $routenName = $route['route'] ?? null;
            if ($routenName === null || $routenName === '') {
                continue;
            }
            $vollerName = ltrim($basisPfad . '/' . ltrim((string)$routenName, '/'), '/');
            if ($pfad === $vollerName) {
                return true;
            }
        }
        return false;
    }

    /**
     * Entfernt eine Zeile "Sitemap: …" aus dem Körper einer offenen Route,
     * FALLS sie eine trägt — Entscheidung und Begründung zu N-06 stehen im
     * Klassenkopf. Erkannt wird NICHT über den Routennamen (G-4 verbietet
     * fest eingetragene Routennamen in dieser Klasse), sondern über den
     * tatsächlichen Inhalt: nur robots.txt liefert je eine solche Zeile,
     * llms.txt und favicon.ico bleiben unangetastet, weil ihr Körper nichts
     * findet, worauf das Muster passt. Bleibt der Körper unverändert (keine
     * Zeile gefunden), wird die Antwort unangetastet zurückgegeben, statt
     * unnötig einen neuen Strom anzulegen.
     *
     * withoutHeader('Content-Length'): dieselbe Vorsichtsmaßnahme wie in
     * AccountBar::process() (dort ausführlich begründet) — 'casino_account/
     * qr-gate' liegt in der aufgelösten Schicht-Kette VOR
     * 'typo3/cms-frontend/content-length-headers' (nachgesehen in
     * typo3temp/var/cache/code/core/middlewares_frontend_*.php, nicht
     * angenommen), ein bereits gesetzter Kopfwert könnte also zur
     * ursprünglichen, längeren Körpergröße passen und die gekürzte Antwort
     * abschneiden.
     */
    private function ohneSitemapZeile(ResponseInterface $antwort): ResponseInterface
    {
        $inhalt = (string)$antwort->getBody();
        $bereinigt = preg_replace('/^Sitemap:.*(\R|$)/m', '', $inhalt);
        if ($bereinigt === null || $bereinigt === $inhalt) {
            return $antwort;
        }
        $koerper = new Stream('php://temp', 'rw');
        $koerper->write($bereinigt);
        return $antwort->withBody($koerper)->withoutHeader('Content-Length');
    }

    /**
     * Dieselbe Adresse ohne jede Spur der Anmeldung. Entfernt werden:
     * casinoToken, logintype, user, pass, permalogin und __RequestToken.
     * Alles andere bleibt stehen — wer einen Automaten mit einem eigenen
     * Parameter aufgerufen hat, soll dort auch landen.
     */
    private function sauber(ServerRequestInterface $request): string
    {
        $params = $request->getQueryParams();
        foreach (self::ANMELDESPUREN as $entfernen) {
            unset($params[$entfernen]);
        }
        $query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
        return (string)$request->getUri()->withQuery($query)->withFragment('');
    }

    /**
     * Warum steht das Tor jetzt da? Drei Fälle, drei Sätze:
     *   - REASON_NONE    : es wurde gar nichts versucht (der Normalfall)
     *   - REASON_UNKNOWN : eine Kennung kam an, sie führte zu niemandem
     *   - REASON_EXPIRED : ein FORMULAR kam an, aber ohne gültiges
     *                      Anfragezeichen — die Seite lag zu lange offen.
     *                      Ohne diese Unterscheidung bekäme jemand mit einer
     *                      völlig richtigen Kennung zu lesen, sie sei
     *                      unbekannt; er würde sie prüfen, statt es einfach
     *                      noch einmal zu versuchen. Erkannt wird der Fall an
     *                      SecurityAspect::provideIn($context)
     *                      ->getReceivedRequestToken(), das dann kein
     *                      RequestToken ist (false oder null).
     */
    private function grund(ServerRequestInterface $request, bool $versuch): string
    {
        if (!$versuch) {
            return GatePage::REASON_NONE;
        }
        $ausAdresse = $request->getAttribute(QrTokenLogin::ATTRIBUTE_URL_LOGIN) === true;
        if (!$ausAdresse) {
            // Nur der Formularweg trägt überhaupt ein Anfragezeichen — der
            // Adressweg bekommt seins synthetisch von AllowUrlTokenLogin und
            // kann hier also nie "expired" werden.
            $empfangenesToken = SecurityAspect::provideIn($this->context)->getReceivedRequestToken();
            if (!$empfangenesToken instanceof RequestToken) {
                return GatePage::REASON_EXPIRED;
            }
        }
        return GatePage::REASON_UNKNOWN;
    }
}
