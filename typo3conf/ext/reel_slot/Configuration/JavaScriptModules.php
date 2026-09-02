<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/reel-slot/" für alle
 * ES-Module unter Resources/Public/JavaScript/. Die Module dieser Extension
 * importieren sich gegenseitig ausschließlich über diesen Namen, nie über
 * einen relativen Pfad:
 *
 *   import { evaluate } from '@phomo17/reel-slot/paytable.js';
 *
 * Eingebunden wird ausschließlich das Einstiegsmodul, und zwar im
 * Fluid-Template über
 *
 *   <f:asset.module identifier="@phomo17/reel-slot/reel-slot.js" />
 *
 * TypoScript kennt in TYPO3 13.4 keine Eigenschaft "page.includeJSModule"
 * (siehe DECISIONS.md, Phase 1). Der Kern löst beim Rendern den Namen über
 * diese Datei auf, zieht dabei den kompletten Präfix in die Import-Map und
 * hängt jeder Einzeldatei einen Cache-Buster an.
 *
 * "dependencies" nennt seit Phase 7 casino_startpage. Grund: wallet.js,
 * payout.js und coinslot.js importieren
 * '@phomo17/casino-startpage/credit.js'. Der Kern lädt fremde Import-Maps
 * nur auf ausdrückliche Ansage (ImportMap::loadDependency()); ohne diesen
 * Eintrag fehlte das fremde Präfix in der ausgelieferten Map und der Browser
 * bräche mit „Failed to resolve module specifier" ab.
 *
 * Seit Ausbaustufe 2, Phase 2 importiert auch risk.js aus dem Site Package:
 * '@phomo17/casino-startpage/risk-ladder.js', das Spielwerk der Risiko-Leiter
 * (CONCEPT.md B.6.2). Ein weiterer Eintrag in "dependencies" ist dafür nicht
 * nötig — casino_startpage steht dort bereits.
 *
 * Seit Ausbaustufe 2, Phase 3 importiert wallet.js zusätzlich
 * '@phomo17/casino-startpage/machine-credit.js', den Gerätekredit, und
 * bank.js '@phomo17/casino-startpage/credit.js' für die Kassenanzeige im
 * Sockel. Ein weiterer Eintrag in "dependencies" ist auch dafür nicht nötig —
 * casino_startpage steht dort bereits.
 *
 * Seit Ausbaustufe 2, Phase 4 importiert sound.js zwei weitere Module des Site
 * Package: '@phomo17/casino-startpage/sound-kit.js', den Klangbaukasten, und
 * '@phomo17/casino-startpage/idle-noise.js', die Leerlaufgeräusche
 * (CONCEPT.md B.7). Ein weiterer Eintrag in "dependencies" ist auch dafür
 * nicht nötig — casino_startpage steht dort bereits.
 *
 * Der Eintrag zieht das GANZE Präfix der anderen Extension in die Map, nicht
 * nur die eine Datei. Das ist gewollt und folgenlos: aufgelöst wird nur, was
 * auch importiert wird.
 */
return [
    'dependencies' => ['casino_startpage'],
    'imports' => [
        '@phomo17/reel-slot/' => 'EXT:reel_slot/Resources/Public/JavaScript/',
    ],
];
