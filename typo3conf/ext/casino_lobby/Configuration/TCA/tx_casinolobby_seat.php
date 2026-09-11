<?php

declare(strict_types=1);

/**
 * Ein Platz an einer Lobby (CONCEPT.md D.10, D.13).
 *
 * Aufbau zeichengleich zu tx_casinolobby_lobby.php — siehe die Erklärung
 * dort (WARUM DIESE TABELLE EINE TCA HAT, 'hideTable', 'passthrough',
 * KEIN 'delete'/'enablecolumns', 'rootLevel' => -1). Geschrieben wird
 * ausschließlich über LobbyRepository.
 */
return [
    'ctrl' => [
        'title' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat',
        'label' => 'seat_no',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'hideTable' => true,
        'adminOnly' => true,
        'rootLevel' => -1,
    ],
    'columns' => [
        'lobby' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.lobby',
            'config' => ['type' => 'passthrough'],
        ],
        'player' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.player',
            'config' => ['type' => 'passthrough'],
        ],
        'seat_no' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.seatNo',
            'config' => ['type' => 'passthrough'],
        ],
        'last_seen' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.lastSeen',
            'config' => ['type' => 'passthrough'],
        ],
        'joined_round' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.joinedRound',
            'config' => ['type' => 'passthrough'],
        ],
        'shooter_no' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.seat.shooterNo',
            'config' => ['type' => 'passthrough'],
        ],
    ],
    'types' => [
        '0' => ['showitem' => ''],
    ],
];
