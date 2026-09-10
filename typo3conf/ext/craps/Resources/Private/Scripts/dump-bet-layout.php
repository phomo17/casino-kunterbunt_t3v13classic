<?php

declare(strict_types=1);

/**
 * Gibt BetLayout::fields() als JSON auf STDOUT aus — für verify-felt.mjs
 * (Prüfung F-1: PHP-Spiegel gegen bets-craps.js).
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website und keine TYPO3-Klasse.
 * Absichtlich OHNE TYPO3-Bootstrap: BetLayout.php hängt an nichts
 * Frameworkspezifischem, deshalb genügt ein unmittelbares require. Das hält
 * den Nachweis schnell und unabhängig vom Autoloader-Cache. Dieselbe Brücke
 * wie beim anderen Tisch (roulette/…/dump-bet-layout.php); sie ist zugleich
 * die Antwort auf das Sandbox-Regelwerk, das Interpreter-Code als
 * Kommandozeilenargument verbietet und „eine echte Datei" verlangt.
 *
 * Aufruf (nur lesend, ändert keine Datei, schreibt nur nach STDOUT):
 *
 *   ddev exec php typo3conf/ext/craps/Resources/Private/Scripts/dump-bet-layout.php
 */

require __DIR__ . '/../../../Classes/BetLayout.php';

echo json_encode([
    'fields' => \Phomo17\Craps\BetLayout::fields(),
    'roundMax' => \Phomo17\Craps\BetLayout::ROUND_MAX,
    'columns' => \Phomo17\Craps\BetLayout::COLUMNS,
    'rows' => \Phomo17\Craps\BetLayout::ROWS,
    'centerCol' => \Phomo17\Craps\BetLayout::CENTER_COL,
    'rightCol' => \Phomo17\Craps\BetLayout::RIGHT_COL,
    'puckLanes' => \Phomo17\Craps\BetLayout::puckLanes(),
    // Neu mit dem Umbau nach der Bildvorlage (2026-09-08):
    'rowFractions' => \Phomo17\Craps\BetLayout::ROW_FRACTIONS,
    'legLanes' => \Phomo17\Craps\BetLayout::legLanes(),
    'bandPaths' => \Phomo17\Craps\BetLayout::bandPaths(),
    'pips' => \Phomo17\Craps\BetLayout::PIPS,
    'pointsOnCloth' => \Phomo17\Craps\BetLayout::POINTS_ON_CLOTH,
    'points' => \Phomo17\Craps\BetLayout::POINTS,
    'pointPrint' => \Phomo17\Craps\BetLayout::POINT_PRINT,
    'numberCol' => \Phomo17\Craps\BetLayout::NUMBER_COL,
    'numberWidth' => \Phomo17\Craps\BetLayout::NUMBER_WIDTH,
    'bandCol' => \Phomo17\Craps\BetLayout::BAND_COL,
], JSON_THROW_ON_ERROR);
