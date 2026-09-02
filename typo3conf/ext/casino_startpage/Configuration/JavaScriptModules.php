<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/casino-startpage/" für alle ES-Module unter
 * Resources/Public/JavaScript/. Automaten-Extensions importieren die gemeinsamen
 * Module über diesen Namen, nie über einen relativen Pfad:
 *
 *   import { credit } from '@phomo17/casino-startpage/credit.js';
 *
 * Unter diesem Präfix liegen seit Ausbaustufe 2, Phase 2 auch die beiden
 * Dateien der geteilten Risiko-Leiter (CONCEPT.md B.6.2): risk-ladder.js mit
 * dem Spielwerk und risk-timing.js mit der Schwierigkeitskurve. risk-timing.js
 * bekommt NIE einen Import — sie wird zusätzlich von einem Prüfskript unter
 * Node geladen, das diese Import-Map nicht kennt. Die package.json im selben
 * Verzeichnis steht nur für Node dort; der Kern nimmt ausschließlich
 * .js-Dateien in die Map auf.
 *
 * Seit Ausbaustufe 2, Phase 3 liegen unter demselben Präfix zwei weitere
 * Dateien: machine-credit.js führt den Gerätekredit (CONCEPT.md B.5.2) und
 * wird von jedem Gerät importiert; credit-set.js verdrahtet das freie Setzen
 * des Kassenstands am Leuchtschild und wird in Stufe 3 ersatzlos gelöscht.
 *
 * Seit Ausbaustufe 2, Phase 4 liegen unter demselben Präfix die beiden
 * Bausteine des Klangausbaus (CONCEPT.md B.7): sound-kit.js mit den benannten
 * Klängen — Münze, Kaskade, Metall, Blech, Klinke, Registrierkasse,
 * Zählschritt — und idle-noise.js mit den Leerlaufgeräuschen eines Geräts.
 * Beide brauchen KEINEN eigenen Eintrag: die Karte bildet das ganze
 * Verzeichnis ab, nicht einzelne Dateien.
 *
 * Anders als risk-timing.js haben beide sehr wohl Importe (sound-kit.js zieht
 * sound.js, idle-noise.js zieht beide). Sie werden deshalb nicht unmittelbar
 * unter Node geladen; das Prüfskript des Klangausbaus ersetzt die Modulnamen
 * vorher als Text.
 *
 * Eingebunden werden Module ausschließlich über den Fluid-ViewHelper
 * <f:asset.module identifier="@phomo17/casino-startpage/xyz.js" />.
 * TypoScript kennt in TYPO3 13.4 keine Eigenschaft "page.includeJSModule".
 *
 * "dependencies" ist bewusst leer: dieses Projekt benutzt keine JavaScript-Module
 * des TYPO3-Cores im Frontend.
 */
return [
    'dependencies' => [],
    'imports' => [
        '@phomo17/casino-startpage/' => 'EXT:casino_startpage/Resources/Public/JavaScript/',
    ],
];
