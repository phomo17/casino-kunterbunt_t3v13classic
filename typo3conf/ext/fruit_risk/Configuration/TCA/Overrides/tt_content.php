<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\FruitRisk\FruitRisk;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Inhaltselement „FruitRisk".
 *
 * Es stellt den Automaten auf der Seite auf, auf der es liegt. Der Redakteur
 * legt es an, wählt nichts aus und speichert — mehr gibt es hier nicht zu
 * entscheiden.
 *
 * Die Feldliste (zweites Argument) ist leer: das Element hat keine eigene
 * Einstellung. Der Einsatz ist fest 10 (CONCEPT.md C.14.5), und es gibt nichts,
 * was ein Redakteur an diesem Gerät einstellen könnte. Die Systemfelder — Typ,
 * Spalte, Sprache, Zugriff, Notizen — ergänzt TYPO3 seit 13.3 von selbst.
 * Bewusst ohne Überschriften-Palette: die Seite gibt neben dem Gerät nichts
 * aus, und ein Feld ohne Wirkung verleitet zu Text, den niemand je sieht.
 *
 * Keine eigene Datenbankspalte, deshalb auch keine ext_tables.sql
 * (CONCEPT.md C.14.15).
 *
 * Die Gruppe kommt aus casino_startpage, damit alle Geräte-Elemente im
 * Assistenten „Neues Inhaltselement" beieinander stehen. Das ist eine
 * Konstante des Site Packages, kein Gerätename — sie koppelt nichts.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => FruitRisk::LANG_BACKEND . 'tt_content.CType.fruit_risk',
        'description' => FruitRisk::LANG_BACKEND . 'tt_content.CType.fruit_risk.description',
        'value' => FruitRisk::CTYPE,
        'icon' => FruitRisk::ICON,
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
