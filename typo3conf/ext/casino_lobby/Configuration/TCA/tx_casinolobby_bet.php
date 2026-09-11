<?php

declare(strict_types=1);

/**
 * Ein Einsatz einer Runde (CONCEPT.md D.10, D.13).
 *
 * Aufbau zeichengleich zu tx_casinolobby_lobby.php — siehe die Erklärung
 * dort. Geschrieben wird ausschließlich über LobbyRepository.
 *
 * IN D4 SCHREIBT UND LIEST DIESE TABELLE NIEMAND: sie entsteht hier, weil
 * D.11/Anhang I für D4a ausdrücklich „Tabellen nach Anhang I" verlangt.
 * Gefüllt wird sie erst in D5, wenn die drei Tische in der Lobby setzen.
 */
return [
    'ctrl' => [
        'title' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet',
        'label' => 'field',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'hideTable' => true,
        'adminOnly' => true,
        'rootLevel' => -1,
    ],
    'columns' => [
        'lobby' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.lobby',
            'config' => ['type' => 'passthrough'],
        ],
        'player' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.player',
            'config' => ['type' => 'passthrough'],
        ],
        'round_no' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.roundNo',
            'config' => ['type' => 'passthrough'],
        ],
        'field' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.field',
            'config' => ['type' => 'passthrough'],
        ],
        'amount' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.amount',
            'config' => ['type' => 'passthrough'],
        ],
        'outcome' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.bet.outcome',
            'config' => ['type' => 'passthrough'],
        ],
    ],
    'types' => [
        '0' => ['showitem' => ''],
    ],
];
