<?php

declare(strict_types=1);

namespace Phomo17\Roulette\DataProcessing;

use Phomo17\Roulette\BetLayout;
use Phomo17\Roulette\Roulette;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Legt die 159 Felder des Tuchs und die Maßordnung des Tisches für Fluid bereit.
 *
 * TypoScript (unverändert seit Teilstück C3b):
 *     dataProcessing { 30 = roulette-felt   30.as = felt }
 *
 * Ergebnis im Template: {felt} mit
 *   felt.fields      159 Einträge, je: id, kind, group, covers, coversText,
 *                    payout, max, labelKey (fertiger LLL:EXT:…-Schlüssel),
 *                    labelArgs, print, diamond, gridColumn, gridRow
 *   felt.roundMax    100
 *   felt.columns     die zwölf Tuchspalten als Liste
 *   felt.view        die viewBox der Tischzeichnung: w, h
 *   felt.cloth       die Spielfläche: x, y, w, h
 *   felt.grid        der Kasten des Spielplans: x, y, w, h
 *   felt.wheel       die Radmulde: cx, cy, r
 *   felt.arrowPaths  die Umrisse der zwei Pfeilfelder als SVG-Pfadangaben
 *
 * NEU (Umbau nach der Bildvorlage, Ansage vom 2026-09-08):
 *   'print' ist eine LISTE von Aufschriftteilen ({text, lang, role}) und KEIN
 *   XLIFF-Schlüssel mehr — sie läuft deshalb nicht durch f:translate. Die
 *   Aufschrift ist englisch und die Beschriftung eines Spielgeräts, kein
 *   übersetzbarer Text (siehe BetLayout.php).
 *   'diamond' ist 'red', 'black' oder leer und sagt, ob dieses Feld eine
 *   gezeichnete Raute trägt statt einer Aufschrift.
 *   Die Maßordnung (view/cloth/grid/wheel/arrowPaths) steht hier, weil
 *   Cloth.html sie zum Zeichnen braucht. Stünden die Zahlen als feste
 *   Zeichenketten in der Zeichnung, wären sie eine zweite Wahrheit neben dem
 *   Gitter: verschöbe sich eine Gitterlinie, liefe der Umriss stillschweigend
 *   daneben. Prüfung F-13 und F-15 rechnen beides gegeneinander.
 *
 * gridColumn/gridRow sind fertige CSS-Werte („4" bzw. „4 / 11"), damit im
 * Template keine Rechnung steht und im Stylesheet keine 159 Regeln.
 * coversText ist die abgedeckten Zahlen als lesbarer Text („1, 2, 4 und 5")
 * für den erreichbaren Namen eines Linienfeldes.
 *
 * labelKey kommt hier bereits als vollständiger LLL:EXT:…-Schlüssel heraus
 * (BetLayout::fields() liefert nur den bloßen XLIFF-Bezeichner) — dieselbe
 * Aufgabenteilung wie bei coversText: Fluid bekommt einen fertigen Wert statt
 * selbst eine Zeichenkette zusammenzubauen.
 *
 * group ordnet jedes Feld einer von vier Bildschirmleser-Gruppen zu
 * (numbers/columns/dozens/even, Felt.html rendert sie als eigene
 * role="group"-Bereiche).
 *
 * Der Processor liest KEINEN Datenbankwert: das Inhaltselement hat keine
 * Einstellung. Er ist eine reine Rechnung und hängt nur an Anhang F und an der
 * Maßordnung aus BetLayout.
 */
final class FeltProcessor implements DataProcessorInterface
{
    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'felt');

        $fields = [];
        foreach (BetLayout::fields() as $field) {
            $fields[] = [
                'id' => $field['id'],
                'kind' => $field['kind'],
                'group' => self::groupOf($field['kind']),
                'covers' => $field['covers'],
                'coversText' => self::coversText($field['covers']),
                'payout' => $field['payout'],
                'max' => $field['max'],
                'labelKey' => Roulette::LANG_FRONTEND . $field['labelKey'],
                'labelArgs' => $field['labelArgs'],
                'print' => $field['print'],
                'diamond' => $field['diamond'],
                'gridColumn' => self::gridLine($field['col'], $field['colEnd']),
                'gridRow' => self::gridLine($field['row'], $field['rowEnd']),
            ];
        }

        $processedData[$targetVariableName] = [
            'fields' => $fields,
            'roundMax' => BetLayout::ROUND_MAX,
            'columns' => range(1, BetLayout::COLUMNS),
            'view' => ['w' => BetLayout::VIEW_W, 'h' => BetLayout::VIEW_H],
            'cloth' => [
                'x' => BetLayout::CLOTH_X, 'y' => BetLayout::CLOTH_Y,
                'w' => BetLayout::CLOTH_W, 'h' => BetLayout::CLOTH_H,
            ],
            'grid' => [
                'x' => BetLayout::GRID_X, 'y' => BetLayout::GRID_Y,
                'w' => BetLayout::GRID_W, 'h' => BetLayout::GRID_H,
            ],
            'wheel' => [
                'cx' => BetLayout::WHEEL_CX, 'cy' => BetLayout::WHEEL_CY,
                'r' => BetLayout::WHEEL_R,
            ],
            'arrowPaths' => BetLayout::arrowPaths(),
        ];

        return $processedData;
    }

    /** Eine von vier Bildschirmleser-Gruppen (Felt.html). */
    private static function groupOf(string $kind): string
    {
        return match ($kind) {
            'column' => 'columns',
            'dozen' => 'dozens',
            'even' => 'even',
            default => 'numbers',
        };
    }

    /** "1, 2, 4 und 5" — Grammatik gehört nicht in eine Fluid-Vorlage. */
    private static function coversText(array $covers): string
    {
        $count = count($covers);
        if ($count === 1) {
            return (string)$covers[0];
        }
        $last = array_pop($covers);

        return implode(', ', $covers) . ' und ' . $last;
    }

    /** "4" ohne Ende, "4 / 11" mit Ende — fertiger CSS-Wert für grid-column/-row. */
    private static function gridLine(int $start, ?int $end): string
    {
        return $end === null ? (string)$start : $start . ' / ' . $end;
    }
}
