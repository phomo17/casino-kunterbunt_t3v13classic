<?php

declare(strict_types=1);

namespace Phomo17\Craps;

/**
 * Die Feldliste des Craps-Tuchs als PHP-Spiegel von
 * Resources/Public/JavaScript/bets-craps.js — und als alleinige Quelle der
 * LAGE jedes Feldes im Gitter.
 *
 * WARUM DOPPELT
 * =============
 * Das Tuch wird serverseitig gezeichnet, damit es ohne JavaScript im Markup
 * steht und der Kern die Zeichnung zwischenspeichert. Fluid kann keine
 * JavaScript-Datei lesen, also steht Anhang H hier ein zweites Mal — dieselbe
 * Bauart wie beim anderen Tisch (roulette/Classes/BetLayout.php).
 *
 * WARUM DAS KEINE ZWEITE WAHRHEIT IST
 * ====================================
 * Resources/Private/Scripts/verify-felt.mjs liest BEIDE Dateien und
 * vergleicht sie Feld für Feld (Prüfung F-1): Kennung, Auszahlung,
 * Höchsteinsatz und die Frage, ob das Feld in den Rundenhöchstbetrag zählt.
 * Gerechnet wird im Browser ausschließlich mit bets-craps.js; diese Datei
 * zeichnet nur.
 *
 * WAS HIER MEHR STEHT ALS IN bets-craps.js
 * =========================================
 * Die LAGE im Gitter (col/colEnd, row/rowEnd). Beim Roulette war die Lage die
 * Quelle der Wetten — ein Split IST die Linie zwischen zwei Zahlen. Beim
 * Craps ist es umgekehrt: Anhang H nennt die Wetten, die Anordnung ist eine
 * Gestaltungsentscheidung dieses Hauses. Sie gehört deshalb dorthin, wo
 * gezeichnet wird, und nicht in die Regeldatei.
 *
 * DAS GITTER
 * ==========
 * 12 Spaltenspuren, 11 Zeilenspuren. Zeile 1 ist die Puck-Spur (kein Feld).
 * Die sechs Point-Zahlen stehen als 4, 5, 6, 8, 9, 10 nebeneinander; Zahl
 * Nummer j (0..5) belegt die Spalten 2j+1 bis 2j+3. Die vollständige
 * Zeilentabelle steht in README.md, Abschnitt „Das Tuch und seine
 * Maßordnung".
 *
 * Namensschild ohne Instanzen: privater Konstruktor, in Services.yaml
 * ausgeschlossen — wie Craps.php.
 */
final class BetLayout
{
    /** Gesamteinsatz je Wurf über alle Felder AUSSER den Odds (Anhang H). */
    public const ROUND_MAX = 300;

    /** Höchsteinsatz einer Linienwette. Grundlage aller Odds-Obergrenzen. */
    public const LINE_MAX = 100;

    /** Spalten- und Zeilenspuren des Gitters. */
    public const COLUMNS = 12;
    public const ROWS = 11;

    /** Die sechs Point-Zahlen in der Reihenfolge des Tuchs. */
    public const POINTS = [4, 5, 6, 8, 9, 10];

    /** Die Staffel 3-4-5× (Anhang H). */
    public const ODDS_MULT = [4 => 3, 5 => 4, 6 => 5, 8 => 5, 9 => 4, 10 => 3];

    /** Auszahlungen als exakte Brüche [Zähler, Nenner] — Abschrift von Anhang H. */
    public const RATIO_LINE = [1, 1];
    public const RATIO_PLACE = [4 => [9, 5], 5 => [7, 5], 6 => [7, 6], 8 => [7, 6], 9 => [7, 5], 10 => [9, 5]];
    public const RATIO_ODDS_LIGHT = [4 => [2, 1], 5 => [3, 2], 6 => [6, 5], 8 => [6, 5], 9 => [3, 2], 10 => [2, 1]];
    public const RATIO_ODDS_DARK = [4 => [1, 2], 5 => [2, 3], 6 => [5, 6], 8 => [5, 6], 9 => [2, 3], 10 => [1, 2]];
    public const RATIO_HARD = [4 => [7, 1], 6 => [9, 1], 8 => [9, 1], 10 => [7, 1]];

    private function __construct()
    {
    }

    /** Höchsteinsatz einer Place-Wette: 96 € bei 6 und 8 (Vielfache von 6), sonst 100 €. */
    public static function placeMax(int $number): int
    {
        return ($number === 6 || $number === 8) ? 96 : self::LINE_MAX;
    }

    /**
     * Höchsteinsatz einer Odds-Wette nach der Staffel 3-4-5×.
     * Dunkel so, dass der mögliche GEWINN ebenfalls das Sechsfache der
     * Linienwette beträgt — dieselbe Rechnung wie oddsMax() in bets-craps.js.
     */
    public static function oddsMax(int $point, int $lineStake, bool $dark): int
    {
        if (!in_array($point, self::POINTS, true) || $lineStake < 1) {
            return 0;
        }
        if (!$dark) {
            return self::ODDS_MULT[$point] * $lineStake;
        }
        [$num, $den] = self::RATIO_ODDS_DARK[$point];

        return intdiv(6 * $lineStake * $den, $num);
    }

    /** „9 zu 5" — die lesbare Form eines Bruchs, für Aufschrift und Name. */
    public static function ratioText(array $ratio): string
    {
        return $ratio[0] . ' zu ' . $ratio[1];
    }

    /**
     * Die vollständige Feldliste, gruppenweise in Lesereihenfolge.
     *
     * @return list<array{id: string, kind: string, group: string, printed: string,
     *                    labelKey: string, labelArgs: list<string>,
     *                    payoutText: string, max: int, unit: int, odds: bool,
     *                    col: int, colEnd: int, row: int, rowEnd: int}>
     */
    public static function fields(): array
    {
        $fields = [];

        /** @param list<string> $labelArgs */
        $push = static function (
            string $id,
            string $kind,
            string $group,
            string $printed,
            string $labelKey,
            array $labelArgs,
            string $payoutText,
            int $max,
            int $unit,
            bool $odds,
            int $col,
            int $colEnd,
            int $row,
            int $rowEnd
        ) use (&$fields): void {
            $fields[] = compact(
                'id', 'kind', 'group', 'printed', 'labelKey', 'labelArgs',
                'payoutText', 'max', 'unit', 'odds', 'col', 'colEnd', 'row', 'rowEnd'
            );
        };

        // 1  Die dreißig Zahlenfelder — je Zahl gebündelt (Lesereihenfolge!)
        foreach (self::POINTS as $j => $n) {
            $links = 2 * $j + 1;
            $rechts = 2 * $j + 3;
            $mitte = 2 * $j + 2;
            $hell = self::RATIO_ODDS_LIGHT[$n];
            $dunkel = self::RATIO_ODDS_DARK[$n];
            $platz = self::RATIO_PLACE[$n];

            $push(
                "dont-come-{$n}", 'dontpoint', 'numbers', "felt.print.dontcome.{$n}",
                'felt.name.dontcomepoint', [(string)$n, self::ratioText(self::RATIO_LINE)],
                self::ratioText(self::RATIO_LINE), self::LINE_MAX, 1, false,
                $links, $rechts, 2, 3
            );
            // Der Come-Kasten trägt die ZIFFER als Aufschrift — sprachneutral,
            // deshalb steht sie hier unmittelbar und nicht als XLIFF-Kennung
            // (dieselbe Unterscheidung wie beim Roulette-Zahlenfeld).
            $push(
                "come-{$n}", 'point', 'numbers', (string)$n,
                'felt.name.comepoint', [(string)$n, self::ratioText(self::RATIO_LINE)],
                self::ratioText(self::RATIO_LINE), self::LINE_MAX, 1, false,
                $links, $rechts, 3, 4
            );
            $push(
                "come-odds-{$n}", 'odds', 'numbers', 'felt.print.odds',
                'felt.name.comeodds', [(string)$n, self::ratioText($hell), (string)$hell[1]],
                self::ratioText($hell), self::oddsMax($n, self::LINE_MAX, false), $hell[1], true,
                $links, $mitte, 4, 5
            );
            $push(
                "dont-come-odds-{$n}", 'odds', 'numbers', 'felt.print.odds',
                'felt.name.dontcomeodds', [(string)$n, self::ratioText($dunkel), (string)$dunkel[1]],
                self::ratioText($dunkel), self::oddsMax($n, self::LINE_MAX, true), $dunkel[1], true,
                $mitte, $rechts, 4, 5
            );
            $push(
                "place-{$n}", 'place', 'numbers', "felt.print.place.{$n}",
                'felt.name.place', [(string)$n, self::ratioText($platz), (string)$platz[1]],
                self::ratioText($platz), self::placeMax($n), $platz[1], false,
                $links, $rechts, 5, 6
            );
        }

        // 2  Field, Come, Don't Come, Pass, Don't Pass und die Linien-Odds
        $eins = self::ratioText(self::RATIO_LINE);
        $push('field', 'field', 'lines', 'felt.print.field', 'felt.name.field', [], $eins, 100, 1, false, 1, 13, 6, 7);
        $push('come', 'come', 'lines', 'felt.print.come', 'felt.name.come', [$eins], $eins, self::LINE_MAX, 1, false, 1, 7, 7, 8);
        $push('dont-come', 'dontcome', 'lines', 'felt.print.dontcome', 'felt.name.dontcome', [$eins], $eins, self::LINE_MAX, 1, false, 7, 13, 7, 8);
        $push('pass', 'line', 'lines', 'felt.print.pass', 'felt.name.pass', [$eins], $eins, self::LINE_MAX, 1, false, 1, 7, 8, 9);
        $push('dont-pass', 'dontline', 'lines', 'felt.print.dontpass', 'felt.name.dontpass', [$eins], $eins, self::LINE_MAX, 1, false, 7, 13, 8, 9);
        // Die Quote der beiden Linien-Odds steht erst mit dem Point fest;
        // ihr payoutText nennt deshalb die Staffel statt eines Bruchs.
        $push('pass-odds', 'odds', 'lines', 'felt.print.odds', 'felt.name.passodds', [], '3-4-5×', self::ODDS_MULT[6] * self::LINE_MAX, 1, true, 1, 7, 9, 10);
        $push('dont-pass-odds', 'odds', 'lines', 'felt.print.odds', 'felt.name.dontpassodds', [], '3-4-5×', self::oddsMax(4, self::LINE_MAX, true), 1, true, 7, 13, 9, 10);

        // 3  Die vier Hardways
        foreach ([4, 6, 8, 10] as $k => $n) {
            $r = self::RATIO_HARD[$n];
            $push(
                "hard-{$n}", 'hard', 'hardways', "felt.print.hard.{$n}",
                'felt.name.hard', [(string)$n, self::ratioText($r)],
                self::ratioText($r), 10, 1, false,
                3 * $k + 1, 3 * $k + 4, 10, 11
            );
        }

        // 4  Die sechs Einmalwetten der Mitte
        $einmal = [
            ['any-seven', 'felt.print.seven', 'felt.name.seven', [4, 1]],
            ['any-craps', 'felt.print.craps', 'felt.name.craps', [7, 1]],
            ['two', 'felt.print.two', 'felt.name.two', [30, 1]],
            ['three', 'felt.print.three', 'felt.name.three', [15, 1]],
            ['eleven', 'felt.print.eleven', 'felt.name.eleven', [15, 1]],
            ['twelve', 'felt.print.twelve', 'felt.name.twelve', [30, 1]],
        ];
        foreach ($einmal as $k => [$id, $printed, $labelKey, $ratio]) {
            $push(
                $id, 'single', 'single', $printed, $labelKey, [],
                self::ratioText($ratio), 10, 1, false,
                2 * $k + 1, 2 * $k + 3, 11, 12
            );
        }

        return $fields;
    }

    /**
     * Die Lage des Pucks je Point — für felt.css nicht nötig (dort stehen
     * sechs Regeln), wohl aber für den Nachweis F-6: er rechnet die Regeln
     * gegen diese Tabelle nach.
     *
     * @return array<int, array{col: int, colEnd: int}>
     */
    public static function puckLanes(): array
    {
        $lanes = [0 => ['col' => 1, 'colEnd' => 3]]; // 0 = OFF, geparkt links
        foreach (self::POINTS as $j => $n) {
            $lanes[$n] = ['col' => 2 * $j + 1, 'colEnd' => 2 * $j + 3];
        }

        return $lanes;
    }
}
