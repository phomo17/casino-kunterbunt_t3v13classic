<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Automat;

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

/**
 * Registry aller installierten Spielautomaten.
 *
 * Dies ist die einzige Verbindung zwischen dem Site Package und einer
 * Automaten-Extension. casino_startpage kennt keinen einzelnen Automaten,
 * sondern nur diese Registry und den Vertrag, den {@see Automat} beschreibt.
 *
 * ÖFFENTLICHE API
 * ===============
 *
 * register(Automat $automat): void
 *     Meldet einen Automaten an. AUSSCHLIESSLICH aus der ext_localconf.php der
 *     jeweiligen Automaten-Extension aufrufen — nur dort ist sichergestellt,
 *     dass die Anmeldung sowohl im Backend als auch im Frontend wirkt.
 *     Ein bereits vorhandener Schlüssel wird überschrieben.
 *     Nebenwirkung: das Partial-Verzeichnis des Automaten wird an
 *     tt_content.<CType>.partialRootPaths angehängt, damit der Saal das
 *     Gehäuse-Partial findet.
 *
 * all(): array<string, Automat>
 *     Alle angemeldeten Automaten, Schlüssel => Automat, in der Reihenfolge
 *     der Anmeldung (= Ladereihenfolge der Extensions).
 *
 * get(string $identifier): ?Automat
 *     Ein Automat oder NULL. Wirft NIE eine Ausnahme. Ein unbekannter oder
 *     nachträglich entfernter Schlüssel liefert NULL; Aufrufer im Frontend
 *     überspringen das Element dann stillschweigend.
 *
 * has(string $identifier): bool
 *     Kurzform für „get() liefert nicht NULL".
 *
 * BEISPIEL (ext_localconf.php einer Automaten-Extension)
 * ======================================================
 *
 *     \Phomo17\CasinoStartpage\Automat\AutomatRegistry::register(
 *         new \Phomo17\CasinoStartpage\Automat\Automat(
 *             identifier: 'mein_automat',
 *             title: 'LLL:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.title',
 *             description: 'LLL:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.description',
 *             extensionKey: 'mein_automat',
 *             cabinetPartial: 'Automat/MeinAutomat/Cabinet',
 *         )
 *     );
 *
 * Die Datei EXT:mein_automat/Resources/Private/Partials/Automat/MeinAutomat/Cabinet.html
 * zeichnet dann das Gehäuse. Fehlt sie, zeigt der Saal das Platzhalter-Gehäuse
 * des Site Packages — ohne Fehler.
 *
 * WARUM STATISCH
 * ==============
 * Die Registry wird in ext_localconf.php gefüllt, also lange bevor der
 * DI-Container für den jeweiligen Request steht, und muss danach sowohl von
 * einer TCA-itemsProcFunc (Backend, per GeneralUtility::makeInstance erzeugt)
 * als auch von einem DataProcessor (Frontend, per DI erzeugt) gelesen werden.
 * Ein DI-Service könnte diesen Zustand nicht tragen. Kosten pro nicht
 * gecachtem Request: ein Array-Eintrag je Automat.
 */
final class AutomatRegistry
{
    /** @var array<string, Automat> */
    private static array $automats = [];

    /** @var array<string, true> */
    private static array $publishedPartialRootPaths = [];

    private static int $nextPartialRootPathIndex = AutomatContentElement::PARTIAL_ROOT_PATH_FIRST_INDEX;

    private function __construct() {}

    public static function register(Automat $automat): void
    {
        self::$automats[$automat->identifier] = $automat;
        self::publishCabinetPartialRootPath($automat->cabinetPartialRootPath());
    }

    /**
     * @return array<string, Automat>
     */
    public static function all(): array
    {
        return self::$automats;
    }

    public static function get(string $identifier): ?Automat
    {
        return self::$automats[$identifier] ?? null;
    }

    public static function has(string $identifier): bool
    {
        return isset(self::$automats[$identifier]);
    }

    /**
     * Hängt das Partial-Verzeichnis eines Automaten an die partialRootPaths des
     * Inhaltselements an. Jedes Verzeichnis nur einmal, jeweils mit eigenem Index,
     * damit sich zwei Automaten nicht gegenseitig überschreiben.
     *
     * addTypoScriptSetup() schreibt in
     * $GLOBALS['TYPO3_CONF_VARS']['FE']['defaultTypoScript_setup.']['siteSets'],
     * das der SysTemplateTreeBuilder vor den Site Sets einliest. Die spätere
     * Zuweisung "tt_content.casino_automat = FLUIDTEMPLATE" im Set löscht keine
     * bereits gesetzten Unterschlüssel — der Index bleibt erhalten.
     */
    private static function publishCabinetPartialRootPath(string $path): void
    {
        if (isset(self::$publishedPartialRootPaths[$path])) {
            return;
        }
        self::$publishedPartialRootPaths[$path] = true;

        ExtensionManagementUtility::addTypoScriptSetup(sprintf(
            'tt_content.%s.partialRootPaths.%d = %s',
            AutomatContentElement::CTYPE,
            self::$nextPartialRootPathIndex++,
            $path
        ));
    }
}
