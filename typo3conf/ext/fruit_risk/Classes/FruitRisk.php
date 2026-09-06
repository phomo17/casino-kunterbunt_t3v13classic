<?php

declare(strict_types=1);

namespace Phomo17\FruitRisk;

/**
 * Feste Bezeichner des Automaten „FruitRisk".
 *
 * Einzige Quelle für den Registry-Schlüssel, den CType, die beiden
 * Gehäuse-Partials, das Icon, den Schlüssel des Gerätekredits und die zwei
 * Sprachdatei-Präfixe. ext_localconf.php und die TCA-Überschreibung greifen
 * ausschließlich hierauf zu, damit eine Umbenennung nur an einer einzigen
 * Stelle passiert.
 *
 * Bewusst keine Methoden und keine Instanzen: die Klasse ist ein Namensschild,
 * kein Dienst. Der private Konstruktor macht das unmissverständlich; seit
 * Phase F3 steht die Datei deshalb in der exclude-Zeile von
 * Configuration/Services.yaml, zusammen mit Rules.php.
 */
final class FruitRisk
{
    /** Schlüssel, unter dem sich der Automat bei der Geräte-Registry anmeldet. */
    public const IDENTIFIER = 'fruit_risk';

    /** Extension-Key. Gleichlautend mit dem Schlüssel — ein Gerät je Extension. */
    public const EXTENSION_KEY = 'fruit_risk';

    /** Wert der Spalte tt_content.CType des eigenen Inhaltselements. */
    public const CTYPE = 'fruit_risk';

    /**
     * Fluid-Partial mit der Kachel im Saal, relativ zu
     * Resources/Private/Partials/ und ohne Dateiendung. Eigener Unterordner,
     * weil der Partial-Name über alle Geräte-Extensions hinweg eindeutig sein
     * muss (casino_startpage/README.md, „Vertrag für das Gehäuse-Partial").
     */
    public const CABINET_PARTIAL = 'Automat/FruitRisk/Cabinet';

    /** In Configuration/Icons.php angemeldeter Icon-Bezeichner. */
    public const ICON = 'content-fruit-risk';

    /**
     * Schlüssel des Gerätekredits (CONCEPT.md B.5.2, C.14.10). Er landet im
     * Browserspeicher als casinoKunterbunt.machine.fruit_risk. Nach Phase F2
     * weiterhin ungenutzt — das Gerät ist gestaltet, aber unbedient und nimmt
     * erst ab F4 Geld an. Er steht hier trotzdem, damit er an derselben
     * Stelle festgelegt ist wie alles andere und nicht später in einer
     * JavaScript-Datei erfunden wird.
     */
    public const CREDIT_KEY = 'fruit_risk';

    /** Präfix aller Frontend-Beschriftungen (XLIFF). */
    public const LANG_FRONTEND = 'LLL:EXT:fruit_risk/Resources/Private/Language/locallang.xlf:';

    /** Präfix aller Backend-Beschriftungen (XLIFF). */
    public const LANG_BACKEND = 'LLL:EXT:fruit_risk/Resources/Private/Language/locallang_be.xlf:';

    private function __construct() {}
}
