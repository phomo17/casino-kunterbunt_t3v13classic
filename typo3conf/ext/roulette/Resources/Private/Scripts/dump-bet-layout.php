<?php

declare(strict_types=1);

/**
 * Gibt BetLayout::fields() als JSON auf STDOUT aus — für verify-felt.mjs
 * (Prüfung F-1: PHP-Spiegel gegen bets-roulette.js).
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website und keine TYPO3-Klasse.
 * Absichtlich OHNE TYPO3-Bootstrap: BetLayout.php und WheelGeometry.php
 * hängen an nichts Frameworkspezifischem, deshalb genügt ein unmittelbares
 * require der beiden Dateien. Das hält den Nachweis schnell und unabhängig
 * vom Autoloader-Cache.
 *
 * Aufruf (nur lesend, ändert keine Datei, schreibt nur nach STDOUT):
 *
 *   ddev exec php typo3conf/ext/roulette/Resources/Private/Scripts/dump-bet-layout.php
 */

require __DIR__ . '/../../../Classes/WheelGeometry.php';
require __DIR__ . '/../../../Classes/BetLayout.php';

/*
 * Seit dem Umbau nach der Bildvorlage gibt dieses Werkzeug nicht mehr nur die
 * Feldliste aus, sondern auch die Maßordnung: der Nachweis F-13 hält die
 * Zahlen der Zeichnung (Cloth.html) und die Spurgewichte des Stylesheets
 * (felt.css) gegen genau diese Werte. Stünden sie nur im PHP, könnte kein
 * Skript prüfen, dass die drei Stellen dasselbe meinen.
 */
echo json_encode([
    'fields' => \Phomo17\Roulette\BetLayout::fields(),
    'columnFractions' => \Phomo17\Roulette\BetLayout::COLUMN_FRACTIONS,
    'rowFractions' => \Phomo17\Roulette\BetLayout::ROW_FRACTIONS,
    'gridColumns' => \Phomo17\Roulette\BetLayout::GRID_COLUMNS,
    'gridRows' => \Phomo17\Roulette\BetLayout::GRID_ROWS,
    'view' => [
        'w' => \Phomo17\Roulette\BetLayout::VIEW_W,
        'h' => \Phomo17\Roulette\BetLayout::VIEW_H,
    ],
    'cloth' => [
        'x' => \Phomo17\Roulette\BetLayout::CLOTH_X,
        'y' => \Phomo17\Roulette\BetLayout::CLOTH_Y,
        'w' => \Phomo17\Roulette\BetLayout::CLOTH_W,
        'h' => \Phomo17\Roulette\BetLayout::CLOTH_H,
    ],
    'grid' => [
        'x' => \Phomo17\Roulette\BetLayout::GRID_X,
        'y' => \Phomo17\Roulette\BetLayout::GRID_Y,
        'w' => \Phomo17\Roulette\BetLayout::GRID_W,
        'h' => \Phomo17\Roulette\BetLayout::GRID_H,
    ],
    'wheel' => [
        'cx' => \Phomo17\Roulette\BetLayout::WHEEL_CX,
        'cy' => \Phomo17\Roulette\BetLayout::WHEEL_CY,
        'r' => \Phomo17\Roulette\BetLayout::WHEEL_R,
    ],
    'arrowPaths' => \Phomo17\Roulette\BetLayout::arrowPaths(),
], JSON_THROW_ON_ERROR);
