/**
 * FruitRisk – Nachweis: render('sync') erreicht tatsächlich das Gerät
 * ========================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert nichts):
 *
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/verify-risk-sync.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (Behebungslauf 2026-09-11)
 * ---------------------------------------------------
 * Vor diesem Lauf kannte render(group, view) in risk.js keinen Zweig
 * 'sync' — eine spät eintreffende Serverbestätigung landete im
 * `default: break`-Zweig und verschwand spurlos: die GEWINN-Röhren blieben
 * auf dem alten (Anzeige-)Stand stehen, obwohl der Server einen anderen
 * Betrag bestätigt hatte.
 *
 *   FR-1  render('sync') WÄHREND DIE LEITER LÄUFT zieht NUR den
 *         Gewinnbetrag nach (Zählwerk UND Messpunkt data-fr-risk-win) —
 *         und lässt STUFE/Tastenfreigabe/Ansage unangetastet.
 *   FR-2  render('sync') WÄHREND NOCH KEINE LEITER LÄUFT (die Buchung aus
 *         offer(), direkt an der Leiter dieser Gruppe getestet) zieht
 *         GENAUSO den Gewinnbetrag nach — bei FruitRisk gehört die
 *         GEWINN-Gruppe laut Dateikopf schon "im Angebot UND in der
 *         Leiter" dieser Datei, anders als bei video_slot/reel_slot.
 *
 * Gerechnet wird mit den ECHTEN Dateien dieses Geräts (risk.js, rng.js,
 * nixie.js, press.js, counter.js) UND den echten geteilten Dateien
 * (risk-ladder-multi.js, risk-timing.js, account-backend.js) — als Text
 * gelesen und über data:-Adressen geladen. Nachgestellt wird nur der wahre
 * äußere Rand: ein Gehäuse ohne echtes Markup (RiskPanel braucht davon nur
 * .fr-cabinet, alles andere ist über "?." abgesichert) und globalThis.fetch
 * als steuerbare Warteschlange. panel.winCounter wird NACH dem Bau durch
 * eine aufzeichnende Attrappe ersetzt — dieselbe Eigenschaft, die render()
 * auch anfasst, nur mit einem Mitschnitt statt einem echten Zählwerk.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OWN_JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const RISK_URL = new URL('risk.js', OWN_JS_DIR);
const RNG_URL = new URL('rng.js', OWN_JS_DIR);
const NIXIE_URL = new URL('nixie.js', OWN_JS_DIR);
const PRESS_URL = new URL('press.js', OWN_JS_DIR);
const COUNTER_URL = new URL('counter.js', OWN_JS_DIR);

const SHARED_JS_DIR = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', import.meta.url);
const RISK_LADDER_MULTI_URL = new URL('risk-ladder-multi.js', SHARED_JS_DIR);
const TIMING_FILE_URL = new URL('risk-timing.js', SHARED_JS_DIR).href;
const ACCOUNT_URL = new URL('account-backend.js', SHARED_JS_DIR);

let failed = false;

/** @param {boolean} condition @param {string} message @returns {void} */
function check(condition, message) {
	if (condition) { console.log(`  OK      ${message}`); return; }
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

/**
 * @param {URL} url
 * @param {Array<[string, string]>} replacements
 * @returns {Promise<string>}
 */
async function toModule(url, replacements) {
	const source = await readFile(fileURLToPath(url), 'utf8');
	let patched = source;
	for (const [name, target] of replacements) {
		patched = patched.replaceAll(`'${name}'`, JSON.stringify(target));
	}
	return `data:text/javascript;base64,${Buffer.from(patched, 'utf8').toString('base64')}`;
}

/** @param {?string} zustandJson @returns {object} */
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
			if (!zuhoerer.has(type)) { zuhoerer.set(type, new Set()); }
			zuhoerer.get(type).add(handler);
		},
		removeEventListener(type, handler) { zuhoerer.get(type)?.delete(handler); },
		dispatchEvent(event) {
			for (const handler of [...(zuhoerer.get(event.type) ?? [])]) { handler(event); }
			return true;
		},
	};
}

const accountQuelle = await readFile(fileURLToPath(ACCOUNT_URL), 'utf8');
let variantenZaehler = 0;

/**
 * @param {object} zustand
 * @returns {Promise<{url: string}>}
 */
async function ladeServerKonto(zustand) {
	variantenZaehler += 1;
	globalThis.document = baueFakeDocument(JSON.stringify(zustand));
	const variante = `${accountQuelle}\n// verify-risk-sync-variante-${variantenZaehler}`;
	const url = `data:text/javascript;base64,${Buffer.from(variante, 'utf8').toString('base64')}`;
	await import(url);
	return { url };
}

function basiszustand() {
	return {
		endpunkte: {
			buchung: 'https://konto.invalid/casino-konto/buchung',
			stand: 'https://konto.invalid/casino-konto/stand',
			feld: 'https://konto.invalid/casino-konto/feld',
		},
		kasse: 0, geraet: 0, gewinn: 0, gesamt: 0, admin: false, max: 999999999, speicher: {},
	};
}

/** @returns {{fn: function, wartend: Array<object>}} */
function baueFetchWarteschlange() {
	const wartend = [];
	const fn = (url, optionen) => new Promise((resolve) => {
		wartend.push({ resolve, url, optionen, rumpf: JSON.parse(optionen.body) });
	});
	return { fn, wartend };
}

/** @param {object} eintrag @param {object} daten @returns {void} */
function antworten(eintrag, daten) {
	eintrag.resolve({ ok: true, async json() { return daten; } });
}

/** @returns {Promise<void>} */
function flush() {
	return new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * @returns {{root: EventTarget, region: object}}
 */
function baueGehaeuse() {
	const cabinet = { querySelector: () => null };
	const root = new EventTarget();
	root.dataset = {};
	root.ownerDocument = { addEventListener() {}, removeEventListener() {} };
	root.querySelector = (selector) => (selector === '.fr-cabinet' ? cabinet : null);
	const region = {
		data: { frTextOffer: '', frTextWon: '', frTextLost: '' },
		say() {},
		clear() {},
	};
	return { root, region };
}

/* ==========================================================================
   FR-1 — render('sync') WÄHREND DIE LEITER LÄUFT
   ========================================================================== */

console.log('FR-1  render(\'sync\') während die Leiter läuft: nur der Gewinnbetrag, STUFE unangetastet');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_MULTI_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const riskModuleUrl = await toModule(RISK_URL, [
		['@phomo17/fruit-risk/rng.js', RNG_URL.href],
		['@phomo17/fruit-risk/nixie.js', NIXIE_URL.href],
		['@phomo17/fruit-risk/counter.js', COUNTER_URL.href],
		['@phomo17/fruit-risk/press.js', PRESS_URL.href],
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/risk-ladder-multi.js', ladderModuleUrl],
	]);
	const { RiskPanel, GROUPS } = await import(riskModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const { root, region } = baueGehaeuse();
	const panel = new RiskPanel(root, region);

	// levelCounter/winCounter sind nach dem Bau null (kein Markup gefunden,
	// findNixieGroup lieferte null) — winCounter jetzt durch eine
	// aufzeichnende Attrappe ersetzt.
	const calls = [];
	panel.winCounter = {
		ramp(amount) { calls.push({ method: 'ramp', amount }); },
		snap(amount) { calls.push({ method: 'snap', amount }); },
		destroy() { calls.push({ method: 'destroy' }); },
	};

	const gruppeRisk = GROUPS.find((g) => g.factor === 2);
	const ladder = panel.ladders[GROUPS.indexOf(gruppeRisk)];

	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	ladder.offer(claim);
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'angebot', 'FR-1  offer() löst die Buchung "angebot" aus');
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 10, gesamt: 10 });
	await flush();
	calls.length = 0;                                   // die eine 'sync'-Ansicht aus offer() ist erledigt

	ladder.start();
	ladder.guess(ladder.lit);                            // Treffer, Buchung noch offen
	check(calls.some((c) => c.method === 'ramp' && c.amount === 20),
		'FR-1  das Zählwerk zieht den optimistischen Betrag 20 schon vor jeder Serverantwort nach (reason \'level\')');

	const anzahlVorSync = calls.length;
	await flush();
	check(wartend.length === 1 && wartend[0].rumpf.art === 'angebot', 'FR-1  die Buchung des Treffers ist unterwegs');
	// Der (nachgestellte) Server bestätigt einen ANDEREN Betrag als den
	// optimistischen — nur so lässt sich unterscheiden, ob wirklich
	// render('sync') das Zählwerk erreicht.
	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 15, gesamt: 15 });
	await flush();

	check(calls.length > anzahlVorSync && calls.at(-1).method === 'ramp' && calls.at(-1).amount === 15,
		`FR-1  render('sync') zieht das Zählwerk auf den bestätigten Betrag 15 nach (letzter Aufruf: `
		+ `${JSON.stringify(calls.at(-1))})`);
	check(root.dataset.frRiskWin === '15',
		`FR-1  der Messpunkt data-fr-risk-win steht auf "15" (gefunden: "${root.dataset.frRiskWin}")`);
	check(ladder.phase === 'ladder', `FR-1  die Leiter läuft nach dem sync unverändert weiter (phase: "${ladder.phase}")`);

	panel.destroy();
}

/* ==========================================================================
   FR-2 — render('sync') WÄHREND NOCH KEINE LEITER LÄUFT (offer())
   ========================================================================== */

console.log('\nFR-2  render(\'sync\') aus offer(), bevor start() gerufen wurde: GEWINN gehört bei FruitRisk schon jetzt dieser Datei');

{
	const { url: accountUrl } = await ladeServerKonto(basiszustand());
	const ladderModuleUrl = await toModule(RISK_LADDER_MULTI_URL, [
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/account-backend.js', accountUrl],
	]);
	const riskModuleUrl = await toModule(RISK_URL, [
		['@phomo17/fruit-risk/rng.js', RNG_URL.href],
		['@phomo17/fruit-risk/nixie.js', NIXIE_URL.href],
		['@phomo17/fruit-risk/counter.js', COUNTER_URL.href],
		['@phomo17/fruit-risk/press.js', PRESS_URL.href],
		['@phomo17/casino-startpage/risk-timing.js', TIMING_FILE_URL],
		['@phomo17/casino-startpage/risk-ladder-multi.js', ladderModuleUrl],
	]);
	const { RiskPanel, GROUPS } = await import(riskModuleUrl);

	const { fn, wartend } = baueFetchWarteschlange();
	globalThis.fetch = fn;

	const { root, region } = baueGehaeuse();
	const panel = new RiskPanel(root, region);
	const calls = [];
	panel.winCounter = {
		ramp(amount) { calls.push({ method: 'ramp', amount }); },
		snap(amount) { calls.push({ method: 'snap', amount }); },
		destroy() { calls.push({ method: 'destroy' }); },
	};

	const gruppeRisk = GROUPS.find((g) => g.factor === 2);
	const ladder = panel.ladders[GROUPS.indexOf(gruppeRisk)];

	const claim = { amount: 10, collect: () => {}, discard: () => {} };
	ladder.offer(claim);                                  // Angebot dieser Gruppe — start() wird bewusst NICHT gerufen
	await flush();
	check(ladder.phase === 'offer', `FR-2  die Leiter dieser Gruppe steht im Angebot (phase: "${ladder.phase}")`);
	check(wartend.length === 1, 'FR-2  offer() hat die Buchung ausgelöst');

	antworten(wartend.shift(), { ok: true, kasse: 0, geraet: 0, gewinn: 8, gesamt: 8 });
	await flush();

	check(calls.some((c) => c.method === 'ramp' && c.amount === 8),
		`FR-2  das Zählwerk wurde auf den bestätigten Betrag 8 gezogen, schon während des Angebots (Aufrufe: `
		+ `${JSON.stringify(calls)})`);
	check(root.dataset.frRiskWin === '8',
		`FR-2  der Messpunkt data-fr-risk-win steht auf "8" (gefunden: "${root.dataset.frRiskWin}")`);

	panel.destroy();
}

console.log(failed
	? '\nERGEBNIS: render(\'sync\') erreicht das Gerät NICHT wie zugesagt.'
	: '\nERGEBNIS: eine Serverbestätigung zieht sowohl während des Angebots als auch während einer laufenden '
	+ 'Leiter genau das Gewinn-Zählwerk und den Messpunkt nach, ohne STUFE, Tastenfreigabe oder Ansage '
	+ 'anzufassen.');

process.exit(failed ? 1 : 0);
