<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;
use Phomo17\CoinPusher\CoinPusher;
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
    identifier: CoinPusher::IDENTIFIER,
    title: CoinPusher::LANG_FRONTEND . 'automat.title',
    description: CoinPusher::LANG_FRONTEND . 'automat.description',
    extensionKey: CoinPusher::EXTENSION_KEY,
    cabinetPartial: CoinPusher::CABINET_PARTIAL,
));

/*
 * 2. Rendering des eigenen Inhaltselements „Coin Pusher".
 *
 * "= FLUIDTEMPLATE" legt fest, dass dieses Inhaltselement von einer
 * Fluid-Datei gerendert wird; templateName benennt sie ohne Endung.
 * Kein layoutRootPaths: das Template benutzt kein Fluid-Layout.
 *
 * Kein Baustein für das Spielfeld selbst: anders als beim Video Slot gibt es
 * nichts vorzurechnen. Das Spielfeld ist eine Zeichenfläche, und seine Maße
 * stehen in field.js — der einen Quelle, aus der auch der Nachweis rechnet.
 *
 * dataProcessing seit diesem Behebungslauf (siehe DECISIONS.md): derselbe
 * generische Baustein casino-device-description (DeviceDescriptionProcessor
 * aus casino_startpage), den auch die anderen Geräte-Extensions an ihr
 * eigenes Inhaltselement hängen (siehe casino_startpage/README.md). Er
 * kennt dieses Gerät nicht, er bekommt hier nur Text mitgegeben. Er setzt
 * die <meta name="description"> dieser Seite und einen Game-Eintrag
 * (strukturierte Daten), beides nur auf DIESER Seite.
 */
ExtensionManagementUtility::addTypoScriptSetup(sprintf(
    'tt_content.%1$s = FLUIDTEMPLATE
tt_content.%1$s {
    templateName = Machine
    templateRootPaths.10 = EXT:%2$s/Resources/Private/ContentElements/
    partialRootPaths.10 = EXT:%2$s/Resources/Private/Partials/
    dataProcessing {
        10 = casino-device-description
        10.title.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.title
        10.description.data = lll:EXT:%2$s/Resources/Private/Language/locallang.xlf:automat.description
    }
}',
    CoinPusher::CTYPE,
    CoinPusher::EXTENSION_KEY
));
