<?php

declare(strict_types=1);

use Phomo17\CasinoAccount\Backend\FormEngine\CurrentBalanceProvider;
use Phomo17\CasinoAccount\Hook\PlayerDataHandlerHook;
use TYPO3\CMS\Backend\Form\FormDataProvider\DatabaseRowDefaultValues;

defined('TYPO3') or die();

/*
 * Diese Datei läuft bei JEDEM nicht gecachten Aufruf. Sie enthält deshalb
 * ausschließlich das, was nirgendwo sonst hingehört: zwei Einhängungen in den
 * DataHandler und eine in die Formularmaschine. Drei Zuweisungen in ein Feld,
 * mehr nicht — keine Abfrage, keine Datei wird gelesen, kein Objekt gebaut.
 */

/*
 * 1. und 2. Der DataHandler.
 *
 * „processDatamapClass" ist die Liste der Klassen, die beim SPEICHERN gefragt
 * werden; „processCmdmapClass" die für Befehle wie Kopieren, Löschen und
 * Zurückholen. Beide Listen liest der Kern in DataHandler.php:665 und :3279.
 *
 * In TYPO3 13.4 gibt es dafür KEIN PSR-14-Ereignis — die ganze Klasse
 * DataHandler.php löst genau eines aus, und das betrifft die Passwortregel
 * (Zeile 1739). Der Hook ist damit der dokumentierte Weg, und die Abweichung
 * von der Hausregel „PSR-14 statt Hooks" ist belegt, nicht bequem.
 */
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_tcemain.php']['processDatamapClass'][]
    = PlayerDataHandlerHook::class;
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_tcemain.php']['processCmdmapClass'][]
    = PlayerDataHandlerHook::class;

/*
 * 3. Die Formularmaschine.
 *
 * Das Feld „Gesamtvermögen" (Spaltenname weiterhin „balance") hat keine
 * Spalte in der Datenbank (siehe Configuration/TCA/tx_casinoaccount_player.php).
 * Beim Öffnen des Formulars stünde deshalb immer 0 darin. Dieser
 * Zusatzlieferant füllt es mit der Summe der drei Beträge.
 *
 * „depends" sagt: er läuft NACH DatabaseRowDefaultValues. Das muss so sein —
 * jener Lieferant ist es, der Felder ohne Datenbankspalte überhaupt erst mit
 * einem leeren Wert versieht (typo3/sysext/backend/Classes/Form/
 * FormDataProvider/DatabaseRowDefaultValues.php); liefe unserer vorher,
 * überschriebe jener unser Ergebnis wieder.
 */
$GLOBALS['TYPO3_CONF_VARS']['SYS']['formEngine']['formDataGroup']['tcaDatabaseRecord'][CurrentBalanceProvider::class] = [
    'depends' => [
        DatabaseRowDefaultValues::class,
    ],
];
