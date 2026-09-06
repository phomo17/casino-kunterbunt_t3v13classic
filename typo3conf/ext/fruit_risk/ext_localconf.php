<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\FruitRisk\FruitRisk;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * 1. Anmeldung bei der Geräte-Registry.
 *
 * Wortgleich nach casino_startpage/README.md, Abschnitt „So meldet sich eine
 * Automaten-Extension an". Die Gattung wird NICHT genannt: sie ist der letzte
 * Konstruktorparameter mit dem Vorgabewert Gattung::Automat, und FruitRisk ist
 * ein Automat. Nichts zu nennen ist hier die richtige Angabe, nicht eine
 * fehlende.
 *
 * Nebenwirkung von register(): das Verzeichnis Resources/Private/Partials/
 * dieser Extension wird an tt_content.casino_automat.partialRootPaths
 * angehängt. Deshalb genügt für die Saal-Ansicht dieser eine Aufruf — kein
 * TypoScript, keine Site-Konfiguration.
 */
AutomatRegistry::register(new Automat(
    identifier: FruitRisk::IDENTIFIER,
    title: FruitRisk::LANG_FRONTEND . 'automat.title',
    description: FruitRisk::LANG_FRONTEND . 'automat.description',
    extensionKey: FruitRisk::EXTENSION_KEY,
    cabinetPartial: FruitRisk::CABINET_PARTIAL,
));

/*
 * 2. Rendering des eigenen Inhaltselements.
 *
 * "= FLUIDTEMPLATE" legt fest, dass dieses Inhaltselement von einer
 * Fluid-Datei gerendert wird; templateName benennt sie ohne Endung.
 * Kein layoutRootPaths: das Template benutzt kein Fluid-Layout.
 *
 * dataProcessing seit Phase F3: der CabinetProcessor rechnet Rules::PAYTABLE
 * in die Zeilen und Koordinaten des Gewinnplans hinter Glas um und legt sie
 * als {machine} in die Vorlage. Der Gewinnplan wird damit aus derselben
 * Tabelle GEDRUCKT, aus der auch gerechnet wird (CONCEPT.md C.14.4) — im
 * Markup steht danach keine einzige Zahl der Gewinntabelle mehr.
 *
 * Der kurze Name „fruit-risk-cabinet" kommt aus Configuration/Services.yaml.
 * Fehlte die Datei oder der Dienst, wirft TYPO3 eine
 * UnexpectedValueException, fängt sie je Inhaltselement ab und zeigt
 * "Oops, an error occurred!" — deshalb gehören Services.yaml und diese
 * Zeilen in dasselbe Umsetzungsstück.
 *
 * Schritt 20 seit dem GEO-Behebungslauf (Auditbericht 2026-09-05, Befunde
 * G-01/G-02): casino-device-description ist ein generischer Baustein aus
 * casino_startpage (DeviceDescriptionProcessor) — er kennt FruitRisk nicht,
 * er bekommt hier nur Text mitgegeben. Er setzt (mit replace=true) die
 * <meta name="description"> dieser Seite und einen Game-Eintrag; ein
 * eventuell im Seitendatensatz selbst hinterlegter Beschreibungstext wird
 * dadurch bewusst überschrieben, damit dieselbe Regel auf allen
 * Geräteseiten gilt (DECISIONS.md, 2026-09-05).
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Machine
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    dataProcessing {
        10 = fruit-risk-cabinet
        10.as = machine
        20 = casino-device-description
        20.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.title
        20.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.description
    }
}',
    FruitRisk::CTYPE,
    FruitRisk::EXTENSION_KEY
));
