/**
 * Casino Kunterbunt – casino_account: Nachweis Modulgruppe, Modul, Liste
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version
 * 18, ohne jede npm-Abhängigkeit, rein lesend. Laufzeit unter einer Sekunde.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-module.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-teild-d1-konto-qr, Abschnitt 4.6.3,
 * Umsetzungsstücke Db UND Dd — seit Dd VOLLSTÄNDIG, M-9/M-10 eingeschlossen)
 * -------------------------------------------------------------------------
 *   M-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *         Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   M-2   'casino' hat weder 'parent' noch 'path' — belegt gegen den Kern
 *         selbst (typo3/sysext/core/Configuration/Backend/Modules.php:
 *         'web', 'file', 'site' auch ohne beides); 'casino_players' hat
 *         'parent' => 'casino'
 *   M-3   position der Gruppe ist ['after' => 'web'], access des Moduls
 *         ist 'user'
 *   M-4   Die drei festen Beschriftungsschlüssel mlang_tabs_tab,
 *         mlang_labels_tablabel, mlang_labels_tabdescr existieren in
 *         locallang_be.xlf — belegt gegen BaseModule.php
 *   M-5   Die drei Routen _default, qr, download zeigen auf drei Methoden,
 *         die es in PlayerModuleController wirklich gibt; die Klasse trägt
 *         #[AsController]
 *   M-6   backend.css enthält keine Größenangabe an einem .btn
 *   M-7   Die QR-Schaltfläche hat einen zugänglichen Namen (visually-hidden
 *         + f:translate mit Platzhalter für den Namen der Person)
 *   M-8   Die Tabelle hat <caption>, jede Spalte ein <th scope="col">, die
 *         erste Zelle jeder Zeile ein <th scope="row">
 *   M-9   Keine der vorhandenen Vorlagen enthält eine <h1>; keine
 *         Überschriftenstufe wird übersprungen — seit Dd für BEIDE Vorlagen
 *         scharf, weil Qr.html jetzt existiert
 *   M-10  Seit Dd SCHARF (nicht mehr übersprungen): der Meldebereich
 *         role="status" steht leer in Qr.html und wird nicht von
 *         qr-tools.js angelegt
 *   M-11  Fluid rechnet nicht: kein f:variable, kein {x + y}
 *   M-12  PlayerModuleController und PlayerRepository enthalten keine
 *         zusammengesetzte SQL-Zeichenkette
 *   M-13  Die Übergabe an record_edit ist die des Kerns — belegt gegen
 *         RecordListController.php:331-338
 *
 * DIE URSPRÜNGLICH IN Db ANGESAGTE ABWEICHUNG IST MIT Dd AUFGELÖST
 * -------------------------------------------------------------------------
 * M-9 und M-10 liefen in Db mit "übersprungen", weil Qr.html erst in Dd
 * entsteht — die Prüflogik war von Anfang an so gebaut, dass sie automatisch
 * scharf wird, sobald die Datei existiert (kein Eingriff an dieser Stelle
 * nötig). Beide Prüfungen laufen jetzt vollständig; siehe DECISIONS.md.
 *
 * NEUE ABWEICHUNG, ENTDECKT UND GESCHLOSSEN IN Dd: M-11 UND DIE
 * INLINE-SCHREIBWEISE VON f:translate IN EINEM HTML-ATTRIBUTWERT
 * -------------------------------------------------------------------------
 * Qr.html benutzt für die drei data-Angaben am PNG-Knopf die
 * Inline-Schreibweise {f:translate(key: '…')} statt der Tag-Schreibweise
 * <f:translate key="…" /> — Fluid lässt innerhalb eines HTML-Attributwerts
 * nur die Inline-Schreibweise zu (dieselbe Vorgabe wie im Plan, Abschnitt
 * 4.5.8). Die alte Fassung von M-11 suchte in JEDEM {…}-Ausdruck nach einem
 * Rechenzeichen, EINSCHLIESSLICH der Zeichen innerhalb von
 * Zeichenketten-Literalen — der Schrägstrich im XLIFF-Pfad
 * ("casino_account/Resources/…") sah dadurch wie eine Division aus und
 * wurde fälschlich gemeldet. Neue Hilfsfunktion
 * ohneZeichenkettenLiterale() schneidet '…'/"…" heraus, BEVOR die
 * Rechenzeichen-Suche läuft — eine echte Rechnung steht nie in
 * Anführungszeichen, die Zusage selbst ändert sich dadurch nicht. Neue
 * Gegenprobe M-11-G2 hält ausdrücklich fest, dass ein Dateipfad in
 * Anführungszeichen NICHT mehr auffällt. Das ist eine weitere Lücke im
 * Sinne der Ansage des Auftraggebers ("rechne mit weiteren") und steht so
 * in DECISIONS.md.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, existsSync } from 'node:fs';
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

/**
 * Liefert den Textblock eines geklammerten PHP-Arrays, beginnend bei der
 * ERSTEN Fundstelle von `nadel`, bis zur passenden schließenden Klammer —
 * über die Klammertiefe gezählt. Dieselbe Bauart wie in verify-schema.mjs.
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
 * Wie block(), aber liefert JEDE Fundstelle von `nadel`, nicht nur die
 * erste. Seit Umsetzungsstück Dc ruft PlayerModuleController
 * buildUriFromRoute('record_edit', …) ZWEIMAL auf (einmal für „neu" in
 * indexAction(), einmal für „bearbeiten" in decorate()) — block() allein
 * fände immer nur den ersten Treffer.
 */
function alleBloecke(quelle, nadel) {
	const treffer = [];
	let ab = 0;
	while (true) {
		const start = quelle.indexOf(nadel, ab);
		if (start === -1) {
			break;
		}
		const auf = quelle.indexOf('[', start);
		if (auf === -1) {
			break;
		}
		let tiefe = 0;
		let ende = -1;
		for (let i = auf; i < quelle.length; i++) {
			if (quelle[i] === '[') {
				tiefe++;
			} else if (quelle[i] === ']') {
				tiefe--;
				if (tiefe === 0) {
					ende = i;
					break;
				}
			}
		}
		if (ende === -1) {
			break;
		}
		treffer.push(quelle.slice(auf, ende + 1));
		ab = ende + 1;
	}
	return treffer;
}

const MODULES_PFAD = path.join(EXT, 'Configuration/Backend/Modules.php');
const CONTROLLER_PFAD = path.join(EXT, 'Classes/Controller/PlayerModuleController.php');
const PLAYER_PFAD = path.join(EXT, 'Classes/Domain/Player.php');
const REPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/PlayerRepository.php');
const INDEX_HTML_PFAD = path.join(EXT, 'Resources/Private/Templates/PlayerModule/Index.html');
/** Erst ab Dd vorhanden — siehe M-9, M-10. */
const QR_HTML_PFAD = path.join(EXT, 'Resources/Private/Templates/PlayerModule/Qr.html');
const BACKEND_CSS_PFAD = path.join(EXT, 'Resources/Public/Css/backend.css');
const LOCALLANG_PFAD = path.join(EXT, 'Resources/Private/Language/locallang_be.xlf');

const CORE_MODULES_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Configuration/Backend/Modules.php');
const CORE_BASEMODULE_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/backend/Classes/Module/BaseModule.php');
const CORE_RECORDLIST_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/backend/Classes/Controller/RecordListController.php');

console.log('\ncasino_account – Nachweis Modulgruppe, Modul, Liste (Umsetzungsstück Db)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Configuration/Backend/Modules.php', MODULES_PFAD],
	['Classes/Controller/PlayerModuleController.php', CONTROLLER_PFAD],
	['Classes/Domain/Player.php', PLAYER_PFAD],
	['Classes/Domain/PlayerRepository.php', REPOSITORY_PFAD],
	['Resources/Private/Templates/PlayerModule/Index.html', INDEX_HTML_PFAD],
	['Resources/Public/Css/backend.css', BACKEND_CSS_PFAD],
	['Resources/Private/Language/locallang_be.xlf', LOCALLANG_PFAD],
	['(Kern) typo3/sysext/core/Configuration/Backend/Modules.php', CORE_MODULES_PFAD],
	['(Kern) typo3/sysext/backend/Classes/Module/BaseModule.php', CORE_BASEMODULE_PFAD],
	['(Kern) typo3/sysext/backend/Classes/Controller/RecordListController.php', CORE_RECORDLIST_PFAD],
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
 * GEMESSEN, nicht geschätzt — in Umsetzungsstück De gefahren, abgelesen (59)
 * und hier eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt,
 * Wächter schlägt an, zurückgebaut, wieder grün).
 */
const ERWARTETE_ZUSAGEN = 59;

const modulesPhp = ohnePhpKommentare(lies(MODULES_PFAD));
const controller = ohnePhpKommentare(lies(CONTROLLER_PFAD));
const repository = ohnePhpKommentare(lies(REPOSITORY_PFAD));
const indexHtml = lies(INDEX_HTML_PFAD);
const backendCss = ohneBlockKommentare(lies(BACKEND_CSS_PFAD));
const xliff = lies(LOCALLANG_PFAD);
const coreModulesPhp = lies(CORE_MODULES_PFAD);
const coreBaseModule = lies(CORE_BASEMODULE_PFAD);
const coreRecordList = lies(CORE_RECORDLIST_PFAD);

/* ==================================================== M-2 oberste Gruppe */

console.log('M-2  "casino" hat weder \'parent\' noch \'path\' — belegt gegen den Kern selbst');
{
	const casinoBlock = block(modulesPhp, "'casino' => [");
	check(casinoBlock !== null, "Eintrag 'casino' gefunden");
	const rumpf = casinoBlock || '';
	check(!/'parent'/.test(rumpf) && !/'path'/.test(rumpf),
		"'casino' trägt weder 'parent' noch 'path'");

	const spielendeBlock = block(modulesPhp, "'casino_players' => [");
	check(spielendeBlock !== null, "Eintrag 'casino_players' gefunden");
	check(/'parent'\s*=>\s*'casino'/.test(spielendeBlock || ''),
		"'casino_players' trägt 'parent' => 'casino'");

	console.log("     Beleg: der Kern macht es für 'web', 'file' und 'site' genauso");
	for (const gruppe of ['web', 'file', 'site']) {
		const kernBlock = block(coreModulesPhp, `'${gruppe}' => [`);
		check(kernBlock !== null && !/'parent'/.test(kernBlock) && !/'path'/.test(kernBlock),
			`Kern: '${gruppe}' hat weder 'parent' noch 'path'`);
	}

	console.log("     Gegenprobe M-2-G: ein hinzugedachtes 'parent' => 'web' muss auffallen");
	const mitParent = rumpf + "\n'parent' => 'web',";
	check(/'parent'/.test(mitParent), "M-2-G: das hinzugedachte parent wird gefunden");
}

/* ==================================================== M-3 position / access */

console.log("\nM-3  position der Gruppe ist ['after' => 'web'], access des Moduls ist 'user'");
{
	const casinoBlock = block(modulesPhp, "'casino' => [") || '';
	check(/'position'\s*=>\s*\[\s*'after'\s*=>\s*'web'\s*\]/.test(casinoBlock),
		"position der Gruppe ist ['after' => 'web']");

	const spielendeBlock = block(modulesPhp, "'casino_players' => [") || '';
	check(/'access'\s*=>\s*'user'/.test(spielendeBlock), "access des Moduls ist 'user'");

	console.log("     Gegenprobe M-3-G: ['after' => 'file'] muss auffallen");
	const mitFile = casinoBlock.replace("'after' => 'web'", "'after' => 'file'");
	check(!/'after'\s*=>\s*'web'/.test(mitFile), "M-3-G: die Abweichung wird erkannt");
}

/* ==================================================== M-4 feste Beschriftungsschlüssel */

console.log('\nM-4  Die drei festen Beschriftungsschlüssel existieren in locallang_be.xlf — belegt gegen BaseModule.php');
{
	const FESTE_SCHLUESSEL = ['mlang_tabs_tab', 'mlang_labels_tablabel', 'mlang_labels_tabdescr'];

	for (const schluessel of FESTE_SCHLUESSEL) {
		check(coreBaseModule.includes(`:${schluessel}`),
			`Kern: BaseModule.php hängt ':${schluessel}' an, wenn 'labels' eine Zeichenkette ist`);
	}

	for (const schluessel of FESTE_SCHLUESSEL) {
		check(xliff.includes(`<trans-unit id="${schluessel}">`),
			`locallang_be.xlf definiert '${schluessel}'`);
	}

	console.log('     Gegenprobe M-4-G: ein fehlender Schlüssel muss auffallen');
	const ohneEinen = xliff.replace('<trans-unit id="mlang_tabs_tab">', '<trans-unit id="mlang_tabs_tab_verschwunden">');
	check(!ohneEinen.includes('<trans-unit id="mlang_tabs_tab">'), 'M-4-G: das Fehlen wird erkannt');
}

/* ==================================================== M-5 Routen */

console.log('\nM-5  Die drei Routen zeigen auf drei tatsächlich vorhandene Methoden; die Klasse trägt #[AsController]');
{
	const ROUTEN = [
		["'_default'", 'indexAction'],
		["'qr'", 'qrAction'],
		["'download'", 'downloadAction'],
	];
	for (const [routenName, methode] of ROUTEN) {
		const routeGefunden = new RegExp(`${routenName}\\s*=>\\s*\\[\\s*'target'\\s*=>\\s*PlayerModuleController::class\\s*\\.\\s*'::${methode}'`).test(modulesPhp);
		check(routeGefunden, `Route ${routenName} zeigt auf PlayerModuleController::${methode}`);

		const methodeVorhanden = new RegExp(`function\\s+${methode}\\s*\\(`).test(controller);
		check(methodeVorhanden, `PlayerModuleController::${methode}() existiert wirklich`);
	}

	check(/#\[AsController\]/.test(controller), 'Die Klasse trägt #[AsController]');

	console.log('     Gegenprobe M-5-G: eine Route auf eine erfundene Methode muss auffallen');
	const erfundeneMethode = 'qrActionErfunden';
	const mitErfundenerRoute = modulesPhp + `\n'target' => PlayerModuleController::class . '::${erfundeneMethode}',`;
	const routeAufErfundeneVorhanden = new RegExp(`::${erfundeneMethode}'`).test(mitErfundenerRoute);
	const erfundeneMethodeExistiertWirklich = new RegExp(`function\\s+${erfundeneMethode}\\s*\\(`).test(controller);
	check(routeAufErfundeneVorhanden && !erfundeneMethodeExistiertWirklich,
		'M-5-G: die erfundene Route zeigt auf eine Methode, die es im Controller nicht gibt');
}

/* ==================================================== M-6 backend.css keine Größe an .btn */

console.log('\nM-6  backend.css enthält keine Größenangabe an einem .btn');
{
	const GROESSEN_EIGENSCHAFTEN = ['width', 'height', 'min-width', 'min-height', 'padding', 'font-size'];
	const regeln = [...backendCss.matchAll(/\.btn[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
	const treffer = [];
	for (const regel of regeln) {
		for (const eigenschaft of GROESSEN_EIGENSCHAFTEN) {
			if (new RegExp(`(^|;|\\s)${eigenschaft}\\s*:`).test(regel)) {
				treffer.push(eigenschaft);
			}
		}
	}
	check(treffer.length === 0,
		'keine .btn-Regel setzt width/height/min-width/min-height/padding/font-size',
		...treffer.map((t) => `gefunden: ${t}`));

	console.log("     Gegenprobe M-6-G: '.ca-qr__tools .btn { padding: 0 }' muss auffallen");
	const mitVerkleinerung = backendCss + '\n.ca-qr__tools .btn { padding: 0; }';
	const treffernMitZusatz = [...mitVerkleinerung.matchAll(/\.btn[^{]*\{([^}]*)\}/g)].some((m) => /padding\s*:/.test(m[1]));
	check(treffernMitZusatz, 'M-6-G: die hinzugedachte Verkleinerung wird gefunden');
}

/* ==================================================== M-7 zugänglicher Name der QR-Schaltfläche */

console.log('\nM-7  Die QR-Schaltfläche hat einen zugänglichen Namen (visually-hidden + f:translate mit Platzhalter)');
{
	const qrKnopfMatch = /<a[^>]*href="\{row\.qrUrl\}"[\s\S]*?<\/a>/.exec(indexHtml);
	check(qrKnopfMatch !== null, 'die QR-Schaltfläche (href="{row.qrUrl}") ist in Index.html vorhanden');
	const knopf = qrKnopfMatch ? qrKnopfMatch[0] : '';

	check(/actions-qrcode/.test(knopf), 'sie zeigt das allgemeine QR-Symbol actions-qrcode');
	check(/visually-hidden/.test(knopf), 'sie trägt einen visually-hidden-Text');
	check(/list\.qr["'][^>]*arguments="\{0: row\.player\.name\}"/.test(knopf) || /list\.qr[\s\S]*?arguments="\{0: row\.player\.name\}"/.test(knopf),
		'der visually-hidden-Text nennt den Namen der Person als Platzhalter');

	console.log('     Gegenprobe M-7-G: ein Knopf ohne visually-hidden muss auffallen');
	const ohneVersteckt = knopf.replace(/<span class="visually-hidden">[\s\S]*?<\/span>/, '');
	check(!/visually-hidden/.test(ohneVersteckt), 'M-7-G: das Fehlen wird erkannt');
}

/* ==================================================== M-8 Tabellensemantik */

console.log('\nM-8  Die Tabelle hat <caption>, jede Spalte ein <th scope="col">, die erste Zelle jeder Zeile ein <th scope="row">');
{
	check(/<caption/.test(indexHtml), '<caption> ist vorhanden');
	const scopeColAnzahl = (indexHtml.match(/<th scope="col"/g) || []).length;
	check(scopeColAnzahl === 5, `genau 5 <th scope="col"> (gefunden: ${scopeColAnzahl})`);
	check(/<th scope="row">/.test(indexHtml), '<th scope="row"> ist vorhanden');

	console.log('     Gegenprobe M-8-G: ein <td> statt <th scope="row"> muss auffallen');
	const mitTd = indexHtml.replace('<th scope="row">', '<td class="ersetzt">');
	check(!/<th scope="row">/.test(mitTd), 'M-8-G: das Fehlen wird erkannt');
}

/* ==================================================== M-9 keine zweite <h1>, keine übersprungene Stufe */

console.log('\nM-9  Keine der vorhandenen Vorlagen enthält eine <h1>; keine Überschriftenstufe wird übersprungen');
{
	/**
	 * Qr.html gibt es in Db noch nicht (Dd). Geprüft wird deshalb nur, was
	 * tatsächlich existiert — dieselbe "übersprungen statt falsch"-Bauart wie
	 * S-7 in verify-schema.mjs. Siehe Kopfkommentar dieser Datei.
	 */
	const VORLAGEN = [
		['Index.html', INDEX_HTML_PFAD],
		['Qr.html', QR_HTML_PFAD],
	];

	for (const [name, pfad] of VORLAGEN) {
		if (!existsSync(pfad)) {
			console.log(`  ⏭ M-9 für ${name} übersprungen, weil die Datei erst in Umsetzungsstück Dd entsteht.`);
			continue;
		}
		const inhalt = lies(pfad);
		check(!/<h1[\s>]/.test(inhalt), `${name} enthält keine <h1>`);

		const ueberschriften = [...inhalt.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
		let sprung = null;
		for (let i = 1; i < ueberschriften.length; i++) {
			if (ueberschriften[i] > ueberschriften[i - 1] + 1) {
				sprung = `${ueberschriften[i - 1]} → ${ueberschriften[i]}`;
				break;
			}
		}
		check(sprung === null, `${name}: keine Überschriftenstufe wird übersprungen`, ...(sprung ? [`Sprung: h${sprung}`] : []));
	}

	console.log('     Gegenprobe M-9-G: ein <h4> direkt nach <h2> muss auffallen');
	const mitSprung = indexHtml.replace('<h2>', '<h2>X</h2><h4>');
	const stufenMitSprung = [...mitSprung.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
	let gefundenerSprung = false;
	for (let i = 1; i < stufenMitSprung.length; i++) {
		if (stufenMitSprung[i] > stufenMitSprung[i - 1] + 1) {
			gefundenerSprung = true;
			break;
		}
	}
	check(gefundenerSprung, 'M-9-G: der hinzugedachte Sprung h2 → h4 wird gefunden');
}

/* ==================================================== M-10 Meldebereich (seit Dd scharf) */

console.log('\nM-10 Meldebereich role="status" (seit Umsetzungsstück Dd scharf, vorher in Db übersprungen)');
if (!existsSync(QR_HTML_PFAD)) {
	console.log('  ⏭ M-10 übersprungen, weil Qr.html erst in Umsetzungsstück Dd entsteht.');
	console.log('     (Zählt bewusst nicht als Fehler mit — siehe Plan, Umsetzungsstück Db.)');
} else {
	const qrHtml = lies(QR_HTML_PFAD);
	const qrTools = existsSync(path.join(EXT, 'Resources/Public/JavaScript/qr-tools.js'))
		? lies(path.join(EXT, 'Resources/Public/JavaScript/qr-tools.js'))
		: '';
	check(/role="status"/.test(qrHtml), 'Qr.html enthält role="status"');
	check(!/createElement[\s\S]*role="status"/.test(qrTools), 'qr-tools.js legt den Meldebereich nicht per JS an');
}

/* ==================================================== M-11 Fluid rechnet nicht */

console.log('\nM-11 Fluid rechnet nicht: kein f:variable, kein Rechenzeichen in {…}');
{
	/**
	 * Entfernt Zeichenketten-Literale ('…' und "…") aus einem {…}-Ausdruck,
	 * BEVOR nach einem Rechenzeichen gesucht wird.
	 *
	 * SEIT UMSETZUNGSSTÜCK Dd nötig, sonst falscher Fund: Qr.html benutzt die
	 * INLINE-Schreibweise von f:translate innerhalb eines HTML-Attributwerts
	 * — {f:translate(key: 'LLL:EXT:casino_account/Resources/…')} — weil
	 * Fluid für Attributwerte keine <f:translate>-Tag-Schreibweise zulässt.
	 * Der Schrägstrich mitten im XLIFF-Pfad („casino_account/Resources")
	 * sieht wie eine Division aus, ist aber Teil einer Zeichenkette. Echte
	 * Rechnungen stehen nie in Anführungszeichen — das Herausschneiden der
	 * Zeichenketten-Literale ändert deshalb nichts an der eigentlichen
	 * Zusage, schließt aber diese Lücke. Siehe DECISIONS.md.
	 */
	function ohneZeichenkettenLiterale(ausdruck) {
		return ausdruck.replace(/'[^']*'|"[^"]*"/g, '');
	}

	const VORLAGEN = [
		['Index.html', INDEX_HTML_PFAD],
		['Qr.html', QR_HTML_PFAD],
	];
	for (const [name, pfad] of VORLAGEN) {
		if (!existsSync(pfad)) {
			console.log(`  ⏭ M-11 für ${name} übersprungen, weil die Datei erst in Umsetzungsstück Dd entsteht.`);
			continue;
		}
		const inhalt = lies(pfad);
		check(!/<f:variable/.test(inhalt), `${name} enthält kein <f:variable`);

		const geschweifteAusdruecke = [...inhalt.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
		const mitRechenzeichen = geschweifteAusdruecke.filter(
			(a) => /[a-zA-Z0-9_\]'"]\s*[+\-*/]\s*[a-zA-Z0-9_$]/.test(ohneZeichenkettenLiterale(a))
		);
		check(mitRechenzeichen.length === 0,
			`${name}: kein Rechenzeichen in einem {…}-Ausdruck`,
			...mitRechenzeichen.map((a) => `gefunden: {${a}}`));
	}

	console.log('     Gegenprobe M-11-G: {a + b} muss auffallen');
	const mitRechnung = indexHtml.replace('{row.total}', '{a + b}');
	const treffer = [...mitRechnung.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1])
		.some((a) => /[a-zA-Z0-9_\]'"]\s*[+\-*/]\s*[a-zA-Z0-9_$]/.test(ohneZeichenkettenLiterale(a)));
	check(treffer, 'M-11-G: {a + b} wird gefunden');

	console.log('     Gegenprobe M-11-G2: eine Zeichenkette mit Schrägstrich (Dateipfad) darf NICHT auffallen');
	const nurPfad = "f:translate(key: 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:qr.status.pngReady')";
	check(!/[a-zA-Z0-9_\]'"]\s*[+\-*/]\s*[a-zA-Z0-9_$]/.test(ohneZeichenkettenLiterale(nurPfad)),
		'M-11-G2: der Dateipfad in Anführungszeichen wird NICHT als Rechnung gemeldet');
}

/* ==================================================== M-12 keine zusammengesetzte SQL */

console.log('\nM-12 PlayerModuleController und PlayerRepository enthalten keine zusammengesetzte SQL-Zeichenkette');
{
	const QUELLEN = [
		['PlayerModuleController.php', controller],
		['PlayerRepository.php', repository],
	];
	for (const [name, quelltext] of QUELLEN) {
		const zusammengesetzt = /->where\(\s*['"][^'"]*['"]?\s*\.\s*\$/.test(quelltext)
			|| /executeQuery\(\s*['"][^'"]*\$\{?/.test(quelltext)
			|| /["'`][^"'`]*\$\{[^}]+\}[^"'`]*["'`]\s*\)\s*->\s*(where|executeQuery)/.test(quelltext);
		check(!zusammengesetzt, `${name}: keine zusammengesetzte SQL-Zeichenkette gefunden`);
	}

	console.log("     Gegenprobe M-12-G: ->where('uid = ' . $uid) muss auffallen");
	const mitKonkatenation = repository + "\n->where('uid = ' . \$uid);";
	check(/->where\(\s*['"][^'"]*['"]?\s*\.\s*\$/.test(mitKonkatenation), 'M-12-G: die Verkettung wird gefunden');
}

/* ==================================================== M-13 record_edit wie der Kern */

console.log('\nM-13 Die Übergabe an record_edit ist die des Kerns — belegt gegen RecordListController.php:331-338');
{
	const kernAufruf = block(coreRecordList, "buildUriFromRoute('record_edit', [") || '';
	check(/'edit'\s*=>\s*\[/.test(kernAufruf) && /'returnUrl'/.test(kernAufruf),
		"Kern: record_edit bekommt 'edit' => [ … ] und 'returnUrl'");

	// Seit Umsetzungsstück Dc kommt buildUriFromRoute('record_edit', …)
	// ZWEIMAL vor: einmal für „neu" (indexAction(), Wert 'new') und einmal
	// für „bearbeiten" (decorate(), Wert 'edit'). alleBloecke() liefert
	// beide Fundstellen; gesucht wird gezielt die mit 'edit'.
	const alleAufrufe = alleBloecke(controller, "buildUriFromRoute('record_edit', [");
	check(alleAufrufe.length > 0, 'PlayerModuleController ruft buildUriFromRoute(\'record_edit\', …) auf');

	const bereinigt = alleAufrufe.map((a) => a.replace(/\s+/g, ' ').replace(/,\s*\]/g, ']'));
	const eigenerAufruf = bereinigt.find((a) => /'edit'\s*=>\s*\['tx_casinoaccount_player'\s*=>\s*\[\$player->uid\s*=>\s*'edit'\]\]/.test(a)) || '';
	check(eigenerAufruf !== '',
		"der Aufbau ['edit' => ['tx_casinoaccount_player' => [<uid> => 'edit']]] stimmt");
	check(eigenerAufruf !== '' && /'returnUrl'/.test(eigenerAufruf), "'returnUrl' wird mitgegeben");

	// Die zweite Fundstelle (indexAction(), „neu") ist ausdrücklich KEIN
	// Fehler: sie folgt demselben, vom Kern vorgegebenen Aufbau, nur mit
	// 'new' statt 'edit' und der Ordnernummer statt einer Datensatznummer —
	// exakt das, was RecordListController.php als Aufbau für „neuen
	// Datensatz anlegen" selbst benutzt.
	const neuerAufruf = bereinigt.find((a) => /=>\s*'new'\]\]/.test(a)) || '';
	check(neuerAufruf !== '' && /'returnUrl'/.test(neuerAufruf),
		'die zweite Fundstelle („Neuen Spielenden anlegen") hat denselben Aufbau, mit \'new\' statt \'edit\'');

	console.log('     Gegenprobe M-13-G: ein abweichender Aufbau muss auffallen');
	const abweichend = eigenerAufruf.replace("'tx_casinoaccount_player'", "'irgendwas'");
	check(!/'edit'\s*=>\s*\['tx_casinoaccount_player'/.test(abweichend), 'M-13-G: die Abweichung wird erkannt');
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
	console.log('Die Modulgruppe "Casino" entsteht ohne parent/path wie beim Kern, das Modul');
	console.log('"Spielende" trägt die richtige Position und Zugriffsstufe, alle drei Routen');
	console.log('zeigen auf tatsächlich vorhandene Methoden, die Liste ist tastaturbedienbar');
	console.log('und barrierearm aufgebaut, backend.css verkleinert keine Schaltfläche, Fluid');
	console.log('rechnet nichts, und record_edit wird genauso aufgerufen wie im Kern selbst. Seit');
	console.log('Umsetzungsstück Dd laufen M-9 und M-10 vollständig, auch für Qr.html.');
}

process.exit(fehler === 0 ? 0 : 1);
