/**
 * Blackjack – Nachweis der Runde am Tisch, der Auszahlung und der Kassenführung
 * ================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Rechnet ausschließlich mit
 * den ECHTEN Dateien der Extension und des Site Packages und startet keinen
 * Browser. Laufzeit unter fünf Sekunden.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-table.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * DER STARTAUFBAU IST ÜBERNOMMEN, NICHT NEU ERFUNDEN
 * ------------------------------------------------------
 * roulette/Resources/Private/Scripts/verify-round.mjs baut genau das, was
 * hier gebraucht wird: einen Browserspeicher im Arbeitsspeicher (fakeStore)
 * samt "storage"-Ereignis, und das Auflösen der Import-Map-Namen, die Node
 * nicht kennt (machine-credit.js und table-chips.js innerhalb von
 * table-buyin.js) über ein data:-Modul. Dieser Block ist sinngemäß
 * übernommen, mit den Modulnamen dieser Extension.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.24, Umsetzungsstück C5c)
 * ---------------------------------------------------------------------
 *   T-1  Wiederholbarkeit
 *   T-2  Gegenprobe zu T-1
 *   T-3  Die Bilanz stimmt nach JEDER einzelnen Runde
 *   T-4  Die Rack-Invariante
 *   T-5  Ein unzulässiger Einsatz wird abgewiesen, ohne dass etwas passiert
 *   T-6  Verdoppeln kostet genau den Einsatz dieses Blattes
 *   T-7  Teilen
 *   T-8  Versicherung
 *   T-9  Während der Runde nimmt der Tisch nichts an
 *   T-10 Der Rundenablauf wird vollständig durchlaufen
 *   T-11 Die Summe der Einsätze auf dem Tisch stimmt mit dem Bericht überein
 *   T-12 Der Nachlegeweg trifft jeden Betrag
 *   T-13 Gemischt wird nur zwischen Runden
 *   T-14 Der Zähler steuert nichts als den Mischzeitpunkt
 *   T-15 Beim Verlassen der Seite bleibt nichts liegen
 *   T-16 Es entsteht kein neuer Speicherschlüssel
 *
 * ZWEI ARTEN VON SPIELWEISE
 * ----------------------------
 * Die STATISTISCHEN Prüfungen (T-1 bis T-4, T-10, T-13, T-14, T-16) spielen
 * mit dem ECHTEN Schlitten (Shoe, seedbarer Zufall) und einer einfachen,
 * selbst geschriebenen Spielweise (immer stehen ab 17, sonst Karte; teilen
 * bei Assen und Achten; doppeln bei einer harten 11) — NICHT über
 * basic-strategy.mjs, denn hier wird nicht die Quote geprüft (das tut
 * measure-payout.mjs), sondern die BUCHFÜHRUNG.
 *
 * Die SZENARIO-Prüfungen (T-5 bis T-9, T-11, T-12, T-15) brauchen GENAU
 * bestimmte Blätter (ein Paar zum Teilen, eine harte 11 zum Doppeln, ein
 * sichtbares Ass für die Versicherung). Dafür tritt an die Stelle des echten
 * Schlittens ein FakeShoe, der eine vorbereitete Kartenfolge der Reihe nach
 * ausgibt — dieselbe Bauart wie der Platzhalter für wheel in
 * roulette/…/verify-round.mjs ("WIE DIE PHYSIK HIER GESPIELT WIRD"). Die
 * Rundenlogik (round-blackjack.js) bleibt in beiden Fällen unverändert die
 * ECHTE Datei; nur die Kartenquelle wird ausgetauscht.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HIER = new URL('.', import.meta.url);
/** typo3conf/ext/blackjack/Resources/Public/JavaScript/ */
const BJ_JS_DIR = new URL('../../Public/JavaScript/', HIER);
/** typo3conf/ext/casino_startpage/Resources/Public/JavaScript/ */
const CASINO_JS_DIR = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', HIER);

let fehler = 0;

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

console.log('\nBlackjack – Nachweis der Runde am Tisch, der Auszahlung und der Kassenführung');
console.log('================================================================================\n');

/* ----------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher, samt "storage"-Ereignis — dasselbe
   Verfahren wie in roulette/…/verify-round.mjs, hier mit den Modulnamen
   dieser Extension.
   ---------------------------------------------------------------------------- */

/** @type {Map<string, string>} */
const cells = new Map();
const storageListeners = [];

const fakeStore = {
	getItem(key) {
		return cells.has(key) ? cells.get(key) : null;
	},
	setItem(key, value) {
		cells.set(key, String(value));
	},
	removeItem(key) {
		cells.delete(key);
	},
	clear() {
		cells.clear();
	},
	key(index) {
		return [...cells.keys()][index] ?? null;
	},
	get length() {
		return cells.size;
	},
};

globalThis.localStorage = fakeStore;
globalThis.addEventListener = (type, handler) => {
	if (type === 'storage') {
		storageListeners.push(handler);
	}
};
globalThis.removeEventListener = (type, handler) => {
	if (type !== 'storage') {
		return;
	}
	const at = storageListeners.indexOf(handler);
	if (at !== -1) {
		storageListeners.splice(at, 1);
	}
};

/* ----------------------------------------------------------------------------
   Die echten Module laden.
   ---------------------------------------------------------------------------- */

const machineUrl = new URL('machine-credit.js', CASINO_JS_DIR);
const creditUrl = new URL('credit.js', CASINO_JS_DIR);
const chipsUrl = new URL('table-chips.js', CASINO_JS_DIR);
const buyinUrl = new URL('table-buyin.js', CASINO_JS_DIR);
// Seit Ausbaustufe 3, D3b importieren credit.js UND machine-credit.js
// zusätzlich account-backend.js — ÜBER DAS PRÄFIX, nicht relativ (Korrektur
// vom 2026-09-10, zweiter Nachbesserungslauf: coin_pusher/store.js
// importiert account-backend.js zwangsläufig über dasselbe Präfix, ein
// abweichender relativer Import in credit.js/machine-credit.js erzeugte im
// Browser ein zweites, unabhängiges konto-Objekt unter einer zweiten
// Adresse — an der laufenden Seite gemessen). credit.js braucht deshalb
// jetzt ebenfalls einen Text-Patch, den es vor D3b nicht brauchte.
const accountUrl = new URL('account-backend.js', CASINO_JS_DIR);

const creditSource = await readFile(fileURLToPath(creditUrl), 'utf8');
const patchedCredit = creditSource.replaceAll(
	"'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(accountUrl.href)
);
check(patchedCredit !== creditSource, 'der Modulname in credit.js wurde für Node aufgelöst');
const creditDataUrl = `data:text/javascript;base64,${Buffer.from(patchedCredit, 'utf8').toString('base64')}`;

const machineSource = await readFile(fileURLToPath(machineUrl), 'utf8');
const patchedMachine = machineSource
	.replaceAll("'@phomo17/casino-startpage/credit.js'", JSON.stringify(creditDataUrl))
	.replaceAll("'@phomo17/casino-startpage/account-backend.js'", JSON.stringify(accountUrl.href));
check(patchedMachine !== machineSource, 'der Modulname in machine-credit.js wurde für Node aufgelöst');
const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

const buyinSource = await readFile(fileURLToPath(buyinUrl), 'utf8');
const patchedBuyin = buyinSource
	.replaceAll("'@phomo17/casino-startpage/machine-credit.js'", JSON.stringify(machineDataUrl))
	.replaceAll("'@phomo17/casino-startpage/table-chips.js'", JSON.stringify(chipsUrl.href));
check(patchedBuyin !== buyinSource && !patchedBuyin.includes('@phomo17/casino-startpage/'),
	'beide Modulnamen in table-buyin.js wurden für Node aufgelöst');

const { credit } = await import(creditDataUrl);
const { openTableBank } = await import(
	`data:text/javascript;base64,${Buffer.from(patchedBuyin, 'utf8').toString('base64')}`
);
const { BetTable } = await import(new URL('table-bets.js', CASINO_JS_DIR).href);
const { TableRound } = await import(new URL('table-round.js', CASINO_JS_DIR).href);
const { CHIP_VALUES } = await import(chipsUrl.href);

const rules = await import(new URL('rules-blackjack.js', BJ_JS_DIR).href);
const { Shoe } = await import(new URL('shoe.js', BJ_JS_DIR).href);
const { BlackjackRound } = await import(new URL('round-blackjack.js', BJ_JS_DIR).href);
const { buildFields, roundMax, BOX_FIELD_ID } = await import(new URL('bets-blackjack.js', BJ_JS_DIR).href);
const { BlackjackTable } = await import(new URL('round-table-blackjack.js', BJ_JS_DIR).href);
const { createSeeded } = await import(new URL('rng.js', BJ_JS_DIR).href);

/** Für T-16: welche Bank-Schlüssel dieser Lauf insgesamt geöffnet hat. */
const geoeffneteSchluessel = [];

/**
 * Ein Kartenobjekt — dieselbe Form, die shoe.js liefert.
 * @param {string} rank @param {string} [suit] @returns {{rank: string, suit: string}}
 */
function K(rank, suit = 'H') {
	return { rank, suit };
}

/**
 * Ein Schlitten mit einer VORBEREITETEN Kartenfolge, für die Szenario-
 * Prüfungen (T-5 bis T-9, T-11, T-12, T-15). Dieselbe Rolle wie der
 * Platzhalter für "wheel" in roulette/…/verify-round.mjs: die Rundenlogik
 * (round-blackjack.js) bleibt die ECHTE Datei, nur die Kartenquelle wird
 * ausgetauscht. needsShuffle ist immer false — diese Prüfungen betreffen den
 * Mischzeitpunkt nicht.
 */
class FakeShoe {
	/** @param {Array<{rank: string, suit: string}>} karten */
	constructor(karten) {
		this.queue = [...karten];
		this.shuffles = 1;
		this.pos = 0;
	}

	draw() {
		if (this.queue.length === 0) {
			throw new RangeError('FakeShoe: keine Karte mehr in der Warteschlange — Szenario zu kurz geplant.');
		}
		this.pos++;
		return this.queue.shift();
	}

	get needsShuffle() {
		return false;
	}

	get shuffleReason() {
		return null;
	}

	shuffle() {
		this.shuffles++;
	}

	get dealt() {
		return this.pos;
	}
}

/**
 * Baut einen vollständigen, spielbereiten Tisch mit den ECHTEN Modulen auf.
 * @param {{key: string, shoe: Object, settleDelayMs?: number, onResult?: function, onReshuffle?: function}} teile
 * @returns {Promise<Object>}
 */
async function tischBauen({ key, shoe, settleDelayMs = 0, onResult = null, onReshuffle = null }) {
	geoeffneteSchluessel.push(key);
	const bank = openTableBank(key);
	await bank.ready;
	const bets = new BetTable({ fields: buildFields(rules), roundMax: roundMax(rules) });
	const round = new TableRound();
	const roundStates = [];
	round.onEnter = ({ state }) => { roundStates.push(state); };
	const game = new BlackjackRound({ rules, shoe });
	const table = new BlackjackTable({
		round, game, shoe, bets, bank, rules,
		shouldReshuffle: BlackjackRound.shouldReshuffle,
		chipValues: CHIP_VALUES,
		settleDelayMs,
		onResult,
		onReshuffle,
	});
	// table überschreibt round.onEnter in seinem eigenen Konstruktor
	// (dieselbe Bauart wie RouletteRound) — die Zustandsfolge wird deshalb
	// über einen ZWEITEN, eigenen Zuhörer mitgeschrieben, der NACH dem
	// Konstruktor angemeldet wird und table.onRound zusätzlich aufruft.
	const bisherigerOnRound = table.onRound;
	table.onRound = (...args) => { bisherigerOnRound?.(...args); };
	round.onEnter = (detail) => {
		roundStates.push(detail.state);
		table.onRound?.(detail);
	};
	return { bank, bets, shoe, game, round, table, roundStates };
}

/**
 * Legt einen Chip auf den Setzkreis — wie table-felt.js: erst bets.place(),
 * dann bank.placeChip(), bei Absage zurückrollen.
 * @param {Object} tisch @param {number} value @returns {Promise<boolean>}
 */
async function legeChip(tisch, value) {
	const versuch = tisch.bets.place(BOX_FIELD_ID, value);
	if (!versuch.ok) {
		return false;
	}
	const gebucht = await tisch.bank.placeChip(value);
	if (!gebucht.ok) {
		tisch.bets.takeBack(BOX_FIELD_ID);
		return false;
	}
	return true;
}

/**
 * Legt genau `betrag` auf den Setzkreis — unabhängig davon, welche Chips
 * gerade im Rack liegen. bank.buyIn() zerlegt einen Betrag stets in die
 * GRÖSSTEN passenden Chips (breakDown()); ein Buy-in von z. B. 1000 € liefert
 * deshalb unter Umständen KEINEN einzigen 1-€-Chip, obwohl der Grundeinsatz
 * (mindestens 2 €) nur aus 1-€-Chips zusammengesetzt werden könnte. Diese
 * Funktion wechselt deshalb bei Bedarf selbst herunter — genau dasselbe
 * Verfahren wie BlackjackTable#_stakeAmount() (größten passenden Chip legen,
 * sonst den kleinsten zu großen kleinwechseln).
 * @returns {Promise<void>}
 */
async function legeGrundeinsatz(tisch, betrag) {
	let rest = betrag;
	let notbremse = 0;
	while (rest > 0) {
		if (++notbremse > 500) {
			throw new Error(`legeGrundeinsatz(): kommt nicht zum Ende (Rest ${rest} von ${betrag}).`);
		}
		let passend = 0;
		for (const wert of CHIP_VALUES) {
			if (wert <= rest && tisch.bank.canPlace(wert)) {
				passend = wert;
				break;
			}
		}
		if (passend === 0) {
			let zuGross = 0;
			for (let i = CHIP_VALUES.length - 1; i >= 0; i -= 1) {
				const wert = CHIP_VALUES[i];
				if (wert > rest && tisch.bank.canPlace(wert)) {
					zuGross = wert;
					break;
				}
			}
			if (zuGross === 0) {
				throw new Error(`legeGrundeinsatz(): kein Chip verfügbar, um die restlichen ${rest} von ${betrag} zu legen.`);
			}
			tisch.bank.exchangeDown(zuGross);
			continue;
		}
		if (!(await legeChip(tisch, passend))) {
			throw new Error(`legeGrundeinsatz(): legeChip(${passend}) ist unerwartet fehlgeschlagen.`);
		}
		rest -= passend;
	}
}

/**
 * Die einfache Spielweise für die statistischen Prüfungen: immer stehen ab
 * 17, sonst Karte; teilen bei Assen und Achten; doppeln bei einer harten 11.
 * Versicherung wird nie angenommen (hält den Ablauf einfach — Versicherung
 * ist Gegenstand von T-8, dort gezielt geprüft).
 * @param {Object} tisch @returns {'hit'|'stand'|'double'|'split'}
 */
function entscheide(tisch) {
	const legal = tisch.table.legalActions();
	const blatt = tisch.game.hands.find((h) => h.outcome === null && !h.busted && h.total <= 21);
	if (!blatt) {
		return legal.includes('stand') ? 'stand' : (legal[0] ?? 'stand');
	}
	const ranks = blatt.cards.map((c) => c.rank);
	if (legal.includes('split') && ranks.length === 2 && ranks[0] === ranks[1] && (ranks[0] === 'A' || ranks[0] === '8')) {
		return 'split';
	}
	if (legal.includes('double') && !blatt.soft && blatt.total === 11) {
		return 'double';
	}
	if (blatt.total >= 17) {
		return legal.includes('stand') ? 'stand' : (legal[0] ?? 'stand');
	}
	return legal.includes('hit') ? 'hit' : (legal.includes('stand') ? 'stand' : (legal[0] ?? 'stand'));
}

/**
 * Kauft vor jeder Runde frisch nach (dieselbe Vorsichtsmaßnahme wie in
 * roulette/…/verify-round.mjs, "ensureChipAndBet"): der Grundeinsatz UND
 * eine Reserve für Doppeln/Teilen/Versicherung, damit eine Verlustserie
 * keine Runde mit 'nocash' abbrechen lässt, wo das nicht die Aussage der
 * jeweiligen Prüfung ist.
 * @param {Object} tisch @param {number} grundeinsatz @returns {Promise<void>}
 */
async function nachkaufenUndSetzen(tisch, grundeinsatz) {
	await tisch.bank.buyIn(grundeinsatz * 3);
	await legeGrundeinsatz(tisch, grundeinsatz);
}

/**
 * Spielt eine vollständige Runde mit der einfachen Spielweise durch —
 * lehnt eine angebotene Versicherung immer ab.
 * @param {Object} tisch @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function spieleRunde(tisch) {
	const dealResult = await tisch.table.deal();
	if (!dealResult.ok) {
		return dealResult;
	}
	let notbremse = 0;
	while (tisch.table.state === 'versicherung') {
		await tisch.table.declineInsurance();
	}
	while (tisch.table.state === 'spieler') {
		if (++notbremse > 40) {
			throw new Error('verify-table.mjs: spieleRunde() kommt nicht zum Ende — Notbremse.');
		}
		const antwort = await tisch.table.act(entscheide(tisch));
		if (!antwort.ok) {
			break;
		}
	}
	return { ok: true };
}

/* ============================================================================
   T-1 — Wiederholbarkeit
   ============================================================================ */

console.log('T-1 — 300 Runden, zweimal mit derselben Saat gespielt');
{
	async function spieleSitzung(key) {
		await credit.reload();
		await credit.set(1_000_000);
		const shoe = new Shoe({ rules, random: createSeeded(20260906) });
		const tisch = await tischBauen({ key, shoe });
		const folge = [];
		for (let i = 0; i < 300; i++) {
			await nachkaufenUndSetzen(tisch, rules.BET_MIN);
			await spieleRunde(tisch);
			folge.push({
				dealer: tisch.game.report?.dealer.total ?? null,
				net: tisch.game.report?.net ?? null,
				buyIn: tisch.bank.amount,
				handsCount: tisch.game.hands.length,
			});
		}
		await tisch.bank.close();
		return folge;
	}

	const folgeEins = await spieleSitzung('bj_pruef_t1_eins');
	const folgeZwei = await spieleSitzung('bj_pruef_t1_zwei');
	check(JSON.stringify(folgeEins) === JSON.stringify(folgeZwei),
		'zwei Sitzungen mit derselben Saat liefern Zeichen für Zeichen dieselbe Folge über 300 Runden');
}

/* ============================================================================
   T-2 — Gegenprobe zu T-1
   ============================================================================ */

console.log('\nT-2 — zehn verschiedene Saaten liefern zehn verschiedene Folgen');
{
	const folgen = [];
	for (let s = 1; s <= 10; s++) {
		await credit.reload();
		await credit.set(1_000_000);
		const shoe = new Shoe({ rules, random: createSeeded(20260900 + s) });
		const tisch = await tischBauen({ key: `bj_pruef_t2_${s}`, shoe });
		const folge = [];
		for (let i = 0; i < 40; i++) {
			await nachkaufenUndSetzen(tisch, rules.BET_MIN);
			await spieleRunde(tisch);
			folge.push(tisch.game.report?.dealer.total ?? null);
		}
		await tisch.bank.close();
		folgen.push(JSON.stringify(folge));
	}
	const eindeutig = new Set(folgen);
	check(eindeutig.size === folgen.length,
		`alle ${folgen.length} Saaten liefern paarweise verschiedene Folgen (eindeutige Folgen: ${eindeutig.size})`);
}

/* ============================================================================
   T-3 / T-4 / T-10 / T-13 / T-14 — der große statistische Lauf
   ============================================================================ */

console.log('\nT-3 — 2000 Runden, die Bilanz nach jeder einzelnen geprüft');
console.log('T-4 — die Rack-Invariante nach jedem Schritt');
console.log('T-10 — der Rundenablauf wird vollständig durchlaufen');
console.log('T-13 — gemischt wird nur zwischen Runden');
console.log('T-14 — der Zähler steuert nichts als den Mischzeitpunkt');
{
	await credit.reload();
	await credit.set(1_000_000);
	const shoe = new Shoe({ rules, random: createSeeded(7112026) });
	const tisch = await tischBauen({ key: 'bj_pruef_t3_t4_t10_t13_t14', shoe });

	// T-4: die Invariante nach jedem Schritt.
	let invarianteFehlgeschlagen = null;
	const pruefeInvariante = (ort) => {
		if (invarianteFehlgeschlagen === null && tisch.bank.rack.total !== tisch.bank.machineCredit.amount) {
			invarianteFehlgeschlagen = `${ort}: rack.total=${tisch.bank.rack.total}, machineCredit.amount=${tisch.bank.machineCredit.amount}`;
		}
	};
	pruefeInvariante('vor Runde 0');

	let bilanzFehlgeschlagen = null;
	let ablaufFehlgeschlagen = null;
	let zaehlerFehlgeschlagen = null;
	let mischenNurZwischenRundenFehlgeschlagen = null;

	const ANZAHL_RUNDEN = 2000;
	for (let i = 0; i < ANZAHL_RUNDEN; i++) {
		await nachkaufenUndSetzen(tisch, rules.BET_MIN);
		pruefeInvariante(`Runde ${i}, nach dem Nachkauf`);

		const b0 = credit.balance + tisch.bank.amount + tisch.bets.total;
		const shuffleVorher = tisch.shoe.shuffleCount;
		const sollteMischen = BlackjackRound.shouldReshuffle(tisch.shoe);

		tisch.roundStates.length = 0;
		await spieleRunde(tisch);
		pruefeInvariante(`Runde ${i}, nach der Auswertung`);

		// T-13: genau EIN Mischen, dann und nur dann, wenn shouldReshuffle
		// vorher true war — und ausschließlich zwischen den Runden.
		const erwarteteZahl = shuffleVorher + (sollteMischen ? 1 : 0);
		if (mischenNurZwischenRundenFehlgeschlagen === null && tisch.shoe.shuffleCount !== erwarteteZahl) {
			mischenNurZwischenRundenFehlgeschlagen =
				`Runde ${i}: shuffleCount=${tisch.shoe.shuffleCount}, erwartet ${erwarteteZahl} (sollteMischen=${sollteMischen})`;
		}

		// T-3: die Bilanz stimmt zentgenau.
		const report = tisch.game.report;
		const b1 = credit.balance + tisch.bank.amount + tisch.bets.total;
		if (bilanzFehlgeschlagen === null && report && b1 !== b0 + report.net) {
			bilanzFehlgeschlagen = `Runde ${i}: b0=${b0}, b1=${b1}, report.net=${report?.net}, report=${JSON.stringify(report)}`;
		}

		// T-10: exakt die Folge gesperrt → laeuft → auswerten → auszahlen → setzen.
		const erwarteteFolge = JSON.stringify(['gesperrt', 'laeuft', 'auswerten', 'auszahlen', 'setzen']);
		if (ablaufFehlgeschlagen === null && JSON.stringify(tisch.roundStates) !== erwarteteFolge) {
			ablaufFehlgeschlagen = `Runde ${i}: ${JSON.stringify(tisch.roundStates)}`;
		}

		// T-14: der Geber zieht GENAU dann, wenn dealerMustDraw() es sagt —
		// unabhängig aus report.dealer.cards nachgerechnet. Nur aussagekräftig,
		// wenn das Zieh-Schema überhaupt befragt wurde (playedOut).
		if (zaehlerFehlgeschlagen === null && report && report.dealer.playedOut) {
			const karten = report.dealer.cards;
			for (let n = 2; n < karten.length; n++) {
				const vorherigeRanks = karten.slice(0, n).map((c) => c.rank);
				if (!rules.dealerMustDraw(rules.handTotal(vorherigeRanks))) {
					zaehlerFehlgeschlagen = `Runde ${i}: Geber zog eine ${n + 1}. Karte, obwohl dealerMustDraw() bei den ersten ${n} Karten bereits false war`;
					break;
				}
			}
			const alleRanks = karten.map((c) => c.rank);
			if (zaehlerFehlgeschlagen === null && rules.dealerMustDraw(rules.handTotal(alleRanks))) {
				zaehlerFehlgeschlagen = `Runde ${i}: Geber stand bei ${JSON.stringify(alleRanks)}, obwohl dealerMustDraw() dort true liefert`;
			}
		}
	}

	check(invarianteFehlgeschlagen === null, 'rack.total === machineCredit.amount nach jedem Schritt', invarianteFehlgeschlagen ?? '');
	check(bilanzFehlgeschlagen === null, `die Bilanz stimmt zentgenau nach jeder der ${ANZAHL_RUNDEN} Runden`, bilanzFehlgeschlagen ?? '');
	check(ablaufFehlgeschlagen === null, 'der Rundenablauf ist je Runde exakt gesperrt→laeuft→auswerten→auszahlen→setzen', ablaufFehlgeschlagen ?? '');
	check(mischenNurZwischenRundenFehlgeschlagen === null,
		'gemischt wird genau dann und nur dann, wenn shouldReshuffle() vor der Runde true war, und ausschließlich zwischen zwei Runden',
		mischenNurZwischenRundenFehlgeschlagen ?? '');
	check(zaehlerFehlgeschlagen === null,
		'der Geber zieht in jeder Runde genau nach dealerMustDraw(), unabhängig nachgerechnet',
		zaehlerFehlgeschlagen ?? '');

	console.log('     Gegenprobe T-10-G: eine künstlich verkürzte Folge muss als falsch erkannt werden');
	const verkuerzt = ['gesperrt', 'laeuft', 'auswerten', 'setzen'];
	check(JSON.stringify(verkuerzt) !== JSON.stringify(['gesperrt', 'laeuft', 'auswerten', 'auszahlen', 'setzen']),
		'T-10-G: die verkürzte Folge weicht von der erwarteten Folge ab');

	console.log('     Gegenprobe T-14-G: ein absichtlich abweichender Vergleichswert wird erkannt');
	check(rules.dealerMustDraw({ total: 16 }) === true && rules.dealerMustDraw({ total: 17 }) === false,
		'T-14-G: dealerMustDraw() unterscheidet 16 (zieht) und 17 (steht) wie erwartet');

	await tisch.bank.close();
}

/* ============================================================================
   T-5 — Ein unzulässiger Einsatz wird abgewiesen, ohne dass etwas passiert
   ============================================================================ */

console.log('\nT-5 — ein unzulässiger Einsatz wird abgewiesen, ohne dass etwas passiert');
{
	async function pruefeAbgelehnt(bezeichnung, aufbauen) {
		await credit.reload();
		await credit.set(1_000_000);
		const shoe = new FakeShoe([]); // keine Karte darf den Schlitten verlassen
		const tisch = await tischBauen({ key: `bj_pruef_t5_${bezeichnung}`, shoe });
		await tisch.bank.buyIn(1000);
		await aufbauen(tisch);
		const vorher = { dealt: shoe.dealt, state: tisch.round.state, total: tisch.bets.total };
		const antwort = await tisch.table.deal();
		check(antwort.ok === false && antwort.reason === 'stake', `${bezeichnung}: deal() liefert reason "stake"`, JSON.stringify(antwort));
		check(shoe.dealt === vorher.dealt, `${bezeichnung}: keine Karte hat den Schlitten verlassen`);
		check(tisch.round.state === 'setzen', `${bezeichnung}: round.state bleibt "setzen"`);
		check(tisch.bets.total === vorher.total, `${bezeichnung}: bets.total bleibt unverändert`);
		await tisch.bank.close();
	}

	await pruefeAbgelehnt('null', async () => {});
	await pruefeAbgelehnt('ungerade', async (tisch) => {
		await legeChip(tisch, 1);
		await legeChip(tisch, 1);
		await legeChip(tisch, 1); // 3 € — ungerade
	});
	await pruefeAbgelehnt('ueberhoeht', async (tisch) => {
		// Das gemeinsame Setzfeld begrenzt den Gesamteinsatz bereits auf
		// rules.BET_MAX (bets-blackjack.js: max: rules.BET_MAX) — ein Einsatz
		// ÜBER dem Höchstbetrag ist über bets.place() deshalb gar nicht erst
		// erreichbar. Um trotzdem nachzuweisen, dass deal() diesen Fall
		// EIGENSTÄNDIG abfängt (Verteidigung in der Tiefe, falls sich das
		// Feldlimit einmal ändert), wird bets.placements — ein gewöhnliches,
		// öffentliches Feld von BetTable — für diesen einen Testfall direkt
		// auf einen Wert über dem Höchstbetrag gesetzt, unter Umgehung der
		// Feld-Schranke, NICHT unter Umgehung der hier geprüften deal()-Regel.
		tisch.bets.placements.push({ fieldId: BOX_FIELD_ID, value: rules.BET_MAX + 2 });
	});

	console.log('     Gegenprobe T-5-G: ein gerader Einsatz im erlaubten Bereich wird angenommen');
	await credit.reload();
	await credit.set(1_000_000);
	const shoeG = new Shoe({ rules, random: createSeeded(555) });
	const tischG = await tischBauen({ key: 'bj_pruef_t5_g', shoe: shoeG });
	await tischG.bank.buyIn(1000);
	await legeGrundeinsatz(tischG, rules.BET_MIN);
	const antwortG = await tischG.table.deal();
	check(antwortG.ok === true, 'T-5-G: ein gerader, legaler Einsatz wird angenommen', JSON.stringify(antwortG));
	await tischG.bank.close();
}

/* ============================================================================
   T-6 — Verdoppeln kostet genau den Einsatz dieses Blattes
   ============================================================================ */

console.log('\nT-6 — Verdoppeln kostet genau den Einsatz dieses Blattes');
{
	const GRUNDEINSATZ = 100; // = rules.BET_MAX, ein einzelner 100er-Chip
	// Ein Paar Achter wird zuerst geteilt (zwei Blätter), damit das Doppeln
	// des ERSTEN Blattes die Runde NICHT sofort beendet — das zweite Blatt
	// muss noch gespielt werden. Nur so lässt sich bank.staked GENAU im
	// Augenblick des Nachlegens beobachten, bevor _finish() (das erst nach
	// BEIDEN Blättern läuft) es durch die Auszahlung wieder verändert.
	//   p1=8, d1=2(offen), p2=8, d2=3(verdeckt) → Paar Achter, Geber zeigt 2.
	//   Teilung zieht: Blatt 0 bekommt 3 (→ [8,3]=11, hart, doppelbar),
	//                  Blatt 1 bekommt 9 (→ [8,9]=17, steht später).
	//   Doppeln auf Blatt 0 zieht genau eine Karte (2 → [8,3,2]=13, fertig).
	//   Der Geber steht bei [2,3]=5 und zieht bis 17 (K, 2).
	const karten = [K('8'), K('2'), K('8'), K('3'), K('3'), K('9'), K('2'), K('K'), K('2')];
	await credit.reload();
	await credit.set(1_000_000);
	const tisch = await tischBauen({ key: 'bj_pruef_t6', shoe: new FakeShoe(karten) });
	await tisch.bank.buyIn(GRUNDEINSATZ * 3);
	await legeGrundeinsatz(tisch, GRUNDEINSATZ);

	const dealResult = await tisch.table.deal();
	check(dealResult.ok === true, 'T-6: Runde beginnt', JSON.stringify(dealResult));
	check(tisch.table.legalActions().includes('split'), 'T-6: das Paar ist teilbar');
	await tisch.table.act('split');
	check(tisch.game.hands.length === 2, 'T-6: nach der Teilung liegen zwei Blätter');
	check(tisch.table.legalActions().includes('double'), 'T-6: "double" ist auf dem ersten Blatt erlaubt');

	const stakedVorher = tisch.bank.staked;
	const antwort = await tisch.table.act('double');
	check(antwort.ok === true, 'T-6: double() gelingt', JSON.stringify(antwort));
	check(tisch.table.state === 'spieler', 'T-6: die Runde läuft weiter — das zweite Blatt ist noch nicht gespielt');
	const blatt = tisch.game.hands[0];
	check(blatt.doubled === true && blatt.stake === GRUNDEINSATZ * 2, 'T-6: der Einsatz des ersten Blattes hat sich verdoppelt');
	check(tisch.bank.staked - stakedVorher === blatt.stake / 2,
		`T-6: bank.staked ist um genau blatt.stake/2 (${blatt.stake / 2}) gewachsen`,
		`tatsächlich: ${tisch.bank.staked - stakedVorher}`);

	await tisch.table.act('stand'); // das zweite Blatt zu Ende spielen
	const report = tisch.game.report;
	check(report !== null && report.staked === GRUNDEINSATZ * 3,
		'T-6: report.staked enthält den verdoppelten Einsatz plus den Grundeinsatz des zweiten Blattes', JSON.stringify(report));
	await tisch.bank.close();

	console.log('     Gegenprobe T-6-G: zu kleiner Buy-in liefert "nocash", nichts verändert');
	await credit.reload();
	await credit.set(1_000_000);
	const tischG = await tischBauen({ key: 'bj_pruef_t6_g', shoe: new FakeShoe(karten) });
	await tischG.bank.buyIn(GRUNDEINSATZ * 2); // Grundeinsatz + die Teilung, aber keine Reserve für ein Doppeln
	await legeGrundeinsatz(tischG, GRUNDEINSATZ);
	await tischG.table.deal();
	await tischG.table.act('split');
	check(tischG.bank.amount === 0, 'T-6-G: der Buy-in ist nach Grundeinsatz und Teilung aufgebraucht');
	const handVorher = JSON.stringify(tischG.game.hands);
	const rackVorher = tischG.bank.rack.total;
	const antwortG = await tischG.table.act('double');
	check(antwortG.ok === false && antwortG.reason === 'nocash', 'T-6-G: double() liefert "nocash"', JSON.stringify(antwortG));
	check(JSON.stringify(tischG.game.hands) === handVorher, 'T-6-G: die Karten sind unverändert');
	check(tischG.bank.rack.total === rackVorher, 'T-6-G: das Rack ist unverändert');
	await tischG.bank.close();
}

/* ============================================================================
   T-7 — Teilen
   ============================================================================ */

console.log('\nT-7 — Teilen: bis zum Limit, jedes neue Blatt kostet den Grundeinsatz');
{
	const GRUNDEINSATZ = 100;
	// Ein Paar Achter, das sich zweimal weiter in Paare Achter teilen lässt
	// (drei Teilungen insgesamt, HOUSE.splitMax), danach vier gleich große
	// Blätter, die alle stehen, und ein Geber, der von 2+3 auf 17 zieht.
	const karten = [
		K('8'), K('2'), K('8'), K('3'), // Grundhand: [8,8], Geber zeigt 2, hole 3
		K('8'), K('8'), // Teilung 1: beide neuen Blätter werden [8,8]
		K('8'), K('8'), // Teilung 2 (auf dem ersten der beiden): wieder [8,8]/[8,8]
		K('8'), K('8'), // Teilung 3 (=splitMax): wieder [8,8]/[8,8] — jetzt 4 Blätter
		K('Q'), K('2'), // Geber zieht von 5 auf 17
	];
	await credit.reload();
	await credit.set(1_000_000);
	const tisch = await tischBauen({ key: 'bj_pruef_t7', shoe: new FakeShoe(karten) });
	await tisch.bank.buyIn(GRUNDEINSATZ * 5);
	await legeGrundeinsatz(tisch, GRUNDEINSATZ);
	await tisch.table.deal();

	const stakedNachSplits = [];
	for (let n = 0; n < 3; n++) {
		check(tisch.table.legalActions().includes('split'), `T-7: Teilung ${n + 1} ist erlaubt`);
		const vorher = tisch.bank.staked;
		const antwort = await tisch.table.act('split');
		check(antwort.ok === true, `T-7: Teilung ${n + 1} gelingt`, JSON.stringify(antwort));
		stakedNachSplits.push(tisch.bank.staked - vorher);
	}
	check(stakedNachSplits.every((betrag) => betrag === GRUNDEINSATZ),
		'T-7: jede Teilung hat genau den Grundeinsatz nachgelegt', JSON.stringify(stakedNachSplits));
	check(tisch.game.hands.length === rules.HOUSE.handsMax, `T-7: genau ${rules.HOUSE.handsMax} Blätter liegen`);
	check(tisch.game.hands.every((h) => h.stake === GRUNDEINSATZ), 'T-7: jedes Blatt kostet genau den Grundeinsatz');

	// Ein vierter Versuch ist über dem Limit und wird abgewiesen — OHNE eine
	// weitere Karte zu ziehen.
	const dealtVorAbgelehnterTeilung = tisch.shoe.dealt;
	const stakedVorAbgelehnterTeilung = tisch.bank.staked;
	const abgelehnt = await tisch.table.act('split');
	check(abgelehnt.ok === false && abgelehnt.reason === 'splitLimit', 'T-7: die vierte Teilung wird mit "splitLimit" abgewiesen', JSON.stringify(abgelehnt));
	check(tisch.shoe.dealt === dealtVorAbgelehnterTeilung, 'T-7: die abgelehnte Teilung zieht keine Karte');
	check(tisch.bank.staked === stakedVorAbgelehnterTeilung, 'T-7: die abgelehnte Teilung legt kein Geld nach');
	check(!tisch.table.legalActions().includes('split'), 'T-7: "split" wird nach Erreichen des Limits nicht mehr angeboten');

	// Alle vier Blätter zu Ende spielen (stehen), Geber zieht auf 17.
	for (let n = 0; n < 4; n++) {
		await tisch.table.act('stand');
	}
	check(tisch.table.state === 'fertig', 'T-7: die Runde ist nach vier Mal Stehen zu Ende');
	await tisch.bank.close();

	console.log('     Gegenprobe T-7-G: zu kleiner Buy-in liefert "nocash", nichts verändert');
	await credit.reload();
	await credit.set(1_000_000);
	const tischG = await tischBauen({ key: 'bj_pruef_t7_g', shoe: new FakeShoe(karten.slice(0, 4)) });
	await tischG.bank.buyIn(GRUNDEINSATZ); // keine Reserve für eine Teilung
	await legeGrundeinsatz(tischG, GRUNDEINSATZ);
	await tischG.table.deal();
	const handVorher = JSON.stringify(tischG.game.hands);
	const antwortG = await tischG.table.act('split');
	check(antwortG.ok === false && antwortG.reason === 'nocash', 'T-7-G: split() liefert "nocash"', JSON.stringify(antwortG));
	check(JSON.stringify(tischG.game.hands) === handVorher, 'T-7-G: die Karten sind unverändert');
	await tischG.bank.close();

	console.log('     Geteilte Asse: genau eine Karte, legalActions() === []');
	const assKarten = [K('A'), K('4'), K('A'), K('5'), K('9'), K('8'), K('J'), K('4')];
	await credit.reload();
	await credit.set(1_000_000);
	const tischAs = await tischBauen({ key: 'bj_pruef_t7_asse', shoe: new FakeShoe(assKarten) });
	await tischAs.bank.buyIn(GRUNDEINSATZ * 2);
	await legeGrundeinsatz(tischAs, GRUNDEINSATZ);
	await tischAs.table.deal();
	await tischAs.table.act('split');
	check(tischAs.game.hands.every((h) => h.cards.length === 2), 'T-7: jedes geteilte Ass hat genau eine automatisch nachgelegte Karte');
	check(tischAs.table.legalActions().length === 0 || tischAs.table.state !== 'spieler',
		'T-7: nach geteilten Assen bietet die aktive Hand keine Handlung mehr an (oder die Runde ist bereits weiter)');
	await tischAs.bank.close();
}

/* ============================================================================
   T-8 — Versicherung
   ============================================================================ */

console.log('\nT-8 — Versicherung');
{
	const GRUNDEINSATZ = 100;

	console.log('     nur bei sichtbarem Ass angeboten');
	{
		const karten = [K('5'), K('2'), K('6'), K('3')]; // Geber zeigt 2, kein Ass
		await credit.reload();
		await credit.set(1_000_000);
		const tisch = await tischBauen({ key: 'bj_pruef_t8_kein_ass', shoe: new FakeShoe(karten) });
		await tisch.bank.buyIn(GRUNDEINSATZ * 2);
		await legeGrundeinsatz(tisch, GRUNDEINSATZ);
		await tisch.table.deal();
		check(tisch.game.offers.insurance === false, 'T-8: ohne sichtbares Ass wird keine Versicherung angeboten');
		await tisch.bank.close();
	}

	console.log('     Geber HAT Blackjack: Versicherung zahlt das Dreifache');
	{
		const karten = [K('5'), K('A'), K('6'), K('K')]; // Geber: A+K = Blackjack
		await credit.reload();
		await credit.set(1_000_000);
		const tisch = await tischBauen({ key: 'bj_pruef_t8_bj', shoe: new FakeShoe(karten) });
		await tisch.bank.buyIn(GRUNDEINSATZ * 2);
		await legeGrundeinsatz(tisch, GRUNDEINSATZ);
		await tisch.table.deal();
		check(tisch.game.offers.insurance === true, 'T-8: mit sichtbarem Ass wird Versicherung angeboten');
		const erwarteteKosten = rules.insuranceMax(GRUNDEINSATZ);
		check(tisch.table.insuranceCost === erwarteteKosten, `T-8: Versicherung kostet ${erwarteteKosten} (der halbe Grundeinsatz)`);
		const antwort = await tisch.table.takeInsurance();
		check(antwort.ok === true && antwort.amount === erwarteteKosten, 'T-8: die Versicherung wird angenommen', JSON.stringify(antwort));
		check(tisch.table.state === 'fertig', 'T-8: bei Geber-Blackjack endet die Runde sofort');
		const report = tisch.game.report;
		check(report.insurance.returned === rules.insuranceReturn(erwarteteKosten),
			'T-8: die Versicherung zahlt das Dreifache des Einsatzes', JSON.stringify(report.insurance));
		check(report.staked === GRUNDEINSATZ + erwarteteKosten, 'T-8: report.staked enthält den Versicherungsbetrag');
		await tisch.bank.close();
	}

	console.log('     Geber hat KEIN Blackjack: Versicherung zahlt nichts');
	{
		const karten = [K('5'), K('A'), K('6'), K('9'), K('K')]; // Geber: A+9=20, kein BJ; danach steht er
		await credit.reload();
		await credit.set(1_000_000);
		const tisch = await tischBauen({ key: 'bj_pruef_t8_kein_bj', shoe: new FakeShoe(karten) });
		await tisch.bank.buyIn(GRUNDEINSATZ * 2);
		await legeGrundeinsatz(tisch, GRUNDEINSATZ);
		await tisch.table.deal();
		const erwarteteKosten = rules.insuranceMax(GRUNDEINSATZ);
		await tisch.table.takeInsurance();
		check(tisch.table.state === 'spieler', 'T-8: ohne Geber-Blackjack geht es normal weiter');
		await tisch.table.act('stand');
		const report = tisch.game.report;
		check(report.insurance.staked === erwarteteKosten && report.insurance.returned === 0,
			'T-8: ohne Geber-Blackjack zahlt die Versicherung 0', JSON.stringify(report.insurance));
		await tisch.bank.close();
	}

	console.log('     Gegenprobe T-8-G: zu kleiner Buy-in liefert "nocash", nichts verändert');
	{
		const karten = [K('5'), K('A'), K('6'), K('K')];
		await credit.reload();
		await credit.set(1_000_000);
		const tischG = await tischBauen({ key: 'bj_pruef_t8_g', shoe: new FakeShoe(karten) });
		await tischG.bank.buyIn(GRUNDEINSATZ); // keine Reserve für die Versicherung
		await legeGrundeinsatz(tischG, GRUNDEINSATZ);
		await tischG.table.deal();
		const handVorher = JSON.stringify(tischG.game.hands);
		const antwortG = await tischG.table.takeInsurance();
		check(antwortG.ok === false && antwortG.reason === 'nocash', 'T-8-G: takeInsurance() liefert "nocash"', JSON.stringify(antwortG));
		check(JSON.stringify(tischG.game.hands) === handVorher, 'T-8-G: die Karten sind unverändert');
		check(tischG.game.offers.insurance === true, 'T-8-G: die Versicherung wird weiterhin angeboten (die Ablehnung war Geldmangel, kein Zustandswechsel)');
		await tischG.bank.close();
	}
}

/* ============================================================================
   T-9 — Während der Runde nimmt der Tisch nichts an
   ============================================================================ */

console.log('\nT-9 — während der Runde nimmt der Tisch nichts an');
{
	// Die letzten beiden Karten sind der Nachzug des Gebers (2+3=5 → zieht
	// bis 17), fällig, weil die Runde am Ende dieses Blocks sauber mit
	// act('stand') zu Ende gebracht wird.
	const karten = [K('5'), K('2'), K('6'), K('3'), K('K'), K('2')];
	await credit.reload();
	await credit.set(1_000_000);
	const tisch = await tischBauen({ key: 'bj_pruef_t9', shoe: new FakeShoe(karten) });
	await tisch.bank.buyIn(1000);
	await legeGrundeinsatz(tisch, rules.BET_MIN);
	await tisch.table.deal();
	check(tisch.round.state === 'laeuft', 'T-9: der Tisch ist während der Runde gesperrt (round.state === "laeuft")');

	const platzierung = tisch.bets.place(BOX_FIELD_ID, 1);
	check(platzierung.ok === false && platzierung.reason === 'locked', 'T-9: bets.place() liefert "locked"');

	const cashout = await tisch.bank.cashOut();
	check(cashout.ok === false && cashout.reason === 'staked', 'T-9: bank.cashOut() liefert "staked"');

	const zweitesDeal = await tisch.table.deal();
	check(zweitesDeal.ok === false && zweitesDeal.reason === 'state', 'T-9: ein zweiter deal() liefert "state"');

	await tisch.table.act('stand'); // Runde sauber zu Ende bringen
	await tisch.bank.close();
}

/* ============================================================================
   T-11 — Die Summe der Einsätze auf dem Tisch stimmt mit dem Bericht überein
   ============================================================================ */

console.log('\nT-11 — die Summe der Einsätze stimmt mit dem Bericht überein');
{
	// Dieselbe Rechnung wie view-blackjack.js: Setzkreis + Σ(nachgelegt) +
	// Versicherung === report.staked. Geprüft an einer Runde mit Teilung UND
	// Versicherung zugleich: ein Paar Asse (teilbar, da beide Wert 11 haben),
	// Geber zeigt ein Ass, aber OHNE Geber-Blackjack (verdeckte Karte 7, kein
	// Zehnerwert), damit die Runde nicht sofort endet.
	const GRUNDEINSATZ = 100;
	const karten = [
		K('A', 'S'), K('A', 'H'), K('A', 'D'), K('7', 'H'), // p=[A,A], d=[A(offen),7(verdeckt)]
		K('2', 'H'), K('3', 'H'), // je Ass genau eine automatisch nachgelegte Karte
	];
	await credit.reload();
	await credit.set(1_000_000);
	const tisch = await tischBauen({ key: 'bj_pruef_t11', shoe: new FakeShoe(karten) });
	await tisch.bank.buyIn(GRUNDEINSATZ * 4);
	await legeGrundeinsatz(tisch, GRUNDEINSATZ);
	await tisch.table.deal();
	check(tisch.game.offers.insurance === true, 'T-11: der Geber zeigt ein Ass, Versicherung wird angeboten');
	await tisch.table.takeInsurance();
	check(tisch.table.state === 'spieler', 'T-11: ohne Geber-Blackjack geht es weiter');
	check(tisch.table.legalActions().includes('split'), 'T-11: das Paar Asse ist teilbar');
	await tisch.table.act('split'); // je Ass genau eine automatisch nachgelegte Karte, sofort fertig
	check(tisch.table.state === 'fertig' || tisch.table.state === 'geber', 'T-11: geteilte Asse sind sofort fertig');
	// Der Geber muss noch spielen — bei 'geber'/'fertig' bereits synchron erledigt.
	const report = tisch.game.report;
	check(report !== null, 'T-11: die Runde ist zu Ende');

	const baseStake = tisch.table.baseStake;
	const summeNachgelegt = report.hands.reduce((summe, h, i) => summe + (h.stake - (i === 0 ? baseStake : 0)), 0);
	const gerechnet = baseStake + summeNachgelegt + report.insurance.staked;
	check(gerechnet === report.staked,
		`T-11: Setzkreis (${baseStake}) + Σnachgelegt (${summeNachgelegt}) + Versicherung (${report.insurance.staked}) === report.staked (${report.staked})`,
		JSON.stringify(report));
	await tisch.bank.close();
}

/* ============================================================================
   T-12 — Der Nachlegeweg trifft jeden Betrag
   ============================================================================ */

console.log('\nT-12 — der Nachlegeweg (_stakeAmount) trifft jeden Betrag von 1 bis BET_MAX');
{
	/**
	 * Baut das Rack in einer bestimmten Zusammensetzung auf, über
	 * ausschließlich öffentliche Bank-Methoden (buyIn + exchangeDown).
	 * @param {Object} bank @param {number} betrag @param {number} grenze
	 *   Chips über `grenze` werden so lange heruntergewechselt, bis nur noch
	 *   `grenze` und kleinere Werte übrig sind.
	 */
	async function fuelleRack(bank, betrag, grenze) {
		await bank.buyIn(betrag);
		const ueberGrenze = CHIP_VALUES.filter((w) => w > grenze);
		let geaendert = true;
		while (geaendert) {
			geaendert = false;
			for (const wert of ueberGrenze) {
				while (bank.rack.countOf(wert) > 0) {
					bank.exchangeDown(wert);
					geaendert = true;
				}
			}
		}
	}

	// name = Bezeichnung für die Ausgabe, schluesselteil = ASCII-Kurzform für
	// den Bank-Schlüssel (openMachineCredit() erlaubt nur Buchstaben, Ziffern,
	// Strich und Unterstrich — kein „ü").
	const ZUSAMMENSETZUNGEN = [
		['nur Einer', 'einer', (bank) => fuelleRack(bank, 1000, 1)],
		['nur Fünfer', 'fuenfer', (bank) => fuelleRack(bank, 1000, 5)],
		['nur Hunderter', 'hunderter', (bank) => fuelleRack(bank, 1000, 100)],
		['gemischt', 'gemischt', (bank) => bank.buyIn(1187)],
	];

	for (const [name, schluesselteil, aufbauen] of ZUSAMMENSETZUNGEN) {
		let fehlgeschlagenBei = null;
		for (let betrag = 1; betrag <= rules.BET_MAX; betrag++) {
			await credit.reload();
			await credit.set(1_000_000);
			const tisch = await tischBauen({ key: `bj_pruef_t12_${schluesselteil}_${betrag}`, shoe: new FakeShoe([]) });
			await aufbauen(tisch.bank);
			const vorherAmount = tisch.bank.amount;
			const antwort = await tisch.table._stakeAmount(betrag);
			const stimmtAmount = tisch.bank.amount === vorherAmount - betrag;
			const stimmtInvariante = tisch.bank.rack.total === tisch.bank.amount;
			if (fehlgeschlagenBei === null && (!antwort.ok || !stimmtAmount || !stimmtInvariante)) {
				fehlgeschlagenBei = `Betrag ${betrag} (${name}): ok=${antwort.ok}, amount vorher=${vorherAmount}, nachher=${tisch.bank.amount}, rack.total=${tisch.bank.rack.total}`;
			}
			await tisch.bank.close();
		}
		check(fehlgeschlagenBei === null, `${name}: jeder Betrag von 1 bis ${rules.BET_MAX} wird exakt gelegt`, fehlgeschlagenBei ?? '');
	}

	console.log('     Gegenprobe T-12-G: ein Betrag über dem Buy-in liefert "nocash", Rack und staked unverändert');
	await credit.reload();
	await credit.set(1_000_000);
	const tischG = await tischBauen({ key: 'bj_pruef_t12_g', shoe: new FakeShoe([]) });
	await tischG.bank.buyIn(50);
	const rackVorher = tischG.bank.rack.total;
	const stakedVorher = tischG.bank.staked;
	const antwortG = await tischG.table._stakeAmount(100);
	check(antwortG.ok === false && antwortG.reason === 'nocash', 'T-12-G: _stakeAmount(100) bei Buy-in 50 liefert "nocash"', JSON.stringify(antwortG));
	check(tischG.bank.rack.total === rackVorher, 'T-12-G: das Rack ist unverändert');
	check(tischG.bank.staked === stakedVorher, 'T-12-G: bank.staked ist unverändert');
	await tischG.bank.close();
}

/* ============================================================================
   T-15 — Beim Verlassen der Seite bleibt nichts liegen
   ============================================================================ */

console.log('\nT-15 — beim Verlassen der Seite bleibt nichts liegen');
{
	console.log('     außerhalb einer Runde: der Buy-in wandert vollständig zurück in die Kasse');
	{
		await credit.reload();
		await credit.set(1_000_000);
		const tisch = await tischBauen({ key: 'bj_pruef_t15_ruhig', shoe: new FakeShoe([]) });
		await tisch.bank.buyIn(250);
		const kasseVorher = credit.balance;
		const buyInVorher = tisch.bank.amount;
		await tisch.bank.close();
		check(credit.balance === kasseVorher + buyInVorher, 'T-15: die Kasse wächst um genau den Buy-in');
		check(tisch.bank.rack.total === 0, 'T-15: das Rack ist leer');
		check(tisch.bank.amount === 0, 'T-15: kein negativer oder übrig gebliebener Buy-in');
	}

	console.log('     mitten in einer laufenden Hand: der liegende Einsatz verfällt, kein Minusstand entsteht');
	{
		const karten = [K('5'), K('2'), K('6'), K('3')];
		await credit.reload();
		await credit.set(1_000_000);
		const tisch = await tischBauen({ key: 'bj_pruef_t15_mitten', shoe: new FakeShoe(karten) });
		await tisch.bank.buyIn(1000);
		await legeGrundeinsatz(tisch, rules.BET_MIN);
		await tisch.table.deal();
		const kasseVorher = credit.balance;
		const nichtGebuchterRest = tisch.bank.amount; // der UNVERSETZTE Rest des Buy-ins
		check(tisch.bank.hasStake === true, 'T-15: ein Einsatz liegt noch auf dem Tuch');
		await tisch.bank.close();
		check(credit.balance === kasseVorher + nichtGebuchterRest,
			'T-15: nur der nicht eingesetzte Rest wandert zurück — der liegende Einsatz verfällt (CONCEPT.md C.4)');
		check(credit.balance >= 0 && tisch.bank.amount === 0 && tisch.bank.rack.total === 0,
			'T-15: kein Minusstand, kein Rest im geschlossenen Tisch');
	}
}

/* ============================================================================
   T-16 — Es entsteht kein neuer Speicherschlüssel
   ============================================================================ */

console.log('\nT-16 — es entsteht kein neuer Speicherschlüssel');
{
	const erlaubtWaehrendDesLaufs = new Set([credit.STORAGE_KEY, ...geoeffneteSchluessel.map((k) => `casinoKunterbunt.machine.${k}`)]);
	// Zusätzlich: der Wechselbetrag-Nachweis (T-12) hat sehr viele eigene
	// Schlüssel geöffnet (einen je Betrag/Zusammensetzung) — auch die sind
	// erwartete Bankschlüssel dieses Laufs, kein Fund.
	const unbekannt = [...cells.keys()].filter((schluessel) => !erlaubtWaehrendDesLaufs.has(schluessel) && schluessel !== 'casinoKunterbunt.probe');
	check(unbekannt.length === 0, 'jeder während des Laufs entstandene Speicherschlüssel gehört zur Kasse oder zu einer geöffneten Bank', ...unbekannt);

	// Nach dem Schließen ALLER Bänke bleibt außer der Kasse nichts übrig —
	// jede geschlossene Bank entfernt ihren eigenen Spiegel (machine-credit.js,
	// writeMirror(): amount === 0 → removeItem).
	const nachAllenSchliessungen = [...cells.keys()];
	check(nachAllenSchliessungen.every((k) => k === credit.STORAGE_KEY),
		'nach dem Schließen aller Bänke bleibt nur die Kasse als Speicherschlüssel übrig',
		...nachAllenSchliessungen.filter((k) => k !== credit.STORAGE_KEY));
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden. Über tausende echt gespielte Runden'
	+ '\nstimmt die Bilanz zentgenau, die Rack-Invariante hält nach jedem Schritt,'
	+ '\nder Rundenablauf wird vollständig durchlaufen, gemischt wird ausschließlich'
	+ '\nzwischen zwei Runden und genau dann, wenn shouldReshuffle() es verlangt,'
	+ '\nder Geber zieht in jeder Runde genau nach dealerMustDraw(), Verdoppeln,'
	+ '\nTeilen und Versicherung legen genau den richtigen Betrag nach, der'
	+ '\nNachlegeweg trifft jeden Betrag von 1 bis zum Höchsteinsatz in jeder'
	+ '\ngeprüften Rack-Zusammensetzung, ein unzulässiger Einsatz und ein zu'
	+ '\nkleiner Buy-in werden abgewiesen, ohne dass etwas passiert, und beim'
	+ '\nVerlassen der Seite bleibt nichts liegen.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
