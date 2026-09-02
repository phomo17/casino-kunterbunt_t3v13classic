<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\CasinoStartpage\Backend\FormEngine\AutomatItemsProvider;
use Phomo17\CasinoStartpage\Backend\Preview\AutomatPreviewRenderer;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

$ll = 'LLL:EXT:casino_startpage/Resources/Private/Language/locallang_be.xlf:';

/*
 * 1. Eigene Spalten in tt_content.
 *
 * Eine ext_tables.sql gibt es bewusst nicht: TYPO3 13 leitet die
 * Datenbankspalten aus der TCA ab (Core-Klasse DefaultTcaSchema).
 *   type=link                        -> TEXT NOT NULL DEFAULT ''
 *   type=select mit dbFieldLength=64 -> varchar(64) NOT NULL DEFAULT ''
 * Angelegt werden sie beim nächsten "extension:setup".
 */
$GLOBALS['TCA']['tt_content']['columns'][AutomatContentElement::FIELD_AUTOMAT] = [
    'label' => $ll . 'tt_content.tx_casinostartpage_automat',
    'description' => $ll . 'tt_content.tx_casinostartpage_automat.description',
    'config' => [
        'type' => 'select',
        'renderType' => 'selectSingle',
        // Fest hinterlegter Leer-Eintrag. Er garantiert, dass die Liste auch
        // ohne einen einzigen angemeldeten Automaten gültig und leer bedienbar ist.
        'items' => [
            [
                'label' => $ll . 'tt_content.tx_casinostartpage_automat.none',
                'value' => '',
            ],
        ],
        'itemsProcFunc' => AutomatItemsProvider::class . '->addAutomatItems',
        'dbFieldLength' => 64,
        'default' => '',
    ],
];

$GLOBALS['TCA']['tt_content']['columns'][AutomatContentElement::FIELD_TARGET] = [
    'label' => $ll . 'tt_content.tx_casinostartpage_target',
    'description' => $ll . 'tt_content.tx_casinostartpage_target.description',
    'config' => [
        'type' => 'link',
        'allowedTypes' => ['page'],
        'appearance' => [
            'browserTitle' => $ll . 'tt_content.tx_casinostartpage_target.browserTitle',
        ],
    ],
];

/*
 * 2. Eigene Gruppe im Typ-Auswahlfeld. Seit TYPO3 13.0 baut sich der Assistent
 *    „Neues Inhaltselement" allein aus der TCA auf (Feature #102834).
 */
ExtensionManagementUtility::addTcaSelectItemGroup(
    'tt_content',
    'CType',
    AutomatContentElement::CTYPE_GROUP,
    $ll . 'tt_content.CType.group.casinoKunterbunt',
    'top'
);

/*
 * 3. Der Inhaltselement-Typ selbst.
 *
 * addRecordType() erledigt in einem Aufruf: Eintrag im Auswahlfeld CType,
 * Typ-Icon (ctrl.typeicon_classes), Gruppenzuordnung und den types-Eintrag mit
 * showitem samt abschließendem Reiter „Erweitert".
 *
 * showitem nennt nur die beiden eigenen Felder. Seit TYPO3 13.3 (Feature #104814)
 * ergänzt der Core die Systemfelder — Typ, Spalte, Sprache, Zugriff, Notizen —
 * von selbst aus der ctrl-Definition.
 *
 * Bewusst NICHT dabei: die Palette „headers". Ein Überschriftenfeld würde den
 * Redakteur zu einem Text verleiten, den das Frontend nie ausgibt — CONCEPT.md
 * Abschnitt 3.2: alles gehört auf den Automaten, es gibt keine Textbox daneben.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => $ll . 'tt_content.CType.casino_automat',
        'description' => $ll . 'tt_content.CType.casino_automat.description',
        'value' => AutomatContentElement::CTYPE,
        'icon' => 'content-casino-automat',
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    AutomatContentElement::FIELD_AUTOMAT . ',' . AutomatContentElement::FIELD_TARGET,
    [
        'previewRenderer' => AutomatPreviewRenderer::class,
    ]
);
