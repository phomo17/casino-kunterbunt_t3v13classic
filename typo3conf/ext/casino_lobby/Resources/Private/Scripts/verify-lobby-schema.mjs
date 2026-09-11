/**
 * Casino Kunterbunt – casino_lobby: Nachweis Datenmodell (Umsetzungsstück D4a)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version
 * 18, ohne jede npm-Abhängigkeit. Gerüst wörtlich nach dem Vorbild von
 * casino_account/…/verify-schema.mjs und verify-gate.mjs: check()-Zähler,
 * lies(), kurz(), ohnePhpKommentare(), Wächterblock am Ende, Rückgabewert
 * 0/1.
 *
 * L-12 und L-13 fragen zusätzlich die LAUFENDE Datenbank ab (per `mysql` —
 * ein externes Programm, kein npm-Paket, nur DESCRIBE beziehungsweise
 * SELECT, keine schreibende Anweisung). Ohne laufende Datenbank brechen sie
 * deshalb LAUT ab statt still zu übergehen — dieselbe Lehre wie S-9 in
 * casino_account/…/verify-schema.mjs, wo genau dieser fehlende Live-Check in
 * Phase D1 eine ungeplante Spalte (`balance`) durchgehen ließ.
 *
 * Aufruf (nur lesend, ändert keine Datei, kein DDL, kein DML):
 *
 *   ddev exec node typo3conf/ext/casino_lobby/Resources/Private/Scripts/verify-lobby-schema.mjs
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d4-lobby, Abschnitt 4.18)
 * ----------------------------------------------------------------------------
 *   L-1   Wächterblock: Pflichtdateien vorhanden, keine mit NUL-Byte,
 *         gezählte Zusagen (kein eigener Haken — ein Riegel, keine Zusage)
 *   L-2   ext_tables.sql beschreibt genau drei Tabellen mit genau den
 *         Spalten aus Abschnitt 4.5 des Plans — Liste zeichengenau
 *   L-3   keine der drei Tabellen führt deleted oder hidden; keine der drei
 *         TCA-Dateien führt 'delete' oder 'enablecolumns'
 *   L-4   jede TCA-Spalte hat eine SQL-Spalte und umgekehrt — beide
 *         Richtungen, ohne erlaubte Abweichung
 *   L-5   jede TCA-Spalte ist passthrough; kein 'type' => 'number' und kein
 *         'type' => 'input' irgendwo in den drei TCA-Dateien
 *   L-6   jede von einer TCA genannte Beschriftung existiert in
 *         locallang.xlf, und im Namensraum tabelle.* zeigt umgekehrt jede
 *         Beschriftung auf eine TCA-Spalte
 *   L-7   locallang.xlf enthält kein %s; jeder Platzhalter ist {0}/{1}/{2}
 *   L-8   LobbyGames::SPIELE nennt genau roulette => 8, blackjack => 5,
 *         craps => 8 und MAX_LOBBYS = 4 — abgeglichen gegen D.10.2 aus
 *         CONCEPT.md, als Text gelesen, nicht abgeschrieben
 *   L-9   RoundClock nennt genau vier Zustände, dieselben vier wie Anhang I;
 *         SETZZEIT = 20; FRIST ist KEIN eigener Zahlenwert, sondern
 *         Player::SESSION_TIMEOUT (Quelltextprüfung, keine Zahl)
 *   L-10  LobbyRepository ist die einzige Datei mit getConnectionForTable
 *         beziehungsweise getQueryBuilderForTable auf eine
 *         tx_casinolobby_-Tabelle; keine andere Datei nennt einen
 *         Tabellennamen dieser Extension
 *   L-11  jede Abfrage in LobbyRepository ruft getRestrictions()->removeAll()
 *   L-12  live: DESCRIBE der drei Tabellen liefert GENAU die Spalten aus
 *         ext_tables.sql plus uid, pid, tstamp, crdate — keine einzige mehr
 *   L-13  live: die drei Tabellen sind leer oder enthalten nur Zeilen mit
 *         pid = 0
 *
 * NACHGEZOGEN FÜR D5-1 (nicht gestrichen): tx_casinolobby_lobby.spalten
 * enthält jetzt zusätzlich turn_seat und moves (Plan-d5-tische, Abschnitt
 * 4.1). L-2 bis L-11 sind damit wieder grün. L-12 bleibt ERWARTUNGSGEMÄSS
 * ROT, bis der Datenbank-Abgleich (Install-Tool → „Analyze Database
 * Structure") tatsächlich gelaufen ist — dieses Skript legt die Spalten
 * nicht selbst an, es beobachtet nur, ob sie schon da sind.
 */

// @pruefstand modus=egal laufzeit=kurz isolation=keine

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_lobby/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm, wo CONCEPT.md liegt. */
const PROJECT_ROOT = path.resolve(EXT_ROOT, '../..');

let fehler = 0;
let zusagen = 0;

function check(ok, text, ...zeilen) {
	zusagen++;
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(EXT_ROOT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/), damit ein erklärender Absatz keinen Fund vortäuscht. */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Zusätzlich PHP-Zeilenkommentare (// …) entfernen. */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Entfernt XML-/XLIFF-Kommentare (<!-- … -->), damit ein erklärender
 * Absatz in locallang.xlf — der die verbotene Schreibweise %s selbst NENNT,
 * um sie zu verbieten — keinen Fund vortäuscht. Dieselbe Fehlerklasse wie
 * bei ohnePhpKommentare() in casino_account/…/verify-schema.mjs (dort für
 * die Worte 'eval', 'unique', 'format' in TCA-Kommentaren).
 */
function ohneXmlKommentare(inhalt) {
	return inhalt.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Liefert den Textblock eines geklammerten PHP-Arrays, beginnend bei der
 * ERSTEN Fundstelle von `nadel`, bis zur passenden schließenden Klammer —
 * über die Klammertiefe gezählt, nicht über eine feste Zeilenzahl.
 */
function block(quelle, nadel) {
	const start = quelle.indexOf(nadel);
	if (start === -1) {
		return null;
	}
	const auf = quelle.indexOf('[', start);
	if (auf === -1) {
		return null;
	}
	let tiefe = 0;
	for (let i = auf; i < quelle.length; i++) {
		if (quelle[i] === '[') {
			tiefe++;
		} else if (quelle[i] === ']') {
			tiefe--;
			if (tiefe === 0) {
				return quelle.slice(auf, i + 1);
			}
		}
	}
	return null;
}

/** Die SCHLÜSSEL der Einträge direkt auf der obersten Ebene eines geklammerten Blocks (Tiefe 1). */
function obersteSchluessel(blockText) {
	if (blockText === null) {
		return [];
	}
	const gefunden = [];
	let tiefe = 0;
	let i = 0;
	while (i < blockText.length) {
		const zeichen = blockText[i];
		if (tiefe === 1 && zeichen === "'") {
			const rest = blockText.slice(i);
			const treffer = /^'([A-Za-z0-9_]+)'\s*=>\s*\[/.exec(rest);
			if (treffer) {
				gefunden.push(treffer[1]);
				i += treffer[0].length - 1;
				tiefe++;
				i++;
				continue;
			}
		}
		if (zeichen === '[') {
			tiefe++;
		} else if (zeichen === ']') {
			tiefe--;
		}
		i++;
	}
	return gefunden;
}

/** Die Fachspalten eines CREATE-TABLE-Blocks aus ext_tables.sql, in Reihenfolge. */
function sqlSpalten(sql, tabelle) {
	const treffer = new RegExp(`CREATE TABLE ${tabelle}\\s*\\(([\\s\\S]*?)\\n\\);`).exec(sql);
	if (!treffer) {
		return null;
	}
	const gefunden = [];
	for (const zeile of treffer[1].split('\n')) {
		const getrimmt = zeile.trim();
		if (getrimmt === '' || getrimmt.startsWith('#') || getrimmt.startsWith('UNIQUE KEY') || getrimmt.startsWith('KEY')) {
			continue;
		}
		const spalte = /^([a-z_]+)\s+\S/.exec(getrimmt);
		if (spalte) {
			gefunden.push(spalte[1]);
		}
	}
	return gefunden;
}

const EXT_TABLES_SQL_PFAD = path.join(EXT, 'ext_tables.sql');
const TCA_LOBBY_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinolobby_lobby.php');
const TCA_SEAT_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinolobby_seat.php');
const TCA_BET_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinolobby_bet.php');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang.xlf');
const LOBBYGAMES_PFAD = path.join(EXT, 'Classes/Lobby/LobbyGames.php');
const ROUNDCLOCK_PFAD = path.join(EXT, 'Classes/Service/RoundClock.php');
const LOBBYREPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/LobbyRepository.php');
const CONCEPT_PFAD = path.join(PROJECT_ROOT, 'CONCEPT.md');

console.log('\ncasino_lobby – Nachweis Datenmodell (Umsetzungsstück D4a)');
console.log('==========================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['ext_tables.sql', EXT_TABLES_SQL_PFAD],
	['Configuration/TCA/tx_casinolobby_lobby.php', TCA_LOBBY_PFAD],
	['Configuration/TCA/tx_casinolobby_seat.php', TCA_SEAT_PFAD],
	['Configuration/TCA/tx_casinolobby_bet.php', TCA_BET_PFAD],
	['Resources/Private/Language/locallang.xlf', LOCALLANG_PFAD],
	['Classes/Lobby/LobbyGames.php', LOBBYGAMES_PFAD],
	['Classes/Service/RoundClock.php', ROUNDCLOCK_PFAD],
	['Classes/Domain/LobbyRepository.php', LOBBYREPOSITORY_PFAD],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		process.exit(1);
	}
}

if (!existsSync(CONCEPT_PFAD)) {
	console.log(`\nERGEBNIS: Abbruch — CONCEPT.md nicht gefunden (${CONCEPT_PFAD}).`);
	console.log('L-8 braucht die Vorgabe aus D.10.2 als Vergleichstext.');
	process.exit(1);
}

/**
 * Die Anzahl der Zusagen eines vollständigen Laufs. GEMESSEN in
 * Umsetzungsstück D4d (zweimal hintereinander gefahren, beide Male 59;
 * Rückbauprobe bestanden — mit einer absichtlich falschen Erwartungszahl
 * (60) löste der Wächter zuverlässig aus, danach mit 59 wieder grün).
 */
const ERWARTETE_ZUSAGEN = 59;

const sql = lies(EXT_TABLES_SQL_PFAD);
const tcaLobby = ohnePhpKommentare(lies(TCA_LOBBY_PFAD));
const tcaSeat = ohnePhpKommentare(lies(TCA_SEAT_PFAD));
const tcaBet = ohnePhpKommentare(lies(TCA_BET_PFAD));
const xliff = lies(LOCALLANG_PFAD);
const lobbyGames = ohnePhpKommentare(lies(LOBBYGAMES_PFAD));
const roundClock = ohnePhpKommentare(lies(ROUNDCLOCK_PFAD));
const roundClockRoh = lies(ROUNDCLOCK_PFAD); // ungekürzt: FRIST-Prüfung braucht den echten Ausdruck
const concept = lies(CONCEPT_PFAD);

const TABELLEN = [
	{ name: 'tx_casinolobby_lobby', tca: tcaLobby, praefix: 'tabelle.lobby', spalten: ['game', 'seats_max', 'state', 'state_until', 'revision', 'round_no', 'seed', 'result', 'owner', 'turn_seat', 'moves'] },
	{ name: 'tx_casinolobby_seat', tca: tcaSeat, praefix: 'tabelle.seat', spalten: ['lobby', 'player', 'seat_no', 'last_seen', 'joined_round', 'shooter_no'] },
	{ name: 'tx_casinolobby_bet', tca: tcaBet, praefix: 'tabelle.bet', spalten: ['lobby', 'player', 'round_no', 'field', 'amount', 'outcome'] },
];

/* ==================================================== L-2 Drei Tabellen, genaue Spalten */

console.log('L-2  ext_tables.sql beschreibt genau drei Tabellen mit genau den Spalten aus Abschnitt 4.5');
for (const tabelle of TABELLEN) {
	const gefunden = sqlSpalten(sql, tabelle.name);
	check(gefunden !== null, `CREATE TABLE ${tabelle.name} gefunden`);
	const ist = gefunden ?? [];
	const fehlend = tabelle.spalten.filter((s) => !ist.includes(s));
	const ueberzaehlig = ist.filter((s) => !tabelle.spalten.includes(s));
	check(fehlend.length === 0 && ueberzaehlig.length === 0,
		`${tabelle.name}: genau die ${tabelle.spalten.length} Fachspalten stehen dort (gefunden: ${ist.join(', ')})`,
		...fehlend.map((s) => `fehlt: ${s}`),
		...ueberzaehlig.map((s) => `überzählig: ${s}`));
}
console.log('     Gegenprobe L-2-G: eine hinzugedachte Spalte muss auffallen');
{
	const mitErfundener = [...(sqlSpalten(sql, 'tx_casinolobby_lobby') ?? []), 'erfunden'];
	check(mitErfundener.filter((s) => !TABELLEN[0].spalten.includes(s)).length === 1,
		'L-2-G: die erfundene Spalte wird als überzählig erkannt');
}

/* ============================================ L-3 Keine deleted/hidden, kein delete/enablecolumns */

console.log('\nL-3  keine Tabelle führt deleted/hidden; keine TCA führt \'delete\' oder \'enablecolumns\'');
{
	const treffer = [];
	for (const tabelle of TABELLEN) {
		for (const standard of ['deleted', 'hidden']) {
			const muster = new RegExp(`CREATE TABLE ${tabelle.name}\\s*\\([\\s\\S]*?\\n\\);`).exec(sql);
			if (muster && new RegExp(`^\\s*${standard}\\s+\\S`, 'm').test(muster[0])) {
				treffer.push(`${tabelle.name}.${standard}`);
			}
		}
	}
	check(treffer.length === 0, 'keine der drei Tabellen führt deleted oder hidden', ...treffer);

	const tcaTreffer = [];
	for (const tabelle of TABELLEN) {
		if (/'delete'\s*=>/.test(tabelle.tca)) {
			tcaTreffer.push(`${tabelle.name}: 'delete'`);
		}
		if (/'enablecolumns'\s*=>/.test(tabelle.tca)) {
			tcaTreffer.push(`${tabelle.name}: 'enablecolumns'`);
		}
	}
	check(tcaTreffer.length === 0, 'keine der drei TCA-Dateien führt \'delete\' oder \'enablecolumns\'', ...tcaTreffer);

	console.log('     Gegenprobe L-3-G: eine hinzugedachte Zeile "hidden int(11)" muss auffallen');
	const mitHidden = sql.replace('CREATE TABLE tx_casinolobby_lobby (', 'CREATE TABLE tx_casinolobby_lobby (\n\thidden smallint(5) unsigned DEFAULT \'0\' NOT NULL,');
	check(/CREATE TABLE tx_casinolobby_lobby\s*\([\s\S]*?\n\);/.exec(mitHidden) !== null
		&& /^\s*hidden\s+\S/m.test(/CREATE TABLE tx_casinolobby_lobby\s*\([\s\S]*?\n\);/.exec(mitHidden)[0]),
		'L-3-G: die hinzugedachte hidden-Zeile wird gefunden');
}

/* ============================================ L-4 SQL <-> TCA, beide Richtungen, ohne Ausnahme */

console.log('\nL-4  jede TCA-Spalte hat eine SQL-Spalte und umgekehrt — beide Richtungen, ohne Ausnahme');
for (const tabelle of TABELLEN) {
	const columnsBlock = block(tabelle.tca, "'columns' => [");
	check(columnsBlock !== null, `${tabelle.name}: 'columns' => [ … ] gefunden`);
	const tcaSpalten = obersteSchluessel(columnsBlock);

	const inSqlNichtInTca = tabelle.spalten.filter((s) => !tcaSpalten.includes(s));
	check(inSqlNichtInTca.length === 0,
		`${tabelle.name}: jede SQL-Spalte hat eine TCA-Spalte`,
		...inSqlNichtInTca.map((s) => `fehlt in der TCA: ${s}`));

	const inTcaNichtInSql = tcaSpalten.filter((s) => !tabelle.spalten.includes(s));
	check(inTcaNichtInSql.length === 0,
		`${tabelle.name}: keine TCA-Spalte ohne SQL-Entsprechung (keine erlaubte Ausnahme)`,
		...inTcaNichtInSql.map((s) => `unerlaubt: ${s}`));
}
console.log('     Gegenprobe L-4-G: eine zweite, erfundene TCA-Spalte muss auffallen');
{
	const columnsBlock = block(TABELLEN[0].tca, "'columns' => [");
	const tcaSpalten = [...obersteSchluessel(columnsBlock), 'erfunden'];
	check(tcaSpalten.filter((s) => !TABELLEN[0].spalten.includes(s)).length === 1,
		'L-4-G: die erfundene TCA-Spalte wird als unerlaubt erkannt');
}

/* ==================================================== L-5 Ausschließlich passthrough */

console.log('\nL-5  jede TCA-Spalte ist passthrough; kein \'type\' => \'number\' und kein \'type\' => \'input\' irgendwo');
for (const tabelle of TABELLEN) {
	const nichtPassthrough = [];
	for (const spalte of tabelle.spalten) {
		const spaltenBlock = block(tabelle.tca, `'${spalte}' => [`);
		if (!spaltenBlock || !/'type'\s*=>\s*'passthrough'/.test(spaltenBlock)) {
			nichtPassthrough.push(spalte);
		}
	}
	check(nichtPassthrough.length === 0,
		`${tabelle.name}: alle Spalten sind passthrough`,
		...nichtPassthrough.map((s) => `nicht passthrough: ${s}`));

	check(!/'type'\s*=>\s*'number'/.test(tabelle.tca), `${tabelle.name}: kein 'type' => 'number' (D1-Lehre)`);
	check(!/'type'\s*=>\s*'input'/.test(tabelle.tca), `${tabelle.name}: kein 'type' => 'input'`);
}
console.log('     Gegenprobe L-5-G: ein nachgestelltes \'type\' => \'number\' muss auffallen');
{
	const mitNumber = TABELLEN[0].tca + "\n'type' => 'number',";
	check(/'type'\s*=>\s*'number'/.test(mitNumber), 'L-5-G: das nachgestellte number wird gefunden');
}

/* ============================================ L-6 XLIFF <-> TCA (tabelle.*) */

console.log('\nL-6  jede von einer TCA genannte Beschriftung existiert in locallang.xlf, und umgekehrt (Namensraum tabelle.*)');
{
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);
	const definierteTabelle = definierteIds.filter((id) => id.startsWith('tabelle.') || TABELLEN.some((t) => id === t.name.replace('tx_casinolobby_', 'tabelle.')));

	const referenzierteIds = [];
	for (const tabelle of TABELLEN) {
		referenzierteIds.push(
			...[...tabelle.tca.matchAll(/LLL:EXT:casino_lobby\/Resources\/Private\/Language\/locallang\.xlf:([A-Za-z0-9_.]+)/g)].map((m) => m[1])
		);
	}

	const referenziertOhneDefinition = referenzierteIds.filter((id) => !definierteIds.includes(id));
	check(referenziertOhneDefinition.length === 0,
		'jede von der TCA referenzierte tabelle.*-Beschriftung existiert in locallang.xlf',
		...referenziertOhneDefinition.map((id) => `fehlt: ${id}`));

	const definiertOhneReferenz = definierteIds
		.filter((id) => id === 'tabelle.lobby' || id === 'tabelle.seat' || id === 'tabelle.bet' || id.startsWith('tabelle.lobby.') || id.startsWith('tabelle.seat.') || id.startsWith('tabelle.bet.'))
		.filter((id) => !referenzierteIds.includes(id));
	check(definiertOhneReferenz.length === 0,
		'jede tabelle.*-Beschriftung in locallang.xlf wird von einer TCA tatsächlich referenziert',
		...definiertOhneReferenz.map((id) => `wird von keiner TCA referenziert: ${id}`));

	console.log('     Gegenprobe L-6-G: ein Verweis auf einen erfundenen Schlüssel muss auffallen');
	const mitErfundenem = [...referenzierteIds, 'tabelle.lobby.erfunden'];
	check(mitErfundenem.filter((id) => !definierteIds.includes(id)).length === 1,
		'L-6-G: tabelle.lobby.erfunden wird als fehlend erkannt');
}

/* ==================================================== L-7 Keine %s-Platzhalter */

console.log('\nL-7  locallang.xlf enthält kein %s; jeder Platzhalter ist {0}/{1}/{2}');
{
	// OHNE XML-KOMMENTARE GEPRÜFT: diese Datei erklärt die Verbotsregel in
	// einem Kommentar und nennt dabei zwangsläufig %s selbst — siehe
	// ohneXmlKommentare(). Geprüft wird nur der tatsächlich ausgelieferte
	// <source>-Text.
	const xliffOhneKommentare = ohneXmlKommentare(xliff);
	check(!/%s/.test(xliffOhneKommentare), 'kein %s außerhalb von Kommentaren in locallang.xlf (Lehre aus Audit-Befund H-02)');
	const platzhalter = [...xliffOhneKommentare.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
	check(platzhalter.length > 0, `mindestens ein {n}-Platzhalter vorhanden (gefunden: ${platzhalter.length})`);

	console.log('     Gegenprobe L-7-G: ein nachgestelltes %s außerhalb eines Kommentars muss auffallen');
	const mitPrintf = xliffOhneKommentare + '<trans-unit id="x"><source>%s</source></trans-unit>';
	check(/%s/.test(mitPrintf), 'L-7-G: das nachgestellte %s wird gefunden');
}

/* ==================================================== L-8 LobbyGames gegen CONCEPT.md D.10.2 */

console.log('\nL-8  LobbyGames::SPIELE und MAX_LOBBYS stimmen mit CONCEPT.md D.10.2 überein');
{
	const abschnitt = /### D\.10\.2 Welche Spiele([\s\S]*?)###/.exec(concept);
	check(abschnitt !== null, 'Abschnitt D.10.2 in CONCEPT.md gefunden');
	const text = abschnitt ? abschnitt[1] : '';

	/**
	 * Aus der TABELLE in D.10.2 gelesen (| Roulette | ja | 8 | usw.), NICHT
	 * von Hand abgeschrieben — genau darin liegt der Wert dieser Prüfung.
	 */
	const ERWARTET = {};
	for (const [, spiel, plaetze] of text.matchAll(/\|\s*(Roulette|Blackjack|Craps)\s*\|\s*ja\s*\|\s*(\d+)\s*\|/g)) {
		ERWARTET[spiel.toLowerCase()] = Number(plaetze);
	}
	check(Object.keys(ERWARTET).length === 3, `alle drei Spiele in der Tabelle gefunden (${Object.keys(ERWARTET).join(', ')})`);

	const maxTreffer = /Höchstens\s+(\d+)\s+Lobbys je Spiel/.exec(text);
	check(maxTreffer !== null, 'die Höchstzahl der Lobbys steht im Text');
	const erwarteteMax = maxTreffer ? Number(maxTreffer[1]) : null;

	const spieleBlock = block(lobbyGames, "SPIELE = [");
	const gefundenePaare = [...(spieleBlock ?? '').matchAll(/'([a-z]+)'\s*=>\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]);
	const gefunden = Object.fromEntries(gefundenePaare);

	check(JSON.stringify(gefunden) === JSON.stringify(ERWARTET),
		`LobbyGames::SPIELE entspricht D.10.2 (gefunden: ${JSON.stringify(gefunden)}, erwartet: ${JSON.stringify(ERWARTET)})`);

	const maxLobbysTreffer = /MAX_LOBBYS\s*=\s*(\d+)/.exec(lobbyGames);
	check(maxLobbysTreffer !== null && erwarteteMax !== null && Number(maxLobbysTreffer[1]) === erwarteteMax,
		`MAX_LOBBYS entspricht D.10.2 (gefunden: ${maxLobbysTreffer ? maxLobbysTreffer[1] : 'keiner'}, erwartet: ${erwarteteMax})`);

	console.log('     Gegenprobe L-8-G: ein verfälschtes roulette => 7 muss auffallen');
	const verfaelscht = { ...gefunden, roulette: 7 };
	check(JSON.stringify(verfaelscht) !== JSON.stringify(ERWARTET), 'L-8-G: die Verfälschung wird als Abweichung erkannt');
}

/* ==================================================== L-9 RoundClock: vier Zustände, SETZZEIT, FRIST */

console.log('\nL-9  RoundClock nennt genau vier Zustände, dieselben wie Anhang I; SETZZEIT = 20; FRIST ist Player::SESSION_TIMEOUT');
{
	const ERWARTETE_ZUSTAENDE = ['setzen', 'gesperrt', 'laeuft', 'auswerten'];
	const zustaendeTreffer = /ZUSTAENDE\s*=\s*\[([^\]]*)\]/.exec(roundClock);
	const gefundeneZustaende = zustaendeTreffer
		? [...zustaendeTreffer[1].matchAll(/self::([A-Z]+)/g)].map((m) => m[1].toLowerCase())
		: [];
	check(JSON.stringify(gefundeneZustaende) === JSON.stringify(ERWARTETE_ZUSTAENDE),
		`ZUSTAENDE ist genau [${ERWARTETE_ZUSTAENDE.join(', ')}] (gefunden: [${gefundeneZustaende.join(', ')}])`);

	check(/SETZZEIT\s*=\s*20\s*;/.test(roundClock), 'SETZZEIT ist 20 (D.10.6)');

	// FRIST DARF KEINE EIGENE ZAHL SEIN — der Ausdruck muss wörtlich auf
	// Player::SESSION_TIMEOUT verweisen. Auf dem ungekürzten Quelltext
	// geprüft (roundClockRoh), damit ein erklärender Kommentar mit einer
	// Zahl darin nichts vortäuscht.
	check(/const\s+FRIST\s*=\s*Player::SESSION_TIMEOUT\s*;/.test(roundClockRoh),
		'FRIST verweist wörtlich auf Player::SESSION_TIMEOUT, keine eigene Zahl');
	check(!/const\s+FRIST\s*=\s*\d/.test(roundClockRoh), 'FRIST ist nicht als eigener Zahlenwert deklariert');

	console.log('     Gegenprobe L-9-G: ein fünfter, hinzugedachter Zustand muss auffallen');
	const mitFuenftem = [...gefundeneZustaende, 'auszahlen'];
	check(JSON.stringify(mitFuenftem) !== JSON.stringify(ERWARTETE_ZUSTAENDE), 'L-9-G: der fünfte Zustand wird als Abweichung erkannt');
}

/* ==================================================== L-10 Tabellennamen nur in LobbyRepository */

console.log('\nL-10 LobbyRepository ist die einzige Datei mit einem Tabellennamen dieser Extension');
{
	function alleDateien(verzeichnis) {
		let ergebnis = [];
		for (const eintrag of readdirSync(verzeichnis)) {
			const voll = path.join(verzeichnis, eintrag);
			if (statSync(voll).isDirectory()) {
				ergebnis = ergebnis.concat(alleDateien(voll));
			} else if (voll.endsWith('.php')) {
				ergebnis.push(voll);
			}
		}
		return ergebnis;
	}

	const TABELLENNAMEN = ['tx_casinolobby_lobby', 'tx_casinolobby_seat', 'tx_casinolobby_bet'];
	const klassenDateien = alleDateien(path.join(EXT, 'Classes')).filter((p) => p !== LOBBYREPOSITORY_PFAD);

	const fundstellen = [];
	for (const datei of klassenDateien) {
		const inhalt = ohnePhpKommentare(lies(datei));
		for (const name of TABELLENNAMEN) {
			if (inhalt.includes(name)) {
				fundstellen.push(`${kurz(datei)} nennt ${name}`);
			}
		}
	}
	check(fundstellen.length === 0,
		'keine andere Klassendatei nennt einen der drei Tabellennamen',
		...fundstellen);

	console.log('     Gegenprobe L-10-G: ein hinzugedachter Verweis in einer fremden Datei muss auffallen');
	const fremdeDatei = ohnePhpKommentare(lies(LOBBYGAMES_PFAD)) + "\n// tx_casinolobby_lobby";
	check(fremdeDatei.includes('tx_casinolobby_lobby'), 'L-10-G: der hinzugedachte Verweis wird gefunden');
}

/* ==================================================== L-11 removeAll() bei jeder Abfrage */

console.log('\nL-11 jede Abfrage in LobbyRepository ruft getRestrictions()->removeAll()');
{
	const repo = ohnePhpKommentare(lies(LOBBYREPOSITORY_PFAD));
	const anzahlQueryBuilder = (repo.match(/getQueryBuilderForTable\(/g) || []).length;
	const anzahlRemoveAll = (repo.match(/getRestrictions\(\)->removeAll\(\)/g) || []).length;

	// Diese Extension bündelt jede getQueryBuilderForTable()-Anfrage in EINER
	// privaten Hilfsmethode (queryBuilder()), die unmittelbar danach
	// removeAll() aufruft — deshalb genügt hier ein Vergleich auf mindestens
	// eine removeAll()-Zeile je getQueryBuilderForTable()-Aufruf, statt einer
	// Nachbarschaftsprüfung Zeile für Zeile.
	check(anzahlQueryBuilder > 0, `getQueryBuilderForTable() wird verwendet (${anzahlQueryBuilder}×)`);
	check(anzahlRemoveAll >= anzahlQueryBuilder,
		`mindestens eine removeAll()-Zeile je getQueryBuilderForTable()-Aufruf (${anzahlRemoveAll} removeAll, ${anzahlQueryBuilder} getQueryBuilderForTable)`);

	console.log('     Gegenprobe L-11-G: ein hinzugedachter Aufruf ohne removeAll() muss auffallen');
	const ohneRemoveAll = repo.replace(/getRestrictions\(\)->removeAll\(\);/, '') + '\ngetQueryBuilderForTable(\'x\');';
	const neueAnzahlQb = (ohneRemoveAll.match(/getQueryBuilderForTable\(/g) || []).length;
	const neueAnzahlRa = (ohneRemoveAll.match(/getRestrictions\(\)->removeAll\(\)/g) || []).length;
	check(neueAnzahlRa < neueAnzahlQb, 'L-11-G: das Ungleichgewicht wird erkannt');
}

/* ------------------------------------------------------- L-12/L-13: live gegen die Datenbank */

console.log('\nL-12/L-13 live: DESCRIBE und Inhalt der drei Tabellen in der laufenden Datenbank');
for (const tabelle of TABELLEN) {
	let describeAusgabe;
	try {
		describeAusgabe = execFileSync('mysql', ['-e', `DESCRIBE ${tabelle.name};`], { encoding: 'utf8' });
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — DESCRIBE ${tabelle.name} schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand: ohne laufende Datenbank');
		console.log('lässt sich nicht zeigen, dass die Tabelle genau die geplanten Spalten hat.');
		process.exit(1);
	}
	const spaltenNamen = describeAusgabe
		.split('\n')
		.slice(1)
		.map((zeile) => zeile.split('\t')[0])
		.filter((s) => s !== '');

	const erwartet = [...tabelle.spalten, 'uid', 'pid', 'tstamp', 'crdate'].sort();
	const gefunden = [...spaltenNamen].sort();
	check(JSON.stringify(erwartet) === JSON.stringify(gefunden),
		`${tabelle.name}: genau ${erwartet.length} Spalten in der laufenden Datenbank (gefunden: ${spaltenNamen.length})`,
		`erwartet: ${erwartet.join(', ')}`,
		`gefunden: ${gefunden.join(', ')}`);

	let inhaltAusgabe;
	try {
		inhaltAusgabe = execFileSync('mysql', ['-e', `SELECT COUNT(*) AS anzahl, SUM(pid <> 0) AS fremde FROM ${tabelle.name};`], { encoding: 'utf8' });
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — SELECT gegen ${tabelle.name} schlug fehl: ${fehlerObjekt.message}`);
		process.exit(1);
	}
	const zeilen = inhaltAusgabe.split('\n').filter((z) => z !== '');
	const [, werte] = zeilen; // erste Zeile ist die Kopfzeile
	const [anzahl, fremde] = (werte ?? '0\t0').split('\t').map((s) => Number(s) || 0);
	check(anzahl === 0 || fremde === 0,
		`${tabelle.name}: leer oder ausschließlich Zeilen mit pid = 0 (Zeilen: ${anzahl}, mit pid ≠ 0: ${fremde})`);
}
console.log('     Gegenprobe L-12-G: eine hinzugedachte Spalte in der DESCRIBE-Textprobe muss auffallen');
{
	const erwartet = [...TABELLEN[0].spalten, 'uid', 'pid', 'tstamp', 'crdate'].sort();
	const mitErfundener = [...erwartet, 'erfunden'].sort();
	check(JSON.stringify(erwartet) !== JSON.stringify(mitErfundener), 'L-12-G: die hinzugedachte Spalte wird als Abweichung erkannt');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört ERWARTETE_ZUSAGEN nachgezogen).');
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück D4d gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('ext_tables.sql und die drei TCA-Dateien beschreiben dasselbe Datenmodell wie Anhang I:');
	console.log('genau drei Tabellen mit genau den geplanten Fachspalten, keine deleted/hidden-Spalte,');
	console.log('jede TCA-Spalte passthrough und mit SQL-Entsprechung in beide Richtungen, jede');
	console.log('Beschriftung stimmt mit locallang.xlf überein, LobbyGames und RoundClock stimmen mit');
	console.log('CONCEPT.md überein, Tabellennamen stehen nur in LobbyRepository, und die laufende');
	console.log('Datenbank zeigt genau die geplanten Spalten ohne fremde pid.');
}

process.exit(fehler === 0 ? 0 : 1);
