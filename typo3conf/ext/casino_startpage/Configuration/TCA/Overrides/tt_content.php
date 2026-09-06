<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\CasinoStartpage\Automat\Gattung;
use Phomo17\CasinoStartpage\Automat\Mustertisch;
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
        // ohne ein einziges angemeldetes Gerät gültig und leer bedienbar ist.
        'items' => [
            [
                'label' => $ll . 'tt_content.tx_casinostartpage_automat.none',
                'value' => '',
            ],
        ],
        /*
         * Zwei Gruppen in der Auswahlliste, seit CONCEPT.md C.1 Nr. 1 zwei
         * Gattungen im Saal stehen. Die Schlüssel sind wörtlich die Werte des
         * Enums Gattung; AutomatItemsProvider setzt sie je Eintrag unter dem
         * Schlüssel "group". Ohne itemGroups wäre "group" am Eintrag wirkungslos
         * und die Liste eine unsortierte Reihe aus Automaten und Tischen.
         *
         * Der feste Leer-Eintrag oben trägt bewusst KEINE Gruppe: TYPO3 stellt
         * gruppenlose Einträge vor die erste Gruppe, und genau dort gehört
         * "- bitte wählen -" hin.
         */
        'itemGroups' => [
            Gattung::Automat->value => $ll . 'gattung.automat.plural',
            Gattung::Tisch->value => $ll . 'gattung.tisch.plural',
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

/*
 * 4. Das Inhaltselement „Mustertisch".
 *
 * Es stellt den Beispieltisch auf der Seite auf, auf der es liegt — dasselbe
 * Verhältnis, das ein Automaten-Inhaltselement zu seiner Spielseite hat. Der
 * Redakteur legt es an, wählt nichts aus und speichert.
 *
 * Die Feldliste (zweites Argument) ist leer: das Element hat keine eigene
 * Einstellung. Die Systemfelder ergänzt TYPO3 13.3+ von selbst. Bewusst ohne
 * Überschriften-Palette, aus demselben Grund wie beim Casino-Gerät: neben dem
 * Tisch gibt es nichts auszugeben, und ein Feld ohne Wirkung verleitet zu
 * Text, den niemand je sieht.
 *
 * Keine eigene Datenbankspalte, deshalb auch keine ext_tables.sql und kein
 * Schema-Schritt.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => $ll . 'tt_content.CType.casino_tisch_muster',
        'description' => $ll . 'tt_content.CType.casino_tisch_muster.description',
        'value' => Mustertisch::CTYPE,
        'icon' => Gattung::Tisch->getIcon(),
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
