<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Frontend;

use Phomo17\CasinoAccount\Service\PlayerTokenGenerator;
use Phomo17\CasinoAccount\Service\PlayerUrlBuilder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\SecurityAspect;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Security\RequestToken;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;

/**
 * Der Zeichner der Torseite. Beide Middlewares brauchen ihn (das Tor für den
 * Normalfall, die Übersetzerin für die Sperre) — deshalb ein eigener Dienst
 * und nicht zweimal derselbe Code.
 *
 * WARUM DAS RENDERN HIER ÜBERHAUPT GEHT. Die Torseite entsteht, bevor TYPO3
 * überhaupt weiß, welche Seite gemeint war. Es gibt also kein TypoScript,
 * keinen Seitenzusammenhang und keine Seiten-Vorlage. Gebraucht wird deshalb
 * der allgemeine Vorlagenbauer des Kerns: ViewFactoryInterface mit
 * ViewFactoryData (in 13.4 vorhanden). Zwei Dinge funktionieren an dieser
 * Stelle nachweislich:
 *   - f:translate mit einem vollständigen LLL:EXT:…-Schlüssel — der
 *     ViewHelper braucht dafür kein TSFE, sondern nur die Anfrage
 *     (TranslateViewHelper, Locales::createLocaleFromRequest(), gespeist aus
 *     dem language-Merkmal, das die Site-Schicht weit vorher gesetzt hat).
 *   - PathUtility::getPublicResourceWebPath('EXT:…') für die Adressen von
 *     CSS und JavaScript — der dokumentierte Weg, aus einem EXT:-Pfad eine
 *     Web-Adresse zu machen.
 *
 * NACHGEPRÜFT (D2d-Nachbesserung, derselbe Fehler wie bei AccountBar):
 * <f:translate> in Gate/Index.html geht über Extbase's LocalizationUtility,
 * die für plugin.tx_*._LOCAL_LANG das VOLLSTÄNDIGE TypoScript-Setup braucht
 * (FrontendTypoScript::getSetupArray()) und bei einer aus dem
 * Seitenzwischenspeicher gelieferten Seite mit RuntimeException #1666513645
 * abbricht, weil der Kern dieses Setup dort absichtlich nicht aufbaut
 * (PrepareTypoScriptFrontendRendering::$needsFullSetup). Damit render() DEN
 * SELBEN Fehler bekäme, müsste eine der drei Aufrufstellen innerhalb des
 * Zwischenspeicher-Zweigs der Middleware-Kette liegen — also NACH
 * typo3/cms-frontend/page-resolver, wo TSFE aus dem Zwischenspeicher gefüllt
 * wird. Das ist nachweislich nicht der Fall, für alle drei Aufrufstellen:
 *
 *   1. QrGate::process(), Normalfall (Zeile ~100, reason none/unknown/expired)
 *      — die Schicht 'casino_account/qr-gate' steht in
 *      Configuration/RequestMiddlewares.php ausdrücklich 'before' =>
 *      ['casino_account/account-bar', 'typo3/cms-frontend/page-resolver'].
 *   2. QrTokenLogin::process(), Sperre wegen zu vieler Versuche (Zeile ~83,
 *      REASON_RATE_LIMITED) — 'casino_account/qr-login' steht ganz vorn,
 *      'before' => ['typo3/cms-frontend/authentication'], also erst recht vor
 *      page-resolver.
 *   3. Abmelden (QrGate::process(), body['logintype'] === 'logout') — dieser
 *      Zweig rendert die Torseite überhaupt NICHT, sondern liefert eine
 *      RedirectResponse (303); render() wird hier gar nicht aufgerufen.
 *
 * Da 'before' in der resolvierten Kette bindend ist (der Kern bricht beim
 * Aufbau ab, wenn eine 'before'/'after'-Vorgabe nicht einhaltbar wäre — siehe
 * MiddlewareStackResolver), läuft render() in jedem der drei Fälle, BEVOR
 * TSFE überhaupt existiert — ob die angefragte Seite normalerweise aus dem
 * Zwischenspeicher käme, spielt an dieser Stelle der Kette keine Rolle mehr,
 * weil die Seitenauflösung selbst noch nicht stattgefunden hat. Deshalb bleibt
 * <f:translate> in Gate/Index.html unverändert.
 */
final readonly class GatePage
{
    public const REASON_NONE = 'none';
    public const REASON_UNKNOWN = 'unknown';
    public const REASON_EXPIRED = 'expired';
    public const REASON_RATE_LIMITED = 'rate';

    /**
     * Die Anmeldespuren, die aus einer Adresse entfernt werden, bevor sie als
     * Formularziel (hier) oder als Umleitungsziel (QrGate::sauber()) benutzt
     * wird. Beide Klassen führen diese Liste unabhängig — es gibt keine
     * gemeinsame Basisklasse, und eine dritte Datei nur für sechs
     * Zeichenketten wäre mehr Code als das, was sie ersetzt.
     */
    private const ANMELDESPUREN = [
        PlayerUrlBuilder::PARAMETER,
        'logintype',
        'user',
        'pass',
        'permalogin',
        RequestToken::PARAM_NAME,
    ];

    public function __construct(
        private ViewFactoryInterface $viewFactory,
        private Context $context,
    ) {}

    public function render(ServerRequestInterface $request, string $reason, int $status): ResponseInterface
    {
        $view = $this->viewFactory->create(new ViewFactoryData(
            templateRootPaths: ['EXT:casino_account/Resources/Private/Templates/'],
            request: $request,
        ));

        $view->assignMultiple([
            // Das Formular schickt an DIESELBE Adresse zurück, nur ohne die
            // Anmeldespuren. Damit landet ein zweiter Versuch wieder hier,
            // und nach dem Erfolg leitet das Tor auf genau diese Adresse um
            // — der Spielende kommt also dort an, wo er hinwollte.
            'action' => $this->sauber($request),
            'parameter' => PlayerUrlBuilder::PARAMETER,
            'tokenLength' => PlayerTokenGenerator::LENGTH,
            'reason' => $reason,
            'requestTokenName' => RequestToken::PARAM_NAME,
            'requestToken' => $this->anfragezeichen(),
            'cssUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_account/Resources/Public/Css/frontend.css'),
            'tokensCssUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_startpage/Resources/Public/Css/tokens.css'),
            'jsUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_account/Resources/Public/JavaScript/gate-scan.js'),
            'lang' => $this->sprache($request),
        ]);

        return new HtmlResponse($view->render('Gate/Index'), $status, [
            // Eine Anmeldeseite darf nirgends liegenbleiben — weder im
            // Browser, noch in einem Zwischenspeicher davor. Sonst bekäme
            // der Nächste am selben Gerät sie zu sehen, obwohl er angemeldet
            // ist (oder umgekehrt).
            'Cache-Control' => 'no-store, private',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }

    /**
     * Das Anfragezeichen für das Formular — derselbe Weg, den der f:form-
     * ViewHelper des Kerns geht (FormViewHelper::renderRequestTokenHiddenField()):
     * Bereich 'core/user-auth/fe', Signierart 'nonce', ausgegeben als
     * hash-signiertes JWT.
     *
     * WARUM NICHT EINFACH <f:form requestToken="…">: dieser ViewHelper baut
     * seine Adresse über den Extbase-Zusammenhang, den es hier nicht gibt.
     * Der Wert ist derselbe; er entsteht nur eine Ebene tiefer.
     *
     * Das zugehörige Nonce-Plätzchen hängt die Kern-Schicht
     * RequestTokenMiddleware auf dem Rückweg an die Antwort — sie liegt
     * außerhalb von uns, deshalb ist dafür nichts zu tun.
     */
    private function anfragezeichen(): string
    {
        $securityAspect = SecurityAspect::provideIn($this->context);
        $signingProvider = $securityAspect->getSigningSecretResolver()->findByType('nonce');
        if ($signingProvider === null) {
            // Kann in einer TYPO3-13.4-Installation praktisch nicht
            // vorkommen — die Signierart 'nonce' meldet der Kern selbst an.
            // Träte es doch ein, ist ein lauter Abbruch richtiger als eine
            // Torseite, deren Formular niemals eine Anmeldung auslösen kann.
            throw new \RuntimeException(
                'Keine Signierart "nonce" gefunden — ohne sie kann die Torseite kein gültiges Anfragezeichen ausstellen.',
                1757000010
            );
        }
        $signingSecret = $signingProvider->provideSigningSecret();
        $requestToken = RequestToken::create('core/user-auth/fe');
        return $requestToken->toHashSignedJwt($signingSecret);
    }

    /**
     * Dieselbe Adresse ohne jede Spur der Anmeldung. Entfernt werden die
     * sechs Namen aus ANMELDESPUREN; alles andere bleibt stehen — wer einen
     * Automaten mit einem eigenen Parameter aufgerufen hat, soll dort auch
     * landen.
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

    /** Die Sprache aus dem language-Merkmal der Site-Schicht, Rückfall 'de'. */
    private function sprache(ServerRequestInterface $request): string
    {
        $language = $request->getAttribute('language');
        return $language instanceof SiteLanguage ? $language->getLocale()->getLanguageCode() : 'de';
    }
}
