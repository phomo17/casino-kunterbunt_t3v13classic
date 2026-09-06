/**
 * Coin Pusher – Suchlauf über die Maßordnung (vierte Auslegung)
 * ================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Sucht die vier Maße der
 * neuen, zweistöckigen Auslegung – FIELD_WIDTH, FIELD_DEPTH, LOWER_DEPTH,
 * PLATE_STROKE – und die neue Bezugsgröße ALLOWED_LAYERS, indem es die Physik
 * ohne Bild laufen lässt und misst. Es beantwortet EINE Frage: „funktioniert
 * der Mechanismus?" – trägt die Berührungskette bis vorn, stapelt der Haufen,
 * sind beide Ebenen im Gebrauch, wandert der Haufen auch OHNE Einwurf. Die
 * Frage „wo genau liegt die Quote?" beantwortet danach tune-chute.mjs mit
 * CHUTE_REACH, der Stellschraube, die CHUTE_WIDTH aus Anhang E abgelöst hat
 * (ausdrücklicher Konzeptverstoß, DECISIONS.md 2026-09-04). Zwei Skripte,
 * zwei Fragen: eine Erweiterung von tune-chute.mjs um vier weitere Maße hätte
 * aus der einen benannten Stellschraube optisch eine von fünfen gemacht –
 * genau diese Vermischung hat die dritte Auslegung drei Anläufe gekostet
 * (DECISIONS.md).
 *
 * DIESES SKRIPT ÄNDERT KEINE DATEI. Es druckt eine Tabelle, nennt einen
 * Sieger nach der unten festgeschriebenen Regel, und der Mensch trägt die
 * Zahlen danach von Hand in field.js ein – dieselbe Begründung wie bei
 * tune-chute.mjs: CONCEPT.md B.9.4 verbietet einen unsichtbaren Regler
 * ausdrücklich, und eine Zahl, die ein Skript selbsttätig in den Quelltext
 * schreibt, kann niemand mehr nachvollziehen.
 *
 * Aufruf:
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/tune-layout.mjs
 *
 * Nur Stufe A laufen lassen (schneller Überblick, keine Empfehlung):
 *
 *   ddev exec node .../tune-layout.mjs --stage=a
 *
 * Stufe B auf einer von Hand gewählten Grundfläche statt der drei besten aus
 * Stufe A (für einen Nachlauf, wenn die automatische Auswahl nicht passt):
 *
 *   ddev exec node .../tune-layout.mjs --stage=b --widths=120,130 --depths=96,104
 *
 * (--widths und --depths müssen bei --stage=b gleich lang sein und werden
 * paarweise als Grundflächen gelesen: erste Breite mit erster Tiefe usw.)
 *
 * Schreibt nichts, verändert nichts – nur Konsolenausgabe.
 *
 *
 * DIE SECHS KRITERIEN, je Kandidat und je Münzwert einzeln gemessen (SEEDS
 * wie in tune-chute.mjs und verify-payout.mjs, damit alles vergleichbar
 * bleibt):
 *
 *   K1  Ventilanteil               < 0,5 %     Notbremse, nicht Regelweg (B.9.3)
 *   K2  Bestand stabil             Stückzahl bei 50 % und 100 % der gezählten
 *                                  Phase weichen um < 5 % voneinander ab
 *   K3  Quote OHNE Ablenkleisten   >= 60 %     Reserve für die Stellschraube danach
 *   K4  mittlere Stapelhöhe        > 1,25 Lagen
 *   K5  beide Ebenen besetzt       je Ebene >= 20 % der Münzen im Bestand
 *   K6  Vorschub ohne Einwurf      >= 0,5 Einheiten je Umlauf
 *
 * Gemessen wird bei chuteReach = 0 – also mit der Bauart, aber ohne die
 * Stellschraube –, damit ausschließlich die Maßordnung gemessen wird und
 * nicht schon die spätere Einstellung hineinspielt.
 *
 * K3 IST GEGENÜBER DER ERSTEN AUSLEGUNG UMGEDREHT WORDEN. Dort hieß es
 * „> 99 %", weil die Zielquote 95–99 % war und die Schachtbreite danach nur
 * noch wenig abziehen musste. Mit der Zielquote 48–52 % (DECISIONS.md,
 * 2026-09-04 11:38) muss die Stellschraube rund die Hälfte abziehen; eine
 * Maßordnung, die schon ohne sie bei 55 % läge, ließe sich nicht mehr
 * einstellen, ohne unter das Band zu fallen. 60 % ist die Untergrenze, die
 * der Ablenkleiste genug Weg lässt.
 *
 * K6 IST NEU und ist der eigentliche Grund für diese Neuauslegung. Nach der
 * gezählten Phase wird der Einwurf ABGESTELLT und vier weitere Umläufe
 * gerechnet; die vorderste Münze der oberen Ebene muss dabei weiter nach
 * vorn wandern. Eine Maßordnung, die das nicht schafft, ist unbrauchbar,
 * gleich wie gut ihre Quote aussieht – dann ist der Einwurf der Antrieb des
 * Geräts, und das widerspricht B.9.2.
 *
 *
 * DER ABLAUF, ZWEISTUFIG
 * -------------------------
 * Der volle Suchraum (4 × 4 × 4 × 3 × 3 = 576 Kandidaten × 4 Münzwerte) wäre
 * tagelang. Deshalb:
 *
 *   Stufe A (grob): fieldWidth ∈ {84, 96, 108, 120} × fieldDepth ∈ {88, 96,
 *   104, 112}, bei festem lowerDepth = round(0,45 × fieldDepth),
 *   plateStroke = 16, allowedLayers = 2,0. 1.200 gezählte Münzen je Wert nach
 *   600 Einlauf.
 *
 *   Stufe B (fein): für die DREI besten Kandidaten aus Stufe A (Rangfolge:
 *   zuerst die Zahl der über alle vier Münzwerte erfüllten Einzelkriterien,
 *   dann – als Entscheidung des Implementierers, weil der Plan das offen
 *   lässt – derselbe Abstandswert wie die Siegerregel unten, damit „die drei
 *   besten" nicht von einer zweiten, unabhängigen Metrik abhängt):
 *   lowerDepth = round(s × fieldDepth) mit s ∈ {0,38; 0,44; 0,50; 0,56} ×
 *   plateStroke ∈ {12, 16, 20} × allowedLayers ∈ {1,6; 2,0; 2,4}. 3.000
 *   gezählte Münzen je Wert nach 1.500 Einlauf.
 *
 * WARUM DIESE ZAHLEN ANDERS SIND ALS IN FASSUNG 1: lowerDepth muss größer
 * werden, weil DEFLECT_DEPTH daraus abgeleitet wird und die Leiste sonst zu
 * steil steht (F-1); der Hub wird kleiner, weil er zweimal von lowerDepth
 * abgeht (einmal für die vorderste Lage der Vorderwand, einmal für die
 * Leiste) und der kürzere Umlauf ihn ohnehin schneller macht. deflectDepth
 * ist KEINE eigene Achse – es folgt aus lowerDepth und plateStroke
 * (field.js, makeLayout()). Die Suchraumgröße bleibt gleich (16 Kandidaten in
 * Stufe A, 36 je Grundfläche in Stufe B); die Laufzeit sinkt um rund ein
 * Drittel, weil PLATE_PERIOD_STEPS von 960 auf 600 fällt und ein Umlauf
 * entsprechend weniger Zeitschritte kostet.
 *
 *
 * DIE SIEGERREGEL, FESTGESCHRIEBEN UND NICHT NACH GESCHMACK
 * --------------------------------------------------------------
 *   1. Nur Kandidaten, die ALLE SECHS Kriterien für ALLE VIER Münzwerte
 *      erfüllen, kommen in Frage.
 *   2. Darunter gewinnt der mit dem größten Abstand des UNGÜNSTIGSTEN
 *      Münzwerts zu K3 – also die größte Reserve, mit der CHUTE_REACH danach
 *      arbeiten kann.
 *   3. Bei Gleichstand die kleinste Gesamtfläche fieldWidth × fieldDepth.
 *   4. Bei erneutem Gleichstand die kleinste Tiefe – sie hält DRAW_TOP in
 *      view.js positiv (Abschnitt 4.3 des Plans).
 *
 *
 * WENN KEIN SIEGER GEFUNDEN WIRD
 * ----------------------------------
 * Das Skript sagt es ausdrücklich und nennt die Richtung, genau wie
 * tune-chute.mjs es für seine Sonderfälle tut:
 *
 *   – Alle reißen K6 (kein Vorschub ohne Einwurf): das ist NICHT die
 *     Maßordnung, sondern die Neigung oder die Reibung. SLOPE_SIN innerhalb
 *     von 3 bis 5 Grad erhöhen (0,07 -> 0,08), sonst PLATE_STROKE
 *     vergrößern – der Vorschub wächst QUADRATISCH mit der
 *     Deckgeschwindigkeit. NIE die Reibungszahlen kleiner machen, um den
 *     Vorschub zu erzwingen: sie sind Werkstoffwerte, keine Stellschrauben.
 *   – Alle reißen K3 (Quote schon ohne Leisten unter 60 %): die
 *     Berührungskette trägt zu weit, das Feld läuft leer. fieldDepth
 *     vergrößern oder plateStroke verkleinern – NIE FILL_TARGET.
 *   – Alle reißen K4 (kein Stapeln): zuerst prüfen, ob die Berichtigung in
 *     settleHeights()/restHeight() noch steht (DECISIONS.md, 2026-09-04);
 *     das war beim letzten Mal die Ursache, nicht SUPPORT_REACH.
 *   – Alle reißen K5, alles liegt oben: lowerDepth vergrößern. Alles liegt
 *     unten: lowerDepth verkleinern.
 *   – Alle reißen K1: allowedLayers erhöhen, höchstens bis 2,8.
 *
 * Jeder eingetretene Sonderfall ist eine Auslegung und gehört mit dem
 * gewählten Wert in DECISIONS.md.
 */

import { Field, COIN_VALUES, PLATE_PERIOD_STEPS } from '../../Public/JavaScript/field.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';

/**
 * Startwert je Münzwert. Dieselben wie in tune-chute.mjs und
 * verify-payout.mjs, damit alle drei Skripte vergleichbare Zahlen liefern.
 */
const SEEDS = { 1: 20260901, 2: 20260902, 5: 20260905, 10: 20260910 };

/** Zeitschritte zwischen zwei Einwürfen: 48 = 0,2 s = fünf Münzen je Sekunde. */
const THROW_INTERVAL_STEPS = 48;

/** Stufe A: grob, viele Kandidaten. */
const STAGE_A_WIDTHS = [84, 96, 108, 120];
const STAGE_A_DEPTHS = [88, 96, 104, 112];
const STAGE_A_LOWER_FACTOR = 0.45;
const STAGE_A_PLATE_STROKE = 16;
const STAGE_A_ALLOWED_LAYERS = 2.0;
const STAGE_A_WARMUP = 600;
const STAGE_A_SAMPLE = 1200;

/** Stufe B: fein, nur um die drei besten Kandidaten aus Stufe A herum. */
const STAGE_B_LOWER_FACTORS = [0.38, 0.44, 0.50, 0.56];
const STAGE_B_PLATE_STROKES = [12, 16, 20];
const STAGE_B_ALLOWED_LAYERS = [1.6, 2.0, 2.4];
const STAGE_B_WARMUP = 1500;
const STAGE_B_SAMPLE = 3000;
const STAGE_B_CANDIDATE_COUNT = 3;

/** Die sechs Kriteriengrenzen. */
const K1_VALVE_MAX = 0.005;
const K2_STABILITY_MAX = 0.05;
const K3_QUOTE_MIN = 0.60;
const K4_LAYERS_MIN = 1.25;
const K5_SHARE_MIN = 0.20;
const K6_ADVANCE_MIN = 0.5;
const K6_CYCLES = 4;

/**
 * Anzahl Zeitschritte, mit denen die Anfangsschätzung der Laufzeit
 * kalibriert wird. Zeichengleich aus tune-chute.mjs übernommen.
 */
const CALIBRATION_STEPS = 20000;

/**
 * @param {string[]} argv
 * @returns {{stage: 'a'|'b'|'full', widths: number[]|null, depths: number[]|null}}
 */
function parseArgs(argv) {
	const stageFlag = argv.find((entry) => entry.startsWith('--stage='));
	const stage = stageFlag === undefined ? 'full' : stageFlag.slice('--stage='.length);
	if (stage !== 'full' && stage !== 'a' && stage !== 'b') {
		throw new RangeError(`--stage muss "a" oder "b" sein, nicht "${stage}"`);
	}
	const widthsFlag = argv.find((entry) => entry.startsWith('--widths='));
	const depthsFlag = argv.find((entry) => entry.startsWith('--depths='));
	const widths = widthsFlag === undefined ? null : widthsFlag.slice('--widths='.length).split(',').map(Number);
	const depths = depthsFlag === undefined ? null : depthsFlag.slice('--depths='.length).split(',').map(Number);
	if (widths?.some((w) => !Number.isFinite(w) || w <= 0)) {
		throw new RangeError(`--widths enthält einen ungültigen Wert: ${widthsFlag}`);
	}
	if (depths?.some((d) => !Number.isFinite(d) || d <= 0)) {
		throw new RangeError(`--depths enthält einen ungültigen Wert: ${depthsFlag}`);
	}
	if (stage === 'b' && widths !== null && depths !== null && widths.length !== depths.length) {
		throw new RangeError('--widths und --depths müssen bei --stage=b gleich lang sein (paarweise gelesen).');
	}
	return { stage, widths, depths };
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
 * @param {Field} field
 * @returns {{layers: number, upperShare: number}} mittlere Stapelhöhe (alle
 *          Münzen geteilt durch die Münzen, die unmittelbar auf einer Ebene
 *          liegen) und Anteil der Münzen auf der oberen Ebene
 */
function stackStats(field) {
	const plate = field.plateY();
	let onGround = 0;
	let upper = 0;
	for (let i = 0; i < field.count; i++) {
		if (field.support[i] === -1) { onGround++; }
		if (field.y[i] >= plate) { upper++; }
	}
	return {
		layers: onGround === 0 ? 0 : field.count / onGround,
		upperShare: field.count === 0 ? 0 : upper / field.count,
	};
}

/**
 * @param {Field} field
 * @returns {number} y der vordersten Münze der OBEREN Ebene, oder Infinity,
 *          wenn keine Münze dort liegt
 */
function frontOfUpperDeck(field) {
	const plate = field.plateY();
	let front = Infinity;
	for (let i = 0; i < field.count; i++) {
		if (field.y[i] >= plate && field.y[i] < front) { front = field.y[i]; }
	}
	return front;
}

/**
 * Wirft `coins` Münzen desselben Werts, dazwischen je THROW_INTERVAL_STEPS
 * Zeitschritte. Ruft optional onCoin(coinIndex, field) nach jeder Münze auf,
 * damit der Aufrufer den Bestand zur Halbzeit mitschneiden kann (K2).
 *
 * @param {Field} field
 * @param {number} coins
 * @param {number} value
 * @param {(coinIndex: number, field: Field) => void} [onCoin]
 * @returns {void}
 */
function runCoins(field, coins, value, onCoin) {
	for (let c = 0; c < coins; c++) {
		field.throwCoin(value);
		for (let s = 0; s < THROW_INTERVAL_STEPS; s++) { field.step(); }
		if (onCoin !== undefined) { onCoin(c, field); }
	}
}

/**
 * Misst alle sechs Kriterien für einen Kandidaten und einen Münzwert, nach
 * demselben Dreischritt wie tune-chute.mjs: Einlauf → Bilanzzähler
 * zurücksetzen und Anfangsbestand merken → gezählter Lauf. K6 hängt sich
 * danach an: Einwurf abstellen, K6_CYCLES weitere Umläufe rechnen, den
 * Vorschub der vordersten Münze der OBEREN Ebene messen (F-20 in klein).
 *
 * @param {object} layout Teilmenge von makeLayout(): fieldWidth, fieldDepth,
 *        lowerDepth, plateStroke, allowedLayers
 * @param {number} value
 * @param {number} warmup
 * @param {number} sample
 * @returns {{quote: number, valveShare: number, stable: boolean,
 *            halfCount: number, endCount: number, layers: number,
 *            upperShare: number, advancePerCycle: number, k1: boolean,
 *            k2: boolean, k3: boolean, k4: boolean, k5: boolean,
 *            k6: boolean, passAll: boolean, margin: number}}
 */
function measureCandidate(layout, value, warmup, sample) {
	const field = new Field({ random: createSeeded(SEEDS[value]), chuteReach: 0, layout });

	runCoins(field, warmup, value);

	field.thrownValue = 0;
	field.wonValue = 0;
	field.chuteValue = 0;
	field.valveValue = 0;
	field.wonCount = 0;
	field.chuteCount = 0;
	field.valveCount = 0;
	const startBalance = balanceOfField(field);

	const half = Math.floor(sample / 2);
	let halfCount = null;
	runCoins(field, sample, value, (c, f) => {
		if (c + 1 === half) { halfCount = f.count; }
	});

	const endBalance = balanceOfField(field);
	const endCount = field.count;
	const denominator = field.thrownValue + startBalance - endBalance;
	const quote = field.wonValue / denominator;
	const valveShare = field.valveCount / sample;
	const stable = halfCount === null || halfCount === 0
		? true
		: Math.abs(endCount - halfCount) / halfCount < K2_STABILITY_MAX;

	const { layers, upperShare } = stackStats(field);

	// K6: Einwurf abstellen, vier Umläufe weiterrechnen, den Vorschub der
	// vordersten Münze der OBEREN Ebene messen. Das ist F-20 in klein – die
	// Prüfung im Nachweisskript ist die strengere, hier geht es nur darum,
	// unbrauchbare Kandidaten früh auszusortieren.
	const frontBefore = frontOfUpperDeck(field);
	for (let s = 0; s < K6_CYCLES * PLATE_PERIOD_STEPS; s++) { field.step(); }
	const frontAfter = frontOfUpperDeck(field);
	const advancePerCycle = frontBefore === Infinity ? 0 : (frontBefore - frontAfter) / K6_CYCLES;

	const k1 = valveShare < K1_VALVE_MAX;
	const k2 = stable;
	const k3 = quote >= K3_QUOTE_MIN;
	const k4 = layers > K4_LAYERS_MIN;
	const k5 = upperShare >= K5_SHARE_MIN && (1 - upperShare) >= K5_SHARE_MIN;
	const k6 = advancePerCycle >= K6_ADVANCE_MIN;

	return {
		quote, valveShare, stable, halfCount, endCount, layers, upperShare, advancePerCycle,
		k1, k2, k3, k4, k5, k6, passAll: k1 && k2 && k3 && k4 && k5 && k6,
		margin: quote - K3_QUOTE_MIN,
	};
}

/**
 * Misst einen Kandidaten über alle vier Münzwerte.
 *
 * @param {object} layout
 * @param {number} warmup
 * @param {number} sample
 * @returns {{layout: object, byValue: Map<number, object>, passAll: boolean,
 *            criteriaScore: number, worstMargin: number}}
 */
function measureAllValues(layout, warmup, sample) {
	const byValue = new Map();
	let worstMargin = Infinity;
	// Rangzahl für die Auswahl der drei besten Kandidaten aus Stufe A: Summe
	// aller erfüllten Einzelkriterien über alle vier Münzwerte (0..24).
	// Eigene Auslegung des Implementierers, siehe Kopfkommentar oben.
	let criteriaScore = 0;
	for (const value of COIN_VALUES) {
		const result = measureCandidate(layout, value, warmup, sample);
		byValue.set(value, result);
		criteriaScore += [result.k1, result.k2, result.k3, result.k4, result.k5, result.k6].filter(Boolean).length;
		if (result.margin < worstMargin) { worstMargin = result.margin; }
	}
	const passAll = [...byValue.values()].every((r) => r.passAll);
	return { layout, byValue, passAll, criteriaScore, worstMargin };
}

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) { return 'unbekannt'; }
	const totalSeconds = Math.round(seconds);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	if (h > 0) { return `${h} h ${m} min`; }
	if (m > 0) { return `${m} min ${s} s`; }
	return `${s} s`;
}

/**
 * @param {number} quote
 * @returns {string}
 */
function formatPercent(quote) {
	return `${(quote * 100).toFixed(2)} %`.padStart(8);
}

/**
 * Wählt nach der Siegerregel aus Abschnitt „DIE SIEGERREGEL" oben, aber nur
 * unter Kandidaten, die passAll === true haben.
 *
 * @param {{layout: object, byValue: Map<number, object>, passAll: boolean,
 *          worstMargin: number}[]} candidates
 * @returns {object|null}
 */
function pickWinner(candidates) {
	const eligible = candidates.filter((c) => c.passAll);
	if (eligible.length === 0) { return null; }
	eligible.sort((a, b) => {
		if (a.worstMargin !== b.worstMargin) { return b.worstMargin - a.worstMargin; }
		const areaA = a.layout.fieldWidth * a.layout.fieldDepth;
		const areaB = b.layout.fieldWidth * b.layout.fieldDepth;
		if (areaA !== areaB) { return areaA - areaB; }
		return a.layout.fieldDepth - b.layout.fieldDepth;
	});
	return eligible[0];
}

/**
 * @param {object} layout
 * @returns {string}
 */
function formatLayout(layout) {
	return `W${layout.fieldWidth} D${layout.fieldDepth} L${layout.lowerDepth} `
		+ `P${layout.plateStroke} A${layout.allowedLayers}`;
}

/**
 * Druckt eine Ergebniszeile: Layout, je Münzwert Quote und Kriterienstatus,
 * dann Zusammenfassung.
 *
 * @param {{layout: object, byValue: Map<number, object>, passAll: boolean,
 *          worstMargin: number}} result
 * @returns {void}
 */
function printRow(result) {
	const parts = [...result.byValue.entries()].map(([value, r]) => {
		const flags = `${r.k1 ? '1' : '-'}${r.k2 ? '2' : '-'}${r.k3 ? '3' : '-'}${r.k4 ? '4' : '-'}`
			+ `${r.k5 ? '5' : '-'}${r.k6 ? '6' : '-'}`;
		return `${value}:${formatPercent(r.quote)}[${flags}]`;
	});
	console.log(`  ${formatLayout(result.layout).padEnd(28)} ${parts.join('  ')}  `
		+ `${result.passAll ? 'ALLE BESTANDEN' : ''}`);
}

const { stage, widths: cliWidths, depths: cliDepths } = parseArgs(process.argv.slice(2));

/* ------------------------------------------------------------------------
   Anfängliche Laufzeitschätzung, VOR dem ersten Lauf gedruckt. Zeichengleich
   aus tune-chute.mjs übernommen, nur die Kandidatenzahl ist eine andere.
   ------------------------------------------------------------------------ */

const stageAWidths = cliWidths ?? STAGE_A_WIDTHS;
const stageADepths = cliDepths ?? STAGE_A_DEPTHS;
const stageACandidateCount = stage === 'b' ? 0 : stageAWidths.length * stageADepths.length;
const stageAStepsPerCandidate = COIN_VALUES.length
	* ((STAGE_A_WARMUP + STAGE_A_SAMPLE) * THROW_INTERVAL_STEPS + K6_CYCLES * PLATE_PERIOD_STEPS);
const stageBCombosPerBase = STAGE_B_LOWER_FACTORS.length * STAGE_B_PLATE_STROKES.length * STAGE_B_ALLOWED_LAYERS.length;
const stageBBaseCount = stage === 'a' ? 0 : (stage === 'b' && cliWidths !== null ? cliWidths.length : STAGE_B_CANDIDATE_COUNT);
const stageBStepsPerCombo = COIN_VALUES.length
	* ((STAGE_B_WARMUP + STAGE_B_SAMPLE) * THROW_INTERVAL_STEPS + K6_CYCLES * PLATE_PERIOD_STEPS);

const totalSteps = stageACandidateCount * stageAStepsPerCandidate
	+ stageBBaseCount * stageBCombosPerBase * stageBStepsPerCombo;

const calibrationLayout = { fieldWidth: stageAWidths[0], fieldDepth: stageADepths[0] };
const calibrationField = new Field({ random: createSeeded(SEEDS[1]), chuteReach: 0, layout: calibrationLayout });
const calibrationStart = process.hrtime.bigint();
let calibrationThrows = 0;
for (let step = 0; step < CALIBRATION_STEPS; step++) {
	if (step % THROW_INTERVAL_STEPS === 0) {
		calibrationField.throwCoin(COIN_VALUES[calibrationThrows % COIN_VALUES.length]);
		calibrationThrows++;
	}
	calibrationField.step();
}
const calibrationSeconds = Number(process.hrtime.bigint() - calibrationStart) / 1e9;
const stepsPerSecond = CALIBRATION_STEPS / calibrationSeconds;
const estimatedSeconds = totalSteps / stepsPerSecond;

console.log(`Suchlauf Stufe ${stage} über die Maßordnung (vierte Auslegung).`);
console.log(`Kalibrierung: ${Math.round(stepsPerSecond).toLocaleString('de-DE')} Zeitschritte/s auf dieser Maschine `
	+ `(${CALIBRATION_STEPS.toLocaleString('de-DE')} Schritte gemessen).`);
console.log(`Geschätzte Gesamtlaufzeit: ${formatDuration(estimatedSeconds)} für `
	+ `${totalSteps.toLocaleString('de-DE')} Zeitschritte insgesamt.\n`);

const overallStart = process.hrtime.bigint();
let stepsDone = 0;

/* ------------------------------------------------------------------------
   Stufe A
   ------------------------------------------------------------------------ */

/** @type {{layout: object, byValue: Map<number, object>, passAll: boolean,
 *          criteriaScore: number, worstMargin: number}[]} */
let stageAResults = [];

if (stage !== 'b') {
	console.log(`STUFE A – grob: ${stageAWidths.length} Breiten × ${stageADepths.length} Tiefen `
		+ `× ${COIN_VALUES.length} Münzwerte, ${STAGE_A_WARMUP} Einlauf + ${STAGE_A_SAMPLE} gezählt je Münzwert.`);
	console.log('  Layout                       je Münzwert: Quote[Kriterienflags 1-6]\n');

	for (const fieldWidth of stageAWidths) {
		for (const fieldDepth of stageADepths) {
			const lowerDepth = Math.round(STAGE_A_LOWER_FACTOR * fieldDepth);
			const layout = {
				fieldWidth, fieldDepth, lowerDepth,
				plateStroke: STAGE_A_PLATE_STROKE,
				allowedLayers: STAGE_A_ALLOWED_LAYERS,
			};
			const result = measureAllValues(layout, STAGE_A_WARMUP, STAGE_A_SAMPLE);
			stageAResults.push(result);
			printRow(result);

			stepsDone += stageAStepsPerCandidate;
			const elapsedSeconds = Number(process.hrtime.bigint() - overallStart) / 1e9;
			const remainingSeconds = (elapsedSeconds / stepsDone) * (totalSteps - stepsDone);
			if (stepsDone % (stageAStepsPerCandidate * 4) === 0) {
				console.log(`    [verbleibend geschätzt ${formatDuration(remainingSeconds)}]`);
			}
		}
	}
	console.log('');
}

if (stage === 'a') {
	const winnerA = pickWinner(stageAResults);
	if (winnerA !== null) {
		console.log(`Stufe A alleine hätte bereits einen gültigen Kandidaten: ${formatLayout(winnerA.layout)} `
			+ `(worstMargin ${(winnerA.worstMargin * 100).toFixed(2)} Punkte). Stufe B verfeinert trotzdem.`);
	} else {
		console.log('Kein Stufe-A-Kandidat erfüllt bereits alle sechs Kriterien für alle vier Münzwerte '
			+ '– erwartet, dafür gibt es Stufe B.');
	}
	console.log('\n--stage=a beendet den Lauf hier, ohne Stufe B und ohne Empfehlung.');
	process.exit(0);
}

/* ------------------------------------------------------------------------
   Stufe B
   ------------------------------------------------------------------------ */

/** @type {{fieldWidth: number, fieldDepth: number}[]} */
let stageBBases;
if (stage === 'b' && cliWidths !== null && cliDepths !== null) {
	stageBBases = cliWidths.map((fieldWidth, index) => ({ fieldWidth, fieldDepth: cliDepths[index] }));
} else {
	// Rangfolge: zuerst die Zahl der über alle vier Münzwerte erfüllten
	// Einzelkriterien, dann der Abstandswert der Siegerregel – siehe
	// Kopfkommentar, Abschnitt „DER ABLAUF, ZWEISTUFIG".
	const ranked = [...stageAResults].sort((a, b) => {
		if (a.criteriaScore !== b.criteriaScore) { return b.criteriaScore - a.criteriaScore; }
		return b.worstMargin - a.worstMargin;
	});
	stageBBases = ranked.slice(0, STAGE_B_CANDIDATE_COUNT).map((r) => ({
		fieldWidth: r.layout.fieldWidth,
		fieldDepth: r.layout.fieldDepth,
	}));
}

console.log(`STUFE B – fein, um ${stageBBases.length} Grundfläche(n) aus Stufe A: `
	+ stageBBases.map((b) => `${b.fieldWidth}×${b.fieldDepth}`).join(', '));
console.log(`  ${STAGE_B_LOWER_FACTORS.length} lowerDepth-Faktoren × ${STAGE_B_PLATE_STROKES.length} plateStroke `
	+ `× ${STAGE_B_ALLOWED_LAYERS.length} allowedLayers, ${STAGE_B_WARMUP} Einlauf + ${STAGE_B_SAMPLE} gezählt `
	+ 'je Münzwert.\n');

/** @type {{layout: object, byValue: Map<number, object>, passAll: boolean,
 *          criteriaScore: number, worstMargin: number}[]} */
const stageBResults = [];

for (const base of stageBBases) {
	for (const factor of STAGE_B_LOWER_FACTORS) {
		for (const plateStroke of STAGE_B_PLATE_STROKES) {
			for (const allowedLayers of STAGE_B_ALLOWED_LAYERS) {
				const lowerDepth = Math.round(factor * base.fieldDepth);
				const layout = {
					fieldWidth: base.fieldWidth, fieldDepth: base.fieldDepth,
					lowerDepth, plateStroke, allowedLayers,
				};
				const result = measureAllValues(layout, STAGE_B_WARMUP, STAGE_B_SAMPLE);
				stageBResults.push(result);
				printRow(result);

				stepsDone += stageBStepsPerCombo;
			}
		}
		const elapsedSeconds = Number(process.hrtime.bigint() - overallStart) / 1e9;
		const remainingSeconds = (elapsedSeconds / Math.max(1, stepsDone)) * (totalSteps - stepsDone);
		console.log(`    [verbleibend geschätzt ${formatDuration(remainingSeconds)}]`);
	}
}
console.log('');

/* ------------------------------------------------------------------------
   Sieger nach der festgeschriebenen Regel.
   ------------------------------------------------------------------------ */

const winner = pickWinner(stageBResults);

if (winner !== null) {
	console.log('EMPFEHLUNG:');
	console.log(`  FIELD_WIDTH   = ${winner.layout.fieldWidth}`);
	console.log(`  FIELD_DEPTH   = ${winner.layout.fieldDepth}`);
	console.log(`  LOWER_DEPTH   = ${winner.layout.lowerDepth}`);
	console.log(`  PLATE_STROKE  = ${winner.layout.plateStroke}`);
	console.log(`  ALLOWED_LAYERS = ${winner.layout.allowedLayers}`);
	console.log(`  Abstand des ungünstigsten Münzwerts zu K3 (60 %): `
		+ `${(winner.worstMargin * 100).toFixed(2)} Prozentpunkte.`);
	for (const [value, r] of winner.byValue) {
		console.log(`  Münzwert ${value}: Quote ${formatPercent(r.quote)}, Ventilanteil `
			+ `${(r.valveShare * 100).toFixed(3)} %, Stapelhöhe ${r.layers.toFixed(2)}, `
			+ `obere Ebene ${(r.upperShare * 100).toFixed(1)} %`);
	}
	process.exit(0);
}

console.log('KEIN Kandidat aus Stufe B erfüllt „alle sechs Kriterien für alle vier Münzwerte" – siehe die fünf '
	+ 'Sonderfälle im Kopfkommentar.');

const allFailK6 = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k6));
if (allFailK6) {
	console.log('Sonderfall „alle reißen K6": kein Vorschub ohne Einwurf – das ist NICHT die Maßordnung, sondern '
		+ 'die Neigung oder die Reibung. SLOPE_SIN innerhalb von 3 bis 5 Grad erhöhen (0,07 -> 0,08), sonst '
		+ 'PLATE_STROKE vergrößern – der Vorschub wächst QUADRATISCH mit der Deckgeschwindigkeit. NIE die '
		+ 'Reibungszahlen kleiner machen, um den Vorschub zu erzwingen: sie sind Werkstoffwerte, keine '
		+ 'Stellschrauben.');
}

const allFailK3 = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k3));
if (allFailK3) {
	console.log('Sonderfall „alle reißen K3": die Quote liegt schon ohne Ablenkleisten unter 60 % – die '
		+ 'Berührungskette trägt zu weit, das Feld läuft leer. FIELD_DEPTH vergrößern oder PLATE_STROKE '
		+ 'verkleinern – NIE FILL_TARGET.');
}

const allFailK4 = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k4));
if (allFailK4) {
	console.log('Sonderfall „alle reißen K4": kein Stapeln – zuerst prüfen, ob die Berichtigung in '
		+ 'settleHeights()/restHeight() noch steht (DECISIONS.md, 2026-09-04); das war beim letzten Mal die '
		+ 'Ursache, nicht SUPPORT_REACH.');
}

const allFailK5Upper = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k5 && v.upperShare > 0.5));
const allFailK5Lower = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k5 && v.upperShare < 0.5));
if (allFailK5Upper) {
	console.log('Sonderfall „alle reißen K5, alles liegt oben": LOWER_DEPTH vergrößern.');
}
if (allFailK5Lower) {
	console.log('Sonderfall „alle reißen K5, alles liegt unten": LOWER_DEPTH verkleinern.');
}

const allFailK1 = stageBResults.every((r) => [...r.byValue.values()].every((v) => !v.k1));
if (allFailK1) {
	console.log('Sonderfall „alle reißen K1": ALLOWED_LAYERS erhöhen, höchstens bis 2,8.');
}

process.exit(1);
