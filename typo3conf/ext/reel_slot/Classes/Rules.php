<?php

declare(strict_types=1);

namespace Phomo17\ReelSlot;

/**
 * Die festgeschriebenen Spielgrundlagen des Automaten.
 *
 * Quelle: CONCEPT.md, Anhang C (Teil B, Abschnitt B.13). Anhang C ersetzt den
 * ursprünglichen Anhang A vollständig, seit der Auftraggeber die Zielquote
 * auf 98,000 % angehoben hat. Die hier stehende Verteilung ist eine von 3521
 * durch vollständige Auszählung aller 8000 Kombinationen gefundenen
 * Verteilungen, die exakt 7840 der 8000 Einsatz-Einheiten treffen (Quote
 * 0,98000) und zusätzlich die in Phase 2 verlangte Zusatzbedingung erfüllen:
 * je höher der Gewinnwert einer Dreierkombination, desto seltener darf sie
 * vorkommen. Ausgewählt wurde sie aus diesen 3521 Treffern, weil sie die
 * Trefferhäufigkeit des bisherigen Geräts (0,40850) auf die fünfte
 * Nachkommastelle genau hält und weil der Jackpot mit 1 zu 4000 innerhalb des
 * in Anhang C erlaubten Bandes 1:1000 bis 1:4000 liegt. Die Abwägung und die
 * verworfenen Alternativen stehen in DECISIONS.md unter „Ausbaustufe 2,
 * Phase 2 (Teil a: Walzenbänder)".
 *
 * Symbolzahlen je Walze (Anhang C):
 *   Kirsche 8/9/5 · Zitrone 3/3/4 · Orange 2/3/2 · Melone 2/2/2
 *   Glocke 2/1/3 · BAR 2/1/2 · Sieben 1/1/2 · Summe je 20
 *
 * Sie ist Teil der Spezifikation und darf nicht verändert werden —
 * Resources/Private/Scripts/verify-payout.mjs weist sie rechnerisch nach.
 *
 * Bewusst keine Methoden und keine Instanzen: die Klasse ist ein Datenblatt,
 * kein Dienst. Der private Konstruktor macht das unmissverständlich —
 * dieselbe Bauform wie ReelSlot.php.
 */
final class Rules
{
    /**
     * Die sieben Symbole. Die Schlüssel sind zugleich die IDs der
     * SVG-Definitionen (#rs-sym-<schluessel>) und die Werte im
     * data-rs-strip-Attribut, das Phase 6 aus dem DOM liest.
     *
     * @var list<string>
     */
    public const SYMBOLS = [
        'kirsche',
        'zitrone',
        'orange',
        'melone',
        'glocke',
        'bar',
        'sieben',
    ];

    /**
     * Die drei Walzenbänder, Position 1 bis 20. Position 20 grenzt an
     * Position 1 — auf keiner Walze stehen zwei gleiche Symbole
     * nebeneinander, auch nicht über diesen Rundumschluss.
     *
     * Symbolzahlen je Walze (Anhang C):
     *   Kirsche 8/9/5 · Zitrone 3/3/4 · Orange 2/3/2 · Melone 2/2/2
     *   Glocke 2/1/3 · BAR 2/1/2 · Sieben 1/1/2 · Summe je 20
     *
     * @var list<list<string>>
     */
    public const STRIPS = [
        // Walze 1
        [
            'kirsche', 'zitrone', 'orange', 'kirsche', 'melone',
            'kirsche', 'glocke', 'bar', 'kirsche', 'zitrone',
            'kirsche', 'sieben', 'orange', 'kirsche', 'zitrone',
            'kirsche', 'melone', 'glocke', 'kirsche', 'bar',
        ],
        // Walze 2
        [
            'kirsche', 'zitrone', 'kirsche', 'orange', 'kirsche',
            'melone', 'glocke', 'kirsche', 'zitrone', 'kirsche',
            'orange', 'kirsche', 'bar', 'kirsche', 'zitrone',
            'orange', 'kirsche', 'melone', 'kirsche', 'sieben',
        ],
        // Walze 3
        [
            'kirsche', 'zitrone', 'glocke', 'orange', 'kirsche',
            'melone', 'zitrone', 'bar', 'kirsche', 'glocke',
            'sieben', 'zitrone', 'kirsche', 'orange', 'melone',
            'glocke', 'kirsche', 'zitrone', 'bar', 'sieben',
        ],
    ];

    /** Rasterpositionen je Walze. */
    public const POSITIONS_PER_STRIP = 20;

    private function __construct() {}
}
