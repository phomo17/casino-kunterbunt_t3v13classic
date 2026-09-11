<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Controller;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Service\PlayerSessionService;
use Phomo17\CasinoAccount\Service\QrMode;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;

/**
 * Das Backend-Modul „QR-Modus" (CONCEPT.md D.5).
 *
 * Es zeigt den Schalter, die Zahl der Angemeldeten und „Alle abmelden".
 * Dieselben Bausteine wie PlayerModuleController (ModuleTemplateFactory,
 * UriBuilder, FlashMessageService), damit ein Leser nicht zwei Bauarten
 * lernen muss.
 *
 * KEIN EIGENES ANFRAGEZEICHEN NÖTIG. Backend-Adressen, die
 * UriBuilder::buildUriFromRoute() baut, tragen bereits ein Token, das der
 * Backend-Router prüft. Die beiden Formulare schicken deshalb an genau
 * solche Adressen und brauchen kein eigenes Feld.
 *
 * WARUM DAS EINSCHALTEN ZWEI SCHRITTE HAT. D.5: „Beim Einschalten warnt das
 * Modul, dass ab sofort ohne Code nicht mehr gespielt werden kann." Ein
 * confirm()-Fenster aus JavaScript scheidet aus: es ist mit Hilfsmitteln
 * schlecht bedienbar, nicht prüfbar und widerspräche D.12 (die
 * Backend-Module bleiben mit der Tastatur bedienbar). Stattdessen: ein Klick
 * auf „Einschalten" führt auf dieselbe Seite mit ?confirm=on, dort steht die
 * Warnung und ein zweiter, ausdrücklicher Knopf. Ausschalten braucht keine
 * Warnung — es macht nichts kaputt, sondern gibt frei.
 *
 * BEWUSST NICHT GEBAUT: kein Abmelden einer EINZELNEN Person. D.5 nennt nur
 * „Alle abmelden"; ein zweiter Knopf je Zeile wäre ungefragt.
 */
#[AsController]
final readonly class QrModeModuleController
{
    private const LANG = 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:';

    public function __construct(
        private ModuleTemplateFactory $moduleTemplateFactory,
        private UriBuilder $uriBuilder,
        private PageRenderer $pageRenderer,
        private FlashMessageService $flashMessageService,
        private QrMode $qrMode,
        private PlayerSessionService $sessions,
        private PlayerRepository $players,
    ) {}

    /**
     * Die Übersicht (D.5).
     */
    public function indexAction(ServerRequestInterface $request): ResponseInterface
    {
        // 1. Liegengebliebenes Gerätegeld auszahlen. Wiederholbar, still,
        //    meldet sich nur, wenn es wirklich etwas getan hat.
        $ausgezahlt = $this->sessions->reconcile();
        if ($ausgezahlt > 0) {
            $this->flash('message.reconciled', ContextualFeedbackSeverity::INFO, [$ausgezahlt]);
        }

        // 2. Wer ist da? Angezeigt werden Name und „zuletzt gesehen" — NICHT
        //    die Rolle (D.6.2, ausdrückliche Vorgabe) und NICHT die Kennung
        //    (D.9: Kennungen erscheinen nie im Seitenquelltext).
        $uids = $this->sessions->loggedInPlayerUids();

        $view = $this->moduleTemplateFactory->create($request);
        $view->setTitle($this->translate('module.qrmode.title'));
        $view->assignMultiple([
            'on' => $this->qrMode->isOn(),
            'confirmOn' => ($request->getQueryParams()['confirm'] ?? '') === 'on',
            'online' => $this->buildOnlineList($uids),
            'onlineCount' => count($uids),
            'toggleUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_qr_mode.toggle'),
            'logoutAllUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_qr_mode.logout_all'),
            'confirmUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_qr_mode', ['confirm' => 'on']),
            'playersUrl' => (string)$this->uriBuilder->buildUriFromRoute('casino_players'),
        ]);
        $this->pageRenderer->addCssFile('EXT:casino_account/Resources/Public/Css/backend.css');
        return $view->renderResponse('QrModeModule/Index');
    }

    /**
     * Umschalten. Nur POST (die Route lässt nichts anderes zu) und danach
     * sofort zurück auf die Übersicht — „Absenden, Umleiten, Anzeigen", damit
     * ein Neuladen der Seite nicht ein zweites Mal schaltet.
     */
    public function toggleAction(ServerRequestInterface $request): ResponseInterface
    {
        $body = is_array($request->getParsedBody()) ? $request->getParsedBody() : [];
        $an = ($body['state'] ?? '') === 'on';
        $geaendert = $this->qrMode->set($an);

        if (!$an) {
            // Der Abend ist zu Ende: liegengebliebenes Gerätegeld auszahlen.
            // Die Sitzungen selbst bleiben bestehen — bei ausgeschaltetem
            // Modus stören sie niemanden, und wer noch am Gerät steht, wird
            // nicht mitten im Spiel hinausgeworfen.
            $this->sessions->reconcile();
        }

        if ($geaendert) {
            $this->flash($an ? 'message.qrmode.on' : 'message.qrmode.off', ContextualFeedbackSeverity::OK);
        } else {
            $this->flash('message.qrmode.unchanged', ContextualFeedbackSeverity::INFO);
        }

        return new RedirectResponse((string)$this->uriBuilder->buildUriFromRoute('casino_qr_mode'));
    }

    /** „Alle abmelden" (D.5). Ebenfalls nur POST, ebenfalls mit Umleitung. */
    public function logoutAllAction(ServerRequestInterface $request): ResponseInterface
    {
        $beendet = $this->sessions->logoutAll();
        if ($beendet > 0) {
            $this->flash('message.logoutAll', ContextualFeedbackSeverity::OK, [$beendet]);
        } else {
            $this->flash('message.logoutAll.none', ContextualFeedbackSeverity::INFO);
        }

        return new RedirectResponse((string)$this->uriBuilder->buildUriFromRoute('casino_qr_mode'));
    }

    /**
     * Baut die Liste „wer ist angemeldet" aus den Nummern, die
     * PlayerSessionService::loggedInPlayerUids() liefert. Fluid soll
     * anzeigen, nicht rechnen — deshalb entstehen Name und „vor wie vielen
     * Sekunden" hier und nicht in der Vorlage.
     *
     * @param list<int> $playerUids
     * @return list<array{name: string, lastSeen: int, secondsAgo: int}>
     */
    private function buildOnlineList(array $playerUids): array
    {
        $now = (int)($GLOBALS['EXEC_TIME'] ?? time());

        $rows = [];
        foreach ($playerUids as $uid) {
            $player = $this->players->findByUid($uid);
            if ($player === null) {
                continue;
            }
            $rows[] = [
                'name' => $player->name,
                'lastSeen' => $player->lastSeen,
                'secondsAgo' => max(0, $now - $player->lastSeen),
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
