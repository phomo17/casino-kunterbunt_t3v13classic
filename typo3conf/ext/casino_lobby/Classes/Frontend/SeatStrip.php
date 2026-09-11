<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Frontend;

use Phomo17\CasinoLobby\Domain\Lobby;
use Phomo17\CasinoLobby\Domain\Seat;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Site\Entity\SiteLanguage;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Core\View\ViewFactoryData;
use TYPO3\CMS\Core\View\ViewFactoryInterface;

/**
 * Zeichnet die Platzleiste als HTML-Bruchstück (CONCEPT.md D.10.1, D.10.6),
 * das LobbyTable vor </body> einspeist. Dieselbe Aufteilung wie
 * AccountBar::leiste(): eine Middleware soll schalten, nicht zeichnen.
 *
 * KEIN <f:translate> (Entscheidung 4.0.7 des Plans, dieselbe Begründung wie
 * bei LobbyOverviewPage): alle Beschriftungen werden hier, in PHP, über
 * LanguageServiceFactory + sL() aufgelöst.
 */
final readonly class SeatStrip
{
    public function __construct(
        private ViewFactoryInterface $viewFactory,
        private LanguageServiceFactory $languageServiceFactory,
    ) {}

    /**
     * @param list<Seat> $plaetze alle Plätze der Lobby, nach Platznummer sortiert
     */
    public function render(ServerRequestInterface $request, string $spiel, Lobby $lobby, Seat $meiner, array $plaetze, int $jetzt): string
    {
        $labels = $this->beschriftungen($request, $lobby, $meiner, count($plaetze), $jetzt);

        $view = $this->viewFactory->create(new ViewFactoryData(
            templateRootPaths: ['EXT:casino_lobby/Resources/Private/Templates/'],
            request: $request,
        ));
        $view->assignMultiple([
            'lobby' => [
                'zustand' => $lobby->state,
                'runde' => $lobby->roundNo,
                'saatKurz' => substr($lobby->seed, 0, 8),
                'restMs' => $lobby->restMs($jetzt),
                // Das Spiel steht am Wurzelelement der Leiste, weil sich drei
                // Dinge danach richten: ob die Würfel-Warteliste sichtbar ist
                // (craps), ob Kartenrücken gezeichnet werden (blackjack) und
                // ob die Zugmarke etwas bedeutet (blackjack).
                'spiel' => $spiel,
                'dran' => $lobby->turnSeat,
            ],
            'plaetze' => $this->reihe($lobby, $plaetze, $meiner),
            'meiner' => $meiner->seatNo,
            'labels' => $labels,
            'jsUrl' => PathUtility::getPublicResourceWebPath('EXT:casino_lobby/Resources/Public/JavaScript/lobby-live.js'),
        ]);
        return $view->render('Lobby/Strip');
    }

    /**
     * Alle Plätze von 1 bis seatsMax, in aufsteigender Reihenfolge — belegte
     * mit Namen, freie mit dem Platzhalter "frei" (label kommt aus der
     * Vorlage). Die optische Ordnung "Platz 1 ganz rechts" (D.10.3) ist reine
     * Darstellung und liegt im Stylesheet (.cl-strip__seats, row-reverse),
     * nicht in dieser Sortierung — die Liste selbst bleibt in Lesereihenfolge
     * aufsteigend.
     *
     * @param list<Seat> $plaetze
     * @return list<array{nr: int, name: string, ich: bool, shooterNr: int, einsatz: int, karten: int}>
     */
    private function reihe(Lobby $lobby, array $plaetze, Seat $meiner): array
    {
        $belegt = [];
        foreach ($plaetze as $platz) {
            $belegt[$platz->seatNo] = $platz;
        }

        $reihe = [];
        for ($nr = 1; $nr <= $lobby->seatsMax; $nr++) {
            $platz = $belegt[$nr] ?? null;
            $reihe[] = [
                'nr' => $nr,
                'name' => $platz?->name ?? '',
                'ich' => $nr === $meiner->seatNo,
                // Die Wartelistennummer für die Würfel (0 = nicht
                // eingetragen). Craps zeigt sie, die anderen beiden Spiele
                // nicht — welches Spiel gerade läuft, entscheidet das
                // Stylesheet über data-cl-game am Wurzelelement, nicht diese
                // Schleife.
                'shooterNr' => $platz?->shooterNo ?? 0,
                // Beim Laden steht hier 0; ab der ersten Abfrage führt
                // lobby-live.js beides nach. Sie stehen trotzdem im
                // ausgelieferten HTML, damit die Leiste nicht eine Sekunde
                // lang anders aussieht als danach.
                'einsatz' => 0,
                'karten' => 0,
            ];
        }
        return $reihe;
    }

    /**
     * Alle Texte der Platzleiste, fertig aufgelöst (Entscheidung 4.0.7).
     *
     * @return array<string, string>
     */
    private function beschriftungen(ServerRequestInterface $request, Lobby $lobby, Seat $meiner, int $besetzt, int $jetzt): array
    {
        $language = $request->getAttribute('language');
        $languageService = $language instanceof SiteLanguage
            ? $this->languageServiceFactory->createFromSiteLanguage($language)
            : $this->languageServiceFactory->create('de');

        $sL = fn (string $key): string => $languageService->sL(
            'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:' . $key
        );

        $stripAllein = $sL('strip.allein');
        $stripZusammenVorlage = $sL('strip.zusammen');
        $zusammenText = $besetzt <= 1 ? $stripAllein : str_replace('{0}', (string)$besetzt, $stripZusammenVorlage);

        return [
            'platz' => str_replace(['{0}', '{1}'], [(string)$meiner->seatNo, (string)$lobby->seatsMax], $sL('strip.platz')),
            'zusammen' => $zusammenText,
            'stripAllein' => $stripAllein,
            'stripZusammenVorlage' => $stripZusammenVorlage,
            'verlassen' => $sL('strip.verlassen'),
            'frei' => $sL('strip.frei'),
            'runde' => str_replace('{0}', (string)$lobby->roundNo, $sL('strip.runde')),
            'zustandSetzen' => $sL('zustand.setzen'),
            'zustandGesperrt' => $sL('zustand.gesperrt'),
            'zustandLaeuft' => $sL('zustand.laeuft'),
            'zustandAuswerten' => $sL('zustand.auswerten'),
            'zustandAktuell' => $this->zustandText($sL, $lobby),
            'uhrRest' => $sL('uhr.rest'),
            'uhrKeine' => $sL('uhr.keine'),
            'uhrAktuell' => $this->uhrText($sL, $lobby, $jetzt),
            'meldungWeg' => $sL('meldung.weg'),
            'meldungGetrennt' => $sL('meldung.getrennt'),
            'meldungNeu' => $sL('meldung.neu'),
            // Die Brücke zu den drei Tischen (Plan 4.10/4.11): die Vorlagen
            // für '{0}' bleiben unaufgelöst — lobby-live.js füllt sie.
            'einsatzVorlage' => $sL('strip.einsatz'),
            'einsatzKeiner' => $sL('strip.einsatz.keiner'),
            'gewinnVorlage' => $sL('strip.gewinn'),
            'verlustVorlage' => $sL('strip.verlust'),
            'shooter' => $sL('strip.shooter'),
            'shooterWarteVorlage' => $sL('strip.shooter.warte'),
            'shooterEin' => $sL('strip.shooter.ein'),
            'shooterAus' => $sL('strip.shooter.aus'),
            'dran' => $sL('strip.dran'),
            'dranIchVorlage' => $sL('strip.dran.ich'),
            'kartenVorlage' => $sL('strip.karten'),
            'wartet' => $sL('strip.wartet'),
        ];
    }

    /** @param callable(string): string $sL */
    private function zustandText(callable $sL, Lobby $lobby): string
    {
        return match ($lobby->state) {
            'gesperrt' => $sL('zustand.gesperrt'),
            'laeuft' => $sL('zustand.laeuft'),
            // NICHT $lobby->result ROH: seit D5-1 ist das Feld rundenmarkiert
            // ("<runde>-<wert>"). Roh gelesen stünde beim ersten Seitenaufbau
            // "5-rot" statt "rot" in der Leiste, bis die erste Abfrage von
            // lobby-live.js den Text ersetzt. Lobby::ergebnis() zerlegt die
            // Markierung — derselbe Weg, den LobbyService::stand() schon geht.
            'auswerten' => str_replace('{0}', $lobby->ergebnis()['wert'], $sL('zustand.auswerten')),
            default => $sL('zustand.setzen'),
        };
    }

    /**
     * Der beim Laden der Seite gültige Uhrtext, damit die Anzeige nicht erst
     * nach der ersten Abfrage von lobby-live.js einen Wert bekommt.
     *
     * @param callable(string): string $sL
     */
    private function uhrText(callable $sL, Lobby $lobby, int $jetzt): string
    {
        $restMs = $lobby->restMs($jetzt);
        if ($restMs <= 0) {
            return $sL('uhr.keine');
        }
        return str_replace('{0}', (string)(int)ceil($restMs / 1000), $sL('uhr.rest'));
    }
}
