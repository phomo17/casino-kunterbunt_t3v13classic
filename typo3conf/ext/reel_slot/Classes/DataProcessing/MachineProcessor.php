<?php

declare(strict_types=1);

namespace Phomo17\ReelSlot\DataProcessing;

use Phomo17\ReelSlot\Rules;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\ContentObject\DataProcessorInterface;

/**
 * Baut die drei Walzenbänder des Gehäuses.
 *
 * TypoScript (siehe ext_localconf.php):
 *
 *     dataProcessing {
 *         10 = reel-slot-machine
 *         10.as = machine
 *     }
 *
 * Ergebnis im Template: {machine.reels} — eine Liste von drei Walzen.
 *
 * Warum überhaupt PHP: ein Band besteht aus 40 Zellen (die 20 Positionen aus
 * Anhang C zweimal hintereinander, damit der Rundumschluss ohne sichtbaren
 * Sprung funktioniert). Drei Bänder ergeben 120 Zellen und 117 Trennlinien.
 * Von Hand geschrieben wäre das nicht pflegbar und der Zahlendreher nur eine
 * Frage der Zeit — und Anhang C trägt die Auszahlungsquote.
 *
 * Alles andere am Gehäuse bleibt bewusst außerhalb dieser Klasse: feste
 * Zeichnung gehört ins SVG, feste Beschriftung in die Sprachdatei.
 */
final class MachineProcessor implements DataProcessorInterface
{
    /** Höhe einer Rasterposition in viewBox-Einheiten (= 1cqi). */
    private const CELL_HEIGHT = 14;

    /** Breite eines Bandes in viewBox-Einheiten. */
    private const STRIP_WIDTH = 18;

    /**
     * Zellen je gerendertem Band: zwei volle Umläufe.
     *
     * Damit gilt für jeden Zellindex p aus [20, 40): p-1 und p+1 liegen
     * ebenfalls im Band, das Sichtfenster ist also immer vollständig gefüllt.
     * Weil Zelle p und Zelle p-20 dasselbe Symbol zeigen, ist der Sprung
     * beim Rundumschluss (p = 20 + Position mod 20) unsichtbar.
     */
    private const CELLS_PER_STRIP = Rules::POSITIONS_PER_STRIP * 2;

    /**
     * Zellindex, der beim Seitenaufruf auf der Gewinnlinie steht — je Walze.
     *
     * 21 / 25 / 32 entspricht Anhang-A-Position 2 / 6 / 13, also
     * BAR · Glocke · Sieben. Dieselbe Kombination zeigt die Saal-Miniatur,
     * damit man das Gerät im Saal und auf seiner Seite als dasselbe erkennt.
     * Ein Gewinn ist es nicht — das Gerät steht im Grundzustand.
     *
     * @var list<int>
     */
    private const DEFAULT_POSITIONS = [21, 25, 32];

    public function process(
        ContentObjectRenderer $cObj,
        array $contentObjectConfiguration,
        array $processorConfiguration,
        array $processedData
    ): array {
        $targetVariableName = (string)$cObj->stdWrapValue('as', $processorConfiguration, 'machine');

        $processedData[$targetVariableName] = [
            'reels' => $this->buildReels(),
        ];

        return $processedData;
    }

    /**
     * @return list<array{index: int, symbolList: string, defaultPosition: int,
     *                    cells: list<array{symbol: string, y: int}>, rules: string}>
     */
    private function buildReels(): array
    {
        $reels = [];

        foreach (Rules::STRIPS as $reelIndex => $strip) {
            $this->assertStripIsValid($reelIndex, $strip);

            $cells = [];
            for ($cell = 0; $cell < self::CELLS_PER_STRIP; $cell++) {
                $cells[] = [
                    'symbol' => $strip[$cell % Rules::POSITIONS_PER_STRIP],
                    'y' => $cell * self::CELL_HEIGHT,
                ];
            }

            // Die dünnen waagerechten Trennlinien zwischen den Positionen
            // (DESIGNBRIEF.md Abschnitt 3) als ein einziger Pfad statt als
            // 39 Einzelelemente.
            $rules = '';
            for ($line = 1; $line < self::CELLS_PER_STRIP; $line++) {
                $rules .= sprintf('M0 %d H%d ', $line * self::CELL_HEIGHT, self::STRIP_WIDTH);
            }

            $reels[] = [
                'index' => $reelIndex + 1,
                'symbolList' => implode(',', $strip),
                'defaultPosition' => self::DEFAULT_POSITIONS[$reelIndex],
                'cells' => $cells,
                'rules' => rtrim($rules),
            ];
        }

        return $reels;
    }

    /**
     * Diese Prüfung fängt Grobfehler beim Rendern: falsche Positionszahl,
     * unbekannter Symbolname. Der VOLLSTÄNDIGE Schutz — Symbolzahlen je Walze,
     * Nachbarschaftsregel, Auszahlungsquote — steht in
     * Resources/Private/Scripts/verify-payout.mjs und läuft unter Node, nicht
     * bei jedem Seitenaufruf. Ein Vertauschen zweier Symbole kommt hier
     * bewusst durch; es zu fangen ist Aufgabe des Beweisskripts.
     *
     * @param list<string> $strip
     */
    private function assertStripIsValid(int $reelIndex, array $strip): void
    {
        if (count($strip) !== Rules::POSITIONS_PER_STRIP) {
            throw new \LogicException(
                sprintf(
                    'Walze %d hat %d statt %d Rasterpositionen (CONCEPT.md, Anhang C).',
                    $reelIndex + 1,
                    count($strip),
                    Rules::POSITIONS_PER_STRIP
                ),
                1756713001
            );
        }

        foreach ($strip as $position => $symbol) {
            if (!in_array($symbol, Rules::SYMBOLS, true)) {
                throw new \LogicException(
                    sprintf(
                        'Walze %d, Position %d: „%s" ist keines der sieben Symbole.',
                        $reelIndex + 1,
                        $position + 1,
                        $symbol
                    ),
                    1756713002
                );
            }
        }
    }
}
