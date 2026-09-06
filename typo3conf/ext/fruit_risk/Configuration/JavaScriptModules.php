<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/fruit-risk/" für alle ES-Module unter
 * Resources/Public/JavaScript/. Die Module dieser Extension werden sich ab
 * Phase F4 ausschließlich über diesen Namen gegenseitig importieren, nie über
 * einen relativen Pfad:
 *
 *   import { drawIndex } from '@phomo17/fruit-risk/rng.js';
 *
 * Eingebunden wird später ausschließlich das Einstiegsmodul, und zwar im
 * Fluid-Template über
 *
 *   <f:asset.module identifier="@phomo17/fruit-risk/fruit-risk.js" />
 *
 * TypoScript kennt in TYPO3 13.4 keine Eigenschaft "page.includeJSModule";
 * Import-Maps (Feature #96510) sind seit v12 der einzige Weg, RequireJS ist
 * mit v13.0 entfallen. Der Bindestrich im Paketteil des Präfixes ist gültig.
 *
 * "dependencies" nennt casino_startpage, weil die Module dieser Extension ab
 * F4 die Kasse, den Gerätekredit, die Klangerzeugung und die Risiko-Bausteine
 * des Site Packages importieren. Der Kern lädt eine fremde Import-Map nur auf
 * ausdrückliche Ansage (ImportMap::loadDependency()); der Eintrag zieht das
 * GANZE fremde Präfix in die Map, was gewollt und folgenlos ist — aufgelöst
 * wird nur, was auch importiert wird.
 *
 * STAND F1: unter Resources/Public/JavaScript/ liegt noch kein Modul. Diese
 * Datei ist damit noch wirkungslos und steht hier, weil sie zum Vertrag aus
 * casino_startpage/README.md gehört und ab F4 unverändert weiterbenutzt wird.
 */
return [
    'dependencies' => ['casino_startpage'],
    'imports' => [
        '@phomo17/fruit-risk/' => 'EXT:fruit_risk/Resources/Public/JavaScript/',
    ],
];
