<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CasinoStartpage\Automat\Gattung;
use Phomo17\Craps\Craps;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * 1. Anmeldung bei der Geräte-Registry.
 *
 * Wortgleich nach casino_startpage/README.md, Abschnitt „Zwei Gattungen:
 * Automat und Tisch": derselbe Aufruf wie bei einem Automaten, mit dem einen
 * zusätzlichen Argument gattung: Gattung::Tisch. Davon hängt allein ab, wie der
 * Saal die Bühne baut (Tisch: kein Podest, breiter Bodenschatten, viewBox
 * 160 : 100) und in welcher Gruppe das Gerät in der Backend-Auswahlliste steht.
 *
 * Nebenwirkung von register(): das Verzeichnis Resources/Private/Partials/
 * dieser Extension wird an tt_content.casino_automat.partialRootPaths
 * angehängt. Deshalb genügt für die Kachel im Saal dieser eine Aufruf.
 */
AutomatRegistry::register(new Automat(
    identifier: Craps::IDENTIFIER,
    title: Craps::LANG_FRONTEND . 'automat.title',
    description: Craps::LANG_FRONTEND . 'automat.description',
    extensionKey: Craps::EXTENSION_KEY,
    cabinetPartial: Craps::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Craps".
 *
 * partialRootPaths.10  die eigenen Partials (Kachel, Wanne, Würfelsatz,
 *                      Ansage, Wurfleiste)
 * partialRootPaths.20  die Partials des Site Packages. In Phase C6 noch
 *                      ungenutzt — die geteilten Tisch-Bausteine (Chips,
 *                      Setzfläche, Bedienleiste, Verlaufsstreifen) zieht erst
 *                      Phase C7 ein. Die Zeile steht jetzt schon, weil sie
 *                      Teil der Rendering-Definition ist und ein ungenutzter
 *                      Suchpfad nichts kostet und nichts bricht.
 *
 * dataProcessing hat in Phase C6 genau EINEN Schritt: die eigene Beschreibung
 * für Suchmaschinen und KI-Crawler. casino-device-description ist der
 * geräteneutrale Baustein aus casino_startpage
 * (Classes/DataProcessing/DeviceDescriptionProcessor.php), den auch alle
 * anderen Geräte benutzen; gattung = tisch ist der einzige Unterschied zum
 * Aufruf eines Automaten. Er setzt zur Laufzeit <meta name="description"> und
 * ein <script type="application/ld+json"> mit @type: Game in den <head> —
 * ausschließlich auf der Seite, auf der dieses Inhaltselement tatsächlich
 * rendert. Ohne diesen Schritt wäre die Craps-Seite die einzige Geräteseite
 * ohne Beschreibung und fiele beim nächsten Auffindbarkeits-Audit auf
 * (verify-geo.mjs im Site Package prüft das gegen die ausgelieferte Sitemap).
 *
 * Schritt 30 seit Umsetzungsstück C7d: craps-felt
 * (Phomo17\Craps\DataProcessing\FeltProcessor) rechnet die 47 Felder des
 * Tuchs samt ihrer Lage im Gitter vor. Von Hand geschrieben wären das 47
 * Zeilen mit Gitterkoordinaten im Template. Die WANNE bleibt weiterhin ohne
 * DataProcessor: sie kommt ohne eine einzige gerechnete Koordinate aus.
 *
 * partialRootPaths.20 liefert seit C7 zusätzlich Table/ChipSprite,
 * Table/Status, Table/Controls, Table/BuyIn und Table/History — dieselbe
 * Zeile deckt das schon ab, weil alle unter
 * Resources/Private/PageView/Partials/Table/ liegen. Sie stand seit C6a
 * ungenutzt da und wird jetzt tatsächlich gebraucht.
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Table
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    partialRootPaths.20 = EXT:casino_startpage/Resources/Private/PageView/Partials/
    dataProcessing {
        20 = casino-device-description
        20.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.title
        20.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.description
        20.gattung = tisch
        30 = craps-felt
        30.as = felt
    }
}',
    Craps::CTYPE,
    Craps::EXTENSION_KEY
));
