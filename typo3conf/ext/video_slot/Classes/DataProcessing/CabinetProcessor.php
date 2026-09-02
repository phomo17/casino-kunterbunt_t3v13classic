<?php

declare(strict_types=1);

namespace Phomo17\VideoSlot\DataProcessing;

use Phomo17\VideoSlot\Rules;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Rechnet Anhang D in Zeichenkoordinaten um.
 *
 * TypoScript (siehe ext_localconf.php):
 *
 *     dataProcessing {
 *         10 = video-slot-cabinet
 *         10.as = machine
 *     }
 *
 * Ergebnis im Template: {machine.reels}, {machine.paylines},
 * {machine.paytable}.
 *
 * Alle Zahlen sind viewBox-Einheiten des Maßrasters aus dem Kopf von
 * machine.css. Text kommt hier nie vor: Sonderhinweise reisen als
 * XLIFF-Schlüssel plus einzusetzendem Wert.
 *
 * Warum überhaupt PHP: das sind rund 150 einzelne Koordinaten. Von Hand
 * geschrieben wäre der Zahlendreher nur eine Frage der Zeit — und die
 * Gewinnlinien tragen ab Phase 6 die Auswertung. Dieselbe Begründung wie
 * beim MachineProcessor des Reel Slot.
 */
final class CabinetProcessor implements DataProcessorInterface
{
    /** Breite einer Zelle im Sichtfeld. */
    private const CELL_WIDTH = 12;

    /** Höhe einer Zelle im Sichtfeld. */
    private const CELL_HEIGHT = 14;

    /** Luft zwischen Leuchtfeld und Zellrand (allseitig ausser oben/unten 0,4). */
    private const FIELD_INSET = 0.4;

    /** Kantenlänge eines Symbols im Leuchtfeld. */
    private const SYMBOL_SIZE = 10;

    /**
     * Zellen je Band im Sichtfeld: zwei Umläufe der 25 Rasterpositionen.
     *
     * Das Fenster zeigt drei Zellen übereinander. Bei nur einem Umlauf hätte
     * die letzte Position keine Nachfolgerin — der Rundumschluss wäre ein
     * sichtbarer Sprung. Zwei Umläufe: Zelle k und k−25 zeigen dasselbe
     * Symbol, das Band lässt sich unsichtbar zurücksetzen. Dieselbe Lösung
     * wie beim Reel Slot (40 Zellen aus 20 Positionen).
     */
    private const CELLS_PER_STRIP = Rules::POSITIONS_PER_STRIP * 2;

    /* --- Gewinnplan: die Hälften ------------------------------------------ */

    /** x der Symbolspalte, je Hälfte. */
    private const PAYTABLE_SYMBOL_X = [1 => 12.4, 2 => 43.4];

    /** x, an dem die Punktführung beginnt bzw. der Hinweistext ansetzt. */
    private const PAYTABLE_NOTE_X = [1 => 15.4, 2 => 46.4];

    /** x, an dem die Punktführung endet. */
    private const PAYTABLE_LEADER_END_X = [1 => 25.8, 2 => 56.8];

    /** x der drei rechtsbündigen Wertespalten 3 / 4 / 5, je Hälfte. */
    private const PAYTABLE_VALUE_X = [
        1 => [3 => 30.5, 4 => 35.5, 5 => 40.5],
        2 => [3 => 61.5, 4 => 66.5, 5 => 71.5],
    ];

    /** Oberkante der ersten Zeile beider Hälften. */
    private const PAYTABLE_FIRST_Y = 32.4;

    /** Zeilenabstand im Gewinnplan. */
    private const PAYTABLE_ROW_HEIGHT = 2.7;

    /** Kantenlänge eines Symbols im Gewinnplan. */
    private const PAYTABLE_SYMBOL_SIZE = 2.4;

    /**
     * Aufteilung der neun Zeilen auf die zwei Spalten der Karte: die fünf
     * höchsten links, die vier übrigen rechts — dieselbe Leserichtung wie im
     * Gewinnplan des Reel Slot.
     *
     * @var array<int, int>
     */
    private const PAYTABLE_HALF_SIZE = [1 => 5, 2 => 4];

    /** Sonderhinweise statt Punktführung, als XLIFF-Schlüssel. */
    private const PAYTABLE_NOTE_KEY = [
        'kirsche' => 'machine.paytable.note.kirsche',
        'scatter' => 'machine.paytable.note.scatter',
    ];

    /**
     * Der Gedankenstrich (U+2013) für einen noch nicht bestimmten Wert.
     *
     * Die EINZIGE Stelle, an der ein Schriftzeichen aus PHP kommt. Es ist
     * Satzzeichen, kein Text — dasselbe Zeichen, das das Kassenfenster im
     * Markup benutzt. Nötig, weil <f:translate arguments="{0: '…'}"> bei
     * einem leeren Wert „AB 2 GLEICHE: " ohne Zahl drucken würde.
     */
    private const DASH = "\u{2013}";

    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $this->assertGridIsValid();

        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'machine');

        $processedData[$targetVariableName] = [
            'reels' => $this->buildReels(),
            'paylines' => $this->buildPaylines(),
            'paytable' => $this->buildPaytable(),
        ];

        return $processedData;
    }

    /**
     * Fünf Walzen zu je 50 Zellen (zwei Umläufe der 25 Rasterpositionen aus
     * Rules::STRIPS).
     *
     * @return list<array{index: int, symbolList: string, defaultPosition: int, cells: list<array{index: int, symbol: string, fieldY: float, symbolY: float}>}>
     */
    private function buildReels(): array
    {
        $reels = [];

        foreach (Rules::STRIPS as $reelIndex => $strip) {
            $this->assertStripIsValid($reelIndex, $strip);
            $this->assertDefaultGridIsOnStrip($reelIndex, $strip);

            $cells = [];
            for ($cell = 0; $cell < self::CELLS_PER_STRIP; $cell++) {
                $cells[] = [
                    'index' => $cell,
                    'symbol' => $strip[$cell % Rules::POSITIONS_PER_STRIP],
                    'fieldY' => $cell * self::CELL_HEIGHT + self::FIELD_INSET,
                    'symbolY' => $cell * self::CELL_HEIGHT + 2,
                ];
            }

            $reels[] = [
                'index' => $reelIndex + 1,
                'symbolList' => implode(',', $strip),
                // Liegt im ZWEITEN Umlauf, damit über und unter ihr eine
                // Zelle liegt (= 26 bei DEFAULT_POSITIONS[$c] = 1).
                'defaultPosition' => Rules::POSITIONS_PER_STRIP + Rules::DEFAULT_POSITIONS[$reelIndex],
                'cells' => $cells,
            ];
        }

        return $reels;
    }

    /**
     * Die fünf festen Gewinnlinien als fertige points-Zeichenkette für ein
     * <polyline>, im Koordinatensystem des Sichtfelds (60 × 42).
     *
     * Die Punkte sind die Zellmittelpunkte: x = 6 / 18 / 30 / 42 / 54,
     * y = 7 / 21 / 35. Alle Werte sind ganzzahlig, es entstehen also keine
     * Nachkommastellen.
     *
     * @return list<array{index: int, points: string}>
     */
    private function buildPaylines(): array
    {
        $lines = [];

        foreach (Rules::LINES as $number => $rows) {
            $points = [];

            for ($reelIndex = 0; $reelIndex < Rules::REELS; $reelIndex++) {
                $points[] = sprintf(
                    '%s,%s',
                    (string)($reelIndex * self::CELL_WIDTH + intdiv(self::CELL_WIDTH, 2)),
                    (string)($rows[$reelIndex] * self::CELL_HEIGHT + intdiv(self::CELL_HEIGHT, 2))
                );
            }

            $lines[] = [
                'index' => $number,
                'points' => implode(' ', $points),
            ];
        }

        return $lines;
    }

    /**
     * Die neun Zeilen des Gewinnplans: Hälfte, Symbol, Zeilenoberkante,
     * Punktführung oder Sonderhinweis und die drei Wertespalten.
     *
     * @return list<array<string, mixed>>
     */
    private function buildPaytable(): array
    {
        $rows = [];
        $index = 0;

        foreach (Rules::SYMBOLS as $symbol) {
            $half = $index < self::PAYTABLE_HALF_SIZE[1] ? 1 : 2;
            $inHalf = $half === 1 ? $index : $index - self::PAYTABLE_HALF_SIZE[1];
            $top = self::PAYTABLE_FIRST_Y + $inHalf * self::PAYTABLE_ROW_HEIGHT;

            $noteKey = self::PAYTABLE_NOTE_KEY[$symbol] ?? null;
            $noteX = self::PAYTABLE_NOTE_X[$half];

            // Nur die Kirsche trägt einen Wert in ihrem Hinweis; der Scatter
            // sagt lediglich, dass er überall zählt.
            $noteValue = null;
            if ($symbol === Rules::SHORT_CHAIN) {
                $noteValue = Rules::PAYTABLE[$symbol][2] ?? self::DASH;
            }

            $values = [];
            foreach ([3, 4, 5] as $length) {
                $values[] = [
                    'x' => self::PAYTABLE_VALUE_X[$half][$length],
                    'y' => $top + 2.05,
                    'value' => Rules::PAYTABLE[$symbol][$length] ?? null,
                ];
            }

            $rows[] = [
                'half' => $half,
                'symbol' => $symbol,
                'symbolX' => self::PAYTABLE_SYMBOL_X[$half],
                'symbolSize' => self::PAYTABLE_SYMBOL_SIZE,
                'y' => $top,
                'noteKey' => $noteKey,
                'noteValue' => $noteValue,
                'noteX' => $noteX,
                'noteY' => $top + 1.9,
                'leader' => $noteKey === null
                    ? sprintf('M%s %s H%s', $noteX, $top + 1.35, self::PAYTABLE_LEADER_END_X[$half])
                    : null,
                'values' => $values,
            ];

            $index++;
        }

        return $rows;
    }

    /**
     * Diese Prüfung fängt Grobfehler beim Rendern: falsche Feldgröße,
     * unbekannter Symbolname, unmögliche Gewinnlinie. Mehr nicht.
     *
     * Der VOLLSTÄNDIGE Schutz — Quote, Symbolverteilung, Trefferhäufigkeit —
     * kommt in Phase 6 als Node-Skript und läuft nicht bei jedem
     * Seitenaufruf. Dass die Grundstellung kein Gewinn ist, prüft
     * Resources/Private/Scripts/verify-cabinet.mjs, nicht diese Methode: es
     * ist eine Aussage über den Inhalt, nicht über die Form.
     */
    private function assertGridIsValid(): void
    {
        if (count(Rules::DEFAULT_GRID) !== Rules::ROWS) {
            throw new \LogicException(
                sprintf(
                    'Die Grundstellung hat %d statt %d Zeilen (CONCEPT.md, Anhang D).',
                    count(Rules::DEFAULT_GRID),
                    Rules::ROWS
                ),
                1788500001
            );
        }

        foreach (Rules::DEFAULT_GRID as $row => $symbols) {
            if (count($symbols) !== Rules::REELS) {
                throw new \LogicException(
                    sprintf(
                        'Zeile %d der Grundstellung hat %d statt %d Symbole (CONCEPT.md, Anhang D).',
                        $row,
                        count($symbols),
                        Rules::REELS
                    ),
                    1788500001
                );
            }

            foreach ($symbols as $reelIndex => $symbol) {
                if (!in_array($symbol, Rules::SYMBOLS, true)) {
                    throw new \LogicException(
                        sprintf(
                            'Zeile %d, Walze %d: „%s" ist keines der neun Symbole.',
                            $row,
                            $reelIndex + 1,
                            $symbol
                        ),
                        1788500002
                    );
                }
            }
        }

        if (count(Rules::LINES) !== 5) {
            throw new \LogicException(
                sprintf('Es sind %d statt 5 Gewinnlinien (CONCEPT.md, Anhang D).', count(Rules::LINES)),
                1788500003
            );
        }

        foreach (Rules::LINES as $number => $rows) {
            if (count($rows) !== Rules::REELS) {
                throw new \LogicException(
                    sprintf(
                        'Gewinnlinie %d nennt %d statt %d Zeilennummern.',
                        $number,
                        count($rows),
                        Rules::REELS
                    ),
                    1788500003
                );
            }

            foreach ($rows as $reelIndex => $row) {
                if ($row < 0 || $row > Rules::ROWS - 1) {
                    throw new \LogicException(
                        sprintf(
                            'Gewinnlinie %d, Walze %d: Zeile %d liegt außerhalb von 0 bis %d.',
                            $number,
                            $reelIndex + 1,
                            $row,
                            Rules::ROWS - 1
                        ),
                        1788500003
                    );
                }
            }
        }
    }

    /**
     * Prüft die bauliche Form eines einzelnen Walzenbands: die richtige
     * Zahl an Rasterpositionen und ausschließlich bekannte Symbolnamen.
     *
     * Nachbarschaftsregel, Symbolzahlen und Quote gehören ABSICHTLICH nicht
     * hierher — sie liefen sonst bei jedem Seitenaufruf mit; sie stehen in
     * Resources/Private/Scripts/verify-payout.mjs. Dieselbe Arbeitsteilung
     * wie bei assertGridIsValid().
     *
     * @param list<string> $strip
     */
    private function assertStripIsValid(int $reelIndex, array $strip): void
    {
        if (count($strip) !== Rules::POSITIONS_PER_STRIP) {
            throw new \LogicException(
                sprintf(
                    'Walze %d hat %d statt %d Rasterpositionen (CONCEPT.md, Anhang D).',
                    $reelIndex + 1,
                    count($strip),
                    Rules::POSITIONS_PER_STRIP
                ),
                1788500011
            );
        }

        foreach ($strip as $position => $symbol) {
            if (!in_array($symbol, Rules::SYMBOLS, true)) {
                throw new \LogicException(
                    sprintf(
                        'Walze %d, Position %d: „%s" ist keines der neun Symbole.',
                        $reelIndex + 1,
                        $position,
                        $symbol
                    ),
                    1788500012
                );
            }
        }
    }

    /**
     * Bindet Rules::DEFAULT_POSITIONS und Rules::DEFAULT_GRID aneinander:
     * ohne diese Prüfung könnte die seit Phase 5 geprüfte Grundstellung
     * („kein Gewinn", „alle neun Symbole") still etwas anderes zeigen als
     * das Sichtfeld, sobald jemand eines der beiden Konstanten ändert, ohne
     * an das andere zu denken.
     *
     * @param list<string> $strip
     */
    private function assertDefaultGridIsOnStrip(int $reelIndex, array $strip): void
    {
        $position = Rules::DEFAULT_POSITIONS[$reelIndex] ?? null;

        if ($position === null || $position < 0 || $position > Rules::POSITIONS_PER_STRIP - 3) {
            throw new \LogicException(
                sprintf(
                    'DEFAULT_POSITIONS[%d] ist %s statt einer Zahl zwischen 0 und %d.',
                    $reelIndex,
                    $position === null ? 'nicht gesetzt' : (string)$position,
                    Rules::POSITIONS_PER_STRIP - 3
                ),
                1788500013
            );
        }

        for ($row = 0; $row < Rules::ROWS; $row++) {
            $onStrip = $strip[($position - 1 + $row + Rules::POSITIONS_PER_STRIP) % Rules::POSITIONS_PER_STRIP];
            $inGrid = Rules::DEFAULT_GRID[$row][$reelIndex];

            if ($onStrip !== $inGrid) {
                throw new \LogicException(
                    sprintf(
                        'Walze %d, Zeile %d: Band zeigt an DEFAULT_POSITIONS „%s", DEFAULT_GRID nennt „%s".',
                        $reelIndex + 1,
                        $row,
                        $onStrip,
                        $inGrid
                    ),
                    1788500014
                );
            }
        }
    }
}
