<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\ReelSlot\ReelSlot;
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
    identifier: ReelSlot::IDENTIFIER,
    title: ReelSlot::LANG_FRONTEND . 'automat.title',
    description: ReelSlot::LANG_FRONTEND . 'automat.description',
    extensionKey: ReelSlot::EXTENSION_KEY,
    cabinetPartial: ReelSlot::CABINET_PARTIAL,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Reel Slot".
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
 * dataProcessing holt die drei Walzenbänder aus Anhang C (Classes/Rules.php)
 * und legt sie als {machine.reels} ins Template. Von Hand geschrieben wären
 * das 120 Zellen mit ausgerechneten Versätzen.
 *
 * Schritt 20 seit dem GEO-Behebungslauf (Auditbericht 2026-09-05, Befunde
 * G-01/G-02): casino-device-description ist ein generischer Baustein aus
 * casino_startpage (DeviceDescriptionProcessor) — er kennt Reel Slot nicht,
 * er bekommt hier nur Text mitgegeben. Er setzt die
 * <meta name="description"> dieser Seite und einen Game-Eintrag
 * (strukturierte Daten), beides nur auf DIESER Seite, weil dieses
 * Inhaltselement nur hier gerendert wird.
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Machine
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    dataProcessing {
        10 = reel-slot-machine
        10.as = machine
        20 = casino-device-description
        20.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.title
        20.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.description
    }
}',
    ReelSlot::CTYPE,
    ReelSlot::EXTENSION_KEY
));
