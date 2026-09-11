<?php

declare(strict_types=1);

/**
 * Eine Lobby (CONCEPT.md D.10, D.13).
 *
 * WARUM DIESE TABELLE EINE TCA HAT, OBWOHL SIE NIEMAND BEARBEITET: aus
 * demselben Grund wie tx_casinoaccount_coinfield — D.13 verlangt es, und
 * TYPO3 ergänzt uid/pid/tstamp/crdate ausschließlich aus der TCA
 * (DefaultTcaSchema::enrich).
 *
 * 'hideTable' => true: die Tabelle taucht in keiner Listenansicht auf. Wer
 * darin klickt, kann nur eine laufende Runde zerstören.
 *
 * Alle Spalten 'passthrough': sie existieren, werden gespeichert, erscheinen
 * in keinem Formular und sind über kein Formular änderbar. Geschrieben wird
 * ausschließlich über LobbyRepository.
 *
 * KEIN 'delete', KEIN 'enablecolumns' — Begründung in ext_tables.sql.
 *
 * 'rootLevel' => -1 erlaubt Datensätze auf jeder Seite UND auf pid 0. Diese
 * Extension legt sie auf pid 0 an: Lobbys sind Maschinenzustand mit einer
 * Lebensdauer von Minuten und gehören in keinen Ordner. Damit hängt das
 * Lobby-System auch an keiner Ordnernummer, die im Frontend fehlen könnte —
 * anders als der Kontenordner, den AccountStorage::ensure() braucht.
 */
return [
    'ctrl' => [
        'title' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby',
        'label' => 'game',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'hideTable' => true,
        'adminOnly' => true,
        'rootLevel' => -1,
    ],
    'columns' => [
        'game' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.game',
            'config' => ['type' => 'passthrough'],
        ],
        'seats_max' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.seatsMax',
            'config' => ['type' => 'passthrough'],
        ],
        'state' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.state',
            'config' => ['type' => 'passthrough'],
        ],
        'state_until' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.stateUntil',
            'config' => ['type' => 'passthrough'],
        ],
        'revision' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.revision',
            'config' => ['type' => 'passthrough'],
        ],
        'round_no' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.roundNo',
            'config' => ['type' => 'passthrough'],
        ],
        'seed' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.seed',
            'config' => ['type' => 'passthrough'],
        ],
        'result' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.result',
            'config' => ['type' => 'passthrough'],
        ],
        'owner' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.owner',
            'config' => ['type' => 'passthrough'],
        ],
        'turn_seat' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.turnSeat',
            'config' => ['type' => 'passthrough'],
        ],
        'moves' => [
            'label' => 'LLL:EXT:casino_lobby/Resources/Private/Language/locallang.xlf:tabelle.lobby.moves',
            'config' => ['type' => 'passthrough'],
        ],
    ],
    'types' => [
        '0' => ['showitem' => ''],
    ],
];
