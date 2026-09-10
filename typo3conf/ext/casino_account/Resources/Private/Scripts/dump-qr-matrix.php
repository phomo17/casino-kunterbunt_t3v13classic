<?php

declare(strict_types=1);

/**
 * Gibt ein erzeugtes QR-Muster als JSON auf STDOUT aus — für verify-qr.mjs.
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Absichtlich OHNE
 * TYPO3-Bootstrap: die vier Qr-Klassen hängen an nichts Frameworkspezifischem,
 * deshalb genügt ein unmittelbares require. Das hält den Nachweis schnell und
 * unabhängig vom Autoloader-Cache.
 *
 * Aufruf (nur lesend, ändert keine Datei, schreibt nur nach STDOUT):
 *
 *   ddev exec php typo3conf/ext/casino_account/Resources/Private/Scripts/dump-qr-matrix.php "<Inhalt>" [<Stufe>]
 *
 * <Stufe> ist Q (Voreinstellung) oder M. M wird für den bekannten
 * Vergleichswert aus der Norm gebraucht (Prüfung Q-12).
 */

/*
 * Der Autoloader des Kerns. In einer klassischen Installation liegt er unter
 * typo3_src/vendor/, in einer Composer-Installation unter vendor/. Beide Wege
 * werden probiert — und wenn keiner trägt, wird LAUT abgebrochen. Ein stiller
 * Ausstieg wäre genau die Fehlerklasse, gegen die der Wächterblock gebaut ist.
 */
$wurzel = dirname(__DIR__, 6);
$kandidaten = [
    $wurzel . '/typo3_src/vendor/autoload.php',
    $wurzel . '/vendor/autoload.php',
];
$geladen = false;
foreach ($kandidaten as $kandidat) {
    if (is_file($kandidat)) {
        require $kandidat;
        $geladen = true;
        break;
    }
}
if (!$geladen) {
    fwrite(STDERR, "Kein Autoloader gefunden. Gesucht wurde in:\n  " . implode("\n  ", $kandidaten) . "\n");
    exit(1);
}

require __DIR__ . '/../../../Classes/Qr/QrMatrix.php';
require __DIR__ . '/../../../Classes/Qr/QrCodeFactory.php';
require __DIR__ . '/../../../Classes/Qr/BaconQrCodeFactory.php';
require __DIR__ . '/../../../Classes/Qr/QrSvgRenderer.php';

$inhalt = $argv[1] ?? 'https://casino-kunterbunt.ddev.site/?casinoToken=0000000000000000000000000000000000000000000';
$stufe = strtoupper($argv[2] ?? 'Q');

$level = $stufe === 'M'
    ? \BaconQrCode\Common\ErrorCorrectionLevel::M()
    : \BaconQrCode\Common\ErrorCorrectionLevel::Q();

$qrCode = \BaconQrCode\Encoder\Encoder::encode(
    $inhalt,
    $level,
    \BaconQrCode\Encoder\Encoder::DEFAULT_BYTE_MODE_ENCODING
);

$byteMatrix = $qrCode->getMatrix();
$size = $byteMatrix->getWidth();
$rows = [];
for ($y = 0; $y < $size; $y++) {
    $row = '';
    for ($x = 0; $x < $size; $x++) {
        $row .= $byteMatrix->get($x, $y) === 1 ? '1' : '0';
    }
    $rows[] = $row;
}

/*
 * Was die Bibliothek über die gewählte Fassung SAGT. Das Prüfskript hält
 * diese Angaben gegen eine von Hand aus der Norm abgeschriebene Tabelle —
 * stimmen beide überein, ist die Tabelle im Prüfskript vertrauenswürdig;
 * stimmen sie nicht überein, bricht der Nachweis laut ab. Zwei unabhängige
 * Quellen, die sich treffen, sind ein Beweis; eine allein ist es nicht.
 */
$version = $qrCode->getVersion();
$ecBlocks = $version->getEcBlocksForLevel($level);
$funktionsmuster = $version->buildFunctionPattern();
$funktionsZeilen = [];
for ($y = 0; $y < $size; $y++) {
    $zeile = '';
    for ($x = 0; $x < $size; $x++) {
        $zeile .= $funktionsmuster->get($x, $y) ? '1' : '0';
    }
    $funktionsZeilen[] = $zeile;
}

$renderer = new \Phomo17\CasinoAccount\Qr\QrSvgRenderer();
$matrix = (new \Phomo17\CasinoAccount\Qr\BaconQrCodeFactory())->create($inhalt);

echo json_encode([
    'content' => $inhalt,
    'ecLevel' => $stufe,
    'size' => $size,
    'version' => $version->getVersionNumber(),
    'mask' => $qrCode->getMaskPattern(),
    'rows' => $rows,
    'svg' => $renderer->render($matrix, 'Prüfmuster'),
    'ownRows' => $matrix->toRows(),
    'bacon' => [
        'totalCodewords' => $version->getTotalCodewords(),
        'ecCodewordsPerBlock' => $ecBlocks->getEcCodewordsPerBlock(),
        'blocks' => array_map(
            static fn($block): array => [$block->getCount(), $block->getDataCodewords()],
            $ecBlocks->getEcBlocks()
        ),
        'alignmentCenters' => $version->getAlignmentPatternCenters(),
        'functionPattern' => $funktionsZeilen,
    ],
], JSON_THROW_ON_ERROR);
