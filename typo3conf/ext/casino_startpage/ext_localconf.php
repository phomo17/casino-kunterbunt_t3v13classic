<?php

declare(strict_types=1);

defined('TYPO3') or die();

// Diese Datei läuft bei jedem nicht gecachten Request und bleibt daher bewusst leer.
//
// Die Automaten-Registry (Phomo17\CasinoStartpage\Automat\AutomatRegistry) braucht hier
// nichts: sie ist statisch und füllt sich ausschließlich aus den ext_localconf.php-
// Dateien der Automaten-Extensions. Die laufen später als diese, weil sie von
// casino_startpage abhängen — eine Vorbereitung an dieser Stelle wäre wirkungslos.
//
// Registrierungen, die TYPO3 selbst lazy einliest (TCA, Site Sets, Icons, Backend-Module),
// gehören nicht hierher, sondern unter Configuration/.
