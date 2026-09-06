<?php

declare(strict_types=1);

namespace Phomo17\FruitRisk\DataProcessing;

use Phomo17\FruitRisk\Rules;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Druckt den Gewinnplan hinter Glas aus Rules::PAYTABLE.
 *
 * TypoScript (siehe ext_localconf.php):
 *
 *     dataProcessing {
 *         10 = fruit-risk-cabinet
 *         10.as = machine
 *     }
 *
 * Ergebnis im Template: {machine.paytable}, {machine.paytableHeads},
 * {machine.fieldLadderNote}, {machine.stake}, {machine.stakeTubes}
 * (Behebungslauf REVIEW-fruitrisk-f4.md [M6]: der feste Einsatz kommt damit
 * ebenfalls aus genau dieser einen Quelle statt an drei Stellen
 * ausgeschrieben zu stehen).
 *
 * Der Gewinnplan wird aus derselben Tabelle GEDRUCKT, aus der auch gerechnet
 * wird (CONCEPT.md C.14.4) — im Markup steht danach keine einzige Zahl der
 * Gewinntabelle mehr, auch die Spaltenköpfe 3/4/5/6 nicht. Alle Koordinaten
 * sind viewBox-Einheiten des Maßrasters aus dem Kopf von machine.css, Block
 * „Gewinnplan hinter Glas" — die Tabelle dort bleibt die einzige Quelle,
 * hier steht ihre Zweitschrift für den Rechenweg.
 *
 * Das Sichtfeld der Saal-Miniatur (Cabinet.html) wird bewusst NICHT hier
 * erzeugt: sie wird vom Site Package gerendert, wo dieser Prozessor nicht
 * läuft, und bleibt deshalb literal getippt.
 *
 * STAND F4a: Das Sichtfeld des großen Gehäuses (Grid.html) wird jetzt aus
 * genau diesem Prozessor gespeist — die Töpfe „reels" (sechs Walzenbänder,
 * je 40 Zellen) und „paylines" (dreißig Gewinnlinien als Punktfolgen), beide
 * aus Classes/Rules.php::STRIPS bzw. ::LINES abgeleitet. Grid.html tippt
 * damit kein Symbol und keine Startlage mehr ab. Beide Zeichnungen bleiben
 * über Resources/Private/Scripts/verify-payout.mjs (P-17) an
 * Rules::DEFAULT_GRID gebunden — P-17 rechnet die Grundstellung seither aus
 * Band und Startlage nach, statt sie im Markup abzulesen.
 */
final class CabinetProcessor implements DataProcessorInterface
{
    /** x-Koordinate, an der jeder der vier Blöcke beginnt. */
    private const BLOCK_X = [0 => 19.5, 1 => 50.0, 2 => 80.5, 3 => 111.0];

    /** Symbol x = Blockanfang + 0,4. */
    private const SYMBOL_DX = 0.4;

    /** Kantenlänge eines Symbols im Gewinnplan. */
    private const SYMBOL_SIZE = 2.2;

    /** x-Versatz der vier Wertespalten 3/4/5/6, je Block. */
    private const VALUE_DX = [3 => 12.5, 4 => 18.5, 5 => 24.5, 6 => 30.0];

    /** Grundlinie der Spaltenköpfe. */
    private const HEAD_Y = 132.2;

    /** Oberkante der ersten Symbolzeile. */
    private const FIRST_SYMBOL_Y = 132.8;

    /** Zeilenabstand innerhalb eines Blocks. */
    private const ROW_HEIGHT = 2.4;

    /** Grundlinie der Werte relativ zur Symbol-Oberkante: 134,6 − 132,8. */
    private const VALUE_BASELINE_DY = 1.8;

    /** Zeilen je Block, dieselbe Zahl wie die Blöcke selbst (12 / 4 = 3). */
    private const ROWS_PER_BLOCK = 3;

    /** Breite einer Walze in viewBox-Einheiten (Koordinatentabelle, Block „Fenster"). */
    private const CELL_WIDTH = 15;

    /** Höhe einer Zeile in viewBox-Einheiten. */
    private const CELL_HEIGHT = 8;

    /** Einzug des Leuchtfelds in der Zelle: 14,2 × 7,2 statt 15 × 8. */
    private const CELL_INSET = 0.4;

    /**
     * Umläufe je Band. Zwei, damit unter der untersten sichtbaren Zeile immer
     * noch Band folgt und der Rücksprung um einen ganzen Umlauf unsichtbar
     * bleibt (Zelle k und k + 20 zeigen dasselbe Symbol).
     */
    private const STRIP_LAPS = 2;

    /**
     * Erste Zelle des Anzeigefensters.
     *
     * Sichtbar sind fünf Zeilen; vollständig gefüllt ist das Fenster nur,
     * solange Position + 5 ≤ 40. Die höchste erlaubte Position ist damit 35,
     * das Fenster ist genau einen Umlauf breit und beginnt bei
     * 40 − 5 − 20 = 15. reel.js (Phase F4c) rechnet dieselbe Formel aus der
     * Zahl seiner Zellen aus, statt die 15 ein zweites Mal aufzuschreiben.
     */
    private const BAND_START = self::STRIP_LAPS * Rules::POSITIONS_PER_STRIP
        - Rules::ROWS - Rules::POSITIONS_PER_STRIP;

    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $this->assertRulesAreSane();

        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'machine');

        $processedData[$targetVariableName] = [
            'reels' => $this->buildReels(),
            'paylines' => $this->buildPaylines(),
            'paytable' => $this->buildPaytable(),
            'paytableHeads' => $this->buildPaytableHeads(),
            'fieldLadderNote' => $this->buildFieldLadderNote(),
            'stake' => Rules::STAKE,
            'stakeTubes' => $this->buildStakeTubes(),
        ];

        return $processedData;
    }

    /**
     * Die sechzehn Spaltenköpfe (vier Blöcke zu je vier Kettenlängen), in
     * derselben Reihenfolge wie die vorherigen handgetippten <text>-Elemente:
     * blockweise, je Block aufsteigend 3/4/5/6.
     *
     * @return list<array{x: float, y: float, length: int}>
     */
    private function buildPaytableHeads(): array
    {
        $heads = [];

        foreach (self::BLOCK_X as $blockX) {
            foreach (Rules::CHAIN_LENGTHS as $length) {
                $heads[] = [
                    'x' => $blockX + self::VALUE_DX[$length],
                    'y' => self::HEAD_Y,
                    'length' => $length,
                ];
            }
        }

        return $heads;
    }

    /**
     * Die zwölf Zeilen des Gewinnplans in der Rangfolge aus Rules::SYMBOLS:
     * vier Blöcke zu je drei Zeilen, je Zeile das Symbol links und die vier
     * Gewinnwerte rechtsbündig.
     *
     * @return list<array{block: int, row: int, symbol: string, symbolX: float, symbolY: float, symbolSize: float, values: list<array{x: float, y: float, value: int}>}>
     */
    private function buildPaytable(): array
    {
        $rows = [];

        foreach (Rules::SYMBOLS as $index => $symbol) {
            $block = intdiv($index, self::ROWS_PER_BLOCK);
            $row = $index % self::ROWS_PER_BLOCK;
            $blockX = self::BLOCK_X[$block];
            $symbolY = self::FIRST_SYMBOL_Y + $row * self::ROW_HEIGHT;

            $values = [];
            foreach (Rules::CHAIN_LENGTHS as $length) {
                $values[] = [
                    'x' => $blockX + self::VALUE_DX[$length],
                    'y' => $symbolY + self::VALUE_BASELINE_DY,
                    'value' => Rules::PAYTABLE[$symbol][$length],
                ];
            }

            $rows[] = [
                'block' => $block,
                'row' => $row,
                'symbol' => $symbol,
                'symbolX' => $blockX + self::SYMBOL_DX,
                'symbolY' => $symbolY,
                'symbolSize' => self::SYMBOL_SIZE,
                'values' => $values,
            ];
        }

        return $rows;
    }

    /**
     * Die sechs Bänder, je 40 Zellen (zwei Umläufe der 20 Bandpositionen).
     *
     * symbolList ist die einzige Symbolquelle für JavaScript (data-fr-strip);
     * defaultPosition ist der Zellindex der obersten sichtbaren Zeile beim
     * Seitenaufruf, umgerechnet aus Rules::DEFAULT_POSITIONS in das
     * Anzeigefenster [15, 35).
     *
     * @return list<array{index: int, symbolList: string, defaultPosition: int,
     *                    cells: list<array{index: int, symbol: string,
     *                                      fieldY: float, symbolY: float}>}>
     */
    private function buildReels(): array
    {
        $reels = [];
        $lap = Rules::POSITIONS_PER_STRIP;

        foreach (Rules::STRIPS as $reelIndex => $strip) {
            $cells = [];
            for ($cell = 0; $cell < self::STRIP_LAPS * $lap; $cell++) {
                $top = $cell * self::CELL_HEIGHT + self::CELL_INSET;
                $cells[] = [
                    'index' => $cell,
                    'symbol' => $strip[$cell % $lap],
                    'fieldY' => $top,
                    'symbolY' => $top,
                ];
            }

            $position = Rules::DEFAULT_POSITIONS[$reelIndex];

            $reels[] = [
                'index' => $reelIndex + 1,
                'symbolList' => implode(',', $strip),
                'defaultPosition' => self::BAND_START
                    + (($position - self::BAND_START) % $lap + $lap) % $lap,
                'cells' => $cells,
            ];
        }

        return $reels;
    }

    /**
     * Die dreißig Gewinnlinien als Punktfolgen über den Zellmittelpunkten.
     *
     * Der viewBox des Overlays ist 90 × 40 und damit deckungsgleich mit dem
     * Sichtfeld; ein Punkt liegt bei (Walze + ½) × 15 und (Zeile + ½) × 8.
     *
     * Rules::LINES ist EIN Array mit der Linien-Nummer als Schlüssel und der
     * Liste der sechs Zeilennummern als Wert (kein „index"/"rows"-Paar) —
     * an der Quelle nachgesehen statt aus einem Plan übernommen.
     *
     * @return list<array{index: int, points: string}>
     */
    private function buildPaylines(): array
    {
        $lines = [];

        foreach (Rules::LINES as $lineIndex => $rows) {
            $points = [];
            foreach ($rows as $reelIndex => $row) {
                $points[] = sprintf(
                    '%s,%s',
                    (string)($reelIndex * self::CELL_WIDTH + self::CELL_WIDTH / 2),
                    (string)($row * self::CELL_HEIGHT + self::CELL_HEIGHT / 2)
                );
            }
            $lines[] = ['index' => $lineIndex, 'points' => implode(' ', $points)];
        }

        return $lines;
    }

    /**
     * Die beiden Ziffern des festen Einsatzes für die EINSATZ-Röhren, Zehner
     * zuerst (Behebungslauf REVIEW-fruitrisk-f4.md [M6]).
     *
     * Cabinet.html tippte diese zwei Ziffern bislang selbst als Fluid-Array
     * ({0: 1, 1: 0}) — eine dritte, ungebundene Kopie von Rules::STAKE neben
     * der Sprachdatei (machine.stake.note, jetzt ebenfalls aus {machine.stake}
     * gespeist) und dem Schnellwert-Knopf +10 im Münzschlitz. Die
     * Röhrengruppe EINSATZ hat genau zwei Röhren (Cabinet.html); reicht
     * Rules::STAKE dafür nicht (siehe assertStakeFitsTwoDigits()), meldet das
     * eine Ausnahme statt zwei stillschweigend falsche Ziffern zu drucken.
     *
     * @return array{0: int, 1: int}
     */
    private function buildStakeTubes(): array
    {
        return [
            intdiv(Rules::STAKE, 10) % 10,
            Rules::STAKE % 10,
        ];
    }

    /**
     * Der gedruckte Hinweis auf den zweiten Gewinnweg — die Feldtreppe, in
     * Worten. Bis F3 stand dieser Satz VOLLSTÄNDIG als Fließtext in
     * `locallang.xlf`, Zahlen eingeschlossen — eine dritte, ungebundene
     * Kopie von Rules::FIELD_LADDER (REVIEW-fruitrisk-f3.md [H1]). Seitdem
     * liefert diese Methode nur noch die ZAHLEN, live aus Rules.php gelesen;
     * `locallang.xlf` (machine.paytable.note) trägt nur noch den Vorspann
     * ohne Ziffern. Die deutschen Zählwörter (zwei/drei/vier/fünf/ab sechs)
     * sind eine feste Sprachtatsache zur Struktur der Feldtreppe (fünf
     * Stufen, Deckel ab sechs — Rules::FIELD_LADDER hat immer genau diese
     * vier Schlüssel plus den Deckel, siehe Bandregel-unabhängige
     * Kommentare dort) und deshalb hier als Wörter belassen; nur die
     * WERTE (1, 2, 3, 4, 5) sind die Spielgröße, die sich ändern kann, und
     * genau die kommen aus Rules::FIELD_LADDER (der Deckelwert steht dort
     * bereits unter dem Schlüssel Rules::FIELD_CAP_AT, eine eigene
     * FIELD_CAP_VALUE-Konstante gibt es nicht und wird hier nicht gebraucht).
     */
    private function buildFieldLadderNote(): string
    {
        return sprintf(
            'zwei Stück %d, drei %d, vier %d, fünf %d, ab sechs %d',
            Rules::FIELD_LADDER[2],
            Rules::FIELD_LADDER[3],
            Rules::FIELD_LADDER[4],
            Rules::FIELD_LADDER[5],
            Rules::FIELD_LADDER[Rules::FIELD_CAP_AT]
        );
    }

    /**
     * Billige, grobe Prüfungen, die bei JEDEM Seitenaufruf laufen. Alles
     * Teure (Quote, Verteilung, vollständige Auszählung) gehört
     * ausschließlich in Resources/Private/Scripts/verify-payout.mjs; die
     * Bandregeln 2, 3, 4 und 6 sind Aussagen über den Inhalt, nicht über die
     * Form, und stehen deshalb dort, nicht hier — dieselbe Arbeitsteilung wie
     * beim Fünf-Walzen-Gerät (video_slot/Classes/DataProcessing/CabinetProcessor.php).
     */
    private function assertRulesAreSane(): void
    {
        $this->assertSymbolsPartitionCleanly();
        $this->assertPaytableIsSane();
        $this->assertLinesAreSane();
        $this->assertStripsArePresent();
        $this->assertDefaultGridMatchesStrips();
        $this->assertStakeFitsTwoDigits();
    }

    /**
     * Rules::STAKE muss in die zwei Röhren der Gruppe EINSATZ passen (0 bis
     * 99) — buildStakeTubes() zieht sonst stillschweigend falsche Ziffern.
     */
    private function assertStakeFitsTwoDigits(): void
    {
        if (Rules::STAKE < 0 || Rules::STAKE > 99) {
            throw new \LogicException(
                sprintf('Rules::STAKE ist %d und passt nicht in die zwei Röhren der Gruppe EINSATZ.', Rules::STAKE),
                1788600051
            );
        }
    }

    /**
     * SYMBOLS enthält genau zwölf Namen und geht restlos in SMALL_FRUITS +
     * LINE_SYMBOLS auf.
     */
    private function assertSymbolsPartitionCleanly(): void
    {
        if (count(Rules::SYMBOLS) !== 12) {
            throw new \LogicException(
                sprintf('Rules::SYMBOLS hat %d statt 12 Einträge.', count(Rules::SYMBOLS)),
                1788600001
            );
        }

        $vereinigung = array_merge(Rules::SMALL_FRUITS, Rules::LINE_SYMBOLS);
        sort($vereinigung);
        $symbole = Rules::SYMBOLS;
        sort($symbole);

        if ($vereinigung !== $symbole) {
            throw new \LogicException(
                'Rules::SYMBOLS geht nicht restlos in SMALL_FRUITS + LINE_SYMBOLS auf.',
                1788600002
            );
        }
    }

    /**
     * PAYTABLE hat genau die zwölf Schlüssel aus SYMBOLS, je vier Längen,
     * alle Werte ganzzahlig und größer als 3 (Entwurfsregel 1); der
     * Höchstwert ist genau MAX_LINE_VALUE und steht beim ersten Symbol bei
     * Länge 6.
     */
    private function assertPaytableIsSane(): void
    {
        foreach (Rules::SYMBOLS as $symbol) {
            if (!array_key_exists($symbol, Rules::PAYTABLE)) {
                throw new \LogicException(
                    sprintf('Rules::PAYTABLE fehlt der Schlüssel „%s".', $symbol),
                    1788600011
                );
            }

            foreach (Rules::CHAIN_LENGTHS as $length) {
                if (!array_key_exists($length, Rules::PAYTABLE[$symbol])) {
                    throw new \LogicException(
                        sprintf('Rules::PAYTABLE["%s"] fehlt die Länge %d.', $symbol, $length),
                        1788600012
                    );
                }

                $value = Rules::PAYTABLE[$symbol][$length];
                if (!is_int($value) || $value <= 3) {
                    throw new \LogicException(
                        sprintf(
                            'Rules::PAYTABLE["%s"][%d] ist %s, nicht eine ganze Zahl größer als 3.',
                            $symbol,
                            $length,
                            var_export($value, true)
                        ),
                        1788600013
                    );
                }
            }
        }

        $ersterSymbol = Rules::SYMBOLS[0];
        if (Rules::PAYTABLE[$ersterSymbol][6] !== Rules::MAX_LINE_VALUE) {
            throw new \LogicException(
                sprintf(
                    'Der Höchstwert steht nicht bei "%s" x 6: dort steht %d statt %d.',
                    $ersterSymbol,
                    Rules::PAYTABLE[$ersterSymbol][6],
                    Rules::MAX_LINE_VALUE
                ),
                1788600014
            );
        }
    }

    /** LINES hat 30 Einträge zu je REELS Zeilennummern in 0…ROWS-1. */
    private function assertLinesAreSane(): void
    {
        if (count(Rules::LINES) !== 30) {
            throw new \LogicException(
                sprintf('Rules::LINES hat %d statt 30 Einträge.', count(Rules::LINES)),
                1788600021
            );
        }

        foreach (Rules::LINES as $number => $rows) {
            if (count($rows) !== Rules::REELS) {
                throw new \LogicException(
                    sprintf('Gewinnlinie %d nennt %d statt %d Zeilennummern.', $number, count($rows), Rules::REELS),
                    1788600022
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
                        1788600023
                    );
                }
            }
        }
    }

    /**
     * STRIPS hat REELS Bänder zu je POSITIONS_PER_STRIP bekannten
     * Symbolnamen — und ist NICHT LEER. Das fängt den Zustand „Startbelegung
     * noch nicht ersetzt" ab, bevor irgendetwas gerendert wird.
     */
    private function assertStripsArePresent(): void
    {
        if (count(Rules::STRIPS) !== Rules::REELS) {
            throw new \LogicException(
                sprintf(
                    'Rules::STRIPS hat %d statt %d Bänder — Messlauf F3-M1 wurde noch nicht eingesetzt.',
                    count(Rules::STRIPS),
                    Rules::REELS
                ),
                1788600031
            );
        }

        foreach (Rules::STRIPS as $reelIndex => $strip) {
            if (count($strip) !== Rules::POSITIONS_PER_STRIP) {
                throw new \LogicException(
                    sprintf(
                        'Walze %d hat %d statt %d Rasterpositionen.',
                        $reelIndex + 1,
                        count($strip),
                        Rules::POSITIONS_PER_STRIP
                    ),
                    1788600032
                );
            }

            foreach ($strip as $position => $symbol) {
                if (!in_array($symbol, Rules::SYMBOLS, true)) {
                    throw new \LogicException(
                        sprintf(
                            'Walze %d, Position %d: „%s" ist keines der zwölf Symbole.',
                            $reelIndex + 1,
                            $position,
                            $symbol
                        ),
                        1788600033
                    );
                }
            }
        }
    }

    /**
     * DEFAULT_GRID hat ROWS Zeilen zu je REELS bekannten Symbolen und stimmt
     * mit den Positionen 0…4 der sechs Bänder überein (Bandregel 5).
     */
    private function assertDefaultGridMatchesStrips(): void
    {
        if (count(Rules::DEFAULT_GRID) !== Rules::ROWS) {
            throw new \LogicException(
                sprintf('Rules::DEFAULT_GRID hat %d statt %d Zeilen.', count(Rules::DEFAULT_GRID), Rules::ROWS),
                1788600041
            );
        }

        foreach (Rules::DEFAULT_GRID as $row => $symbols) {
            if (count($symbols) !== Rules::REELS) {
                throw new \LogicException(
                    sprintf('Zeile %d der Grundstellung hat %d statt %d Symbole.', $row, count($symbols), Rules::REELS),
                    1788600042
                );
            }

            foreach ($symbols as $reelIndex => $symbol) {
                if (!in_array($symbol, Rules::SYMBOLS, true)) {
                    throw new \LogicException(
                        sprintf('Zeile %d, Walze %d: „%s" ist keines der zwölf Symbole.', $row, $reelIndex + 1, $symbol),
                        1788600043
                    );
                }

                $aufStreifen = Rules::STRIPS[$reelIndex][$row] ?? null;
                if ($aufStreifen !== $symbol) {
                    throw new \LogicException(
                        sprintf(
                            'Zeile %d, Walze %d: DEFAULT_GRID nennt „%s", STRIPS[%d][%d] ist „%s".',
                            $row,
                            $reelIndex + 1,
                            $symbol,
                            $reelIndex,
                            $row,
                            (string)$aufStreifen
                        ),
                        1788600044
                    );
                }
            }
        }
    }
}
