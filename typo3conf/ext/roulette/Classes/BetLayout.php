<?php

declare(strict_types=1);

namespace Phomo17\Roulette;

/**
 * Die Feldliste des Tuchs als PHP-Spiegel von
 * Resources/Public/JavaScript/bets-roulette.js.
 *
 * WARUM DOPPELT
 * =============
 * Das Tuch wird serverseitig gezeichnet, damit es ohne JavaScript im Markup
 * steht (und damit der Kern die Zeichnung zwischenspeichert, statt sie bei
 * jedem Aufruf neu zu bauen). Fluid kann keine JavaScript-Datei lesen, also
 * steht Anhang F hier ein zweites Mal — genau dieselbe Bauart und Begründung
 * wie beim schon bestehenden Paar wheel-geometry.js / WheelGeometry.php.
 *
 * WARUM DAS KEINE ZWEITE WAHRHEIT IST
 * ====================================
 * Resources/Private/Scripts/verify-felt.mjs liest BEIDE Dateien und
 * vergleicht sie Feld für Feld: Kennung, covers, payout, max, Lage. Weicht
 * eine Stelle ab, schlägt der Nachweis fehl (Prüfung F-1). Die Buchführung
 * im Browser rechnet ausschließlich mit der JavaScript-Fassung
 * (bets-roulette.js); diese hier zeichnet nur.
 *
 * DIE ANORDNUNG DES TUCHS, AUS DER ALLES FOLGT
 * ----------------------------------------------
 * Zwölf Tuchspalten i = 1…12, drei Zeilen r = 1…3. Tuchspalte i trägt die
 * Zahlen 3i−2 (Zeile 1), 3i−1 (Zeile 2), 3i (Zeile 3). Zeile 1 ist damit
 * Kolonne 1 (1, 4, …, 34), Zeile 3 Kolonne 3 (3, 6, …, 36). Links davon die
 * Nullspalte: '0' liegt an Zeile 1 an, '00' an Zeile 3 — beide reichen mit
 * ihrer eigenen, doppelt so hohen Fläche bis an die mittlere Zeile 2 heran,
 * ohne sie zu erreichen. Dieselbe Skizze wie im Dateikopf von
 * bets-roulette.js; sie wird hier nicht ein zweites Mal gezeichnet.
 *
 * Die sieben Schleifen unten sind Zeile für Zeile dieselbe Rechnung wie in
 * bets-roulette.js::buildFields() — nicht dieselbe Formulierung (PHP ist
 * kein JavaScript), aber dieselbe Arithmetik, in derselben Reihenfolge.
 *
 * WARUM RED/BLACK NICHT EIN DRITTES MAL GESCHRIEBEN WERDEN
 * -----------------------------------------------------------
 * bets-roulette.js schreibt die roten und schwarzen Zahlen ein zweites Mal
 * (statt sie zu importieren), weil die Datei importfrei bleiben MUSS, damit
 * Node sie ohne Bild laden kann (CONCEPT.md C.5.3). Für PHP gilt diese
 * Pflicht nicht: WheelGeometry::RED und ::BLACK sind bereits der geprüfte
 * PHP-Spiegel genau dieser beiden Listen (verify-wheel.mjs). Ein drittes
 * Abschreiben wäre nur eine weitere Stelle, an der eine Zahl kippen könnte,
 * ohne dass es diesem Spiegel etwas nützte.
 *
 * Namensschild ohne Instanzen: privater Konstruktor, in Services.yaml
 * ausgeschlossen — wie Roulette.php und WheelGeometry.php.
 */
final class BetLayout
{
    /** Gesamteinsatz je Runde über alle Felder (Anhang F). */
    public const ROUND_MAX = 100;

    /** Auszahlungsverhältnis je Anzahl abgedeckter Zahlen (Anhang F). */
    public const PAYOUT_BY_COVERED = [1 => 35, 2 => 17, 3 => 11, 4 => 8, 5 => 6, 6 => 5, 12 => 2, 18 => 1];

    /** Die zwölf Tuchspalten. */
    public const COLUMNS = 12;

    private function __construct()
    {
    }

    /** Höchsteinsatz eines Feldes: min(10 € × abgedeckte Zahlen, 100 €). */
    public static function fieldMax(int $coveredCount): int
    {
        return min(10 * $coveredCount, self::ROUND_MAX);
    }

    /** Die Zahl in Tuchspalte $column, Zeile $row (Anhang F: 3(i-1)+r). */
    private static function numberAt(int $column, int $row): string
    {
        return (string)(3 * ($column - 1) + $row);
    }

    /**
     * Die vollständige Feldliste, in derselben Reihenfolge wie
     * bets-roulette.js sie aufbaut.
     *
     * @return list<array{id: string, kind: string, covers: list<string>,
     *                    payout: int, max: int, labelKey: ?string,
     *                    labelArgs: list<string>, printed: string,
     *                    col: int, colEnd: ?int, row: int, rowEnd: ?int}>
     */
    public static function fields(): array
    {
        $fields = [];

        /** @param list<string> $covers */
        $push = static function (string $id, string $kind, array $covers, array $opts = []) use (&$fields): void {
            $payout = self::PAYOUT_BY_COVERED[count($covers)] ?? null;
            if ($payout === null) {
                throw new \RangeException(sprintf(
                    'Feld "%s": %d abgedeckte Zahlen sind in Anhang F nicht vorgesehen.',
                    $id,
                    count($covers)
                ), 1788700001);
            }
            $fields[] = [
                'id' => $id,
                'kind' => $kind,
                'covers' => array_values($covers),
                'payout' => $payout,
                'max' => self::fieldMax(count($covers)),
                'labelKey' => $opts['labelKey'] ?? null,
                'labelArgs' => $opts['labelArgs'] ?? [],
                'printed' => $opts['printed'] ?? '',
                'col' => $opts['col'],
                'colEnd' => $opts['colEnd'] ?? null,
                'row' => $opts['row'],
                'rowEnd' => $opts['rowEnd'] ?? null,
            ];
        };

        // 1  Die beiden grünen Fächer und die 36 Zahlen  → 38 Felder
        $push('n-0', 'number', ['0'], ['printed' => '0', 'col' => 1, 'row' => 2, 'rowEnd' => 4]);
        $push('n-00', 'number', ['00'], ['printed' => '00', 'col' => 1, 'row' => 5, 'rowEnd' => 7]);
        for ($i = 1; $i <= 12; $i++) {
            for ($r = 1; $r <= 3; $r++) {
                $zahl = self::numberAt($i, $r);
                $push("n-{$zahl}", 'number', [$zahl], ['printed' => $zahl, 'col' => 2 * $i + 1, 'row' => 2 * $r]);
            }
        }

        // 2  Splits: 24 senkrecht, 33 waagerecht, 3 an der Null → 60 Felder
        for ($i = 1; $i <= 12; $i++) {
            for ($r = 1; $r <= 2; $r++) {
                $a = self::numberAt($i, $r);
                $b = self::numberAt($i, $r + 1);
                $push("s-{$a}-{$b}", 'split', [$a, $b], [
                    'labelKey' => 'felt.name.split',
                    'labelArgs' => ["{$a} und {$b}"],
                    'col' => 2 * $i + 1,
                    'row' => 2 * $r + 1,
                ]);
            }
        }
        for ($i = 1; $i <= 11; $i++) {
            for ($r = 1; $r <= 3; $r++) {
                $a = self::numberAt($i, $r);
                $b = self::numberAt($i + 1, $r);
                $push("s-{$a}-{$b}", 'split', [$a, $b], [
                    'labelKey' => 'felt.name.split',
                    'labelArgs' => ["{$a} und {$b}"],
                    'col' => 2 * $i + 2,
                    'row' => 2 * $r,
                ]);
            }
        }
        $push('s-0-00', 'split', ['0', '00'], ['labelKey' => 'felt.name.split', 'labelArgs' => ['0 und 00'], 'col' => 1, 'row' => 4]);
        $push('s-0-1', 'split', ['0', '1'], ['labelKey' => 'felt.name.split', 'labelArgs' => ['0 und 1'], 'col' => 2, 'row' => 2]);
        $push('s-00-3', 'split', ['00', '3'], ['labelKey' => 'felt.name.split', 'labelArgs' => ['00 und 3'], 'col' => 2, 'row' => 6]);

        // 3  Dreierreihen 12 + Trios 3 → 15 Felder
        for ($i = 1; $i <= 12; $i++) {
            $covers = [self::numberAt($i, 1), self::numberAt($i, 2), self::numberAt($i, 3)];
            $push("st-{$covers[0]}", 'street', $covers, [
                'labelKey' => 'felt.name.street',
                'labelArgs' => [implode(', ', $covers)],
                'col' => 2 * $i + 1,
                'row' => 1,
            ]);
        }
        $push('t-0-1-2', 'trio', ['0', '1', '2'], ['labelKey' => 'felt.name.trio', 'labelArgs' => ['0, 1 und 2'], 'col' => 2, 'row' => 3]);
        $push('t-0-00-2', 'trio', ['0', '00', '2'], ['labelKey' => 'felt.name.trio', 'labelArgs' => ['0, 00 und 2'], 'col' => 2, 'row' => 4]);
        $push('t-00-2-3', 'trio', ['00', '2', '3'], ['labelKey' => 'felt.name.trio', 'labelArgs' => ['00, 2 und 3'], 'col' => 2, 'row' => 5]);

        // 4  Viererblöcke → 22 Felder
        for ($i = 1; $i <= 11; $i++) {
            for ($r = 1; $r <= 2; $r++) {
                $covers = [
                    self::numberAt($i, $r), self::numberAt($i, $r + 1),
                    self::numberAt($i + 1, $r), self::numberAt($i + 1, $r + 1),
                ];
                $push('c-' . self::numberAt($i, $r), 'corner', $covers, [
                    'labelKey' => 'felt.name.corner',
                    'labelArgs' => [implode(', ', $covers)],
                    'col' => 2 * $i + 2,
                    'row' => 2 * $r + 1,
                ]);
            }
        }

        // 5  Fünferwette → 1 Feld
        $push('five', 'five', ['0', '00', '1', '2', '3'], [
            'labelKey' => 'felt.name.five',
            'labelArgs' => ['0, 00, 1, 2 und 3'],
            'col' => 2,
            'row' => 1,
        ]);

        // 6  Sechserreihen → 11 Felder
        for ($i = 1; $i <= 11; $i++) {
            $covers = [
                self::numberAt($i, 1), self::numberAt($i, 2), self::numberAt($i, 3),
                self::numberAt($i + 1, 1), self::numberAt($i + 1, 2), self::numberAt($i + 1, 3),
            ];
            $push("sl-{$covers[0]}", 'sixline', $covers, [
                'labelKey' => 'felt.name.sixline',
                'labelArgs' => [implode(', ', $covers)],
                'col' => 2 * $i + 2,
                'row' => 1,
            ]);
        }

        // 7  Kolonnen 3, Dutzende 3, einfache Chancen 6 → 12 Felder
        for ($r = 1; $r <= 3; $r++) {
            $covers = [];
            for ($column = 1; $column <= self::COLUMNS; $column++) {
                $covers[] = self::numberAt($column, $r);
            }
            $push("col-{$r}", 'column', $covers, [
                'printed' => 'felt.print.column',
                'labelKey' => 'felt.name.column',
                'labelArgs' => [(string)$r, implode(', ', $covers)],
                'col' => 27,
                'row' => 2 * $r,
            ]);
        }
        for ($d = 1; $d <= 3; $d++) {
            $covers = [];
            for ($n = 12 * ($d - 1) + 1; $n <= 12 * $d; $n++) {
                $covers[] = (string)$n;
            }
            $push("dz-{$d}", 'dozen', $covers, [
                'printed' => "felt.print.dozen.{$d}",
                'col' => 8 * $d - 5,
                'colEnd' => 8 * $d + 2,
                'row' => 8,
            ]);
        }
        $einfacheChancen = [
            ['id' => 'low', 'printed' => 'felt.print.low', 'covers' => array_map(static fn (int $k): string => (string)($k + 1), range(0, 17))],
            ['id' => 'even', 'printed' => 'felt.print.even', 'covers' => array_map(static fn (int $k): string => (string)(2 * ($k + 1)), range(0, 17))],
            ['id' => 'red', 'printed' => 'felt.print.red', 'covers' => WheelGeometry::RED],
            ['id' => 'black', 'printed' => 'felt.print.black', 'covers' => WheelGeometry::BLACK],
            ['id' => 'odd', 'printed' => 'felt.print.odd', 'covers' => array_map(static fn (int $k): string => (string)(2 * $k + 1), range(0, 17))],
            ['id' => 'high', 'printed' => 'felt.print.high', 'covers' => array_map(static fn (int $k): string => (string)($k + 19), range(0, 17))],
        ];
        foreach ($einfacheChancen as $index => $chance) {
            $j = $index + 1;
            $push($chance['id'], 'even', $chance['covers'], [
                'printed' => $chance['printed'],
                'col' => 4 * $j - 1,
                'colEnd' => 4 * $j + 2,
                'row' => 9,
            ]);
        }

        return $fields;
    }
}
