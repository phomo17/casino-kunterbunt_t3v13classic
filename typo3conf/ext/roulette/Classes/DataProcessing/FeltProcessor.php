<?php

declare(strict_types=1);

namespace Phomo17\Roulette\DataProcessing;

use Phomo17\Roulette\BetLayout;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Legt die Felder des Tuchs für Fluid bereit.
 *
 * TypoScript:
 *     dataProcessing { 30 = roulette-felt   30.as = felt }
 *
 * Ergebnis im Template: {felt} mit
 *   felt.fields    159 Einträge, je: id, kind, group, covers, coversText,
 *                  payout, max, labelKey, labelArgs, printed, gridColumn,
 *                  gridRow
 *   felt.roundMax  100
 *   felt.columns   die zwölf Tuchspalten als Liste (für die Dutzend-Beschriftung)
 *
 * gridColumn/gridRow sind fertige CSS-Werte („4" bzw. „4 / 11"), damit im
 * Template keine Rechnung steht und im Stylesheet keine 159 Regeln.
 * coversText ist die abgedeckten Zahlen als lesbarer Text („1, 2, 4 und 5")
 * für den erreichbaren Namen eines Linienfeldes.
 *
 * labelKey kommt hier bereits als vollständiger LLL:EXT:…-Schlüssel heraus
 * (BetLayout::fields() liefert nur den bloßen XLIFF-Bezeichner, z. B.
 * "felt.name.split") — dieselbe Aufgabenteilung wie bei coversText: Fluid
 * bekommt einen fertigen Wert statt selbst eine Zeichenkette zusammenzubauen.
 *
 * group ordnet jedes Feld einer von vier Bildschirmleser-Gruppen zu
 * (numbers/columns/dozens/even, Felt.html rendert sie als eigene
 * role="group"-Bereiche). Die Reihenfolge von BetLayout::fields() hält diese
 * vier Gruppen ohnehin schon zusammenhängend; group macht die Zuordnung im
 * Template lesbar, statt dort auf einzelne kind-Werte zu prüfen.
 *
 * Der Processor liest KEINEN Datenbankwert: das Inhaltselement hat keine
 * Einstellung. Er ist eine reine Rechnung und hängt nur an Anhang F.
 */
final class FeltProcessor implements DataProcessorInterface
{
    private const LANG_FRONTEND = 'LLL:EXT:roulette/Resources/Private/Language/locallang.xlf:';

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
                'labelKey' => $field['labelKey'] !== null ? self::LANG_FRONTEND . $field['labelKey'] : null,
                'labelArgs' => $field['labelArgs'],
                'printed' => $field['printed'],
                'gridColumn' => self::gridLine($field['col'], $field['colEnd']),
                'gridRow' => self::gridLine($field['row'], $field['rowEnd']),
            ];
        }

        $processedData[$targetVariableName] = [
            'fields' => $fields,
            'roundMax' => BetLayout::ROUND_MAX,
            'columns' => range(1, BetLayout::COLUMNS),
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
