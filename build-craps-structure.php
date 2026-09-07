<?php

declare(strict_types=1);

/*
 * Einmal-Skript: Backend-Struktur fuer Craps.
 *
 * Umsetzung von Umsetzungsstueck C6a: die Zeichnung des Tisches existiert,
 * konnte aber noch nie gerendert werden, weil es keine Seite gibt, die sie
 * aufruft. Dieses Skript LEGT NUR AN und aendert keinen bestehenden Datensatz:
 *
 *   1. pages      "Craps", Slug /craps, unter der Startseite (uid 1),
 *                 hinter der Seite Blackjack, ohne Backend-Layout
 *   2. tt_content CType craps, colPos 0, auf der neuen Seite
 *   3. tt_content CType casino_automat, colPos 0, auf der Startseite,
 *                 hinter der vorhandenen Blackjack-Kachel im Saal,
 *                 Automat = craps, Ziel = t3://page?uid=<neue Seite>
 *
 * Jeder Schreibvorgang laeuft ueber DataHandler, nie ueber rohes SQL.
 *
 * WARUM HINTER BLACKJACK UND NICHT HINTER DEM ZULETZT GEBAUTEN GERAET
 * EINGEORDNET WIRD:
 *   Im Saal stehen mehrere Automaten und mehrere Tische. Eingeordnet wird
 *   hinter dem ZULETZT GEBAUTEN TISCH (Gattung::Tisch), nicht hinter dem
 *   zuletzt gebauten Geraet ueberhaupt -- so bleiben Automaten und Tische in
 *   ihren eigenen Reihen. Blackjack ist -- Stand dieses Skripts -- der letzte
 *   angelegte Tisch.
 *
 * WARUM DIE BEZUGSPUNKTE GESUCHT WERDEN, NICHT FESTGESCHRIEBEN:
 *   Die uids der Blackjack-Datensaetze sind zur Planungszeit dieses Skripts
 *   nicht bekannt -- sie stehen in der Datenbank, und ein Plan liest keine
 *   Datenbank. Die beiden Bezugsdatensaetze werden deshalb ueber ihren Slug
 *   bzw. ihr Automat-Feld GESUCHT (Abschnitt "Vorpruefungen" unten). Dieselbe
 *   Bauart wie build-blackjack-structure.php.
 *
 * WARUM KEIN SYMFONY-KOMMANDO IN EINER EXTENSION:
 *   casino_startpage darf laut Abnahmekriterium keinen Geraetenamen enthalten
 *   (Grep-Nachweis, verify-gattung.mjs G-9 bzw. verify-cabinet.mjs A-4).
 *   craps bekommt in seiner README eine Anleitung, in die eine Wegwerfdatei
 *   nicht gehoert. Dieses Skript liegt deshalb ausserhalb beider Extensions
 *   und ist zum Wegwerfen gedacht.
 *
 * Aufruf, vom Projektwurzelverzeichnis:
 *   ddev exec php build-craps-structure.php --dry-run
 *   ddev exec php build-craps-structure.php
 */

use TYPO3\CMS\Core\Authentication\CommandLineUserAuthentication;
use TYPO3\CMS\Core\Core\Bootstrap;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Site\SiteFinder;
use TYPO3\CMS\Core\Utility\GeneralUtility;

const HALL_PAGE_UID = 1;                       // Startseite / Saal
const EXPECTED_HOST = 'casino-kunterbunt.ddev.site';
const NEW_PAGE_TITLE = 'Craps';
const NEW_PAGE_SLUG = '/craps';
const NEW_PAGE_DESCRIPTION = 'Eine Wanne mit hohen Banden, grünem Tuch und Pyramidengummi. '
    . 'Zwei Würfel werden selbst geworfen; was oben liegt, wenn sie zur Ruhe kommen, ist das Ergebnis.';
const MACHINE_CTYPE = 'craps';
const AUTOMAT_CTYPE = 'casino_automat';
const FIELD_AUTOMAT = 'tx_casinostartpage_automat';
const FIELD_TARGET = 'tx_casinostartpage_target';
const AUTOMAT_IDENTIFIER = 'craps';
/*
 * Eingeordnet wird hinter dem ZULETZT GEBAUTEN TISCH, nicht hinter dem
 * zuletzt gebauten Geraet ueberhaupt (Begruendung wortgleich aus
 * build-blackjack-structure.php). Der zuletzt gebaute Tisch ist Blackjack.
 */
const AFTER_SLUG = '/blackjack';
const AFTER_AUTOMAT = 'blackjack';

$dryRun = in_array('--dry-run', $argv, true);

$classLoader = require __DIR__ . '/typo3_src/vendor/autoload.php';
SystemEnvironmentBuilder::run(0, SystemEnvironmentBuilder::REQUESTTYPE_CLI);
Bootstrap::init($classLoader);

function out(string $line): void
{
    fwrite(STDOUT, $line . PHP_EOL);
}

function fail(string $message): never
{
    fwrite(STDERR, 'ABBRUCH: ' . $message . PHP_EOL);
    exit(1);
}

/**
 * Ein frischer DataHandler je Vorgang. Die Klasse ist zustandsbehaftet und darf
 * nicht wiederverwendet werden. errorLog wird geprueft, weil DataHandler bei
 * Validierungsfehlern nicht wirft, sondern stillschweigend ueberspringt.
 *
 * @return array<string,int> substNEWwithIDs
 */
function datamap(array $data): array
{
    $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
    $dataHandler->start($data, []);
    $dataHandler->process_datamap();
    if ($dataHandler->errorLog !== []) {
        fail("DataHandler meldet Fehler:\n  - " . implode("\n  - ", $dataHandler->errorLog));
    }
    return $dataHandler->substNEWwithIDs;
}

function row(string $table, array $where, string $fields = '*'): ?array
{
    $qb = GeneralUtility::makeInstance(ConnectionPool::class)->getQueryBuilderForTable($table);
    // Nur "geloescht" ausschliessen. Der Standard-Restriction-Container von
    // getQueryBuilderForTable() bringt zusaetzlich HiddenRestriction,
    // StartTimeRestriction und EndTimeRestriction mit -- die wuerden einen
    // versteckten oder zeitgesteuert unsichtbaren Datensatz stillschweigend
    // mit-ausblenden, obwohl das ausdrueckliche 'deleted' => 0 im Aufrufer
    // suggeriert, die Sichtbarkeit werde vollstaendig selbst kontrolliert.
    $qb->getRestrictions()->removeAll()->add(GeneralUtility::makeInstance(DeletedRestriction::class));
    $qb->select(...GeneralUtility::trimExplode(',', $fields, true))->from($table);
    foreach ($where as $field => $value) {
        $qb->andWhere($qb->expr()->eq($field, $qb->createNamedParameter($value)));
    }
    $result = $qb->setMaxResults(1)->executeQuery()->fetchAssociative();
    return $result === false ? null : $result;
}

// ---------------------------------------------------------------- Vorpruefungen

/*
 * Dieselbe Reihenfolge, die auch TYPO3\CMS\Core\Console\CommandApplication benutzt:
 * erst ext_tables laden, dann den _cli_-Benutzer erzeugen, dann anmelden, dann den
 * Sprachdienst setzen. Ohne initializeBackendUser() ist $GLOBALS['BE_USER'] null und
 * initializeBackendAuthentication() laeuft in einen Fehler; ohne Anmeldung wiederum
 * verweigert DataHandler jeden Schreibzugriff auf pages und tt_content.
 */
Bootstrap::loadExtTables();
Bootstrap::initializeBackendUser(CommandLineUserAuthentication::class);
Bootstrap::initializeBackendAuthentication();
$GLOBALS['LANG'] = GeneralUtility::makeInstance(LanguageServiceFactory::class)
    ->createFromUserPreferences($GLOBALS['BE_USER']);

$beUser = $GLOBALS['BE_USER'] ?? null;
if ($beUser === null) {
    fail('Keine Backend-Anmeldung. Bootstrap::initializeBackendAuthentication() hat nichts geliefert.');
}
if ((int)$beUser->workspace !== 0) {
    fail('Der Benutzer "' . ($beUser->user['username'] ?? '?') . '" steht in Arbeitsumgebung '
        . $beUser->workspace . '. Ein Bau dort erzeugt versionierte Datensaetze statt echter.');
}
out('Backend-Benutzer: ' . $beUser->user['username'] . ' (uid ' . $beUser->user['uid']
    . ', admin=' . (int)$beUser->user['admin'] . ', Arbeitsumgebung live)');

// Nur die vorgesehene lokale Instanz.
$site = GeneralUtility::makeInstance(SiteFinder::class)->getSiteByPageId(HALL_PAGE_UID);
$host = $site->getBase()->getHost();
if ($host !== EXPECTED_HOST) {
    fail('Diese Instanz ist "' . $host . '", erwartet war "' . EXPECTED_HOST . '".');
}
out('Instanz: ' . $host . ' (Site "' . $site->getIdentifier() . '", Wurzelseite ' . $site->getRootPageId() . ')');

// Die beiden Inhaltselement-Typen muessen in der TCA stehen, sonst verwirft
// DataHandler den CType stillschweigend. Steht craps hier nicht, ist die
// Extension nicht aktiviert oder der Cache nicht geleert.
foreach ([MACHINE_CTYPE, AUTOMAT_CTYPE] as $ctype) {
    if (!isset($GLOBALS['TCA']['tt_content']['types'][$ctype])) {
        fail('CType "' . $ctype . '" ist in der TCA nicht bekannt. Cache leeren und Extension pruefen.');
    }
}
out('CTypes vorhanden: ' . MACHINE_CTYPE . ', ' . AUTOMAT_CTYPE);

// Die Registry muss das Geraet kennen. Ist der CType da, die Anmeldung aber
// nicht, waere die Kachel im Saal stumm: der DataProcessor legte null ins
// Template und das Inhaltselement gaebe nichts aus -- ohne Fehlermeldung.
if (!\Phomo17\CasinoStartpage\Automat\AutomatRegistry::has(AUTOMAT_IDENTIFIER)) {
    fail('Die Geraete-Registry kennt "' . AUTOMAT_IDENTIFIER . '" nicht. '
        . 'extension:activate und cache:flush ausgefuehrt?');
}
out('Registry kennt: ' . AUTOMAT_IDENTIFIER);

// Bezugsdatensaetze von Blackjack suchen -- ihre uids sind zur Planungszeit
// nicht bekannt (siehe Dateikopf).
$afterPage = row('pages', ['pid' => HALL_PAGE_UID, 'slug' => AFTER_SLUG, 'deleted' => 0], 'uid');
$afterHall = row('tt_content', ['CType' => AUTOMAT_CTYPE, FIELD_AUTOMAT => AFTER_AUTOMAT, 'deleted' => 0], 'uid');
if ($afterPage === null || $afterHall === null) {
    fail('Die Bezugsdatensaetze von Blackjack (Slug ' . AFTER_SLUG . ', Automat ' . AFTER_AUTOMAT . ') '
        . 'fehlen. Erst muss dessen Seite und seine Saal-Kachel vorhanden sein, sonst steht Craps an '
        . 'der falschen Stelle. Ersatzweise koennen AFTER_SLUG und AFTER_AUTOMAT in diesem Skript auf '
        . 'den Mustertisch (/mustertisch-testdaten-c1d, muster_tisch) zurueckgestellt werden, falls '
        . 'Blackjack in dieser Instanz nicht existiert.');
}
$afterPageUid = (int)$afterPage['uid'];
$afterHallUid = (int)$afterHall['uid'];
out('Bezugsdatensaetze vorhanden: pages:' . HALL_PAGE_UID . ', pages:' . $afterPageUid
    . ' (Blackjack, Slug ' . AFTER_SLUG . '), tt_content:' . $afterHallUid . ' (Blackjack-Kachel im Saal)');

// -------------------------------------------------- Doppelanlage ausschliessen

$existingPage = row('pages', ['pid' => HALL_PAGE_UID, 'slug' => NEW_PAGE_SLUG, 'deleted' => 0], 'uid,title');
$existingMachine = row('tt_content', ['CType' => MACHINE_CTYPE, 'deleted' => 0], 'uid,pid');
$existingHall = row('tt_content', ['CType' => AUTOMAT_CTYPE, FIELD_AUTOMAT => AUTOMAT_IDENTIFIER, 'deleted' => 0], 'uid,pid');

if ($existingPage !== null || $existingMachine !== null || $existingHall !== null) {
    out('');
    out('Es ist bereits etwas davon vorhanden. Es wird NICHTS angelegt und NICHTS geaendert:');
    if ($existingPage !== null) {
        out('  pages uid ' . $existingPage['uid'] . ' mit Slug ' . NEW_PAGE_SLUG);
    }
    if ($existingMachine !== null) {
        out('  tt_content uid ' . $existingMachine['uid'] . ' (CType ' . MACHINE_CTYPE . ') auf Seite ' . $existingMachine['pid']);
    }
    if ($existingHall !== null) {
        out('  tt_content uid ' . $existingHall['uid'] . ' (Saal-Miniatur craps) auf Seite ' . $existingHall['pid']);
    }
    out('Zum Neubau muss der Auftraggeber diese Datensaetze selbst entfernen.');
    exit(2);
}
out('Nichts davon vorhanden - der Bau kann beginnen.');

if ($dryRun) {
    out('');
    out('--dry-run: es wurde nichts geschrieben.');
    exit(0);
}

// ------------------------------------------------------- Schritt 1: die Seite

/*
 * pid = -$afterPageUid heisst "hinter den Datensatz mit dieser uid". Damit
 * steht die neue Seite im Seitenbaum hinter der Seite Blackjack, so wie die
 * Geraete im Saal hintereinander stehen. Bei pid = 1 setzte DataHandler sie
 * davor.
 *
 * Die perms_-Felder werden ausdruecklich gesetzt und nicht dem Zufall des
 * anlegenden Benutzers ueberlassen: sie sind zeichengleich zu den anderen
 * Geraeteseiten, damit die neue Seite fuer denselben Redakteur bearbeitbar
 * ist wie die alten.
 *
 * description ist das Core-eigene Metadatenfeld der Seite. Es ist eine
 * Seiteneigenschaft, keine Angelegenheit der Extension -- llms.txt,
 * robots.txt und strukturierte Daten gehoeren weiterhin dem Site Package und
 * werden nicht angefasst.
 */
$pageData = [
    'pages' => [
        'NEW_craps_page' => [
            'pid' => -$afterPageUid,
            'doktype' => 1,
            'title' => NEW_PAGE_TITLE,
            'slug' => NEW_PAGE_SLUG,
            'description' => NEW_PAGE_DESCRIPTION,
            'hidden' => 0,
            'nav_hide' => 0,
            'backend_layout' => '',
            'backend_layout_next_level' => '',
            'sys_language_uid' => 0,
            'perms_userid' => 1,
            'perms_groupid' => 0,
            'perms_user' => 31,
            'perms_group' => 31,
            'perms_everybody' => 0,
        ],
    ],
];
$newIds = datamap($pageData);
$pageUid = (int)($newIds['NEW_craps_page'] ?? 0);
if ($pageUid === 0) {
    fail('DataHandler hat keine uid fuer die neue Seite geliefert.');
}
out('');
out('Schritt 1: pages uid ' . $pageUid . ' angelegt - "' . NEW_PAGE_TITLE . '", Slug ' . NEW_PAGE_SLUG);

// -------------------------------------- Schritt 2: das Geraet auf seine Seite

$newIds = datamap([
    'tt_content' => [
        'NEW_craps_machine' => [
            'pid' => $pageUid,
            'CType' => MACHINE_CTYPE,
            'colPos' => 0,
            'sys_language_uid' => 0,
            'hidden' => 0,
        ],
    ],
]);
$machineUid = (int)($newIds['NEW_craps_machine'] ?? 0);
if ($machineUid === 0) {
    fail('DataHandler hat keine uid fuer das Inhaltselement "Craps" geliefert.');
}
out('Schritt 2: tt_content uid ' . $machineUid . ' angelegt - CType ' . MACHINE_CTYPE . ', colPos 0, Seite ' . $pageUid);

// ----------------------------------------- Schritt 3: das Geraet in den Saal

/*
 * pid = -$afterHallUid heisst "hinter das vorhandene Blackjack-Element". Es
 * ist -- Stand dieses Skripts -- der letzte Tisch im Saal; DataHandler
 * vergibt eine Sortierung dahinter und fasst keinen bestehenden Datensatz an.
 */
$newIds = datamap([
    'tt_content' => [
        'NEW_craps_hall' => [
            'pid' => -$afterHallUid,
            'CType' => AUTOMAT_CTYPE,
            'colPos' => 0,
            'sys_language_uid' => 0,
            'hidden' => 0,
            FIELD_AUTOMAT => AUTOMAT_IDENTIFIER,
            FIELD_TARGET => 't3://page?uid=' . $pageUid,
        ],
    ],
]);
$hallUid = (int)($newIds['NEW_craps_hall'] ?? 0);
if ($hallUid === 0) {
    fail('DataHandler hat keine uid fuer die Saal-Miniatur geliefert.');
}
out('Schritt 3: tt_content uid ' . $hallUid . ' angelegt - CType ' . AUTOMAT_CTYPE
    . ', Automat ' . AUTOMAT_IDENTIFIER . ', Ziel t3://page?uid=' . $pageUid);

// ------------------------------------------------------------ Rueckmessung

$page = row('pages', ['uid' => $pageUid], 'uid,pid,doktype,title,slug,hidden,backend_layout,sorting,perms_userid,perms_user,t3ver_wsid');
$machine = row('tt_content', ['uid' => $machineUid], 'uid,pid,CType,colPos,hidden,sorting,t3ver_wsid');
$hall = row('tt_content', ['uid' => $hallUid], 'uid,pid,CType,colPos,hidden,sorting,' . FIELD_AUTOMAT . ',' . FIELD_TARGET . ',t3ver_wsid');

if ($page === null || $machine === null || $hall === null) {
    fail('Rueckmessung: einer der soeben angelegten Datensaetze (pages:' . $pageUid
        . ', tt_content:' . $machineUid . ', tt_content:' . $hallUid . ') wurde nicht wiedergefunden.');
}

out('');
out('Rueckmessung frisch aus der Datenbank:');
foreach (['pages' => $page, 'tt_content(Geraet)' => $machine, 'tt_content(Saal)' => $hall] as $label => $record) {
    $parts = [];
    foreach ($record as $field => $value) {
        $parts[] = $field . '=' . ($value === null ? 'NULL' : (string)$value);
    }
    out('  ' . $label . ': ' . implode(' ', $parts));
}

foreach (['pages' => $page, 'tt_content Geraet' => $machine, 'tt_content Saal' => $hall] as $label => $record) {
    if ((int)($record['t3ver_wsid'] ?? 0) !== 0) {
        fail($label . ' liegt in Arbeitsumgebung ' . $record['t3ver_wsid'] . ' statt live.');
    }
}
if ((string)$hall[FIELD_AUTOMAT] !== AUTOMAT_IDENTIFIER) {
    fail('Das Feld ' . FIELD_AUTOMAT . ' wurde von DataHandler verworfen (Wert: "' . $hall[FIELD_AUTOMAT] . '").');
}
if ((string)$hall[FIELD_TARGET] !== 't3://page?uid=' . $pageUid) {
    fail('Das Feld ' . FIELD_TARGET . ' wurde veraendert (Wert: "' . $hall[FIELD_TARGET] . '").');
}
if ((string)$page['slug'] !== NEW_PAGE_SLUG) {
    fail('Der Slug wurde veraendert (Wert: "' . $page['slug'] . '") - vermutlich war er schon vergeben.');
}
if ((string)$page['title'] !== NEW_PAGE_TITLE) {
    fail('Der Seitentitel wurde veraendert (Wert: "' . $page['title'] . '").');
}
if ((string)$page['backend_layout'] !== '') {
    fail('Die Seite hat ein Backend-Layout bekommen ("' . $page['backend_layout'] . '"), erwartet war keins.');
}

// Zwischenspeicher leeren, damit Saal und Geraeteseite die neuen Datensaetze zeigen.
$cacheHandler = GeneralUtility::makeInstance(DataHandler::class);
$cacheHandler->start([], []);
$cacheHandler->clear_cacheCmd('all');
out('');
out('Zwischenspeicher geleert.');
out('FERTIG. pages=' . $pageUid . ' tt_content(Geraet)=' . $machineUid . ' tt_content(Saal)=' . $hallUid);
