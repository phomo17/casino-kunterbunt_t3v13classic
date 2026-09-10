<?php

declare(strict_types=1);

namespace Phomo17\Roulette;

/**
 * Die Feldliste des Tuchs und die Maßordnung des Tisches — der PHP-Spiegel von
 * Resources/Public/JavaScript/bets-roulette.js, erweitert um alles, was gezeichnet wird.
 *
 * WARUM DOPPELT
 * =============
 * Das Tuch wird serverseitig gezeichnet, damit es ohne JavaScript im Markup steht (und
 * damit der Kern die Zeichnung zwischenspeichert, statt sie bei jedem Aufruf neu zu
 * bauen). Fluid kann keine JavaScript-Datei lesen, also steht Anhang F hier ein zweites
 * Mal — dieselbe Bauart wie beim Paar wheel-geometry.js / WheelGeometry.php.
 *
 * WARUM DAS KEINE ZWEITE WAHRHEIT IST
 * ====================================
 * Resources/Private/Scripts/verify-felt.mjs liest BEIDE Dateien und vergleicht sie Feld
 * für Feld: Kennung, Art, covers, payout, max und Lage (Prüfung F-1). Die Buchführung im
 * Browser rechnet ausschließlich mit der JavaScript-Fassung; diese hier zeichnet nur.
 *
 * DIE ARBEITSTEILUNG SEIT DEM UMBAU NACH DER BILDVORLAGE (Ansage vom 2026-09-08)
 * ------------------------------------------------------------------------------
 * bets-roulette.js führt nur noch, was die BUCHFÜHRUNG braucht: id, kind, covers, payout,
 * max und die Lage. Was gezeichnet und vorgelesen wird — Aufschrift, Oval, Raute,
 * labelKey/labelArgs — steht ausschließlich hier. Vorher stand beides in beiden Dateien;
 * die drei Eigenschaften printed/labelKey/labelArgs wurden im JavaScript von keiner
 * einzigen Zeile gelesen und waren damit ein toter Zwilling, den F-1 mitpflegen musste.
 * Dieselbe Aufteilung wie am Würfeltisch.
 *
 * DIE ANORDNUNG DES TUCHS, AUS DER ALLES FOLGT (unverändert)
 * ----------------------------------------------------------
 * Zwölf Tuchspalten i = 1…12, drei Zeilen r = 1…3. Tuchspalte i trägt die Zahlen 3i−2
 * (Zeile 1), 3i−1 (Zeile 2), 3i (Zeile 3). Zeile 1 ist damit Kolonne 1 (1, 4, …, 34),
 * Zeile 3 Kolonne 3 (3, 6, …, 36). Links davon die Nullspalte: '0' liegt an Zeile 1 an,
 * '00' an Zeile 3 — beide reichen mit ihrer eigenen, doppelt so hohen Fläche bis an die
 * mittlere Zeile 2 heran, ohne sie zu erreichen. Dieselbe Skizze wie im Dateikopf von
 * bets-roulette.js; sie wird hier nicht ein zweites Mal gezeichnet.
 *
 * DIE AUFSCHRIFT IST ENGLISCH UND STEHT DESHALB HIER
 * ---------------------------------------------------
 * Ansage des Auftraggebers vom 2026-09-08: aufgedruckt wird wörtlich, was auf der Vorlage
 * steht. Damit ist die Aufschrift kein übersetzbarer Text mehr, sondern die Beschriftung
 * eines Spielgeräts. Sie steht als Klartext in den PRINT_*-Konstanten und läuft NICHT
 * durch f:translate. Der VORLESETEXT bleibt deutsch und kommt weiterhin aus
 * locallang.xlf über labelKey/labelArgs.
 *
 * Jeder Aufschriftteil trägt seine Sprache mit: 'en' für alles mit Buchstaben, '' für
 * reine Zahlenangaben. Ein lang="en" an einer Ziffer machte aus „12" ein gesprochenes
 * „twelve" statt „zwölf" (WCAG 2.2 SC 3.1.2, Prüfung F-19).
 *
 * WARUM RED/BLACK NICHT EIN DRITTES MAL GESCHRIEBEN WERDEN
 * --------------------------------------------------------
 * WheelGeometry::RED und ::BLACK sind bereits der geprüfte PHP-Spiegel dieser beiden
 * Listen (verify-wheel.mjs). Sie liefern hier zugleich die Farbe des Ovals jeder Zahl —
 * ein drittes Abschreiben wäre nur eine weitere Stelle, an der eine Zahl kippen könnte.
 *
 * Namensschild ohne Instanzen: privater Konstruktor, in Services.yaml ausgeschlossen —
 * wie Roulette.php und WheelGeometry.php.
 */
final class BetLayout
{
    /** Gesamteinsatz je Runde über alle Felder (Anhang F). */
    public const ROUND_MAX = 100;

    /** Auszahlungsverhältnis je Anzahl abgedeckter Zahlen (Anhang F). */
    public const PAYOUT_BY_COVERED = [1 => 35, 2 => 17, 3 => 11, 4 => 8, 5 => 6, 6 => 5, 12 => 2, 18 => 1];

    /** Die zwölf Tuchspalten (Spielregel, nicht Gitterspuren). */
    public const COLUMNS = 12;

    /* ==================================================================
       DIE MASSORDNUNG DES GITTERS

       27 Spaltenspuren, 9 Zeilenspuren — unverändert seit Teilstück C3c.
       NEU ist nur, dass die Spuren jetzt VERHÄLTNISSE tragen statt fester
       Breiten: 2 = eine Zellspur (eine Zahl), 1 = eine Linienspur (die Linie
       zwischen zwei Zahlen, auf der Split, Ecke und Reihe liegen).

       Warum Verhältnisse: der Spielplan liegt seit dem Umbau als Überlagerung
       auf einer Zeichnung mit festem Seitenverhältnis. Feste rem-Breiten
       träfen die Zeichnung nur bei genau einer Bildschirmbreite; fr-Anteile
       treffen sie bei jeder. Die Untergrenzen (--ro-line, --ro-cell in
       felt.css) sorgen dafür, dass kein Feld unter die Zielgröße fällt.
       ================================================================== */

    /** Spaltenspuren. */
    public const GRID_COLUMNS = 27;

    /** Zeilenspuren. */
    public const GRID_ROWS = 9;

    /**
     * Das Gewicht jeder Spaltenspur. 2 = Zellspur, 1 = Linienspur.
     *
     *   1        Nullspalte (0 und 00)
     *   2        Kontaktlinie zur Null (Splits, Trios, Fünferwette)
     *   3 … 24   elfmal Zellspur + Linienspur
     *   25       zwölfte Tuchspalte
     *   26       äußere Linie rechts
     *   27       die drei Kolonnenfelder „2 to 1"
     *
     * Summe 41. Prüfung F-13 zählt sie nach und hält sie gegen felt.css.
     */
    public const COLUMN_FRACTIONS = [
        2, 1,
        2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1,
        2, 1, 2,
    ];

    /**
     * Das Gewicht jeder Zeilenspur.
     *
     *   1  äußere Linie oben (Dreier- und Sechserreihen, Fünferwette)
     *   2  erste Zahlenzeile      3  Linie
     *   4  zweite Zahlenzeile     5  Linie
     *   6  dritte Zahlenzeile     7  äußere Linie unten
     *   8  die drei Dutzende
     *   9  die sechs einfachen Chancen
     *
     * Summe 14.
     */
    public const ROW_FRACTIONS = [1, 2, 1, 2, 1, 2, 1, 2, 2];

    /* ==================================================================
       DIE MASSORDNUNG DER TISCHZEICHNUNG (Cloth.html)

       viewBox 0 0 504 160. Das ist KEINE Physikgröße (anders als beim
       Würfeltisch, wo die Wanne die Maßordnung der Simulation ist) — es ist
       die Fläche, auf der Rad und Spielplan nebeneinander Platz haben:

         Außenkante Holz      x   3 … 501   y   3 … 157
         Messingfase          x   8 … 496   y   8 … 152
         Zarge (Bande)        x  11 … 493   y  11 … 149
         Tuchnaht             x  18 … 486   y  18 … 142
         Tuch (Spielfläche)   x  20 … 484   y  20 … 140
         Radmulde             Mittelpunkt 86/80, Halbmesser 58
         Spielplan (Gitter)   x 152 … 480   y  24 … 136   → 328 × 112

       328 : 112 ist GENAU 41 : 14, das Verhältnis der Spursummen oben
       (328 × 14 = 112 × 41 = 4592). Nur deshalb füllen die fr-Spuren den
       Kasten ohne Verzerrung aus. Prüfung F-13 rechnet diese Gleichheit nach
       — sie ist die eine Zahl, an der der ganze Umbau hängt.

       Der Abstand zwischen Radmulde (rechter Rand x = 144) und Spielplan
       (linker Rand x = 152) beträgt 8 Einheiten; rechts vom Spielplan bleiben
       4 Einheiten bis zur Tuchkante. Beides ist Tuch, kein Bauteil.
       ================================================================== */

    public const VIEW_W = 504;
    public const VIEW_H = 160;

    public const CLOTH_X = 20;
    public const CLOTH_Y = 20;
    public const CLOTH_W = 464;
    public const CLOTH_H = 120;

    public const GRID_X = 152;
    public const GRID_Y = 24;
    public const GRID_W = 328;
    public const GRID_H = 112;

    public const WHEEL_CX = 86;
    public const WHEEL_CY = 80;
    public const WHEEL_R = 58;

    /**
     * Wie weit die Spitze eines Pfeilfeldes in seine eigene Zelle hineinragt,
     * in Einheiten der Zeichnung.
     *
     * DIE SPITZE ZEIGT NACH AUSSEN (nach links, vom Zahlenfeld weg). Das ist
     * die plausible Lesart der Vorlage; die Bilddatei liegt nicht im Projekt
     * und lässt sich deshalb nicht gegenprüfen. Soll die Spitze nach INNEN
     * zeigen, tauschen in arrowPaths() genau zwei Werte die Rolle:
     * $xAussen und $xInnen. Es ist eine Zeile, kein Umbau.
     */
    public const ARROW_TIP = 8;

    /* ==================================================================
       DIE AUFSCHRIFT — englisch, wörtlich wie auf der Vorlage

       Kein übersetzbarer Text (siehe Kopfkommentar). Prüfung F-18 hält jede
       dieser Zeichenketten gegen eine unabhängige Abschrift der Vorlage im
       Prüfskript selbst; F-19 prüft die Sprachauszeichnung.

       PRINT_LOW und PRINT_HIGH stehen als EIGENE Konstanten da, obwohl sie
       aussehen wie zwei Zeilen desselben Musters: zeigte die Vorlage doch
       „1 to 18"/„19 to 36" statt der Zahlenspanne mit Halbgeviertstrich,
       ist der Wechsel je eine Zeile — und die Sprachauszeichnung zöge
       automatisch nach, weil F-19 sie am Vorhandensein von Buchstaben
       festmacht und nicht an einer Liste.
       ================================================================== */

    /** Die drei Kolonnenfelder rechts. */
    public const PRINT_COLUMN = '2 to 1';

    /** Die drei Dutzende, in der Reihenfolge 1…3. */
    public const PRINT_DOZEN = ['1st 12', '2nd 12', '3rd 12'];

    /** Die vier beschrifteten einfachen Chancen. Rot und Schwarz tragen KEINE
        Aufschrift — sie sind auf der Vorlage zwei Rauten. */
    public const PRINT_LOW = '1–18';
    public const PRINT_EVEN = 'Even';
    public const PRINT_ODD = 'Odd';
    public const PRINT_HIGH = '19–36';

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
     * Die Fachfarbe einer Zahl — rot, schwarz oder grün.
     *
     * Sie kommt aus WheelGeometry (dem geprüften Spiegel der Radanordnung),
     * nicht aus einer eigenen Liste: dieselbe Zahl darf am Rad nicht anders
     * gefärbt sein als auf dem Tuch.
     */
    private static function pocketColour(string $label): string
    {
        if (in_array($label, WheelGeometry::GREEN, true)) {
            return 'green';
        }

        return in_array($label, WheelGeometry::RED, true) ? 'red' : 'black';
    }

    /** Gitterlinie → x in der Maßordnung der Zeichnung. */
    public static function gridX(int $line): float
    {
        $gesamt = array_sum(self::COLUMN_FRACTIONS);
        $bisher = array_sum(array_slice(self::COLUMN_FRACTIONS, 0, $line - 1));

        return self::GRID_X + self::GRID_W * $bisher / $gesamt;
    }

    /** Gitterlinie → y in der Maßordnung der Zeichnung. */
    public static function gridY(int $line): float
    {
        $gesamt = array_sum(self::ROW_FRACTIONS);
        $bisher = array_sum(array_slice(self::ROW_FRACTIONS, 0, $line - 1));

        return self::GRID_Y + self::GRID_H * $bisher / $gesamt;
    }

    /** Eine Zahl für eine SVG-Pfadangabe: höchstens drei Nachkommastellen. */
    private static function n(float $wert): string
    {
        return rtrim(rtrim(number_format($wert, 3, '.', ''), '0'), '.');
    }

    /**
     * Die Umrisse der beiden Pfeilfelder 0 und 00, als fertige SVG-Pfadangaben
     * in der Maßordnung der Zeichnung.
     *
     * WARUM DER UMRISS IN DER ZEICHENSCHICHT LIEGT UND NICHT AM KNOPF.
     * Ein Pfeil ist kein Rechteck. Ein Knopf ließe sich zwar mit clip-path zu
     * einem Pfeil beschneiden — aber clip-path schneidet den FOKUSRAHMEN
     * gleich mit ab. Das ist derselbe Fehler, den opacity in diesem Haus schon
     * viermal verursacht hat: eine Darstellungsentscheidung nimmt einem
     * Tastaturbenutzer die Anzeige, an der er sich festhält. Deshalb steht der
     * Umriss als Pfad in Cloth.html, und der Knopf darüber trägt keinen
     * eigenen Rahmen (felt.css). Genau die Lösung, mit der der Würfeltisch
     * seine L-förmigen Linienwetten zeichnet.
     *
     * Die Bedienfläche des Knopfes bleibt sein volles Gitterrechteck und ist
     * damit an der Einkerbung geringfügig GRÖSSER als der gezeichnete Pfeil.
     * Das ist die richtige Richtung: die Bedienfläche darf größer sein als das
     * Bild, nie kleiner (WCAG 2.2 SC 2.5.8).
     *
     * Ergebnis bei der heutigen Maßordnung, zur Kontrolle beim Umsetzen:
     *   n-0   M 168 32 H 160 L 152 44 L 160 56 H 168 Z
     *   n-00  M 168 72 H 160 L 152 84 L 160 96 H 168 Z
     *
     * @return list<array{id: string, d: string}>
     */
    public static function arrowPaths(): array
    {
        $xInnen = self::gridX(2);                    // die Kante zur Kontaktlinie
        $xAussen = self::gridX(1);                   // der Tischrand links
        $xSchulter = $xAussen + self::ARROW_TIP;     // wo die Schräge beginnt

        $pfade = [];
        foreach ([['n-0', 2, 4], ['n-00', 5, 7]] as [$id, $zeile, $zeileEnde]) {
            $yOben = self::gridY($zeile);
            $yUnten = self::gridY($zeileEnde);
            $yMitte = ($yOben + $yUnten) / 2;
            $pfade[] = [
                'id' => $id,
                'd' => sprintf(
                    'M %s %s H %s L %s %s L %s %s H %s Z',
                    self::n($xInnen), self::n($yOben),
                    self::n($xSchulter),
                    self::n($xAussen), self::n($yMitte),
                    self::n($xSchulter), self::n($yUnten),
                    self::n($xInnen)
                ),
            ];
        }

        return $pfade;
    }

    /**
     * Die vollständige Feldliste, in derselben Reihenfolge wie
     * bets-roulette.js sie aufbaut.
     *
     * @return list<array{id: string, kind: string, covers: list<string>,
     *                    payout: int, max: int, labelKey: string,
     *                    labelArgs: list<string>,
     *                    print: list<array{text: string, lang: string, role: string}>,
     *                    diamond: string,
     *                    col: int, colEnd: ?int, row: int, rowEnd: ?int}>
     */
    public static function fields(): array
    {
        $fields = [];

        /**
         * @param list<string> $covers
         */
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
                'labelKey' => $opts['labelKey'],
                'labelArgs' => $opts['labelArgs'] ?? [],
                // Die sichtbare Aufschrift, als Liste von Teilen mit Sprache
                // und Rolle. Leer bei jedem Linienfeld und bei den zwei Rauten.
                'print' => $opts['print'] ?? [],
                // 'red' | 'black' | '' — nur die zwei Rautenfelder.
                'diamond' => $opts['diamond'] ?? '',
                'col' => $opts['col'],
                'colEnd' => $opts['colEnd'] ?? null,
                'row' => $opts['row'],
                'rowEnd' => $opts['rowEnd'] ?? null,
            ];
        };

        /** Ein englisches Wort auf dem Tuch. */
        $wort = static fn (string $text): array => ['text' => $text, 'lang' => 'en', 'role' => 'word'];
        /** Eine reine Zahlenangabe („1–18") — sprachneutral, deshalb ohne lang. */
        $spanne = static fn (string $text): array => ['text' => $text, 'lang' => '', 'role' => 'range'];
        /** Die Zahl eines Fachs, als farbiges Oval. */
        $oval = static fn (string $text): array => [
            'text' => $text,
            'lang' => '',
            'role' => 'pocket-' . self::pocketColour($text),
        ];

        // 1  Die beiden grünen Fächer und die 36 Zahlen  → 38 Felder
        $push('n-0', 'number', ['0'], [
            'print' => [$oval('0')],
            'labelKey' => 'felt.name.number.green',
            'labelArgs' => ['0'],
            'col' => 1, 'row' => 2, 'rowEnd' => 4,
        ]);
        $push('n-00', 'number', ['00'], [
            'print' => [$oval('00')],
            'labelKey' => 'felt.name.number.green',
            'labelArgs' => ['00'],
            'col' => 1, 'row' => 5, 'rowEnd' => 7,
        ]);
        for ($i = 1; $i <= 12; $i++) {
            for ($r = 1; $r <= 3; $r++) {
                $zahl = self::numberAt($i, $r);
                $push("n-{$zahl}", 'number', [$zahl], [
                    'print' => [$oval($zahl)],
                    'labelKey' => 'felt.name.number.' . self::pocketColour($zahl),
                    'labelArgs' => [$zahl],
                    'col' => 2 * $i + 1, 'row' => 2 * $r,
                ]);
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

        // 5  Fünferwette → 1 Feld. Dokumentierte Ausnahme von der
        // Nachbarschaftsregel (Behebung Review C3, M1) — Lage unverändert.
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
            // labelArgs[0] ist die AUFSCHRIFT selbst: der Name muss sie
            // enthalten (WCAG 2.2 SC 2.5.3, Label in Name — Prüfung F-20).
            $push("col-{$r}", 'column', $covers, [
                'print' => [$wort(self::PRINT_COLUMN)],
                'labelKey' => 'felt.name.column',
                'labelArgs' => [self::PRINT_COLUMN, (string)$r, implode(', ', $covers)],
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
                'print' => [$wort(self::PRINT_DOZEN[$d - 1])],
                'labelKey' => "felt.name.dozen.{$d}",
                'labelArgs' => [self::PRINT_DOZEN[$d - 1], $covers[0], $covers[count($covers) - 1]],
                'col' => 8 * $d - 5,
                'colEnd' => 8 * $d + 2,
                'row' => 8,
            ]);
        }
        $einfacheChancen = [
            [
                'id' => 'low', 'labelKey' => 'felt.name.low',
                'print' => [$spanne(self::PRINT_LOW)], 'labelArgs' => [self::PRINT_LOW], 'diamond' => '',
                'covers' => array_map(static fn (int $k): string => (string)($k + 1), range(0, 17)),
            ],
            [
                'id' => 'even', 'labelKey' => 'felt.name.even',
                'print' => [$wort(self::PRINT_EVEN)], 'labelArgs' => [self::PRINT_EVEN], 'diamond' => '',
                'covers' => array_map(static fn (int $k): string => (string)(2 * ($k + 1)), range(0, 17)),
            ],
            [
                // Die Vorlage druckt hier KEIN Wort, sondern eine rote Raute.
                'id' => 'red', 'labelKey' => 'felt.name.red',
                'print' => [], 'labelArgs' => [], 'diamond' => 'red',
                'covers' => WheelGeometry::RED,
            ],
            [
                'id' => 'black', 'labelKey' => 'felt.name.black',
                'print' => [], 'labelArgs' => [], 'diamond' => 'black',
                'covers' => WheelGeometry::BLACK,
            ],
            [
                'id' => 'odd', 'labelKey' => 'felt.name.odd',
                'print' => [$wort(self::PRINT_ODD)], 'labelArgs' => [self::PRINT_ODD], 'diamond' => '',
                'covers' => array_map(static fn (int $k): string => (string)(2 * $k + 1), range(0, 17)),
            ],
            [
                'id' => 'high', 'labelKey' => 'felt.name.high',
                'print' => [$spanne(self::PRINT_HIGH)], 'labelArgs' => [self::PRINT_HIGH], 'diamond' => '',
                'covers' => array_map(static fn (int $k): string => (string)($k + 19), range(0, 17)),
            ],
        ];
        foreach ($einfacheChancen as $index => $chance) {
            $j = $index + 1;
            $push($chance['id'], 'even', $chance['covers'], [
                'print' => $chance['print'],
                'diamond' => $chance['diamond'],
                'labelKey' => $chance['labelKey'],
                'labelArgs' => $chance['labelArgs'],
                'col' => 4 * $j - 1,
                'colEnd' => 4 * $j + 2,
                'row' => 9,
            ]);
        }

        return $fields;
    }
}
