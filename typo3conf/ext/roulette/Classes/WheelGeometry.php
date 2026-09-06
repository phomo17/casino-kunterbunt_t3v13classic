<?php

declare(strict_types=1);

namespace Phomo17\Roulette;

/**
 * Die Radanordnung als PHP-Spiegel von Resources/Public/JavaScript/wheel-geometry.js.
 *
 * WARUM DOPPELT
 * =============
 * Das Rad wird serverseitig gezeichnet, damit es ohne JavaScript im Markup
 * steht (und damit der Kern die Zeichnung zwischenspeichert, statt sie bei
 * jedem Aufruf neu zu bauen). Fluid kann keine JavaScript-Datei lesen, also
 * steht Anhang F hier ein zweites Mal.
 *
 * WARUM DAS KEINE ZWEITE WAHRHEIT IST
 * ===================================
 * Resources/Private/Scripts/verify-wheel.mjs liest BEIDE Dateien und
 * vergleicht sie Fach für Fach und Farbe für Farbe. Weicht eine Stelle ab,
 * schlägt der Nachweis fehl. Die Physik rechnet ausschließlich mit der
 * JavaScript-Fassung; diese hier zeichnet nur.
 *
 * Namensschild ohne Instanzen: privater Konstruktor, in Services.yaml
 * ausgeschlossen.
 */
final class WheelGeometry
{
    /** Die 38 Fächer im Uhrzeigersinn, beginnend bei der Null (Anhang F). */
    public const ORDER = [
        '0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
        '5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
        '27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
        '21', '33', '16', '4', '23', '35', '14', '2',
    ];

    /** Die roten Zahlen (Anhang F). */
    public const RED = [
        '1', '3', '5', '7', '9', '12', '14', '16', '18',
        '19', '21', '23', '25', '27', '30', '32', '34', '36',
    ];

    /** Die schwarzen Zahlen (Anhang F). */
    public const BLACK = [
        '2', '4', '6', '8', '10', '11', '13', '15', '17',
        '20', '22', '24', '26', '28', '29', '31', '33', '35',
    ];

    /** Die beiden grünen Fächer. Sie liegen sich gegenüber (Anhang F). */
    public const GREEN = ['0', '00'];

    /** Anzahl der Rauten am inneren Rand der Laufbahn (CONCEPT.md C.6.3). */
    public const DEFLECTOR_COUNT = 8;

    private function __construct() {}

    /**
     * Die Farbe eines Fachs.
     *
     * @return 'red'|'black'|'green'
     */
    public static function colourOf(string $label): string
    {
        if (in_array($label, self::GREEN, true)) {
            return 'green';
        }
        if (in_array($label, self::RED, true)) {
            return 'red';
        }
        if (in_array($label, self::BLACK, true)) {
            return 'black';
        }
        throw new \OutOfRangeException('Unbekanntes Fach: "' . $label . '"', 1788480001);
    }
}
