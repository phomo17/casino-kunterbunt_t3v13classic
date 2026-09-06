<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CasinoStartpage\Automat\Gattung;
use Phomo17\Roulette\Roulette;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * 1. Anmeldung bei der Geräte-Registry.
 *
 * Wortgleich nach casino_startpage/README.md, Abschnitt „So meldet sich eine
 * Automaten-Extension an", mit dem einen Unterschied, den ein Spieltisch
 * ausmacht: gattung: Gattung::Tisch (CONCEPT.md C.1 Nr. 1). Davon hängt allein
 * ab, wie der Saal die Bühne baut und in welcher Gruppe das Gerät in der
 * Backend-Auswahlliste steht.
 *
 * Nebenwirkung von register(): das Verzeichnis Resources/Private/Partials/
 * dieser Extension wird an tt_content.casino_automat.partialRootPaths
 * angehängt. Deshalb genügt für die Kachel im Saal dieser eine Aufruf.
 */
AutomatRegistry::register(new Automat(
    identifier: Roulette::IDENTIFIER,
    title: Roulette::LANG_FRONTEND . 'automat.title',
    description: Roulette::LANG_FRONTEND . 'automat.description',
    extensionKey: Roulette::EXTENSION_KEY,
    cabinetPartial: Roulette::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Roulette".
 *
 * Bewusst hier und nicht in einem eigenen Site Set: ein Set wirkt erst, wenn
 * die Site-Konfiguration es einbindet, und ein weiteres Gerät müsste dafür
 * typo3conf/sites/casino-kunterbunt/config.yaml verändern — das widerspricht
 * dem Grundsatz aus CONCEPT.md Abschnitt 5.1.
 *
 * partialRootPaths.10  die eigenen Partials (Kachel, Rad, Auslöser)
 * partialRootPaths.20  die Partials des Site Packages. Der Tisch benutzt von
 *                      dort Table/Status (Ansagebereich) und Table/History
 *                      (Verlaufsstreifen) unverändert mit — geteilte
 *                      Bausteine aus Phase C1, die nicht nachgebaut werden.
 *
 * dataProcessing rechnet die 38 Fachwinkel, die 38 Rillenwinkel und die acht
 * Rautenwinkel des Rades vor. Von Hand geschrieben wären das 84 Drehwinkel
 * mit je sechs Nachkommastellen.
 *
 * Seit Teilstück C2-B angemeldet: Configuration/Services.yaml meldet den
 * DataProcessor "roulette-wheel" (Phomo17\Roulette\DataProcessing\WheelProcessor)
 * an, und Resources/Private/ContentElements/Table.html rendert dessen
 * Ergebnis. Zwischen Teilstück C2-A (dataProcessing schon angemeldet) und
 * C2-B (DataProcessor existiert noch nicht) warf
 * ContentDataProcessor::instantiateDataProcessor() hier kurzzeitig eine
 * UnexpectedValueException je Inhaltselement; das ist mit C2-B behoben.
 *
 * Schritt 20 seit dem GEO-Behebungslauf (Auditbericht 2026-09-05, Befunde
 * G-01/G-02): casino-device-description ist derselbe generische Baustein aus
 * casino_startpage, den auch die Automaten-Extensions benutzen
 * (DeviceDescriptionProcessor) - gattung = tisch ist der einzige Unterschied
 * zu deren Aufruf.
 *
 * Schritt 30 seit Teilstück C3b: roulette-felt (Phomo17\Roulette\DataProcessing\
 * FeltProcessor) rechnet die 159 Felder des Tuchs samt ihrer Lage im Gitter
 * vor. Von Hand geschrieben wären das 159 Zeilen mit Gitterkoordinaten.
 * partialRootPaths.20 liefert seit C3 zusätzlich Table/ChipSprite und
 * Table/Controls — dieselbe Zeile deckt das schon ab, weil beide unter
 * Resources/Private/PageView/Partials/Table/ liegen.
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Table
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    partialRootPaths.20 = EXT:casino_startpage/Resources/Private/PageView/Partials/
    dataProcessing {
        10 = roulette-wheel
        10.as = wheel
        20 = casino-device-description
        20.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.title
        20.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.description
        20.gattung = tisch
        30 = roulette-felt
        30.as = felt
    }
}',
    Roulette::CTYPE,
    Roulette::EXTENSION_KEY
));
