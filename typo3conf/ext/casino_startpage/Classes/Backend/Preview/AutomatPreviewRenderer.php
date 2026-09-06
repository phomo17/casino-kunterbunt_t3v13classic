<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Backend\Preview;

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use TYPO3\CMS\Backend\Preview\StandardContentPreviewRenderer;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Backend\View\BackendLayout\Grid\GridColumnItem;
use TYPO3\CMS\Core\LinkHandling\LinkService;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Backend-Vorschau des Inhaltselements „Casino-Automat".
 *
 * Zeigt dem Redakteur, welcher Automat gewählt ist und wohin das Gerät führt,
 * und warnt sichtbar in genau den Fällen, in denen das Frontend das Element
 * stillschweigend überspringt:
 *
 *   - kein Automat gewählt
 *   - gewählter Automat nicht (mehr) installiert
 *   - keine Zielseite gewählt / Zielseite gelöscht
 *
 * Bewusst PHP statt Fluid: der Fluid-Weg über
 * mod.web_layout.tt_content.preview.<ctype> baut seine View nur mit
 * templatePathAndFilename auf und sieht ausschließlich die Datenbankzeile —
 * er kann die Registry nicht befragen. Der PSR-14-Weg über
 * PageContentPreviewRenderingEvent läuft für jedes Inhaltselement jeder Seite;
 * die TCA-Variante wird nur für genau diesen CType überhaupt geladen.
 */
final class AutomatPreviewRenderer extends StandardContentPreviewRenderer
{
    private const LL = 'LLL:EXT:casino_startpage/Resources/Private/Language/locallang_be.xlf:';

    public function renderPageModulePreviewContent(GridColumnItem $item): string
    {
        $record = $item->getRecord();

        $lines = [
            $this->renderAutomatInformation((string)($record[AutomatContentElement::FIELD_AUTOMAT] ?? '')),
            $this->renderTargetInformation((string)($record[AutomatContentElement::FIELD_TARGET] ?? '')),
        ];

        return '<div class="ck-automat-preview">' . implode('<br>', $lines) . '</div>';
    }

    private function renderAutomatInformation(string $identifier): string
    {
        $languageService = $this->getLanguageService();
        $identifier = trim($identifier);

        if ($identifier === '') {
            return $this->badge('warning', $languageService->sL(self::LL . 'preview.automat.missing'));
        }

        $automat = AutomatRegistry::get($identifier);
        if ($automat === null) {
            return $this->badge('danger', sprintf(
                $languageService->sL(self::LL . 'preview.automat.unknown'),
                $identifier
            ));
        }

        // Die Gattung steht VOR dem Namen, weil sie die Frage beantwortet, die
        // ein Redakteur bei sechs Geräten zuerst hat: Automat oder Tisch?
        // (CONCEPT.md C.1 Nr. 1). badge-info statt badge-warning/-danger: das
        // ist eine Angabe, keine Warnung.
        $out = '<span class="badge badge-info">'
            . htmlspecialchars($languageService->sL($automat->gattung->getLabel()))
            . '</span> ';
        $out .= '<strong>' . htmlspecialchars($languageService->sL($automat->title)) . '</strong>';
        $description = trim($languageService->sL($automat->description));
        if ($description !== '') {
            $out .= ' <span class="text-body-secondary">' . htmlspecialchars($description) . '</span>';
        }

        return $out;
    }

    private function renderTargetInformation(string $target): string
    {
        $languageService = $this->getLanguageService();
        $target = trim($target);

        if ($target === '') {
            return $this->badge('warning', $languageService->sL(self::LL . 'preview.target.missing'));
        }

        $pageUid = 0;
        try {
            $resolved = GeneralUtility::makeInstance(LinkService::class)->resolve($target);
            if (($resolved['type'] ?? '') === LinkService::TYPE_PAGE) {
                $pageUid = (int)($resolved['pageuid'] ?? 0);
            }
        } catch (\Throwable) {
            $pageUid = 0;
        }

        if ($pageUid <= 0) {
            return $this->badge('danger', $languageService->sL(self::LL . 'preview.target.broken'));
        }

        $page = BackendUtility::getRecord('pages', $pageUid, 'uid,title');
        if ($page === null) {
            return $this->badge('danger', sprintf(
                $languageService->sL(self::LL . 'preview.target.deleted'),
                $pageUid
            ));
        }

        return htmlspecialchars(sprintf(
            $languageService->sL(self::LL . 'preview.target.page'),
            (string)BackendUtility::getRecordTitle('pages', $page),
            $pageUid
        ));
    }

    private function badge(string $severity, string $text): string
    {
        return '<span class="badge badge-' . $severity . '">' . htmlspecialchars($text) . '</span>';
    }
}
