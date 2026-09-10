<?php

declare(strict_types=1);

use Phomo17\CasinoAccount\Controller\PlayerModuleController;

/**
 * Die Modulgruppe „Casino" und ihre Module (CONCEPT.md D.2, D.3).
 *
 * TYPO3 liest dieses Verzeichnis von selbst ein und legt das Ergebnis in den
 * Cache. Deshalb steht hier und nicht in ext_localconf.php, was das Backend
 * über diese Extension wissen muss.
 *
 * WIE EINE OBERSTE GRUPPE ENTSTEHT
 * ---------------------------------
 * Ein Eintrag OHNE 'parent' und OHNE 'path' ist eine oberste Gruppe. Genau so
 * macht es der Kern selbst mit „web", „file", „site" und „system"
 * (typo3/sysext/core/Configuration/Backend/Modules.php, Kopfkommentar:
 * "Configuration of the main modules (having no parent and no path)") — dort
 * tragen weder 'web' noch 'file' noch 'site' einen der beiden Schlüssel.
 * Die Gruppe braucht keine eigene Route: ModuleRegistry::registerRoutesForModules()
 * überspringt oberste Module und benutzt beim Anklicken die Route des ersten
 * Untermoduls.
 *
 * 'position' wirkt auch auf oberster Ebene — ModuleRegistry::applyHierarchy()
 * ruft applySorting() ausdrücklich auch für die obersten Module auf. „after:
 * web" setzt „Casino" damit direkt unter „Web", wie D.2 es verlangt.
 *
 * D2 (QR-Modus, eigene Phase) hängt hier später einen DRITTEN Block mit dem
 * Bezeichner „casino_qr_mode" an — ein reines Anhängen, kein Umbau dieser
 * Datei (Plan, Abschnitt 4.3.1).
 */
return [

    // ---------------------------------------------------------- die Gruppe
    'casino' => [
        'labels' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf',
        'iconIdentifier' => 'modulegroup-casino',
        'position' => ['after' => 'web'],
        // Kein 'navigationComponent': die Konten hängen an keiner Seite,
        // deshalb bekommt die Gruppe bewusst KEINEN Seitenbaum an die linke
        // Seite. Ein Seitenbaum, in dem nichts anzuklicken ist, wäre eine
        // Falle für den Bearbeiter.
    ],

    // -------------------------------------------------- „Spielende" (D.3)
    'casino_players' => [
        'parent' => 'casino',
        'position' => ['before' => '*'],
        'access' => 'user',
        'iconIdentifier' => 'module-casino-players',
        'labels' => [
            'title' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:module.players.title',
            'shortDescription' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:module.players.tablabel',
            'description' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:module.players.tabdescr',
        ],
        'routes' => [
            '_default' => [
                'target' => PlayerModuleController::class . '::indexAction',
            ],
            'qr' => [
                'target' => PlayerModuleController::class . '::qrAction',
            ],
            'download' => [
                'target' => PlayerModuleController::class . '::downloadAction',
            ],
        ],
    ],
];
