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

echo json_encode(\Phomo17\Roulette\BetLayout::fields(), JSON_THROW_ON_ERROR);
