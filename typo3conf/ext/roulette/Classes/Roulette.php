<?php

declare(strict_types=1);

namespace Phomo17\Roulette;

/**
 * Feste Bezeichner des Spieltisches „Roulette".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, die Gehäuse-Partials,
 * das Icon und die beiden Sprachdatei-Präfixe. ext_localconf.php, die
 * TCA-Überschreibung und der DataProcessor greifen ausschließlich hierauf zu,
 * damit eine Umbenennung nur an einer einzigen Stelle passiert.
 *
 * Bewusst keine Methoden und keine Instanzen: die Klasse ist ein Namensschild,
 * kein Dienst. Der private Konstruktor macht das unmissverständlich, und
 * Configuration/Services.yaml schließt die Datei deshalb vom Container aus.
 */
final class Roulette
{
    /** Schlüssel, unter dem sich der Tisch bei der Geräte-Registry anmeldet. */
    public const IDENTIFIER = 'roulette';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Gerät je Extension. */
    public const EXTENSION_KEY = 'roulette';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'roulette';

    /**
     * Fluid-Partial mit der Kachel im Saal, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung. Eigener Unterordner,
     * weil der Partial-Name über alle Geräte-Extensions hinweg eindeutig sein
     * muss (siehe casino_startpage/README.md).
     */
    public const CABINET_PARTIAL = 'Table/Roulette/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-roulette';

    /**
     * Schlüssel des Gerätekredits (CONCEPT.md B.5.2, am Tisch „Buy-in", C.4).
     * In Phase C2 noch ungenutzt: das Rad kostet nichts, das Tuch entsteht in
     * Phase C3. Er steht hier trotzdem, damit der Schlüssel an derselben
     * Stelle festgelegt ist wie alle anderen und nicht später in einer
     * JavaScript-Datei erfunden wird.
     */
    public const CREDIT_KEY = 'roulette';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:roulette/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:roulette/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
