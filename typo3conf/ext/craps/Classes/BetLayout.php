<?php

declare(strict_types=1);

namespace Phomo17\Craps;

/**
 * Die Feldliste des Craps-Tuchs als PHP-Spiegel von
 * Resources/Public/JavaScript/bets-craps.js — und als alleinige Quelle der
 * LAGE jedes Feldes im Gitter und, seit dem Umbau nach der Bildvorlage
 * (Ansage vom 2026-09-08), der AUFSCHRIFT.
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
 * Die LAGE im Gitter (col/colEnd, row/rowEnd) und die AUFSCHRIFT (print,
 * printPayout, doublePayout, circles, pips). Beim Roulette war die Lage die
 * Quelle der Wetten — ein Split IST die Linie zwischen zwei Zahlen. Beim
 * Craps ist es umgekehrt: Anhang H nennt die Wetten, die Anordnung und die
 * Aufschrift sind Gestaltungsentscheidungen dieses Hauses. Beide gehören
 * deshalb dorthin, wo gezeichnet wird, und nicht in die Regeldatei.
 *
 * DAS GITTER NACH DER BILDVORLAGE (Ansage vom 2026-09-08)
 * =========================================================
 * 96 Spaltenspuren, 11 Zeilenspuren. Die vollständige Maßordnung steht als
 * Kommentar unmittelbar über den Konstanten COLUMNS/ROWS unten — dort, wo sie
 * mit den tatsächlichen Zahlen zusammensteht, statt hier ein zweites Mal
 * (veraltet) behauptet zu werden.
 *
 * DIE AUFSCHRIFT (Vorbemerkung E des Plans)
 * ==========================================
 * Sie ist ab diesem Umbau KEIN übersetzbarer Text mehr, sondern Klartext
 * hier in dieser Klasse: die Aufschrift eines Spielgeräts wie die Augen auf
 * einem Würfel, englisch und wörtlich wie auf der Vorlage. locallang.xlf
 * trägt nur noch den DEUTSCHEN, erreichbaren Namen.
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

    /**
     * DIE MASSORDNUNG NACH DER BILDVORLAGE (Ansage vom 2026-09-08)
     * ============================================================
     * 96 Spaltenspuren, 11 Zeilenspuren. Zeile 1 ist die Puck-Spur (kein Feld).
     *
     *   Spuren  1 … 37   linke Seitensektion, gespiegelt und nur gezeichnet
     *   Spuren 37 … 40   gespiegelte E/C-Kreisspalte
     *   Spuren 40 … 58   Mittensektion, die Einmalwetten
     *   Spuren 58 … 61   E/C-Kreisspalte, bespielbar
     *   Spuren 61 … 97   rechte Seitensektion, bespielbar
     *
     * Die Spurbreiten sind aus der Vorlage abgemessen und auf ganze Spuren
     * gerundet (Zahlenkasten 117 Bildpunkte, Don't-Come-Kasten 107,
     * Pass-Schenkel 85, Don't-Pass-Schenkel 60 → 4 : 5 : 4 : 3 Spuren).
     * Eine Spur ist felt.css zufolge 0,75rem = 12 Bildpunkte; das SCHMALSTE
     * Feld des Tuchs ist drei Spuren breit und misst damit 36 Bildpunkte —
     * über den 24 aus WCAG 2.2 SC 2.5.8. Nachgerechnet wird das nicht hier,
     * sondern in Prüfung F-7, und zwar für jedes Feld einzeln.
     */
    public const COLUMNS = 96;
    public const ROWS = 11;

    /** Erste Spur der Mittensektion und der rechten (bespielbaren) Sektion. */
    public const CENTER_COL = 40;
    public const RIGHT_COL = 58;

    /**
     * Die Höhe der elf Zeilenspuren als fr-Anteile, in der Reihenfolge des
     * Tuchs. Element 0 ist die Puck-Spur. felt.css schreibt genau diese Werte
     * in grid-template-rows; Prüfung F-7 hält beide gegeneinander und rechnet
     * daraus die tatsächliche Höhe jedes Feldes in Bildpunkten aus.
     *
     * Die Anteile sind aus der Vorlage abgemessen und dort angehoben, wo die
     * Zielgröße es verlangt: der untere Come-Streifen ist im Bild nur
     * 17 Bildpunkte hoch, hier 0.8fr (rund 36 Bildpunkte).
     */
    public const ROW_FRACTIONS = [0.6, 1.1, 0.8, 2.0, 0.8, 0.8, 1.8, 1.6, 1.0, 1.4, 1.0];

    /** Die elf Zeilen beim Namen. Zeile = obere Gitterlinie des jeweiligen Feldes. */
    public const ROW_PUCK = 1;
    public const ROW_DONT_COME = 2;
    public const ROW_DONT_COME_ODDS = 3;
    public const ROW_PLACE = 4;
    public const ROW_COME_ODDS = 5;
    public const ROW_COME = 6;
    public const ROW_COME_BOX = 7;
    public const ROW_FIELD = 8;
    public const ROW_DONT_PASS = 9;
    public const ROW_PASS = 10;
    public const ROW_APRON = 11;

    /** Die sechs Zahlenkästen: erste Spur (die Zahl 10, innen) und Breite. */
    public const NUMBER_COL = 61;
    public const NUMBER_WIDTH = 4;

    /**
     * Die sechs Zahlen in der Reihenfolge, in der sie auf dem Tuch stehen —
     * von INNEN (zur Mitte hin) nach AUSSEN. Auf der Vorlage steht die 4 außen
     * am Don't-Come-Kasten und die 10 innen an der Mittensektion; unsere
     * bespielbare Sektion liegt rechts und ist deshalb ihr Spiegelbild
     * (siehe Vorbemerkung C im Plan).
     */
    public const POINTS_ON_CLOTH = [10, 9, 8, 6, 5, 4];

    /** Der Don't-Come-Kasten am äußeren Ende der Zahlenreihe. */
    public const DC_BOX_COL = 85;
    public const DC_BOX_WIDTH = 5;

    /** Die zwei senkrechten Schenkel der L-förmigen Linienwetten. */
    public const DP_LEG_COL = 90;
    public const DP_LEG_WIDTH = 3;
    public const PASS_LEG_COL = 93;
    public const PASS_LEG_WIDTH = 4;

    /**
     * Innere (zur Mitte zeigende) Kante der Querbänder COME, FIELD,
     * Don't Pass Bar und PASS LINE. Die Spuren NUMBER_COL … BAND_COL bleiben
     * in den Zeilen ROW_COME_BOX … ROWS+1 LEER: das ist die Ecke, in der ein
     * anderes Haus BIG 6 / BIG 8 druckt. Wir bieten beide nicht an (Anhang H),
     * und die Vorlage führt sie ebenfalls nicht. Prüfung F-19 belegt, dass
     * dort tatsächlich kein Feld liegt — eine leere Fläche, die niemand
     * bewacht, füllt sich mit der Zeit von selbst.
     */
    public const BAND_COL = 65;

    /** Die Halbmesser der geschwungenen Ecke, in Wannen-Einheiten (Cloth.html). */
    public const CORNER_RX = 24.0;
    public const CORNER_RY = 30.0;

    /**
     * Die Aufschrift der sechs Zahlenkästen. 6 und 9 stehen ausgeschrieben,
     * damit sie über die Tischlänge hinweg nicht verwechselt werden können —
     * eine rein zweckbedingte Eigenheit jedes Craps-Tisches (eine gedrehte 6
     * ist eine 9), keine Handschrift eines bestimmten Hauses. Unverändert
     * seit vor dem Umbau nach der Bildvorlage; neu ist nur, WO dieser
     * Aufdruck landet — nicht mehr auf dem Come-Kasten, sondern auf dem
     * Place-Kasten, denn der ist jetzt der Kasten mit der großen Zahl.
     */
    public const POINT_PRINT = [4 => '4', 5 => '5', 6 => 'SIX', 8 => '8', 9 => 'NINE', 10 => '10'];

    /** Die sechs Zahlen in der Reihenfolge der REGELN (Anhang H), nicht des Tuchs. */
    public const POINTS = [4, 5, 6, 8, 9, 10];

    /** Die Staffel 3-4-5× (Anhang H). */
    public const ODDS_MULT = [4 => 3, 5 => 4, 6 => 5, 8 => 5, 9 => 4, 10 => 3];

    /** Auszahlungen als exakte Brüche [Zähler, Nenner] — Abschrift von Anhang H. */
    public const RATIO_LINE = [1, 1];
    public const RATIO_PLACE = [4 => [9, 5], 5 => [7, 5], 6 => [7, 6], 8 => [7, 6], 9 => [7, 5], 10 => [9, 5]];
    public const RATIO_ODDS_LIGHT = [4 => [2, 1], 5 => [3, 2], 6 => [6, 5], 8 => [6, 5], 9 => [3, 2], 10 => [2, 1]];
    public const RATIO_ODDS_DARK = [4 => [1, 2], 5 => [2, 3], 6 => [5, 6], 8 => [5, 6], 9 => [2, 3], 10 => [1, 2]];
    public const RATIO_HARD = [4 => [7, 1], 6 => [9, 1], 8 => [9, 1], 10 => [7, 1]];

    /**
     * DIE AUFSCHRIFT DES TUCHS — ENGLISCH, WÖRTLICH WIE AUF DER VORLAGE
     * =================================================================
     * Ansage des Auftraggebers vom 2026-09-08. Diese Zeichenketten sind KEIN
     * übersetzbarer Text und stehen deshalb nicht in locallang.xlf, sondern
     * hier: sie sind die Beschriftung eines Spielgeräts, so wie die Augen auf
     * einem Würfel. Sie werden in keiner Sprachfassung übersetzt.
     *
     * Prüfung F-24 hält sie gegen eine wörtliche Abschrift der Vorlage und
     * schlägt an, sobald ein deutsches Wort oder ein Umlaut daraufgerät;
     * Prüfung F-22 verlangt, dass jedes Wort im Markup mit lang="en"
     * ausgezeichnet ist (WCAG 2.2 SC 3.1.2).
     *
     * Reine Ziffern („4“, „10“, die Punktreihe des FIELD) bekommen KEIN
     * lang-Attribut: eine Ziffer hat keine Sprache, und ein lang="en" machte
     * aus „10“ ein gesprochenes „ten“ statt „zehn“.
     */
    public const PRINT_PASS = 'PASS LINE';
    public const PRINT_DONT_PASS = "Don't Pass Bar";
    public const PRINT_COME = 'COME';
    public const PRINT_DONT_COME = "Don't Come";
    public const PRINT_BAR = 'Bar';
    public const PRINT_FIELD = 'FIELD';
    public const PRINT_FIELD_NUMBERS = '· 3 · 4 · 9 · 10 · 11 ·';
    public const PRINT_SEVEN = 'Seven';
    public const PRINT_ANY_CRAPS = 'Any Craps';
    public const PRINT_ODDS = 'ODDS';
    public const PRINT_PAYS_DOUBLE = 'PAYS DOUBLE';
    public const PRINT_PAYS_TRIPLE = 'PAYS TRIPLE';
    public const PRINT_E = 'E';
    public const PRINT_C = 'C';
    public const PRINT_PUCK_OFF = 'OFF';
    public const PRINT_PUCK_ON = 'ON';

    /**
     * Die kleinen Würfelbilder der Vorlage, als Augenpaare.
     *
     * Sie werden NICHT neu gezeichnet: Felt.html setzt sie über
     * <use href="#cr-face-N"> aus demselben <symbol>-Satz ein, mit dem auch
     * die beiden echten Würfel gezeichnet werden (Partial
     * Table/Craps/DiceSprite). Damit gibt es im ganzen Haus genau EINE
     * Würfelgeometrie.
     *
     * Die Paare sind kein Zierrat, sondern eine Aussage, und Prüfung F-20
     * rechnet sie nach:
     *   – ein Hardway-Paar ist ein Pasch und ergibt seine Zahl (3+3 = Hard 6),
     *   – ein Einzelzahl-Paar ergibt seine Zahl (1+2 = die 3),
     *   – ein Bar-Paar ist die Zahl, die als Patt gilt: 6+6 = die 12
     *     („Bar 12“, Anhang H) — und NICHT 1+1, wie es Häuser tun, die die 2
     *     barren. Wo die Vorlage etwas anderes nahelegte, gewänne Anhang H.
     *
     * Für die Elf stehen ZWEI Paare, weil die Vorlage sie zweimal druckt —
     * einmal für jede Tischseite. Es bleibt EINE Wette; das zweite Paar ist
     * aria-hidden (siehe Felt.html).
     *
     * @var array<string, list<array{int, int}>>
     */
    public const PIPS = [
        'dont-pass' => [[6, 6]],
        'dont-come' => [[6, 6]],
        'hard-4' => [[2, 2]],
        'hard-6' => [[3, 3]],
        'hard-8' => [[4, 4]],
        'hard-10' => [[5, 5]],
        'two' => [[1, 1]],
        'three' => [[1, 2]],
        'eleven' => [[6, 5], [5, 6]],
        'twelve' => [[6, 6]],
    ];

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
     * „5 FOR 1“ — die Aufschrift der Vorlage, GERECHNET aus unserer Quote,
     * nicht vom Bild abgeschrieben.
     *
     * „N FOR 1“ heißt: das N-fache des Einsatzes kommt zurück, Einsatz
     * eingerechnet. Unser „a zu b“ heißt: a Gewinn auf b Einsatz, Einsatz
     * zusätzlich zurück. Für b = 1 ist also N = a + 1. Für b ≠ 1 gibt es keine
     * ganzzahlige „FOR 1“-Form — und genau dort druckt die Vorlage auch keine
     * (Place-Kästen, Odds). Die leere Zeichenkette heißt: dieses Feld trägt
     * keinen Zahlenaufdruck.
     *
     * Prüfung F-15 rechnet für jedes Feld nach, dass der Aufdruck zu
     * ratioFor() aus bets-craps.js passt. Änderte jemand eine Quote, änderte
     * sich der Aufdruck mit — oder die Prüfung schlüge an.
     *
     * @param array{int, int} $ratio
     */
    public static function forOne(array $ratio): string
    {
        if ($ratio[1] !== 1) {
            return '';
        }

        return ($ratio[0] + 1) . ' FOR 1';
    }

    /**
     * Die vollständige Feldliste, gruppenweise in Lesereihenfolge.
     *
     * @return list<array{id: string, kind: string, group: string,
     *                    print: list<array{text: string, lang: string, role: string}>,
     *                    printPayout: string, doublePayout: bool,
     *                    circles: list<array{label: string, text: string, ratio: array{int,int}}>,
     *                    pips: list<array{int, int}>,
     *                    labelKey: string, labelArgs: list<string>,
     *                    payoutText: string, max: int, unit: int, odds: bool,
     *                    col: int, colEnd: int, row: int, rowEnd: int,
     *                    mirrorCol: int, mirrorColEnd: int}>
     */
    public static function fields(): array
    {
        $fields = [];

        /**
         * @param list<array{text: string, lang: string, role: string}> $print
         *        Die Aufschrift, in Leserichtung. Jeder Teil trägt seine
         *        Sprache ('en' oder '' für sprachneutrale Ziffern) und seine
         *        Rolle, an der felt.css ihn erkennt ('word', 'number', 'bar').
         *        Leere Liste = dieses Feld trägt keine Aufschrift; das ist auf
         *        der Vorlage der Normalfall (Odds-Streifen, Come-Streifen,
         *        Hardways, Einzelzahlen — dort sprechen die Würfelbilder).
         * @param string $printPayout „8 FOR 1“ oder '' — der Zahlenaufdruck,
         *        gerechnet über forOne(). Leer, wo die Vorlage keine Zahl
         *        druckt.
         * @param bool $doublePayout Die Vorlage druckt den Zahlenaufdruck bei
         *        Seven und Any Craps ZWEIMAL, links und rechts — einmal für
         *        jede Tischseite. Der zweite Abdruck ist aria-hidden.
         * @param list<array{label: string, text: string, ratio: array{int,int}}> $circles
         *        Nur beim FIELD: die zwei eingekreisten Sonderfälle.
         * @param list<string> $labelArgs
         */
        $push = static function (
            string $id,
            string $kind,
            string $group,
            array $print,
            string $printPayout,
            bool $doublePayout,
            array $circles,
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
            /*
             * Die Spiegelung ist eine reine Rechnung, kein Datum: ein Feld der
             * rechten Seitensektion (Spuren ab RIGHT_COL) erscheint in der
             * linken an der punktgespiegelten Stelle. COLUMNS + 2 ist die Summe
             * der beiden äußeren Gitterlinien (1 und 97); die Mittensektion und
             * alles, was in ihr liegt, wird NICHT gespiegelt — sie ist beiden
             * Tischseiten gemeinsam.
             */
            $mirrorCol = $col >= self::RIGHT_COL ? self::COLUMNS + 2 - $colEnd : 0;
            $mirrorColEnd = $col >= self::RIGHT_COL ? self::COLUMNS + 2 - $col : 0;
            $pips = self::PIPS[$id] ?? [];
            $fields[] = compact(
                'id', 'kind', 'group', 'print', 'printPayout', 'doublePayout', 'circles', 'pips',
                'labelKey', 'labelArgs', 'payoutText', 'max', 'unit', 'odds',
                'col', 'colEnd', 'row', 'rowEnd', 'mirrorCol', 'mirrorColEnd'
            );
        };

        /** Ein Aufschriftteil. */
        $wort = static fn (string $text): array => ['text' => $text, 'lang' => 'en', 'role' => 'word'];
        $ziffer = static fn (string $text): array => ['text' => $text, 'lang' => '', 'role' => 'number'];

        $eins = self::ratioText(self::RATIO_LINE);
        $ohne = [];

        /*
         * 1  DIE SECHS ZAHLENKÄSTEN, je fünf Zonen übereinander.
         *
         * Auf einem echten Craps-Tisch ist das EIN Kasten je Zahl, und die
         * HÖHE der Chiplage sagt, welche Wette gemeint ist. Genau so wird es
         * hier gebaut: fünf Felder untereinander, nach außen als ein Kasten
         * gezeichnet (kräftige Außenlinie, Haarlinien innen, felt.css).
         *
         *   Zeile 2  dont-come-N        flache Wette, außen
         *   Zeile 3  dont-come-odds-N   die Odds, an der Zahl
         *   Zeile 4  place-N            der Kasten mit der großen Zahl
         *   Zeile 5  come-odds-N        die Odds, an der Zahl
         *   Zeile 6  come-N             flache Wette, außen
         *
         * Die Regel dahinter in einem Satz: die Odds liegen IMMER an der Zahl,
         * die flachen Wetten IMMER außen. Zwei Sätze, sechs Kästen, keine
         * Merkliste.
         *
         * VIER DER FÜNF ZONEN TRAGEN KEINE AUFSCHRIFT. Das ist nicht gespart,
         * sondern abgeschrieben: die Vorlage bedruckt die Streifen über und
         * unter der Zahl nicht, weil am echten Tisch der Ort die Wette sagt.
         * Was sie sind, steht vollständig im erreichbaren Namen.
         */
        foreach (self::POINTS_ON_CLOTH as $j => $n) {
            $links = self::NUMBER_COL + self::NUMBER_WIDTH * $j;
            $rechts = $links + self::NUMBER_WIDTH;
            $hell = self::RATIO_ODDS_LIGHT[$n];
            $dunkel = self::RATIO_ODDS_DARK[$n];
            $platz = self::RATIO_PLACE[$n];
            // Die 6 und die 9 stehen ausgeschrieben auf dem Tuch (SIX, NINE) —
            // eine rein zweckbedingte Eigenheit jedes Craps-Tisches, weil eine
            // gedrehte 6 eine 9 ist. Sie sind ENGLISCHE WÖRTER und deshalb
            // sprachlich auszuzeichnen; die Ziffern sind es nicht. Und ihr
            // erreichbarer Name MUSS das Wort enthalten (WCAG 2.2 SC 2.5.3),
            // sonst sagt jemand „SIX“ und trifft nichts.
            $ausgeschrieben = self::POINT_PRINT[$n] !== (string)$n;
            $zahlAufdruck = $ausgeschrieben
                ? $wort(self::POINT_PRINT[$n])
                : $ziffer(self::POINT_PRINT[$n]);

            $push(
                "dont-come-{$n}", 'dcstrip', 'numbers', $ohne, '', false, [],
                'felt.name.dontcomepoint', [(string)$n, $eins],
                $eins, self::LINE_MAX, 1, false,
                $links, $rechts, self::ROW_DONT_COME, self::ROW_DONT_COME + 1
            );
            $push(
                "dont-come-odds-{$n}", 'odds', 'numbers', $ohne, '', false, [],
                'felt.name.dontcomeodds', [(string)$n, self::ratioText($dunkel), (string)$dunkel[1]],
                self::ratioText($dunkel), self::oddsMax($n, self::LINE_MAX, true), $dunkel[1], true,
                $links, $rechts, self::ROW_DONT_COME_ODDS, self::ROW_DONT_COME_ODDS + 1
            );
            $push(
                "place-{$n}", 'place', 'numbers', [$zahlAufdruck], '', false, [],
                $ausgeschrieben ? 'felt.name.place.word' : 'felt.name.place',
                $ausgeschrieben
                    ? [self::POINT_PRINT[$n], (string)$n, self::ratioText($platz), (string)$platz[1]]
                    : [(string)$n, self::ratioText($platz), (string)$platz[1]],
                self::ratioText($platz), self::placeMax($n), $platz[1], false,
                $links, $rechts, self::ROW_PLACE, self::ROW_PLACE + 1
            );
            $push(
                "come-odds-{$n}", 'odds', 'numbers', $ohne, '', false, [],
                'felt.name.comeodds', [(string)$n, self::ratioText($hell), (string)$hell[1]],
                self::ratioText($hell), self::oddsMax($n, self::LINE_MAX, false), $hell[1], true,
                $links, $rechts, self::ROW_COME_ODDS, self::ROW_COME_ODDS + 1
            );
            $push(
                "come-{$n}", 'comestrip', 'numbers', $ohne, '', false, [],
                'felt.name.comepoint', [(string)$n, $eins],
                $eins, self::LINE_MAX, 1, false,
                $links, $rechts, self::ROW_COME, self::ROW_COME + 1
            );
        }

        /*
         * 2  Der Don't-Come-Kasten am äußeren Ende der Zahlenreihe. Auf der
         *    Vorlage ist er ein hoher Kasten mit „Don't Come“ oben und „Bar“
         *    plus einem Würfelpaar darunter; er reicht über die ganze Höhe der
         *    Zahlenreihe. Das ist NICHT die alte halbe Zeile 6 — die gibt es
         *    nicht mehr.
         */
        $push(
            'dont-come', 'dontcome', 'lines',
            [$wort(self::PRINT_DONT_COME), ['text' => self::PRINT_BAR, 'lang' => 'en', 'role' => 'bar']],
            '', false, [],
            'felt.name.dontcome', [$eins], $eins, self::LINE_MAX, 1, false,
            self::DC_BOX_COL, self::DC_BOX_COL + self::DC_BOX_WIDTH,
            self::ROW_DONT_COME, self::ROW_COME + 1
        );

        /*
         * 3  Die vier Querbänder. COME, FIELD und Don't Pass Bar laufen von
         *    BAND_COL bis zur äußeren Kante des Don't-Come-Kastens; die
         *    PASS LINE läuft eine Schenkelbreite weiter, weil sie AUSSEN um die
         *    Don't Pass Bar herumführt. Die Spuren NUMBER_COL … BAND_COL
         *    bleiben ab ROW_COME_BOX leer (die BIG-6/BIG-8-Ecke, F-19).
         *
         *    Keines der vier trägt einen Zahlenaufdruck: die Vorlage druckt
         *    dort keinen, weil 1 zu 1 am Craps-Tisch nie aufgedruckt wird.
         */
        $bandEnde = self::DC_BOX_COL + self::DC_BOX_WIDTH;               // 90
        $passEnde = self::PASS_LEG_COL;                                   // 93
        $push('come', 'come', 'lines', [$wort(self::PRINT_COME)], '', false, [],
            'felt.name.come', [$eins], $eins, self::LINE_MAX, 1, false,
            self::BAND_COL, $bandEnde, self::ROW_COME_BOX, self::ROW_COME_BOX + 1);
        $push('field', 'field', 'lines',
            [$wort(self::PRINT_FIELD), $ziffer(self::PRINT_FIELD_NUMBERS)], '', false,
            [
                // Die zwei eingekreisten Sonderfälle der Vorlage. Der Text ist
                // ihrer, die Quote ist unsere — F-15 rechnet beides gegeneinander.
                ['label' => '2', 'text' => self::PRINT_PAYS_DOUBLE, 'ratio' => [2, 1]],
                ['label' => '12', 'text' => self::PRINT_PAYS_TRIPLE, 'ratio' => [3, 1]],
            ],
            'felt.name.field', [$eins], $eins, 100, 1, false,
            self::BAND_COL, $bandEnde, self::ROW_FIELD, self::ROW_FIELD + 1);
        $push('dont-pass', 'dontline', 'lines', [$wort(self::PRINT_DONT_PASS)], '', false, [],
            'felt.name.dontpass', [$eins], $eins, self::LINE_MAX, 1, false,
            self::BAND_COL, $bandEnde, self::ROW_DONT_PASS, self::ROW_DONT_PASS + 1);
        $push('pass', 'line', 'lines', [$wort(self::PRINT_PASS)], '', false, [],
            'felt.name.pass', [$eins], $eins, self::LINE_MAX, 1, false,
            self::BAND_COL, $passEnde, self::ROW_PASS, self::ROW_PASS + 1);

        /*
         * 4  Die zwei Linien-Odds auf der SCHULTER — dem Streifen unterhalb der
         *    PASS LINE, AUSSERHALB der weißen Umrandung des gedruckten Plans.
         *    Dort liegen am echten Tisch die eigenen Chips des Spielers, und
         *    dort heißt „Odds hinter der Linie“ wörtlich hinter.
         *
         *    Die Reihenfolge bleibt die der Bänder darüber: was oben außen
         *    liegt (die PASS LINE), liegt auch auf der Schulter außen.
         *
         *    Sie tragen als einzige Felder eine Aufschrift, die auf der Vorlage
         *    NICHT steht („ODDS“). Das ist zulässig und nötig, weil die
         *    Schulter außerhalb des gedruckten Plans liegt und ein leerer
         *    gestrichelter Kasten sich nicht selbst erklärt. Vermerkt in
         *    DECISIONS.md.
         */
        $schulterMitte = intdiv(self::BAND_COL + $passEnde, 2);           // 79
        $push('dont-pass-odds', 'odds', 'lines', [$wort(self::PRINT_ODDS)], '', false, [],
            'felt.name.dontpassodds', [], '3-4-5×', self::oddsMax(4, self::LINE_MAX, true), 1, true,
            self::BAND_COL, $schulterMitte, self::ROW_APRON, self::ROW_APRON + 1);
        $push('pass-odds', 'odds', 'lines', [$wort(self::PRINT_ODDS)], '', false, [],
            'felt.name.passodds', [], '3-4-5×', self::ODDS_MULT[6] * self::LINE_MAX, 1, true,
            $schulterMitte, $passEnde, self::ROW_APRON, self::ROW_APRON + 1);

        /*
         * 5  Die vier Hardways — Mittensektion, zwei Zeilen zu zwei Kästen, in
         *    der Reihenfolge der Vorlage:
         *        Hard 6  (3+3, 10 FOR 1)  |  Hard 10 (5+5, 8 FOR 1)
         *        Hard 8  (4+4, 10 FOR 1)  |  Hard 4  (2+2, 8 FOR 1)
         *    Links stehen also die beiden Neuner-Quoten, rechts die beiden
         *    Siebener — nicht die Zahlen der Größe nach. Das ist die Anordnung
         *    des Bildes und zugleich die des üblichen Tisches.
         *
         *    OHNE AUFSCHRIFT: die Vorlage schreibt „Hard 6“ nirgends hin. Sie
         *    zeichnet zwei Würfel mit je drei Augen und darunter die Quote —
         *    das IST die Beschriftung. Wir machen es genauso; wer nicht weiß,
         *    was das heißt, erfährt es aus dem erreichbaren Namen.
         */
        $mitteLinks = self::CENTER_COL;                                   // 40
        $mitteMitte = self::CENTER_COL + 9;                               // 49
        $mitteRechts = self::RIGHT_COL;                                   // 58
        $hardLage = [
            6  => ['col' => $mitteLinks,  'colEnd' => $mitteMitte,  'row' => self::ROW_PLACE],
            10 => ['col' => $mitteMitte,  'colEnd' => $mitteRechts, 'row' => self::ROW_PLACE],
            8  => ['col' => $mitteLinks,  'colEnd' => $mitteMitte,  'row' => self::ROW_COME_ODDS],
            4  => ['col' => $mitteMitte,  'colEnd' => $mitteRechts, 'row' => self::ROW_COME_ODDS],
        ];
        foreach ([6, 10, 8, 4] as $n) {
            $r = self::RATIO_HARD[$n];
            $lage = $hardLage[$n];
            $push(
                "hard-{$n}", 'hard', 'hardways', $ohne, self::forOne($r), false, [],
                'felt.name.hard', [(string)$n, self::forOne($r), self::ratioText($r)],
                self::ratioText($r), 10, 1, false,
                $lage['col'], $lage['colEnd'], $lage['row'], $lage['row'] + 1
            );
        }

        /*
         * 6  Die sechs Einmalwetten der Mitte, in der Anordnung der Vorlage:
         *      Zeile 3  „Seven“ über die volle Breite, als Streifen ÜBER dem
         *               Kasten, mit dem Zahlenaufdruck LINKS UND RECHTS
         *      Zeile 6  die 3 | die 2 | die 12, zu je einem Drittel, ohne Wort
         *      Zeile 7  die 11 über die volle Breite (auf der Vorlage ZWEI
         *               Kästen — eine Wette, zweimal gedruckt, je Tischseite
         *               einmal; siehe PIPS und Felt.html)
         *      Zeile 8  „Any Craps“ über die volle Breite, Aufdruck beidseitig
         *
         * Die Kästen stehen aufrecht, nicht schräg wie auf manchen Tischen:
         * eine gedrehte Beschriftung ist am Bildschirm schlechter zu lesen und
         * für ein Vorleseprogramm ohne jeden Gewinn.
         */
        $drittel1 = $mitteLinks + 6;                                      // 46
        $drittel2 = $mitteLinks + 12;                                     // 52
        $einmal = [
            ['any-seven', [$wort(self::PRINT_SEVEN)],     true,  'felt.name.seven',  [4, 1],  $mitteLinks, $mitteRechts, self::ROW_DONT_COME_ODDS],
            ['three',     $ohne,                          false, 'felt.name.three',  [15, 1], $mitteLinks, $drittel1,    self::ROW_COME],
            ['two',       $ohne,                          false, 'felt.name.two',    [30, 1], $drittel1,   $drittel2,    self::ROW_COME],
            ['twelve',    $ohne,                          false, 'felt.name.twelve', [30, 1], $drittel2,   $mitteRechts, self::ROW_COME],
            ['eleven',    $ohne,                          true,  'felt.name.eleven', [15, 1], $mitteLinks, $mitteRechts, self::ROW_COME_BOX],
            ['any-craps', [$wort(self::PRINT_ANY_CRAPS)], true,  'felt.name.craps',  [7, 1],  $mitteLinks, $mitteRechts, self::ROW_FIELD],
        ];
        foreach ($einmal as [$id, $print, $doppelt, $labelKey, $ratio, $col, $colEnd, $zeile]) {
            $push(
                $id, 'single', 'single', $print, self::forOne($ratio), $doppelt, [],
                $labelKey, [self::forOne($ratio), self::ratioText($ratio)],
                self::ratioText($ratio), 10, 1, false,
                $col, $colEnd, $zeile, $zeile + 1
            );
        }

        /*
         * 7  C & E — die Kreisspalte zwischen Mitten- und Seitensektion.
         *    Sieben E/C-Paare auf der Vorlage: am echten Tisch der Platz je
         *    eines Spielers, hier EIN Feld über die ganze Höhe. In Teil D
         *    (mehrere Personen) werden aus den sechs übrigen Paaren die Plätze
         *    der Mitspieler — dieselbe Begründung wie beim gezeichneten
         *    Spiegel: reservierter Platz, kein Zierrat.
         *
         *    Sie gehört zur BESPIELBAREN Sektion (col >= RIGHT_COL) und wird
         *    deshalb mitgespiegelt; die gespiegelte Kette liegt links von der
         *    Mittensektion, genau wie am echten Tisch.
         *
         *    Ohne Aufschrift und ohne Zahlenaufdruck — die Vorlage druckt an
         *    den Kreisen nichts. Die sichtbaren Buchstaben E und C sind
         *    Zierrat im Feld (Felt.html) und stehen im erreichbaren Namen.
         */
        $push(
            'craps-eleven', 'crapseleven', 'single', $ohne, '', false, [],
            'felt.name.crapseleven', [self::ratioText([3, 1]), self::ratioText([7, 1])],
            self::ratioText([3, 1]), 10, 1, false,
            self::RIGHT_COL, self::NUMBER_COL, self::ROW_DONT_COME_ODDS, self::ROWS + 1
        );

        return $fields;
    }

    /**
     * Die Lage der zwei senkrechten Schenkel. Ein Schenkel ist KEIN eigenes
     * Feld: er gehört zu seinem Knopf und ist im Markup ein <span> darin. Er
     * steht hier als eigene Rechteckangabe, weil zwei Prüfungen ihn brauchen:
     * F-6 (er darf kein anderes Feld überlappen) und F-17 (felt.css muss ihn
     * genau hierhin legen).
     *
     * Der Don't-Pass-Schenkel endet an SEINEM Band (Zeile ROW_DONT_PASS + 1),
     * der Pass-Schenkel an seinem (ROW_PASS + 1) — daher die zwei
     * verschiedenen Höhen. So entstehen die zwei ineinander liegenden L, die
     * die Vorlage als drei geschwungene Linien zeigt.
     *
     * @return array<string, array{col: int, colEnd: int, row: int, rowEnd: int}>
     */
    public static function legLanes(): array
    {
        return [
            'dont-pass' => [
                'col' => self::DP_LEG_COL,
                'colEnd' => self::DP_LEG_COL + self::DP_LEG_WIDTH,
                'row' => self::ROW_DONT_COME,
                'rowEnd' => self::ROW_DONT_PASS + 1,
            ],
            'pass' => [
                'col' => self::PASS_LEG_COL,
                'colEnd' => self::PASS_LEG_COL + self::PASS_LEG_WIDTH,
                'row' => self::ROW_DONT_COME,
                'rowEnd' => self::ROW_PASS + 1,
            ],
        ];
    }

    /**
     * Die drei geschwungenen Linien der Vorlage, in der Wannen-Maßordnung
     * (240 × 140) von Cloth.html — als fertige SVG-Pfadangaben.
     *
     * WARUM SIE NICHT AUS CSS-RAHMEN ENTSTEHEN. Ein L-förmiges Band lässt sich
     * mit den Rahmen zweier rechteckiger Kästen nicht ohne Naht zeichnen: an
     * der Ecke müsste eine Linie mitten in einem Kasten aufhören. Und ein
     * clip-path, der ein Rechteck zum L beschneidet, würde den FOKUSRAHMEN
     * gleich mit abschneiden — derselbe Fehler wie opacity, der in diesem Haus
     * schon dreimal aufgetreten ist. Deshalb: der Umriss ist ein Pfad in der
     * Zeichenschicht, die Knöpfe tragen an dieser Stelle keinen eigenen
     * Rahmen (felt.css), und der Fokusrahmen bleibt unbeschnitten.
     *
     * DIE DREI LINIEN sind, von außen nach innen:
     *   1  die Außenkante der PASS LINE
     *   2  die Linie zwischen PASS LINE und Don't Pass Bar
     *   3  die Innenkante der Don't Pass Bar
     * Genau diese drei zeigt die Vorlage an der geschwungenen Ecke.
     *
     * Die Halbmesser nehmen von außen nach innen um den jeweiligen Abstand ab,
     * damit die drei Linien parallel laufen. Weil der waagerechte und der
     * senkrechte Abstand verschieden sind (Bandbreite gegen Bandhöhe), ist der
     * Bogen elliptisch, nicht kreisrund — SVG kann das unmittelbar.
     *
     * @return list<array{id: string, d: string}>
     */
    public static function bandPaths(): array
    {
        $xInnen = self::gridX(self::BAND_COL);
        $yOben = self::gridY(self::ROW_DONT_COME);

        // Von außen nach innen: (senkrechte Kante, waagerechte Kante)
        $kanten = [
            ['id' => 'pass-outer', 'x' => self::gridX(self::PASS_LEG_COL + self::PASS_LEG_WIDTH), 'y' => self::gridY(self::ROW_PASS + 1)],
            ['id' => 'pass-inner', 'x' => self::gridX(self::PASS_LEG_COL), 'y' => self::gridY(self::ROW_PASS)],
            ['id' => 'dontpass-inner', 'x' => self::gridX(self::DP_LEG_COL), 'y' => self::gridY(self::ROW_DONT_PASS)],
        ];

        $rx = self::CORNER_RX;
        $ry = self::CORNER_RY;
        $pfade = [];
        foreach ($kanten as $i => $kante) {
            if ($i > 0) {
                $rx -= $kanten[$i - 1]['x'] - $kante['x'];
                $ry -= $kanten[$i - 1]['y'] - $kante['y'];
            }
            $pfade[] = [
                'id' => $kante['id'],
                'd' => sprintf(
                    'M %s %s V %s A %s %s 0 0 1 %s %s H %s',
                    self::n($kante['x']), self::n($yOben),
                    self::n($kante['y'] - $ry),
                    self::n($rx), self::n($ry),
                    self::n($kante['x'] - $rx), self::n($kante['y']),
                    self::n($xInnen)
                ),
            ];
        }

        return $pfade;
    }

    /** Gitterlinie → x in der Wannen-Maßordnung. Die Spielfläche ist x 20…220. */
    public static function gridX(int $line): float
    {
        return 20.0 + 200.0 * ($line - 1) / self::COLUMNS;
    }

    /** Gitterlinie → y in der Wannen-Maßordnung. Die Spielfläche ist y 20…120. */
    public static function gridY(int $line): float
    {
        $gesamt = array_sum(self::ROW_FRACTIONS);
        $bisher = array_sum(array_slice(self::ROW_FRACTIONS, 0, $line - 1));

        return 20.0 + 100.0 * $bisher / $gesamt;
    }

    /** Eine Zahl für eine SVG-Pfadangabe: höchstens drei Nachkommastellen. */
    private static function n(float $wert): string
    {
        return rtrim(rtrim(number_format($wert, 3, '.', ''), '0'), '.');
    }

    /**
     * Die Lage des Pucks je Point — für felt.css nicht nötig (dort stehen
     * sieben Regeln), wohl aber für den Nachweis F-6: er rechnet die Regeln
     * gegen diese Tabelle nach.
     *
     * @return array<int, array{col: int, colEnd: int}>
     */
    public static function puckLanes(): array
    {
        // 0 = OFF: der Puck steht über der Mitte der Mittensektion, wie er am
        // echten Tisch neben dem Spielplan liegt, solange kein Point läuft.
        $mitte = intdiv(self::CENTER_COL + self::RIGHT_COL, 2);           // 49
        $lanes = [0 => ['col' => $mitte - 3, 'colEnd' => $mitte + 3]];
        // ON: über dem Zahlenkasten des stehenden Points. Die Reihenfolge ist
        // die des TUCHS (POINTS_ON_CLOTH), nicht die der Regeln (POINTS) —
        // sonst stünde der Puck über der falschen Zahl.
        foreach (self::POINTS_ON_CLOTH as $j => $n) {
            $links = self::NUMBER_COL + self::NUMBER_WIDTH * $j;
            $lanes[$n] = ['col' => $links, 'colEnd' => $links + self::NUMBER_WIDTH];
        }

        return $lanes;
    }
}
