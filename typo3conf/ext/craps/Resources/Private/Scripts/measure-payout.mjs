/**
 * Craps – Auszahlungsmessung (der lange Messlauf)
 * ===================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * DIESES SKRIPT WIRD IN UMSETZUNGSSTÜCK C7f GEBAUT, ABER NICHT IN VOLLER
 * LÄNGE GEFAHREN — lange Messläufe gehören nicht in einen Agentenlauf
 * (DECISIONS.md 2026-09-04, hier auf Craps übertragen). Der Agentenlauf
 * liefert das Werkzeug und einen kurzen Selbsttest (--rounds=2000); das
 * Warten und das Auswerten des vollen Laufs übernimmt die Hauptsitzung:
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-payout.mjs \
 *       --rounds=500000 --seed=20260907
 *
 * Beide Argumente haben einen Vorgabewert: --rounds=500000, --seed=1.
 * --rounds unter 500.000 wird angenommen, aber im Bericht ausdrücklich als
 * „unter dem geforderten Umfang" gekennzeichnet.
 *
 * Rückgabewert 0, wenn Bilanz UND alle Rückflussquoten innerhalb der
 * Toleranz liegen; 1 sonst.
 *
 *
 * WAS DIESES SKRIPT MISST, UND WAS ES NICHT MISST
 * ----------------------------------------------------
 * Der rechnerische Quotennachweis steht bereits unabhängig fest — B-9/B-10 in
 * verify-bets.mjs (aus den 36 Würfelpaaren) UND W-15 in verify-wagers.mjs (am
 * echten Zustandswerk), zwei unabhängige Herleitungen. DIESES Skript ist die
 * GEGENPROBE ZUR VERDRAHTUNG: es spielt echte Würfe über CrapsRound,
 * CrapsWagers, table-bets.js und table-buyin.js und prüft, ob die tatsächlich
 * gemessene Rückflussquote je Wettart der rechnerischen entspricht. Weicht
 * die Messung ab, ist die VERDRAHTUNG falsch, nicht die Tabelle.
 *
 * Die BILANZ (Block 1) ist keine Statistik, sondern eine Buchungsidentität:
 * Kasse + Buy-in + liegender Einsatz ändert sich bei jedem payout() um genau
 * (returned − sweptStake). Über den ganzen Lauf aufsummiert muss die
 * tatsächliche Änderung dieser drei Größen deshalb EXAKT der Summe aller
 * (Rückgabe − aufgelöster Einsatz) entsprechen — auf den Euro genau.
 *
 *
 * DIE WÜRFEL: ECHTE PHYSIK, KEINE NACHBILDUNG
 * ---------------------------------------------
 * Ein einziges DiceTable-Objekt für den ganzen Lauf (new DiceTable({random}))
 * mit createSeeded(seed) — nie drawUint32, damit der Lauf auf jeder Maschine
 * dieselbe Zahl liefert. Ein Wurf läuft über wurfBisGueltig() aus
 * verify-physics.mjs (wortgleich importiert, nicht abgeschrieben — dieselbe
 * Wiederverwendung wie in measure-dice.mjs): sie wiederholt einen zu kurzen
 * Wurf genau wie das Spiel es täte (C.8.2), statt ihn stillschweigend zu
 * verwerfen. CrapsRound selbst bekommt einen Würfel-Stellvertreter
 * (dice: {throw: () => true}), weil der eigentliche Wurf HIER, außerhalb
 * ihrer Verantwortung, tatsächlich stattfindet — genau wie im echten Spiel
 * craps.js wirft und die Wanne erst später onRest() ruft.
 *
 *
 * DIE EINSATZSTRATEGIE — EIGENE AUSLEGUNG, NICHT WÖRTLICH AUS DEM PLANTEXT
 * ----------------------------------------------------------------------------
 * Der Plan (Abschnitt 4.29) nennt „je eine Place-, eine Field-, eine
 * Hardway- und eine Einmalwette" je Wurf. Craps unterscheidet sich von
 * Roulette aber gerade darin, dass die meisten Wetten NICHT jeden Wurf neu
 * gelegt werden dürfen (Pass Line nur beim Come-out, Come/Don't Come nur mit
 * stehendem Point, Odds nur hinter einer eigenen Grundwette) — ein cr eng
 * rotierendes "eine je Wurf" ließe viele Felder über weite Strecken leer.
 * Diese Fassung versucht stattdessen bei JEDEM Wurf ALLE Felder, die die
 * Regeln in diesem Zustand überhaupt zulassen (Pass/Don't Pass beim
 * Come-out; Come/Don't Come und ihre Odds mit stehendem Point; ALLE sechs
 * Place-Nummern, sofern gerade frei; Field und alle vier Hardways und alle
 * sechs Einmalwetten JEDEN Wurf, weil sie ohnehin nach jedem Wurf aufgelöst
 * werden) — jedes Feld, das schon eine Wette trägt (stakeOn > 0), wird
 * übersprungen, nie erhöht. Das deckt über 500.000 Würfe JEDE der Wettarten
 * mit reichlich Stichprobenumfang ab, bleibt weit unter ROUND_MAX (300 €
 * ohne Odds; die Summe aller Nicht-Odds-Versuche liegt bei rund 100 €) und
 * ist einfacher nachzuvollziehen als eine Rotation. → DECISIONS.md.
 *
 *
 * DAS GELD: NACHSCHUB GENAU DANN, WENN EIN CHIP FEHLT
 * -------------------------------------------------------
 * bank.placeChip(wert) verlangt einen ECHTEN Chip dieses Werts im Rack
 * (table-chips.js kennt nur 1, 5, 20, 25, 100 €). Statt das Rack vorab mit
 * einer geschätzten Menge zu bestücken, kauft placeGoverned() GENAU DANN
 * über bank.buyIn(wert) nach, wenn placeChip() 'nochip' meldet — bank.buyIn()
 * bewegt Kassengeld nach machineCredit UND füllt das Rack in einem Zug
 * (rack.fill(), zerlegt über breakDown()); für einen einzelnen Chipwert
 * (1, 5, 20 oder 25) liefert breakDown() IMMER genau einen Chip dieser
 * Sorte, also kein Umweg über exchangeDown() nötig. Das hält die Zahl
 * zusätzlicher bank.buyIn()-Aufrufe auf das tatsächlich Gebrauchte
 * beschränkt, statt eine geschätzte Menge auf Vorrat zu kaufen.
 *
 *
 * WARUM DIE 13 ZEILEN AUS B-9 STATT WÖRTLICH „22 WETTARTEN"
 * ---------------------------------------------------------------
 * Der Plantext (Abschnitt 4.29) spricht von 22 Wettarten. verify-bets.mjs,
 * B-9 — der bereits bestehende, geprüfte rechnerische Nachweis — gliedert
 * Anhang H stattdessen in 12 benannte Gruppen (21 Feldkennungen, weil Paare
 * wie „Pass Line, Come" denselben Erwartungswert teilen) plus eine 13.
 * Zeile für ALLE Odds zusammen (deren Hausvorteil in jedem Fall exakt 0
 * ist, B-10). Diese Datei übernimmt GENAU diese bereits geprüfte Gliederung,
 * statt eine zweite, unabhängig erfundene 22er-Aufteilung einzuführen, die
 * an keiner Stelle nachgewiesen wäre. Jede der 47 Feldkennungen ist in genau
 * einer der 13 Zeilen enthalten. → DECISIONS.md.
 *
 * Die Odds-Zeile selbst mischt sechs Points mit UNTERSCHIEDLICHER Streuung
 * (die Staffel 3-4-5× ändert die Auszahlungshöhe je Point). Da der
 * Erwartungswert in JEDEM Fall exakt 0 ist (B-10), teilen alle sechs
 * Teilverteilungen denselben Mittelwert; die Varianz einer Mischung
 * gleichmittiger Verteilungen ist dann ihr GEWICHTETER MITTELWERT und damit
 * höchstens die GRÖSSTE Einzelvarianz. Die Toleranz der Odds-Zeile rechnet
 * deshalb bewusst mit dieser größten Einzelvarianz (Point 4/10, die
 * weiteste Staffelspreizung) — eine absichtlich weite, konservative
 * Schranke, keine geschätzte.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HIER = new URL('.', import.meta.url);
const CRAPS_JS_DIR = new URL('../../Public/JavaScript/', HIER);
const CASINO_JS_DIR = new URL('../../../../casino_startpage/Resources/Public/JavaScript/', HIER);

/** Ersetzt den Dezimalpunkt durch ein Komma — deutsche Zahlenschreibweise im Bericht. */
function de(zahl, nachkommastellen = 2) {
	return zahl.toFixed(nachkommastellen).replace('.', ',');
}

/** Liest --name=wert aus process.argv, mit Vorgabewert. */
function argument(name, vorgabe) {
	const praefix = `--${name}=`;
	const treffer = process.argv.find((a) => a.startsWith(praefix));
	if (treffer === undefined) {
		return vorgabe;
	}
	const wert = Number(treffer.slice(praefix.length));
	if (!Number.isFinite(wert)) {
		throw new RangeError(`--${name} muss eine Zahl sein (gefunden: "${treffer.slice(praefix.length)}")`);
	}
	return wert;
}

/**
 * Die Wege, mit denen 36 gleich wahrscheinliche Würfelpaare eine Summe
 * ergeben. Ausgeschrieben wie in verify-bets.mjs/verify-wagers.mjs — dieselbe
 * Tabelle, hier eigenständig abgeschrieben, weil dieses Skript keine der
 * beiden Prüfdateien importiert.
 */
const WAYS = Object.freeze({ 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 });
const POINTS = Object.freeze([4, 5, 6, 8, 9, 10]);

/* ----------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher — dasselbe Verfahren wie in
   verify-round.mjs und roulette/…/measure-payout.mjs.
   ---------------------------------------------------------------------------- */

const cells = new Map();
const storageListeners = [];
globalThis.localStorage = {
	getItem(key) { return cells.has(key) ? cells.get(key) : null; },
	setItem(key, value) { cells.set(key, String(value)); },
	removeItem(key) { cells.delete(key); },
	clear() { cells.clear(); },
	key(index) { return [...cells.keys()][index] ?? null; },
	get length() { return cells.size; },
};
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

/* ==========================================================================
   Die Erwartungswert-Verteilungen je Gruppe aus Anhang H (siehe Dateikopf)
   ========================================================================== */

/**
 * Aus {pWin, pPush, X} (X = Auszahlungsverhältnis "X : 1") den Erwartungswert
 * UND das zweite Moment der Rückflussquote R = zurück / Einsatz herleiten.
 * R ist (1+X) im Gewinnfall, 1 im Patt, 0 im Verlustfall.
 * @param {{pWin: number, pPush: number, X: number}} verteilung
 * @returns {{eR: number, eR2: number}}
 */
function ausVerteilung({ pWin, pPush, X }) {
	const eR = pWin * (1 + X) + pPush * 1;
	const eR2 = pWin * (1 + X) * (1 + X) + pPush * 1;
	return { eR, eR2 };
}

/** Pass/Come (dunkel=false) bzw. Don't Pass/Don't Come (dunkel=true). */
function linie(dunkel) {
	let pWin = 0;
	let pPush = 0;
	if (!dunkel) {
		pWin += (WAYS[7] + WAYS[11]) / 36;
	} else {
		pWin += (WAYS[2] + WAYS[3]) / 36;
		pPush += WAYS[12] / 36;
	}
	for (const p of POINTS) {
		const np = WAYS[p];
		const pEstablish = np / 36;
		const pMache = np / (np + 6);
		const pSieben = 6 / (np + 6);
		pWin += pEstablish * (dunkel ? pSieben : pMache);
	}
	return { pWin, pPush, X: 1 };
}

/** Eine Place-Wette auf Punkt n. */
function platz(n, ratioNum, ratioDen) {
	const np = WAYS[n];
	return { pWin: np / (np + 6), pPush: 0, X: ratioNum / ratioDen };
}

/** Eine Hardway-Wette auf Punkt n. */
function hardway(n, ratioNum, ratioDen) {
	const leichtWege = { 4: 2, 6: 4, 8: 4, 10: 2 }[n];
	const gesamt = 1 + leichtWege + 6;
	return { pWin: 1 / gesamt, pPush: 0, X: ratioNum / ratioDen };
}

/** Eine Einmalwette mit fester Quote, die auf genau den angegebenen Summen gewinnt. */
function einmal(gewinnSummen, ratioNum, ratioDen) {
	const pWin = gewinnSummen.reduce((summe, s) => summe + WAYS[s], 0) / 36;
	return { pWin, pPush: 0, X: ratioNum / ratioDen };
}

/** Odds hinter der Linie/einer Come-Zahl, Punkt n, hell oder dunkel. */
function odds(n, dark, ratioNum, ratioDen) {
	const np = WAYS[n];
	return { pWin: dark ? 6 / (np + 6) : np / (np + 6), pPush: 0, X: ratioNum / ratioDen };
}

/**
 * Baut die 13 Berichtsgruppen. Die Quoten (RATIO) kommen als Argumente herein
 * (aus bets-craps.js, siehe main()) statt hier ein zweites Mal abgeschrieben
 * zu werden — nur die WAHRSCHEINLICHKEITEN sind eigenständig hergeleitet.
 * @param {object} RATIO aus bets-craps.js
 * @returns {Array<{name: string, ids: string[], dist: {eR:number, eR2:number}}>}
 */
function baueGruppen(RATIO) {
	const feld = (s) => (s === 2 ? RATIO.fieldTwo : s === 12 ? RATIO.fieldTwelve : RATIO.fieldPlain);

	/** Field ist eine Mischung mit UNTERSCHIEDLICHEN Quoten je Summe — direkt über alle elf Summen gerechnet, kein (pWin,X)-Paar. */
	function feldVerteilung() {
		let eR = 0;
		let eR2 = 0;
		for (let s = 2; s <= 12; s++) {
			const p = WAYS[s] / 36;
			const gewinnt = [2, 3, 4, 9, 10, 11, 12].includes(s);
			const R = gewinnt ? 1 + feld(s).num / feld(s).den : 0;
			eR += p * R;
			eR2 += p * R * R;
		}
		return { eR, eR2 };
	}

	return [
		// "come" wandert bei einem Punktwurf auf come-N (applyReport() benennt
		// die Platzierung dabei um) — die spätere Auflösung (Gewinn auf N,
		// Verlust auf 7) wird dann unter come-N verbucht, nicht unter "come".
		// Ohne die sechs come-N/dont-come-N-Kennungen in dieser Gruppe würden
		// nur die SOFORT entschiedenen Come-Einsätze (Naturals/Craps) gezählt
		// — eine stark verzerrte, zu optimistische Teilmenge. Erst mit ihnen
		// misst diese Zeile denselben vollständigen Lebenszyklus, den
		// linie(dunkel) rechnet (siehe DECISIONS.md, Fund beim Selbsttest).
		{
			name: 'Pass Line, Come',
			ids: ['pass', 'come', ...POINTS.map((n) => `come-${n}`)],
			dist: ausVerteilung(linie(false)),
		},
		{
			name: "Don't Pass, Don't Come",
			ids: ['dont-pass', 'dont-come', ...POINTS.map((n) => `dont-come-${n}`)],
			dist: ausVerteilung(linie(true)),
		},
		{ name: 'Place 4, Place 10', ids: ['place-4', 'place-10'], dist: ausVerteilung(platz(4, RATIO.place[4].num, RATIO.place[4].den)) },
		{ name: 'Place 5, Place 9', ids: ['place-5', 'place-9'], dist: ausVerteilung(platz(5, RATIO.place[5].num, RATIO.place[5].den)) },
		{ name: 'Place 6, Place 8', ids: ['place-6', 'place-8'], dist: ausVerteilung(platz(6, RATIO.place[6].num, RATIO.place[6].den)) },
		{ name: 'Field', ids: ['field'], dist: feldVerteilung() },
		{ name: 'Hard 4, Hard 10', ids: ['hard-4', 'hard-10'], dist: ausVerteilung(hardway(4, RATIO.hard[4].num, RATIO.hard[4].den)) },
		{ name: 'Hard 6, Hard 8', ids: ['hard-6', 'hard-8'], dist: ausVerteilung(hardway(6, RATIO.hard[6].num, RATIO.hard[6].den)) },
		{ name: 'Any Seven', ids: ['any-seven'], dist: ausVerteilung(einmal([7], RATIO.anySeven.num, RATIO.anySeven.den)) },
		{ name: 'Any Craps', ids: ['any-craps'], dist: ausVerteilung(einmal([2, 3, 12], RATIO.anyCraps.num, RATIO.anyCraps.den)) },
		{ name: 'Die 2, Die 12', ids: ['two', 'twelve'], dist: ausVerteilung(einmal([2], RATIO.two.num, RATIO.two.den)) },
		{ name: 'Die 3, Die 11', ids: ['three', 'eleven'], dist: ausVerteilung(einmal([3], RATIO.three.num, RATIO.three.den)) },
		{
			name: 'Odds (hell und dunkel, alle Points)',
			ids: [
				'pass-odds', 'dont-pass-odds',
				...POINTS.map((n) => `come-odds-${n}`),
				...POINTS.map((n) => `dont-come-odds-${n}`),
			],
			// Siehe Dateikopf: größte Einzelvarianz unter den zwölf
			// Punkt/Seite-Kombinationen, als konservative (weite) Schranke.
			dist: (() => {
				const teile = [];
				for (const n of POINTS) {
					teile.push(ausVerteilung(odds(n, false, RATIO.oddsLight[n].num, RATIO.oddsLight[n].den)));
					teile.push(ausVerteilung(odds(n, true, RATIO.oddsDark[n].num, RATIO.oddsDark[n].den)));
				}
				const varianzen = teile.map((t) => t.eR2 - t.eR * t.eR);
				const groesste = teile[varianzen.indexOf(Math.max(...varianzen))];
				return groesste;
			})(),
		},
	];
}

/**
 * Die statistische Schranke einer Gruppe, in Prozentpunkten — dieselbe
 * Herleitung wie roulette/…/measure-payout.mjs, schwellenwertPunkte(): vier
 * Standardabweichungen der GEMESSENEN Rückflussquote bei der TATSÄCHLICHEN
 * Rundenzahl dieser Gruppe in DIESEM Lauf.
 * @param {{eR: number, eR2: number}} dist
 * @param {number} runden
 * @param {number} [sigma]
 * @returns {number}
 */
function schwellenwertPunkte(dist, runden, sigma = 4) {
	if (!(runden > 0)) {
		return Infinity;
	}
	const varianz = Math.max(0, dist.eR2 - dist.eR * dist.eR);
	const sdDerQuote = Math.sqrt(varianz / runden);
	return sigma * sdDerQuote * 100;
}

/* ==========================================================================
   main()
   ========================================================================== */

async function main() {
	const t0 = Date.now();

	const RUNS = argument('rounds', 500000);
	const SEED = argument('seed', 1);
	const MINDESTUMFANG = 500000;

	/* Die echten Module — dieselbe Patch-Technik wie in verify-round.mjs und roulette/…/measure-payout.mjs. */
	const machineUrl = new URL('machine-credit.js', CASINO_JS_DIR);
	const creditUrl = new URL('credit.js', CASINO_JS_DIR);
	const chipsUrl = new URL('table-chips.js', CASINO_JS_DIR);
	const buyinUrl = new URL('table-buyin.js', CASINO_JS_DIR);

	const machineSource = await readFile(fileURLToPath(machineUrl), 'utf8');
	const patchedMachine = machineSource.replaceAll(
		"'@phomo17/casino-startpage/credit.js'",
		JSON.stringify(creditUrl.href)
	);
	const machineDataUrl = `data:text/javascript;base64,${Buffer.from(patchedMachine, 'utf8').toString('base64')}`;

	const buyinSource = await readFile(fileURLToPath(buyinUrl), 'utf8');
	const patchedBuyin = buyinSource
		.replaceAll("'@phomo17/casino-startpage/machine-credit.js'", JSON.stringify(machineDataUrl))
		.replaceAll("'@phomo17/casino-startpage/table-chips.js'", JSON.stringify(chipsUrl.href));

	const { credit } = await import(creditUrl.href);
	const { openTableBank } = await import(
		`data:text/javascript;base64,${Buffer.from(patchedBuyin, 'utf8').toString('base64')}`
	);
	const { BetTable } = await import(new URL('table-bets.js', CASINO_JS_DIR).href);
	const { TableRound } = await import(new URL('table-round.js', CASINO_JS_DIR).href);

	const { FIELDS, ROUND_MAX, RATIO, ratioFor, oddsMax, payout, stakeUnit } = await import(new URL('bets-craps.js', CRAPS_JS_DIR).href);
	const { CrapsWagers } = await import(new URL('wagers-craps.js', CRAPS_JS_DIR).href);
	const { CrapsRound } = await import(new URL('round-craps.js', CRAPS_JS_DIR).href);
	const { DiceTable } = await import(new URL('dice-physics.js', CRAPS_JS_DIR).href);
	const { createSeeded } = await import(new URL('rng.js', CRAPS_JS_DIR).href);
	const { wurfBisGueltig } = await import(new URL('verify-physics.mjs', HIER).href);

	console.log('\nCraps – Auszahlungsmessung (der lange Messlauf)');
	console.log('===================================================\n');
	console.log(`Umfang            ${RUNS} Würfe${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG (mindestens 500.000)' : ''}`);
	console.log(`Saat              ${SEED}\n`);

	await credit.reload();
	await credit.set(999999999);

	const bank = openTableBank('craps_messung');
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const round = new TableRound();
	const wagers = new CrapsWagers({ ratioFor, oddsMax, payout });

	let letzterReport = null;
	let letzterCredited = null;
	const game = new CrapsRound({
		round, bets, bank,
		dice: { throw: () => true },
		wagers,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		placeWorking: () => true,
		onResult: ({ report, credited }) => { letzterReport = report; letzterCredited = credited; },
	});

	const tisch = new DiceTable({ random: createSeeded(SEED) });

	/* -------------------------------------------- Setzen: Regelprüfung + Buchung */

	/** Was gerade auf welchem Feld liegt. @returns {Object<string, number>} */
	function aktuelleEinsaetze() {
		const stand = {};
		for (const f of FIELDS) {
			const wert = bets.stakeOn(f.id);
			if (wert > 0) {
				stand[f.id] = wert;
			}
		}
		return stand;
	}

	/**
	 * Legt EINEN Chip — Regelprüfung, dann Buchung; kauft GENAU DANN einen
	 * einzelnen Chip dieses Werts nach, wenn keiner im Rack liegt (siehe
	 * Dateikopf). Rollt bei einer Bankabsage die Setzfläche zurück.
	 * @returns {Promise<{ok: boolean, reason?: string}>}
	 */
	async function placeGoverned(fieldId, value) {
		const urteil = wagers.mayPlace(fieldId, value, aktuelleEinsaetze());
		if (urteil.ok !== true) {
			return urteil;
		}
		const versuch = bets.place(fieldId, value);
		if (!versuch.ok) {
			return versuch;
		}
		let gebucht = await bank.placeChip(value);
		if (!gebucht.ok && gebucht.reason === 'nochip') {
			await bank.buyIn(value);
			gebucht = await bank.placeChip(value);
		}
		if (!gebucht.ok) {
			bets.takeBack(fieldId);
			return gebucht;
		}
		return { ok: true };
	}

	/**
	 * Legt einen Betrag über echte Chips (größte zuerst, wie ein Spieler es
	 * über mehrere Klicks täte) — dieselbe Zerlegung wie placeAmount() in
	 * verify-round.mjs, hier ohne dessen breakDown()-Import, weil ein
	 * Odds-Höchstbetrag an diesem Tisch immer ein Vielfaches von 5 ist
	 * (LINE_MAX 100, ODDS_MULT 3/4/5) — eine feste Chip-Reihe genügt.
	 * @returns {Promise<{ok: boolean, reason?: string}>}
	 */
	async function placeAmount(fieldId, amount) {
		if (!Number.isInteger(amount) || amount <= 0) {
			return { ok: false, reason: 'value' };
		}
		let rest = amount;
		for (const wert of [100, 25, 20, 5, 1]) {
			while (rest >= wert) {
				const ergebnis = await placeGoverned(fieldId, wert);
				if (!ergebnis.ok) {
					return ergebnis;
				}
				rest -= wert;
			}
		}
		return { ok: true };
	}

	/** Setzt vor JEDEM Wurf alles, was die Regeln in diesem Zustand zulassen (siehe Dateikopf). @returns {Promise<void>} */
	async function setzeVorDemWurf() {
		const point = wagers.point;
		if (point === null) {
			if (bets.stakeOn('pass') === 0) { await placeAmount('pass', 5); }
			if (bets.stakeOn('dont-pass') === 0) { await placeAmount('dont-pass', 5); }
		} else {
			if (bets.stakeOn('come') === 0) { await placeAmount('come', 5); }
			if (bets.stakeOn('dont-come') === 0) { await placeAmount('dont-come', 5); }
			const passStake = bets.stakeOn('pass');
			if (passStake > 0 && bets.stakeOn('pass-odds') === 0) {
				await placeAmount('pass-odds', oddsMax(point, passStake, false));
			}
			const dpStake = bets.stakeOn('dont-pass');
			if (dpStake > 0 && bets.stakeOn('dont-pass-odds') === 0) {
				await placeAmount('dont-pass-odds', oddsMax(point, dpStake, true));
			}
			for (const n of POINTS) {
				const cStake = bets.stakeOn(`come-${n}`);
				if (cStake > 0 && bets.stakeOn(`come-odds-${n}`) === 0) {
					await placeAmount(`come-odds-${n}`, oddsMax(n, cStake, false));
				}
				const dcStake = bets.stakeOn(`dont-come-${n}`);
				if (dcStake > 0 && bets.stakeOn(`dont-come-odds-${n}`) === 0) {
					await placeAmount(`dont-come-odds-${n}`, oddsMax(n, dcStake, true));
				}
			}
		}
		for (const n of POINTS) {
			if (bets.stakeOn(`place-${n}`) === 0) {
				await placeAmount(`place-${n}`, stakeUnit(`place-${n}`));
			}
		}
		if (bets.stakeOn('field') === 0) { await placeAmount('field', 5); }
		for (const n of [4, 6, 8, 10]) {
			if (bets.stakeOn(`hard-${n}`) === 0) { await placeAmount(`hard-${n}`, 5); }
		}
		for (const id of ['any-seven', 'any-craps', 'two', 'three', 'eleven', 'twelve']) {
			if (bets.stakeOn(id) === 0) { await placeAmount(id, 5); }
		}
	}

	/* --------------------------------------------------------- Der Lauf */

	/** @type {Map<string, {staked: number, returned: number, rounds: number}>} */
	const perField = new Map();
	let gesamtStaked = 0;
	let gesamtReturned = 0;

	const comeoutCounts = { natural: 0, craps: 0, 'point-set': 0 };
	let comeoutTotal = 0;
	const pointPhaseCounts = { 'point-made': 0, 'seven-out': 0, roll: 0 };
	let pointPhaseTotal = 0;

	const bilanzVorher = credit.balance + bank.amount + bets.total;

	const FORTSCHRITT_ALLE = 25000;
	let geworfen = 0;

	for (let i = 0; i < RUNS; i++) {
		await setzeVorDemWurf();

		const start = game.start(null);
		if (!start.ok) {
			// Kann praktisch nur 'nostake' sein, wenn selbst der 5-€-Pass-Chip
			// nicht gebucht werden konnte — bei einer Kasse von 999999999 €
			// nicht zu erwarten, wird aber nicht stillschweigend übergangen.
			continue;
		}

		const { faces, sum } = wurfBisGueltig(tisch, null);
		letzterReport = null;
		letzterCredited = null;
		await game.onRest({ faces, sum, valid: true });
		if (!letzterReport) {
			continue;
		}
		geworfen += 1;

		for (const f of letzterReport.fields) {
			if (f.outcome !== 'win' && f.outcome !== 'loss' && f.outcome !== 'push') {
				continue;
			}
			const eintrag = perField.get(f.fieldId) ?? { staked: 0, returned: 0, rounds: 0 };
			eintrag.staked += f.staked;
			eintrag.returned += f.returned;
			eintrag.rounds += 1;
			perField.set(f.fieldId, eintrag);
		}
		gesamtStaked += letzterReport.total;
		gesamtReturned += letzterReport.payout;

		if (letzterReport.previousPoint === null) {
			comeoutTotal += 1;
			if (letzterReport.event in comeoutCounts) {
				comeoutCounts[letzterReport.event] += 1;
			}
		} else {
			pointPhaseTotal += 1;
			if (letzterReport.event in pointPhaseCounts) {
				pointPhaseCounts[letzterReport.event] += 1;
			}
		}

		if ((i + 1) % FORTSCHRITT_ALLE === 0) {
			const jetzt = Date.now();
			const vergangenSek = (jetzt - t0) / 1000;
			const proWurfMs = (jetzt - t0) / (i + 1);
			const restWuerfe = RUNS - (i + 1);
			const hochrechnungSek = (restWuerfe * proWurfMs) / 1000;
			console.log(
				`  … ${i + 1} / ${RUNS} Würfe`
				+ `  (${de(vergangenSek, 1)} s vergangen,`
				+ ` Hochrechnung Rest: ${de(hochrechnungSek, 1)} s,`
				+ ` gesamt rund ${de(vergangenSek + hochrechnungSek, 1)} s)`
			);
		}
	}

	const bilanzNachher = credit.balance + bank.amount + bets.total;
	const bilanzDelta = bilanzNachher - bilanzVorher;
	const erwarteteBilanzDelta = gesamtReturned - gesamtStaked;
	const bilanzStimmt = bilanzDelta === erwarteteBilanzDelta;

	console.log('\n--- Bericht ---\n');
	console.log(`Umfang            ${RUNS} Würfe${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG' : ''}`);
	console.log(`Tatsächlich gewertet (nicht abgebrochen): ${geworfen}`);
	console.log(`Saat              ${SEED}`);
	console.log(`Gesamteinsatz     ${gesamtStaked} €`);
	console.log(`Gesamtrückfluss   ${gesamtReturned} €`);
	console.log(`Bilanz            ${bilanzStimmt ? 'STIMMT — auf den Euro' : 'STIMMT NICHT'} (tatsächliches Delta ${bilanzDelta}, erwartet ${erwarteteBilanzDelta})`);

	console.log('\nBlock 2 — Rückflussquote je Wettart (13 Zeilen aus Anhang H/B-9, siehe Dateikopf):');
	console.log('Schranke = 4 × Standardabweichung DIESER Zeile bei DIESER tatsächlichen Rundenzahl.\n');
	const GRUPPEN = baueGruppen(RATIO);
	let alleQuotenInToleranz = true;
	for (const gruppe of GRUPPEN) {
		let staked = 0;
		let returned = 0;
		let rounds = 0;
		for (const id of gruppe.ids) {
			const eintrag = perField.get(id);
			if (!eintrag) {
				continue;
			}
			staked += eintrag.staked;
			returned += eintrag.returned;
			rounds += eintrag.rounds;
		}
		const gemesseneQuote = staked > 0 ? returned / staked : 0;
		const erwartet = gruppe.dist.eR;
		const abweichungPunkte = (gemesseneQuote - erwartet) * 100;
		const schranke = schwellenwertPunkte(gruppe.dist, rounds);
		const inToleranz = Math.abs(abweichungPunkte) <= schranke;
		if (!inToleranz) {
			alleQuotenInToleranz = false;
		}
		console.log(
			`  ${gruppe.name.padEnd(32, ' ')} ${String(rounds).padStart(7, ' ')} Runden   `
			+ `gemessen ${de(gemesseneQuote * 100, 2)} %   erwartet ${de(erwartet * 100, 2)} %   `
			+ `Abweichung ${abweichungPunkte >= 0 ? '+' : ''}${de(abweichungPunkte, 2)} Punkte   `
			+ `Schranke ±${de(schranke, 2)} Punkte`
			+ `   ${inToleranz ? 'in Toleranz' : 'AUSSERHALB DER TOLERANZ'}`
		);
	}

	console.log('\nBlock 3 — Der Punktverlauf (reiner Beleg, keine Prüfgröße):');
	console.log(`  Come-out-Würfe insgesamt: ${comeoutTotal}`);
	for (const [ereignis, erwartetesVerhaeltnis] of [['natural', 8 / 36], ['craps', 4 / 36], ['point-set', 24 / 36]]) {
		const anzahl = comeoutCounts[ereignis] ?? 0;
		const gemessen = comeoutTotal > 0 ? anzahl / comeoutTotal : 0;
		console.log(`    ${ereignis.padEnd(10, ' ')} ${String(anzahl).padStart(7, ' ')}   gemessen ${de(gemessen * 100, 2)} %   rechnerisch ${de(erwartetesVerhaeltnis * 100, 2)} %`);
	}
	console.log(`  Würfe mit stehendem Point insgesamt: ${pointPhaseTotal}`);
	for (const ereignis of ['point-made', 'seven-out', 'roll']) {
		const anzahl = pointPhaseCounts[ereignis] ?? 0;
		const gemessen = pointPhaseTotal > 0 ? anzahl / pointPhaseTotal : 0;
		console.log(`    ${ereignis.padEnd(10, ' ')} ${String(anzahl).padStart(7, ' ')}   gemessen ${de(gemessen * 100, 2)} %   (je Point unterschiedlich, siehe Anhang H)`);
	}

	await bank.close();

	const bestanden = bilanzStimmt && alleQuotenInToleranz;
	const gesamtSekunden = (Date.now() - t0) / 1000;
	console.log(`\nGesamtlaufzeit: ${de(gesamtSekunden, 1)} s`);
	console.log(`\nERGEBNIS: ${bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Rückgabewert ${bestanden ? 0 : 1}).`);
	if (!bestanden) {
		console.log('Weicht eine Quote ab, obwohl B-9/B-10 (verify-bets.mjs) und W-15');
		console.log('(verify-wagers.mjs) die Tabelle rechnerisch bestätigen, ist die VERDRAHTUNG');
		console.log('falsch (round-craps.js, wagers-craps.js, table-bets.js oder table-buyin.js),');
		console.log('nicht die Auszahlungstabelle selbst.');
	}

	process.exit(bestanden ? 0 : 1);
}

const DIESE_DATEI = fileURLToPath(import.meta.url);
if (process.argv[1] === DIESE_DATEI) {
	await main();
}
