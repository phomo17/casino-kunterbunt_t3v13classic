<?php

declare(strict_types=1);

namespace Phomo17\Craps;

/**
 * Feste Bezeichner des Spieltisches „Craps".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, das Gehäuse-Partial,
 * das Icon, den Schlüssel des Buy-ins und die beiden Sprachdatei-Präfixe.
 * ext_localconf.php und die TCA-Überschreibung greifen ausschließlich hierauf
 * zu, damit eine Umbenennung nur an einer einzigen Stelle passiert.
 *
 * Diese Klasse trägt KEINE Maßordnung und KEINE Spielregel. Kantenlänge,
 * Wannenmaße, Reibung, Rücksprung und Kippverhalten stehen ausschließlich in
 * Resources/Public/JavaScript/dice-geometry.js und dice-physics.js — dieselbe
 * Entscheidung wie beim Regelwerk des Kartentisches: eine PHP-Spiegelung
 * erzeugt Folgeabschriften, die niemand mehr vergleicht.
 *
 * Bewusst keine Methoden und keine Instanzen: ein Namensschild, kein Dienst.
 * Der private Konstruktor macht das unmissverständlich, und
 * Configuration/Services.yaml schließt die Datei deshalb vom Container aus.
 */
final class Craps
{
    /** Schlüssel, unter dem sich der Tisch bei der Geräte-Registry anmeldet. */
    public const IDENTIFIER = 'craps';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Gerät je Extension. */
    public const EXTENSION_KEY = 'craps';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'craps';

    /**
     * Fluid-Partial mit der Kachel im Saal, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung. Eigener Unterordner,
     * weil der Partial-Name über alle Geräte-Extensions hinweg eindeutig sein
     * muss (casino_startpage/README.md, „Vertrag für das Gehäuse-Partial").
     */
    public const CABINET_PARTIAL = 'Table/Craps/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-craps';

    /**
     * Schlüssel des Gerätekredits (CONCEPT.md B.5.2, am Tisch „Buy-in", C.4).
     * In Phase C6 ungenutzt: es wird noch nicht gesetzt. Er steht hier
     * trotzdem, damit er an derselben Stelle festgelegt ist wie alle anderen
     * Bezeichner und in Phase C7 nicht in einer JavaScript-Datei neu erfunden
     * wird.
     */
    public const CREDIT_KEY = 'craps';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:craps/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:craps/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
