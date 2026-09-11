<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Frontend;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoLobby\Domain\Lobby;
use Phomo17\CasinoLobby\Domain\LobbyRepository;
use Phomo17\CasinoLobby\Lobby\LobbyGames;
use Phomo17\CasinoLobby\Service\LobbyState;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\HtmlResponse;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;

/**
 * Der Zeichner der Übersichtsseite (CONCEPT.md D.10.3): „An welchem Tisch
 * möchtest du spielen?" Sie entsteht — genau wie die Torseite aus
 * casino_account (GatePage) — außerhalb jedes Seitenzusammenhangs, unter der
 * Adresse des Tisches selbst: kein Datensatz, keine zweite Adresse.
 *
 * KEIN <f:translate> (Entscheidung 4.0.7 des Plans): diese Seite entsteht
 * NACH typo3/cms-frontend/page-resolver (Configuration/RequestMiddlewares.php,
 * casino_lobby/table), die angefragte Seite kann also aus dem
 * Seitenzwischenspeicher stammen — genau die Lage, in der <f:translate>
 * RuntimeException #1666513645 wirft (siehe AccountBar.php-Klassenkopf für
 * die ausführliche Herleitung desselben Fehlers). Alle Beschriftungen werden
 * deshalb hier, in PHP, über LanguageServiceFactory + sL() aufgelöst und der
 * Vorlage fertig übergeben.
 */
final readonly class LobbyOverviewPage
{
    public function __construct(
        private ViewFactoryInterface $viewFactory,
        private LanguageServiceFactory $languageServiceFactory,
        private LobbyRepository $lobbies,
        private LobbyState $state,
    ) {}

    public function render(ServerRequestInterface $request, string $spiel, Player $spielender): ResponseInterface
    {
        $lobbys = $this->lobbies->findByGame($spiel);
        $belegung = $this->lobbies->occupancyByGame($spiel);
        $labels = $this->beschriftungen($request, $spiel);

        $view = $this->viewFactory->create(new ViewFactoryData(
            templateRootPaths: ['EXT:casino_lobby/Resources/Private/Templates/'],
            request: $request,
        ));
        $view->assignMultiple([
            'spiel' => $spiel,
            'lobbys' => array_map(
                static function (Lobby $lobby) use ($belegung, $labels): array {
                    $besetzt = $belegung[$lobby->uid] ?? 0;
                    return [
                        'uid' => $lobby->uid,
                        'name' => str_replace('{0}', (string)$lobby->uid, $labels['lobby']),
                        'belegung' => str_replace(['{0}', '{1}'], [(string)$besetzt, (string)$lobby->seatsMax], $labels['belegung']),
                        'voll' => $besetzt >= $lobby->seatsMax,
                    ];
                },
                $lobbys
            ),
            'neu' => count($lobbys) < LobbyGames::MAX_LOBBYS,
            'max' => LobbyGames::plaetze($spiel),
            'labels' => $labels,
            'zustandJson' => json_encode(
                $this->state->forSeat($spiel, null, $request),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
                | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            ),
            'cssUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_lobby/Resources/Public/Css/lobby.css'),
            'tokensCssUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_startpage/Resources/Public/Css/tokens.css'),
            'jsUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_lobby/Resources/Public/JavaScript/lobby-live.js'),
            'lang' => $this->sprache($request),
        ]);

        // Rückgabewert 200, nicht 401 oder 302: die Person ist angemeldet und
        // bekommt genau die Seite, die sie an dieser Adresse jetzt bekommen
        // soll — sie sitzt nur noch nicht am Tisch (Plan, Abschnitt 4.23).
        return new HtmlResponse($view->render('Lobby/Overview'), 200, [
            'Cache-Control' => 'no-store, private',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }

    /**
     * Alle Texte der Übersichtsseite, fertig aufgelöst (Entscheidung 4.0.7).
     * Der Spielname (uebersicht.spiel.<spiel>) fließt in den Titel der Seite
     * ein — die Schlüssel wurden in D4a bereits reserviert („benutzt werden
     * sie erst ab D4b", locallang.xlf-Klassenkommentar).
     *
     * @return array<string, string>
     */
    private function beschriftungen(ServerRequestInterface $request, string $spiel): array
    {
        $language = $request->getAttribute('language');
        $languageService = $language instanceof SiteLanguage
            ? $this->languageServiceFactory->createFromSiteLanguage($language)
            : $this->languageServiceFactory->create('de');

        $sL = fn (string $key): string => $languageService->sL(
            'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:' . $key
        );

        return [
            'spielName' => $sL('uebersicht.spiel.' . $spiel),
            'titel' => $sL('uebersicht.titel'),
            'einleitung' => $sL('uebersicht.einleitung'),
            'lobby' => $sL('uebersicht.lobby'),
            'belegung' => $sL('uebersicht.belegung'),
            'beitreten' => $sL('uebersicht.beitreten'),
            'voll' => $sL('uebersicht.voll'),
            'neu' => $sL('uebersicht.neu'),
            'neuAus' => str_replace('{0}', (string)LobbyGames::MAX_LOBBYS, $sL('uebersicht.neu.aus')),
        ];
    }

    /** Die Sprache aus dem language-Merkmal der Site-Schicht, Rückfall 'de'. */
    private function sprache(ServerRequestInterface $request): string
    {
        $language = $request->getAttribute('language');
        return $language instanceof SiteLanguage ? $language->getLocale()->getLanguageCode() : 'de';
    }
}
