<?php

declare(strict_types=1);

defined('TYPO3') or die();

/*
 * Der Rückverweis vom Schattendatensatz auf den Spielenden.
 *
 * CONCEPT.md D.6.2: der Kern verlangt für eine Frontend-Sitzung einen
 * fe_users-Datensatz. Jeder Spielende bekommt deshalb einen unsichtbaren
 * Schattendatensatz. Diese Spalte ist der Faden zurück.
 *
 * 'passthrough' heißt: gespeichert, aber in keinem Formular sichtbar. Ein
 * Redakteur, der zufällig auf einen fe_users-Datensatz stößt, sieht kein
 * Feld, an dem er etwas verstellen könnte.
 *
 * Die Spalte wird bewusst NICHT in 'types' eingehängt: sie soll auf gar
 * keinem Reiter erscheinen.
 */
$GLOBALS['TCA']['fe_users']['columns']['tx_casinoaccount_player'] = [
    'config' => [
        'type' => 'passthrough',
    ],
];
