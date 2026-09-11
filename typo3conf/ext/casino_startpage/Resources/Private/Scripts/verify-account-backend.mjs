/**
 * Casino Kunterbunt – Nachweis der austauschbaren Kassen-Rückseite (D3b)
 * =======================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend gegenüber Dateien; die Live-Prüfung A-9 liest zusätzlich
 * den Schalterstand aus der laufenden Datenbank und ruft die laufende
 * Website ab — sie ändert nichts):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-account-backend.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md D.1.1, D.7, D.8; PLAN-d3-guthaben.md 4.21)
 * -------------------------------------------------------------------------
 *  A-1  Wächter: Pflichtdateien da, kein NUL-Byte, Zusagen gezählt.
 *  A-2  OHNE Zustandsblock fällt konto in den lokalen Modus: istServer ist
 *       false, kein fetch wird je gerufen, und eine vollständige Spielfolge
 *       über credit/machineCredit verhält sich wie ohne dieses Modul.
 *  A-3  MIT nachgestelltem document und Zustandsblock: istServer ist true,
 *       kasse/geraet/gewinn stammen aus dem Block, und es findet KEIN
 *       Zugriff auf localStorage statt.
 *  A-4  jeder der elf Vorgänge sendet GENAU EINE Anfrage mit dem richtigen
 *       Content-Type, der richtigen Methode und einem Rumpf, der kunde,
 *       nummer und art enthält; die Nummer steigt NUR nach einer
 *       eindeutigen Antwort.
 *  A-5  zwei Buchungen kurz hintereinander laufen NACHEINANDER über die
 *       Kette, nicht gleichzeitig.
 *  A-6  ein werfender fetch sperrt, löst casino:konto-gesperrt aus, jede
 *       weitere Buchung bewegt währenddessen nichts; wiederholen() sendet
 *       denselben Rumpf mit derselben Nummer; eine erfolgreiche Antwort löst
 *       casino:konto-frei aus. Gegenprobe: ok:false mit 200 sperrt NICHT.
 *  A-7  konto.speicher ist Storage-förmig, sammelt Schreibvorgänge und
 *       schickt sie gebündelt; er enthält keinen Schlüsselnamen eines
 *       Automaten.
 *  A-8  account-backend.js nennt weder casino_account/casino-account noch
 *       einen Automatenschlüssel.
 *  A-9  live: bei ausgeschaltetem Modus liefert die Startseite KEIN
 *       data-ca-state; bei eingeschaltetem Modus mit Anmeldung liefert sie
 *       genau einen Block, vor dem ersten <script-Element der Seite.
 *  A-10 live: account-backend.js wird auf einer Geräteseite unter GENAU
 *       EINER Adresse geladen — credit.js UND machine-credit.js lösen ihren
 *       account-backend.js-Import auf dieselbe Adresse auf wie die
 *       Import-Karte, nachgewiesen gegen die AUSGELIEFERTE Seite (Befund
 *       vom 2026-09-10: ein relativer Import hatte im Browser ein zweites,
 *       unabhängiges konto-Objekt erzeugt).
 *
 *
 * WARUM MIT DER ECHTEN DATEI UND WIE
 * -----------------------------------
 * Wie die übrigen Prüfskripte des Hauses: eine eigens geschriebene
 * Nachbildung könnte richtig rechnen, während account-backend.js falsch
 * bucht. Gerechnet wird deshalb mit der echten Datei, als Text gelesen und
 * über eine data:-Adresse geladen (dasselbe Verfahren wie in
 * verify-machine-credit.mjs). Da ein ES-Modul unter derselben Adresse nur
 * EINMAL ausgewertet wird, bekommt jedes Testszenario, das eine eigene
 * Ausgangslage braucht (mit/ohne document, anderer Zustandsblock), eine
 * eigene, mit einem Zähler eindeutig gemachte Textvariante — sonst würde
 * Node denselben, schon ausgewerteten Modulinstanz zurückgeben.
 */

// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst und fährt bei eingeschaltetem Modus den
//  vollen Umfang, sonst eine Teilmenge. Läuft deshalb in BEIDEN Läufen.)

import { readFile } from 'node:fs/promises';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const ACCOUNT_URL = new URL('account-backend.js', JS_DIR);
const CREDIT_URL = new URL('credit.js', JS_DIR);
const MACHINE_URL = new URL('machine-credit.js', JS_DIR);

/**
 * Geräte-Extensions, zur LAUFZEIT aus typo3conf/ext/ ermittelt statt in
 * dieser Datei eingetragen (Behebungslauf 2026-09-10, nach dem Hausdurchlauf
 * der Hauptsitzung): eine eingetragene Liste wäre genau die Kopplung, die
 * CONCEPT.md Abschnitt 5, Grundsatz 2 verbietet — bei einem achten Gerät
 * müsste jemand diese Datei anfassen, und genau das übersähe der eigene
 * Nachweis dann. Merkmal, WORTGLEICH mit dem bereits vorhandenen
 * verify-gattung.mjs: eine Extension neben dem Site Package, deren
 * ext_localconf.php einen Automat(...)-Aufruf anmeldet. casino_startpage
 * selbst meldet mit dem Mustertisch (Classes/Automat/Mustertisch.php)
 * ebenfalls einen Automaten an und wird deshalb ausdrücklich ausgenommen —
 * dieselbe Ausnahme wie dort.
 */
const EXT_DIR = fileURLToPath(new URL('../../..', import.meta.url));
const EXT_ROOT = path.resolve(EXT_DIR, '..');
const GERAETE_EXTENSIONS = readdirSync(EXT_ROOT, { withFileTypes: true })
	.filter((eintrag) => eintrag.isDirectory() && path.join(EXT_ROOT, eintrag.name) !== EXT_DIR)
	.map((eintrag) => eintrag.name)
	.filter((name) => {
		const datei = path.join(EXT_ROOT, name, 'ext_localconf.php');
		return existsSync(datei) && /new\s+Automat\s*\(/.test(readFileSync(datei, 'utf8'));
	})
	.sort();

/**
 * Aus einem Extensionsnamen alle Schreibweisen ableiten, unter denen er im
 * Code auftauchen könnte — wortgleiches Verfahren wie schreibweisen() in
 * verify-gattung.mjs.
 *
 * @param {string} name
 * @returns {RegExp[]}
 */
function schreibweisen(name) {
	const teile = name.split('_');
	const roh = teile.join('');
	const gross = teile.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
	return [
		new RegExp(teile.join('_'), 'i'),
		new RegExp(teile.join('-'), 'i'),
		new RegExp(roh, 'i'),
		new RegExp(teile.join(' '), 'i'),
		new RegExp(gross),
	];
}

/**
 * Das Kürzel-Präfix eines Geräts — wortgleiches Verfahren wie kuerzel() in
 * verify-gattung.mjs.
 *
 * @param {string} name
 * @returns {string}
 */
function kuerzel(name) {
	const teile = name.split('_');
	return teile.length === 1 ? teile[0].slice(0, 2) : teile.map((t) => t.charAt(0)).join('');
}

/** Das ECHTE fetch, gesichert BEVOR irgendein Testszenario globalThis.fetch
 * mit einem Ersatz überschreibt — A-9 braucht es für die laufende Website. */
const ECHTES_FETCH = globalThis.fetch;

let failed = false;
let zusagenGezaehlt = 0;

/**
 * @param {boolean} condition
 * @param {string} label
 * @returns {void}
 */
function check(condition, label) {
	zusagenGezaehlt += 1;
	if (!condition) {
		failed = true;
	}
	console.log(`${condition ? '  ok  ' : '  FEHLER  '}${label}`);
}

/* ============================================================================
   A-1 — Wächter
   ============================================================================ */

console.log('A-1  Wächter: Pflichtdateien da, kein NUL-Byte, Zusagen gezählt');

/** Ein einzelnes NUL-Zeichen — als String.fromCharCode gebaut, damit kein
 * echtes Steuerzeichen im Quelltext dieses Prüfskripts selbst steht. */
const NUL_BYTE = String.fromCharCode(0);

const PFLICHTDATEIEN = [ACCOUNT_URL, CREDIT_URL, MACHINE_URL];
const quellenText = new Map();
for (const url of PFLICHTDATEIEN) {
	let inhalt;
	try {
		inhalt = await readFile(fileURLToPath(url), 'utf8');
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — ${url.href} lässt sich nicht lesen: ${fehlerObjekt.message}`);
		process.exit(1);
	}
	check(!inhalt.includes(NUL_BYTE), `A-1: ${url.href.split('/').pop()} enthält kein NUL-Byte`);
	quellenText.set(url.href, inhalt);
}
const accountQuelle = quellenText.get(ACCOUNT_URL.href);
check(accountQuelle.includes('export const konto'),
	'A-1: account-backend.js exportiert konto');
// ÜBER DAS PRÄFIX, nicht relativ — siehe die Begründung im Kopf von
// credit.js: ein Gerätemodul (store.js) in einer anderen Extension
// importiert account-backend.js zwangsläufig über dasselbe Präfix; nur wenn ALLE Importeure
// dieselbe Adresse verwenden, gibt es im Browser genau EIN konto-Objekt
// (siehe A-10 weiter unten, das das an der laufenden Seite nachweist).
check(quellenText.get(CREDIT_URL.href).includes("import { konto } from '@phomo17/casino-startpage/account-backend.js';"),
	'A-1: credit.js importiert account-backend.js über das Präfix');
check(quellenText.get(MACHINE_URL.href).includes("import { konto } from '@phomo17/casino-startpage/account-backend.js';"),
	'A-1: machine-credit.js importiert account-backend.js über das Präfix');

/* ============================================================================
   Werkzeuge: frische Modulinstanzen, ein nachgestelltes document, ein
   zählender localStorage.
   ============================================================================ */

let variantenZaehler = 0;

/**
 * Lädt eine FRISCHE Instanz von account-backend.js. `document` (falls
 * gesetzt) MUSS vor dem Aufruf schon feststehen — zustandLesen() läuft
 * synchron beim Modulstart.
 *
 * @param {{zustand?: ?object}} [optionen]
 * @returns {Promise<object>} konto
 */
async function ladeKonto({ zustand = null } = {}) {
	variantenZaehler += 1;
	if (zustand !== null) {
		globalThis.document = baueFakeDocument(JSON.stringify(zustand));
	} else {
		delete globalThis.document;
	}
	const variante = `${accountQuelle}\n// verify-variante-${variantenZaehler}`;
	const modul = await import(`data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`);
	return modul.konto;
}

/**
 * Ein nachgestelltes document: querySelector liefert den Zustandsblock (oder
 * null), addEventListener/removeEventListener/dispatchEvent sind ein
 * minimaler, aber echter Ereignisbus.
 *
 * @param {?string} zustandJson
 * @returns {object}
 */
function baueFakeDocument(zustandJson) {
	/** @type {Map<string, Set<function>>} */
	const zuhoerer = new Map();
	return {
		visibilityState: 'visible',
		querySelector(selector) {
			if (selector === 'script[type="application/json"][data-ca-state]' && zustandJson !== null) {
				return { textContent: zustandJson };
			}
			return null;
		},
		addEventListener(type, handler) {
			if (!zuhoerer.has(type)) {
				zuhoerer.set(type, new Set());
			}
			zuhoerer.get(type).add(handler);
		},
		removeEventListener(type, handler) {
			zuhoerer.get(type)?.delete(handler);
		},
		dispatchEvent(event) {
			for (const handler of [...(zuhoerer.get(event.type) ?? [])]) {
				handler(event);
			}
			return true;
		},
	};
}

/** Ein Zustandsblock, der in mehreren Szenarien als Ausgangslage dient. */
function basiszustand() {
	return {
		endpunkte: {
			buchung: 'https://konto.invalid/casino-konto/buchung',
			stand: 'https://konto.invalid/casino-konto/stand',
			feld: 'https://konto.invalid/casino-konto/feld',
		},
		kasse: 500,
		geraet: 20,
		gewinn: 3,
		gesamt: 523,
		admin: false,
		max: 999999999,
		speicher: { vorhandenerSchluessel: 'vorhandenerWert' },
	};
}

/* ============================================================================
   A-2 — ohne Zustandsblock: lokaler Modus, kein fetch, Spielfolge unverändert
   ============================================================================ */

console.log('\nA-2  ohne Zustandsblock: lokaler Modus, kein fetch wird gerufen, die Spielfolge verhält sich unverändert');

{
	let fetchAufrufe = 0;
	globalThis.fetch = async () => {
		fetchAufrufe += 1;
		throw new Error('fetch hätte im lokalen Modus NIE gerufen werden dürfen');
	};

	const kontoLokal = await ladeKonto({ zustand: null });
	check(kontoLokal.istServer === false, 'A-2: konto.istServer ist false ohne Zustandsblock');
	check(kontoLokal.darfVerwalten === true, 'A-2: konto.darfVerwalten ist im lokalen Modus true');
	check(kontoLokal.gesperrt === false, 'A-2: konto.gesperrt ist im lokalen Modus false');
	check(kontoLokal.speicher === null, 'A-2: konto.speicher ist im lokalen Modus null');
	check(kontoLokal.einwurf === undefined && kontoLokal.stand === undefined && kontoLokal.wiederholen === undefined,
		'A-2: die Vorgänge (hier stellvertretend einwurf/stand/wiederholen) existieren im lokalen Modus nicht (undefined)');

	// Ein nachgestellter Browserspeicher, wortgleich zu verify-machine-credit.mjs.
	/** @type {Map<string, string>} */
	const cells = new Map();
	const storageListeners = [];
	const fakeStore = {
		getItem(key) { return cells.has(key) ? cells.get(key) : null; },
		setItem(key, value) { cells.set(key, String(value)); },
		removeItem(key) { cells.delete(key); },
		clear() { cells.clear(); },
		key(index) { return [...cells.keys()][index] ?? null; },
		get length() { return cells.size; },
	};
	globalThis.localStorage = fakeStore;
	globalThis.addEventListener = (type, handler) => {
		if (type === 'storage') { storageListeners.push(handler); }
	};
	globalThis.removeEventListener = (type, handler) => {
		if (type !== 'storage') { return; }
		const at = storageListeners.indexOf(handler);
		if (at !== -1) { storageListeners.splice(at, 1); }
	};

	// credit.js UND machine-credit.js importieren account-backend.js ÜBER DAS
	// PRÄFIX (Begründung im Kopf von credit.js: ein Gerätemodul in einer
	// anderen Extension kann nur so importieren, und nur wenn alle dieselbe Adresse verwenden, gibt es im
	// Browser genau EIN konto-Objekt). Ohne document/data-ca-state fällt
	// account-backend.js beim Laden von selbst in den lokalen Modus; credit.js
	// braucht deshalb hier — wie machine-credit.js es schon immer brauchte —
	// einen Text-Patch, bevor es geladen werden kann.
	const patchedCredit = quellenText.get(CREDIT_URL.href).replaceAll(
		"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(ACCOUNT_URL.href)
	);
	const creditDataUrl = `data:text/javascript;base64,${Buffer.from(patchedCredit, 'utf8').toString('base64')}`;
	const patchedMachine = quellenText.get(MACHINE_URL.href)
		.replaceAll("'@phomo17/casino-startpage/credit.js'", JSON.stringify(creditDataUrl))
		.replaceAll("'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(ACCOUNT_URL.href));
	const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

	const { credit } = await import(creditDataUrl);
	const { openMachineCredit } = await import(machineDataUrl);

	// Dieselbe seedbare Folge wie verify-machine-credit.mjs — kein Zufall,
	// damit ein Fehlschlag nachstellbar ist.
	function sequence(seed) {
		let state = seed;
		return (limit) => {
			state = (state * 1103515245 + 12345) % 2147483648;
			return state % limit;
		};
	}

	await credit.reload();
	check(credit.balance === credit.START_BALANCE, 'A-2: Startguthaben stimmt (lokaler Modus, unverändert)');

	const machine = openMachineCredit('pruefgeraet');
	await machine.ready;
	check(machine.amount === 0, 'A-2: der Gerätekredit ist beim Betreten der Seite 0');

	await credit.set(1000);
	let expectedTotal = 1000;
	const eingeworfen = await machine.insert(250);
	check(eingeworfen.ok === true && eingeworfen.moved === 250 && credit.balance === 750,
		'A-2: insert(250) verhält sich wie ohne dieses Modul');

	const draw = sequence(20260902);
	let runden = 0;
	for (let i = 0; i < 120; i++) {
		const einsatz = [1, 2, 5, 10][draw(4)];
		const eingesetzt = await machine.stake(einsatz);
		if (eingesetzt.ok !== true) {
			if (credit.canAfford(100)) { await machine.insert(100); } else { break; }
			continue;
		}
		runden += 1;
		expectedTotal -= eingesetzt.debited;
		const faktor = [0, 0, 0, 0, 0, 1, 3, 5, 8, 10][draw(10)];
		if (faktor > 0) {
			const gewonnen = await machine.award(faktor * einsatz);
			expectedTotal += gewonnen.credited;
		}
		if (credit.balance + machine.amount !== expectedTotal) {
			check(false, `A-2: Bilanz nach Runde ${i + 1} stimmt nicht mehr`);
			break;
		}
	}
	check(runden > 0, `A-2: ${runden} Runden liefen fehlerfrei, die Bilanz stimmte nach JEDER einzelnen`);

	const ausgezahlt = await machine.cashOut();
	check(ausgezahlt.moved === machine.amount || ausgezahlt.amount === 0,
		'A-2: cashOut() bucht wie gewohnt zurück');
	check(fetchAufrufe === 0, `A-2: über die ganze Spielfolge wurde fetch NIE gerufen (gezählt: ${fetchAufrufe})`);

	globalThis.localStorage = undefined;
	globalThis.addEventListener = undefined;
	globalThis.removeEventListener = undefined;
}

/* ============================================================================
   A-3 — mit Zustandsblock: Servermodus, Werte aus dem Block, kein localStorage
   ============================================================================ */

console.log('\nA-3  mit Zustandsblock: Servermodus, Werte aus dem Block, KEIN Zugriff auf localStorage');

{
	let speicherZugriffe = 0;
	globalThis.localStorage = new Proxy({}, {
		get(target, eigenschaft) {
			speicherZugriffe += 1;
			return target[eigenschaft];
		},
		set(target, eigenschaft, wert) {
			speicherZugriffe += 1;
			target[eigenschaft] = wert;
			return true;
		},
	});
	globalThis.fetch = async () => {
		throw new Error('in diesem Szenario wird kein Vorgang gebucht, fetch dürfte nicht laufen');
	};

	const kontoServer = await ladeKonto({ zustand: basiszustand() });
	check(kontoServer.istServer === true, 'A-3: konto.istServer ist true mit Zustandsblock');
	// konto.gewinn ist der VORGANG (die elf ARTEN), keine synchrone
	// Eigenschaft — siehe die Begründung im Kopf von account-backend.js.
	// Dass der offene Gewinn (3) aus dem Block korrekt in die interne Summe
	// eingeht, zeigt der gesamt-Vergleich (500+20+3).
	check(kontoServer.kasse === 500 && kontoServer.geraet === 20 && kontoServer.gesamt === 523,
		'A-3: kasse/geraet/gesamt stammen aus dem Zustandsblock (500/20/523, worin der offene Gewinn 3 aus dem Block bereits eingerechnet ist)');
	check(typeof kontoServer.gewinn === 'function', 'A-3: konto.gewinn ist der Vorgang (eine Funktion), keine Zahl');
	check(kontoServer.darfVerwalten === false, 'A-3: darfVerwalten folgt dem admin-Feld des Blocks (hier false)');
	check(kontoServer.max === 999999999, 'A-3: max stammt aus dem Zustandsblock');
	check(kontoServer.speicher.getItem('vorhandenerSchluessel') === 'vorhandenerWert',
		'A-3: konto.speicher.getItem() liest den Anfangsstand aus dem Zustandsblock');
	check(speicherZugriffe === 0,
		`A-3: über den ganzen Aufbau fand KEIN Zugriff auf localStorage statt (gezählt: ${speicherZugriffe})`);

	globalThis.localStorage = undefined;
}

/* ============================================================================
   A-4 — jeder der elf Vorgänge sendet GENAU EINE Anfrage, richtig geformt
   ============================================================================ */

console.log('\nA-4  jeder der elf Vorgänge sendet GENAU EINE Anfrage; die Nummer steigt nur nach einer eindeutigen Antwort');

{
	/** @type {Array<{url: string, optionen: object}>} */
	const aufrufe = [];
	globalThis.fetch = async (url, optionen) => {
		aufrufe.push({ url, optionen });
		return {
			ok: true,
			async json() {
				return { ok: true, kasse: 1, geraet: 1, gewinn: 1, gesamt: 3, bewegt: 1, gekappt: false, doppelt: false };
			},
		};
	};

	const konto = await ladeKonto({ zustand: basiszustand() });

	const VORGAENGE = [
		['uebernahme', []],
		['einwurf', [10]],
		['auszahlung', [5]],
		['einsatz', [1]],
		['gewinn', [2]],
		['angebot', [1]],
		['verdoppeln', []],
		['verloren', []],
		['aufladen', [1]],
		['abbuchen', [1]],
		['setzen', [0]],
	];

	for (const [name, argumente] of VORGAENGE) {
		const vorAufrufe = aufrufe.length;
		// eslint-disable-next-line no-await-in-loop
		await konto[name](...argumente);
		check(aufrufe.length === vorAufrufe + 1, `A-4: konto.${name}() sendet genau eine Anfrage`);
	}
	check(aufrufe.length === VORGAENGE.length, `A-4: insgesamt genau ${VORGAENGE.length} Anfragen für ${VORGAENGE.length} Vorgänge`);

	let formOk = true;
	let nummernFolgeOk = true;
	aufrufe.forEach((aufruf, index) => {
		if (aufruf.optionen.method !== 'POST') { formOk = false; }
		if (aufruf.optionen.headers?.['Content-Type'] !== 'application/json') { formOk = false; }
		let rumpf = null;
		try { rumpf = JSON.parse(aufruf.optionen.body); } catch { formOk = false; }
		if (rumpf === null || typeof rumpf.kunde !== 'string' || rumpf.kunde.length < 1
			|| !Number.isInteger(rumpf.nummer) || typeof rumpf.art !== 'string') {
			formOk = false;
		}
		if (rumpf !== null && rumpf.nummer !== index + 1) {
			nummernFolgeOk = false;
		}
	});
	check(formOk, 'A-4: jede Anfrage ist POST, application/json, und der Rumpf enthält kunde/nummer/art');
	check(nummernFolgeOk, 'A-4: die Nummer läuft 1, 2, 3 … fortlaufend mit jeder eindeutigen Antwort');

	// Steigt die Nummer NICHT bei einer unlesbaren (nicht eindeutigen)
	// Antwort? Eigenes, unabhängiges Konto, damit die Zählung oben unberührt
	// bleibt. Eine Antwort ohne 'gesamt' ist laut senden() KEINE eindeutige
	// Antwort — sie sperrt (siehe A-6) statt die Nummer weiterzuschalten, und
	// eine gesperrte Instanz weist jeden WEITEREN Vorgang ab, OHNE erneut
	// fetch zu rufen. Genau das wird hier gezählt.
	let zweiteAufrufe = 0;
	globalThis.fetch = async () => {
		zweiteAufrufe += 1;
		return { ok: true, async json() { return { ok: true }; } };   // kein 'gesamt' → ungültig, sperrt
	};
	const kontoZweite = await ladeKonto({ zustand: basiszustand() });
	const ersteAntwort = await kontoZweite.einwurf(1);
	check(ersteAntwort.ok === false && ersteAntwort.grund === 'gesperrt',
		'A-4: eine ungültige (nicht eindeutige) Antwort sperrt, statt die Nummer weiterzuschalten');
	await kontoZweite.einsatz(1);
	check(zweiteAufrufe === 1,
		'A-4: nach einer ungültigen Antwort löst ein WEITERER Vorgang KEINE zweite Netzanfrage aus — die Nummer bleibt stehen');
}

/* ============================================================================
   A-5 — zwei Buchungen kurz hintereinander laufen NACHEINANDER über die Kette
   ============================================================================ */

console.log('\nA-5  zwei Buchungen kurz hintereinander laufen nacheinander über die Kette, nicht gleichzeitig');

{
	let aktiv = 0;
	let ueberlappungBeobachtet = false;
	let abgeschlosseneAufrufe = 0;
	globalThis.fetch = async () => {
		aktiv += 1;
		if (aktiv > 1) { ueberlappungBeobachtet = true; }
		await new Promise((resolve) => setTimeout(resolve, 20));
		aktiv -= 1;
		abgeschlosseneAufrufe += 1;
		return {
			ok: true,
			async json() {
				return { ok: true, kasse: 1, geraet: 1, gewinn: 1, gesamt: 3, bewegt: 1, gekappt: false, doppelt: false };
			},
		};
	};

	const konto = await ladeKonto({ zustand: basiszustand() });
	// Absichtlich NICHT einzeln abgewartet — beide Aufrufe werden angestoßen,
	// bevor der erste fertig ist.
	const p1 = konto.einwurf(1);
	const p2 = konto.einsatz(1);
	await Promise.all([p1, p2]);
	check(abgeschlosseneAufrufe === 2, 'A-5: beide Buchungen wurden ausgeführt');
	check(ueberlappungBeobachtet === false, 'A-5: zu keinem Zeitpunkt liefen zwei Anfragen gleichzeitig');
}

/* ============================================================================
   A-6 — Sperre bei Netzfehler, Wiederholen, Gegenprobe bei ok:false/200
   ============================================================================ */

console.log('\nA-6  ein werfender fetch sperrt; weitere Buchungen bewegen nichts; wiederholen() sendet denselben Rumpf; Gegenprobe ok:false/200 sperrt NICHT');

{
	let fetchAufrufe = 0;
	let ersterRumpf = null;
	globalThis.fetch = async (url, optionen) => {
		fetchAufrufe += 1;
		ersterRumpf = optionen.body;
		throw new Error('Netzwerk kaputt (Testaufbau)');
	};

	const konto = await ladeKonto({ zustand: basiszustand() });
	let gesperrtDetail = null;
	let freiAusgeloest = false;
	globalThis.document.addEventListener('casino:konto-gesperrt', (ereignis) => { gesperrtDetail = ereignis.detail; });
	globalThis.document.addEventListener('casino:konto-frei', () => { freiAusgeloest = true; });

	const antwort1 = await konto.einwurf(10);
	check(konto.gesperrt === true, 'A-6: nach einem werfenden fetch ist konto.gesperrt true');
	check(antwort1.ok === false && antwort1.grund === 'gesperrt' && antwort1.bewegt === 0,
		'A-6: die erste (fehlgeschlagene) Buchung liefert ok:false, grund:"gesperrt", bewegt:0');
	check(gesperrtDetail !== null && gesperrtDetail.grund === 'offline',
		'A-6: casino:konto-gesperrt wurde mit grund "offline" ausgelöst');
	check(fetchAufrufe === 1, 'A-6: bisher genau EIN fetch-Aufruf');

	const antwort2 = await konto.einsatz(5);
	check(antwort2.ok === false && antwort2.grund === 'gesperrt' && antwort2.bewegt === 0,
		'A-6: eine weitere Buchung während der Sperre bewegt nichts und liefert grund "gesperrt"');
	check(fetchAufrufe === 1, 'A-6: die weitere Buchung hat KEINE neue Netzanfrage ausgelöst');

	globalThis.fetch = async (url, optionen) => {
		fetchAufrufe += 1;
		check(optionen.body === ersterRumpf, 'A-6: wiederholen() sendet DENSELBEN Rumpf mit DERSELBEN Nummer');
		return {
			ok: true,
			async json() {
				return { ok: true, kasse: 90, geraet: 30, gewinn: 3, gesamt: 123, bewegt: 10, gekappt: false, doppelt: false };
			},
		};
	};
	await konto.wiederholen();
	check(konto.gesperrt === false, 'A-6: nach erfolgreichem Wiederholen ist konto.gesperrt wieder false');
	check(freiAusgeloest === true, 'A-6: casino:konto-frei wurde ausgelöst');
	check(konto.kasse === 90 && konto.geraet === 30 && konto.gesamt === 123,
		'A-6: der Stand nach dem Wiederholen stammt aus der (jetzt erfolgreichen) Serverantwort');

	console.log('     Gegenprobe A-6-G: eine Antwort mit ok:false und Rückgabewert 200 sperrt NICHT');
	globalThis.fetch = async () => ({
		ok: true,
		async json() {
			return { ok: false, grund: 'kasse_zu_gering', kasse: 90, geraet: 30, gewinn: 3, gesamt: 123, bewegt: 0, gekappt: false, doppelt: false };
		},
	});
	const kontoGegenprobe = await ladeKonto({ zustand: basiszustand() });
	const abgelehnt = await kontoGegenprobe.einwurf(999999);
	check(abgelehnt.ok === false && abgelehnt.grund === 'kasse_zu_gering', 'A-6-G: die Ablehnung selbst kommt unverändert durch');
	check(kontoGegenprobe.gesperrt === false, 'A-6-G: eine Ablehnung mit 200 sperrt NICHT');
}

/* ============================================================================
   A-7 — konto.speicher ist Storage-förmig und sammelt Schreibvorgänge
   ============================================================================ */

console.log('\nA-7  konto.speicher ist Storage-förmig, sammelt Schreibvorgänge und schickt sie gebündelt');

{
	let feldAufrufe = 0;
	let letzterFeldRumpf = null;
	globalThis.fetch = async (url, optionen) => {
		feldAufrufe += 1;
		letzterFeldRumpf = JSON.parse(optionen.body);
		return { ok: true, async json() { return {}; } };
	};

	const konto = await ladeKonto({ zustand: basiszustand() });
	check(typeof konto.speicher.getItem === 'function'
		&& typeof konto.speicher.setItem === 'function'
		&& typeof konto.speicher.removeItem === 'function',
		'A-7: konto.speicher hat getItem/setItem/removeItem');

	for (let i = 0; i < 10; i++) {
		konto.speicher.setItem(`schluessel${i}`, `wert${i}`);
	}
	check(feldAufrufe === 0, 'A-7: unmittelbar nach zehn setItem() ist noch KEINE Anfrage gelaufen (Ruhefenster)');
	check(konto.speicher.getItem('schluessel5') === 'wert5', 'A-7: getItem() liest den noch nicht gesendeten Wert sofort');

	await new Promise((resolve) => setTimeout(resolve, 600));
	check(feldAufrufe === 1, `A-7: nach dem Ruhefenster erzeugten zehn setItem() genau EINE Anfrage (gezählt: ${feldAufrufe})`);
	check(letzterFeldRumpf !== null && typeof letzterFeldRumpf['stände'] === 'object'
		&& Object.keys(letzterFeldRumpf['stände']).length === 10,
		'A-7: die eine Anfrage trägt alle zehn Schlüssel gebündelt unter "stände"');

	// Geprüft wird der CODE, nicht die Dokumentation — Kommentare dürfen ein
	// Gerät erklärend nennen (dieselbe Unterscheidung wie G-9 in
	// verify-gattung.mjs und A-8 unten für casino_account).
	const ohneKommentare = accountQuelle
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^[ \t]*\/\/.*$/gm, '');
	const GERAETE_NAMEN = GERAETE_EXTENSIONS.flatMap(schreibweisen);
	check(!GERAETE_NAMEN.some((muster) => muster.test(ohneKommentare)),
		`A-7: account-backend.js kennt keine Schreibweise der ${GERAETE_EXTENSIONS.length} installierten `
		+ `Geräte-Extensions im CODE (ermittelt: ${GERAETE_EXTENSIONS.join(', ')})`);
	check(!ohneKommentare.includes('casinoKunterbunt.machine'),
		'A-7: account-backend.js kennt den Schlüssel-Namensraum eines Automaten nicht');
	check(!ohneKommentare.includes('credits'),
		'A-7: account-backend.js kennt den Schlüssel "credits" nicht');
}

/* ============================================================================
   A-8 — account-backend.js kennt weder casino_account noch einen Automaten
   ============================================================================ */

console.log('\nA-8  account-backend.js nennt weder casino_account/casino-account noch einen Automatenschlüssel');

{
	const ohneKommentare = accountQuelle
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^[ \t]*\/\/.*$/gm, '');
	check(!ohneKommentare.includes('casino_account'), 'A-8: kein "casino_account" im CODE (Kommentare ausgenommen)');
	check(!ohneKommentare.includes('casino-account'), 'A-8: kein "casino-account" im CODE (Kommentare ausgenommen)');
	// Geräteliste und Kürzel-Präfixe LAUFZEITERMITTELT (siehe GERAETE_EXTENSIONS
	// oben) statt hier ausgeschrieben — Behebungslauf 2026-09-10: eine
	// ausgeschriebene Liste war selbst ein Fund in sechs verify-cabinet.mjs und
	// in verify-gattung.mjs, weil sie genau die Kopplung herstellte, die diese
	// Prüfung verhindern soll.
	for (const geraet of GERAETE_EXTENSIONS) {
		check(!schreibweisen(geraet).some((muster) => muster.test(ohneKommentare)),
			`A-8: keine Schreibweise von "${geraet}" im CODE (Kommentare ausgenommen)`);
	}
	const PRAEFIXE = GERAETE_EXTENSIONS.map((geraet) => new RegExp(`(^|[^-a-z])${kuerzel(geraet)}-[a-z]`));
	check(!PRAEFIXE.some((muster) => muster.test(ohneKommentare)),
		`A-8: keins der ${GERAETE_EXTENSIONS.length} Kürzel-Präfixe im CODE (ermittelt: `
		+ `${GERAETE_EXTENSIONS.map(kuerzel).join(', ')})`);

	console.log('     Gegenprobe A-8-G: ein hinzugedachtes Kürzel-Präfix muss auffallen');
	const erfundeneZeile = `element.classList.add("${kuerzel(GERAETE_EXTENSIONS[0])}-erfunden");`;
	check(new RegExp(`(^|[^-a-z])${kuerzel(GERAETE_EXTENSIONS[0])}-[a-z]`).test(erfundeneZeile),
		'A-8-G: das erfundene Kürzel-Präfix wird erkannt');
}

/* ============================================================================
   A-9 — live: Zustandsblock nur bei eingeschaltetem Modus, an der richtigen Stelle
   ============================================================================ */

console.log('\nA-9  live: bei ausgeschaltetem Modus kein data-ca-state; bei eingeschaltetem Modus genau ein Block vor dem ersten <script');

// Die vorherigen Szenarien haben globalThis.fetch wiederholt mit
// Ersatzfunktionen überschrieben — für die LAUFENDE Website wird jetzt
// wieder das echte fetch gebraucht.
globalThis.fetch = ECHTES_FETCH;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const WEG1_BASIS = 'https://casino-kunterbunt.ddev.site';
const WEG2_BASIS = 'http://127.0.0.1';
const HOST_KOPFZEILE = 'casino-kunterbunt.ddev.site';
let benutzterWeg = null;

async function seite(pfad, optionen = {}) {
	const versuche = [
		{ basis: WEG1_BASIS, headers: {} },
		{ basis: WEG2_BASIS, headers: { Host: HOST_KOPFZEILE } },
	];
	let letzterFehler = null;
	for (const versuch of versuche) {
		try {
			const antwort = await fetch(versuch.basis + pfad, {
				method: optionen.methode ?? 'GET',
				headers: { ...versuch.headers, ...(optionen.headers ?? {}) },
				redirect: optionen.redirect ?? 'follow',
			});
			const text = await antwort.text();
			if (benutzterWeg === null) { benutzterWeg = versuch.basis; }
			return { status: antwort.status, headers: antwort.headers, text };
		} catch (fehlerObjekt) {
			letzterFehler = fehlerObjekt;
		}
	}
	console.log(`\nERGEBNIS: Abbruch — weder ${WEG1_BASIS} noch ${WEG2_BASIS} (mit Host-Kopfzeile) erreichen die laufende Website: ${letzterFehler?.message}`);
	console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
	process.exit(1);
}

let registryZeile;
try {
	const registryAusgabe = execFileSync(
		'mysql',
		['-e', "SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
		{ encoding: 'utf8' }
	);
	registryZeile = (registryAusgabe.split('\n')[1] ?? '').trim();
} catch (fehlerObjekt) {
	console.log(`\nERGEBNIS: Abbruch — die Abfrage des Schalterstands schlug fehl: ${fehlerObjekt.message}`);
	process.exit(1);
}
const qrModeAn = registryZeile === 'b:1;';
console.log(`(gemessener Schalterstand: ${qrModeAn ? 'AN' : 'AUS'}${registryZeile === '' ? ' — noch nie geschaltet' : ''})`);

if (!qrModeAn) {
	const startseite = await seite('/');
	check(startseite.status === 200, `A-9: die Startseite antwortet mit 200 (gefunden: ${startseite.status})`);
	check(!startseite.text.includes('data-ca-state'),
		'A-9: bei ausgeschaltetem Modus enthält die ausgelieferte Startseite KEIN data-ca-state');
	console.log('     (der Zweig „eingeschalteter Modus" ist bei diesem Lauf übersprungen — der Schalter stand gemessen auf AUS.'
		+ ' Er läuft mit, sobald der Schalter über den Messlauf der Hauptsitzung (Plan 7.3) eingeschaltet wird.)');
} else {
	function zeile(sql) {
		const ausgabe = execFileSync('mysql', ['-e', sql], { encoding: 'utf8' });
		return (ausgabe.split('\n')[1] ?? '').trim();
	}
	const token = zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 ORDER BY uid LIMIT 1;');
	if (token === '') {
		console.log('\nERGEBNIS: Abbruch — kein aktiver, anmeldbarer Spielender gefunden. A-9 braucht eine bestehende Kennung.');
		process.exit(1);
	}
	const headerZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
	const anmeldung = await fetch((benutzterWeg ?? WEG1_BASIS) + '/?casinoToken=' + encodeURIComponent(token), {
		redirect: 'manual',
		headers: headerZusatz,
	});
	const setCookieZeilen = typeof anmeldung.headers.getSetCookie === 'function' ? anmeldung.headers.getSetCookie() : [];
	const cookie = setCookieZeilen.map((z) => z.split(';')[0]).join('; ');
	check(cookie !== '', 'A-9: die Anmeldung mit dem Token setzte ein Sitzungsplätzchen');

	const angemeldeteSeite = await seite('/', { headers: { Cookie: cookie } });
	check(angemeldeteSeite.status === 200, `A-9: die angemeldete Startseite antwortet mit 200 (gefunden: ${angemeldeteSeite.status})`);
	const treffer = [...angemeldeteSeite.text.matchAll(/data-ca-state/g)];
	check(treffer.length === 1, `A-9: bei eingeschaltetem Modus enthält die Seite GENAU EINEN data-ca-state-Block (gefunden: ${treffer.length})`);
	// „vor dem ersten <script-Element" heißt konkret: der Block ist SELBST
	// das erste Kind von <head>, unmittelbar dahinter (4.10 in PLAN-d3-guthaben.md).
	// Ein naiver Vergleich der Position von "data-ca-state" gegen die Position
	// von "<script" schlüge fehl, weil das <script>-Element DES BLOCKS SELBST
	// der erste Treffer für "<script" ist — der Vergleich verglich den Block
	// mit sich selbst. Geprüft wird deshalb direkt, dass unmittelbar hinter
	// dem öffnenden <head…> ein <script type="application/json" …
	// data-ca-state> beginnt, ohne irgendetwas dazwischen.
	check(/<head\b[^>]*><script\b[^>]*\bdata-ca-state\b/i.test(angemeldeteSeite.text),
		'A-9: der Zustandsblock ist das erste Kind von <head> — kein <script-Element steht davor');
}

/* ============================================================================
   A-10 — live: account-backend.js wird unter GENAU EINER Adresse geladen
   ============================================================================ */

console.log('\nA-10  live: account-backend.js wird auf einer Geräteseite unter GENAU EINER Adresse geladen (kein zweites konto-Exemplar)');

{
	// Befund vom 2026-09-10 (zweiter Nachbesserungslauf, an der laufenden
	// Seite gemessen, nicht vermutet): ein relativer Import in credit.js/
	// machine-credit.js löste zu einer ANDEREN Adresse auf als der
	// Präfix-Import in einem Gerätemodul (store.js) einer anderen Extension — dieselbe Datei, zwei
	// ausgewertete Exemplare, zwei konto-Objekte, zwei Kundenkennungen, zwei
	// Buchungsnummern-Zähler. Diese Prüfung stellt fest, dass es GENAU EINE
	// Adresse gibt — gegen die AUSGELIEFERTE Seite und die AUSGELIEFERTEN
	// Fassungen von credit.js/machine-credit.js, nicht gegen den Quelltext
	// auf der Platte: sie liest die tatsächliche Import-Karte und rechnet
	// aus, wohin jeder tatsächliche account-backend.js-Import auflöst —
	// genau wie es ein Browser täte.
	//
	// Bei eingeschaltetem Modus fängt qr-gate eine anonyme Anfrage an einer
	// Geräteseite ab (D.9) — die Torseite trägt keine Import-Karte für ein
	// Gerät. Deshalb wird hier, unabhängig vom Schalterstand, mit derselben
	// Kennung angemeldet wie in A-9 (bei ausgeschaltetem Modus wirkungslos,
	// die Seite verhält sich dann ohnehin wie ohne Anmeldung).
	let a10Cookie = '';
	{
		function a10Zeile(sql) {
			const ausgabe = execFileSync('mysql', ['-e', sql], { encoding: 'utf8' });
			return (ausgabe.split('\n')[1] ?? '').trim();
		}
		const a10Token = a10Zeile('SELECT token FROM tx_casinoaccount_player WHERE hidden=0 AND deleted=0 ORDER BY uid LIMIT 1;');
		if (a10Token !== '') {
			const a10HeaderZusatz = benutzterWeg === WEG2_BASIS ? { Host: HOST_KOPFZEILE } : {};
			const a10Anmeldung = await fetch((benutzterWeg ?? WEG1_BASIS) + '/?casinoToken=' + encodeURIComponent(a10Token), {
				redirect: 'manual',
				headers: a10HeaderZusatz,
			});
			const a10SetCookieZeilen = typeof a10Anmeldung.headers.getSetCookie === 'function' ? a10Anmeldung.headers.getSetCookie() : [];
			a10Cookie = a10SetCookieZeilen.map((z) => z.split(';')[0]).join('; ');
		}
	}
	const a10Kopfzeilen = a10Cookie !== '' ? { Cookie: a10Cookie } : {};

	// KEIN GERÄT WIRD BEIM NAMEN GENANNT — A-8 prüft genau das für diese
	// Datei, und eine hier ausgeschriebene Geräteseite (z. B. "/reel-slot")
	// wäre selbst ein Fund gewesen (gemessen: genau das geschah, bevor diese
	// Zeilen auf Entdeckung umgestellt wurden). Die Geräteseite wird deshalb
	// von der Startseite selbst ermittelt: jeder ihrer Links, dessen Antwort
	// eine Import-Karte MIT credit.js UND machine-credit.js trägt, taugt —
	// dieselbe robustere Quelle wie GERAETE_EXTENSIONS oben.
	const startseiteFuerA10 = await seite('/', { headers: a10Kopfzeilen });
	const a10LinkPfade = [...new Set(
		[...startseiteFuerA10.text.matchAll(/href="(\/[a-z0-9-]*)"/gi)].map((treffer) => treffer[1])
	)].filter((pfad) => pfad !== '/');
	let geraeteSeite = null;
	for (const pfad of a10LinkPfade) {
		// eslint-disable-next-line no-await-in-loop
		const versuch = await seite(pfad, { headers: a10Kopfzeilen });
		if (versuch.status === 200
			&& versuch.text.includes('@phomo17/casino-startpage/credit.js')
			&& versuch.text.includes('@phomo17/casino-startpage/machine-credit.js')) {
			geraeteSeite = versuch;
			break;
		}
	}
	check(geraeteSeite !== null,
		`A-10: unter den ${a10LinkPfade.length} Links der Startseite wurde eine Seite mit Import-Karte für credit.js/machine-credit.js gefunden`);

	const importKarteMatch = geraeteSeite.text.match(/<script type="importmap">(.*?)<\/script>/s);
	check(importKarteMatch !== null, 'A-10: die Seite enthält eine Import-Karte');
	const importKarte = JSON.parse(importKarteMatch[1]);
	const basis = benutzterWeg ?? WEG1_BASIS;
	const praefixAdresse = importKarte.imports['@phomo17/casino-startpage/'];
	const accountEintrag = importKarte.imports['@phomo17/casino-startpage/account-backend.js']
		?? (praefixAdresse ? praefixAdresse + 'account-backend.js' : undefined);
	check(typeof accountEintrag === 'string', 'A-10: die Import-Karte kennt @phomo17/casino-startpage/account-backend.js (oder das Präfix)');
	const accountAdresseAbsolut = new URL(accountEintrag, basis).href;

	/**
	 * Löst einen Modulnamen GENAU SO auf, wie es ein Browser an dieser Stelle
	 * täte — bare specifier über die Import-Karte (spezifischer Eintrag oder
	 * Präfix), relative Referenz über die Adresse der importierenden Datei.
	 *
	 * @param {string} spezifizierer
	 * @param {string} importierendeDateiAdresse
	 * @returns {string}
	 */
	function aufloesen(spezifizierer, importierendeDateiAdresse) {
		if (spezifizierer.startsWith('.')) {
			return new URL(spezifizierer, importierendeDateiAdresse).href;
		}
		if (typeof importKarte.imports[spezifizierer] === 'string') {
			return new URL(importKarte.imports[spezifizierer], basis).href;
		}
		for (const [praefix, ziel] of Object.entries(importKarte.imports)) {
			if (praefix.endsWith('/') && spezifizierer.startsWith(praefix)) {
				return new URL(ziel + spezifizierer.slice(praefix.length), basis).href;
			}
		}
		return spezifizierer;
	}

	/**
	 * Holt die AUSGELIEFERTE Fassung einer über die Import-Karte benannten
	 * Datei und liest daraus ihren tatsächlichen konto-Import.
	 *
	 * @param {string} spezifiziererName
	 * @returns {Promise<{spezifizierer: string, dateiAdresse: string}>}
	 */
	async function importSpezifiziererVonLiveDatei(spezifiziererName) {
		const eintrag = importKarte.imports[spezifiziererName];
		check(typeof eintrag === 'string', `A-10: die Import-Karte kennt ${spezifiziererName}`);
		const dateiAdresse = new URL(eintrag, basis).href;
		const dateiUrl = new URL(dateiAdresse);
		const antwort = await seite(dateiUrl.pathname + dateiUrl.search);
		const fund = antwort.text.match(/import\s*\{\s*konto\s*\}\s*from\s*'([^']+)'/);
		check(fund !== null, `A-10: ${spezifiziererName} importiert konto (im ausgelieferten Quelltext gefunden)`);
		return { spezifizierer: fund[1], dateiAdresse };
	}

	const creditImport = await importSpezifiziererVonLiveDatei('@phomo17/casino-startpage/credit.js');
	const machineImport = await importSpezifiziererVonLiveDatei('@phomo17/casino-startpage/machine-credit.js');

	const creditAufgeloest = aufloesen(creditImport.spezifizierer, creditImport.dateiAdresse);
	const machineAufgeloest = aufloesen(machineImport.spezifizierer, machineImport.dateiAdresse);

	check(creditAufgeloest === accountAdresseAbsolut,
		`A-10: credit.js löst seinen account-backend.js-Import auf dieselbe Adresse auf wie die Import-Karte (${creditAufgeloest})`);
	check(machineAufgeloest === accountAdresseAbsolut,
		`A-10: machine-credit.js löst seinen account-backend.js-Import auf dieselbe Adresse auf wie die Import-Karte (${machineAufgeloest})`);
	check(new Set([accountAdresseAbsolut, creditAufgeloest, machineAufgeloest]).size === 1,
		'A-10: über alle drei Quellen (Import-Karte, credit.js, machine-credit.js) hinweg gibt es GENAU EINE Adresse — also genau EIN konto-Exemplar');

	console.log('     Gegenprobe A-10-G: ein relativer Import hätte auf eine ANDERE Adresse aufgelöst');
	const waereRelativAufgeloest = aufloesen('./account-backend.js', creditImport.dateiAdresse);
	check(waereRelativAufgeloest !== accountAdresseAbsolut,
		`A-10-G: './account-backend.js' aus credit.js hätte auf eine ANDERE Adresse aufgelöst (${waereRelativAufgeloest}) — genau der Fehler vom 2026-09-10`);
}

/* ============================================================================
   Ergebnis
   ============================================================================ */

/**
 * Wächterzahlen — GEMESSEN, nicht geschätzt (Regel vom 2026-09-10). A-9
 * zählt im Zweig „Modus AUS" zwei Zusagen (Status, kein data-ca-state); im
 * Zweig „Modus AN" stattdessen vier (Sitzungsplätzchen, Status, genau ein
 * Block, Position vor dem ersten <script). ERWARTETE_ZUSAGEN_AUS ist die bei
 * diesem Lauf tatsächlich gezählte Summe (Schalter stand auf AUS).
 */
const ERWARTETE_ZUSAGEN_AUS = 87;
const ERWARTETE_ZUSAGEN_AN = ERWARTETE_ZUSAGEN_AUS - 2 + 4;
check(zusagenGezaehlt === ERWARTETE_ZUSAGEN_AUS || zusagenGezaehlt === ERWARTETE_ZUSAGEN_AN,
	`Wächter: ${zusagenGezaehlt} Zusagen geprüft (erwartet ${ERWARTETE_ZUSAGEN_AUS} bei AUS oder ${ERWARTETE_ZUSAGEN_AN} bei AN)`);

console.log(failed
	? '\nERGEBNIS: die austauschbare Kassen-Rückseite verhält sich NICHT wie zugesagt.'
	: '\nERGEBNIS: ohne Zustandsblock verhält sich alles wie vor D3, mit Zustandsblock bucht jeder Vorgang genau '
	+ 'eine Anfrage, die Nummer läuft fortlaufend, zwei Buchungen laufen nacheinander, eine Sperre lässt sich '
	+ 'wiederholen, der Feldspeicher wird gebündelt gesendet, und die laufende Website liefert den Zustandsblock '
	+ 'nur, wenn sie es darf.');

process.exit(failed ? 1 : 0);
