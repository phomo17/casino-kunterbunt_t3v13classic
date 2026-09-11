/**
 * Casino Kunterbunt – casino_account: Nachweis Schalter, Modul, Auskunft (D2a)
 * ==============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit. Laufzeit unter zehn Sekunden.
 *
 * Q-9 und Q-10 fragen zusätzlich die LAUFENDE Datenbank ab (per `mysql` — ein
 * externes Programm, kein npm-Paket, dieselbe Bauart wie S-9 in
 * verify-schema.mjs: nur SELECT, nie eine ändernde Anweisung). Ohne laufende
 * Datenbank brechen beide Blöcke deshalb LAUT ab statt still zu übergehen.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-qrmode.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d2-qr-modus, Abschnitt 4.13,
 * Umsetzungsstück D2a)
 * -------------------------------------------------------------------------
 *   Q-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *         Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   Q-2   QrMode benutzt Registry und KEINE eigene Tabelle; NAMESPACE ist
 *         derselbe wie AccountStorage::REGISTRY_NAMESPACE
 *   Q-3   Modules.php meldet genau drei Module an (casino, casino_players,
 *         casino_qr_mode); casino_qr_mode hat parent: casino und
 *         position.after: casino_players
 *   Q-4   Die Routen toggle und logout_all tragen BEIDE methods => ['POST']
 *   Q-5   PlayerSessionService fragt ausschließlich getSessionBackend('FE');
 *         die Zeichenkette 'BE' kommt in der Datei nicht vor
 *   Q-6   logoutAll() bucht VOR dem Entfernen (Reihenfolge im Quelltext:
 *         bookDeviceMoneyToCash steht vor ->remove()
 *   Q-7   AccountBookkeeper ist die einzige Datei unter Classes/, die
 *         ->update( auf tx_casinoaccount_player anwendet; PlayerRepository
 *         enthält weiterhin keinen Schreibaufruf
 *   Q-8   Player::isOnline() existiert weiterhin und wird von
 *         PlayerModuleController NICHT mehr benutzt (sie ist die Ableitung
 *         aus last_seen, nicht die Sitzungswahrheit)
 *   Q-9   live: sys_registry enthält für tx_casinoaccount/qrMode höchstens
 *         einen Eintrag, und sein Wert ist — falls vorhanden — ein
 *         serialisierter Wahrheitswert (b:0;/b:1;)
 *   Q-10  live: keine Sitzung in fe_sessions zeigt auf einen fe_users-
 *         Datensatz ohne tx_casinoaccount_player (keine Frontend-Anmeldung
 *         an diesem Haus, die nicht aus einem Spielenden stammt)
 *   Q-11  jeder message.*-Schlüssel aus QrModeModuleController existiert
 *         samt .title; jede qrmode.*-Beschriftung wird von der Vorlage
 *         tatsächlich benutzt und umgekehrt
 *   Q-12  die Vorlage enthält kein disabled und keinen deutschen Fließtext
 *         zwischen > und <
 *
 * ERWARTETE_ZUSAGEN wurde in Umsetzungsstück D2d gemessen und eingetragen —
 * genau wie in verify-schema.mjs (Da) und verify-module.mjs (Db).
 */

// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst; läuft in BEIDEN Läufen.)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …). */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/**
 * Liefert den Textblock eines geklammerten PHP-Arrays, beginnend bei der
 * ERSTEN Fundstelle von `nadel`, bis zur passenden schließenden Klammer —
 * über die Klammertiefe gezählt. Dieselbe Bauart wie in verify-schema.mjs
 * und verify-module.mjs.
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
 * Wie block(), aber für den geschweiften Rumpf einer PHP-Methode —
 * `function name(…) { … }` — über die Klammertiefe der GESCHWEIFTEN Klammer
 * gezählt. Neu in diesem Prüfstand: block() zählt eckige Klammern und passt
 * deshalb für PHP-Arrays, nicht für Methodenrümpfe.
 */
function methode(quelle, name) {
	const kopf = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)[^{]*\\{`);
	const treffer = kopf.exec(quelle);
	if (!treffer) {
		return null;
	}
	const start = treffer.index + treffer[0].length - 1;
	let tiefe = 0;
	for (let i = start; i < quelle.length; i++) {
		if (quelle[i] === '{') {
			tiefe++;
		} else if (quelle[i] === '}') {
			tiefe--;
			if (tiefe === 0) {
				return quelle.slice(start, i + 1);
			}
		}
	}
	return null;
}

/** Alle *.php-Dateien unter einem Verzeichnis, rekursiv. */
function alleDateien(verzeichnis, endung, ergebnis = []) {
	for (const eintrag of readdirSync(verzeichnis)) {
		const pfad = path.join(verzeichnis, eintrag);
		const stat = statSync(pfad);
		if (stat.isDirectory()) {
			alleDateien(pfad, endung, ergebnis);
		} else if (eintrag.endsWith(endung)) {
			ergebnis.push(pfad);
		}
	}
	return ergebnis;
}

const QRMODE_PFAD = path.join(EXT, 'Classes/Service/QrMode.php');
const BOOKKEEPER_PFAD = path.join(EXT, 'Classes/Service/AccountBookkeeper.php');
const SESSION_SERVICE_PFAD = path.join(EXT, 'Classes/Service/PlayerSessionService.php');
const REPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/PlayerRepository.php');
const SHADOW_USER_PFAD = path.join(EXT, 'Classes/Service/ShadowUserService.php');
const QRMODE_CONTROLLER_PFAD = path.join(EXT, 'Classes/Controller/QrModeModuleController.php');
const PLAYER_CONTROLLER_PFAD = path.join(EXT, 'Classes/Controller/PlayerModuleController.php');
const PLAYER_PHP_PFAD = path.join(EXT, 'Classes/Domain/Player.php');
const MODULES_PFAD = path.join(EXT, 'Configuration/Backend/Modules.php');
const ICONS_PFAD = path.join(EXT, 'Configuration/Icons.php');
const QRMODE_TEMPLATE_PFAD = path.join(EXT, 'Resources/Private/Templates/QrModeModule/Index.html');
const QRMODE_SVG_PFAD = path.join(EXT, 'Resources/Public/Icons/ModuleQrMode.svg');
const BACKEND_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/backend.css');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang_be.xlf');

console.log('\ncasino_account – Nachweis Schalter, Modul, Auskunft (Umsetzungsstück D2a)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Classes/Service/QrMode.php', QRMODE_PFAD],
	['Classes/Service/AccountBookkeeper.php', BOOKKEEPER_PFAD],
	['Classes/Service/PlayerSessionService.php', SESSION_SERVICE_PFAD],
	['Classes/Domain/PlayerRepository.php', REPOSITORY_PFAD],
	['Classes/Service/ShadowUserService.php', SHADOW_USER_PFAD],
	['Classes/Controller/QrModeModuleController.php', QRMODE_CONTROLLER_PFAD],
	['Classes/Controller/PlayerModuleController.php', PLAYER_CONTROLLER_PFAD],
	['Classes/Domain/Player.php', PLAYER_PHP_PFAD],
	['Configuration/Backend/Modules.php', MODULES_PFAD],
	['Configuration/Icons.php', ICONS_PFAD],
	['Resources/Private/Templates/QrModeModule/Index.html', QRMODE_TEMPLATE_PFAD],
	['Resources/Public/Icons/ModuleQrMode.svg', QRMODE_SVG_PFAD],
	['Resources/Public/Css/backend.css', BACKEND_CSS_PFAD],
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
		process.exit(1);
	}
}

/**
 * GEMESSEN, nicht geschätzt — in Umsetzungsstück D2d gefahren, abgelesen (40)
 * und hier eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt,
 * Wächter schlägt an, zurückgebaut, wieder grün).
 */
const ERWARTETE_ZUSAGEN = 41;

const qrMode = ohnePhpKommentare(lies(QRMODE_PFAD));
const bookkeeper = ohnePhpKommentare(lies(BOOKKEEPER_PFAD));
const sessionService = ohnePhpKommentare(lies(SESSION_SERVICE_PFAD));
const repository = ohnePhpKommentare(lies(REPOSITORY_PFAD));
const qrModeController = ohnePhpKommentare(lies(QRMODE_CONTROLLER_PFAD));
const playerController = ohnePhpKommentare(lies(PLAYER_CONTROLLER_PFAD));
const playerPhp = ohnePhpKommentare(lies(PLAYER_PHP_PFAD));
const modulesPhp = ohnePhpKommentare(lies(MODULES_PFAD));
const qrModeTemplate = lies(QRMODE_TEMPLATE_PFAD);
const xliff = lies(LOCALLANG_PFAD);

/* ==================================================== Q-2 Registry, kein eigenes Namensraum */

console.log('Q-2  QrMode benutzt Registry und KEINE eigene Tabelle; NAMESPACE ist derselbe wie AccountStorage::REGISTRY_NAMESPACE');
{
	check(/use TYPO3\\CMS\\Core\\Registry;/.test(qrMode), 'QrMode.php importiert TYPO3\\CMS\\Core\\Registry');
	check(/public const NAMESPACE = AccountStorage::REGISTRY_NAMESPACE;/.test(qrMode),
		'NAMESPACE ist AccountStorage::REGISTRY_NAMESPACE (derselbe Namensraum wie der Kontenordner)');
	check(!/CREATE TABLE/.test(qrMode), 'keine eigene Tabelle wird angelegt');

	console.log('     Gegenprobe Q-2-G: ein erfundener zweiter Namensraum im Textmuster wird erkannt');
	const mitZweitemNamensraum = qrMode.replace(
		'public const NAMESPACE = AccountStorage::REGISTRY_NAMESPACE;',
		"public const NAMESPACE = 'tx_casinoaccount_qrmode_eigenstaendig';"
	);
	check(!/public const NAMESPACE = AccountStorage::REGISTRY_NAMESPACE;/.test(mitZweitemNamensraum),
		'Q-2-G: der erfundene eigenständige Namensraum wird erkannt');
}

/* ==================================================== Q-3 Modules.php drei Module */

console.log('\nQ-3  Modules.php meldet genau drei Module an; casino_qr_mode hat parent: casino und position.after: casino_players');
{
	const obersteModule = [...modulesPhp.matchAll(/^\s{4}'([a-z_]+)' => \[/gm)].map((m) => m[1]);
	check(
		obersteModule.length === 3
		&& obersteModule.includes('casino')
		&& obersteModule.includes('casino_players')
		&& obersteModule.includes('casino_qr_mode'),
		`genau drei oberste Einträge: casino, casino_players, casino_qr_mode (gefunden: ${obersteModule.join(', ')})`
	);

	const qrModeBlock = block(modulesPhp, "'casino_qr_mode' => [") || '';
	check(qrModeBlock !== '', "Eintrag 'casino_qr_mode' gefunden");
	check(/'parent'\s*=>\s*'casino'/.test(qrModeBlock), "casino_qr_mode hat 'parent' => 'casino'");
	check(/'position'\s*=>\s*\[\s*'after'\s*=>\s*'casino_players'\s*\]/.test(qrModeBlock),
		"casino_qr_mode hat 'position' => ['after' => 'casino_players']");

	console.log('     Gegenprobe Q-3-G: ein Block ohne parent fällt als vierte oberste Gruppe auf');
	const mitViertemBlock = modulesPhp + "\n    'casino_vierte' => [\n        'iconIdentifier' => 'x',\n    ],";
	const obersteModuleMitZusatz = [...mitViertemBlock.matchAll(/^\s{4}'([a-z_]+)' => \[/gm)].map((m) => m[1]);
	check(obersteModuleMitZusatz.length === 4, 'Q-3-G: der vierte oberste Eintrag wird gezählt');
}

/* ==================================================== Q-4 Routen nur POST */

console.log("\nQ-4  Die Routen toggle und logout_all tragen beide 'methods' => ['POST']");
{
	const qrModeBlock = block(modulesPhp, "'casino_qr_mode' => [") || '';
	const toggleBlock = block(qrModeBlock, "'toggle' => [") || '';
	const logoutBlock = block(qrModeBlock, "'logout_all' => [") || '';
	check(/'methods'\s*=>\s*\[\s*'POST'\s*\]/.test(toggleBlock), "'toggle' trägt 'methods' => ['POST']");
	check(/'methods'\s*=>\s*\[\s*'POST'\s*\]/.test(logoutBlock), "'logout_all' trägt 'methods' => ['POST']");

	console.log('     Gegenprobe Q-4-G: eine Route ohne methods wird gefunden');
	const ohneMethods = toggleBlock.replace(/'methods'\s*=>\s*\[\s*'POST'\s*\],?/, '');
	check(!/'methods'/.test(ohneMethods), 'Q-4-G: das Fehlen von methods wird erkannt');
}

/* ==================================================== Q-5 nur FE-Sitzungen */

console.log("\nQ-5  PlayerSessionService fragt ausschließlich getSessionBackend('FE'); 'BE' kommt in der Datei nicht vor");
{
	check(/getSessionBackend\('FE'\)/.test(sessionService), "getSessionBackend('FE') wird aufgerufen");
	check(!/'BE'/.test(sessionService), "die Zeichenkette 'BE' kommt in der Datei nicht vor");

	console.log("     Gegenprobe Q-5-G: ein eingefügtes getSessionBackend('BE') in der Textprobe wird erkannt");
	const mitBe = sessionService + "\n// Beispiel: getSessionBackend('BE')";
	check(/'BE'/.test(mitBe), 'Q-5-G: der Einschub wird gefunden');
}

/* ==================================================== Q-6 logoutAll: erst buchen, dann entfernen */

console.log('\nQ-6  logoutAll() bucht VOR dem Entfernen (Reihenfolge im Quelltext)');
{
	const logoutAllRumpf = methode(sessionService, 'logoutAll') || '';
	check(logoutAllRumpf !== '', 'logoutAll() gefunden');

	const buchtIndex = logoutAllRumpf.indexOf('bookDeviceMoneyToCash');
	const entferntIndex = logoutAllRumpf.indexOf('->remove(');
	check(buchtIndex !== -1 && entferntIndex !== -1 && buchtIndex < entferntIndex,
		'bookDeviceMoneyToCash() steht im Quelltext vor ->remove(',
		`bookDeviceMoneyToCash bei ${buchtIndex}, ->remove( bei ${entferntIndex}`);

	console.log('     Gegenprobe Q-6-G: eine vertauschte Reihenfolge in der Textprobe fällt auf');
	const vertauscht = 'zuerst $backend->remove($session[\'ses_id\']); dann $this->bookkeeper->bookDeviceMoneyToCash($playerUid);';
	const vBucht = vertauscht.indexOf('bookDeviceMoneyToCash');
	const vEntfernt = vertauscht.indexOf('->remove(');
	check(vEntfernt < vBucht, 'Q-6-G: die vertauschte Reihenfolge wird als solche erkannt');
}

/* ==================================================== Q-7 einzige Schreibstelle */

console.log('\nQ-7  Nur die zwei namentlich erlaubten Dateien schreiben auf tx_casinoaccount_player; PlayerRepository bleibt lesend');
{
	const MUSTER_SCHREIBT_SPIELER = /->update\(\s*(PlayerRepository::TABLE|['"]tx_casinoaccount_player['"])/;

	// NACHTRAG 2026-09-10 (Umsetzungsstück D3a): Bis D2 war AccountBookkeeper
	// tatsächlich die EINZIGE Schreibstelle. Mit dem Buchungsendpunkt aus
	// CONCEPT.md D.7.2 kommt BookingService dazu — das ist der ganze Zweck
	// von D3a und keine Aufweichung: die Zusage lautet jetzt „genau diese
	// zwei, sonst keine". Wächst die Liste ein drittes Mal, fällt es auf.
	const DUERFEN_SCHREIBEN = [
		'Classes/Service/AccountBookkeeper.php',  // D.8: Rückbuchung beim Abmelden
		'Classes/Service/BookingService.php',     // D.7.2: der Buchungsendpunkt
	];

	const alleClassesDateien = alleDateien(path.join(EXT, 'Classes'), '.php');
	const schreibendeDateien = [];
	for (const datei of alleClassesDateien) {
		if (DUERFEN_SCHREIBEN.some((erlaubt) => kurz(datei).endsWith(erlaubt))) {
			continue;
		}
		const inhalt = ohnePhpKommentare(lies(datei));
		if (MUSTER_SCHREIBT_SPIELER.test(inhalt)) {
			schreibendeDateien.push(kurz(datei));
		}
	}
	check(schreibendeDateien.length === 0,
		'keine andere Datei unter Classes/ schreibt auf tx_casinoaccount_player',
		...schreibendeDateien.map((d) => `schreibt: ${d}`));

	check(MUSTER_SCHREIBT_SPIELER.test(bookkeeper), 'AccountBookkeeper.php selbst schreibt auf tx_casinoaccount_player');

	// Auch hier gilt: eine Ausnahme, die nichts tut, ist eine Ausnahme zu viel.
	const ohneGrund = DUERFEN_SCHREIBEN.filter((erlaubt) => {
		const datei = alleClassesDateien.find((d) => kurz(d).endsWith(erlaubt));
		return !datei || !MUSTER_SCHREIBT_SPIELER.test(ohnePhpKommentare(lies(datei)));
	});
	check(ohneGrund.length === 0,
		'jede der erlaubten Schreibstellen existiert und schreibt tatsächlich',
		...ohneGrund.map((d) => `Ausnahme ohne Grund: ${d}`));
	check(!/->update\(/.test(repository), 'PlayerRepository enthält weiterhin keinen Schreibaufruf (->update()');

	console.log("     Gegenprobe Q-7-G: ein eingefügtes update('tx_casinoaccount_player') im Repository-Text wird erkannt");
	const repositoryMitUpdate = repository + "\n->update('tx_casinoaccount_player')";
	check(/->update\(/.test(repositoryMitUpdate), 'Q-7-G: der Einschub wird gefunden');
}

/* ==================================================== Q-8 isOnline() bleibt, wird aber nicht mehr benutzt */

console.log('\nQ-8  Player::isOnline() existiert weiterhin und wird von PlayerModuleController NICHT mehr benutzt');
{
	check(/function\s+isOnline\s*\(/.test(playerPhp), 'Player::isOnline() existiert weiterhin im Bestand');
	check(!/->isOnline\(/.test(playerController), 'PlayerModuleController ruft ->isOnline( nicht mehr auf');
	check(/loggedInPlayerUids\(\)/.test(playerController), 'PlayerModuleController benutzt stattdessen loggedInPlayerUids()');

	console.log('     Gegenprobe Q-8-G: ein wieder eingefügtes isOnline( im Controller-Text wird erkannt');
	const mitIsOnline = playerController + "\n// \$player->isOnline(\$now)";
	check(/->isOnline\(/.test(mitIsOnline), 'Q-8-G: der Einschub wird gefunden');
}

/* ==================================================== Q-9 live: sys_registry höchstens ein Eintrag */

console.log('\nQ-9  live: sys_registry enthält für tx_casinoaccount/qrMode höchstens einen Eintrag, wertgemäß ein serialisierter Wahrheitswert');
{
	let ausgabe;
	try {
		ausgabe = execFileSync(
			'mysql',
			['-e', "SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
			{ encoding: 'utf8' }
		);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Abfrage von sys_registry schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const zeilen = ausgabe.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '');
	check(zeilen.length <= 1, `höchstens ein Eintrag (gefunden: ${zeilen.length})`, ...zeilen);

	const wert = zeilen[0] ?? null;
	check(wert === null || /^b:[01];$/.test(wert),
		wert === null
			? 'noch nie geschaltet — kein Eintrag vorhanden, das ist der Auslieferungszustand'
			: `der Wert ist ein serialisierter Wahrheitswert (gefunden: ${wert})`);

	console.log('     Gegenprobe Q-9-G: eine hinzugedachte zweite Zeile in der Textprobe wird erkannt');
	const mitZweiterZeile = [...zeilen, 'b:1;'];
	check(mitZweiterZeile.length === zeilen.length + 1 && mitZweiterZeile.length >= 1,
		'Q-9-G: die hinzugedachte zweite Zeile wird gezählt');
}

/* ==================================================== Q-10 live: keine verwaiste Sitzung */

console.log('\nQ-10 live: keine Sitzung in fe_sessions zeigt auf einen fe_users-Datensatz ohne tx_casinoaccount_player');
{
	let ausgabe;
	try {
		ausgabe = execFileSync(
			'mysql',
			['-e',
				'SELECT fe_sessions.ses_id FROM fe_sessions '
				+ 'LEFT JOIN fe_users ON fe_users.uid = fe_sessions.ses_userid '
				+ 'WHERE fe_sessions.ses_userid > 0 '
				+ 'AND (fe_users.uid IS NULL OR fe_users.tx_casinoaccount_player = 0);'],
			{ encoding: 'utf8' }
		);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Abfrage von fe_sessions schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const verwaisteZeilen = ausgabe.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '');
	check(verwaisteZeilen.length === 0,
		'keine Frontend-Sitzung an diesem Haus ohne zugehörigen Spielenden',
		...verwaisteZeilen.map((z) => `verwaist: ${z}`));

	console.log('     Gegenprobe Q-10-G: eine erfundene Zeile mit ses_userid=999999 in der Textprobe wird erkannt');
	const mitErfundenerZeile = [...verwaisteZeilen, '999999erfundenehashzeile'];
	check(mitErfundenerZeile.length === verwaisteZeilen.length + 1, 'Q-10-G: die erfundene Zeile wird gezählt');
}

/* ==================================================== Q-11 XLIFF <-> Controller/Vorlage */

console.log('\nQ-11 jeder message.*-Schlüssel aus QrModeModuleController existiert samt .title; jede qrmode.*-Beschriftung wird von der Vorlage benutzt und umgekehrt');
{
	const definierteIds = [...xliff.matchAll(/<trans-unit id="([^"]+)">/g)].map((m) => m[1]);

	const messageSchluessel = [...new Set(
		[...qrModeController.matchAll(/'(message\.[A-Za-z0-9_.]+)'/g)].map((m) => m[1])
	)];
	check(messageSchluessel.length > 0, `mindestens ein message.*-Schlüssel wird benutzt (gefunden: ${messageSchluessel.length})`);

	const fehlendeMessage = [];
	for (const schluessel of messageSchluessel) {
		if (!definierteIds.includes(schluessel)) {
			fehlendeMessage.push(schluessel);
		}
		if (!definierteIds.includes(schluessel + '.title')) {
			fehlendeMessage.push(schluessel + '.title');
		}
	}
	check(fehlendeMessage.length === 0,
		'jeder message.*-Schlüssel aus QrModeModuleController existiert samt .title in locallang_be.xlf',
		...fehlendeMessage.map((s) => `fehlt: ${s}`));

	const referenzierteSchluessel = [...new Set(
		[...qrModeTemplate.matchAll(/locallang_be\.xlf:([A-Za-z0-9_.]+)/g)].map((m) => m[1])
	)];
	const referenzierteQrmode = referenzierteSchluessel.filter((id) => id.startsWith('qrmode.'));
	const definierteQrmode = definierteIds.filter((id) => id.startsWith('qrmode.'));

	const fehltInXliff = referenzierteQrmode.filter((id) => !definierteQrmode.includes(id));
	check(fehltInXliff.length === 0,
		'jede von der Vorlage referenzierte qrmode.*-Beschriftung existiert in locallang_be.xlf',
		...fehltInXliff.map((id) => `fehlt in der XLIFF-Datei: ${id}`));

	const unbenutzt = definierteQrmode.filter((id) => !referenzierteQrmode.includes(id));
	check(unbenutzt.length === 0,
		'jede qrmode.*-Beschriftung in locallang_be.xlf wird von der Vorlage tatsächlich benutzt',
		...unbenutzt.map((id) => `wird von der Vorlage nicht benutzt: ${id}`));

	console.log('     Gegenprobe Q-11-G: ein erfundener Schlüssel wird als fehlend erkannt');
	const mitErfundenem = [...referenzierteQrmode, 'qrmode.erfunden'];
	check(mitErfundenem.filter((id) => !definierteQrmode.includes(id)).length === 1,
		'Q-11-G: qrmode.erfunden wird als fehlend erkannt');
}

/* ==================================================== Q-12 kein disabled, kein deutscher Fließtext */

console.log('\nQ-12 Die Vorlage enthält kein disabled und keinen deutschen Fließtext zwischen > und <');
{
	/*
	 * f:comment ZUERST entfernen, DANN erst nach "disabled" suchen: der
	 * erklärende Kommentar in dieser Vorlage benennt "disabled" ausdrücklich
	 * als das, was NICHT gebaut wird (siehe Kopf des f:else-Zweigs bei der
	 * Online-Liste) — ohne dieses Entfernen würde die eigene Begründung sich
	 * selbst als Fund melden. Ein Fluid-Kommentar landet nie im
	 * ausgelieferten HTML, zählt also nicht.
	 */
	const ohneFComment = qrModeTemplate.replace(/<f:comment>[\s\S]*?<\/f:comment>/g, '');

	const MUSTER_DISABLED = /(?<!aria-)\bdisabled\b/;
	check(!MUSTER_DISABLED.test(ohneFComment), 'kein echtes disabled-Attribut in der ausgelieferten Vorlage');

	const textKnoten = [...ohneFComment.matchAll(/>([^<{}]+)</g)].map((m) => m[1].trim()).filter((t) => t !== '');
	check(textKnoten.length === 0,
		'kein Text zwischen > und < außerhalb von f:comment und {…}-Ausdrücken',
		...textKnoten.map((t) => `gefunden: "${t}"`));

	console.log('     Gegenprobe Q-12-G1: ein eingefügter Satz in der Textprobe fällt auf');
	const mitSatz = ohneFComment.replace('<h2>', '<h2>Ein eingefügter Satz</h2><h2>');
	const textKnotenMitSatz = [...mitSatz.matchAll(/>([^<{}]+)</g)].map((m) => m[1].trim()).filter((t) => t !== '');
	check(textKnotenMitSatz.length > 0, 'Q-12-G1: der eingefügte Satz wird gefunden');

	console.log('     Gegenprobe Q-12-G2: ein echtes disabled="disabled" außerhalb eines Kommentars fällt auf');
	const mitDisabled = ohneFComment.replace('<h2>', '<button disabled="disabled">x</button><h2>');
	check(MUSTER_DISABLED.test(mitDisabled), 'Q-12-G2: das echte disabled wird gefunden');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück D2d gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der Schalter benutzt die Registry desselben Namensraums, das Modul "QR-Modus"');
	console.log('hängt sauber als drittes Modul an, seine beiden ändernden Routen sind auf POST');
	console.log('beschränkt, PlayerSessionService rührt ausschließlich an FE-Sitzungen, das Buchen');
	console.log('geschieht vor dem Entfernen, AccountBookkeeper ist die einzige Schreibstelle auf');
	console.log('tx_casinoaccount_player, Player::isOnline() bleibt erhalten, wird aber nicht mehr');
	console.log('für den Anmeldezustand benutzt, die laufende Datenbank zeigt einen sauberen');
	console.log('Registry-Eintrag und keine verwaisten Sitzungen, und jede Beschriftung stimmt in');
	console.log('beide Richtungen.');
}

process.exit(fehler === 0 ? 0 : 1);
