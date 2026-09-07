<?php

declare(strict_types=1);

namespace Phomo17\Craps\DataProcessing;

use Phomo17\Craps\BetLayout;
use Phomo17\Craps\Craps;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Legt die 47 Felder des Craps-Tuchs für Fluid bereit.
 *
 * TypoScript:
 *     dataProcessing { 30 = craps-felt   30.as = felt }
 *
 * Ergebnis im Template: {felt} mit
 *   felt.fields    47 Einträge, je: id, kind, group, printed, labelKey
 *                  (fertiger LLL:EXT:…-Schlüssel), labelArgs, payoutText,
 *                  max, unit, odds, gridColumn, gridRow
 *   felt.roundMax  300
 *   felt.points    [4, 5, 6, 8, 9, 10]
 *
 * gridColumn/gridRow sind fertige CSS-Werte („1 / 7"), damit im Template
 * keine Rechnung steht und im Stylesheet keine 47 Regeln. labelKey kommt
 * bereits als vollständiger Schlüssel heraus (BetLayout liefert nur den
 * bloßen Bezeichner) — dieselbe Aufgabenteilung wie beim anderen Tisch.
 *
 * Der Processor liest KEINEN Datenbankwert: das Inhaltselement hat keine
 * Einstellung. Er ist eine reine Rechnung und hängt nur an Anhang H und an
 * der Maßordnung aus BetLayout.
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
                'group' => $field['group'],
                'printed' => $field['printed'],
                'labelKey' => Craps::LANG_FRONTEND . $field['labelKey'],
                'labelArgs' => $field['labelArgs'],
                'payoutText' => $field['payoutText'],
                'max' => $field['max'],
                'unit' => $field['unit'],
                'odds' => $field['odds'],
                'gridColumn' => self::gridLine($field['col'], $field['colEnd']),
                'gridRow' => self::gridLine($field['row'], $field['rowEnd']),
            ];
        }

        $processedData[$targetVariableName] = [
            'fields' => $fields,
            'roundMax' => BetLayout::ROUND_MAX,
            'points' => BetLayout::POINTS,
        ];

        return $processedData;
    }

    /** „1 / 7" — fertiger CSS-Wert für grid-column beziehungsweise grid-row. */
    private static function gridLine(int $start, int $end): string
    {
        return $start . ' / ' . $end;
    }
}
