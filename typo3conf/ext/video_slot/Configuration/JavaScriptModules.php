<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/video-slot/" für alle ES-Module unter
 * Resources/Public/JavaScript/. Die Module dieser Extension importieren sich
 * gegenseitig ausschließlich über diesen Namen, nie über einen relativen
 * Pfad:
 *
 *   import { drawIndex } from '@phomo17/video-slot/rng.js';
 *
 * Eingebunden wird ausschließlich das Einstiegsmodul, und zwar im
 * Fluid-Template über
 *
 *   <f:asset.module identifier="@phomo17/video-slot/video-slot.js" />
 *
 * TypoScript kennt in TYPO3 13.4 keine Eigenschaft "page.includeJSModule"
 * (siehe DECISIONS.md, Phase 1). Der Kern löst beim Rendern den Namen über
 * diese Datei auf, zieht dabei den kompletten Präfix in die Import-Map und
 * hängt jeder Einzeldatei einen Cache-Buster an.
 *
 * "dependencies" nennt seit Phase 7 casino_startpage. Grund: wallet.js und
 * bank.js importieren '@phomo17/casino-startpage/machine-credit.js' bzw.
 * '@phomo17/casino-startpage/credit.js', risk.js
 * '@phomo17/casino-startpage/risk-ladder.js' und sound.js die drei
 * Klangbausteine sound.js, sound-kit.js und idle-noise.js. Der Kern lädt
 * fremde Import-Maps nur auf ausdrückliche Ansage
 * (ImportMap::loadDependency()); ohne diesen Eintrag fehlte das fremde
 * Präfix in der ausgelieferten Map und der Browser bräche mit „Failed to
 * resolve module specifier" ab.
 *
 * Der Eintrag zieht das GANZE Präfix der anderen Extension in die Map, nicht
 * nur die einzelnen Dateien. Das ist gewollt und folgenlos: aufgelöst wird
 * nur, was auch importiert wird.
 */
return [
    'dependencies' => ['casino_startpage'],
    'imports' => [
        '@phomo17/video-slot/' => 'EXT:video_slot/Resources/Public/JavaScript/',
    ],
];
