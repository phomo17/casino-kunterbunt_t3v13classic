<?php

declare(strict_types=1);

use Phomo17\CasinoAccount\Authentication\PlayerAuthenticationService;
use Phomo17\CasinoAccount\Backend\FormEngine\CurrentBalanceProvider;
use Phomo17\CasinoAccount\Hook\PlayerDataHandlerHook;
use TYPO3\CMS\Backend\Form\FormDataProvider\DatabaseRowDefaultValues;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

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

/*
 * 4. Der Anmeldedienst (CONCEPT.md D.6.2).
 *
 * addService() ist in 13.4 unverändert vorhanden und nicht abgekündigt
 * (nachgesehen in ExtensionManagementUtility.php, Zeile 650). Der Kern meldet
 * seinen eigenen Passwortdienst auf demselben Weg an
 * (core/ext_localconf.php, Zeile 67) — mit 'priority' => 50.
 *
 * PRIORITÄT 80: unser Dienst wird VOR dem Passwortdienst des Kerns gefragt.
 * Das ist nicht nur schneller, es ist auch die richtige Reihenfolge: wir
 * kennen ein Merkmal, das der Kern nicht kennt, und wenn wir es finden, hat
 * niemand sonst etwas zu prüfen.
 *
 * NUR ZWEI UNTERTYPEN: 'getUserFE' und 'authUserFE'. Kein 'processLoginDataFE'
 * (wir haben kein Passwort umzurechnen) und ausdrücklich nichts mit 'BE' —
 * die Anmeldung am Backend bleibt vollständig beim Kern.
 */
ExtensionManagementUtility::addService(
    'casino_account',
    'auth',
    PlayerAuthenticationService::class,
    [
        'title' => 'Casino Kunterbunt – Anmeldung mit Kennung',
        'description' => 'Meldet einen Spielenden über seine Kennung an, ohne Passwort (CONCEPT.md D.6.2).',
        'subtype' => 'getUserFE,authUserFE',
        'available' => true,
        'priority' => 80,
        'quality' => 80,
        'os' => '',
        'exec' => '',
        'className' => PlayerAuthenticationService::class,
    ]
);

/*
 * 5. Die Begrenzung der Anmeldeversuche (CONCEPT.md D.9): „höchstens 10 je
 *    Minute und Absender; danach eine Sperre von einer Minute."
 *
 * NICHTS SELBST GEBAUT. Der Kern bringt die Zählung mit: RateLimiterFactory
 * ::createLoginRateLimiter() liest genau diese beiden Werte, und
 * FrontendUserAuthenticator ruft sie bei jedem Anmeldeversuch
 * (isActiveLogin) auf, verbraucht einen Zähler und setzt ihn bei Erfolg
 * zurück. Die VORGABE des Kerns ist bereits 10 Versuche — aber im Fenster von
 * 15 Minuten (DefaultConfiguration.php, Zeilen 1532/1533). Zu ändern ist
 * deshalb nur das Fenster.
 *
 * Der Wert 10 wird trotzdem AUSDRÜCKLICH gesetzt: er ist eine Zusage dieses
 * Projekts, keine Übernahme einer fremden Vorgabe, und eine spätere Änderung
 * der Kern-Vorgabe soll unsere Regel nicht stillschweigend verschieben.
 *
 * WIRKUNG: das gleitende Fenster erlaubt zehn Versuche je Minute je
 * Absenderadresse; der elfte wird abgewiesen, und der Kern nennt in der
 * Antwort den Zeitpunkt, ab dem es weitergeht — bis zu eine Minute später.
 * Das ist die „Sperre von einer Minute" aus D.9.
 *
 * WARUM HIER UND NICHT IN typo3conf/system/settings.php: dies ist eine Regel
 * DIESER Extension. In dieser Anlage gibt es überhaupt nur eine
 * Frontend-Anmeldung, nämlich unsere. Wird casino_account entfernt, soll auch
 * die Regel wieder verschwinden — genau das tut sie hier und nur hier.
 */
$GLOBALS['TYPO3_CONF_VARS']['FE']['loginRateLimit'] = 10;
$GLOBALS['TYPO3_CONF_VARS']['FE']['loginRateLimitInterval'] = '1 minute';
