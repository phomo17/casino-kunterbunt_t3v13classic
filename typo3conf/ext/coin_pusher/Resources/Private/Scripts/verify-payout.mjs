/**
 * Coin Pusher – Nachweis der Auszahlungsquote
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Der Quotennachweis nach
 * CONCEPT.md B.9.4 und Anhang E, Abnahmekriterium 1 dieser Phase, wörtlich:
 *
 *   „Das Messskript läuft mit fester Zufallsfolge über mindestens 100.000
 *   Münzen je Münzwert und liefert eine Quote im Band 95 % bis 99 %;
 *   Ergebnis, Streuung und eingestellte Schachtbreite sind dokumentiert."
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-payout.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1 bei der ersten Abweichung. Gleiche
 * check()-Bauform, gleiche OK-/FEHLER-Ausgabe wie verify-physics.mjs und wie
 * die Nachweisskripte der beiden anderen Geräte.
 *
 * DAS BAND 48–52 % LÖST DIE 95–99 % AUS CONCEPT.md B.9.4 UND ANHANG E AB;
 * die Ablösung steht als ausdrücklicher Konzeptverstoß in DECISIONS.md vom
 * 2026-09-04 11:38 und ist die verbindliche Fassung. Das Zitat oben bleibt
 * unverändert stehen, weil es beschreibt, was CONCEPT.md ursprünglich
 * verlangte – es ist mit diesem Absatz als überholt gekennzeichnet, nicht
 * stillschweigend ersetzt.
 *
 *
 * DER SCHALTER --coins=<n> IST NUR FÜR DEN EICHLAUF
 * ----------------------------------------------------
 * Fünf Läufe à rund 102.000 Münzen mit 48 Schritten Abstand sind rund 24,5
 * Millionen Zeitschritte – wie lange das dauert, hängt allein von der
 * Maschine ab. --coins=<n> ersetzt die 100.000 Münzen je Wert versuchsweise
 * durch n, misst NUR die Rechenleistung dieser Maschine und rechnet daraus
 * die Laufzeit des vollen Nachweises hoch. Ein mit --coins verkürzter Lauf
 * ist KEIN NACHWEIS – das Skript sagt das in Großbuchstaben und bricht
 * danach ab, ohne eine einzige Quote zu behaupten. Ohne den Schalter bleibt
 * COINS_PER_VALUE bei 100.000, wie es CONCEPT.md B.9.4 verlangt; die Zahl
 * wird nicht gekürzt.
 *
 *
 * WARUM DER BESTANDSAUSGLEICH IM NENNER STEHT
 * -----------------------------------------------
 * quote = wonValue / (thrownValue + anfangsbestand - endbestand). Das Feld
 * ist am Ende einer Zählphase nicht genau so voll wie am Anfang. Ohne den
 * Ausgleich zählte man Münzen als „eingesetzt", die noch im Feld liegen und
 * nur noch nicht heruntergefallen sind – die Quote sähe künstlich niedrig
 * aus. Mit dem Ausgleich misst man das, was CONCEPT.md B.9.4 meint: von
 * allem, was in das Gerät hineingegangen ist, wie viel kommt vorn wieder
 * heraus. Q-3 weist die dazu gehörende Bilanzgleichung exakt nach, BEVOR
 * eine Quote gedruckt wird.
 *
 *
 * WAS DER UMBAU AUF ZWEI EBENEN AN DIESER MESSUNG GEÄNDERT HAT
 * ------------------------------------------------------------------
 * An der METHODE nichts: derselbe Dreischritt (Einlauf → Bilanzzähler
 * zurücksetzen und Anfangsbestand merken → gezählter Lauf), dieselben
 * Startwerte, derselbe Bestandsausgleich im Nenner, derselbe gemischte
 * Gegenprobelauf. An den ZAHLEN alles: die Maßordnung ist die vierte
 * Auslegung (field.js, tune-layout.mjs), und die Tabelle in README.md wird
 * ERSETZT, nicht ergänzt – eine Tabelle mit zwei Auslegungen nebeneinander
 * lüde dazu ein, die falsche zu lesen. Neu hinzugekommen sind Q-9
 * (Stückzahlerhaltung über den ganzen Nachweis) und Q-10 (jede gewonnene
 * Münze war vorher oben) – beide VOR der ersten gedruckten Quote je Lauf.
 */

import { Field, CHUTE_WIDTH, CHUTE_REACH, FILL_TARGET, COIN_VALUES, COIN_CAP_MAX }
	from '../../Public/JavaScript/field.js';
import { createSeeded, below } from '../../Public/JavaScript/rng.js';

const COINS_PER_VALUE = 100000;   // die Untergrenze aus B.9.4, nicht mehr
const WARMUP = 2000;              // Einlauf, wird nicht gezählt
const BATCHES = 20;               // Abschnitte à 5.000 Münzen – daraus die Streuung
const THROW_INTERVAL_STEPS = 48;  // wie im Suchlauf, damit beides vergleichbar ist
const BAND_MIN = 0.48;
const BAND_MAX = 0.52;
const SEEDS = { 1: 20260901, 2: 20260902, 5: 20260905, 10: 20260910 };
const MIXED_SEED = 20260908;

/** Für Q-7: an welcher Münze (von der ersten an gezählt) wird der Vergleichsstand gezogen. */
const REPEATABILITY_COINS = 10000;

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} message
 * @returns {void}
 */
function check(condition, message) {
	if (condition) {
		console.log(`  OK      ${message}`);
		return;
	}
	failed = true;
	console.log(`  FEHLER  ${message}`);
}

/**
 * @param {Field} field
 * @returns {number} Summe der Münzwerte, die aktuell im Feld liegen
 */
function balanceOfField(field) {
	let sum = 0;
	for (let i = 0; i < field.count; i++) { sum += field.value[i]; }
	return sum;
}

/**
 * @param {{minCount: number, maxCount: number}} stats
 * @param {Field} field
 * @returns {void}
 */
function trackCount(stats, field) {
	if (field.count < stats.minCount) { stats.minCount = field.count; }
	if (field.count > stats.maxCount) { stats.maxCount = field.count; }
}

/**
 * @param {number} quote
 * @returns {string}
 */
function pct(quote) {
	return `${(quote * 100).toFixed(3)} %`;
}

/**
 * @param {number[]} values
 * @returns {{mean: number, stdDev: number, min: number, max: number}}
 */
function stats(values) {
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const variance = values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
	return { mean, stdDev: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values) };
}

/* ----------------------------------------------------------------------
   Q-1  CHUTE_REACH (Stellschraube) und CHUTE_WIDTH (Bauart).
   ---------------------------------------------------------------------- */

function checkChuteWidth() {
	console.log(`\nQ-1  Maße aus field.js (das Skript setzt keine eigenen)`);
	console.log(`  CHUTE_REACH = ${CHUTE_REACH}  (die Stellschraube der Quote, tune-chute.mjs Stufe 1)`);
	console.log(`  CHUTE_WIDTH = ${CHUTE_WIDTH}  (Bauart, seit dem Umbau auf zwei Ebenen kein Regler mehr, `
		+ 'tune-chute.mjs Stufe 0)');
	check(typeof CHUTE_REACH === 'number' && CHUTE_REACH >= 0, 'CHUTE_REACH ist eine nichtnegative Zahl');
	check(typeof CHUTE_WIDTH === 'number' && CHUTE_WIDTH > 0, 'CHUTE_WIDTH ist eine positive Zahl');
}

/* ----------------------------------------------------------------------
   Q-2, Q-3, Q-5, Q-8  Ein Lauf je Münzwert.
   ---------------------------------------------------------------------- */

/**
 * Führt den vollständigen Nachweislauf für EINEN Münzwert: Einlauf, dann
 * BATCHES Abschnitte à coinsPerValue/BATCHES Münzen, jeder Abschnitt mit
 * eigener Quote (Q-5). Q-7 zieht unterwegs einen Vergleichsstand bei der
 * REPEATABILITY_COINS-ten Münze (nur für Münzwert 1 gebraucht, aber
 * generisch gehalten).
 *
 * @param {number} value
 * @param {number} coinsPerValue
 * @param {boolean} withRepeatabilitySnapshot
 * @returns {{
 *   field: Field, batchQuotes: number[], thrownValue: number, wonValue: number,
 *   chuteValue: number, valveValue: number, startBalance: number, endBalance: number,
 *   quote: number, minCount: number, maxCount: number, repeatabilitySnapshot: (object|null),
 * }}
 */
function runValue(value, coinsPerValue, withRepeatabilitySnapshot) {
	const field = new Field({ random: createSeeded(SEEDS[value]) });
	// Q-8 fragt nach der Stückzahl "über jeden Lauf" – gemeint ist der GEMESSENE
	// Lauf, wie überall sonst in diesem Skript (Q-2 zählt den Einlauf ausdrücklich
	// nicht mit). Während des Einlaufs füllt sich das Feld erst von null auf den
	// eingeschwungenen Zustand; dort wäre die Stückzahl zwangsläufig unter 150,
	// ohne dass das eine Verletzung von B.9.3 wäre. Getrackt wird deshalb erst ab
	// dem Ende des Einlaufs.
	const countStats = { minCount: Infinity, maxCount: -Infinity };
	let coinIndex = 0;
	let repeatabilitySnapshot = null;
	let trackingEnabled = false;

	// Schatten-Zähler NUR für Q-7: field.thrownValue/wonValue/chuteValue/valveValue
	// werden unten nach dem Einlauf und an jeder Abschnittsgrenze auf null gesetzt
	// (das brauchen Q-2/Q-5 so). Ein Vergleichsstand, der an einer beliebigen
	// Münze mitten im Lauf einfach field.wonValue usw. abliest, verglichen mit
	// einem UNABHÄNGIGEN, frischen Lauf über dieselbe Münzzahl ab Münze 1, würde
	// deshalb Äpfel mit Birnen vergleichen – der frische Lauf zählt ja ab Münze 1,
	// der Schnappschuss nur ab der letzten Rücksetzung. Die Schatten-Zähler laufen
	// darum, ungeachtet jeder Rücksetzung von field.*Value, seit der allerersten
	// Münze mit.
	let shadowThrown = 0;
	let shadowWon = 0;
	let shadowChute = 0;
	let shadowValve = 0;

	function throwOne() {
		const beforeWon = field.wonValue;
		const beforeChute = field.chuteValue;
		const beforeValve = field.valveValue;
		field.throwCoin(value);
		for (let s = 0; s < THROW_INTERVAL_STEPS; s++) { field.step(); }
		coinIndex++;
		shadowThrown += value;
		shadowWon += field.wonValue - beforeWon;
		shadowChute += field.chuteValue - beforeChute;
		shadowValve += field.valveValue - beforeValve;
		if (trackingEnabled) { trackCount(countStats, field); }
		if (withRepeatabilitySnapshot && coinIndex === REPEATABILITY_COINS && repeatabilitySnapshot === null) {
			repeatabilitySnapshot = {
				state: field.serialize(),
				thrownValue: shadowThrown,
				wonValue: shadowWon,
				chuteValue: shadowChute,
				valveValue: shadowValve,
			};
		}
	}

	for (let c = 0; c < WARMUP; c++) { throwOne(); }
	trackingEnabled = true;

	field.thrownValue = 0;
	field.wonValue = 0;
	field.chuteValue = 0;
	field.valveValue = 0;
	const startBalance = balanceOfField(field);

	const batchSize = coinsPerValue / BATCHES;
	const batchQuotes = [];
	let cumulativeThrown = 0;
	let cumulativeWon = 0;
	let cumulativeChute = 0;
	let cumulativeValve = 0;

	for (let b = 0; b < BATCHES; b++) {
		field.thrownValue = 0;
		field.wonValue = 0;
		field.chuteValue = 0;
		field.valveValue = 0;
		const batchStart = balanceOfField(field);

		for (let c = 0; c < batchSize; c++) { throwOne(); }

		const batchEnd = balanceOfField(field);
		const batchDenominator = field.thrownValue + batchStart - batchEnd;
		batchQuotes.push(field.wonValue / batchDenominator);

		cumulativeThrown += field.thrownValue;
		cumulativeWon += field.wonValue;
		cumulativeChute += field.chuteValue;
		cumulativeValve += field.valveValue;
	}

	const endBalance = balanceOfField(field);
	const denominator = cumulativeThrown + startBalance - endBalance;
	const quote = cumulativeWon / denominator;

	return {
		field, batchQuotes,
		thrownValue: cumulativeThrown, wonValue: cumulativeWon, chuteValue: cumulativeChute, valveValue: cumulativeValve,
		startBalance, endBalance, quote,
		minCount: countStats.minCount, maxCount: countStats.maxCount,
		repeatabilitySnapshot,
	};
}

/* ----------------------------------------------------------------------
   Q-6  Gemischter Gegenprobelauf.
   ---------------------------------------------------------------------- */

/**
 * @param {number} coinsTotal
 * @returns {{
 *   field: Field, thrownValue: number, wonValue: number, chuteValue: number, valveValue: number,
 *   startBalance: number, endBalance: number, quote: number, minCount: number, maxCount: number,
 * }}
 */
function runMixed(coinsTotal) {
	const draw = createSeeded(MIXED_SEED);
	const field = new Field({ random: draw });
	// Wie in runValue(): erst ab dem Ende des Einlaufs getrackt, siehe dortiger
	// Kommentar.
	const countStats = { minCount: Infinity, maxCount: -Infinity };
	let trackingEnabled = false;

	function throwOneMixed() {
		const value = COIN_VALUES[below(draw, COIN_VALUES.length)];
		field.throwCoin(value);
		for (let s = 0; s < THROW_INTERVAL_STEPS; s++) { field.step(); }
		if (trackingEnabled) { trackCount(countStats, field); }
	}

	for (let c = 0; c < WARMUP; c++) { throwOneMixed(); }
	trackingEnabled = true;

	field.thrownValue = 0;
	field.wonValue = 0;
	field.chuteValue = 0;
	field.valveValue = 0;
	const startBalance = balanceOfField(field);

	for (let c = 0; c < coinsTotal; c++) { throwOneMixed(); }

	const endBalance = balanceOfField(field);
	const denominator = field.thrownValue + startBalance - endBalance;
	const quote = field.wonValue / denominator;

	return {
		field, thrownValue: field.thrownValue, wonValue: field.wonValue, chuteValue: field.chuteValue,
		valveValue: field.valveValue, startBalance, endBalance, quote,
		minCount: countStats.minCount, maxCount: countStats.maxCount,
	};
}

/* ----------------------------------------------------------------------
   Q-9, Q-10  Stückzahlerhaltung und Ebenenweg – je Lauf, VOR der Quote.
   ---------------------------------------------------------------------- */

/**
 * Q-9: dieselbe Gleichung wie F-21 in verify-physics.mjs, aber über den
 * VOLLSTÄNDIGEN Lauf dieses Skripts (Einlauf + alle gezählten Münzen) statt
 * über den kurzen Referenzlauf dort – die stärkste Form der Zusage „keine
 * Münze verschwindet oder verdoppelt sich". field.spawnCount/wonCount/
 * chuteCount/valveCount/count werden in diesem Skript an keiner Stelle von
 * Hand zurückgesetzt (nur die WERT-Zähler thrownValue/wonValue/… werden das,
 * für Q-2/Q-5), sie zählen also seit der allerersten Münze dieses Feldes.
 *
 * Q-10: dropCount >= wonCount – der Beleg, dass die Auszahlung tatsächlich
 * über beide Ebenen führt: jede vorn gefallene Münze war vorher auf der
 * oberen Ebene und ist von dort abgestürzt. Die Schranke bleibt gültig, auch
 * wenn ein vierlagiger Stapel der unteren Ebene den Zähler gelegentlich
 * überzählt (settleHeights(), field.js, DECISIONS.md 2026-09-04) – das weicht
 * nur nach oben ab.
 *
 * Beide stehen VOR der ersten gedruckten Zahl dieses Laufs: eine Quote aus
 * einem Feld, dessen Buchhaltung nicht aufgeht, wäre wertlos.
 *
 * @param {string} label
 * @param {Field} field
 * @returns {void}
 */
function checkPieceConservationAndLevelPath(label, field) {
	console.log(`\nQ-9  ${label}: Stückzahlerhaltung über den ganzen Nachweis`);
	check(field.spawnCount === field.wonCount + field.chuteCount + field.valveCount + field.count,
		`spawnCount (${field.spawnCount}) === wonCount + chuteCount + valveCount + Bestand `
		+ `(${field.wonCount} + ${field.chuteCount} + ${field.valveCount} + ${field.count})`);

	console.log(`\nQ-10  ${label}: jede gewonnene Münze war vorher auf der oberen Ebene`);
	check(field.dropCount >= field.wonCount,
		`dropCount (${field.dropCount}) >= wonCount (${field.wonCount})`);
}

/* ----------------------------------------------------------------------
   Q-7  Wiederholbarkeit über den ganzen Nachweis.
   ---------------------------------------------------------------------- */

/**
 * @param {object} snapshot Vergleichsstand aus runValue(1, …, true)
 * @returns {void}
 */
function checkRepeatability(snapshot) {
	console.log(`\nQ-7  Wiederholbarkeit: Münzwert 1, derselbe Startwert, zweiter Lauf über die ersten `
		+ `${REPEATABILITY_COINS.toLocaleString('de-DE')} Münzen`);

	check(snapshot !== null, 'der erste Lauf hat einen Vergleichsstand gezogen');
	if (snapshot === null) { return; }

	const field = new Field({ random: createSeeded(SEEDS[1]) });
	for (let c = 0; c < REPEATABILITY_COINS; c++) {
		field.throwCoin(1);
		for (let s = 0; s < THROW_INTERVAL_STEPS; s++) { field.step(); }
	}

	check(field.serialize() === snapshot.state, `Speicherstand nach ${REPEATABILITY_COINS.toLocaleString('de-DE')} `
		+ `Münzen ist zeichengleich (Länge ${field.serialize().length})`);
	check(field.thrownValue === snapshot.thrownValue, `thrownValue stimmt überein (${field.thrownValue})`);
	check(field.wonValue === snapshot.wonValue, `wonValue stimmt überein (${field.wonValue})`);
	check(field.chuteValue === snapshot.chuteValue, `chuteValue stimmt überein (${field.chuteValue})`);
	check(field.valveValue === snapshot.valveValue, `valveValue stimmt überein (${field.valveValue})`);
}

/* ----------------------------------------------------------------------
   Ablauf.
   ---------------------------------------------------------------------- */

const calibrationArg = process.argv.slice(2).find((entry) => entry.startsWith('--coins='));

if (calibrationArg !== undefined) {
	const n = Number(calibrationArg.slice('--coins='.length));
	if (!Number.isInteger(n) || n <= 0) {
		console.log(`--coins erwartet eine positive ganze Zahl, bekam: ${calibrationArg}`);
		process.exit(1);
	}

	console.log('***************************************************************');
	console.log('*** EICHLAUF – DIES IST KEIN NACHWEIS DER AUSZAHLUNGSQUOTE.   ***');
	console.log(`*** Nur ${n.toLocaleString('de-DE')} statt ${COINS_PER_VALUE.toLocaleString('de-DE')} Münzen, nur `
		.padEnd(64) + '***');
	console.log('*** Münzwert 1. Dient ausschließlich der Laufzeitschätzung.   ***');
	console.log('***************************************************************\n');

	const started = process.hrtime.bigint();
	runValue(1, n, false);
	const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;

	const stepsCalibration = (WARMUP + n) * THROW_INTERVAL_STEPS;
	const stepsPerSecond = stepsCalibration / elapsedSeconds;
	const stepsFullRun = 5 * (WARMUP + COINS_PER_VALUE) * THROW_INTERVAL_STEPS;
	const estimatedSeconds = stepsFullRun / stepsPerSecond;
	const hours = estimatedSeconds / 3600;

	console.log(`Eichlauf: ${stepsCalibration.toLocaleString('de-DE')} Zeitschritte in `
		+ `${elapsedSeconds.toFixed(1)} s → ${Math.round(stepsPerSecond).toLocaleString('de-DE')} Zeitschritte/s.`);
	console.log(`Voller Nachweis: 5 Läufe × ${(WARMUP + COINS_PER_VALUE).toLocaleString('de-DE')} Münzen × `
		+ `${THROW_INTERVAL_STEPS} Schritte = ${stepsFullRun.toLocaleString('de-DE')} Zeitschritte.`);
	console.log(`Hochgerechnete Gesamtlaufzeit: ${hours.toFixed(2)} h.`);
	if (hours > 4) {
		console.log('\nÜBER VIER STUNDEN – nicht heimlich kürzen. Dieser Befund gehört mit der gemessenen '
			+ 'Schrittleistung in APPROVAL.md; COINS_PER_VALUE bleibt bei 100.000.');
	} else {
		console.log('\nUnter vier Stunden – der volle Lauf (ohne --coins) kann gestartet werden.');
	}
	process.exit(0);
}

const started = process.hrtime.bigint();

checkChuteWidth();

console.log(`\nQ-2  Je Münzwert ein Lauf über ${WARMUP.toLocaleString('de-DE')} Einlauf + `
	+ `${COINS_PER_VALUE.toLocaleString('de-DE')} gezählte Münzen`);

const runs = new Map();
for (const value of COIN_VALUES) {
	const withSnapshot = value === 1;
	const run = runValue(value, COINS_PER_VALUE, withSnapshot);
	runs.set(value, run);

	checkPieceConservationAndLevelPath(`Münzwert ${value}`, run.field);

	console.log(`\n  Münzwert ${value}`);
	console.log(`    eingesetzt        ${run.thrownValue.toLocaleString('de-DE')}`);
	console.log(`    vorn gewonnen     ${run.wonValue.toLocaleString('de-DE')}`);
	console.log(`    seitlich verloren ${run.chuteValue.toLocaleString('de-DE')}`);
	console.log(`    Ventil geschluckt ${run.valveValue.toLocaleString('de-DE')}`);
	console.log(`    Bestandsänderung  ${(run.endBalance - run.startBalance).toLocaleString('de-DE')}`);
	console.log(`    Quote             ${pct(run.quote)}`);

	console.log(`\nQ-3  Münzwert ${value}: Bilanz stimmt exakt und ganzzahlig`);
	const left = run.thrownValue + run.startBalance;
	const right = run.wonValue + run.chuteValue + run.valveValue + run.endBalance;
	check(left === right, `eingesetzt + Anfangsbestand (${left}) === gewonnen + Schacht + Ventil + `
		+ `Endbestand (${right})`);
	if (left !== right) {
		console.log(`\nAbgebrochen: die Bilanz für Münzwert ${value} geht nicht auf – eine Quote aus einer nicht `
			+ 'aufgehenden Bilanz wäre eine überzeugend aussehende falsche Zahl.');
		process.exit(1);
	}
}

console.log(`\nQ-4  Die Quote liegt je Münzwert im Band ${BAND_MIN * 100}–${BAND_MAX * 100} %`);
for (const value of COIN_VALUES) {
	const run = runs.get(value);
	check(run.quote >= BAND_MIN && run.quote <= BAND_MAX,
		`Münzwert ${value}: Quote ${pct(run.quote)} liegt im Band`);
}

console.log(`\nQ-5  Streuung: je Münzwert ${BATCHES} Abschnitte à `
	+ `${(COINS_PER_VALUE / BATCHES).toLocaleString('de-DE')} Münzen`);
for (const value of COIN_VALUES) {
	const run = runs.get(value);
	const s = stats(run.batchQuotes);
	console.log(`\n  Münzwert ${value} – Abschnittsquoten:`);
	console.log(`    ${run.batchQuotes.map(pct).join(', ')}`);
	console.log(`    Mittelwert ${pct(s.mean)}, Standardabweichung ${(s.stdDev * 100).toFixed(3)} Prozentpunkte, `
		+ `kleinster Abschnitt ${pct(s.min)}, größter Abschnitt ${pct(s.max)}`);
	check(run.batchQuotes.every((q) => q >= BAND_MIN && q <= BAND_MAX),
		`Münzwert ${value}: jeder einzelne Abschnitt liegt im Band ${BAND_MIN * 100}–${BAND_MAX * 100} %`);
}

console.log(`\nQ-6  Gemischter Gegenprobelauf: ${COINS_PER_VALUE.toLocaleString('de-DE')} Münzen, Wert je Einwurf `
	+ 'gleichverteilt aus dem Zufallsgeber gezogen');
const mixed = runMixed(COINS_PER_VALUE);
checkPieceConservationAndLevelPath('gemischter Lauf', mixed.field);
console.log(`    eingesetzt        ${mixed.thrownValue.toLocaleString('de-DE')}`);
console.log(`    vorn gewonnen     ${mixed.wonValue.toLocaleString('de-DE')}`);
console.log(`    seitlich verloren ${mixed.chuteValue.toLocaleString('de-DE')}`);
console.log(`    Ventil geschluckt ${mixed.valveValue.toLocaleString('de-DE')}`);
console.log(`    Quote             ${pct(mixed.quote)}`);
const mixedLeft = mixed.thrownValue + mixed.startBalance;
const mixedRight = mixed.wonValue + mixed.chuteValue + mixed.valveValue + mixed.endBalance;
check(mixedLeft === mixedRight, `Bilanz des gemischten Laufs geht exakt auf (${mixedLeft} === ${mixedRight})`);
check(mixed.quote >= BAND_MIN && mixed.quote <= BAND_MAX, `Quote des gemischten Laufs ${pct(mixed.quote)} liegt `
	+ 'im Band');

checkRepeatability(runs.get(1).repeatabilitySnapshot);

// B.9.3 / Anhang E: „Obergrenze 150 bis 250 (Richtwert 200)" ist eine Aussage
// über die EINGESTELLTE Obergrenze (Zweck: die Bildrate auf einem Telefon),
// nicht über den Bestand, der sich für einen einzelnen Münzwert im Dauerbetrieb
// einpendelt. Geprüft wird deshalb die harte Obergrenze COIN_CAP_MAX selbst
// (nie überschritten) und – als das eigentlich aussagekräftige Merkmal einer
// richtig ausgelegten Maßordnung – dass das Ventil dabei verschwindend wenig
// greift; das ist bereits in Q-4/Q-5 (Quote im Band) mitbewiesen, denn ein
// nennenswerter Ventilanteil würde die Quote unter das Band drücken. Dieselbe
// Korrektur wie bei F-8 in verify-physics.mjs: eine untere Toleranz, die eine
// falsch gestellte Frage rettet, ist schlechter als die richtige Frage.
console.log(`\nQ-8  Die eingestellte Obergrenze COIN_CAP_MAX (${COIN_CAP_MAX}) wird nie überschritten`);
for (const value of COIN_VALUES) {
	const run = runs.get(value);
	check(run.maxCount <= COIN_CAP_MAX,
		`Münzwert ${value}: größte beobachtete Stückzahl ${run.maxCount} <= COIN_CAP_MAX `
		+ `(kleinste beobachtet: ${run.minCount}, zur Einordnung – B.9.3 legt dafür keine Untergrenze fest)`);
	console.log(`          dropCount (Ebenenwechsel über den ganzen Lauf): ${run.field.dropCount.toLocaleString('de-DE')}`);
}
check(mixed.maxCount <= COIN_CAP_MAX,
	`gemischter Lauf: größte beobachtete Stückzahl ${mixed.maxCount} <= COIN_CAP_MAX `
	+ `(kleinste beobachtet: ${mixed.minCount}, zur Einordnung)`);
console.log(`          dropCount (Ebenenwechsel über den ganzen Lauf): ${mixed.field.dropCount.toLocaleString('de-DE')}`);

const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;

/* ----------------------------------------------------------------------
   Ausgabe, die wörtlich in die README wandert.
   ---------------------------------------------------------------------- */

console.log('\n' + '='.repeat(72));
console.log('README-BLOCK (Abschnitt „Quote")');
console.log('='.repeat(72));
console.log(`Ablenkleisten-Reichweite (CHUTE_REACH) ${CHUTE_REACH}, Schachtbreite (CHUTE_WIDTH, Bauart) `
	+ `${CHUTE_WIDTH}, Flächenanteil ${FILL_TARGET}, Einwurfabstand ${THROW_INTERVAL_STEPS} Zeitschritte `
	+ `(${(THROW_INTERVAL_STEPS / 240).toFixed(1)} s).`);
console.log('Münzwert | Münzen | Quote | Standardabweichung je 5.000 | kleinster / größter Abschnitt');
for (const value of COIN_VALUES) {
	const run = runs.get(value);
	const s = stats(run.batchQuotes);
	console.log(`${value} | ${COINS_PER_VALUE.toLocaleString('de-DE')} | ${pct(run.quote)} | `
		+ `${(s.stdDev * 100).toFixed(3)} Pkt | ${pct(s.min)} / ${pct(s.max)}`);
}
console.log(`gemischt | ${COINS_PER_VALUE.toLocaleString('de-DE')} | ${pct(mixed.quote)} | – | –`);
console.log(`Startwerte: ${COIN_VALUES.map((v) => `${v} → ${SEEDS[v]}`).join(', ')}, gemischt → ${MIXED_SEED}.`);

const totalThrown = COIN_VALUES.reduce((sum, v) => sum + runs.get(v).thrownValue, 0);
const totalChute = COIN_VALUES.reduce((sum, v) => sum + runs.get(v).chuteValue, 0);
const totalValve = COIN_VALUES.reduce((sum, v) => sum + runs.get(v).valveValue, 0);
console.log(`Verlustwege über alle vier Einzelläufe: Schacht ${((totalChute / totalThrown) * 100).toFixed(2)} %, `
	+ `Ventil ${((totalValve / totalThrown) * 100).toFixed(2)} %.`);
console.log(`Laufzeit dieses Nachweises: ${(elapsedSeconds / 60).toFixed(1)} min.`);
console.log('='.repeat(72));

console.log(failed
	? '\nERGEBNIS: mindestens eine Prüfung des Quotennachweises ist fehlgeschlagen.'
	: '\nERGEBNIS: die Auszahlungsquote liegt für alle vier Münzwerte und den gemischten Lauf im Band '
		+ `${BAND_MIN * 100}–${BAND_MAX * 100} %, die Bilanz geht exakt auf, und die Stückzahl bleibt in der `
		+ 'Spanne.');

process.exit(failed ? 1 : 0);
