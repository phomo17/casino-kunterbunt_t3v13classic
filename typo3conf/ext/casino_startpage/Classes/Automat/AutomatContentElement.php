<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Automat;

/**
 * Feste Bezeichner des Inhaltselements „Casino-Automat".
 *
 * Einzige Quelle für den CType-Wert, die eigenen tt_content-Spalten und die
 * Gruppe im Typ-Auswahlfeld. TCA, DataProcessor, Backend-Vorschau und Registry
 * greifen alle hierauf zu, damit eine Umbenennung nur an einer Stelle passiert.
 */
final class AutomatContentElement
{
    /** Wert der Spalte tt_content.CType für dieses Inhaltselement. */
    public const CTYPE = 'casino_automat';

    /** Spalte, in der der Registry-Schlüssel des gewählten Automaten steht. */
    public const FIELD_AUTOMAT = 'tx_casinostartpage_automat';

    /** Spalte, in der die vom Redakteur gewählte Zielseite als TypoLink steht. */
    public const FIELD_TARGET = 'tx_casinostartpage_target';

    /** Eigene Gruppe im Typ-Auswahlfeld und im Assistenten „Neues Inhaltselement". */
    public const CTYPE_GROUP = 'casinoKunterbunt';

    /**
     * Ab diesem Index hängen die Automaten-Extensions ihre Partial-Verzeichnisse
     * an tt_content.casino_automat.partialRootPaths an. Index 10 gehört dem
     * Site Package selbst.
     */
    public const PARTIAL_ROOT_PATH_FIRST_INDEX = 100;

    private function __construct() {}
}
