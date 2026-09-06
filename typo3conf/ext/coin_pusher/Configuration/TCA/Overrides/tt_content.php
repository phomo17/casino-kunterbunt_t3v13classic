<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\CoinPusher\CoinPusher;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Inhaltselement „Coin Pusher".
 *
 * Es stellt den Automaten auf der Seite auf, auf der es liegt. Der Redakteur
 * legt es an, wählt nichts aus und speichert — mehr gibt es hier nicht zu
 * entscheiden.
 *
 * Die Feldliste (zweites Argument) ist leer: das Element hat keine eigene
 * Einstellung. Die Systemfelder — Typ, Spalte, Sprache, Zugriff, Notizen —
 * ergänzt TYPO3 13.3+ von selbst (Core: TcaPreparation::addSystemFieldsToShowitemTypes).
 *
 * Keine eigene Datenbankspalte, deshalb auch keine ext_tables.sql. Der
 * Spielstand liegt im Browser (CONCEPT.md B.9.5), nicht in der Datenbank.
 *
 * Die Gruppe kommt aus casino_startpage, damit alle Casino-Elemente im
 * Assistenten „Neues Inhaltselement" nebeneinander stehen.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => CoinPusher::LANG_BACKEND . 'tt_content.CType.coin_pusher',
        'description' => CoinPusher::LANG_BACKEND . 'tt_content.CType.coin_pusher.description',
        'value' => CoinPusher::CTYPE,
        'icon' => CoinPusher::ICON,
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
