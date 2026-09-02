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
 * KEIN "dependencies"-Eintrag in Phase 6 — Phase 6 importiert nichts aus
 * casino_startpage. Phase 7 (Kasse, Leiter, Auto, Klang) ergänzt
 * 'dependencies' => ['casino_startpage']; dieser Kopf sagt das ausdrücklich,
 * damit der Fehler „Failed to resolve module specifier" dort nicht erst
 * gesucht werden muss.
 */
return [
    'imports' => [
        '@phomo17/video-slot/' => 'EXT:video_slot/Resources/Public/JavaScript/',
    ],
];
