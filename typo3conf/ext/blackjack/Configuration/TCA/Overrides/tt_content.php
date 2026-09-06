<?php

declare(strict_types=1);

use Phomo17\Blackjack\Blackjack;
use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Inhaltselement „Blackjack".
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
        'label' => Blackjack::LANG_BACKEND . 'tt_content.CType.blackjack',
        'description' => Blackjack::LANG_BACKEND . 'tt_content.CType.blackjack.description',
        'value' => Blackjack::CTYPE,
        'icon' => Blackjack::ICON,
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
