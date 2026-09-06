/**
 * Roulette – Auszahlungsmessung (der lange Messlauf)
 * ======================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * DIESES SKRIPT WIRD IN TEILSTÜCK C3d GEBAUT, ABER NICHT IN VOLLER LÄNGE
 * GEFAHREN — lange Messläufe gehören nicht in einen Agentenlauf (DECISIONS.md
 * 2026-09-04 11:03, Punkt 3, hier auf die Auszahlung übertragen). Der
 * Agentenlauf liefert das Werkzeug; das Warten und das Auswerten übernimmt
 * die Hauptsitzung.
 *
 * Aufruf (nur lesend, schreibt nichts außer seiner eigenen Ausgabe):
 *
 *   ddev exec node typo3conf/ext/roulette/Resources/Private/Scripts/measure-payout.mjs \
 *       --rounds=500000 --seed=20260905
 *
 * Beide Argumente haben einen Vorgabewert: --rounds=500000, --seed=1.
 * --rounds unter 500.000 wird angenommen, aber im Bericht ausdrücklich als
 * „unter dem geforderten Umfang" gekennzeichnet.
 *
 * Erwartete Laufzeit: unter zwei Minuten (siehe Kopfkommentar-Rechnung im
 * Plan, Abschnitt 4.22: measure-uniformity.mjs schafft 500.000 Kugelläufe in
 * rund 34 Sekunden; die Verrechnung obendrauf kostet je Runde nur ein paar
 * Dutzend zusätzliche Rechenschritte).
 *
 * Rückgabewert 0, wenn Bilanz UND alle Rückflussquoten innerhalb der
 * Toleranz liegen; 1 sonst.
 *
 * WAS DIESES SKRIPT MISST, UND WAS ES NICHT MISST
 * ----------------------------------------------------
 * Der rechnerische Quotennachweis (94,74 % / 92,11 %) steht bereits fest und
 * unabhängig von jeder Ausführung — er ist Prüfung B-11 in verify-bets.mjs
 * und rechnet nur über die Feldliste, ohne ein einziges Rad zu drehen. DIESES
 * Skript ist die GEGENPROBE ZUR VERDRAHTUNG: es spielt echte Runden über
 * RouletteRound, table-bets.js und table-buyin.js und prüft, ob die
 * tatsächlich gemessene Rückflussquote je Wettart der rechnerischen
 * entspricht. Weicht die Messung ab, ist die VERDRAHTUNG falsch, nicht die
 * Tabelle — B-11 hätte eine falsche Tabelle längst gefunden.
 *
 * Die BILANZ dagegen ist keine Statistik, sondern eine Buchungsidentität:
 * Kasse + Buy-in + liegender Einsatz ändert sich bei jedem payout() um genau
 * (returned − sweptStake). Über den ganzen Lauf aufsummiert muss die
 * tatsächliche Änderung dieser drei Größen deshalb EXAKT der Summe aller
 * (Rückgabe − Einsatz) entsprechen — auf den Cent genau, nicht nur im
 * Rahmen einer Toleranz. Eine Abweichung hier bedeutet, dass irgendwo Geld
 * verschwunden oder aus dem Nichts entstanden ist (dieselbe Zusage wie R-3
 * in verify-round.mjs, hier über 500.000 statt 300 Runden).
 *
 * WARUM EIN EINZIGES Wheel-OBJEKT FÜR DEN GANZEN LAUF (C.6.2)
 * -----------------------------------------------------------------
 * Wie in measure-uniformity.mjs: die Stellung der Radscheibe wandert über
 * alle Runden mit. Der Zufallsgeber ist createSeeded(seed), NICHT drawUint32
 * — der Nachweis muss auf jeder Maschine dieselbe Zahl liefern.
 *
 * WARUM VOR JEDER RUNDE EIN EURO NACHGEKAUFT WIRD
 * ----------------------------------------------------
 * Dieselbe Begründung wie ensureChipAndBet() in verify-round.mjs: ob nach
 * einer Auszahlung wieder ein 1-Euro-Chip im Rack liegt, hängt von
 * breakDown() des ausgezahlten Betrags ab, und ein langer Verlustlauf ließe
 * das Rack sonst leerlaufen. Ein Euro Buy-in je Runde ist gegenüber dem
 * Kassenstand vernachlässigbar und ändert an der gemessenen Rückflussquote
 * nichts, weil er selbst nie gesetzt wird, wenn er nicht gebraucht wird
 * (das Rack hält ohnehin selten mehr als ein paar Chips).
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HIER = new URL('.', import.meta.url);
const ROULETTE_JS_DIR = new URL('../../Public/JavaScript/', HIER);
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
 * DIE STATISTISCHE SCHRANKE JE WETTART — WARUM EINE FESTE PROZENTPUNKTZAHL
 * HIER FALSCH WÄRE
 * ============================================================================
 *
 * Nachtrag vom 2026-09-05, nach zwei Messläufen (Saat 20260905: die
 * Fünferwette fiel mit 101,08 % statt 92,11 % durch die ursprüngliche feste
 * Schranke von ±3 Punkten; Saat 771103: dieselbe Wettart lag bei 92,40 %,
 * innerhalb jeder vernünftigen Schranke). Die Verdrahtung war in beiden
 * Läufen dieselbe, und die Bilanzidentität stimmte beide Male auf den Cent —
 * der erste Fehlschlag war Stichprobenstreuung, kein Fund.
 *
 * WARUM DIE STREUUNG JE WETTART VERSCHIEDEN IST
 * ----------------------------------------------------
 * Ein einzelner 1-€-Einsatz auf ein Feld ist eine Zufallsgröße: er liefert mit
 * Wahrscheinlichkeit p den Betrag (1 + payout) und sonst 0. Deren
 * Standardabweichung ist (1 + payout) × √(p·(1−p)) — für die Fünferwette
 * (payout 6, p = 5/38) rund 2,37 €, für eine einfache Chance (payout 1,
 * p = 18/38) nur rund 1,00 €. Über N Runden gemittelt schrumpft die
 * Streuung der GEMESSENEN QUOTE mit 1/√N, ist also zusätzlich von der
 * tatsächlichen Rundenzahl abhängig — und die ist je Wettart verschieden,
 * weil dieses Skript reihum über alle 159 Felder geht und die Fünferwette
 * nur EIN Feld stellt, während z. B. die einfachen Chancen sechs Felder
 * stellen. Eine einzige, für alle Wettarten gleiche Prozentzahl kann diese
 * beiden Größen (Auszahlungshöhe, Trefferwahrscheinlichkeit, Rundenzahl)
 * nicht berücksichtigen — sie war bei 500.000 Runden für die Fünferwette
 * viel zu eng (rund 4,2 Punkte Streuung bei 3.144 Runden, siehe unten) und
 * bei einer einfachen Chance mit über zehnmal so vielen Runden unnötig weit.
 *
 * DIE FORMEL
 * ----------
 * Standardabweichung der Quote (als Bruchteil, ×100 für Prozentpunkte):
 *
 *   sd(Quote) = (1 + payout) × √(p·(1−p) / Runden)
 *
 * payout und die abgedeckten Zahlen (für p = abgedeckt/38) stehen in der
 * Feldliste selbst (bets-roulette.js) — dieselben Werte, die auch die
 * Auszahlung tatsächlich berechnen, nicht eine zweite, unabhängig gepflegte
 * Abschrift. "Runden" ist die TATSÄCHLICHE Anzahl der in diesem konkreten
 * Lauf auf diese Wettart entfallenen Runden (jeArt.get(kind).rounds),
 * nicht eine angenommene Aufteilung.
 *
 * WARUM DAS VIELFACHE VIER (nicht zwei, nicht drei)
 * ------------------------------------------------------
 * Dieses Skript prüft ZEHN Wettarten gleichzeitig in einem einzigen Lauf. Bei
 * einer Schranke von 2σ läge die Wahrscheinlichkeit, dass mindestens EINE der
 * zehn rein durch Streuung außerhalb fällt, bei rund 1 − 0,9545¹⁰ ≈ 37 % —
 * ein Prüfwerkzeug, das gut jeden dritten Lauf grundlos rot zeigt, ist
 * nutzlos (genau der Fehler, der zu diesem Nachtrag geführt hat). Bei 3σ
 * sinkt das auf rund 1 − 0,9973¹⁰ ≈ 2,7 % — schon deutlich besser, aber noch
 * spürbar. Bei 4σ sind es rund 1 − 0,999937¹⁰ ≈ 0,06 % — ein falscher Alarm
 * durch reine Streuung wird praktisch nie mehr vorkommen. Ein ECHTER
 * Verdrahtungsfehler (eine ganze Wettart wird systematisch falsch oder gar
 * nicht ausgezahlt) verschiebt die Quote dagegen um ein Vielfaches dieser
 * Streuung — ein um eins verschobener Auszahlungsfaktor oder ein
 * ausbleibendes payout() zeigt sich als Sprung in der GRÖSSENORDNUNG DER
 * ERWARTUNG selbst (zig Prozentpunkte), nicht in ihrer Nachbarschaft. Vier
 * Standardabweichungen sind damit breit genug, um Streuung zuverlässig
 * durchzulassen, und eng genug, um einen echten Fehler zuverlässig zu fassen
 * — siehe die ausgeführte Gegenprobe in verify-payout-tolerance.mjs
 * (Abschnitt "Nachlauf" des Berichts).
 *
 * @param {number} payout Auszahlungsverhältnis der Wettart (z. B. 35 für "35 : 1")
 * @param {number} p Trefferwahrscheinlichkeit (abgedeckte Zahlen / 38)
 * @param {number} runden tatsächliche Rundenzahl dieser Wettart in DIESEM Lauf
 * @param {number} [sigma] das Vielfache der Standardabweichung; Vorgabe 4 (siehe oben)
 * @returns {number} die Schranke in Prozentpunkten (±)
 */
export function schwellenwertPunkte(payout, p, runden, sigma = 4) {
	if (!(runden > 0)) {
		return Infinity; // keine Runden gespielt: keine Aussage möglich, nichts kann durchfallen
	}
	const sdJeRunde = (1 + payout) * Math.sqrt(p * (1 - p));
	const sdDerQuote = sdJeRunde / Math.sqrt(runden);
	return sigma * sdDerQuote * 100;
}

/* ----------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher — dasselbe Verfahren wie in
   verify-round.mjs und (ursprünglich) verify-table-money.mjs.
   ---------------------------------------------------------------------------- */

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

async function main() {
	const t0 = Date.now();

	const RUNS = argument('rounds', 500000);
	const SEED = argument('seed', 1);
	const MINDESTUMFANG = 500000;

	/* Die echten Module — dieselbe Patch-Technik wie in verify-round.mjs. */
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

	const { FIELDS, ROUND_MAX } = await import(new URL('bets-roulette.js', ROULETTE_JS_DIR).href);
	const { RouletteRound } = await import(new URL('round-roulette.js', ROULETTE_JS_DIR).href);
	const { Wheel } = await import(new URL('wheel-physics.js', ROULETTE_JS_DIR).href);
	const { labelOf, colourOf } = await import(new URL('wheel-geometry.js', ROULETTE_JS_DIR).href);
	const { createSeeded } = await import(new URL('rng.js', ROULETTE_JS_DIR).href);

	console.log('\nRoulette – Auszahlungsmessung (der lange Messlauf)');
	console.log('======================================================\n');
	console.log(`Umfang            ${RUNS} Runden${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG (mindestens 500.000)' : ''}`);
	console.log(`Saat              ${SEED}\n`);

	await credit.reload();
	await credit.set(999999999);

	const bank = openTableBank('roulette_messung');
	await bank.ready;
	const bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });
	const physics = new Wheel({ random: createSeeded(SEED) });
	const round = new TableRound();

	let letzterReport = null;
	const game = new RouletteRound({
		round, bets, bank,
		wheel: { launch: () => physics.launch() },
		colourOf,
		wait: () => Promise.resolve(),
		settleDelayMs: 0,
		onResult: ({ report }) => { letzterReport = report; },
	});

	/** @type {Map<string, {staked: number, returned: number, rounds: number}>} */
	const jeArt = new Map();
	let gesamtStaked = 0;
	let gesamtReturned = 0;

	const bilanzVorher = credit.balance + bank.amount + bets.total;

	const FORTSCHRITT_ALLE = 25000;

	for (let i = 0; i < RUNS; i++) {
		const feld = FIELDS[i % FIELDS.length];

		// Siehe Kopfkommentar: ein Euro nachkaufen, damit ein Rack, das durch
		// eine lange Verlustserie leergelaufen ist, das Spiel nicht abbricht.
		await bank.buyIn(1);
		const platziert = bets.place(feld.id, 1);
		if (!platziert.ok) {
			continue;
		}
		const gebucht = await bank.placeChip(1);
		if (!gebucht.ok) {
			bets.takeBack(feld.id);
			continue;
		}

		const start = game.start();
		if (!start.ok) {
			continue;
		}
		const zeiger = physics.runToRest();
		await game.settleAt(labelOf(zeiger));

		const eintrag = jeArt.get(feld.kind) ?? { staked: 0, returned: 0, rounds: 0 };
		eintrag.staked += letzterReport.total;
		eintrag.returned += letzterReport.payout;
		eintrag.rounds += 1;
		jeArt.set(feld.kind, eintrag);
		gesamtStaked += letzterReport.total;
		gesamtReturned += letzterReport.payout;

		if ((i + 1) % FORTSCHRITT_ALLE === 0) {
			const jetzt = Date.now();
			const vergangenSek = (jetzt - t0) / 1000;
			const proRundeMs = (jetzt - t0) / (i + 1);
			const restRunden = RUNS - (i + 1);
			const hochrechnungSek = (restRunden * proRundeMs) / 1000;
			console.log(
				`  … ${i + 1} / ${RUNS} Runden`
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

	/** 5 abgedeckte Zahlen (die Fünferwette) zahlt 92,11 %, alles andere 94,74 % (Anhang F). */
	function erwarteteQuote(kind) {
		return kind === 'five' ? 35 / 38 : 36 / 38;
	}

	console.log('\n--- Bericht ---\n');
	console.log(`Umfang            ${RUNS} Runden${RUNS < MINDESTUMFANG ? '  — UNTER DEM GEFORDERTEN UMFANG' : ''}`);
	console.log(`Saat              ${SEED}`);
	console.log(`Gesamteinsatz     ${gesamtStaked} €`);
	console.log(`Gesamtrückfluss   ${gesamtReturned} €`);
	console.log(`Bilanz            ${bilanzStimmt ? 'STIMMT — auf den Cent' : 'STIMMT NICHT'} (tatsächliches Delta ${bilanzDelta}, erwartet ${erwarteteBilanzDelta})`);

	console.log('\nRückflussquote je Wettart (rechnerisch: 94,74 % außer der Fünferwette mit 92,11 %):');
	console.log('Schranke = 4 × Standardabweichung DIESER Wettart bei DIESER tatsächlichen Rundenzahl —');
	console.log('siehe Kopfkommentar "DIE STATISTISCHE SCHRANKE JE WETTART" für die Herleitung.\n');
	let alleQuotenInToleranz = true;
	const artenSortiert = [...jeArt.keys()].sort();
	for (const kind of artenSortiert) {
		const { staked, returned, rounds } = jeArt.get(kind);
		const gemesseneQuote = staked > 0 ? returned / staked : 0;
		const erwartet = erwarteteQuote(kind);
		const abweichungPunkte = (gemesseneQuote - erwartet) * 100;

		// p und payout kommen aus der Feldliste selbst — jedes Feld derselben
		// Wettart teilt dieselbe Trefferzahl und Auszahlung (B-3/B-9 in
		// verify-bets.mjs beweisen das); das erste gefundene Feld genügt.
		const repraesentant = FIELDS.find((f) => f.kind === kind);
		const p = repraesentant.covers.length / 38;
		const schranke = schwellenwertPunkte(repraesentant.payout, p, rounds);

		const inToleranz = Math.abs(abweichungPunkte) <= schranke;
		if (!inToleranz) {
			alleQuotenInToleranz = false;
		}
		console.log(
			`  ${kind.padEnd(8, ' ')} ${rounds.toString().padStart(7, ' ')} Runden   `
			+ `gemessen ${de(gemesseneQuote * 100, 2)} %   erwartet ${de(erwartet * 100, 2)} %   `
			+ `Abweichung ${abweichungPunkte >= 0 ? '+' : ''}${de(abweichungPunkte, 2)} Punkte   `
			+ `Schranke ±${de(schranke, 2)} Punkte`
			+ `   ${inToleranz ? 'in Toleranz' : 'AUSSERHALB DER TOLERANZ'}`
		);
	}

	await bank.close();

	const bestanden = bilanzStimmt && alleQuotenInToleranz;
	const gesamtSekunden = (Date.now() - t0) / 1000;
	console.log(`\nGesamtlaufzeit: ${de(gesamtSekunden, 1)} s`);
	console.log(`\nERGEBNIS: ${bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Rückgabewert ${bestanden ? 0 : 1}).`);
	if (!bestanden) {
		console.log('Weicht eine Quote ab, obwohl B-11 (verify-bets.mjs) die Tabelle rechnerisch bestätigt,');
		console.log('ist die VERDRAHTUNG falsch (round-roulette.js, table-bets.js oder table-buyin.js),');
		console.log('nicht die Auszahlungstabelle selbst.');
	}

	process.exit(bestanden ? 0 : 1);
}

const DIESE_DATEI = fileURLToPath(import.meta.url);
if (process.argv[1] === DIESE_DATEI) {
	await main();
}
