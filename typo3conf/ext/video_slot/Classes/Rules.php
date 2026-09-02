<?php

declare(strict_types=1);

namespace Phomo17\VideoSlot;

/**
 * Das Regelwerk des Video Slot aus CONCEPT.md, Anhang D (B.14).
 *
 * Einzige Quelle für Symbole, Gewinnlinien, Gewinnwerte und die Grundstellung
 * des Sichtfelds. Der CabinetProcessor rechnet daraus Koordinaten; ab Phase 6
 * ziehen Walzenwerk, Auswertung und Nachweisskript ihre Zahlen aus derselben
 * Stelle.
 *
 * Bewusst keine Methoden: die Klasse ist eine Tabelle, kein Dienst.
 */
final class Rules
{
    /** Sichtbare Zeilen, von oben (0) nach unten (2). Anhang D. */
    public const ROWS = 3;

    /** Walzen, von links (1) nach rechts (5). Anhang D. */
    public const REELS = 5;

    /**
     * Die neun Symbole aus B.8.3, in der Rangfolge aus Anhang D von hoch nach
     * niedrig. Der Scatter steht außerhalb dieser Reihe und deshalb am Ende.
     *
     * Sechs davon — kirsche, zitrone, orange, melone, glocke, sieben — sind
     * dieselben Motive wie am Reel Slot. Neu sind pflaume, weintraube und der
     * scatter. Der BAR-Block bleibt dem Reel Slot vorbehalten (B.8.3).
     *
     * @var list<string>
     */
    public const SYMBOLS = [
        'sieben',
        'glocke',
        'weintraube',
        'melone',
        'pflaume',
        'orange',
        'zitrone',
        'kirsche',
        'scatter',
    ];

    /** Das Symbol, das unabhängig von den Linien zahlt (Anhang D, Punkt 3). */
    public const SCATTER = 'scatter';

    /** Das Symbol, dem schon zwei gleiche genügen (Anhang D, Punkt 1). */
    public const SHORT_CHAIN = 'kirsche';

    /**
     * Die fünf festen Gewinnlinien aus Anhang D. Je Linie fünf Zeilennummern,
     * eine je Walze, von links nach rechts. Alle fünf sind immer aktiv.
     *
     * @var array<int, list<int>>
     */
    public const LINES = [
        1 => [1, 1, 1, 1, 1],
        2 => [0, 0, 0, 0, 0],
        3 => [2, 2, 2, 2, 2],
        4 => [0, 0, 1, 2, 2],
        5 => [2, 2, 1, 0, 0],
    ];

    /**
     * Gewinnwerte je Symbol und Kettenlänge, bezogen auf Einsatz 1.
     *
     * Aus der vollständigen Auszählung aller 25⁵ = 9.765.625 Walzenstellungen
     * in Phase 6 (Node-Skript Resources/Private/Scripts/verify-payout.mjs,
     * CONCEPT.md Anhang D): Auszahlungsquote 97,993 % (9.569.630 von
     * 9.765.625 Einsatz-Einheiten), Rangfolge bei jeder Kettenlänge
     * eingehalten. Dieselben Zahlen stehen ein zweites Mal in paytable.js —
     * verify-payout.mjs vergleicht beide Tabellen Wert für Wert in beide
     * Richtungen, damit sie nie auseinanderlaufen.
     *
     * Länge 2 ist nur bei der Kirsche und beim Scatter überhaupt vorgesehen:
     * die Kirsche zahlt ab zwei gleichen (Anhang D, Punkt 1), der Scatter erst
     * ab drei — sein Eintrag für 2 bleibt deshalb dauerhaft null.
     *
     * @var array<string, array<int, int|null>>
     */
    public const PAYTABLE = [
        'sieben'     => [2 => null, 3 => 30, 4 => 180, 5 => 900],
        'glocke'     => [2 => null, 3 => 18, 4 => 100, 5 => 500],
        'weintraube' => [2 => null, 3 => 12, 4 =>  60, 5 => 300],
        'melone'     => [2 => null, 3 =>  9, 4 =>  40, 5 => 200],
        'pflaume'    => [2 => null, 3 =>  7, 4 =>  30, 5 => 120],
        'orange'     => [2 => null, 3 =>  5, 4 =>  18, 5 =>  75],
        'zitrone'    => [2 => null, 3 =>  3, 4 =>  12, 5 =>  50],
        'kirsche'    => [2 => 1,    3 =>  2, 4 =>   8, 5 =>  30],
        'scatter'    => [2 => null, 3 =>  3, 4 =>  10, 5 =>  50],
    ];

    /**
     * Die Grundstellung des Sichtfelds beim Seitenaufruf, Zeile für Zeile.
     *
     * Zwei Bedingungen, beide absichtlich:
     *   - alle NEUN Symbole liegen gleichzeitig im Feld,
     *   - die Stellung ist KEIN Gewinn: auf keiner der fünf Linien stehen ab
     *     Walze 1 zwei gleiche Symbole nebeneinander, und der Scatter liegt
     *     nur einmal im Feld (drei wären ein Scattergewinn).
     * Das Gerät steht damit sichtbar im Grundzustand und zeigt trotzdem sein
     * ganzes Zeichenvorrat.
     *
     * @var array<int, list<string>>
     */
    public const DEFAULT_GRID = [
        0 => ['glocke',  'orange',     'sieben',  'zitrone',    'melone'],
        1 => ['sieben',  'melone',     'kirsche', 'weintraube', 'pflaume'],
        2 => ['pflaume', 'weintraube', 'zitrone', 'scatter',    'orange'],
    ];

    /** Rasterpositionen je Walze. Anhang D nennt 25 als Richtwert; 25^5 = 9.765.625. */
    public const POSITIONS_PER_STRIP = 25;

    /** So oft muss der Scatter im Feld liegen, damit er zahlt (Anhang D, 3). */
    public const SCATTER_MIN = 3;

    /** Bandposition, die beim Seitenaufruf in der MITTLEREN Zeile steht. Erlaubt 0…22. */
    public const DEFAULT_POSITIONS = [1, 1, 1, 1, 1];

    /**
     * Die fünf Walzenbänder, Position 0…24 je Walze; Position 24 grenzt an 0.
     *
     * Vier bauliche Regeln, alle vom Nachweisskript verify-payout.mjs geprüft:
     *   1. genau 25 Positionen je Walze;
     *   2. keine zwei gleichen Symbole nebeneinander, Rundumschluss
     *      eingeschlossen (sonst stünden gestapelte Paare im Fenster);
     *   3. genau ein Scatter je Walze (damit ist je Spalte höchstens einer
     *      sichtbar, die Scatter-Rechnung hängt nur an der Anzahl, kein
     *      Scatterstapel);
     *   4. Position 0/1/2 jeder Walze ergibt von oben nach unten genau die
     *      Spalte dieser Walze aus DEFAULT_GRID — nur so zeigt das Gerät die
     *      seit Phase 5 geprüfte Grundstellung und ist trotzdem aus einem
     *      echten Band gebaut.
     *
     * Innerhalb jeder Walze wachsen die Symbolzahlen entlang der Rangfolge
     * aus Anhang D: je wertvoller eine Kombination, desto seltener.
     *
     * @var array<int, list<string>>
     */
    public const STRIPS = [
        // Walze 1 — Grundstellung 0/1/2: Glocke · Sieben · Pflaume
        [
            'glocke',  'sieben',     'pflaume', 'kirsche',    'zitrone',
            'orange',  'kirsche',    'melone',  'zitrone',    'kirsche',
            'orange',  'weintraube', 'zitrone', 'kirsche',    'pflaume',
            'orange',  'zitrone',    'scatter', 'kirsche',    'melone',
            'orange',  'zitrone',    'glocke',  'weintraube', 'pflaume',
        ],
        // Walze 2 — Grundstellung: Orange · Melone · Weintraube
        [
            'orange',  'melone',  'weintraube', 'kirsche',    'zitrone',
            'kirsche', 'pflaume', 'zitrone',    'kirsche',    'orange',
            'zitrone', 'melone',  'kirsche',    'pflaume',    'zitrone',
            'sieben',  'kirsche', 'orange',     'zitrone',    'pflaume',
            'scatter', 'orange',  'glocke',     'weintraube', 'melone',
        ],
        // Walze 3 — Grundstellung: Sieben · Kirsche · Zitrone
        [
            'sieben',  'kirsche', 'zitrone',    'orange',  'kirsche',
            'melone',  'zitrone', 'kirsche',    'pflaume', 'orange',
            'glocke',  'kirsche', 'zitrone',    'melone',  'orange',
            'pflaume', 'kirsche', 'weintraube', 'orange',  'melone',
            'scatter', 'pflaume', 'glocke',     'zitrone', 'weintraube',
        ],
        // Walze 4 — Grundstellung: Zitrone · Weintraube · Scatter
        [
            'zitrone',    'weintraube', 'scatter', 'kirsche', 'orange',
            'melone',     'kirsche',    'zitrone', 'pflaume', 'orange',
            'kirsche',    'glocke',     'zitrone', 'melone',  'orange',
            'weintraube', 'kirsche',    'pflaume', 'sieben',  'orange',
            'melone',     'zitrone',    'glocke',  'pflaume', 'weintraube',
        ],
        // Walze 5 — Grundstellung: Melone · Pflaume · Orange
        [
            'melone',  'pflaume', 'orange',  'kirsche',    'zitrone',
            'sieben',  'kirsche', 'orange',  'zitrone',    'melone',
            'kirsche', 'glocke',  'zitrone', 'weintraube', 'orange',
            'kirsche', 'pflaume', 'zitrone', 'scatter',    'melone',
            'sieben',  'orange',  'glocke',  'pflaume',    'weintraube',
        ],
    ];

    private function __construct() {}
}
