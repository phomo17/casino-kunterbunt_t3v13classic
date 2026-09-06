<?php

declare(strict_types=1);

namespace Phomo17\Blackjack;

/**
 * Feste Bezeichner des Spieltisches „Blackjack".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, das Gehäuse-Partial,
 * das Icon, den Schlüssel des Buy-ins und die beiden Sprachdatei-Präfixe.
 * ext_localconf.php und die TCA-Überschreibung greifen ausschließlich hierauf
 * zu, damit eine Umbenennung nur an einer einzigen Stelle passiert.
 *
 * Diese Klasse trägt KEINE Spielregel. Kartenwerte, Ablauf, Hausregeln und
 * Zieh-Schema stehen ausschließlich in
 * Resources/Public/JavaScript/rules-blackjack.js (siehe README, Abschnitt
 * „Die eine Quelle"). Eine PHP-Spiegelung des Regelwerks gibt es bewusst
 * nicht — beim Roulette hat die Spiegelung der Feldliste in BetLayout.php
 * zwei Folgeabschriften erzeugt, die niemand mehr verglichen hat.
 *
 * Bewusst keine Methoden und keine Instanzen: ein Namensschild, kein Dienst.
 * Der private Konstruktor macht das unmissverständlich, und
 * Configuration/Services.yaml schließt die Datei deshalb vom Container aus.
 */
final class Blackjack
{
    /** Schlüssel, unter dem sich der Tisch bei der Geräte-Registry anmeldet. */
    public const IDENTIFIER = 'blackjack';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Gerät je Extension. */
    public const EXTENSION_KEY = 'blackjack';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'blackjack';

    /**
     * Fluid-Partial mit der Kachel im Saal, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung. Eigener Unterordner,
     * weil der Partial-Name über alle Geräte-Extensions hinweg eindeutig sein
     * muss (casino_startpage/README.md, „Vertrag für das Gehäuse-Partial").
     */
    public const CABINET_PARTIAL = 'Table/Blackjack/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-blackjack';

    /**
     * Schlüssel des Gerätekredits (CONCEPT.md B.5.2, am Tisch „Buy-in", C.4).
     * In Phase C4 ungenutzt: es wird noch nicht gesetzt. Er steht hier
     * trotzdem, damit er an derselben Stelle festgelegt ist wie alle anderen
     * Bezeichner und in Phase C5 nicht in einer JavaScript-Datei neu erfunden
     * wird.
     */
    public const CREDIT_KEY = 'blackjack';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:blackjack/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:blackjack/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
