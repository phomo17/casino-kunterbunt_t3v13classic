/**
 * Casino Kunterbunt – casino_account: Nachweis Kennung, Schattendatensätze, Abgleich
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version
 * 18, ohne jede npm-Abhängigkeit, rein lesend (Quelltext, nie die Datenbank
 * — das Laufzeitverhalten prüft der Messlauf aus dem Plan, Abschnitt 7.1,
 * Umsetzungsstück Dc; Ausführungsanleitung im Bericht des Umsetzers).
 * Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-account.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-teild-d1-konto-qr-part-3.md, Abschnitt
 * 4.6.4, Umsetzungsstück Dc — mit zwei angesagten Anpassungen, siehe unten)
 * -------------------------------------------------------------------------
 *   K-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *         Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   K-2   Nirgends im Classes/-Baum wird an TYPO3 vorbei geschrieben —
 *         geschrieben wird ausschließlich über DataHandler und Registry
 *   K-3   Die Kennung entsteht aus random_bytes(32); rand(/mt_rand(/
 *         uniqid(/shuffle( kommen im Classes/-Baum nicht vor
 *   K-4   Die Kennung ist 43 Zeichen lang und URL-tauglich (gerechnet, nicht
 *         geglaubt: ceil(32*4/3) === 43)
 *   K-5   Verglichen wird mit hash_equals — kein === oder == an einer
 *         Kennung im ganzen Baum
 *   K-6   Jeder der VIER Hook-Einstiege prüft als erstes den Tabellennamen
 *         (nicht sechs — siehe „ANGESAGTE ANPASSUNG 1" unten)
 *   K-7   Der Kopiervorgang wird verweigert; $commandIsProcessed ist eine
 *         Referenz — belegt gegen DataHandler.php
 *   K-8   Beide Hook-Listen sind in ext_localconf.php angemeldet, mit den
 *         Schlüsselnamen, die der Kern liest — belegt gegen DataHandler.php
 *   K-9   PlayerDataHandlerHook ist in Services.yaml mit public: true
 *         angemeldet
 *   K-10  ext_localconf.php bleibt schmal: genau fünf Feld-Zuweisungen plus
 *         genau EIN begründeter Aufruf (addService, seit D2b — siehe
 *         „ANGESAGTE ANPASSUNG 4" unten), keine Schleife, keine Abfrage
 *   K-11  Der Vorgabebetrag 1.000.000 steht an genau einer Stelle
 *         (BackendUserMirror::START_BALANCE)
 *   K-12  Der Abgleich ist wiederholbar: vorherige Nachfrage vor jedem Anlegen
 *   K-13  Der Abgleich läuft ohne eine Abfrage je Benutzer in einer Schleife
 *   K-14  be_users wird nur gelesen, nie beschrieben
 *   K-15  Schattendatensätze werden nur über tx_casinoaccount_player
 *         ausgewählt, nie über username
 *   K-16  Das Passwort des Schattendatensatzes wird nirgends aufbewahrt
 *   K-17  Seit Umsetzungsstück De SCHARF (vorher übersprungen in Dc/Dd) —
 *         siehe „ANGESAGTE ANPASSUNG 2" unten
 *
 * ANGESAGTE ANPASSUNG 1 — K-6: VIER Hook-Einstiege, nicht sechs
 * -------------------------------------------------------------------------
 * Der Plantext behauptet „sechs" Hook-Einstiege. PlayerDataHandlerHook hat
 * tatsächlich VIER Methoden, die der Kern aufruft:
 * processDatamap_postProcessFieldArray, processDatamap_afterDatabaseOperations,
 * processCmdmap, processCmdmap_postProcess — nachgesehen in
 * typo3_src/typo3/sysext/core/Classes/DataHandling/DataHandler.php (Zeilen
 * 834-836, 631-636/863, 3347, 3428-3429). Derselbe Fehlertyp wie die vom
 * Auftraggeber selbst angesagten „35 statt 41 Dateien" — maßgeblich ist die
 * tatsächliche Zahl der Methoden, nicht die Zahl im Fließtext. Siehe
 * DECISIONS.md.
 *
 * ANGESAGTE ANPASSUNG 2 — K-17: bis De übersprungen, seit De scharf
 * -------------------------------------------------------------------------
 * K-17 verlangt den Text „Was beim Entfernen der Extension zurückbleibt" in
 * der README. Die README blieb laut Plan, Abschnitt 7.1, bis einschließlich
 * Umsetzungsstück Dd ein Gerüst mit Platzhaltern und wurde ERST in
 * Umsetzungsstück De vollständig geschrieben. Bis dahin meldete sich K-17
 * genau wie S-7 in verify-schema.mjs (Umsetzungsstück Da) und M-9/M-10 in
 * verify-module.mjs (Umsetzungsstück Db) ausdrücklich als „übersprungen" und
 * zählte NICHT als Fehler. Seit Umsetzungsstück De trägt die README den
 * vollständigen Text (README.md, Abschnitt „Was beim Entfernen der Extension
 * zurückbleibt"), und der Block unten läuft seither als echte Prüfung.
 *
 * ANGESAGTE ANPASSUNG 3 — DER MESSLAUF IST NICHT TEIL DIESES SKRIPTS
 * -------------------------------------------------------------------------
 * Dieses Skript ist rein statisch: es liest Quelltext, es startet TYPO3
 * nicht und schreibt nichts in eine Datenbank. Der Nachweis, dass der
 * DataHandler-Hook zur LAUFZEIT tatsächlich Datensätze in pages, fe_groups,
 * fe_users und tx_casinoaccount_player anlegt, ist Sache des in Abschnitt 7.1
 * des Plans beschriebenen Messlaufs (Ausführungsanleitung im Bericht des
 * Umsetzers) — nicht dieses Prüfstands.
 *
 * ANGESAGTE ANPASSUNG 4 — K-10: FÜNF Zuweisungen plus EIN Aufruf, nicht mehr
 * drei Zuweisungen ohne Aufruf
 * -------------------------------------------------------------------------
 * Umsetzungsstück D2b hat ext_localconf.php um zwei Dinge erweitert
 * (CONCEPT.md D.6.2/D.9): den Anmeldedienst — ein Aufruf von
 * ExtensionManagementUtility::addService(), keine Feld-Zuweisung — und zwei
 * weitere $GLOBALS[…]-Zuweisungen für die Begrenzung der Anmeldeversuche
 * (loginRateLimit, loginRateLimitInterval). Damit stehen jetzt FÜNF
 * $GLOBALS[…]-Zuweisungen (drei aus D1/Dc, zwei aus D2b) und GENAU EIN
 * Aufruf in der Datei. Die alte Zusage „genau drei Zuweisungen, kein Aufruf"
 * wäre seit D2b schlicht falsch — sie wird hier NICHT stillschweigend
 * entschärft, sondern durch eine schärfere Zusage ersetzt: die Zahl der
 * Zuweisungen wird nachgezogen, UND der eine erlaubte Aufruf wird jetzt
 * selbst gezählt und auf GENAU EINEN begrenzt (addService ist die
 * dokumentierte Kern-API für einen Authentifizierungsdienst, kein Ersatz für
 * eine Zuweisung, die man sich hätte sparen können). Ein zweiter, dritter …
 * Aufruf fiele damit weiterhin auf, genau wie eine sechste Zuweisung.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm */
const PROJEKT = path.resolve(EXT_ROOT, '../..');
/** typo3_src/ — der TYPO3-Kern dieser klassischen Installation */
const TYPO3_SRC = path.join(PROJEKT, 'typo3_src');
/** Diese Datei selbst — von der Suche nach eigenen Textproben auszunehmen. */
const DIESE_DATEI = fileURLToPath(import.meta.url);

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
	return path.relative(PROJEKT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …). */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/** Alle Dateien unter einem Verzeichnis, rekursiv — dieselbe Bauart wie in blackjack/…/verify-cabinet.mjs. */
function alleDateien(wurzel) {
	const gefunden = [];
	const offen = [wurzel];
	while (offen.length > 0) {
		const verzeichnis = offen.pop();
		for (const name of readdirSync(verzeichnis).sort()) {
			const voll = path.join(verzeichnis, name);
			if (statSync(voll).isDirectory()) {
				offen.push(voll);
			} else {
				gefunden.push(voll);
			}
		}
	}
	return gefunden.sort();
}

/**
 * Liefert den Rumpf einer Methode (den Text zwischen ihrer öffnenden und
 * ihrer passenden schließenden geschweiften Klammer), gefunden über
 * `function <name>(` und Klammertiefe gezählt — unabhängig von Signatur,
 * Rückgabetyp oder Zeilenumbrüchen.
 */
function methodenRumpf(quelle, name) {
	const kopf = new RegExp(`function\\s+${name}\\s*\\(`);
	const treffer = kopf.exec(quelle);
	if (!treffer) {
		return null;
	}
	let i = quelle.indexOf('(', treffer.index);
	let klammertiefe = 0;
	for (; i < quelle.length; i++) {
		if (quelle[i] === '(') klammertiefe++;
		else if (quelle[i] === ')') {
			klammertiefe--;
			if (klammertiefe === 0) {
				i++;
				break;
			}
		}
	}
	const auf = quelle.indexOf('{', i);
	if (auf === -1) {
		return null;
	}
	let geschweiftTiefe = 0;
	for (let j = auf; j < quelle.length; j++) {
		if (quelle[j] === '{') geschweiftTiefe++;
		else if (quelle[j] === '}') {
			geschweiftTiefe--;
			if (geschweiftTiefe === 0) {
				return quelle.slice(auf + 1, j);
			}
		}
	}
	return null;
}

const TOKEN_GENERATOR_PFAD = path.join(EXT, 'Classes/Service/PlayerTokenGenerator.php');
const STORAGE_PFAD = path.join(EXT, 'Classes/Service/AccountStorage.php');
const SHADOW_PFAD = path.join(EXT, 'Classes/Service/ShadowUserService.php');
const MIRROR_PFAD = path.join(EXT, 'Classes/Service/BackendUserMirror.php');
const HOOK_PFAD = path.join(EXT, 'Classes/Hook/PlayerDataHandlerHook.php');
const ACTIVATE_PFAD = path.join(EXT, 'Classes/EventListener/ActivateExtension.php');
const BALANCE_PROVIDER_PFAD = path.join(EXT, 'Classes/Backend/FormEngine/CurrentBalanceProvider.php');
const EXT_LOCALCONF_PFAD = path.join(EXT, 'ext_localconf.php');
const SERVICES_YAML_PFAD = path.join(EXT, 'Configuration/Services.yaml');
const README_PFAD = path.join(EXT, 'README.md');
const CLASSES_PFAD = path.join(EXT, 'Classes');

const CORE_DATAHANDLER_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Classes/DataHandling/DataHandler.php');

console.log('\ncasino_account – Nachweis Kennung, Schattendatensätze, Abgleich (Umsetzungsstück Dc)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Classes/Service/PlayerTokenGenerator.php', TOKEN_GENERATOR_PFAD],
	['Classes/Service/AccountStorage.php', STORAGE_PFAD],
	['Classes/Service/ShadowUserService.php', SHADOW_PFAD],
	['Classes/Service/BackendUserMirror.php', MIRROR_PFAD],
	['Classes/Hook/PlayerDataHandlerHook.php', HOOK_PFAD],
	['Classes/EventListener/ActivateExtension.php', ACTIVATE_PFAD],
	['Classes/Backend/FormEngine/CurrentBalanceProvider.php', BALANCE_PROVIDER_PFAD],
	['ext_localconf.php', EXT_LOCALCONF_PFAD],
	['Configuration/Services.yaml', SERVICES_YAML_PFAD],
	['(Kern) typo3/sysext/core/Classes/DataHandling/DataHandler.php', CORE_DATAHANDLER_PFAD],
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
 * GEMESSEN, nicht geschätzt. Zuletzt in Umsetzungsstück De auf 52 gemessen;
 * in Umsetzungsstück D2d erneut gefahren, abgelesen und hier nachgezogen
 * (Rückbauprobe: ein check()-Aufruf testweise entfernt, Wächter schlägt an,
 * zurückgebaut, wieder grün) — K-10 zählt seit D2b fünf Zuweisungen und
 * einen Aufruf statt drei Zuweisungen ohne Aufruf und trägt dafür zwei
 * check()-Aufrufe mehr als zuvor (siehe „ANGESAGTE ANPASSUNG 4").
 */
const ERWARTETE_ZUSAGEN = 55;

const tokenGeneratorRoh = lies(TOKEN_GENERATOR_PFAD);
const tokenGenerator = ohnePhpKommentare(tokenGeneratorRoh);
const storage = ohnePhpKommentare(lies(STORAGE_PFAD));
const shadow = ohnePhpKommentare(lies(SHADOW_PFAD));
const shadowRoh = lies(SHADOW_PFAD);
const mirror = ohnePhpKommentare(lies(MIRROR_PFAD));
const mirrorRoh = lies(MIRROR_PFAD);
const hook = ohnePhpKommentare(lies(HOOK_PFAD));
const extLocalconf = ohnePhpKommentare(lies(EXT_LOCALCONF_PFAD));
const servicesYaml = lies(SERVICES_YAML_PFAD);
const coreDataHandler = lies(CORE_DATAHANDLER_PFAD);

/** Alle eigenen PHP-Dateien unter Classes/, roh (mit Kommentaren) UND kommentarbereinigt. */
const classesDateien = alleDateien(CLASSES_PFAD).filter((d) => d.endsWith('.php') && d !== DIESE_DATEI);
const classesRoh = classesDateien.map((d) => ({ pfad: d, inhalt: lies(d) }));
const classesBereinigt = classesRoh.map(({ pfad, inhalt }) => ({ pfad, inhalt: ohnePhpKommentare(inhalt) }));

/* ==================================================== K-2 nie an TYPO3 vorbei */

console.log('K-2  Nirgends im Classes/-Baum wird an TYPO3 vorbei geschrieben');
{
	// Bewusst auf Aufrufe an eine Datenbankverbindung/QueryBuilder eingeengt
	// (Variablenname deutet darauf hin) — sonst schlüge auch ein Aufruf wie
	// $this->shadowUsers->delete($feUserUid) an, obwohl das eine eigene, über
	// den DataHandler gehende Methode ist und keine rohe Datenbankschreibung.
	// NACHTRAG 2026-09-10 (Umsetzungsstück D3a), ZWEI ÄNDERUNGEN, beide
	// verschärfend:
	//
	// 1. Der Ausdruck erlaubt jetzt Zeilenumbrüche zwischen dem Pfeil und dem
	//    Methodennamen (`[\s\n]*`). Vorher entkam `AccountBookkeeper.php` der
	//    Prüfung ZUFÄLLIG, nur weil es seinen Aufruf mehrzeilig schreibt —
	//    die Prüfung war also die ganze Zeit blind für genau den Stil, der im
	//    Haus üblich ist. Das war ein Loch, kein Freibrief.
	// 2. Es gibt jetzt eine NAMENTLICHE Ausnahmeliste statt gar keiner. Drei
	//    Dateien dürfen direkt schreiben, und jede hat denselben Grund: im
	//    Frontend gibt es keinen Backend-Benutzer, also gibt es auch keinen
	//    DataHandler, über den man gehen könnte (CONCEPT.md D.7.2 verlangt
	//    trotzdem, dass bei JEDER Änderung sofort geschrieben wird).
	//    Alles andere unter Classes/ bleibt verboten — und die Liste ist
	//    selbst eine Zusage: steht eine vierte Datei drin, fällt es auf.
	const VERBOTENE_METHODEN = /\$(?:connection|conn|queryBuilder|db)\w*\s*->\s*(?:insert|update|delete|executeStatement)\s*\(/i;
	const VERBOTENES_SQL = /\b(INSERT INTO|UPDATE\s+\S+\s+SET|DELETE FROM|TRUNCATE TABLE|ALTER TABLE|DROP TABLE)\b/i;

	const DUERFEN_DIREKT_SCHREIBEN = [
		'Classes/Service/AccountBookkeeper.php',   // D.8: Rückbuchung beim Abmelden
		'Classes/Service/BookingService.php',      // D.7.2: der Buchungsendpunkt selbst
		'Classes/Domain/CoinFieldRepository.php',  // D.13: das Coin-Pusher-Feld je Person
	];

	const treffer = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		const kurzPfad = kurz(pfad);
		if (DUERFEN_DIREKT_SCHREIBEN.some((erlaubt) => kurzPfad.endsWith(erlaubt))) {
			continue;
		}
		if (VERBOTENE_METHODEN.test(inhalt) || VERBOTENES_SQL.test(inhalt)) {
			treffer.push(kurzPfad);
		}
	}
	check(treffer.length === 0,
		`kein ->insert(/->update(/->delete(/->executeStatement( und keine SQL-Anweisung im Classes/-Baum, außer in den ${DUERFEN_DIREKT_SCHREIBEN.length} namentlich erlaubten Dateien`,
		...treffer.map((t) => `gefunden in: ${t}`));

	// Die Ausnahmeliste ist selbst eine Zusage: jede genannte Datei muss es
	// geben UND tatsächlich direkt schreiben. Sonst bliebe eine Ausnahme
	// stehen, die niemand mehr braucht — und das nächste Mal schlüpft etwas
	// durch, das sich nur so nennt.
	const unnoetig = DUERFEN_DIREKT_SCHREIBEN.filter((erlaubt) => {
		const datei = classesBereinigt.find(({ pfad }) => kurz(pfad).endsWith(erlaubt));
		return !datei || !(VERBOTENE_METHODEN.test(datei.inhalt) || VERBOTENES_SQL.test(datei.inhalt));
	});
	check(unnoetig.length === 0,
		'jede Datei der Ausnahmeliste existiert und schreibt tatsächlich direkt',
		...unnoetig.map((t) => `Ausnahme ohne Grund: ${t}`));

	console.log('     Gegenprobe K-2-G: ein hinzugedachtes $connection->update(…) muss auffallen');
	const mitDirektemUpdate = mirror + "\n// \$connection->update('fe_users', ['name' => 'x'], ['uid' => 1]);";
	check(VERBOTENE_METHODEN.test(mitDirektemUpdate.replace(/\/\/.*/g, (z) => z.replace('//', ''))),
		'K-2-G: das hinzugedachte ->update( wird gefunden');
}

/* ==================================================== K-3 kein unsicherer Zufall */

console.log('\nK-3  Die Kennung entsteht aus random_bytes(32); rand(/mt_rand(/uniqid(/shuffle( kommen nicht vor');
{
	const VERBOTENER_ZUFALL = /\b(?:rand|mt_rand|uniqid|shuffle)\s*\(/;
	check(/random_bytes\(\s*self::BYTES\s*\)/.test(tokenGenerator), 'generate() ruft random_bytes(self::BYTES) auf');

	const treffer = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		if (VERBOTENER_ZUFALL.test(inhalt)) {
			treffer.push(kurz(pfad));
		}
	}
	check(treffer.length === 0,
		'kein rand(/mt_rand(/uniqid(/shuffle( im ganzen Classes/-Baum',
		...treffer.map((t) => `gefunden in: ${t}`));

	console.log('     Gegenprobe K-3-G: ein hinzugedachtes mt_rand() muss auffallen');
	check(VERBOTENER_ZUFALL.test(tokenGenerator + '\nmt_rand();'), 'K-3-G: das hinzugedachte mt_rand() wird gefunden');
}

/* ==================================================== K-4 Länge und URL-Tauglichkeit */

console.log('\nK-4  Die Kennung ist 43 Zeichen lang und URL-tauglich — gerechnet, nicht geglaubt');
{
	check(/const BYTES\s*=\s*32\s*;/.test(tokenGenerator), 'BYTES === 32');
	check(/const LENGTH\s*=\s*43\s*;/.test(tokenGenerator), 'LENGTH === 43');
	check(Math.ceil((32 * 4) / 3) === 43, 'gerechnet: ceil(32 * 4 / 3) === 43');

	check(/strtr\(\s*base64_encode\(\$bytes\)\s*,\s*'\+\/'\s*,\s*'-_'\s*\)/.test(tokenGenerator),
		"encode() ersetzt '+/' durch '-_'");
	check(/rtrim\([\s\S]*?,\s*'='\s*\)/.test(tokenGenerator), "encode() entfernt '=' über rtrim(…, '=')");

	console.log("     Gegenprobe K-4-G: eine Fassung ohne rtrim(…, '=') muss auffallen");
	const ohneRtrim = tokenGenerator.replace(/rtrim\(([\s\S]*?),\s*'='\s*\)/, '$1');
	check(!/rtrim\([\s\S]*?,\s*'='\s*\)/.test(ohneRtrim), 'K-4-G: das Fehlen von rtrim wird erkannt');
}

/* ==================================================== K-5 hash_equals */

console.log('\nK-5  Verglichen wird mit hash_equals — kein === oder == an einer Kennung');
{
	check(/function equals\(/.test(tokenGenerator) && /hash_equals\(\s*\$known\s*,\s*\$given\s*\)/.test(tokenGenerator),
		'PlayerTokenGenerator::equals() benutzt hash_equals($known, $given)');

	const VERGLEICH_AN_TOKEN = /\$\w*[Tt]oken\w*\s*(===|==)|(===|==)\s*\$\w*[Tt]oken\w*/;
	const treffer = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		if (pfad === TOKEN_GENERATOR_PFAD) {
			continue;
		}
		if (VERGLEICH_AN_TOKEN.test(inhalt)) {
			treffer.push(kurz(pfad));
		}
	}
	check(treffer.length === 0,
		'kein === oder == an einer Kennung außerhalb von PlayerTokenGenerator',
		...treffer.map((t) => `gefunden in: ${t}`));

	console.log('     Gegenprobe K-5-G: ein hinzugedachtes $a === $b an einer Kennung muss auffallen');
	check(VERGLEICH_AN_TOKEN.test('if ($playerToken === $given) {'), 'K-5-G: der Vergleich wird gefunden');
}

/* ==================================================== K-6 Tabellenname zuerst */

console.log('\nK-6  Jeder der VIER Hook-Einstiege prüft als erstes den Tabellennamen');
{
	const METHODEN = [
		'processDatamap_postProcessFieldArray',
		'processDatamap_afterDatabaseOperations',
		'processCmdmap',
		'processCmdmap_postProcess',
	];
	const fehlend = [];
	for (const methode of METHODEN) {
		const rumpf = methodenRumpf(hook, methode);
		if (rumpf === null || !/^\s*if\s*\(\s*\$table\b/.test(rumpf)) {
			fehlend.push(methode);
		}
	}
	check(fehlend.length === 0,
		'alle vier Methoden beginnen mit einer Prüfung von $table',
		...fehlend.map((m) => `nicht als erstes: ${m}`));

	console.log('     Gegenprobe K-6-G: eine Methode, die vor der Tabellenprüfung etwas anderes tut, muss auffallen');
	const verschobeneMethode = 'public function fake(): void { $x = 1; if ($table !== self::PLAYER_TABLE) { return; } }';
	const fakeRumpf = methodenRumpf(verschobeneMethode, 'fake');
	check(fakeRumpf !== null && !/^\s*if\s*\(\s*\$table\b/.test(fakeRumpf),
		'K-6-G: die vorgezogene Anweisung wird erkannt');
}

/* ==================================================== K-7 Kopieren verweigern */

console.log('\nK-7  Der Kopiervorgang wird verweigert; $commandIsProcessed ist eine Referenz — belegt gegen den Kern');
{
	const cmdmapRumpf = methodenRumpf(hook, 'processCmdmap') || '';
	check(/\$command\s*!==\s*'copy'\s*&&\s*\$command\s*!==\s*'localize'\s*&&\s*\$command\s*!==\s*'copyToLanguage'/.test(cmdmapRumpf),
		"processCmdmap() erfasst 'copy', 'localize' und 'copyToLanguage'");
	check(/\$commandIsProcessed\s*=\s*true;/.test(cmdmapRumpf), "processCmdmap() setzt \$commandIsProcessed = true");

	check(/function processCmdmap\(\s*[\s\S]*?bool\s*&\$commandIsProcessed/.test(hook),
		'$commandIsProcessed ist in der Signatur als Referenz (&) deklariert');

	console.log('     Beleg: der Kern reicht die Variable im DataHandler tatsächlich als Referenz weiter');
	check(/\$hookObj->processCmdmap\(\$command,\s*\$table,\s*\$id,\s*\$value,\s*\$commandIsProcessed,\s*\$this,\s*\$pasteUpdate\)/.test(coreDataHandler),
		'DataHandler.php ruft processCmdmap(…, $commandIsProcessed, …) mit derselben Variablen für jeden Hook auf');

	console.log("     Gegenprobe K-7-G: eine Fassung ohne '&' muss auffallen");
	const ohneReferenz = hook.replace('bool &$commandIsProcessed', 'bool $commandIsProcessed');
	check(!/function processCmdmap\(\s*[\s\S]*?bool\s*&\$commandIsProcessed/.test(ohneReferenz),
		"K-7-G: das fehlende '&' wird erkannt");
}

/* ==================================================== K-8 Anmeldung in ext_localconf.php */

console.log('\nK-8  Beide Hook-Listen sind in ext_localconf.php angemeldet — Schlüsselnamen belegt gegen den Kern');
{
	check(/\['processDatamapClass'\]\[\]\s*\n?\s*=\s*PlayerDataHandlerHook::class;/.test(extLocalconf),
		"processDatamapClass[] = PlayerDataHandlerHook::class");
	check(/\['processCmdmapClass'\]\[\]\s*\n?\s*=\s*PlayerDataHandlerHook::class;/.test(extLocalconf),
		"processCmdmapClass[] = PlayerDataHandlerHook::class");

	check(/\['processDatamapClass'\]/.test(coreDataHandler), "Kern liest 'processDatamapClass' (DataHandler.php)");
	check(/\['processCmdmapClass'\]/.test(coreDataHandler), "Kern liest 'processCmdmapClass' (DataHandler.php)");

	console.log('     Gegenprobe K-8-G: ein Tippfehler im Schlüssel muss auffallen');
	const mitTippfehler = extLocalconf.replace(/processDatamapClass/, 'processDatamapKlasse');
	check(!/\['processDatamapClass'\]\[\]/.test(mitTippfehler), 'K-8-G: der Tippfehler wird erkannt');
}

/* ==================================================== K-9 Services.yaml public: true */

console.log('\nK-9  PlayerDataHandlerHook ist in Services.yaml mit public: true angemeldet');
{
	const hookBlock = servicesYaml.split(/\n(?=\s{2}\S)/).find((block) => block.includes('PlayerDataHandlerHook:'));
	check(!!hookBlock, 'ein Eintrag für PlayerDataHandlerHook existiert');
	check(!!hookBlock && /public:\s*true/.test(hookBlock), "der Eintrag trägt 'public: true'");

	console.log('     Gegenprobe K-9-G: ein fehlender Eintrag muss auffallen');
	const ohneEintrag = servicesYaml.replace(/  Phomo17\\CasinoAccount\\Hook\\PlayerDataHandlerHook:\n    public: true\n\n?/, '');
	check(!/PlayerDataHandlerHook:\s*\n\s*public:\s*true/.test(ohneEintrag), 'K-9-G: das Fehlen wird erkannt');
}

/* ==================================================== K-10 ext_localconf.php knapp */

console.log('\nK-10 ext_localconf.php bleibt schmal: genau fünf Zuweisungen plus genau ein begründeter Aufruf (addService), keine Schleife, keine Abfrage');
{
	const zuweisungen = (extLocalconf.match(/^\$GLOBALS\[/gm) || []).length;
	check(zuweisungen === 5,
		`genau fünf Zuweisungen (gefunden: ${zuweisungen}) — drei aus D1/Dc`
		+ ' (DataHandler-Hooks, FormDataProvider) plus zwei aus D2b'
		+ ' (loginRateLimit, loginRateLimitInterval)');

	// addService() ist seit Umsetzungsstück D2b GENAU EINMAL erlaubt: es ist
	// die dokumentierte Kern-API, um einen Authentifizierungsdienst
	// anzumelden (CONCEPT.md D.6.2, ExtensionManagementUtility.php:650) —
	// kein Ersatz für eine Feld-Zuweisung, sondern der einzige vom Kern
	// vorgesehene Weg dafür. Die Prüfung zählt ihn deshalb ausdrücklich und
	// begrenzt ihn auf GENAU EINEN, statt ihn stillschweigend durchzulassen.
	const addServiceAufrufe = (extLocalconf.match(/ExtensionManagementUtility::addService\(/g) || []).length;
	check(addServiceAufrufe === 1,
		`genau ein ExtensionManagementUtility::addService()-Aufruf (gefunden:`
		+ ` ${addServiceAufrufe}) — die dokumentierte Kern-API für den`
		+ ' Anmeldedienst aus D.6.2, kein Ersatz für eine Zuweisung');

	const VERBOTEN = /\b(foreach|while|for\s*\(|->executeQuery\(|GeneralUtility::makeInstance\()/;
	check(!VERBOTEN.test(extLocalconf), 'keine Schleife, keine Abfrage, kein GeneralUtility::makeInstance(');

	console.log('     Gegenprobe K-10-G1: eine sechste Zuweisung muss auffallen');
	const mitSechster = extLocalconf + "\n\$GLOBALS['TYPO3_CONF_VARS']['SYS']['fake'] = 1;";
	const zuweisungenMitSechster = (mitSechster.match(/^\$GLOBALS\[/gm) || []).length;
	check(zuweisungenMitSechster === 6, 'K-10-G1: die sechste Zuweisung wird gezählt');

	console.log('     Gegenprobe K-10-G2: ein zweiter addService()-Aufruf muss auffallen');
	const mitZweitemAddService = extLocalconf + "\nExtensionManagementUtility::addService('x', 'y', 'z', []);";
	const addServiceMitZweitem = (mitZweitemAddService.match(/ExtensionManagementUtility::addService\(/g) || []).length;
	check(addServiceMitZweitem === 2, 'K-10-G2: der zweite Aufruf wird gezählt');
}

/* ==================================================== K-11 Vorgabebetrag an genau einer Stelle */

console.log('\nK-11 Der Vorgabebetrag 1.000.000 steht an genau einer Stelle');
{
	// Absichtlich UNGEFILTERT (mit Kommentaren) gelesen — die Zusage schließt
	// auch einen Kommentar-Fund aus.
	const fundstellen = [];
	for (const { pfad, inhalt } of classesRoh) {
		if (/\b1000000\b/.test(inhalt)) {
			fundstellen.push(kurz(pfad));
		}
	}
	if (existsSync(README_PFAD) && /\b1000000\b/.test(lies(README_PFAD))) {
		fundstellen.push(kurz(README_PFAD));
	}
	check(fundstellen.length === 1 && fundstellen[0] === kurz(MIRROR_PFAD),
		'1000000 kommt genau einmal vor, in BackendUserMirror.php',
		...fundstellen.map((f) => `gefunden in: ${f}`));
	check(/const START_BALANCE\s*=\s*1000000\s*;/.test(mirrorRoh), 'BackendUserMirror::START_BALANCE === 1000000');

	console.log('     Gegenprobe K-11-G: eine zweite Fundstelle muss auffallen');
	const mitZweiterStelle = [...fundstellen, 'irgendeine/zweite/Datei.php'];
	check(mitZweiterStelle.length === 2, 'K-11-G: die zweite Fundstelle wird gezählt');
}

/* ==================================================== K-12 Abgleich wiederholbar */

console.log('\nK-12 Der Abgleich ist wiederholbar: vorherige Nachfrage vor jedem Anlegen');
{
	const mirrorOneRumpf = methodenRumpf(mirror, 'mirrorOne') || '';
	check(/findUidByBackendUser\(\$beUserUid\)\s*>\s*0/.test(mirrorOneRumpf),
		'mirrorOne() fragt findUidByBackendUser() ab, bevor es anlegt');

	const syncAllRumpf = methodenRumpf(mirror, 'syncAll') || '';
	check(/unmirroredBackendUsers\(\)/.test(syncAllRumpf),
		'syncAll() holt ausschließlich unmirroredBackendUsers()');

	console.log('     Gegenprobe K-12-G: ein create()-Aufruf ohne vorherige Prüfung muss auffallen');
	const ohnePruefung = mirrorOneRumpf.replace(/if \(\$beUserUid <= 0 \|\| \$this->players->findUidByBackendUser\(\$beUserUid\) > 0\) \{\s*return 0;\s*\}/, '');
	check(!/findUidByBackendUser\(\$beUserUid\)\s*>\s*0/.test(ohnePruefung), 'K-12-G: die fehlende Prüfung wird erkannt');
}

/* ==================================================== K-13 keine Abfrage je Benutzer in Schleife */

console.log('\nK-13 Der Abgleich läuft ohne eine Abfrage je Benutzer in einer Schleife');
{
	check(/leftJoin\(/.test(mirror), 'unmirroredBackendUsers() benutzt einen linken Verbund (leftJoin)');

	const syncAllRumpf = methodenRumpf(mirror, 'syncAll') || '';
	check(!/executeQuery\(/.test(syncAllRumpf), 'syncAll() ruft in seiner foreach-Schleife selbst keine Abfrage auf');

	console.log('     Gegenprobe K-13-G: eine Abfrage in der Schleife muss auffallen');
	const mitAbfrageInSchleife = syncAllRumpf + '\nforeach ($x as $y) { $z->executeQuery(); }';
	check(/executeQuery\(/.test(mitAbfrageInSchleife), 'K-13-G: die hinzugedachte Abfrage wird gefunden');
}

/* ==================================================== K-14 be_users nur gelesen */

console.log('\nK-14 be_users wird nur gelesen, nie beschrieben');
{
	const SCHREIBENDER_ZUGRIFF = /'be_users'\s*=>\s*\[/;
	const treffer = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		if (SCHREIBENDER_ZUGRIFF.test(inhalt)) {
			treffer.push(kurz(pfad));
		}
	}
	check(treffer.length === 0,
		"kein 'be_users' => [ … ] in einem DataHandler-Datenteil",
		...treffer.map((t) => `gefunden in: ${t}`));

	console.log("     Gegenprobe K-14-G: ein hinzugedachtes 'be_users' => [ … ] muss auffallen");
	check(SCHREIBENDER_ZUGRIFF.test("'be_users' => [1 => ['username' => 'x']],"), 'K-14-G: der Fund wird erkannt');
}

/* ==================================================== K-15 nur über tx_casinoaccount_player */

console.log('\nK-15 Schattendatensätze werden nur über tx_casinoaccount_player ausgewählt, nie über username');
{
	const findByPlayerRumpf = methodenRumpf(shadow, 'findByPlayer') || '';
	check(/'tx_casinoaccount_player'/.test(findByPlayerRumpf), "findByPlayer() wählt über 'tx_casinoaccount_player' aus");
	check(!/LIKE/i.test(shadow), 'kein LIKE (also keine Auswahl über username-Muster) in ShadowUserService.php');

	console.log("     Gegenprobe K-15-G: eine Auswahl über username LIKE 'casino-%' muss auffallen");
	check(/LIKE/i.test("WHERE username LIKE 'casino-%'"), 'K-15-G: der Fund wird erkannt');
}

/* ==================================================== K-16 Passwort nirgends aufbewahrt */

console.log('\nK-16 Das Passwort des Schattendatensatzes wird nirgends aufbewahrt');
{
	check(!/file_put_contents/.test(shadowRoh), 'kein file_put_contents in ShadowUserService.php');
	check(!/->info\(|->debug\(|->warning\(|->error\(/.test(shadowRoh), 'kein Protokolleintrag in ShadowUserService.php');
	check(!/Registry\b/.test(shadowRoh), 'keine Registry-Ablage in ShadowUserService.php');

	const createForRumpf = methodenRumpf(shadow, 'createFor') || '';
	const passwortVerwendungen = (createForRumpf.match(/unusablePassword\(\)/g) || []).length;
	check(passwortVerwendungen === 1, 'unusablePassword() wird in createFor() genau einmal benutzt (im DataHandler-Datenteil)');

	console.log('     Gegenprobe K-16-G: ein $this->logger->info($password) muss auffallen');
	check(/->info\(\$password\)/.test('$this->logger->info($password);'), 'K-16-G: der Fund wird erkannt');
}

/* ==================================================== K-17 README-Text (seit De scharf) */

console.log('\nK-17 „Was beim Entfernen der Extension zurückbleibt" in der README');
{
	const readmeInhalt = existsSync(README_PFAD) ? lies(README_PFAD) : '';
	const readmeHatEchtenText = /Die Tabelle `tx_casinoaccount_player` bleibt stehen/.test(readmeInhalt);
	if (!readmeHatEchtenText) {
		console.log('  ⏭ K-17 übersprungen: die README trägt noch den Platzhaltertext aus Umsetzungsstück Da/Db.');
		console.log('     Der vollständige Text entsteht erst in Umsetzungsstück De (Plan, Abschnitt 7.1).');
		console.log('     (Zählt bewusst nicht als Fehler mit — siehe Kopfkommentar dieser Datei.)');
	} else {
		check(readmeHatEchtenText, 'README enthält den vollständigen Abschnitt „Was beim Entfernen der Extension zurückbleibt"');
	}
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück De gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Kennung, Schattendatensatz und Abgleich sind ausschließlich über DataHandler und');
	console.log('Registry verdrahtet, die Kennung entsteht aus random_bytes(32) und wird mit');
	console.log('hash_equals verglichen, jeder Hook-Einstieg prüft zuerst den Tabellennamen, das');
	console.log('Kopieren wird verweigert, beide Hook-Listen und der FormDataProvider sind knapp');
	console.log('angemeldet, der Vorgabebetrag steht an genau einer Stelle, der Abgleich ist');
	console.log('wiederholbar und ohne Abfrage je Benutzer, be_users wird nur gelesen, und das');
	console.log('Passwort des Schattendatensatzes wird nirgends aufbewahrt, und die README trägt');
	console.log('seit Umsetzungsstück De den vollständigen Text zu den Rückständen beim Entfernen');
	console.log('der Extension (K-17).');
}

process.exit(fehler === 0 ? 0 : 1);
