<?php

declare(strict_types=1);

/**
 * Der Gerätespeicher einer Person (CONCEPT.md D.13).
 *
 * WARUM DIESE TABELLE EINE TCA HAT, OBWOHL SIE NIEMAND BEARBEITET: D.13
 * verlangt „TCA-gestützt, mit den üblichen TYPO3-Verwaltungsspalten". TYPO3
 * ergänzt uid, pid, tstamp und crdate aus genau dieser Datei
 * (DefaultTcaSchema::enrich) — ohne sie fehlten sie der Tabelle.
 *
 * 'hideTable' => true: die Tabelle taucht in keiner Listenansicht auf. Sie
 * enthält einen maschinellen Speicherstand, kein redaktionelles Gut; ein
 * Bearbeiter, der darin herumklickt, kann nur Schaden anrichten.
 *
 * Beide Felder sind 'passthrough': die Spalte existiert, wird gespeichert,
 * erscheint aber in keinem Formular und ist über kein Formular änderbar.
 * Geschrieben wird ausschließlich über CoinFieldRepository.
 *
 * KEIN 'delete' und KEIN 'enablecolumns': ein weggeworfener Feldstand wird
 * gelöscht, nicht als gelöscht markiert. Ein „verstecktes" Spielfeld hätte
 * keine Bedeutung.
 */
return [
    'ctrl' => [
        'title' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:coinfield',
        'label' => 'store_key',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'hideTable' => true,
        'adminOnly' => true,
        'rootLevel' => -1,
    ],
    'columns' => [
        'player' => [
            'label' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:coinfield.player',
            'config' => ['type' => 'passthrough'],
        ],
        'store_key' => [
            'label' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:coinfield.storeKey',
            'config' => ['type' => 'passthrough'],
        ],
        'payload' => [
            'label' => 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:coinfield.payload',
            'config' => ['type' => 'passthrough'],
        ],
    ],
    'types' => [
        '0' => ['showitem' => ''],
    ],
];
