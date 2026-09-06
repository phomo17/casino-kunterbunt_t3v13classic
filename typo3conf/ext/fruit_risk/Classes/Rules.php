<?php

declare(strict_types=1);

namespace Phomo17\FruitRisk;

/**
 * Das Regelwerk von „FruitRisk" (CONCEPT.md C.14.7, C.14.8, Anhang J).
 *
 * Einzige Quelle für Symbole, Rangfolge, Gewinnlinien, Gewinnwerte, die
 * Feldtreppe, die sechs Walzenbänder und die Grundstellung. Drei Stellen
 * lesen daraus:
 *   - Classes/DataProcessing/CabinetProcessor.php druckt daraus den
 *     Gewinnplan hinter Glas und prüft die Grundstellung gegen die Bänder;
 *   - Resources/Private/Scripts/verify-payout.mjs liest die Datei als TEXT
 *     und zählt damit alle 64.000.000 Stellungen aus;
 *   - ab Phase F4 zieht das Walzenwerk seine Bänder von hier.
 *
 * Dieselben Werte stehen ein zweites Mal in
 * Resources/Public/JavaScript/paytable.js, weil PHP kein JavaScript
 * importieren kann und ein Erzeugungsschritt ein Bauschritt wäre (Teil A,
 * Abschnitt 2, Regel 2). verify-payout.mjs vergleicht beide Tabellen Wert
 * für Wert IN BEIDE RICHTUNGEN; eine dritte, MASCHINELL GEBUNDENE Kopie gibt
 * es nicht — der gedruckte Gewinnplan wird aus dieser Datei erzeugt, nicht
 * abgeschrieben (STAND F3-Behebungslauf, REVIEW-fruitrisk-f3.md [H1]: das
 * schloss zuletzt auch den Fließtext-Hinweis auf die Feldtreppe im
 * Gewinnplan ein, der die Werte vorher noch einmal als Zahlenliteral in
 * locallang.xlf trug — CabinetProcessor::buildFieldLadderNote() liest sie
 * jetzt live von hier). Die README wiederholt die Feldtreppe zusätzlich als
 * Prosa-Tabelle zur Erklärung — eine bewusst UNGEBUNDENE, rein
 * dokumentarische vierte Nennung, kein Nachweis liest sie zurück.
 *
 * Bewusst keine Methoden: die Klasse ist eine Tabelle, kein Dienst.
 *
 * STAND F3b (zweiter Durchgang): STRIPS und DEFAULT_GRID tragen das
 * Ergebnis einer LOKALEN SUCHE (`tune-strips.mjs --lokale-suche`,
 * simuliertes Abkühlen), die von der katalogbasierten Bauform
 * „mehr-a"/„block"/„block" (Messlauf F3-M1) ausging und die drei selbst
 * gesetzten Symmetrieauflagen aus F3a — gleiche Struktur der vier
 * garantierten Walzen, feste Leitfrucht-Verteilung K,K,Z,O, gleiche
 * Struktur der beiden freien Walzen — auf ausdrückliche Erweiterung des
 * Auftrags NICHT mehr voraussetzt: jede der sechs Walzen trägt jetzt ihre
 * eigene, unabhängige Belegung. PAYTABLE ist gegenüber dem ersten Durchgang
 * UNVERÄNDERT (Stellschraube 4 bleibt, wie sie war) — die neue Bandbelegung
 * liegt mit ihr bereits bei Quote 95,48 % im Band 95,0–99,5 %. Der
 * Feldausgleich (P(Feld=1)/P(Feld=2)/P(Feld=3), C.14.8) verbessert sich von
 * 27,85 % auf 26,08 % relative Abweichung, erreicht die geforderten ±10 %
 * aber weiterhin NICHT — ein dokumentierter, bewusst hingenommener Verstoß
 * gegen C.14.8, siehe DECISIONS.md, Einträge zu Phase F3b (beide Durchgänge),
 * für die vollständige Herleitung und die geprüften Alternativen.
 *
 * STAND fünfter Durchgang (Behebungslauf zu REVIEW-fruitrisk-f3.md, auf
 * ausdrückliche Anweisung DER KOORDINATION nach dem vierten Durchgang):
 * STRIPS, DEFAULT_GRID UND PAYTABLE tragen jetzt gemeinsam das Ergebnis
 * einer GEMEINSAMEN Suche (`tune-strips.mjs --joint-suche`) über Geometrie
 * UND Gewinntabelle — PAYTABLE ist NICHT mehr die des ersten Durchgangs,
 * sondern per Potenzabbildung neu abgestimmt (p ≈ 0,883), damit eine
 * geringere Fruchtdichte auf einer der vier garantierten Walzen den
 * Feldausgleich auf 20,78 % drücken kann, ohne die Quote aus dem Band
 * 95,0–99,5 % zu treiben (jetzt 98,16 %). Der Verstoß gegen C.14.8
 * SCHRUMPFT damit von 26,08 % auf 20,78 %, bleibt aber bestehen (unter
 * 10 % wurde nicht erreicht) — siehe DECISIONS.md, Eintrag „Fünfter
 * Durchgang" zu Phase F3c, für den vollständigen Suchverlauf, die
 * geprüften Zwischenstufen und die verworfenen Alternativen.
 *
 * STAND sechster Durchgang (auf ausdrückliche Anweisung DER KOORDINATION
 * nach dem vollen Nachweis zum fünften Durchgang): zwei bis dahin feste
 * Größen kamen als Suchdimension hinzu — Lage UND Anzahl der kleinen
 * Früchte auf den BEIDEN FREIEN Walzen, und ein dichter abgetasteter
 * Katalog UNGLEICHER Mischungen auf den garantierten Walzen. Ergebnis:
 * GENAU ZWEI der vier garantierten Walzen auf das bauliche Minimum
 * zurückgenommen (mit verschiedenen verdoppelten Sorten), die beiden
 * freien Walzen bestätigt unverändert bei „block". Feldausgleich **7,99 %**
 * — UNTER der verlangten Grenze von 10 %. **Der Konzeptverstoß gegen
 * C.14.8 gilt damit als BEHOBEN, nicht mehr nur geschrumpft.** Siehe
 * DECISIONS.md, Eintrag „Sechster Durchgang" zu Phase F3c.
 */
final class Rules
{
    /** Sichtbare Zeilen, von oben (0) nach unten (4). Anhang J. */
    public const ROWS = 5;

    /** Walzen, von links (1) nach rechts (6). Anhang J. */
    public const REELS = 6;

    /** Rasterpositionen je Walze. Anhang J: 20, also 20^6 = 64.000.000. */
    public const POSITIONS_PER_STRIP = 20;

    /** Fester Einsatz einer Runde (C.14.5). Gewinnwerte sind absolute Kredite. */
    public const STAKE = 10;

    /**
     * Die zwölf Symbole in der Rangfolge von hoch nach niedrig.
     *
     * Diese Reihenfolge IST zugleich die Druckreihenfolge des Gewinnplans:
     * der CabinetProcessor füllt die vier Blöcke zu je drei Zeilen genau in
     * dieser Folge. Eine zweite, abweichende Reihenfolge im Markup kann es
     * deshalb nicht mehr geben.
     *
     * Kein Scatter, kein Wild, kein BAR-Block (C.14.6, C.14.15).
     *
     * @var list<string>
     */
    public const SYMBOLS = [
        'sieben',
        'glocke',
        'ananas',
        'apfel',
        'banane',
        'erdbeere',
        'weintraube',
        'melone',
        'pflaume',
        'orange',
        'zitrone',
        'kirsche',
    ];

    /**
     * Die drei kleinen Früchte (C.14.7). Sie zahlen auf BEIDEN Wegen: auf
     * einer Linie wie jedes andere Symbol UND zusätzlich über die
     * Feldzählung. Sie sind ausdrücklich KEINE „Liniensymbole" im Sinne der
     * Bandregel 3 und dürfen deshalb mehrfach in einem Fenster liegen.
     *
     * @var list<string>
     */
    public const SMALL_FRUITS = ['kirsche', 'zitrone', 'orange'];

    /**
     * Die neun Liniensymbole (C.14.6). Für sie gilt Bandregel 3: höchstens
     * einmal je Fünferfenster, also mindestens vier fremde Positionen
     * zwischen zwei gleichen. Daraus folgt Anzahl <= 4 je Band.
     *
     * Abgeleitet statt abgeschrieben wäre hier schöner, aber eine
     * PHP-Konstante darf keinen Funktionsaufruf enthalten; die Liste steht
     * deshalb ausgeschrieben, und der CabinetProcessor prüft beim Rendern,
     * dass SYMBOLS = SMALL_FRUITS + LINE_SYMBOLS ohne Rest aufgeht.
     *
     * @var list<string>
     */
    public const LINE_SYMBOLS = [
        'sieben', 'glocke', 'ananas', 'apfel', 'banane',
        'erdbeere', 'weintraube', 'melone', 'pflaume',
    ];

    /** Ab so vielen gleichen zahlt eine Linie (C.14.7). Für alle zwölf Symbole. */
    public const MIN_CHAIN = 3;

    /** Die vier gedruckten Kettenlängen. Spaltenköpfe des Gewinnplans. */
    public const CHAIN_LENGTHS = [3, 4, 5, 6];

    /**
     * Die Feldtreppe je kleiner Frucht (C.14.7, Anhang J).
     * 0 oder 1 Stück zahlen nichts, ab 6 Stück ist bei 5 Schluss.
     *
     * @var array<int, int>
     */
    public const FIELD_LADDER = [2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5];

    /** Ab dieser Stückzahl gilt der Deckel der Feldtreppe. */
    public const FIELD_CAP_AT = 6;

    /** Höchster Feldgewinn einer Runde: drei Früchte x Deckel 5 (C.14.7). */
    public const FIELD_MAX = 15;

    /**
     * Der höchste Wert, den EINE Linie haben darf (C.14.8). Genau 100 —
     * nicht „höchstens", sondern „genau": PAYTABLE['sieben'][6] trifft ihn.
     * Auf den Rundengewinn gibt es dagegen KEINEN Deckel.
     */
    public const MAX_LINE_VALUE = 100;

    /**
     * Die 30 festen Gewinnlinien. Je Linie sechs Zeilennummern, eine je
     * Walze, von links nach rechts. Alle 30 sind immer aktiv (C.14.7).
     *
     * ERZEUGUNGSREGEL, damit die Tabelle nachvollziehbar und nicht geraten
     * ist: sechs Formen, jede in fünf senkrechten Verschiebungen. Zeile
     * einer Linie = (Form[Walze] + Verschiebung) mod 5.
     *
     *   Form 0  gerade            0  0  0  0  0  0
     *   Form 1  Bogen nach unten  0  1  2  2  1  0
     *   Form 2  Bogen nach oben   0  4  3  3  4  0     (4 = -1, 3 = -2)
     *   Form 3  Zickzack          0  1  0  4  0  1
     *   Form 4  Gegenzickzack     0  4  0  1  0  4
     *   Form 5  Welle             0  1  2  1  0  4
     *
     * Weil alle sechs Formen bei Walze 1 die Ziffer 0 tragen und paarweise
     * verschieden sind, sind die 30 Linien paarweise verschieden. Und weil
     * die fünf Verschiebungen jede Zeile genau einmal treffen, benutzt jede
     * Walze jede Zeile genau sechsmal — das Sichtfeld ist LINIENAUSGEWOGEN,
     * jedes der dreißig Felder liegt auf genau sechs Linien. Beides prüft
     * verify-payout.mjs (P-10).
     *
     * Der Sprung von Zeile 4 auf Zeile 0 durch die Restrechnung ist gewollt
     * und wird ab Phase F4 auch so gezeichnet; er ist der Preis für die
     * Ausgewogenheit, und die Ausgewogenheit ist es, die „Beitrag je Linie"
     * überhaupt zu einer sinnvollen Kennzahl macht.
     *
     * @var array<int, list<int>>
     */
    public const LINES = [
        1  => [0, 0, 0, 0, 0, 0],
        2  => [1, 1, 1, 1, 1, 1],
        3  => [2, 2, 2, 2, 2, 2],
        4  => [3, 3, 3, 3, 3, 3],
        5  => [4, 4, 4, 4, 4, 4],
        6  => [0, 1, 2, 2, 1, 0],
        7  => [1, 2, 3, 3, 2, 1],
        8  => [2, 3, 4, 4, 3, 2],
        9  => [3, 4, 0, 0, 4, 3],
        10 => [4, 0, 1, 1, 0, 4],
        11 => [0, 4, 3, 3, 4, 0],
        12 => [1, 0, 4, 4, 0, 1],
        13 => [2, 1, 0, 0, 1, 2],
        14 => [3, 2, 1, 1, 2, 3],
        15 => [4, 3, 2, 2, 3, 4],
        16 => [0, 1, 0, 4, 0, 1],
        17 => [1, 2, 1, 0, 1, 2],
        18 => [2, 3, 2, 1, 2, 3],
        19 => [3, 4, 3, 2, 3, 4],
        20 => [4, 0, 4, 3, 4, 0],
        21 => [0, 4, 0, 1, 0, 4],
        22 => [1, 0, 1, 2, 1, 0],
        23 => [2, 1, 2, 3, 2, 1],
        24 => [3, 2, 3, 4, 3, 2],
        25 => [4, 3, 4, 0, 4, 3],
        26 => [0, 1, 2, 1, 0, 4],
        27 => [1, 2, 3, 2, 1, 0],
        28 => [2, 3, 4, 3, 2, 1],
        29 => [3, 4, 0, 4, 3, 2],
        30 => [4, 0, 1, 0, 4, 3],
    ];

    /**
     * Gewinnwerte je Symbol und Kettenlänge, als ABSOLUTE KREDITE bei
     * festem Einsatz 10 (C.14.7) — keine Vielfachen.
     *
     * Drei bauliche Bedingungen, alle von verify-payout.mjs geprüft:
     *   1. je Kettenlänge streng fallend entlang SYMBOLS (Rangfolge);
     *   2. je Symbol nicht fallend mit wachsender Kettenlänge;
     *   3. der Höchstwert ist GENAU 100 und steht bei sieben x 6.
     *
     * Vierte Bedingung, aus Entwurfsregel 1: der kleinste Wert (kirsche x 3)
     * ist GRÖSSER ALS 3. Nur dadurch entstehen die Rundengewinne 1, 2 und 3
     * ausschließlich aus der Feldzählung — und nur dadurch ist die
     * ±10-%-Vorgabe eine Aussage über eine exakt berechenbare Größe.
     *
     * Die Tabelle ist FLACH: schon drei Gleiche zahlen viel, sechs Gleiche
     * nur das Knappzweifache davon. Das ist Absicht und folgt C.14.3 — der
     * Spitzengewinn soll niedrig sein, die Spannung liefert die
     * Risiko-Leiter, nicht das Grundspiel.
     *
     * @var array<string, array<int, int>>
     */
    public const PAYTABLE = [
        'sieben'     => [3 => 57, 4 => 71, 5 => 86, 6 => 100],
        'glocke'     => [3 => 51, 4 => 64, 5 => 77, 6 =>  90],
        'ananas'     => [3 => 42, 4 => 57, 5 => 70, 6 =>  85],
        'apfel'      => [3 => 37, 4 => 52, 5 => 64, 6 =>  79],
        'banane'     => [3 => 34, 4 => 47, 5 => 58, 6 =>  71],
        'erdbeere'   => [3 => 30, 4 => 42, 5 => 52, 6 =>  66],
        'weintraube' => [3 => 27, 4 => 37, 5 => 48, 6 =>  60],
        'melone'     => [3 => 25, 4 => 34, 5 => 44, 6 =>  54],
        'pflaume'    => [3 => 21, 4 => 30, 5 => 39, 6 =>  51],
        'orange'     => [3 => 20, 4 => 27, 5 => 36, 6 =>  47],
        'zitrone'    => [3 => 18, 4 => 25, 5 => 32, 6 =>  44],
        'kirsche'    => [3 => 16, 4 => 21, 5 => 30, 6 =>  42],
    ];

    /**
     * Die vier Walzen mit garantierter kleiner Frucht in JEDEM Fenster
     * (Bandregel 4, C.14.8), null-basiert. Die beiden übrigen — 4 und 5,
     * also die rechten zwei — MÜSSEN Fenster ohne kleine Frucht haben
     * können; ohne sie wäre Gewinn 1 unerreichbar (C.14.7).
     *
     * Vier ist die einzig mögliche Zahl: bei sechs garantierten Walzen wäre
     * der kleinste Gewinn rechnerisch 3, bei fünf wäre er rechnerisch 2
     * (kleinste Verteilung von fünf kleinen Früchten auf drei Sorten ohne
     * bauliche Unmöglichkeit: (2,2,1) oder (3,1,1) — Gewinn 1 verlangt
     * (2,1,1) mit GENAU vier Früchten und wäre damit unerreichbar,
     * C.14.7 verletzt), bei drei bräche die Garantie, weil (1,1,1) keine
     * Doppelung enthält. Vier ist zugleich die Untergrenze je einzelner
     * Walze: drei Vorkommen auf einem Ring von POSITIONS_PER_STRIP = 20
     * Positionen decken mit dem größtmöglichen Abstand (je 5, wie Bandregel 4
     * ihn für die Fensterbreite verlangt) höchstens 3 × 5 = 15 Positionen ab,
     * nie alle 20 — siehe REVIEW-fruitrisk-f3.md [H2] und DECISIONS.md,
     * Eintrag zum vierten Durchgang, für die ausführliche Herleitung dieser
     * Untergrenze.
     *
     * @var list<int>
     */
    public const GUARANTEED_REELS = [0, 1, 2, 3];

    /**
     * Bandposition, die beim Seitenaufruf in der OBERSTEN Zeile steht.
     *
     * Bandregel 5 legt sie auf 0 fest: die Positionen 0 bis 4 jeder Walze
     * ergeben von oben nach unten genau die Spalte dieser Walze aus
     * DEFAULT_GRID. Die Konstante steht trotzdem hier, damit das Walzenwerk
     * in Phase F4 sie nicht neu erfindet.
     *
     * @var list<int>
     */
    public const DEFAULT_POSITIONS = [0, 0, 0, 0, 0, 0];

    /**
     * Die Grundstellung des Sichtfelds beim Seitenaufruf, Zeile für Zeile,
     * je Zeile sechs Symbolnamen von links nach rechts.
     *
     * Die Rotation der sechs Bänder ist so gewählt, dass sie ALLE ZWÖLF
     * Symbole gleichzeitig zeigt (siehe „STAND F3-Behebungslauf" unten). Die
     * Regel des Fünf-Walzen-Geräts, dass die Grundstellung KEIN Gewinn sein
     * darf, gilt hier NICHT und kann nicht gelten: in diesem Gerät ist jede
     * Stellung ein Gewinn (C.14.8). Ihr Gewinnwert wird stattdessen
     * ausgewiesen — von verify-payout.mjs berechnet (P-17-Block) und in der
     * README genannt.
     *
     * Diese Werte sind KEINE freie Wahl: sie folgen zwingend aus den
     * Positionen 0 bis 4 der sechs Bänder (Bandregel 5). tune-strips.mjs
     * gibt sie deshalb zusammen mit STRIPS aus.
     *
     * STAND F3b (zweiter Durchgang): Ergebnis der lokalen Suche
     * (`tune-strips.mjs --lokale-suche`, siehe Kopfkommentar dieser Klasse
     * und DECISIONS.md). Jede Walze hat seitdem ihre eigene, unabhängige
     * Belegung — es gibt keine gemeinsame Bauform mehr, aus der sich diese
     * Grundstellung „ablesen" ließe.
     *
     * STAND F3-Behebungslauf (REVIEW-fruitrisk-f3.md [M7], erster Anlauf):
     * die damalige Grundstellung zeigte nur 7 der 12 Symbole — behoben durch
     * einmaliges Durchrotieren der sechs Bänder (Rotation ist mathematisch
     * FOLGENLOS, siehe STRIPS-Kommentar unten). Nach jedem weiteren Durchgang,
     * der die Bänder geändert hat (fünfter und sechster Durchgang, siehe
     * STRIPS-Kommentar), wurde dieselbe Rotationssuche für die JEWEILS NEUEN
     * Bänder wiederholt — zuletzt (sechster Durchgang) Fensterstart je Walze
     * 5/0/0/0/0/0. Die jetzige Grundstellung zeigt wieder alle zwölf Symbole.
     *
     * @var array<int, list<string>>
     */
    public const DEFAULT_GRID = [
        0 => ['kirsche', 'orange', 'zitrone', 'orange', 'kirsche', 'kirsche'],
        1 => ['weintraube', 'ananas', 'kirsche', 'ananas', 'zitrone', 'zitrone'],
        2 => ['melone', 'apfel', 'orange', 'apfel', 'orange', 'orange'],
        3 => ['pflaume', 'banane', 'kirsche', 'banane', 'glocke', 'glocke'],
        4 => ['sieben', 'erdbeere', 'erdbeere', 'erdbeere', 'ananas', 'ananas'],
    ];

    /**
     * Die sechs Walzenbänder, Position 0…19 je Walze; Position 19 grenzt
     * an 0. Die SECHS verbindlichen Bandregeln aus C.14.8, dazu die selbst
     * gesetzte siebte (Vollständigkeit) — welche Regel welche Nummer in
     * verify-payout.mjs trägt, steht dort in EINER Zuordnungstabelle
     * (Kopfkommentar vor `checkStripsStructure()`), nicht hier ein zweites
     * Mal:
     *
     *   1. genau 20 Positionen je Walze;
     *   2. keine zwei gleichen Symbole nebeneinander, Rundumschluss
     *      eingeschlossen;
     *   3. jedes der NEUN Liniensymbole höchstens einmal je Fünferfenster —
     *      also mindestens vier fremde Positionen zwischen zwei gleichen;
     *      die drei kleinen Früchte sind davon ausgenommen;
     *   4. die vier Walzen aus GUARANTEED_REELS tragen in JEDEM Fenster
     *      mindestens eine kleine Frucht, die beiden übrigen haben Fenster
     *      ohne;
     *   5. Position 0 bis 4 jeder Walze ergibt von oben nach unten die
     *      Spalte dieser Walze aus DEFAULT_GRID;
     *   6. innerhalb der NEUN LINIENSYMBOLE (siehe LINE_SYMBOLS) wachsen die
     *      Symbolzahlen entlang ihrer Rangfolge: je wertvoller, desto
     *      seltener. Die drei kleinen Früchte sind davon ausgenommen — wie
     *      schon von Bandregel 3, weil sie eine eigene Mechanik (Feldtreppe)
     *      und eine eigene bauliche Vorgabe (Bandregel 4, Entwurfsregel 2:
     *      Leitfrucht) haben, keinen printed-rank-getriebenen Seltenheitswert
     *      (siehe DECISIONS.md, Eintrag zu Phase F3a);
     *   7. jedes der zwölf Symbole liegt mindestens einmal auf jedem Band,
     *      damit kein gedruckter Wert unerreichbar ist.
     *
     * HERKUNFT (STAND F3b, zweiter Durchgang). Ausgangspunkt war die
     * Bauform „mehr-a"/„block"/„block" aus Messlauf F3-M1: vier garantierte
     * Walzen mit derselben Struktur (vier gleichmäßig verteilte
     * Grundpositionen 0/5/10/15 einer Leitfrucht, die beiden anderen Sorten
     * dicht daneben, eine davon mit einer zusätzlichen Kopie), zwei freie
     * Walzen mit demselben zusammenhängenden Dreierblock. Auf ausdrückliche
     * Erweiterung des Auftrags — der Feldausgleich ist eine harte Vorgabe
     * aus C.14.8 — hat eine LOKALE SUCHE (`tune-strips.mjs --lokale-suche`,
     * simuliertes Abkühlen über einzelne Positionstausche und
     * Symbolersetzungen je Walze) diese gemeinsame Bauform anschließend
     * AUFGEGEBEN: jede der sechs Walzen trägt jetzt ihre eigene,
     * unabhängige Belegung, gefunden durch schrittweise, regelerhaltende
     * Änderungen. Insbesondere gilt die schöne Eigenschaft „eine Walze
     * zeigt genau eine kleine Frucht ⇒ es ist immer die Leitfrucht" NICHT
     * mehr uneingeschränkt (z. B. trägt Walze 1 auf Position 5 jetzt
     * Zitrone statt der ursprünglichen Leitfrucht Kirsche) — Bandregel 4
     * gilt für jede Walze trotzdem, geprüft direkt an allen 20 Fenstern
     * (`checkGuarantee()`/P-4 in verify-payout.mjs), nicht mehr aus der
     * eleganten Grundpositionen-Konstruktion hergeleitet.
     *
     * Erfüllt alle sieben Bandregeln oben (verify-payout.mjs --schnell,
     * P-1 bis P-7, grün) und liegt mit der UNVERÄNDERTEN PAYTABLE aus dem
     * ersten Durchgang bei Quote 95,48 % im Band 95,0–99,5 %. Der
     * Feldausgleich (P(Feld=1)/P(Feld=2)/P(Feld=3)) verbessert sich
     * gegenüber „mehr-a"/„block"/„block" von 27,85 % auf 26,08 % relative
     * Abweichung, erreicht die geforderten ±10 % aber weiterhin NICHT — ein
     * dokumentierter Verstoß gegen C.14.8, siehe DECISIONS.md, Einträge zu
     * Phase F3b (beide Durchgänge), für die vollständige Herleitung, die
     * Suchlaufzahlen und die geprüften Alternativen.
     *
     * VIERTER DURCHGANG (Behebungslauf zu REVIEW-fruitrisk-f3.md [H2]): der
     * Review hat nachgewiesen, dass keiner der drei Durchgänge oben die
     * FRUCHTGEOMETRIE der vier garantierten Walzen als Suchdimension
     * geführt hat — alle vier trugen bis dahin die sieben Fruchtpositionen
     * {0,1,2,3,5,10,15} des allerersten Katalogs, was P(Runde=1) auf
     * höchstens (13/20)^6 ≈ 7,54 % deckelte. `tune-strips.mjs
     * --geometrie-suche` öffnete die Dimension per Koordinatenabstieg —
     * bei UNVERÄNDERTER PAYTABLE riss aber jede Verbesserung die Quote
     * unter 95 %, weshalb dieser Durchgang die damalige Belegung (26,08 %
     * Ausgleich) unverändert ließ.
     *
     * FÜNFTER DURCHGANG (auf ausdrückliche Anweisung DER KOORDINATION nach
     * dem vierten Durchgang): die Bindung „PAYTABLE unverändert" war eine
     * selbst auferlegte Einschränkung, keine Konzeptvorgabe — PAYTABLE ist
     * frei wählbar, einzige harte Bindung ist der Höchstwert GENAU 100 und
     * die Rangfolge. `tune-strips.mjs --joint-suche` (neu) sucht Geometrie
     * UND Gewinntabelle GEMEINSAM: zu jeder Geometrie wird per
     * Potenzabbildung (`neu = 100 · (alt/100)^p`, hält 100 exakt fest) der
     * Exponent gesucht, der die Quote ins Band bringt, ERST DANACH wird die
     * Geometrie nach ihrem Ausgleich bewertet. Ergebnis: GENAU EINE der vier
     * garantierten Walzen (hier: Walze 1) auf eine Zwischenstufe von fünf
     * Fruchtpositionen zurückgenommen (Grundgitter 0/5/10/15 plus eine
     * Zusatzposition) verbessert den Ausgleich auf 20,78 % — eine echte,
     * deutliche Verbesserung. Bemerkenswert und eigens gegengeprüft: ZWEI,
     * DREI oder alle VIER garantierten Walzen gleichzeitig zurückzunehmen
     * verschlechtert den Ausgleich wieder drastisch (66–75 % statt 20,78 %,
     * siehe DECISIONS.md) — der Ausgleich ist NICHT monoton in der Anzahl
     * reduzierter Walzen, das Optimum liegt bei GENAU EINER. Die restlichen
     * drei garantierten Walzen und beide freien Walzen bleiben bei der
     * Bauform aus dem zweiten Durchgang („mehr-a"/„block"/„block" —
     * Koordinatenabstieg fand dafür keine bessere Alternative). PAYTABLE
     * wurde mit Exponent p ≈ 0,883 neu abgestimmt (siehe eigener
     * Kopfkommentar dort); Quote danach 98,16 % im Band 95,0–99,5 %.
     * Vollständiger Suchverlauf, die Zwischenwerte für 0–4 reduzierte
     * Walzen und die verworfenen Alternativen: DECISIONS.md, Eintrag
     * „Fünfter Durchgang" zu Phase F3c.
     *
     * SECHSTER DURCHGANG (auf ausdrückliche Anweisung DER KOORDINATION nach
     * dem vollen Nachweis zum fünften Durchgang — dort lag der Ausgleich im
     * ROHERGEBNIS bei 18,25 %, nicht bei den 20,78 % des Feldmaßes, siehe
     * DECISIONS.md und M1): zwei weitere, bis dahin unbewegte Größen kamen
     * hinzu — die LAGE UND ANZAHL der kleinen Früchte auf den BEIDEN FREIEN
     * Walzen (bis dahin fest auf „block", einem Strukturbeweis aus dem
     * ZWEITEN Durchgang, der nur die Vereinigungsmenge minimiert, nicht
     * nachweislich den Ausgleich bei inzwischen asymmetrischen garantierten
     * Walzen), und ein dichter abgetasteter Katalog ungleicher Mischungen
     * auf den garantierten Walzen (nicht mehr nur „0 bis 4 auf derselben
     * Stufe", sondern unabhängige Zwischenstufen je Walze). Ein erster
     * Koordinatenabstieg vom fünften Durchgang aus fand KEINE Verbesserung
     * (20,78 % blieb bestehen) — erst ein Mehrfachstart aus zufälligen,
     * weit entfernten Startpunkten fand ein GANZ ANDERES, deutlich besseres
     * Gebiet: GENAU ZWEI der vier garantierten Walzen (hier: Walzen 2 und 4)
     * auf das bauliche Minimum von vier Fruchtpositionen zurückgenommen —
     * mit VERSCHIEDENEN verdoppelten Sorten je Walze —, die beiden übrigen
     * garantierten Walzen UNVERÄNDERT auf der Bauform des zweiten
     * Durchgangs, beide freien Walzen UNVERÄNDERT auf „block" (der
     * Strukturbeweis hält also stand, sobald man ihn gegenprüft statt nur
     * angenommen hat). Ausgleich **7,99 %** — UNTER der verlangten Grenze
     * von 10 %. In 20 unabhängigen Mehrfachstarts kehrte dieses Ergebnis
     * siebenmal identisch wieder (robuster Anziehungspunkt, kein Zufallstreffer);
     * weder ein zweiter Koordinatenabstieg noch ein Paar-Nachlauf (2-opt)
     * fanden danach noch etwas Besseres. PAYTABLE wurde mit Exponent
     * p ≈ 0,817 neu abgestimmt; Quote danach 97,90 % im Band 95,0–99,5 %.
     * **C.14.8 gilt damit als erfüllt — kein Verstoß mehr.** Vollständiger
     * Suchverlauf: DECISIONS.md, Eintrag „Sechster Durchgang" zu Phase F3c.
     *
     * @var array<int, list<string>>
     */
    public const STRIPS = [
        0 => ['kirsche', 'weintraube', 'melone', 'pflaume', 'sieben', 'kirsche', 'glocke', 'ananas', 'apfel', 'banane', 'kirsche', 'erdbeere', 'weintraube', 'melone', 'pflaume', 'kirsche', 'zitrone', 'orange', 'zitrone', 'erdbeere'],
        1 => ['orange', 'ananas', 'apfel', 'banane', 'erdbeere', 'orange', 'weintraube', 'melone', 'pflaume', 'sieben', 'kirsche', 'glocke', 'ananas', 'apfel', 'banane', 'zitrone', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
        2 => ['zitrone', 'kirsche', 'orange', 'kirsche', 'erdbeere', 'zitrone', 'weintraube', 'melone', 'pflaume', 'sieben', 'zitrone', 'glocke', 'ananas', 'apfel', 'banane', 'zitrone', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
        3 => ['orange', 'ananas', 'apfel', 'banane', 'erdbeere', 'orange', 'weintraube', 'melone', 'pflaume', 'sieben', 'kirsche', 'glocke', 'ananas', 'apfel', 'banane', 'zitrone', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
        4 => ['kirsche', 'zitrone', 'orange', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'melone', 'pflaume', 'sieben', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
        5 => ['kirsche', 'zitrone', 'orange', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'melone', 'pflaume', 'sieben', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
    ];

    private function __construct() {}
}
