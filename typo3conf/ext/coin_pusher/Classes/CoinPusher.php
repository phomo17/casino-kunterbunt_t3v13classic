<?php

declare(strict_types=1);

namespace Phomo17\CoinPusher;

/**
 * Feste Bezeichner des Automaten „Coin Pusher".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, das Gehäuse-Partial,
 * das Icon und die beiden Sprachdatei-Präfixe. ext_localconf.php und die
 * TCA-Überschreibung greifen ausschließlich hierauf zu, damit eine Umbenennung
 * nur an einer einzigen Stelle passiert.
 *
 * Bewusst keine Methoden und keine Instanzen: die Klasse ist ein Namensschild,
 * kein Dienst. Der private Konstruktor macht das unmissverständlich.
 */
final class CoinPusher
{
    /** Schlüssel, unter dem sich der Automat bei der Registry anmeldet. */
    public const IDENTIFIER = 'coin_pusher';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Automat je Extension. */
    public const EXTENSION_KEY = 'coin_pusher';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'coin_pusher';

    /**
     * Fluid-Partial mit dem Gehäuse, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung.
     * Eigener Unterordner, weil der Partial-Name über alle Automaten-Extensions
     * hinweg eindeutig sein muss (siehe casino_startpage/README.md).
     */
    public const CABINET_PARTIAL = 'Automat/CoinPusher/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-coin-pusher';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:coin_pusher/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:coin_pusher/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
