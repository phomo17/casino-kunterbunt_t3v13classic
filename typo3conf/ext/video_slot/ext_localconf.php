<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\VideoSlot\VideoSlot;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * 1. Anmeldung bei der Automaten-Registry.
 *
 * Wortgleich nach casino_startpage/README.md, Abschnitt „So meldet sich eine
 * Automaten-Extension an". Nebenwirkung von register(): das Verzeichnis
 * Resources/Private/Partials/ dieser Extension wird an
 * tt_content.casino_automat.partialRootPaths angehängt. Deshalb genügt für die
 * Saal-Ansicht dieser eine Aufruf — kein TypoScript, keine Site-Konfiguration.
 */
AutomatRegistry::register(new Automat(
    identifier: VideoSlot::IDENTIFIER,
    title: VideoSlot::LANG_FRONTEND . 'automat.title',
    description: VideoSlot::LANG_FRONTEND . 'automat.description',
    extensionKey: VideoSlot::EXTENSION_KEY,
    cabinetPartial: VideoSlot::CABINET_PARTIAL,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Video Slot".
 *
 * Bewusst hier und nicht in einem eigenen Site Set: ein Set wirkt erst, wenn
 * die Site-Konfiguration es einbindet. Ein zweiter Automat müsste dann
 * typo3conf/sites/casino-kunterbunt/config.yaml verändern — das widerspricht
 * dem Grundsatz aus CONCEPT.md Abschnitt 5.1, dass eine Automaten-Extension
 * ohne Änderung an anderen Stellen installierbar ist. addTypoScriptSetup()
 * ist derselbe Weg, den AutomatRegistry::register() intern schon benutzt.
 *
 * "= FLUIDTEMPLATE" legt fest, dass dieses Inhaltselement von einer
 * Fluid-Datei gerendert wird; templateName benennt sie ohne Endung.
 * Kein layoutRootPaths: das Template benutzt kein Fluid-Layout.
 *
 * dataProcessing baut das Sichtfeld (fünf Walzen zu je drei Zellen), die
 * Punktfolgen der fünf Gewinnlinien aus Anhang D und die Zeilen des
 * Gewinnplans. Von Hand geschrieben wären das rund 150 Koordinaten.
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Machine
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    dataProcessing {
        10 = video-slot-cabinet
        10.as = machine
    }
}',
    VideoSlot::CTYPE,
    VideoSlot::EXTENSION_KEY
));
