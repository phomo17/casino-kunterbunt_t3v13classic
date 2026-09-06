<?php

declare(strict_types=1);

use Phomo17\Blackjack\Blackjack;
use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CasinoStartpage\Automat\Gattung;
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
    identifier: Blackjack::IDENTIFIER,
    title: Blackjack::LANG_FRONTEND . 'automat.title',
    description: Blackjack::LANG_FRONTEND . 'automat.description',
    extensionKey: Blackjack::EXTENSION_KEY,
    cabinetPartial: Blackjack::CABINET_PARTIAL,
    gattung: Gattung::Tisch,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Blackjack".
 *
 * partialRootPaths.10  die eigenen Partials (in Phase C4 nur die Kachel)
 * partialRootPaths.20  die Partials des Site Packages. In Phase C4 noch
 *                      ungenutzt — der Tisch benutzt die geteilten Bausteine
 *                      (Table/Status, Table/Controls, Table/History,
 *                      Table/ChipSprite) erst ab Phase C5. Die Zeile steht
 *                      jetzt schon, weil sie Teil der Rendering-Definition
 *                      ist und ein ungenutzter Suchpfad nichts kostet und
 *                      nichts bricht.
 *
 * dataProcessing hat in Phase C4 genau EINEN Schritt: die eigene Beschreibung
 * für Suchmaschinen und KI-Crawler. casino-device-description ist der
 * geräteneutrale Baustein aus casino_startpage
 * (Classes/DataProcessing/DeviceDescriptionProcessor.php), den auch alle
 * anderen Geräte benutzen; gattung = tisch ist der einzige Unterschied zum
 * Aufruf eines Automaten. Er setzt zur Laufzeit <meta name="description"> und
 * ein <script type="application/ld+json"> mit @type: Game in den <head> —
 * ausschließlich auf der Seite, auf der dieses Inhaltselement tatsächlich
 * rendert. Ohne diesen Schritt wäre die Blackjack-Seite die einzige
 * Geräteseite ohne Beschreibung und fiele beim nächsten
 * Auffindbarkeits-Audit auf (verify-geo.mjs im Site Package prüft das gegen
 * die ausgelieferte Sitemap).
 *
 * KEIN eigener DataProcessor in Phase C4: es gibt noch nichts vorzurechnen.
 * Das Tuch und die Kartenbilder entstehen in Phase C5; erst dort kommt — wenn
 * überhaupt — ein blackjack-eigener Schritt dazu.
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
    }
}',
    Blackjack::CTYPE,
    Blackjack::EXTENSION_KEY
));
