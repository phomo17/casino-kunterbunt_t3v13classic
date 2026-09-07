<?php

declare(strict_types=1);

/**
 * Import-Map dieser Extension.
 *
 * Registriert das Präfix "@phomo17/craps/" für alle ES-Module unter
 * Resources/Public/JavaScript/. Die Module dieser Extension importieren sich
 * gegenseitig ausschließlich über diesen Namen, nie über einen relativen Pfad:
 *
 *   import { DiceTable } from '@phomo17/craps/dice-physics.js';
 *
 * Eingebunden wird ausschließlich das Einstiegsmodul, und zwar im
 * Fluid-Template über <f:asset.module identifier="…" />.
 *
 * DREI DATEIEN BEKOMMEN NIE EINEN IMPORT
 * --------------------------------------
 * rng.js, dice-geometry.js und dice-physics.js werden von den Prüfskripten
 * UNMITTELBAR unter Node geladen — Node kennt diese Karte nicht. Sie dürfen
 * deshalb keine Zeile mit "import" enthalten. CONCEPT.md C.5.3 verlangt genau
 * das: der Nachweis rechnet mit DIESEN Dateien, nicht mit einer Nachbildung.
 * Alles, was sie brauchen, wird ihnen übergeben — vor allem der Zufallsgeber
 * (new DiceTable({ random })), die eine benannte Wechselstelle aus C.5.2.
 *
 * Ein relativer Import wäre technisch möglich, ist aber verboten: TYPO3 hängt
 * an die Adressen dieser Karte einen Cache-Brecher an. Eine relativ
 * importierte Geschwisterdatei bekäme ihn nicht und könnte nach einer
 * Änderung veraltet aus dem Browsercache kommen, während die Elterndatei
 * frisch ist.
 *
 * "dependencies" nennt casino_startpage: ab Phase C7 importiert das
 * Einstiegsmodul die geteilten Tisch-Bausteine
 * ('@phomo17/casino-startpage/table-round.js' und weitere). Der Kern liefert
 * eine fremde Import-Map nur auf ausdrückliche Ansage mit aus; ohne diesen
 * Eintrag fehlte das fremde Präfix in der ausgelieferten Karte und der
 * Browser bräche mit „Failed to resolve module specifier" ab. Der Eintrag
 * steht schon jetzt, weil er zur Extension-Konfiguration gehört, die mit der
 * Aktivierung wirkt — ein mitgeliefertes, ungenutztes Präfix ist ohne
 * Wirkung.
 *
 * STAND UMSETZUNGSSTÜCK C6a: Kein Fluid-Template dieser Extension bindet ein
 * Modul ein. Die Wanne ist in C6b eine reine Zeichnung, das erste Modul zieht
 * mit C6d ein. Das ist Absicht — ein halb verdrahteter Tisch, der aussieht,
 * als könnte man werfen, wäre schlimmer als gar keiner.
 */
return [
    'dependencies' => ['casino_startpage'],
    'imports' => [
        '@phomo17/craps/' => 'EXT:craps/Resources/Public/JavaScript/',
    ],
];
