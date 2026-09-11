<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Middleware;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Middleware\QrGate;
use Phomo17\CasinoAccount\Service\QrMode;
use Phomo17\CasinoLobby\Domain\Lobby;
use Phomo17\CasinoLobby\Domain\LobbyRepository;
use Phomo17\CasinoLobby\Domain\Seat;
use Phomo17\CasinoLobby\Frontend\LobbyOverviewPage;
use Phomo17\CasinoLobby\Frontend\SeatStrip;
use Phomo17\CasinoLobby\Lobby\LobbyGames;
use Phomo17\CasinoLobby\Service\LobbyService;
use Phomo17\CasinoLobby\Service\LobbyState;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Http\Stream;
use TYPO3\CMS\Core\Routing\PageArguments;
use TYPO3\CMS\Core\Utility\PathUtility;

/**
 * Die Weiche unter der Adresse eines Tisches (CONCEPT.md D.10.3): Tisch mit
 * Platzleiste oder Übersicht?
 *
 * WARUM DIESE SCHICHT NACH page-resolver LIEGT (anders als LobbyEndpoint):
 * sie muss wissen, WELCHES Spiel auf der aufgelösten Seite steht — das
 * beantwortet Schritt 4 (spielAufSeite()) über eine indizierte Abfrage auf
 * tt_content.CType, nicht über das gerenderte Markup (das kostete im
 * Übersichtsfall eine vollständig gerenderte Seite, die weggeworfen wird).
 * Sie liegt zugleich NACH casino_account/account-bar, damit die von ihr
 * gerenderte Übersichtsseite die Kontenleiste bekommt wie jede andere Seite
 * (D.7). Ausführliche Begründung: Configuration/RequestMiddlewares.php.
 *
 * SEIT UMSETZUNGSSTÜCK D4c speist einspeisen() zusätzlich die Platzleiste
 * (SeatStrip) unmittelbar vor </body> ein — als letzter Schritt, NACHDEM
 * Stylesheet und Zustandsblock im Kopf stehen. Die dafür nötigen Plätze holt
 * diese Klasse selbst über LobbyRepository::seatsOf(); LobbyService liefert
 * über platzHolen() bereits die Lobby samt dem eigenen Platz, eine zweite
 * Sperre ist dafür nicht nötig (die Plätze werden nur GELESEN).
 */
final readonly class LobbyTable implements MiddlewareInterface
{
    public function __construct(
        private QrMode $qrMode,
        private LobbyService $lobbies,
        private LobbyState $state,
        private LobbyOverviewPage $uebersicht,
        private LobbyRepository $lobbyRepository,
        private SeatStrip $seatStrip,
        private ConnectionPool $connectionPool,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->qrMode->isOn()) {
            return $handler->handle($request);
        }
        $spielender = $request->getAttribute(QrGate::ATTRIBUTE_PLAYER);
        if (!$spielender instanceof Player) {
            return $handler->handle($request);
        }
        $routing = $request->getAttribute('routing');
        $seite = $routing instanceof PageArguments ? $routing->getPageId() : 0;
        if ($seite <= 0) {
            return $handler->handle($request);
        }
        $spiel = $this->spielAufSeite($seite);
        if ($spiel === null) {
            return $handler->handle($request);
        }

        $jetzt = (int)($GLOBALS['EXEC_TIME'] ?? time());
        $this->lobbies->aufraeumen($spiel, $jetzt);
        $platzErgebnis = $this->lobbies->platzHolen($spielender, $spiel, $jetzt);

        if ($platzErgebnis['sitzt'] === false) {
            return $this->uebersicht->render($request, $spiel, $spielender);
        }

        $antwort = $handler->handle($request);
        if ($antwort->getStatusCode() !== 200
            || !str_contains($antwort->getHeaderLine('Content-Type'), 'text/html')) {
            return $antwort;
        }
        return $this->einspeisen($antwort, $request, $spiel, $platzErgebnis['lobby'], $platzErgebnis['platz'], $jetzt);
    }

    /**
     * Welches Lobbyspiel steht auf dieser Seite? Eine indizierte Abfrage auf
     * tt_content.CType — dieselben drei Schlüssel, die auch die Platzzahlen
     * tragen (LobbyGames::SPIELE), weil Registry-Schlüssel, Extension-Key,
     * CType und data-ck-table-key in diesem Projekt bei allen drei Tischen
     * denselben Wert haben (Roulette::CTYPE, Craps::CTYPE, Blackjack::CTYPE).
     * Der Mustertisch (CType 'casino_tisch_muster') fällt durch diese Prüfung
     * heraus, ohne dass er hier genannt werden müsste.
     */
    private function spielAufSeite(int $seite): ?string
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('tt_content');
        $queryBuilder->getRestrictions()->removeAll();

        $cType = $queryBuilder
            ->select('CType')
            ->from('tt_content')
            ->where(
                $queryBuilder->expr()->eq(
                    'pid',
                    $queryBuilder->createNamedParameter($seite, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->eq('deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('hidden', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)),
                $queryBuilder->expr()->in(
                    'CType',
                    $queryBuilder->createNamedParameter(array_keys(LobbyGames::SPIELE), Connection::PARAM_STR_ARRAY)
                ),
                $queryBuilder->expr()->in(
                    'sys_language_uid',
                    $queryBuilder->createNamedParameter([0, -1], Connection::PARAM_INT_ARRAY)
                )
            )
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchOne();

        return is_string($cType) && LobbyGames::kennt($cType) ? $cType : null;
    }

    /**
     * Speist Stylesheet, Zustandsblock UND (seit Umsetzungsstück D4c) die
     * Platzleiste selbst in die fertige Tischantwort ein — dieselbe Bauart
     * wie AccountBar::process().
     */
    private function einspeisen(ResponseInterface $antwort, ServerRequestInterface $request, string $spiel, Lobby $lobby, Seat $platz, int $jetzt): ResponseInterface
    {
        $inhalt = (string)$antwort->getBody();
        if (!str_contains($inhalt, '</head>') || !str_contains($inhalt, '<head')) {
            return $antwort;
        }

        $cssUrl = PathUtility::getPublicResourceWebPath('EXT:casino_lobby/Resources/Public/Css/lobby.css');
        $inhalt = str_ireplace(
            '</head>',
            '<link rel="stylesheet" href="' . htmlspecialchars($cssUrl, ENT_QUOTES) . '"></head>',
            $inhalt
        );

        // Der Zustandsblock, UNMITTELBAR NACH DEM ÖFFNENDEN <head> — dieselbe
        // Begründung wie bei AccountBar::process(): der Kern bindet
        // ES-Module als <script type="module" async> ein, ein Gerät muss den
        // Zustand aber SYNCHRON beim Laden lesen können.
        $zustand = $this->state->forSeat($spiel, $platz, $request);
        $block = '<script type="application/json" data-cl-state>'
            . json_encode(
                $zustand,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
                | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            )
            . '</script>';
        // preg_replace_callback statt preg_replace: $block kann im Ersatztext
        // Zeichenfolgen enthalten, die preg_replace als Rückverweis deutete.
        $inhalt = preg_replace_callback(
            '/<head\b[^>]*>/i',
            static fn (array $treffer): string => $treffer[0] . $block,
            $inhalt,
            1
        );

        // Die Platzleiste selbst, unmittelbar vor </body> (Plan 4.21, Schritt
        // 3; die Klasse SeatStrip kommt mit Umsetzungsstück D4c). Sie wird VOR
        // der Kontenleiste aus casino_account eingespeist, weil diese Schicht
        // NACH casino_account/account-bar im Stapel liegt (Configuration/
        // RequestMiddlewares.php) — der Kontenleisten-Code lief also bereits,
        // ihr </body>-Einschub steht schon im Inhalt, und str_ireplace()
        // trifft auf das verbleibende, EIGENE </body> derselben Stelle.
        if (str_contains($inhalt, '</body>')) {
            $plaetze = $this->lobbyRepository->seatsOf($lobby->uid);
            $leiste = $this->seatStrip->render($request, $spiel, $lobby, $platz, $plaetze, $jetzt);
            $inhalt = str_ireplace('</body>', $leiste . '</body>', $inhalt);
        }

        $koerper = new Stream('php://temp', 'rw');
        $koerper->write($inhalt);
        return $antwort
            ->withBody($koerper)
            // Eine Seite, in der eine Lobby-Nummer und eine Platzsituation
            // stehen, gehört in keinen fremden Zwischenspeicher.
            ->withHeader('Cache-Control', 'no-store, private')
            // DIE TEUERSTE LEKTION AUS D2 (AccountBar::process()-Klassenkopf,
            // dort ausführlich hergeleitet): 'typo3/cms-frontend/
            // content-length-headers' setzt Content-Length aus der
            // UNVERÄNDERTEN Seite, näher am Kern als diese Schicht — ohne
            // withoutHeader() schneidet der Webserver die Antwort an der
            // alten, zu kleinen Länge ab.
            ->withoutHeader('Content-Length');
    }
}
