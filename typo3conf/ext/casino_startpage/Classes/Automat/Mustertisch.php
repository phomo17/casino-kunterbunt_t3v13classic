<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Automat;

/**
 * Feste Bezeichner des Mustertisches.
 *
 * WAS DER MUSTERTISCH IST
 * =======================
 * Der Beispieltisch aus CONCEPT.md C.9, Abnahme zu Phase C1: „Ein Beispieltisch
 * OHNE SPIEL lässt sich im Saal öffnen." Er zeigt die geteilten Bausteine des
 * Tisches an einem Tuch mit vier Feldern: Chips legen, stapeln, zurücknehmen,
 * Buy-in wechseln, auszahlen. Er hat KEIN Ergebnis, KEINEN Rundenauslöser und
 * KEINEN Klang — er ist kein Spiel und soll keines werden.
 *
 * WARUM ER IM SITE PACKAGE LIEGT UND NICHT IN EINER EIGENEN EXTENSION
 * ===================================================================
 * Teil A, Abschnitt 5, Grundsatz 2 sagt: „casino_startpage kennt keinen
 * einzelnen Automaten. Es gibt in casino_startpage keinen Verweis auf
 * <ein bestimmtes Gerät>." Der Mustertisch ist kein bestimmtes Gerät, sondern
 * die Vorlage einer Gattung — dasselbe Verhältnis, das das
 * Platzhalter-Gehäuse (Hall/CabinetPlaceholder) seit Teil A zu den Automaten
 * hat. Eine eigene Extension nur für ihn wäre ein viertes Paket, das nie ein
 * Spiel wird, und C.2 zählt die Tisch-Extensions abschließend auf: roulette,
 * blackjack, craps.
 *
 * Er meldet sich über dieselbe Registry an wie ein fremdes Gerät und liegt mit
 * seinem Gehäuse-Partial im selben Verzeichnis, das der Vertrag vorschreibt
 * (Resources/Private/Partials/). Dadurch ist er zugleich der Nachweis, dass
 * der Vertrag vollständig ist: was ihm fehlte, fehlte jedem Tisch.
 *
 * BEWUSST KEINE METHODEN UND KEINE INSTANZEN
 * ==========================================
 * Ein Namensschild, kein Dienst. Der private Konstruktor macht das
 * unmissverständlich, und Configuration/Services.yaml schließt die Datei
 * deshalb vom Container aus.
 */
final class Mustertisch
{
    /** Schlüssel, unter dem sich der Tisch bei der Registry anmeldet. */
    public const IDENTIFIER = 'muster_tisch';

    /** Extension-Key. Hier das Site Package selbst — der einzige Unterschied zu einem echten Tisch. */
    public const EXTENSION_KEY = 'casino_startpage';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'casino_tisch_muster';

    /**
     * Fluid-Partial mit dem Gehäuse, relativ zu Resources/Private/Partials/
     * und ohne Dateiendung — genau wie bei jedem anderen Gerät.
     */
    public const CABINET_PARTIAL = 'Table/MustertischCabinet';

    /** Der Schlüssel des Gerätekredits (B.5.2). Gleich dem Registry-Schlüssel. */
    public const CREDIT_KEY = 'muster_tisch';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:casino_startpage/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:casino_startpage/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
