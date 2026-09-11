<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Middleware;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Service\AccountState;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Http\Stream;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;

/**
 * D.7: „Gesamtvermögen = Kasse + Gerätekredit + Gewinnspeicher. Genau dieser
 * Wert steht oben auf jeder Seite, immer, egal wo man ist." Dazu das
 * „Abmelden" aus D.8, das es „auf jeder Seite" geben muss.
 *
 * DIE ENTSCHEIDUNG, WIE DIE LEISTE AUF DIE SEITE KOMMT: sie wird der
 * FERTIGEN HTML-Antwort EINGESPEIST, statt sie über TypoScript in die Seite
 * zu rendern — derselbe Weg, den der Kern selbst für genau diese Aufgabe
 * geht: das Admin-Panel wird in
 * adminpanel/Classes/Middleware/AdminPanelRenderer.php mit
 * str_ireplace('</body>', … . '</body>', $contents) in die Antwort gesetzt.
 *
 * Vier Gründe (Plan, Abschnitt 4.28), der zweite ist der zwingende:
 *   1. casino_startpage wird nicht angefasst (D.1: „Ist casino_account nicht
 *      installiert, verhält sich die Seite exakt wie nach Teil C.").
 *   2. DER SEITENZWISCHENSPEICHER KANN NICHT LÜGEN: TYPO3 legt eine
 *      gerenderte Seite ab und gibt sie allen Frontend-Benutzern DERSELBEN
 *      Benutzergruppe wieder — alle Spielenden liegen in derselben Gruppe.
 *      Stünde der Name in der gerenderten Seite, sähe der zweite Spieler den
 *      Namen und das Vermögen des ersten. Eingespeist wird die Leiste NACH
 *      dem Zwischenspeicher, in die fertige Antwort — die abgelegte Seite
 *      enthält sie nie.
 *   3. Kein TypoScript, kein Site Set, keine Zeile in typo3conf/sites/… —
 *      und damit auch kein Zustand, der beim Abschalten der Extension
 *      zurückbliebe.
 *   4. Bei ausgeschaltetem Modus wird die Antwort überhaupt nicht angefasst
 *      — keine zusätzliche Stylesheet-Zeile, kein Kommentar, kein Zeichen
 *      Unterschied zu Teil C.
 *
 * WARUM KEINE EIGENE SCHALTERABFRAGE HIER STEHT: diese Schicht liegt INNEN,
 * hinter QrGate (Configuration/RequestMiddlewares.php). QrGate setzt das
 * Merkmal ATTRIBUTE_PLAYER nur dann, wenn der QR-Modus an UND jemand
 * angemeldet ist; ist der Modus aus, reicht QrGate die Anfrage unverändert
 * durch, ohne das Merkmal zu setzen. Die Prüfung „ist {$spielender}
 * überhaupt ein Player" ist also zugleich die Schalterabfrage — eine zweite,
 * eigene wäre doppelt geprüft.
 */
final readonly class AccountBar implements MiddlewareInterface
{
    public function __construct(
        private ViewFactoryInterface $viewFactory,
        private LanguageServiceFactory $languageServiceFactory,
        private AccountState $accountState,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $antwort = $handler->handle($request);

        $spielender = $request->getAttribute(QrGate::ATTRIBUTE_PLAYER);
        if (!$spielender instanceof Player) {
            return $antwort;   // nicht angemeldet oder Modus aus: nichts zu tun
        }
        // Nur in eine fertige HTML-Seite. Ein Bild, eine JSON-Antwort, eine
        // Sitemap oder eine Umleitung wird NICHT angefasst — eine Leiste in
        // einer XML-Datei wäre kaputter Inhalt, kein Merkmal.
        if ($antwort->getStatusCode() !== 200 || !str_contains($antwort->getHeaderLine('Content-Type'), 'text/html')) {
            return $antwort;
        }

        $inhalt = (string)$antwort->getBody();
        if (!str_contains($inhalt, '</body>')) {
            return $antwort;   // nichts, wo man einhängen könnte: still lassen
        }

        if (str_contains($inhalt, '</head>')) {
            $cssUrl = PathUtility::getPublicResourceWebPath('EXT:casino_account/Resources/Public/Css/frontend.css');
            $inhalt = str_ireplace(
                '</head>',
                '<link rel="stylesheet" href="' . htmlspecialchars($cssUrl, ENT_QUOTES) . '"></head>',
                $inhalt
            );
        }

        // DER ZUSTANDSBLOCK (D.7.2 „Server ist die alleinige Wahrheit",
        // B.5.3 „Lesen synchron"), UNMITTELBAR NACH DEM ÖFFNENDEN <head>:
        // der Kern bindet ES-Module als <script type="module" async> ein
        // (JavaScriptRenderer.php, createScriptElement mit
        // 'async' => 'async' — nachgesehen, nicht angenommen). Ein solches
        // Modul kann laufen, BEVOR der Körper der Seite fertig geparst ist.
        // Ein Gerät, das den Servermodus erkennen will, muss den Zustand aber
        // SYNCHRON beim Laden lesen können. Steht der Block als erstes Kind
        // des <head>, ist er garantiert geparst, bevor irgendein
        // Skript-Element dahinter laufen kann. Vor </body> — dort, wo die
        // Leiste selbst steht — wäre er zu spät.
        if (str_contains($inhalt, '<head')) {
            $zustand = $this->accountState->forPlayer($spielender, $request);
            // JSON_HEX_TAG wandelt < und > in </> — damit kann kein
            // Inhalt das <script>-Element vorzeitig schließen, auch wenn ein
            // Speicherstand eines Tages beliebigen Text enthielte.
            $block = '<script type="application/json" data-ca-state>'
                . json_encode(
                    $zustand,
                    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
                    | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                )
                . '</script>';
            // preg_replace_callback statt preg_replace: $block kann im
            // Ersatztext Zeichenfolgen enthalten, die preg_replace als
            // Rückverweis (z. B. "$1") deuten würde — der Callback übergibt
            // den Ersatztext dagegen wörtlich, ohne diese Interpretation.
            $inhalt = preg_replace_callback(
                '/<head\b[^>]*>/i',
                static fn(array $treffer): string => $treffer[0] . $block,
                $inhalt,
                1
            );
        }

        // BEHOBENER BEFUND (Audit nach D3, K-02): die Leiste selbst bleibt
        // aus dem Cache-Grund oben (Punkt 2) unmittelbar vor </body> — auf
        // Bildschirmen ab 640 Bildpunkten steht sie dank position: fixed
        // trotzdem optisch ZUERST oben rechts. Ohne einen eigenen, frühen
        // Sprunglink lag „Abmelden" auf /craps und /roulette erst nach über
        // 80 Tabulatorstationen. Dieselbe Technik wie .ck-skiplink in
        // casino_startpage (Default.html/base.css): optisch verborgen, bis
        // der Link den Tastaturfokus bekommt (frontend.css,
        // .ca-bar__skiplink) — nur eben in dieser Datei selbst eingespeist,
        // weil casino_startpage nicht angefasst wird (D.1).
        if (str_contains($inhalt, '<body')) {
            $skiplink = '<a href="#ca-bar" class="ca-bar__skiplink">'
                . htmlspecialchars($this->beschriftungen($request)['skiplink'], ENT_QUOTES) . '</a>';
            $inhalt = preg_replace_callback(
                '/<body\b[^>]*>/i',
                static fn(array $treffer): string => $treffer[0] . $skiplink,
                $inhalt,
                1
            );
        }

        $inhalt = str_ireplace('</body>', $this->leiste($request, $spielender) . '</body>', $inhalt);

        $koerper = new Stream('php://temp', 'rw');
        $koerper->write($inhalt);
        return $antwort->withBody($koerper)
            // Eine Seite, in der ein Name steht, gehört in keinen fremden
            // Zwischenspeicher.
            ->withHeader('Cache-Control', 'no-store, private')
            // BEHOBENER FEHLER (D2d-Nachbesserung): frontend/Classes/Middleware/
            // ContentLengthResponseHeader.php (Bezeichner 'typo3/cms-frontend/
            // content-length-headers') setzt Content-Length aus der
            // Körpergröße AN IHRER EIGENEN STELLE der Schicht-Kette — und die
            // ist NICHT dort, wo die Reihenfolge im Kern-Quelltext vermuten
            // lässt (dort steht sie weit vorn, gleich nach maintenance-mode):
            // sie trägt keine eigene 'before'-Vorgabe gegen Anmeldung oder
            // Seitenauflösung, und die tatsächlich AUFGELÖSTE Kette (nachgeprüft
            // in der laufenden Installation, typo3temp/var/cache/code/core/
            // middlewares_frontend_*.php) setzt sie NÄHER AN DEN KERN als
            // 'casino_account/account-bar': ihr Rücklauf-Code — das Setzen der
            // Kopfzeile — läuft deshalb, SOBALD die Seite gerendert ist, ABER
            // BEVOR diese Schicht hier auf dem Rückweg die Leiste anhängt. Ohne
            // withoutHeader() bliebe der zu kleine, aus der noch UNVERÄNDERTEN
            // Seite berechnete Wert stehen, und der Webserver schneidet dann
            // alles ab, was über ihn hinausgeht: die Antwort endet mitten im
            // <footer>, ohne </body>, ohne </html>, ohne die Leiste — exakt so
            // gemessen (Kopf 68986, tatsächlich geliefert 68976 Zeichen). Der
            // Klassenkommentar des Kerns dort sagt es wörtlich: "all Content
            // outside the length of the content-length header will be cut
            // off!" Ohne den Kopf liefert der Server gestückelt (chunked) aus
            // — vollständig, unabhängig von der tatsächlichen Länge.
            //
            // BEWUSST NICHT der andere Weg (ein 'after' auf
            // typo3/cms-frontend/content-length-headers in
            // Configuration/RequestMiddlewares.php): der Kern kennzeichnet
            // diese Schicht ausdrücklich als "internal: do not use or
            // reference this middleware in your own code" — eine Abhängigkeit
            // auf einen internen Schichtnamen wäre so verboten wie ein Aufruf
            // einer als @internal markierten Methode.
            ->withoutHeader('Content-Length');
    }

    /**
     * Rendert die Kontenleiste über den allgemeinen Vorlagenbauer des Kerns
     * — dieselbe Bauart wie GatePage::render(): kein TypoScript, kein
     * Seitenzusammenhang nötig.
     */
    private function leiste(ServerRequestInterface $request, Player $spielender): string
    {
        $view = $this->viewFactory->create(new ViewFactoryData(
            templateRootPaths: ['EXT:casino_account/Resources/Private/Templates/'],
            request: $request,
        ));
        $view->assignMultiple([
            'player' => [
                'name' => $spielender->name,
                'total' => $spielender->total(),
                'admin' => $spielender->isAdmin,
            ],
            // Abmelden führt auf DIESELBE Adresse zurück — der Kern
            // verarbeitet logintype=logout in der Anmelde-Middleware, bevor
            // QrGate erneut läuft und dann sauber umleitet (siehe QrGate,
            // Fall "logintype === 'logout'").
            'action' => (string)$request->getUri(),
            'labels' => $this->beschriftungen($request),
            // NACHGETRAGEN IN UMSETZUNGSSTÜCK D3c: das Live-Modul
            // (Sperranzeige öffnen/schließen, Leiste im Betrieb nachführen)
            // kommt erst jetzt hinzu — solange die Datei nicht existierte,
            // wäre ein Verweis darauf ein 404 gewesen. Dieselbe Bauart wie
            // gate-scan.js auf der Torseite (GatePage::render(), 'jsUrl'):
            // die Adresse kommt aus PathUtility::getPublicResourceWebPath(),
            // gerendert wird sie in der Vorlage selbst, nicht durch
            // PHP-Zeichenkettenverkettung hier.
            'jsUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_account/Resources/Public/JavaScript/account-live.js'),
        ]);
        return $view->render('AccountBar/Index');
    }

    /**
     * BEHOBENER FEHLER (D2d-Nachbesserung): die Vorlage benutzte bisher
     * <f:translate>, das über Extbase's LocalizationUtility geht. Diese
     * Utility ruft ConfigurationManager->getConfiguration() auf, und der
     * braucht das VOLLSTÄNDIGE TypoScript-Setup (FrontendTypoScript::
     * getSetupArray()). Kommt die Seite aus dem Seitenzwischenspeicher, baut
     * der Kern dieses Setup ABSICHTLICH NICHT auf
     * (PrepareTypoScriptFrontendRendering: $needsFullSetup =
     * !$pageContentWasLoadedFromCache || $controller->isINTincScript()) —
     * getSetupArray() wirft dann RuntimeException #1666513645 ("Setup array
     * has not been initialized"), und jede zweite Anfrage derselben Seite
     * endete mit HTTP 500.
     *
     * Die Behebung: die Beschriftungen werden HIER, in PHP, aufgelöst — über
     * LanguageServiceFactory, ohne jede Abhängigkeit von Extbase oder vom
     * TypoScript-Setup — und der Vorlage als fertige Zeichenketten
     * übergeben. Fluids Auto-Maskierung (`{labels.label}` usw.) bleibt
     * dabei unverändert in Kraft; hier wird nur die ÜBERSETZUNG vorgezogen,
     * nicht die Ausgabe-Escapierung umgangen.
     *
     * NACHGETRAGEN IN UMSETZUNGSSTÜCK D3a: drei weitere Schlüssel für die
     * Sperranzeige (Index.html) kommen hinzu — dieselbe PHP-Auflösung, aus
     * demselben Grund.
     *
     * NACHGETRAGEN (Behebungslauf nach D3-Audit): 'total' (K-01, das
     * Gesamtvermögen braucht einen Namen — die XLIFF-Datei kannte
     * bar.total bereits, die Vorlage gab sie nur nie aus) und 'skiplink'
     * (K-02, eigener Sprunglink zur Kontenleiste).
     *
     * @return array{label: string, unit: string, total: string, logout: string,
     *               skiplink: string, lockTitle: string, lockRetry: string,
     *               lockReload: string, lockTextOffline: string,
     *               lockTextError: string, lockTextRetrying: string}
     */
    private function beschriftungen(ServerRequestInterface $request): array
    {
        $language = $request->getAttribute('language');
        $languageService = $language instanceof SiteLanguage
            ? $this->languageServiceFactory->createFromSiteLanguage($language)
            : $this->languageServiceFactory->create('de');

        $sL = fn(string $key): string => $languageService->sL(
            'LLL:EXT:casino_account/Resources/Private/Language/locallang.xlf:' . $key
        );

        return [
            'label' => $sL('bar.label'),
            'unit' => $sL('bar.unit'),
            'total' => $sL('bar.total'),
            'logout' => $sL('bar.logout'),
            'skiplink' => $sL('bar.skiplink'),
            'lockTitle' => $sL('lock.title'),
            'lockRetry' => $sL('lock.retry'),
            'lockReload' => $sL('lock.reload'),
            'lockTextOffline' => $sL('lock.text.offline'),
            'lockTextError' => $sL('lock.text.error'),
            'lockTextRetrying' => $sL('lock.text.retrying'),
        ];
    }
}
