<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Controller;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Qr\QrCodeFactory;
use Phomo17\CasinoAccount\Qr\QrSvgRenderer;
use Phomo17\CasinoAccount\Service\AccountStorage;
use Phomo17\CasinoAccount\Service\BackendUserMirror;
use Phomo17\CasinoAccount\Service\PlayerUrlBuilder;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\Components\ButtonBar;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Imaging\IconSize;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;

/**
 * Das Backend-Modul „Spielende" (CONCEPT.md D.3).
 *
 * Das Modul zeigt eine Liste, öffnet einen QR-Code und liefert ihn als Datei
 * aus — mehr nicht. Anlegen und Bearbeiten übernimmt die Formularmaschine des
 * Kerns über die Route „record_edit"; D.3.5 verlangt das ausdrücklich, und es
 * ist zugleich die Antwort auf D.12: die Formularmaschine des Kerns ist
 * tastaturbedienbar, eine selbst gebaute wäre es erst, wenn man sie mühsam
 * dazu macht.
 *
 * #[AsController] macht die Klasse im Dienst-Container öffentlich sichtbar.
 * Ohne dieses Attribut findet der Backend-Router die Klasse nicht; der Kern
 * meldet es über seine eigene Services.php an
 * (typo3/sysext/backend/Configuration/Services.php:39-44).
 *
 * UMSETZUNGSSTÜCK Dc: `AccountStorage` und `BackendUserMirror` sind jetzt
 * eingespritzt und in indexAction() verdrahtet (Plan, Abschnitt 7.1,
 * Umsetzungsstück Dc).
 *
 * UMSETZUNGSSTÜCK Dd: `qrAction()` und `downloadAction()` sind jetzt
 * ausgearbeitet. Der QR-Erzeuger steckt hinter der Schnittstelle
 * `QrCodeFactory` (heute: `BaconQrCodeFactory`, Begründung in
 * DECISIONS.md); der Aufrufer hier kennt nur die Schnittstelle.
 */
#[AsController]
final readonly class PlayerModuleController
{
    private const LANG = 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:';

    public function __construct(
        private ModuleTemplateFactory $moduleTemplateFactory,
        private UriBuilder $uriBuilder,
        private PageRenderer $pageRenderer,
        private FlashMessageService $flashMessageService,
        private PlayerRepository $players,
        private AccountStorage $storage,
        private BackendUserMirror $mirror,
        private PlayerUrlBuilder $urls,
        private QrCodeFactory $qrCodes,
        private QrSvgRenderer $svg,
        private IconFactory $iconFactory,
    ) {}

    /**
     * Die Liste (CONCEPT.md D.3.1).
     */
    public function indexAction(ServerRequestInterface $request): ResponseInterface
    {
        $view = $this->moduleTemplateFactory->create($request);
        $view->setTitle($this->translate('module.players.title'));

        // 1. Der Ordner, in dem die Konten liegen. Fehlt er, wird er hier
        //    angelegt — aber nur, wenn ein Administrator davorsitzt (siehe
        //    AccountStorage). Sonst bleibt es bei einer klaren, sichtbaren
        //    Ansage statt einer leeren Liste ohne Erklärung (Plan,
        //    Abschnitt 4.4, Regel 3).
        $storagePid = $this->storage->ensure();
        if ($storagePid === 0) {
            $this->flash('message.noStorage', ContextualFeedbackSeverity::WARNING);
            $view->assignMultiple(['rows' => [], 'newUrl' => '']);
            $this->pageRenderer->addCssFile('EXT:casino_account/Resources/Public/Css/backend.css');
            return $view->renderResponse('PlayerModule/Index');
        }

        // 2. Sicherheitsnetz für D.7.3: „alle vorhandenen Backend-Benutzer
        //    stehen mit 1.000.000 in der Liste". Der Abgleich läuft laut
        //    Konzept beim Aktivieren und bei jedem neuen Backend-Benutzer.
        //    Beides kann ausbleiben — die Aktivierung liegt vielleicht schon
        //    zurück, ein Benutzer kann auf einem anderen Weg entstanden
        //    sein. Deshalb läuft der Abgleich zusätzlich HIER, bei jedem
        //    Aufruf des Moduls. Er ist wiederholbar (er legt nur an, was
        //    fehlt) und kostet eine Abfrage.
        $mirrored = $this->mirror->syncAll($storagePid);
        if ($mirrored > 0) {
            $this->flash('message.mirrored', ContextualFeedbackSeverity::INFO, [$mirrored]);
        }

        $view->assignMultiple([
            'rows' => $this->decorate($this->players->findAllForList($storagePid)),
            'newUrl' => (string)$this->uriBuilder->buildUriFromRoute('record_edit', [
                'edit' => ['tx_casinoaccount_player' => [$storagePid => 'new']],
                'returnUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_players'),
            ]),
        ]);

        $this->pageRenderer->addCssFile(
            'EXT:casino_account/Resources/Public/Css/backend.css'
        );

        return $view->renderResponse('PlayerModule/Index');
    }

    /**
     * Die QR-Ansicht eines Spielenden (CONCEPT.md D.3.4).
     */
    public function qrAction(ServerRequestInterface $request): ResponseInterface
    {
        $player = $this->players->findByUid(
            (int)($request->getQueryParams()['player'] ?? 0)
        );
        if ($player === null) {
            // Kein Datensatz, keine Ansicht. Zurück zur Liste statt einer
            // Fehlerseite — der häufigste Grund ist ein Lesezeichen auf einen
            // gelöschten Spielenden.
            return new RedirectResponse(
                (string)$this->uriBuilder->buildUriFromRoute('casino_players')
            );
        }

        $url = $this->urls->forToken($player->token);
        $matrix = $this->qrCodes->create($url);

        $view = $this->moduleTemplateFactory->create($request);
        $view->setTitle(sprintf($this->translate('qr.title'), $player->name));
        $view->assignMultiple([
            'player' => $player,
            'url' => $url,
            'svg' => $this->svg->render(
                $matrix,
                sprintf($this->translate('qr.image.label'), $player->name)
            ),
            'fileName' => $this->fileName($player->name),
            'downloadUrl' => (string)$this->uriBuilder->buildUriFromRoute(
                'casino_players.download',
                ['player' => $player->uid]
            ),
            'backUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_players'),
        ]);

        $this->pageRenderer->addCssFile('EXT:casino_account/Resources/Public/Css/backend.css');
        $this->pageRenderer->loadJavaScriptModule('@phomo17/casino-account/qr-tools.js');

        // Die Schaltfläche „Zurück" oben in der Modulleiste — der Weg, den
        // TYPO3 dafür vorsieht, statt eines selbst gebauten Verweises.
        $buttonBar = $view->getDocHeaderComponent()->getButtonBar();
        $buttonBar->addButton(
            $buttonBar->makeLinkButton()
                ->setHref((string)$this->uriBuilder->buildUriFromRoute('casino_players'))
                ->setTitle($this->translate('qr.back'))
                ->setShowLabelText(true)
                ->setIcon($this->iconFactory->getIcon('actions-view-go-back', IconSize::SMALL)),
            ButtonBar::BUTTON_POSITION_LEFT,
            1
        );

        return $view->renderResponse('PlayerModule/Qr');
    }

    /**
     * Der QR-Code als Datei zum Herunterladen (CONCEPT.md D.3.4).
     *
     * Nur SVG. PNG entsteht im Browser aus genau diesem SVG — so verlangt es
     * D.4.3, und es erspart der Serverseite die Bildbibliothek.
     */
    public function downloadAction(ServerRequestInterface $request): ResponseInterface
    {
        $player = $this->players->findByUid(
            (int)($request->getQueryParams()['player'] ?? 0)
        );
        if ($player === null) {
            return new Response('php://temp', 404);
        }

        $matrix = $this->qrCodes->create($this->urls->forToken($player->token));
        $svg = $this->svg->render(
            $matrix,
            sprintf($this->translate('qr.image.label'), $player->name)
        );

        $response = new Response('php://temp', 200, [
            'Content-Type' => 'image/svg+xml; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $this->fileName($player->name) . '.svg"',
            // Ein QR-Code darf nirgends zwischengespeichert werden: er trägt
            // die Kennung einer Person.
            'Cache-Control' => 'no-store, private',
        ]);
        $response->getBody()->write($svg);
        return $response;
    }

    /**
     * Ein Dateiname, der auf jedem Betriebssystem funktioniert.
     *
     * Der Name darf laut D.3.2 beliebige Zeichen enthalten — ein Schrägstrich
     * im Namen würde als Verzeichnistrenner gelesen und ein Anführungszeichen
     * bräche den Content-Disposition-Kopf auf. Deshalb bleibt hier nur, was
     * unstrittig ist; bleibt nichts übrig, heißt die Datei „qr-code".
     */
    private function fileName(string $name): string
    {
        $safe = preg_replace('/[^\p{L}\p{N}_-]+/u', '-', $name) ?? '';
        $safe = trim($safe, '-');
        return $safe === '' ? 'qr-code' : 'qr-' . mb_strtolower($safe);
    }

    /**
     * Ergänzt jede Zeile um ihre beiden Adressen sowie das Gesamtvermögen und
     * den Anmeldezustand. Fluid soll anzeigen, nicht rechnen — deshalb
     * entstehen diese Werte hier und nicht in der Vorlage (Prüfung M-11).
     *
     * @param list<Player> $players
     * @return list<array{player: Player, total: int, online: bool, editUrl: string, qrUrl: string}>
     */
    private function decorate(array $players): array
    {
        $now = (int)($GLOBALS['EXEC_TIME'] ?? time());
        $returnUrl = (string)$this->uriBuilder->buildUriFromRoute('casino_players');

        $rows = [];
        foreach ($players as $player) {
            $rows[] = [
                'player' => $player,
                'total' => $player->total(),
                'online' => $player->isOnline($now),
                'editUrl' => (string)$this->uriBuilder->buildUriFromRoute('record_edit', [
                    'edit' => ['tx_casinoaccount_player' => [$player->uid => 'edit']],
                    'returnUrl' => $returnUrl,
                ]),
                'qrUrl' => (string)$this->uriBuilder->buildUriFromRoute(
                    'casino_players.qr',
                    ['player' => $player->uid]
                ),
            ];
        }
        return $rows;
    }

    private function translate(string $key): string
    {
        return $this->getLanguageService()->sL(self::LANG . $key);
    }

    private function flash(string $key, ContextualFeedbackSeverity $severity, array $arguments = []): void
    {
        $text = $this->translate($key);
        if ($arguments !== []) {
            $text = vsprintf($text, $arguments);
        }
        $this->flashMessageService
            ->getMessageQueueByIdentifier()
            ->enqueue(new FlashMessage(
                $text,
                $this->translate($key . '.title'),
                $severity,
                true
            ));
    }

    private function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }
}
