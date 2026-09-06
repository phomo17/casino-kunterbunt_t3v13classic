<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/roulette/" für alle ES-Module unter
 * Resources/Public/JavaScript/. Die Module dieser Extension importieren sich
 * gegenseitig ausschließlich über diesen Namen, nie über einen relativen Pfad:
 *
 *   import { Wheel } from '@phomo17/roulette/wheel-physics.js';
 *
 * Eingebunden wird ausschließlich das Einstiegsmodul, und zwar im
 * Fluid-Template über
 *
 *   <f:asset.module identifier="@phomo17/roulette/roulette.js" />
 *
 * TypoScript kennt in TYPO3 13.4 keine Eigenschaft "page.includeJSModule"
 * (siehe DECISIONS.md, Phase 1).
 *
 * DREI DATEIEN BEKOMMEN NIE EINEN IMPORT
 * --------------------------------------
 * rng.js, wheel-geometry.js und wheel-physics.js werden von den Prüfskripten
 * UNMITTELBAR unter Node geladen — Node kennt diese Karte nicht. Sie dürfen
 * deshalb keine Zeile mit "import" enthalten. CONCEPT.md C.5.3 verlangt genau
 * das: „Die Physik liegt in Dateien ohne Importe aus dem Browserumfeld, damit
 * Node sie ohne Bild laden kann. Der Nachweis rechnet mit DIESEN Dateien,
 * nicht mit einer Nachbildung." Dieselbe Regel gilt im Site Package schon für
 * risk-timing.js, table-chips.js, table-bets.js und table-round.js.
 *
 * "dependencies" nennt casino_startpage: roulette.js importiert
 * '@phomo17/casino-startpage/table-round.js' (den geteilten Rundenablauf aus
 * Phase C1) und table-history.js (den Verlaufsstreifen). Der Kern lädt fremde
 * Import-Maps nur auf ausdrückliche Ansage (ImportMap::loadDependency());
 * ohne diesen Eintrag fehlte das fremde Präfix in der ausgelieferten Karte.
 *
 * STAND TEILSTÜCK C2-A: keine der oben genannten Dateien existiert schon;
 * sie entstehen in C2-B, C2-C und C2-D. Die Karte steht trotzdem schon
 * vollständig, weil sie Teil der Extension-Konfiguration ist, die mit der
 * Aktivierung wirkt — ein leeres Präfix ohne Dateien ist ohne Wirkung und
 * bricht nichts.
 */
return [
    'dependencies' => ['casino_startpage'],
    'imports' => [
        '@phomo17/roulette/' => 'EXT:roulette/Resources/Public/JavaScript/',
    ],
];
