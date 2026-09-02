<?php

declare(strict_types=1);

namespace Phomo17\ReelSlot;

/**
 * Feste Bezeichner des Automaten „Reel Slot".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, das Gehäuse-Partial,
 * das Icon und die beiden Sprachdatei-Präfixe. ext_localconf.php und die
 * TCA-Überschreibung greifen ausschließlich hierauf zu, damit eine Umbenennung
 * nur an einer einzigen Stelle passiert.
 *
 * Bewusst keine Methoden und keine Instanzen: die Klasse ist ein Namensschild,
 * kein Dienst. Der private Konstruktor macht das unmissverständlich.
 */
final class ReelSlot
{
    /** Schlüssel, unter dem sich der Automat bei der Registry anmeldet. */
    public const IDENTIFIER = 'reel_slot';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Automat je Extension. */
    public const EXTENSION_KEY = 'reel_slot';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'reel_slot';

    /**
     * Fluid-Partial mit dem Gehäuse, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung.
     * Eigener Unterordner, weil der Partial-Name über alle Automaten-Extensions
     * hinweg eindeutig sein muss (siehe casino_startpage/README.md).
     */
    public const CABINET_PARTIAL = 'Automat/ReelSlot/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-reel-slot';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:reel_slot/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:reel_slot/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
