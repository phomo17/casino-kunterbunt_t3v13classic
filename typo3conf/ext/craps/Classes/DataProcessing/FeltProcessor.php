<?php

declare(strict_types=1);

namespace Phomo17\Craps\DataProcessing;

use Phomo17\Craps\BetLayout;
use Phomo17\Craps\Craps;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Legt die 48 Felder des Craps-Tuchs für Fluid bereit.
 *
 * TypoScript:
 *     dataProcessing { 30 = craps-felt   30.as = felt }
 *
 * Ergebnis im Template: {felt} mit
 *   felt.fields    48 Einträge, je: id, kind, group, print, printPayout,
 *                  doublePayout, circles, pips, labelKey (fertiger
 *                  LLL:EXT:…-Schlüssel), labelArgs, payoutText, max, unit,
 *                  odds, gridColumn, gridRow, mirrorGridColumn
 *   felt.roundMax  300
 *   felt.points    [4, 5, 6, 8, 9, 10]
 *   felt.columns   96 (BetLayout::COLUMNS)
 *   felt.rows      11 (BetLayout::ROWS)
 *   felt.bandPaths die drei geschwungenen Linien der Vorlage, fertig als
 *                  SVG-Pfadangaben in der Wannen-Maßordnung (BetLayout::bandPaths())
 *   felt.puckOff/felt.puckOn/felt.printE/felt.printC
 *                  weitere Tuch-Beschriftung ohne eigenes Feld
 *
 * NEU (Ansage vom 2026-09-08, Aufschrift englisch): 'print' ist eine LISTE
 * von Aufschriftteilen ({text, lang, role}), kein XLIFF-Schlüssel mehr — sie
 * läuft deshalb NICHT durch f:translate. 'printPayout' ist „8 FOR 1“ oder
 * leer (gerechnet über BetLayout::forOne()), 'doublePayout' sagt, ob dieser
 * Aufdruck auf der Vorlage zweimal steht, 'circles' sind die zwei
 * eingekreisten Sonderfälle des FIELD, 'pips' die kleinen Würfelbilder als
 * Augenpaare.
 *
 * mirrorGridColumn ist die Lage desselben Feldes in der gespiegelten linken
 * Seitensektion — leere Zeichenkette, wenn das Feld in der Mittensektion
 * liegt und deshalb nicht gespiegelt wird. columns/rows braucht die Vorlage
 * nicht zum Zeichnen (das Gitter steht in felt.css), aber der Nachweis F-6
 * liest sie über dump-bet-layout.php.
 *
 * gridColumn/gridRow sind fertige CSS-Werte („1 / 7"), damit im Template
 * keine Rechnung steht und im Stylesheet keine 48 Regeln. labelKey kommt
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
                // NEU (Aufschrift englisch, Ansage vom 2026-09-08): die
                // Aufschrift ist eine LISTE von Teilen, jeder mit seiner
                // Sprache und seiner Rolle. Sie ist kein XLIFF-Schlüssel mehr
                // und läuft deshalb NICHT durch f:translate.
                'print' => $field['print'],
                'printPayout' => $field['printPayout'],
                'doublePayout' => $field['doublePayout'],
                'circles' => $field['circles'],
                'pips' => $field['pips'],
                'labelKey' => Craps::LANG_FRONTEND . $field['labelKey'],
                'labelArgs' => $field['labelArgs'],
                'payoutText' => $field['payoutText'],
                'max' => $field['max'],
                'unit' => $field['unit'],
                'odds' => $field['odds'],
                'gridColumn' => self::gridLine($field['col'], $field['colEnd']),
                'gridRow' => self::gridLine($field['row'], $field['rowEnd']),
                /*
                 * Die Lage desselben Feldes in der gespiegelten linken
                 * Seitensektion — leer, wenn das Feld in der Mittensektion
                 * liegt und deshalb nicht gespiegelt wird. Fluid prüft auf
                 * die leere Zeichenkette; eine 0 als Gitterlinie gibt es
                 * nicht, deshalb ist die leere Zeichenkette hier eindeutig.
                 */
                'mirrorGridColumn' => $field['mirrorCol'] > 0
                    ? self::gridLine($field['mirrorCol'], $field['mirrorColEnd'])
                    : '',
            ];
        }

        $processedData[$targetVariableName] = [
            'fields' => $fields,
            'roundMax' => BetLayout::ROUND_MAX,
            'points' => BetLayout::POINTS,
            'columns' => BetLayout::COLUMNS,
            'rows' => BetLayout::ROWS,
            // NEU: die drei geschwungenen Linien der Vorlage als fertige
            // SVG-Pfadangaben in der Wannen-Maßordnung. Sie stehen hier und
            // nicht als feste Zeichenkette in Cloth.html, weil sie sonst eine
            // zweite Wahrheit neben der Maßordnung wären: verschöbe sich eine
            // Gitterlinie, liefe der Umriss stillschweigend daneben.
            'bandPaths' => BetLayout::bandPaths(),
            // Die Aufschrift des Pucks und die zwei Buchstaben der E/C-Kette.
            // Sie gehören keinem Feld, sind aber ebenso Tuch-Beschriftung und
            // stehen deshalb an derselben Stelle wie alle andere: in
            // BetLayout. F-24 prüft sie mit.
            'puckOff' => BetLayout::PRINT_PUCK_OFF,
            'puckOn' => BetLayout::PRINT_PUCK_ON,
            'printE' => BetLayout::PRINT_E,
            'printC' => BetLayout::PRINT_C,
        ];

        return $processedData;
    }

    /** „1 / 7" — fertiger CSS-Wert für grid-column beziehungsweise grid-row. */
    private static function gridLine(int $start, int $end): string
    {
        return $start . ' / ' . $end;
    }
}
