<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\Roulette\Roulette;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Inhaltselement „Roulette".
 *
 * Es stellt den Spieltisch auf der Seite auf, auf der es liegt. Der Redakteur
 * legt es an, wählt nichts aus und speichert.
 *
 * Die Feldliste (zweites Argument) ist leer: das Element hat keine eigene
 * Einstellung. Die Systemfelder — Typ, Spalte, Sprache, Zugriff, Notizen —
 * ergänzt TYPO3 13.3+ von selbst (Core: TcaPreparation::addSystemFieldsToShowitemTypes).
 *
 * Keine eigene Datenbankspalte, deshalb auch keine ext_tables.sql.
 *
 * Die Gruppe kommt aus casino_startpage, damit alle Casino-Elemente im
 * Assistenten „Neues Inhaltselement" beieinander stehen.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => Roulette::LANG_BACKEND . 'tt_content.CType.roulette',
        'description' => Roulette::LANG_BACKEND . 'tt_content.CType.roulette.description',
        'value' => Roulette::CTYPE,
        'icon' => Roulette::ICON,
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
