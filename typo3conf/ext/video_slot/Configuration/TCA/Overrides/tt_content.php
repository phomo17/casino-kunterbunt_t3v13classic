<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\AutomatContentElement;
use Phomo17\VideoSlot\VideoSlot;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

defined('TYPO3') or die();

/*
 * Inhaltselement „Video Slot".
 *
 * Es stellt den Automaten auf der Seite auf, auf der es liegt. Der Redakteur
 * legt es an, wählt nichts aus und speichert — mehr gibt es hier nicht zu
 * entscheiden.
 *
 * Die Feldliste (zweites Argument) ist leer: das Element hat keine eigene
 * Einstellung. Die Systemfelder — Typ, Spalte, Sprache, Zugriff, Notizen —
 * ergänzt TYPO3 13.3+ von selbst (Core: TcaPreparation::addSystemFieldsToShowitemTypes).
 * Bewusst ohne Überschriften-Palette: CONCEPT.md Abschnitt 3.2 gibt neben dem
 * Gerät nichts aus, und ein Feld ohne Wirkung verleitet zu Text, den niemand
 * je sieht.
 *
 * Keine eigene Datenbankspalte, deshalb auch keine ext_tables.sql.
 *
 * Die Gruppe kommt aus casino_startpage, damit beide Casino-Elemente im
 * Assistenten „Neues Inhaltselement" nebeneinander stehen.
 */
ExtensionManagementUtility::addRecordType(
    [
        'label' => VideoSlot::LANG_BACKEND . 'tt_content.CType.video_slot',
        'description' => VideoSlot::LANG_BACKEND . 'tt_content.CType.video_slot.description',
        'value' => VideoSlot::CTYPE,
        'icon' => VideoSlot::ICON,
        'group' => AutomatContentElement::CTYPE_GROUP,
    ],
    ''
);
