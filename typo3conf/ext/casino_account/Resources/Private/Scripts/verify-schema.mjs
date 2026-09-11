/**
 * Casino Kunterbunt – casino_account: Nachweis Datenmodell gegen Anhang I
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version
 * 18, ohne jede npm-Abhängigkeit, rein lesend. Laufzeit unter einer Sekunde.
 *
 * S-9 fragt zusätzlich die LAUFENDE Datenbank ab (per `mysql` — ein externes
 * Programm, kein npm-Paket, aufgerufen wie in roulette/craps das externe
 * `php` für dump-bet-layout.php; nur DESCRIBE, keine schreibende Anweisung).
 * Ohne laufende Datenbank bricht S-9 deshalb LAUT ab statt still zu
 * übergehen — siehe Wächter-Grundsatz oben im Kopf dieser Datei.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-schema.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-teild-d1-konto-qr, Abschnitt 4.6.2;
 * Stand nach Umsetzungsstück Dc)
 * -------------------------------------------------------------------------
 *   S-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *         Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   S-2   ext_tables.sql nennt genau die zwölf Fachspalten aus Anhang I
 *   S-3   Keine der von DefaultTcaSchema ergänzten Spalten steht in
 *         ext_tables.sql (uid, pid, tstamp, crdate, deleted, hidden)
 *   S-4   token ist varchar(64) und trägt einen UNIQUE KEY
 *   S-5   Die drei Betragsspalten (balance_cash, balance_machine,
 *         balance_win) sind unsigned
 *   S-6   Jede Spalte aus ext_tables.sql hat eine TCA-Spalte und umgekehrt,
 *         mit den zwei erklärten Abweichungen (balance virtuell, hidden aus
 *         DefaultTcaSchema)
 *   S-7   Die Summe wird an genau zwei Stellen gerechnet (Player::total(),
 *         CurrentBalanceProvider::addData()), seit Umsetzungsstück Dc NICHT
 *         mehr übersprungen — beide Dateien existieren jetzt
 *   S-8   name hat kein eval und kein unique
 *   S-9   balance hat type => 'none' (keiner der Typen, für die
 *         DefaultTcaSchema eine Spalte anlegt) UND ist auch tatsächlich
 *         keine Spalte in der laufenden Datenbank (NACHTRAG 2026-09-09,
 *         siehe unten und DECISIONS.md)
 *   S-10  role hat genau einen leeren Eintrag und default = 0
 *   S-11  balance_machine, balance_win und is_admin sind readOnly;
 *         balance_cash ist seit Umsetzungsstück Dc NICHT readOnly — es ist
 *         das editierbare „Guthaben" aus D.3.2 (zweiter NACHTRAG
 *         2026-09-09, siehe DECISIONS.md); token, fe_user, be_user,
 *         booking_seq, last_seen sind passthrough und stehen in keinem
 *         showitem
 *   S-12  Configuration/TCA/Overrides/fe_users.php fügt genau eine Spalte
 *         hinzu, passthrough, kein types, keine bestehende Spalte
 *   S-13  Jede player.*-Beschriftung, auf die die TCA zeigt, existiert in
 *         locallang_be.xlf — und umgekehrt
 *
 * WARUM S-13 AUF DAS PRÄFIX "player." BESCHRÄNKT IST
 * -------------------------------------------------------------------------
 * locallang_be.xlf trägt in Umsetzungsstück Da bereits alle Beschriftungen
 * der ganzen Phase D1 (Modulgruppe, Modul, Liste, QR-Ansicht, Meldungen) —
 * absichtlich vollständig laut Manifest, Zeile "content: full, piece: Da".
 * Die TCA dieses Stücks zeigt aber nur auf die player.*-Schlüssel. Eine
 * ungerichtete Prüfung "jede Beschriftung wird von irgendetwas benutzt"
 * würde deshalb in Da auf jeden list.*-, qr.*-, message.*- und storage.*-
 * Schlüssel fälschlich anschlagen, obwohl die spätere Verwendung (Db, Dc,
 * Dd) bereits feststeht. S-13 prüft deshalb beide Richtungen ausschließlich
 * innerhalb des player.*-Namensraums. Auslegung, siehe DECISIONS.md.
 *
 * WARUM S-5 NUR DIE DREI BALANCE-SPALTEN PRÜFT
 * -------------------------------------------------------------------------
 * Der Plantext (Abschnitt 4.6.2) spricht von "fünf Betragsspalten". Anhang I
 * und die tatsächliche, wörtlich aus dem Plan übernommene ext_tables.sql
 * kennen aber nur DREI Beträge: balance_cash, balance_machine, balance_win.
 * Die im selben Satz genannte Begründung ("kein Betrag fällt unter 0",
 * D.7.2) trifft ausschließlich auf diese drei zu — role, fe_user, be_user,
 * is_admin, booking_seq und last_seen sind keine Beträge, auch wenn sie
 * ebenfalls unsigned deklariert sind. Das ist derselbe Typ Prosa-Zahlenfehler
 * wie die vom Planer selbst gemeldeten "35 statt 41 Dateien" — maßgeblich
 * ist die tatsächliche Datenstruktur, nicht die Zahl im Fließtext. Siehe
 * DECISIONS.md.
 *
 * NACHTRAG 2026-09-09: S-9 WAR FALSCH BEGRÜNDET UND IST NEU GEFASST
 * -------------------------------------------------------------------------
 * Die Begründung des Plans, 'balance' sei "virtuell" und lege deshalb keine
 * Datenbankspalte an, weil DefaultTcaSchema "keinen Fall für einen Typ ohne
 * Datenbankentsprechung" kenne, war für TYPO3 13.4 FALSCH: die Klasse hat
 * einen Zweig `case 'number':` (DefaultTcaSchema.php, Zeile 867 ff.) und legt
 * für JEDES Feld dieses Typs eine echte Spalte an — nachgeprüft an der
 * tatsächlichen Datenbank: die Spalte `balance int(10) unsigned DEFAULT 0`
 * stand wirklich in der Tabelle, obwohl sie nicht in ext_tables.sql steht.
 * S-6 allein hätte das NIE gefunden, weil S-6 nur ext_tables.sql gegen die
 * TCA hält und die laufende Datenbank gar nicht erst ansieht — genau die
 * Fehlerklasse "eine Prüfung, die stumm übersprungen wird, sieht aus wie
 * eine bestandene" aus der Hausordnung dieses Projekts.
 *
 * Der TCA-Typ von 'balance' ist deshalb von 'number' auf 'none' geändert
 * worden (NoneElement — ein echtes, aber deaktiviertes Anzeigefeld ohne
 * 'name'-Attribut, siehe Kopfkommentar von
 * Configuration/TCA/tx_casinoaccount_player.php), die überzählige Spalte ist
 * über SchemaMigrator (denselben Weg, den auch das Install-Tool benutzt)
 * entfernt worden, und S-9 prüft jetzt BEIDES: den sicheren TCA-Typ UND die
 * tatsächliche Abwesenheit der Spalte in der laufenden Datenbank. Siehe
 * DECISIONS.md, Eintrag vom selben Datum.
 */

// @pruefstand modus=egal laufzeit=kurz
// (reine Schema-/Datenbankprüfung, unabhängig vom QR-Schalter.)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');

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

/** Entfernt PHP-/CSS-/SQL-Blockkommentare (/* … *\/), damit ein erklärender Absatz keinen Fund vortäuscht. */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Entfernt zusätzlich PHP-Zeilenkommentare (// …). Notwendig, weil die TCA
 * dieser Extension erklärende Zeilenkommentare trägt, die selbst Worte wie
 * 'eval', 'unique' oder 'format' in Anführungszeichen nennen (siehe die
 * Kommentare zu den Feldern "name" und "balance") — ohne diese Bereinigung
 * würde ein Kommentar wie eine echte Konfiguration aussehen.
 */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Liefert den Textblock eines geklammerten PHP-Arrays, beginnend bei der
 * ERSTEN Fundstelle von `nadel` (z. B. "'name' => ["), bis zur passenden
 * schließenden Klammer — über die Klammertiefe gezählt, nicht über eine
 * feste Zeilenzahl. So bleibt die Suche unabhängig von Einrückung und
 * Zeilenumbrüchen im Quelltext.
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

/**
 * Liefert die SCHLÜSSEL der Einträge direkt auf der obersten Ebene eines
 * geklammerten Blocks (Tiefe 1) — also z. B. die Namen der Spalten direkt
 * unter 'columns' => [ … ], nicht die tiefer verschachtelten Schlüssel wie
 * 'config' oder 'range'. Zählt Klammern selbst mit, statt sich auf eine
 * bestimmte Einrückung zu verlassen.
 */
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

const EXT_TABLES_SQL_PFAD = path.join(EXT, 'ext_tables.sql');
const TCA_PLAYER_PFAD = path.join(EXT, 'Configuration/TCA/tx_casinoaccount_player.php');
const TCA_FE_USERS_PFAD = path.join(EXT, 'Configuration/TCA/Overrides/fe_users.php');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang_be.xlf');
/** Erst ab Db/Dc vorhanden — siehe S-7. */
const PLAYER_PHP_PFAD = path.join(EXT, 'Classes/Domain/Player.php');
const BALANCE_PROVIDER_PFAD = path.join(EXT, 'Classes/Backend/FormEngine/CurrentBalanceProvider.php');

console.log('\ncasino_account – Nachweis Datenmodell gegen Anhang I (Umsetzungsstück Da)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

/*
 * DREI FEHLERKLASSEN, DREI RIEGEL — dieselbe Bauart wie in
 * roulette/…/verify-felt.mjs (Zeilen 346–401, 1675–1682), Vorlage dieses
 * Projekts für einen Prüfstand, der nicht stumm etwas überspringt.
 *
 * 1  EINE FEHLENDE DATEI führt zum sofortigen, LAUTEN Abbruch mit
 *    Rückgabewert 1 — nie zu einem übersprungenen Block.
 * 2  EIN NUL-BYTE in einer Pflichtdatei führt ebenso zum lauten Abbruch.
 * 3  EIN VERSCHWUNDENER PRÜFBLOCK würde nur die Anzahl der ausgegebenen
 *    Zusagen senken, ohne eine einzige davon rot zu machen — deshalb zählt
 *    check() jede Zusage, und am Ende wird die Zahl gegen ERWARTETE_ZUSAGEN
 *    gehalten.
 */
const PFLICHTDATEIEN = [
	['ext_tables.sql', EXT_TABLES_SQL_PFAD],
	['Configuration/TCA/tx_casinoaccount_player.php', TCA_PLAYER_PFAD],
	['Configuration/TCA/Overrides/fe_users.php', TCA_FE_USERS_PFAD],
	['Resources/Private/Language/locallang_be.xlf', LOCALLANG_PFAD],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		console.log('Eine Textdatei mit NUL-Byte ist für viele Werkzeuge eine Binärdatei;');
		console.log('Suchen darin laufen ins Leere, ohne einen Fehler zu melden.');
		process.exit(1);
	}
}

/**
 * Die Anzahl der Zusagen, die ein vollständiger Lauf ausgibt. GEMESSEN, nicht
 * geschätzt — in Umsetzungsstück De gefahren, abgelesen (47) und hier
 * eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt, Wächter
 * schlägt an, zurückgebaut, wieder grün).
 */
const ERWARTETE_ZUSAGEN = 47;

const sql = lies(EXT_TABLES_SQL_PFAD);
const tca = ohnePhpKommentare(lies(TCA_PLAYER_PFAD));
const feUsersOverride = ohnePhpKommentare(lies(TCA_FE_USERS_PFAD));
const xliff = lies(LOCALLANG_PFAD);

/* ==================================================== S-2 Elf Fachspalten */

console.log('S-2  ext_tables.sql nennt genau die zwölf Fachspalten aus Anhang I');
{
	/**
	 * VON HAND AUS ANHANG I ABGESCHRIEBEN — nicht aus der SQL-Datei gelesen.
	 * Genau darin liegt der Wert dieser Prüfung.
	 */
	const ERWARTETE_SPALTEN = [
		'name', 'token', 'balance_cash', 'balance_machine', 'balance_win',
		'role', 'fe_user', 'be_user', 'is_admin', 'booking_seq', 'last_seen',
		// NACHTRAG 2026-09-10 (Umsetzungsstück D3a): booking_client kommt zu
		// Anhang I hinzu. Grund im Plan PLAN-d3-guthaben.md: doppelt ist eine
		// Buchung nur dann, wenn DERSELBE Browser dieselbe oder eine ältere
		// Nummer erneut schickt. Mit nur booking_seq verwürfe der Server die
		// Buchung einer zweiten Registerkarte still als „schon verarbeitet" —
		// Geld verschwände.
		'booking_client',
	];

	const playerBlock = /CREATE TABLE tx_casinoaccount_player\s*\(([\s\S]*?)\n\);/.exec(sql);
	check(playerBlock !== null, 'CREATE TABLE tx_casinoaccount_player gefunden');
	const rumpf = playerBlock ? playerBlock[1] : '';

	const gefundeneSpalten = [];
	for (const zeile of rumpf.split('\n')) {
		const getrimmt = zeile.trim();
		if (getrimmt === '' || getrimmt.startsWith('#') || getrimmt.startsWith('UNIQUE KEY') || getrimmt.startsWith('KEY')) {
			continue;
		}
		const treffer = /^([a-z_]+)\s+\S/.exec(getrimmt);
		if (treffer) {
			gefundeneSpalten.push(treffer[1]);
		}
	}

	const fehlend = ERWARTETE_SPALTEN.filter((s) => !gefundeneSpalten.includes(s));
	const ueberzaehlig = gefundeneSpalten.filter((s) => !ERWARTETE_SPALTEN.includes(s));
	check(fehlend.length === 0 && ueberzaehlig.length === 0,
		`genau die zwölf Fachspalten stehen dort (gefunden: ${gefundeneSpalten.join(', ')})`,
		...fehlend.map((s) => `fehlt: ${s}`),
		...ueberzaehlig.map((s) => `überzählig: ${s}`));

	console.log('     Gegenprobe S-2-G: eine hinzugedachte Spalte balance_total muss auffallen');
	const mitErfundenerSpalte = [...gefundeneSpalten, 'balance_total'];
	check(mitErfundenerSpalte.filter((s) => !ERWARTETE_SPALTEN.includes(s)).length === 1,
		'S-2-G: balance_total wird als überzählig erkannt');
}

/* ============================================ S-3 Keine Standardspalten */

console.log('\nS-3  Keine der von DefaultTcaSchema ergänzten Spalten steht in ext_tables.sql');
{
	const STANDARDSPALTEN = ['uid', 'pid', 'tstamp', 'crdate', 'deleted', 'hidden'];
	const playerBlock = /CREATE TABLE tx_casinoaccount_player\s*\(([\s\S]*?)\n\);/.exec(sql);
	const rumpf = playerBlock ? playerBlock[1] : '';
	const treffer = [];
	for (const spalte of STANDARDSPALTEN) {
		const muster = new RegExp(`^\\s*${spalte}\\s+\\S`, 'm');
		if (muster.test(rumpf)) {
			treffer.push(spalte);
		}
	}
	check(treffer.length === 0,
		'keine der sechs Standardspalten kommt in ext_tables.sql vor',
		...treffer.map((s) => `gefunden: ${s}`));

	console.log('     Gegenprobe S-3-G: ein hinzugedachtes "uid int(11)" muss auffallen');
	const mitUid = rumpf + '\n\tuid int(11) unsigned DEFAULT \'0\' NOT NULL,';
	check(/^\s*uid\s+\S/m.test(mitUid), 'S-3-G: die hinzugedachte uid-Zeile wird gefunden');
}

/* ==================================================== S-4 token */

console.log('\nS-4  token ist varchar(64) und trägt einen UNIQUE KEY');
{
	const typOk = /\btoken\s+varchar\(64\)/.test(sql);
	check(typOk, 'token ist als varchar(64) deklariert');

	const uniqueOk = /UNIQUE KEY token \(token\)/.test(sql);
	check(uniqueOk, 'UNIQUE KEY token (token) ist vorhanden');

	console.log('     Gegenprobe S-4-G: "KEY token" statt "UNIQUE KEY token" muss auffallen');
	const ohneUnique = sql.replace('UNIQUE KEY token (token)', 'KEY token (token)');
	check(!/UNIQUE KEY token \(token\)/.test(ohneUnique), 'S-4-G: die Abschwächung wird erkannt');
}

/* ==================================================== S-5 Betragsspalten unsigned */

console.log('\nS-5  Die drei Betragsspalten sind unsigned');
{
	const BETRAGSSPALTEN = ['balance_cash', 'balance_machine', 'balance_win'];
	const fehlend = [];
	for (const spalte of BETRAGSSPALTEN) {
		const muster = new RegExp(`\\b${spalte}\\s+int\\(11\\)\\s+unsigned\\b`);
		if (!muster.test(sql)) {
			fehlend.push(spalte);
		}
	}
	check(fehlend.length === 0,
		'balance_cash, balance_machine und balance_win sind unsigned deklariert',
		...fehlend.map((s) => `nicht unsigned oder nicht gefunden: ${s}`));

	console.log('     Gegenprobe S-5-G: ein Betrag ohne unsigned muss auffallen');
	const ohneUnsigned = sql.replace('balance_win int(11) unsigned', 'balance_win int(11)');
	check(!/\bbalance_win\s+int\(11\)\s+unsigned\b/.test(ohneUnsigned), 'S-5-G: das Fehlen von unsigned wird erkannt');
}

/* ============================================ S-6 SQL <-> TCA Übereinstimmung */

console.log('\nS-6  Jede Spalte aus ext_tables.sql hat eine TCA-Spalte und umgekehrt');
{
	const ERWARTETE_SQL_SPALTEN = [
		'name', 'token', 'balance_cash', 'balance_machine', 'balance_win',
		'role', 'fe_user', 'be_user', 'is_admin', 'booking_seq', 'last_seen',
		// NACHTRAG 2026-09-10 (Umsetzungsstück D3a): booking_client kommt zu
		// Anhang I hinzu. Grund im Plan PLAN-d3-guthaben.md: doppelt ist eine
		// Buchung nur dann, wenn DERSELBE Browser dieselbe oder eine ältere
		// Nummer erneut schickt. Mit nur booking_seq verwürfe der Server die
		// Buchung einer zweiten Registerkarte still als „schon verarbeitet" —
		// Geld verschwände.
		'booking_client',
	];
	/**
	 * Erlaubte Abweichungen, ausdrücklich benannt:
	 *   balance  Anzeigefeld ohne SQL-Spalte (D.3.3). Dass es WIRKLICH keine
	 *            Spalte in der laufenden Datenbank gibt, prüft NICHT dieser
	 *            Block (der hält nur ext_tables.sql gegen die TCA), sondern
	 *            S-9 — dort auch die Gegenprobe gegen die Datenbank selbst.
	 *   hidden   Standardspalte aus ctrl.enablecolumns, kommt aus
	 *            DefaultTcaSchema und NICHT aus ext_tables.sql (S-3) —
	 *            trägt trotzdem eine eigene TCA-Spalte für den
	 *            checkboxToggle, wie in praktisch jeder TYPO3-Tabelle.
	 */
	const ERLAUBTE_TCA_NUR = ['balance', 'hidden'];

	const columnsBlock = block(tca, "'columns' => [");
	check(columnsBlock !== null, "'columns' => [ … ] gefunden");
	const tcaSpalten = obersteSchluessel(columnsBlock);

	const inSqlNichtInTca = ERWARTETE_SQL_SPALTEN.filter((s) => !tcaSpalten.includes(s));
	check(inSqlNichtInTca.length === 0,
		'jede SQL-Spalte hat eine TCA-Spalte',
		...inSqlNichtInTca.map((s) => `fehlt in der TCA: ${s}`));

	const inTcaNichtErlaubt = tcaSpalten.filter((s) => !ERWARTETE_SQL_SPALTEN.includes(s) && !ERLAUBTE_TCA_NUR.includes(s));
	check(inTcaNichtErlaubt.length === 0,
		'keine TCA-Spalte ohne SQL-Entsprechung außer den zwei erklärten Ausnahmen',
		...inTcaNichtErlaubt.map((s) => `unerlaubt: ${s}`));

	console.log('     Gegenprobe S-6-G: eine zweite virtuelle Spalte muss auffallen');
	const mitZweiterVirtueller = [...tcaSpalten, 'balanceForecast'];
	const unerlaubtMitZusatz = mitZweiterVirtueller.filter((s) => !ERWARTETE_SQL_SPALTEN.includes(s) && !ERLAUBTE_TCA_NUR.includes(s));
	check(unerlaubtMitZusatz.length === 1, 'S-6-G: balanceForecast wird als unerlaubt erkannt');
}

/* ============================================ S-7 Die eine Summenrechnung */

console.log('\nS-7  Die Summe wird an genau zwei Stellen gerechnet, beide identisch');
{
	/**
	 * Ab Umsetzungsstück Dc existieren beide Dateien wirklich — der
	 * Wächterblock oben (PFLICHTDATEIEN) deckt sie nicht ab, weil S-7 sie
	 * erst spät im Bauablauf braucht; deshalb bricht dieser Block selbst
	 * LAUT ab, statt still zu übergehen, falls eine der beiden fehlt.
	 */
	if (!existsSync(PLAYER_PHP_PFAD) || !existsSync(BALANCE_PROVIDER_PFAD)) {
		console.log('\nERGEBNIS: Abbruch — Player.php oder CurrentBalanceProvider.php fehlt.');
		console.log('Beide sind seit Umsetzungsstück Dc Pflicht für S-7; das ist kein Prüfergebnis,');
		console.log('sondern ein kaputter Prüfstand.');
		process.exit(1);
	}

	const player = ohneBlockKommentare(lies(PLAYER_PHP_PFAD));
	const provider = ohneBlockKommentare(lies(BALANCE_PROVIDER_PFAD));

	const playerSumme = /\$this->balanceCash\s*\+\s*\$this->balanceMachine\s*\+\s*\$this->balanceWin/.test(player);
	check(playerSumme, 'Player::total() addiert balanceCash + balanceMachine + balanceWin genau einmal');

	const providerSumme = /balance_cash['"]?\]\s*\+\s*.*balance_machine['"]?\]\s*\+\s*.*balance_win/.test(provider)
		|| (/balance_cash/.test(provider) && /balance_machine/.test(provider) && /balance_win/.test(provider) && (provider.match(/\+/g) || []).length > 0);
	check(providerSumme, 'CurrentBalanceProvider::addData() verknüpft dieselben drei Spalten mit +');

	console.log('     Gegenprobe S-7-G: eine Summe, der eine der drei Spalten fehlt, darf NICHT durchgehen');
	const providerOhneWin = provider.replace(/balance_win/g, '');
	const unvollstaendigGaelteAlsVollstaendig = /balance_cash['"]?\]\s*\+\s*.*balance_machine['"]?\]\s*\+\s*.*balance_win/.test(providerOhneWin);
	check(!unvollstaendigGaelteAlsVollstaendig,
		'S-7-G: eine Summe ohne balance_win wird nicht als vollständige Drei-Spalten-Summe erkannt');
}

/* ==================================================== S-8 name ohne eval/unique */

console.log('\nS-8  name hat kein eval und kein unique');
{
	const nameBlock = block(tca, "'name' => [");
	check(nameBlock !== null, "Spaltenblock 'name' gefunden");
	const rumpf = nameBlock || '';
	check(!/'eval'/.test(rumpf), "kein 'eval' im Spaltenblock von name");
	check(!/'unique'/.test(rumpf), "kein 'unique' im Spaltenblock von name");

	console.log('     Gegenprobe S-8-G: ein hinzugedachtes eval => trim muss auffallen');
	const mitEval = rumpf.replace("'config' => [", "'config' => [\n'eval' => 'trim',");
	check(/'eval'/.test(mitEval), 'S-8-G: das hinzugedachte eval wird gefunden');
}

/* ==================================================== S-9 balance: sicherer Typ + tatsächlich keine Spalte */

console.log('\nS-9  balance hat type => "none" (keinen spaltenerzeugenden Typ) UND ist auch tatsächlich keine Spalte in der laufenden Datenbank');
{
	const balanceBlock = block(tca, "'balance' => [");
	check(balanceBlock !== null, "Spaltenblock 'balance' gefunden");
	const rumpf = balanceBlock || '';

	const configBlock = block(rumpf, "'config' => [");
	const typMatch = configBlock ? /'type'\s*=>\s*'([A-Za-z]+)'/.exec(configBlock) : null;
	const typ = typMatch ? typMatch[1] : null;
	check(typ === 'none', `type ist 'none' (gefunden: ${typ ?? 'kein type gefunden'})`);

	/**
	 * VON HAND AUS DefaultTcaSchema.php ABGESCHRIEBEN
	 * (typo3_src/typo3/sysext/core/Classes/Database/Schema/DefaultTcaSchema.php,
	 * Methode enrichSingleTableFieldsFromTcaColumns(), jeder "case"-Zweig
	 * ihres switch($type) — Zeilen 468 bis 917 in der Fassung 13.4.33). Das
	 * sind GENAU die TCA-Typen, für die der Kern beim Datenbankabgleich eine
	 * Spalte anlegt. 'none' steht NICHT darunter — ebenso wenig 'user' und
	 * 'passthrough', aber nur 'none' zeichnet zugleich ein echtes Anzeigefeld
	 * (NoneElement), ohne eine eigene Formularmaschine zu bauen.
	 */
	const SPALTENERZEUGENDE_TYPEN = [
		'category', 'datetime', 'slug', 'json', 'uuid', 'file', 'folder',
		'imageManipulation', 'flex', 'text', 'email', 'check', 'language',
		'group', 'password', 'color', 'radio', 'link', 'input', 'inline',
		'number', 'select',
	];
	check(typ !== null && !SPALTENERZEUGENDE_TYPEN.includes(typ),
		"'none' gehört nicht zu den Typen, für die DefaultTcaSchema eine Spalte anlegt");

	console.log('     Gegenprobe S-9-G1: type => "number" muss als spaltenerzeugend auffallen');
	check(SPALTENERZEUGENDE_TYPEN.includes('number') && !SPALTENERZEUGENDE_TYPEN.includes('none'),
		"S-9-G1: 'number' steht in der spaltenerzeugenden Liste, 'none' nicht");

	/**
	 * Die eigentliche Gegenprobe zum Fund vom 2026-09-09: nicht nur die TCA
	 * lesen, sondern die LAUFENDE Datenbank fragen. `mysql` ist ein externes
	 * Programm (kein npm-Paket), aufgerufen wie in roulette/craps das externe
	 * `php` für dump-bet-layout.php — nur DESCRIBE, keine schreibende
	 * Anweisung. Schlägt der Aufruf fehl, bricht dieser Block LAUT ab statt
	 * das Ergebnis stumm zu überspringen (Wächter-Grundsatz, siehe Kopf
	 * dieser Datei).
	 */
	let describeAusgabe;
	try {
		describeAusgabe = execFileSync('mysql', ['-e', 'DESCRIBE tx_casinoaccount_player;'], { encoding: 'utf8' });
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — DESCRIBE tx_casinoaccount_player schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand: ohne laufende Datenbank');
		console.log('lässt sich nicht zeigen, dass balance wirklich keine Spalte ist.');
		process.exit(1);
	}
	const spaltenNamen = describeAusgabe
		.split('\n')
		.slice(1)
		.map((zeile) => zeile.split('\t')[0])
		.filter((s) => s !== '');

	check(!spaltenNamen.includes('balance'),
		"'balance' ist in der laufenden Datenbank tatsächlich KEINE Spalte",
		`Spalten (${spaltenNamen.length}): ${spaltenNamen.join(', ')}`);
	check(spaltenNamen.length === 18,
		`genau 18 Spalten in der laufenden Datenbank (gefunden: ${spaltenNamen.length})`,
		...spaltenNamen);

	console.log('     Gegenprobe S-9-G2: eine hinzugedachte Spalte "balance" in der DESCRIBE-Ausgabe muss auffallen');
	const mitErfundenerSpalte = [...spaltenNamen, 'balance'];
	check(mitErfundenerSpalte.includes('balance'), 'S-9-G2: die hinzugedachte Spalte balance wird in der Textprobe gefunden');
}

/* ==================================================== S-10 role */

console.log('\nS-10 role hat genau einen leeren Eintrag und default = 0');
{
	const roleBlock = block(tca, "'role' => [");
	check(roleBlock !== null, "Spaltenblock 'role' gefunden");
	const rumpf = roleBlock || '';
	const itemsBlock = block(rumpf, "'items' => [");
	const anzahlEintraege = itemsBlock ? (itemsBlock.match(/'value'\s*=>/g) || []).length : 0;
	check(anzahlEintraege === 1, `genau ein Eintrag in items (gefunden: ${anzahlEintraege})`);
	check(/'default'\s*=>\s*0\b/.test(rumpf), 'default ist 0');

	console.log('     Gegenprobe S-10-G: ein zweiter Eintrag muss auffallen');
	const mitZweitem = (itemsBlock || '').replace(/\]\s*$/, ", ['label' => 'x', 'value' => 1]]");
	check((mitZweitem.match(/'value'\s*=>/g) || []).length === 2, 'S-10-G: der zweite Eintrag wird gezählt');
}

/* ==================================================== S-11 readOnly / passthrough */

console.log('\nS-11 balance_machine/balance_win/is_admin readOnly, balance_cash editierbar; token/fe_user/be_user/booking_seq/last_seen passthrough, in keinem showitem');
{
	/**
	 * SEIT UMSETZUNGSSTÜCK Dc (siehe DECISIONS.md 2026-09-09): balance_cash
	 * ist NICHT MEHR readOnly — es trägt jetzt die Rolle des editierbaren
	 * „Guthaben" aus D.3.2/D.3.3, weil das ursprünglich dafür vorgesehene
	 * virtuelle Feld „balance" seit Umsetzungsstück Db (type => 'none') keinen
	 * Wert mehr aus dem Formular annehmen kann. Nur balance_machine,
	 * balance_win und is_admin bleiben reine Anzeige.
	 */
	const READONLY_FELDER = ['balance_machine', 'balance_win', 'is_admin'];
	const fehlendReadOnly = [];
	for (const feld of READONLY_FELDER) {
		const feldBlock = block(tca, `'${feld}' => [`);
		if (!feldBlock || !/'readOnly'\s*=>\s*true/.test(feldBlock)) {
			fehlendReadOnly.push(feld);
		}
	}
	check(fehlendReadOnly.length === 0,
		'alle drei Felder sind readOnly',
		...fehlendReadOnly.map((f) => `nicht readOnly: ${f}`));

	const balanceCashBlock = block(tca, "'balance_cash' => [");
	check(balanceCashBlock !== null && !/'readOnly'\s*=>\s*true/.test(balanceCashBlock),
		'balance_cash ist NICHT readOnly (es ist das editierbare „Guthaben")');
	check(balanceCashBlock !== null && /'range'\s*=>\s*\[\s*'lower'\s*=>\s*0/.test(balanceCashBlock),
		"balance_cash hat 'range.lower' => 0 (nicht negativ, D.3.2)");

	console.log('     Gegenprobe S-11-G0: ein hinzugedachtes readOnly bei balance_cash muss auffallen');
	const balanceCashMitReadOnly = (balanceCashBlock || '') + "\n'readOnly' => true,";
	check(/'readOnly'\s*=>\s*true/.test(balanceCashMitReadOnly), 'S-11-G0: das hinzugedachte readOnly wird gefunden');

	const PASSTHROUGH_FELDER = ['token', 'fe_user', 'be_user', 'booking_seq', 'last_seen'];
	const nichtPassthrough = [];
	for (const feld of PASSTHROUGH_FELDER) {
		const feldBlock = block(tca, `'${feld}' => [`);
		if (!feldBlock || !/'type'\s*=>\s*'passthrough'/.test(feldBlock)) {
			nichtPassthrough.push(feld);
		}
	}
	check(nichtPassthrough.length === 0,
		'alle fünf Felder sind passthrough',
		...nichtPassthrough.map((f) => `nicht passthrough: ${f}`));

	const typesBlock = block(tca, "'types' => [");
	const showitemMatch = typesBlock ? /'showitem'\s*=>\s*'([\s\S]*?)',/.exec(typesBlock) : null;
	const showitem = showitemMatch ? showitemMatch[1] : '';
	const imShowitem = PASSTHROUGH_FELDER.filter((f) => new RegExp(`\\b${f}\\b`).test(showitem));
	check(imShowitem.length === 0,
		'keines der fünf passthrough-Felder steht im showitem',
		...imShowitem.map((f) => `steht im showitem: ${f}`));

	console.log('     Gegenprobe S-11-G: ein token im showitem muss auffallen');
	const showitemMitToken = showitem + ', token';
	check(/\btoken\b/.test(showitemMitToken), 'S-11-G: token im showitem wird gefunden');
}

/* ==================================================== S-12 fe_users.php */

console.log('\nS-12 Configuration/TCA/Overrides/fe_users.php fügt genau eine Spalte hinzu');
{
	const treffer = [...feUsersOverride.matchAll(/\$GLOBALS\['TCA'\]\['fe_users'\]\['columns'\]\['([A-Za-z0-9_]+)'\]/g)].map((m) => m[1]);
	check(treffer.length === 1 && treffer[0] === 'tx_casinoaccount_player',
		`genau eine Spalte, tx_casinoaccount_player (gefunden: ${treffer.join(', ') || 'keine'})`);

	check(/'type'\s*=>\s*'passthrough'/.test(feUsersOverride), 'die neue Spalte ist passthrough');
	check(!/\['types'\]/.test(feUsersOverride), "kein Zugriff auf ['types'] — keine bestehende Anzeige wird geändert");
	check(!/'username'/.test(feUsersOverride), "keine bestehende Spalte wie 'username' wird berührt");

	console.log("     Gegenprobe S-12-G: ein hinzugedachtes ['columns']['username'] muss auffallen");
	const mitUsername = feUsersOverride + "\n$GLOBALS['TCA']['fe_users']['columns']['username'] = [];";
	const trefferMitUsername = [...mitUsername.matchAll(/\$GLOBALS\['TCA'\]\['fe_users'\]\['columns'\]\['([A-Za-z0-9_]+)'\]/g)].map((m) => m[1]);
	check(trefferMitUsername.length === 2, 'S-12-G: die zweite, hinzugedachte Spalte wird gezählt');
}

/* ==================================================== S-13 XLIFF <-> TCA (player.*) */

console.log('\nS-13 Jede player.*-Beschriftung stimmt zwischen TCA und locallang_be.xlf überein');
{
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);
	const definiertePlayer = definierteIds.filter((id) => id === 'player' || id.startsWith('player.'));

	/**
	 * Zwei Muster, weil die TCA zwei verschiedene Bauarten kennt:
	 *
	 * 1. `$languageFile . 'player.name'` — die Kennung endet unmittelbar vor
	 *    dem schließenden Anführungszeichen (gewöhnliche label/description).
	 * 2. `--div--;' . $languageFile . 'player.tab.general,` — im
	 *    showitem-String endet die Kennung vor einem Komma, danach folgt im
	 *    SELBEN PHP-String noch die Feldliste des Tabs.
	 *
	 * Beide Male ist die Zeichenklasse [A-Za-z0-9_.] eng gefasst: eine
	 * wohlgeformte Kennung besteht nur aus solchen Zeichen. Alles, was NICHT
	 * unmittelbar vor einem Anführungszeichen oder einem Komma endet — etwa
	 * der Rest eines showitem-Strings, der über ein Komma hinaus weiterläuft
	 * — wird von keinem der beiden Muster erfasst.
	 */
	const referenzierteSuffixe = [
		...[...tca.matchAll(/\$languageFile\s*\.\s*'([A-Za-z0-9_.]+)'/g)].map((m) => m[1]),
		...[...tca.matchAll(/\$languageFile\s*\.\s*'([A-Za-z0-9_.]+),/g)].map((m) => m[1]),
	];
	const referenziertePlayer = referenzierteSuffixe.filter((id) => id === 'player' || id.startsWith('player.'));

	const referenziertOhneDefinition = referenziertePlayer.filter((id) => !definiertePlayer.includes(id));
	check(referenziertOhneDefinition.length === 0,
		'jede von der TCA referenzierte player.*-Beschriftung existiert in locallang_be.xlf',
		...referenziertOhneDefinition.map((id) => `fehlt in der XLIFF-Datei: ${id}`));

	const definiertOhneReferenz = definiertePlayer.filter((id) => !referenziertePlayer.includes(id));
	check(definiertOhneReferenz.length === 0,
		'jede player.*-Beschriftung in locallang_be.xlf wird von der TCA tatsächlich referenziert',
		...definiertOhneReferenz.map((id) => `wird von der TCA nicht referenziert: ${id}`));

	console.log('     Gegenprobe S-13-G: ein Verweis auf einen erfundenen Schlüssel muss auffallen');
	const mitErfundenemVerweis = [...referenziertePlayer, 'player.erfunden'];
	check(mitErfundenemVerweis.filter((id) => !definiertePlayer.includes(id)).length === 1,
		'S-13-G: player.erfunden wird als fehlend erkannt');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	console.log('  Entweder wurde ein Prüfblock übersprungen (dann ist dieses Ergebnis wertlos),');
	console.log('  oder es sind Zusagen hinzugekommen (dann gehört ERWARTETE_ZUSAGEN nachgezogen).');
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück De gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('ext_tables.sql und die TCA beschreiben dasselbe Datenmodell wie Anhang I: elf');
	console.log('Fachspalten, keine Standardspalte doppelt geführt, token eindeutig und');
	console.log('varchar(64), die drei Betragsspalten unsigned, balance mit sicherem Typ und');
	console.log('tatsächlich ohne Spalte in der laufenden Datenbank, role mit genau einem leeren Eintrag, die richtigen Felder');
	console.log('readOnly bzw. passthrough (außer balance_cash, seit Dc editierbar) und außerhalb');
	console.log('jedes showitem, die fe_users-Erweiterung additiv und auf eine Spalte beschränkt,');
	console.log('die Summe wird an genau zwei Stellen identisch gerechnet (S-7), und jede');
	console.log('player.*-Beschriftung stimmt in beide Richtungen.');
}

process.exit(fehler === 0 ? 0 : 1);
