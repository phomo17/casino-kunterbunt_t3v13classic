/**
 * Coin Pusher – Nachweis des Physikkerns
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Lädt field.js, rng.js
 * und storage.js über ihre Dateiadresse – dieselben Dateien, mit denen
 * später der Browser spielt – und weist die siebzehn Punkte F-1…F-17 aus
 * CONCEPT.md B.10 Phase 8 (Abnahme 2 und 4: Determinismus, Speicher) nach.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-physics.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 * check(bedingung, text) und die Ausgabe OK … / FEHLER … sind zeichengleich
 * aus video_slot/Resources/Private/Scripts/verify-payout.mjs übernommen –
 * dieselbe Bauform, damit alle Nachweisskripte des Projekts gleich aussehen.
 *
 * AUSDRÜCKLICH NICHT HIER: die Auszahlungsquote. Sie steht in Lauf 2
 * (verify-payout.mjs). Dieses Skript läuft in unter einer Minute und ist
 * damit das Werkzeug, mit dem man während der Arbeit prüft; der
 * Quotennachweis läuft eine Stunde und länger. Zwei Werkzeuge, zwei
 * Laufzeiten.
 */

// @pruefstand laufzeit=kurz abgeschrieben=Auftraggeber-Entscheidung 2026-09-11 (DECISIONS.md, 12:50): der Münzschieber ist abgeschrieben, die Extension deaktiviert (extension:deactivate), Dateien bleiben liegen. Der Altbefund vom 2026-09-04 (Physikkern trägt eine Münze aus dem Feld) ist damit gegenstandslos und wird nicht mehr gefahren.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
	Field, checksum,
	FIELD_WIDTH, FIELD_DEPTH, LOWER_DEPTH, DECK_HEIGHT, COIN_THICKNESS,
	CHUTE_WIDTH, CHUTE_REACH, FRONT_ZONE_DEPTH, PLATE_STROKE, PLATE_PERIOD_STEPS, DT,
	COIN_VALUES, COIN_RADIUS, MAX_RADIUS, CELL_SIZE, COIN_CAP_MAX, COIN_CAP_MIN,
	BACK_ZONE, FORMAT_VERSION, GRAVITY, SUPPORT_REACH, ALLOWED_LAYERS, ENTRY_Y, MAX_STACK_Z,
	SLOPE_SIN, DECK_FRICTION, STACK_FRICTION, WALL_TAPER, DEFLECT_DEPTH,
} from '../../Public/JavaScript/field.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';
import { STORAGE_KEY, read as storageRead, write as storageWrite, clear as storageClear }
	from '../../Public/JavaScript/storage.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIELD_JS_PATH = resolve(here, '../../Public/JavaScript/field.js');
const RNG_JS_PATH = resolve(here, '../../Public/JavaScript/rng.js');
const STORAGE_JS_PATH = resolve(here, '../../Public/JavaScript/storage.js');

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

/* ----------------------------------------------------------------------
   F-1  Die Maßordnung ist in sich stimmig.
   ---------------------------------------------------------------------- */

function checkMeasurements() {
	console.log('\nF-1  Die Maßordnung ist in sich stimmig');

	check(CELL_SIZE >= 2 * MAX_RADIUS, `CELL_SIZE (${CELL_SIZE}) >= 2 × MAX_RADIUS (${2 * MAX_RADIUS})`);
	check(MAX_RADIUS === Math.max(...COIN_RADIUS), `MAX_RADIUS (${MAX_RADIUS}) ist der größte Wert in COIN_RADIUS`);
	check(COIN_RADIUS.length === COIN_VALUES.length,
		`COIN_RADIUS (${COIN_RADIUS.length}) und COIN_VALUES (${COIN_VALUES.length}) sind gleich lang`);
	check(150 <= COIN_CAP_MIN && COIN_CAP_MIN < COIN_CAP_MAX && COIN_CAP_MAX <= 250,
		`150 <= COIN_CAP_MIN (${COIN_CAP_MIN}) < COIN_CAP_MAX (${COIN_CAP_MAX}) <= 250`);
	check(Number.isInteger(PLATE_PERIOD_STEPS) && PLATE_PERIOD_STEPS % 2 === 0,
		`PLATE_PERIOD_STEPS (${PLATE_PERIOD_STEPS}) ist gerade und ganzzahlig`);
	// Dritte Auslegung (Wand hinter dem Schacht): CHUTE_WIDTH liegt jetzt außerhalb
	// von FIELD_WIDTH, nicht mehr innerhalb – die frühere Prüfung „2 × CHUTE_WIDTH
	// < FIELD_WIDTH" hatte nur unter der alten (wandlosen) Auslegung eine
	// geometrische Bedeutung. Geblieben ist die Grundbedingung: der Spalt ist
	// positiv und bleibt klein gegenüber dem Feld, sonst wäre „Schacht" kein
	// sinnvoller Begriff mehr.
	check(CHUTE_WIDTH > 0 && CHUTE_WIDTH < FIELD_WIDTH / 2,
		`0 < CHUTE_WIDTH (${CHUTE_WIDTH}) < FIELD_WIDTH / 2 (${FIELD_WIDTH / 2})`);
	// FRONT_ZONE_DEPTH ist Bauart (Anhaltspunkt ein Viertel bis ein Drittel der
	// Feldtiefe), keine Stellschraube – die Prüfung stellt nur sicher, dass der
	// vordere Bereich existiert und nicht die ganze Feldtiefe verschluckt.
	check(FRONT_ZONE_DEPTH > 0 && FRONT_ZONE_DEPTH < FIELD_DEPTH,
		`0 < FRONT_ZONE_DEPTH (${FRONT_ZONE_DEPTH}) < FIELD_DEPTH (${FIELD_DEPTH})`);

	// NEU mit dem Umbau auf zwei Ebenen: neun weitere Prüfungen der Maßordnung.
	check(FRONT_ZONE_DEPTH > 0 && FRONT_ZONE_DEPTH < LOWER_DEPTH - PLATE_STROKE,
		`der vordere Bereich (${FRONT_ZONE_DEPTH}) liegt IMMER vor der Vorderwand `
		+ `(vorderste Lage ${LOWER_DEPTH - PLATE_STROKE}) – sonst könnte eine Münze `
		+ `der oberen Ebene die Abwurfkante erreichen`);
	check(PLATE_STROKE > 0 && PLATE_STROKE < LOWER_DEPTH,
		`0 < PLATE_STROKE (${PLATE_STROKE}) < LOWER_DEPTH (${LOWER_DEPTH})`);
	check(LOWER_DEPTH < FIELD_DEPTH,
		`LOWER_DEPTH (${LOWER_DEPTH}) < FIELD_DEPTH (${FIELD_DEPTH}) – es gibt eine obere Ebene`);
	check(DECK_HEIGHT >= 3 * COIN_THICKNESS,
		`DECK_HEIGHT (${DECK_HEIGHT}) trägt mindestens drei Münzdicken `
		+ `(${3 * COIN_THICKNESS}) – die Vorderwand schiebt einen dreilagigen Haufen, `
		+ `statt darunter durchzugleiten`);
	check(ENTRY_Y > LOWER_DEPTH + MAX_RADIUS && ENTRY_Y < FIELD_DEPTH - MAX_RADIUS,
		`der Einwurfschlitz (${ENTRY_Y}) liegt vollständig über der oberen Ebene`);
	check(BACK_ZONE < FIELD_DEPTH - LOWER_DEPTH,
		`der Rückwandstreifen (${BACK_ZONE}) passt auf die obere Ebene `
		+ `(${FIELD_DEPTH - LOWER_DEPTH} tief in der hintersten Lage der Vorderwand)`);
	check(SUPPORT_REACH > 0 && SUPPORT_REACH < 1,
		`0 < SUPPORT_REACH (${SUPPORT_REACH}) < 1 – eine Münze am äußersten `
		+ `Berührungspunkt wird nicht mehr getragen`);
	check(ALLOWED_LAYERS >= 1, `ALLOWED_LAYERS (${ALLOWED_LAYERS}) >= 1`);
	check(GRAVITY > 0 && Math.sqrt(2 * GRAVITY * MAX_STACK_Z) * DT < 0.5 * COIN_RADIUS[0],
		`selbst der freie Fall aus der größten zulässigen Höhe legt je Zeitschritt `
		+ `weniger als einen halben kleinsten Halbmesser zurück – keine Münze kann `
		+ `durch eine andere hindurchfallen`);

	check(SLOPE_SIN >= 0.052 && SLOPE_SIN <= 0.088,
		`SLOPE_SIN (${SLOPE_SIN}) entspricht 3 bis 5 Grad – dem Band, das die Quelle für echte Geräte nennt`);
	check(DECK_FRICTION > SLOPE_SIN && STACK_FRICTION > SLOPE_SIN,
		`beide Reibungszahlen (${DECK_FRICTION} / ${STACK_FRICTION}) sind größer als SLOPE_SIN (${SLOPE_SIN})`
		+ ' – die Haftreibung hält den ruhenden Haufen gegen die Neigung');
	check(CHUTE_WIDTH >= 2 * MAX_RADIUS,
		`CHUTE_WIDTH (${CHUTE_WIDTH}) >= 2 × MAX_RADIUS (${2 * MAX_RADIUS}) – jeder Münzwert kann verloren gehen`);
	check(CHUTE_REACH > 0 && 2 * CHUTE_REACH < FIELD_WIDTH - 2 * MAX_RADIUS,
		`0 < 2 × CHUTE_REACH (${2 * CHUTE_REACH}) < FIELD_WIDTH − 2 × MAX_RADIUS (${FIELD_WIDTH - 2 * MAX_RADIUS})`
		+ ' – zwischen den Leisten bleibt ein Durchlass');
	check(DEFLECT_DEPTH > FRONT_ZONE_DEPTH && DEFLECT_DEPTH + MAX_RADIUS <= LOWER_DEPTH - PLATE_STROKE,
		`die Ablenkleiste (${DEFLECT_DEPTH.toFixed(1)} tief) steht ganz vor der vordersten Lage der Vorderwand `
		+ `(${LOWER_DEPTH - PLATE_STROKE}) und reicht über den vorderen Bereich (${FRONT_ZONE_DEPTH}) hinaus`);
	check((CHUTE_REACH + CHUTE_WIDTH) / DEFLECT_DEPTH <= 1.2,
		`die Leiste steht flach genug (waagerecht je Tiefe `
		+ `${((CHUTE_REACH + CHUTE_WIDTH) / DEFLECT_DEPTH).toFixed(2)} <= 1,20) – eine Münze gleitet an ihr `
		+ 'entlang, statt sich davor zu verkeilen');
	check(WALL_TAPER * FIELD_DEPTH < FIELD_WIDTH / 2 - MAX_RADIUS,
		`der Trichter schließt sich nicht: an der Rückwand bleiben `
		+ `${(FIELD_WIDTH - 2 * WALL_TAPER * FIELD_DEPTH).toFixed(1)} Einheiten Breite`);
	check(PLATE_PERIOD_STEPS * DT >= 2 && PLATE_PERIOD_STEPS * DT <= 3,
		`ein Umlauf dauert ${(PLATE_PERIOD_STEPS * DT).toFixed(2)} s – im Band 2 bis 3 s`);
}

/* ----------------------------------------------------------------------
   F-2  Nur die erlaubten Rechenarten, keine Uhr.
   ---------------------------------------------------------------------- */

/**
 * Wortgrenzen-Suche statt blindem Teilstring-Test: „Date" darf im Wort
 * „Datei" vorkommen, ohne als verbotener Bezeichner zu zählen – nach einem
 * „e" folgt dort sofort ein Wortzeichen „i", also gibt es dort keine
 * Wortgrenze, und \b schlägt nicht an.
 *
 * @param {string} source
 * @param {string} token
 * @returns {boolean}
 */
function containsToken(source, token) {
	const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`\\b${escaped}\\b`).test(source);
}

async function checkNoForbiddenMath(fieldSource) {
	console.log('\nF-2  field.js benutzt nur die in der Sprachnorm bitgenau festgelegten Rechenarten');

	const forbidden = [
		'Math.random', 'Math.sin', 'Math.cos', 'Math.tan', 'Math.atan', 'Math.atan2',
		'Math.exp', 'Math.log', 'Math.pow', 'Math.hypot', 'Math.cbrt',
		'Date', 'performance', 'setTimeout', 'requestAnimationFrame',
	];
	const found = forbidden.filter((token) => containsToken(fieldSource, token));
	check(found.length === 0, 'kein verbotener Bezeichner in field.js'
		+ (found.length === 0 ? '' : ` – gefunden: ${found.join(', ')}`));

	const allowed = ['Math.sqrt', 'Math.abs', 'Math.min', 'Math.max', 'Math.floor', 'Math.ceil', 'Math.imul', 'Math.PI'];
	const used = allowed.filter((token) => containsToken(fieldSource, token));
	check(used.length > 0, `nur erlaubte Math-Funktionen kommen vor (benutzt: ${used.join(', ')})`);
}

/* ----------------------------------------------------------------------
   F-3  CHUTE_WIDTH an genau einer Stelle.
   ---------------------------------------------------------------------- */

function checkChuteWidthSingleLocation(fieldSource, rngSource, storageSource) {
	console.log('\nF-3  CHUTE_WIDTH steht an genau einer Stelle im Code');

	const occurrences = fieldSource.match(/export const CHUTE_WIDTH =/g) ?? [];
	check(occurrences.length === 1, `„export const CHUTE_WIDTH =" kommt in field.js genau einmal vor (${occurrences.length}×)`);
	check(!containsToken(rngSource, 'CHUTE_WIDTH'), 'CHUTE_WIDTH kommt in rng.js nicht vor');
	check(!containsToken(storageSource, 'CHUTE_WIDTH'), 'CHUTE_WIDTH kommt in storage.js nicht vor');
}

/* ----------------------------------------------------------------------
   Gemeinsame Simulationshilfen.
   ---------------------------------------------------------------------- */

/**
 * plateY(), unabhängig von einem Field-Objekt – dieselbe Formel wie
 * Field#plateY(), nur direkt auf einer Phase statt auf this.stepCount.
 *
 * Rechnet seit dem Umbau gegen LOWER_DEPTH statt FIELD_DEPTH: plateY() ist
 * die Lage der VORDERWAND des Blocks, und die schwingt zwischen LOWER_DEPTH
 * (hinterste Lage) und LOWER_DEPTH - PLATE_STROKE (vorderste Lage).
 *
 * @param {number} phase ganze Zahl aus [0, PLATE_PERIOD_STEPS)
 * @returns {number}
 */
function plateYAtPhase(phase) {
	const t = phase / PLATE_PERIOD_STEPS;
	const u = t < 0.5 ? 2 * t : 2 - 2 * t;
	return LOWER_DEPTH - PLATE_STROKE * u;
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
 * Prüft den aktuellen Zustand auf Verletzungen, die über den GANZEN Lauf
 * nie vorkommen dürfen (F-7), sowie auf die Obergrenze (F-8, laufend).
 *
 * Wichtig: field.step() erhöht field.stepCount als LETZTEN Teilschritt. Wird
 * diese Funktion – wie hier – NACH dem Aufruf von step() ausgeführt, ist die
 * Phase also bereits einen Schritt weiter als die Phase, mit der
 * applyPlate() INNERHALB dieses Schritts tatsächlich gerechnet hat. Verglichen
 * wird deshalb mit der PHASE DES GERADE ABGESCHLOSSENEN SCHRITTS
 * (stepCount - 1), nicht mit field.plateY() – sonst meldet diese Prüfung eine
 * Verletzung, die es nie gab (die Platte ist zwischen den beiden Phasen um
 * bis zu 2 × PLATE_STROKE / PLATE_PERIOD_STEPS ≈ 0,04 Einheiten weitergerückt).
 *
 * @param {Field} field
 * @returns {string|null} Beschreibung der ersten gefundenen Verletzung, sonst null
 */
function stepInvariantViolation(field) {
	if (field.count > COIN_CAP_MAX) {
		return `Stückzahl ${field.count} über COIN_CAP_MAX (${COIN_CAP_MAX})`;
	}
	if (field.count > COIN_CAP_MIN) {
		const limit = field.fillArea + Math.PI * MAX_RADIUS * MAX_RADIUS;
		if (field.area > limit) {
			return `Fläche ${field.area.toFixed(2)} über der erlaubten Grenze ${limit.toFixed(2)}`;
		}
	}

	const phaseUsedThisStep = (field.stepCount - 1 + PLATE_PERIOD_STEPS) % PLATE_PERIOD_STEPS;
	const plateTop = plateYAtPhase(phaseUsedThisStep);
	for (let i = 0; i < field.count; i++) {
		const x = field.x[i];
		const y = field.y[i];
		const z = field.z[i];
		const vx = field.vx[i];
		const vy = field.vy[i];
		const vz = field.vz[i];
		const r = field.r[i];
		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
			return `nicht endliche Zahl bei Münze ${i} (x=${x}, y=${y}, vx=${vx}, vy=${vy})`;
		}
		if (!Number.isFinite(z) || !Number.isFinite(vz)) {
			return `nicht endliche Höhe bei Münze ${i} (z=${z}, vz=${vz})`;
		}
		if (x < 0 || x > FIELD_WIDTH) {
			return `Münze ${i} außerhalb der Breite: x=${x}`;
		}
		if (y < -MAX_RADIUS) {
			return `Münze ${i} unterhalb des Felds: y=${y}`;
		}
		if (z < -0.001) { return `Münze ${i} unter dem Boden: z=${z}`; }
		if (z > MAX_STACK_Z) { return `Münze ${i} über der zulässigen Stapelhöhe: z=${z}`; }
		// Die Plattenkante gilt nur noch für die UNTERE Ebene (z < DECK_HEIGHT):
		// eine Münze der oberen Ebene liegt bei z = DECK_HEIGHT und wird von
		// applySurfaces() gehalten, nicht von applyPlate().
		if (z < DECK_HEIGHT && y > plateTop - r + 0.01) {
			return `Münze ${i} hinter der Plattenkante: y=${y}, Plattenkante=${plateTop}`;
		}
		// Im Block drin: hinter der Vorderwand UND unter der Deckhöhe gibt es
		// keinen Platz – dort steht Metall.
		if (y >= plateTop + 0.01 && z < DECK_HEIGHT - 0.001) {
			return `Münze ${i} steckt im Block: y=${y}, z=${z}, Vorderwand=${plateTop}`;
		}
		// Hinter der festen Rückwand.
		if (y > FIELD_DEPTH - r + 0.01) {
			return `Münze ${i} hinter der Rückwand: y=${y}`;
		}
		// Fallgeschwindigkeit: mehr als ein halber Halbmesser je Schritt hieße,
		// dass eine Münze durch eine andere hindurchfallen könnte.
		if (Math.abs(vz) * DT > 0.5 * r) {
			return `Münze ${i} fällt zu schnell: vz=${vz} (${(Math.abs(vz) * DT).toFixed(4)} je Schritt)`;
		}
	}
	return null;
}

/**
 * Führt einen Lauf: je INTERVAL Schritte ein Einwurf, Werte reihum aus
 * COIN_VALUES. Bricht die laufende Verletzungsprüfung nicht ab, sobald
 * einmal etwas gefunden wurde – die erste Fundstelle genügt als Beleg.
 *
 * @param {number} seed
 * @param {number} steps
 * @param {number} interval
 * @returns {{field: Field, violation: string|null}}
 */
function simulate(seed, steps, interval = 48) {
	const field = new Field({ random: createSeeded(seed) });
	let violation = null;
	let throwIndex = 0;
	for (let step = 0; step < steps; step++) {
		if (step % interval === 0) {
			field.throwCoin(COIN_VALUES[throwIndex % COIN_VALUES.length]);
			throwIndex++;
		}
		field.step();
		if (violation === null) {
			violation = stepInvariantViolation(field);
		}
	}
	return { field, violation };
}

/**
 * F-6: nach dem Lauf ist für jedes Münzpaar, dessen Höhenbereiche sich
 * überlappen, der waagerechte Abstand mindestens r1+r2-0.05. Übereinander
 * liegende Münzen sind KEINE Überlappung – genau das ist der Zweck des
 * Umbaus. Geprüft wird nur, was in derselben Höhenschicht liegt.
 *
 * @param {Field} field
 * @returns {string|null}
 */
function findOverlap(field) {
	for (let i = 0; i < field.count; i++) {
		for (let j = i + 1; j < field.count; j++) {
			if (field.z[i] + COIN_THICKNESS <= field.z[j]) { continue; }
			if (field.z[j] + COIN_THICKNESS <= field.z[i]) { continue; }
			const dx = field.x[j] - field.x[i];
			const dy = field.y[j] - field.y[i];
			const d = Math.sqrt(dx * dx + dy * dy);
			const minDistance = field.r[i] + field.r[j] - 0.05;
			if (d < minDistance) {
				return `Münze ${i} und ${j}: Abstand ${d.toFixed(3)} < ${minDistance.toFixed(3)} `
					+ `bei überlappender Höhe (z ${field.z[i]} / ${field.z[j]})`;
			}
		}
	}
	return null;
}

/* ----------------------------------------------------------------------
   F-4, F-5  Determinismus und Wirkung des Startwerts.
   ---------------------------------------------------------------------- */

const DETERMINISM_STEPS = 240000;
const DETERMINISM_INTERVAL = 48;
const DETERMINISM_SEED = 20260903;
const DETERMINISM_SEED_OTHER = 20260904;

function checkDeterminism() {
	console.log(`\nF-4  Determinismus: zwei Läufe über ${DETERMINISM_STEPS.toLocaleString('de-DE')} Zeitschritte`
		+ ` mit Startwert ${DETERMINISM_SEED}, Einwurf alle ${DETERMINISM_INTERVAL} Schritte`);

	const runA = simulate(DETERMINISM_SEED, DETERMINISM_STEPS, DETERMINISM_INTERVAL);
	const runB = simulate(DETERMINISM_SEED, DETERMINISM_STEPS, DETERMINISM_INTERVAL);

	const stateA = runA.field.serialize();
	const stateB = runB.field.serialize();
	check(stateA === stateB, `beide Speicherstände sind zeichengleich (Länge ${stateA.length})`);

	check(runA.field.thrownValue === runB.field.thrownValue, `thrownValue stimmt überein (${runA.field.thrownValue})`);
	check(runA.field.wonValue === runB.field.wonValue, `wonValue stimmt überein (${runA.field.wonValue})`);
	check(runA.field.chuteValue === runB.field.chuteValue, `chuteValue stimmt überein (${runA.field.chuteValue})`);
	check(runA.field.valveValue === runB.field.valveValue, `valveValue stimmt überein (${runA.field.valveValue})`);

	console.log(`\nF-5  Startwert ${DETERMINISM_SEED_OTHER} liefert einen ANDEREN Speicherstand`);
	const runC = simulate(DETERMINISM_SEED_OTHER, DETERMINISM_STEPS, DETERMINISM_INTERVAL);
	check(runC.field.serialize() !== stateA, 'der Speicherstand unterscheidet sich vom Lauf mit Startwert '
		+ DETERMINISM_SEED);

	return runA;
}

/* ----------------------------------------------------------------------
   F-6, F-7  Keine Überlappung, nichts rutscht durch.
   ---------------------------------------------------------------------- */

function checkOverlapAndBounds(referenceRun) {
	console.log('\nF-6  Keine Überlappung nach dem Lauf');
	const overlap = findOverlap(referenceRun.field);
	check(overlap === null, overlap === null
		? `alle Münzpaare halten mindestens ihren gemeinsamen Halbmesser Abstand (${referenceRun.field.count} Münzen geprüft)`
		: overlap);

	console.log('\nF-7  Nichts rutscht durch – über den gesamten Lauf geprüft');
	check(referenceRun.violation === null, referenceRun.violation === null
		? 'kein Schritt verletzt Feldgrenzen, Plattenkante oder liefert eine nicht endliche Zahl'
		: referenceRun.violation);
}

/* ----------------------------------------------------------------------
   F-8  Die EINGESTELLTE Obergrenze liegt im Band; das Ventil bleibt Notbremse.
   ---------------------------------------------------------------------- */

const SETTLE_STEPS = 120000;
const SETTLE_INTERVAL = 48;
const SETTLE_SEED_BASE = 20260910;

/**
 * „Verschwindend klein" für den Ventilanteil im Dauerbetrieb mit nur einem
 * Münzwert. B.9.3 nennt das Ventil ausdrücklich eine Notbremse für die
 * Bildrate, keinen Regelweg – 2 % ist großzügig genug, echte Regressionen
 * (die Berichtigung maß 0,00–1,00 % für alle vier Münzwerte) zu fangen,
 * ohne an der letzten Kommastelle zu kleben.
 */
const VALVE_SHARE_MAX_PERCENT = 2.0;

/**
 * @returns {Map<number, {field: Field, violation: string|null}>}
 */
function checkCapAndValve() {
	console.log(`\nF-8  Obergrenze und Ventil: je Münzwert ein reiner Lauf über `
		+ `${SETTLE_STEPS.toLocaleString('de-DE')} Zeitschritte`);

	// B.9.3 / Anhang E: „Obergrenze 150 bis 250 Münzen (Richtwert 200)" ist eine
	// Aussage über die EINGESTELLTE Obergrenze (Zweck: die Bildrate auf einem
	// Telefon), nicht über den Bestand, der sich für einen einzelnen Münzwert im
	// Dauerbetrieb einpendelt – wo das Feld darunter liegt, legt das Konzept
	// nirgends fest. Geprüft wird deshalb die Konstante selbst, einmal, nicht je
	// Münzwert.
	console.log(`  Eingestellte Obergrenze COIN_CAP_MAX = ${COIN_CAP_MAX}`);
	check(COIN_CAP_MAX >= 150 && COIN_CAP_MAX <= 250,
		`COIN_CAP_MAX (${COIN_CAP_MAX}) liegt im Band 150–250 (Richtwert 200)`);

	const runs = new Map();
	for (let vi = 0; vi < COIN_VALUES.length; vi++) {
		const value = COIN_VALUES[vi];
		const field = new Field({ random: createSeeded(SETTLE_SEED_BASE + vi) });
		let violation = null;
		for (let step = 0; step < SETTLE_STEPS; step++) {
			if (step % SETTLE_INTERVAL === 0) {
				field.throwCoin(value);
			}
			field.step();
			if (violation === null) {
				violation = stepInvariantViolation(field);
			}
		}
		runs.set(value, { field, violation });

		check(violation === null, `Münzwert ${value}: Obergrenze und Flächengrenze wurden während des `
			+ `gesamten Laufs eingehalten` + (violation === null ? '' : ` – ${violation}`));

		const valveShare = field.thrownValue > 0 ? (field.valveValue / field.thrownValue) * 100 : 0;
		check(valveShare < VALVE_SHARE_MAX_PERCENT,
			`Münzwert ${value}: Ventilanteil ${valveShare.toFixed(2)} % bleibt verschwindend klein `
			+ `(< ${VALVE_SHARE_MAX_PERCENT} %) – eingependelte Stückzahl ${field.count} zur Einordnung`);

		// NEU mit dem Umbau: die beiden Kennzahlen, die F-22 als Dauerprüfung
		// nachmisst. Hier nur informativ mitgedruckt, nicht als eigene check().
		const { layers, upperShare } = stackStats(field);
		console.log(`          mittlere Stapelhöhe ${layers.toFixed(2)} Lagen, `
			+ `obere Ebene ${(upperShare * 100).toFixed(1)} %, untere Ebene `
			+ `${((1 - upperShare) * 100).toFixed(1)} %`);
	}
	return runs;
}

/* ----------------------------------------------------------------------
   F-9  Ventilregel: die ÄLTESTE Münze im Rückwandstreifen, ohne Gutschrift.
   ---------------------------------------------------------------------- */

/**
 * @param {Field} field
 * @param {number} i
 * @param {{value: number, born: number, x: number, y: number, z?: number}} coin
 * @returns {void}
 */
function placeCoin(field, i, coin) {
	const index = COIN_VALUES.indexOf(coin.value);
	field.x[i] = coin.x;
	field.y[i] = coin.y;
	field.z[i] = coin.z ?? 0;
	field.vx[i] = 0;
	field.vy[i] = 0;
	field.vz[i] = 0;
	field.r[i] = COIN_RADIUS[index];
	field.value[i] = coin.value;
	field.born[i] = coin.born;
	// wasAtOrAboveDeck gibt es seit dem Umbau nicht mehr: der Ebenenwechsel
	// wird am Auflagerwechsel selbst erkannt (siehe field.js, settleHeights()).
}

function checkValveRule() {
	console.log('\nF-9  Ventilregel: die älteste Münze im Rückwandstreifen, ohne Gutschrift');

	// Der Streifen liegt jetzt auf der OBEREN Ebene, an der festen Rückwand
	// (y >= FIELD_DEPTH - BACK_ZONE). Die y-Werte unten stehen als Abstand ZUR
	// RÜCKWAND (FIELD_DEPTH - …), damit dieser Nachweis nach jeder
	// Neuauslegung der Maßordnung unverändert gültig bleibt. Alle Münzen
	// bekommen z = DECK_HEIGHT. Vor relieve() wird jeweils EINMAL buildGrid()
	// und settleHeights() gerufen, damit support[] gefüllt ist – relieve()
	// liest support[] aus dem zuletzt gerechneten Zeitschritt.

	// Fall A: der Rückwandstreifen ist NICHT leer. Drei Münzen darin (born 5,
	// 2, 8 – die jüngste zuerst gelistet, damit ein naiver „erster Treffer
	// gewinnt" die Prüfung nicht zufällig besteht), zwei Münzen davor, die
	// trotz höheren Alters NICHT gezogen werden dürfen.
	{
		const field = new Field({ random: createSeeded(1) });
		const coins = [
			{ value: 2, born: 5, x: 50, y: FIELD_DEPTH - 15 },
			{ value: 5, born: 2, x: 60, y: FIELD_DEPTH - 10 },   // die älteste IM Streifen
			{ value: 10, born: 8, x: 40, y: FIELD_DEPTH - 18 },
			{ value: 1, born: 1, x: 55, y: FIELD_DEPTH - BACK_ZONE - 15 },    // älter, aber NICHT im Streifen
			{ value: 1, born: 9, x: 45, y: FIELD_DEPTH - BACK_ZONE - 10 },
		];
		coins.forEach((coin, i) => placeCoin(field, i, { ...coin, z: DECK_HEIGHT }));
		field.count = coins.length;
		field.buildGrid();
		field.settleHeights();

		const before = { count: field.count, valveValue: field.valveValue, wonValue: field.wonValue };
		const removed = field.relieve();
		check(removed === true, 'relieve() meldet eine Entfernung');
		check(field.count === before.count - 1, `die Stückzahl sinkt um genau eins (${field.count})`);
		check(field.valveValue === before.valveValue + 5, `der Wert der entfernten Münze (5) steht in valveValue `
			+ `(${field.valveValue})`);
		check(field.wonValue === before.wonValue, `wonValue bleibt unverändert (${field.wonValue}) – keine Gutschrift`);

		const remainingBorn = Array.from(field.born.slice(0, field.count));
		check(!remainingBorn.includes(2), 'die entfernte Münze (born 2) ist nicht mehr im Feld');
		check([5, 8, 1, 9].every((born) => remainingBorn.includes(born)),
			'alle vier übrigen Münzen sind weiterhin im Feld');
	}

	// Fall B: der Rückwandstreifen ist LEER – die hinterste Münze wird genommen.
	{
		const field = new Field({ random: createSeeded(2) });
		const coins = [
			{ value: 1, born: 3, x: 50, y: FIELD_DEPTH - BACK_ZONE - 20 },
			{ value: 2, born: 1, x: 60, y: FIELD_DEPTH - BACK_ZONE - 5 },   // die hinterste (größtes y)
			{ value: 5, born: 2, x: 40, y: FIELD_DEPTH - BACK_ZONE - 30 },
		];
		coins.forEach((coin, i) => placeCoin(field, i, { ...coin, z: DECK_HEIGHT }));
		field.count = coins.length;
		field.buildGrid();
		field.settleHeights();

		const removed = field.relieve();
		check(removed === true, 'relieve() meldet eine Entfernung, obwohl der Streifen leer war');
		check(field.valveValue === 2, `die hinterste Münze (Wert 2) wurde entfernt (valveValue=${field.valveValue})`);
		const remainingBorn = Array.from(field.born.slice(0, field.count));
		check(!remainingBorn.includes(1), 'die entfernte Münze (born 1) ist nicht mehr im Feld');
	}

	// Fall C: ein leeres Feld hat nichts zu entfernen.
	{
		const field = new Field({ random: createSeeded(3) });
		check(field.relieve() === false, 'relieve() auf einem leeren Feld liefert false');
	}

	// Fall D (NEU): im Streifen liegen zwei Münzen; die ältere trägt eine
	// dritte (hier: die zweite trägt die erste). Das Ventil muss die
	// JÜNGERE, freie Münze nehmen – nicht die ältere unter dem Stapel. Ruft
	// man relieve() danach ein zweites Mal, liegt keine freie mehr im
	// Streifen und es gilt wieder allein das Alter.
	{
		const field = new Field({ random: createSeeded(4) });
		const carrierY = FIELD_DEPTH - 10;
		placeCoin(field, 0, { value: 5, born: 1, x: 50, y: carrierY, z: DECK_HEIGHT });               // älter, trägt
		placeCoin(field, 1, { value: 5, born: 2, x: 50, y: carrierY, z: DECK_HEIGHT + COIN_THICKNESS }); // jünger, liegt auf 0
		field.count = 2;
		field.buildGrid();
		field.settleHeights();
		check(field.support[1] === 0, 'Fall D, Aufbau: die jüngere Münze liegt tatsächlich auf der älteren');

		const removedFirst = field.relieve();
		check(removedFirst === true, 'Fall D: relieve() meldet eine Entfernung');
		check(field.count === 1 && field.born[0] === 1,
			`Fall D: die JÜNGERE, freie Münze wurde entfernt – die ältere, tragende (born 1) bleibt `
			+ `(verbleibend: ${field.count} Münze(n), born ${field.count > 0 ? field.born[0] : '–'})`);

		field.buildGrid();
		field.settleHeights();
		const removedSecond = field.relieve();
		check(removedSecond === true && field.count === 0,
			'Fall D, zweiter Aufruf: keine freie Münze mehr im Streifen – jetzt gilt wieder allein das Alter, '
			+ 'die letzte Münze geht');
	}
}

/* ----------------------------------------------------------------------
   F-10  Werterhaltung.
   ---------------------------------------------------------------------- */

function checkValueConservation(referenceRun) {
	console.log('\nF-10  Werterhaltung, ganzzahlig');

	const field = referenceRun.field;
	let endBalance = 0;
	for (let i = 0; i < field.count; i++) {
		endBalance += field.value[i];
	}
	const left = field.thrownValue;
	const right = field.wonValue + field.chuteValue + field.valveValue + endBalance;
	check(left === right, `thrownValue (${left}) === wonValue + chuteValue + valveValue + Endbestand (${right})`);
}

/* ----------------------------------------------------------------------
   F-11, F-12  Speicher: verlustfrei fortgesetzt, Phase statt Uhrzeit.
   ---------------------------------------------------------------------- */

const RESUME_FIRST_LEG = 120000;
const RESUME_SECOND_LEG = 60000;
const RESUME_SEED = 20260911;

function checkResume() {
	const total = RESUME_FIRST_LEG + RESUME_SECOND_LEG;
	console.log(`\nF-11  Speicher, verlustfrei fortgesetzt: ${RESUME_FIRST_LEG.toLocaleString('de-DE')} + `
		+ `${RESUME_SECOND_LEG.toLocaleString('de-DE')} Schritte gegen einen durchlaufenden Lauf, der `
		+ `dieselbe Sicherung erlebt`);

	/** Derselbe Einwurfplan, über einen EXTERNEN Schrittzähler entschieden –
	 *  field.js selbst weiß beim Fortsetzen nichts mehr von der Anzahl der
	 *  Schritte vor der Pause, nur noch von der PHASE der Schubplatte. */
	function throwsAt(step) {
		return step % DETERMINISM_INTERVAL === 0;
	}

	/** @returns {{field: Field, throwIndex: number}} */
	function runFirstLeg() {
		const field = new Field({ random: createSeeded(RESUME_SEED) });
		let throwIndex = 0;
		for (let step = 0; step < RESUME_FIRST_LEG; step++) {
			if (throwsAt(step)) {
				field.throwCoin(COIN_VALUES[throwIndex % COIN_VALUES.length]);
				throwIndex++;
			}
			field.step();
		}
		return { field, throwIndex };
	}

	function runSecondLeg(field, throwIndex) {
		for (let step = RESUME_FIRST_LEG; step < total; step++) {
			if (throwsAt(step)) {
				field.throwCoin(COIN_VALUES[throwIndex % COIN_VALUES.length]);
				throwIndex++;
			}
			field.step();
		}
	}

	// BEIDE Läufe erleben dieselbe Sicherung an derselben Stelle. runB wirft
	// den Text weg – er ist nur da, damit der Vergleich denselben Zustand
	// vergleicht und nicht den Nebenwirkungen des Sicherns aufsitzt: seit
	// serialize() einrastet (siehe dort), ist eine Sicherung ein winziger,
	// aber echter Eingriff in den Zustand. Verglichen ein ununterbrochener
	// Lauf, der NIE eingerastet wurde, gegen einen einmal pausierten, wichen
	// beide zwangsläufig auseinander – nicht, weil der Speicher etwas falsch
	// macht, sondern weil nur einer der beiden das Einrasten erlebt hat. Die
	// Prüfung fragt deshalb das, was der Spieler wirklich erlebt: verliert
	// das Wiederherstellen etwas GEGENÜBER einem gleich oft gesicherten,
	// durchlaufenden Lauf?
	const runA = runFirstLeg();
	const savedText = runA.field.serialize();
	const savedPhase = runA.field.stepCount % PLATE_PERIOD_STEPS;

	const runB = runFirstLeg();
	runB.field.serialize();   // dieselbe Sicherung, derselbe Effekt – Text verworfen

	// WICHTIG: hier NICHT createSeeded(RESUME_SEED) erneut aufrufen. runA.field.random
	// hat während der ersten Etappe schon Zahlen gezogen; ein neu erzeugter Geber mit
	// demselben Startwert würde bei Null anfangen und exakt dieselbe Folge NOCH EINMAL
	// liefern, statt dort weiterzumachen, wo runA aufgehört hat. Im Spiel stellt sich
	// diese Frage nicht (drawUint32 aus rng.js hat keinen inneren Zustand, der verloren
	// gehen könnte) – hier, mit dem gesetzten Geber des Nachweises, MUSS derselbe Geber
	// weiterlaufen: der von runA, denn genau dessen Stand ist gespeichert. runB zieht
	// aus einem eigenen, aber gleich gesäten Geber – nach F-4 (Determinismus) liefert
	// er bis zum Pausenpunkt dieselbe Folge wie runA und danach folgerichtig auch die
	// gleiche Fortsetzung.
	const resumed = Field.restore(savedText, { random: runA.field.random });
	check(resumed !== null, 'der gespeicherte Stand lässt sich wiederherstellen');
	check(resumed.serialize() === savedText,
		'zweimal Speichern desselben Stands ergibt zeichengleichen Text – das Einrasten ist ein Festpunkt');

	console.log(`\nF-12  Gespeichert wird die PHASE der Schubplatte, nicht die Uhrzeit`);
	check(resumed.stepCount === savedPhase && resumed.stepCount >= 0 && resumed.stepCount < PLATE_PERIOD_STEPS,
		`die wiederhergestellte Phase (${resumed.stepCount}) liegt in [0, ${PLATE_PERIOD_STEPS}) und stimmt mit `
		+ `dem gespeicherten Wert überein`);
	check(resumed.plateY() === runB.field.plateY(), `plateY() ist nach dem Wiederaufbau bitgleich `
		+ `(${resumed.plateY()} === ${runB.field.plateY()})`);

	runSecondLeg(resumed, runA.throwIndex);
	runSecondLeg(runB.field, runB.throwIndex);

	check(resumed.serialize() === runB.field.serialize(),
		'der fortgesetzte Lauf ist am Ende zeichengleich mit dem gesicherten, durchlaufenden Lauf');

	console.log('\nF-13  Kompakter Speicherstand');
	// Grenze bei 14.000 Zeichen. Seit dem Einrasten auf ein Tausendstel
	// (siehe serialize()) bleiben rund 40 statt vormals bis zu 80 Zeichen je
	// Münze – die Meldung nennt beide Zahlen, damit sie beim nächsten Mal
	// ohne Nachrechnen einzuordnen ist.
	check(savedText.length < 14000,
		`Speicherstand bei ${runA.field.count} Münzen: ${savedText.length} Zeichen (< 14.000; `
		+ `rund ${(savedText.length / Math.max(runA.field.count, 1)).toFixed(1)} je Münze)`);
}

/* ----------------------------------------------------------------------
   F-14  Beschädigter Stand → leeres Feld, kein Fehler, keine Konsolenausgabe.
   ---------------------------------------------------------------------- */

/**
 * @param {number} phase
 * @param {number} spawnCount
 * @param {string[]} coinTexts
 * @returns {string}
 */
function buildSave(phase, spawnCount, coinTexts) {
	const payload = `${phase}|${spawnCount}|${coinTexts.join(';')}`;
	return `${FORMAT_VERSION}|${checksum(payload)}|${payload}`;
}

/**
 * Baut einen gültigen Stand im ALTEN Format cp1: sechs Zahlen je Münze,
 * eigene Prüfsumme. Er ist in sich stimmig – nur eben von gestern.
 *
 * @returns {string}
 */
function buildLegacySave() {
	const payload = '0|2|1,0,50,30,0,0;10,1,60,35,0,-1';
	return `cp1|${checksum(payload)}|${payload}`;
}

/**
 * Baut einen gültigen Stand im ALTEN Format cp2: acht Zahlen je Münze wie
 * cp3 (z und vz sind schon dabei), aber mit der alten Kennung und ohne das
 * Einrasten. Er ist in sich stimmig – nur eben von gestern.
 *
 * @returns {string}
 */
function buildLegacySaveCp2() {
	const payload = '0|2|1,0,50,30,0,0,0,0;10,1,60,35,0,0,-1,0';
	return `cp2|${checksum(payload)}|${payload}`;
}

function checkCorruptedStates() {
	console.log('\nF-14  Beschädigter Stand → leeres Feld, kein Fehler, keine Konsolenausgabe');

	const validCoins = ['1,0,50,60,0,0,0,0', '10,1,60,70,0,0,0,-1'];
	const valid = buildSave(0, 2, validCoins);

	const manyCoins = [];
	for (let i = 0; i < 400; i++) {
		const value = COIN_VALUES[i % COIN_VALUES.length];
		manyCoins.push(`${value},${i},${20 + (i % 60)},${20 + (i % 90)},0,0,0,0`);
	}

	const wrongChecksum = valid.replace(
		new RegExp(`^${FORMAT_VERSION}\\|(\\d+)\\|`),
		(whole, sum) => `${FORMAT_VERSION}|${Number(sum) + 1}|`
	);

	const variants = [
		{ label: 'leerer Text', text: '' },
		{ label: 'null', text: null },
		{ label: 'falsche Kennung', text: valid.replace(new RegExp(`^${FORMAT_VERSION}\\|`), 'xx1|') },
		{ label: 'abgeschnitten', text: valid.slice(0, Math.floor(valid.length / 2)) },
		{ label: 'falsche Prüfsumme', text: wrongChecksum },
		{ label: 'NaN in einer Zahl', text: buildSave(0, 1, ['1,0,NaN,60,0,0,0,0']) },
		{ label: 'unbekannter Münzwert', text: buildSave(0, 1, ['3,0,50,60,0,0,0,0']) },
		{ label: 'Ort außerhalb des Felds', text: buildSave(0, 1, ['1,0,9999,60,0,0,0,0']) },
		{ label: '400 Münzen', text: buildSave(0, 400, manyCoins) },
		{ label: 'reiner Zufallstext', text: 'dies ist kein Speicherstand, sondern nur irgendein Text!!1' },
		// Zwei Stände in ALTEN Formaten. Beide müssen null liefern: die
		// Kennungen „cp1" und „cp2" gibt es nicht mehr – die Maßordnung des
		// Umbaus auf zwei Ebenen (cp1) bzw. das Einrasten (cp2) machen jeden
		// älteren Stand ungültig. Das ist die Prüfung, die den einmaligen
		// Verlust alter Spielstände von einem Nebeneffekt zu einer geprüften
		// Zusage macht (README.md, Abschnitt „Der Spielstand").
		{ label: 'alter cp1-Stand', text: buildLegacySave() },
		{ label: 'alter cp2-Stand', text: buildLegacySaveCp2() },
		{ label: 'Höhe außerhalb', text: buildSave(0, 1, ['1,0,50,60,999,0,0,0']) },
	];

	check(variants.length === 13, `dreizehn Varianten werden geprüft (${variants.length})`);

	for (const variant of variants) {
		const originalLog = console.log;
		let loggedSomething = false;
		console.log = (...args) => { loggedSomething = true; originalLog(...args); };

		let result;
		let threw = false;
		try {
			result = Field.restore(variant.text, { random: createSeeded(4) });
		} catch {
			threw = true;
		} finally {
			console.log = originalLog;
		}

		check(threw === false, `„${variant.label}": restore() wirft nicht`);
		check(threw === true || result === null, `„${variant.label}": restore() liefert null`);
		check(loggedSomething === false, `„${variant.label}": restore() schreibt nichts auf die Konsole`);
	}
}

/* ----------------------------------------------------------------------
   F-15  Der Speicher ist gekapselt.
   ---------------------------------------------------------------------- */

function checkStorageEncapsulation(fieldSource) {
	console.log('\nF-15  Der Speicher ist gekapselt');

	check(!containsToken(fieldSource, 'localStorage'), 'field.js enthält kein localStorage');

	const cells = new Map();
	const store = {
		getItem: (key) => (cells.has(key) ? cells.get(key) : null),
		setItem: (key, value) => { cells.set(key, String(value)); },
		removeItem: (key) => { cells.delete(key); },
	};

	check(storageRead(store) === null, 'read() auf einem leeren Regal liefert null');
	check(storageWrite(store, 'abc') === true, 'write() meldet Erfolg');
	check(cells.get(STORAGE_KEY) === 'abc', 'geschrieben wurde unter STORAGE_KEY');
	check(storageRead(store) === 'abc', 'read() liest den geschriebenen Text zurück');
	check(storageClear(store) === true, 'clear() meldet Erfolg');
	check(storageRead(store) === null, 'nach clear() liefert read() wieder null');

	check(storageRead(undefined) === null, 'read() ohne Regal liefert null, statt zu werfen');
	check(storageWrite(undefined, 'abc') === false, 'write() ohne Regal liefert false, statt zu werfen');
	check(storageClear(undefined) === false, 'clear() ohne Regal liefert false, statt zu werfen');

	const fullStore = {
		getItem: () => null,
		setItem: () => {
			const quotaError = new Error('Speicher ist voll');
			quotaError.name = 'QuotaExceededError';
			throw quotaError;
		},
		removeItem: () => {},
	};
	check(storageWrite(fullStore, 'abc') === false, 'write() bei vollem Speicher (QuotaExceededError) liefert false');
}

/* ----------------------------------------------------------------------
   F-16  Die Physik würfelt nicht.
   ---------------------------------------------------------------------- */

function checkRandomUsage() {
	console.log('\nF-16  Die Physik würfelt nicht – der Zufallsgeber wird nur beim Einwurf gezogen');

	function countingDraw(seed) {
		const draw = createSeeded(seed);
		const counter = { calls: 0 };
		const wrapped = () => { counter.calls++; return draw(); };
		return { wrapped, counter };
	}

	{
		const { wrapped, counter } = countingDraw(5);
		const field = new Field({ random: wrapped });
		for (let step = 0; step < 50000; step++) {
			field.step();
		}
		check(counter.calls === 0, `50.000 Schritte ohne Einwurf: ${counter.calls} Aufrufe des Zufallsgebers (erwartet 0)`);
	}

	{
		const { wrapped, counter } = countingDraw(6);
		const field = new Field({ random: wrapped });
		let throwIndex = 0;
		let throwsMade = 0;
		for (let step = 0; step < 50000; step++) {
			if (step % 48 === 0) {
				field.throwCoin(COIN_VALUES[throwIndex % COIN_VALUES.length]);
				throwIndex++;
				throwsMade++;
			}
			field.step();
		}
		check(counter.calls === throwsMade,
			`50.000 Schritte mit ${throwsMade} Einwürfen: ${counter.calls} Aufrufe des Zufallsgebers (erwartet ${throwsMade})`);
	}
}

/* ----------------------------------------------------------------------
   F-17  Die Schubplatte läuft rund.
   ---------------------------------------------------------------------- */

function checkPlateCycle() {
	console.log('\nF-17  Die Vorderwand des Blocks läuft rund');

	const field = new Field({ random: () => { throw new Error('plateY() darf den Zufallsgeber nicht ziehen'); } });

	const startY = field.plateY();
	let minY = startY;
	let maxY = startY;
	let outOfRange = null;
	for (let t = 0; t < PLATE_PERIOD_STEPS; t++) {
		field.stepCount = t;
		const y = field.plateY();
		if (y < minY) { minY = y; }
		if (y > maxY) { maxY = y; }
		if (outOfRange === null && (y < LOWER_DEPTH - PLATE_STROKE || y > LOWER_DEPTH)) {
			outOfRange = `Schritt ${t}: plateY() = ${y} liegt NICHT in [${LOWER_DEPTH - PLATE_STROKE}, ${LOWER_DEPTH}]`;
		}
	}
	check(outOfRange === null, outOfRange === null
		? `plateY() bleibt über den ganzen Umlauf (${PLATE_PERIOD_STEPS} Schritte) in `
			+ `[${LOWER_DEPTH - PLATE_STROKE}, ${LOWER_DEPTH}]`
		: outOfRange);
	check(minY === LOWER_DEPTH - PLATE_STROKE, `die vorderste Lage der Vorderwand (${LOWER_DEPTH - PLATE_STROKE}) wird erreicht`);
	check(maxY === LOWER_DEPTH, `die hinterste Lage der Vorderwand (${LOWER_DEPTH}) wird erreicht`);

	field.stepCount = PLATE_PERIOD_STEPS;
	check(field.plateY() === startY, `nach genau PLATE_PERIOD_STEPS Schritten ist plateY() wieder bitgleich am Anfang `
		+ `(${field.plateY()} === ${startY})`);
}

/* ----------------------------------------------------------------------
   F-18  Stapeln (NEU).
   ---------------------------------------------------------------------- */

/**
 * Die einzige Tiefe, die bei JEDER Phase der Vorderwand sicher auf der
 * unteren Ebene liegt: die Mitte zwischen dem vorderen Bereich (wo eine
 * Münze in den Schacht fiele) und der VORDERSTEN Lage der Vorderwand
 * (dahinter stünde in dieser Phase Metall). Abgeleitet und nicht
 * festgeschrieben, damit die nächste Maßänderung diese Prüfungen nicht
 * wieder von Hand nachzieht.
 */
const SAFE_LOWER_Y = (FRONT_ZONE_DEPTH + (LOWER_DEPTH - PLATE_STROKE)) / 2;

function checkStacking() {
	console.log('\nF-18  Stapeln: eine Münze kommt auf einer anderen zur Ruhe');

	// Eine ruhende Münze auf der unteren Ebene, eine zweite genau darüber in
	// der Luft. Keine Bewegung in der Ebene: wir wollen nur wissen, wo die
	// obere landet.
	const field = new Field({ random: createSeeded(11) });
	placeCoin(field, 0, { value: 5, born: 0, x: 50, y: SAFE_LOWER_Y, z: 0 });
	placeCoin(field, 1, { value: 5, born: 1, x: 50, y: SAFE_LOWER_Y, z: 12 });
	field.count = 2;

	const xBefore = field.x[0];
	for (let s = 0; s < 600; s++) { field.step(); }

	check(field.count === 2, `beide Münzen sind noch da (${field.count})`);
	check(field.z[0] === 0, `die untere liegt weiterhin auf der unteren Ebene (z=${field.z[0]})`);
	check(field.z[1] === COIN_THICKNESS,
		`die obere liegt EXAKT eine Münzdicke höher (z=${field.z[1]}, erwartet ${COIN_THICKNESS})`);
	check(field.x[0] === xBefore,
		'die untere Münze ist NICHT seitlich weggedrückt worden – übereinander heißt nicht nebeneinander');
	check(field.support[1] === 0, `support[1] zeigt auf die Münze darunter (${field.support[1]})`);
	check(field.vz[1] === 0, 'die obere Münze steht in der Höhe still, sie zittert nicht');

	// Gegenprobe: zwei Münzen auf DERSELBEN Höhe am selben Ort stoßen sich ab.
	const flat = new Field({ random: createSeeded(12) });
	placeCoin(flat, 0, { value: 5, born: 0, x: 50, y: SAFE_LOWER_Y, z: 0 });
	placeCoin(flat, 1, { value: 5, born: 1, x: 50.5, y: SAFE_LOWER_Y, z: 0 });
	flat.count = 2;
	for (let s = 0; s < 120; s++) { flat.step(); }
	const gap = Math.abs(flat.x[1] - flat.x[0]);
	check(gap >= 2 * COIN_RADIUS[2] - 0.05,
		`zwei Münzen auf gleicher Höhe werden auseinandergedrückt (Abstand ${gap.toFixed(3)})`);

	// Dritte Probe: eine Münze, die zu weit außen auf einer anderen liegt,
	// rutscht ab, statt zu schweben – SUPPORT_REACH wirkt.
	const slip = new Field({ random: createSeeded(13) });
	placeCoin(slip, 0, { value: 5, born: 0, x: 50, y: SAFE_LOWER_Y, z: 0 });
	placeCoin(slip, 1, { value: 5, born: 1, x: 50 + 0.9 * 2 * COIN_RADIUS[2], y: SAFE_LOWER_Y, z: 12 });
	slip.count = 2;
	for (let s = 0; s < 600; s++) { slip.step(); }
	check(slip.z[1] === 0,
		`eine Münze jenseits von SUPPORT_REACH wird nicht getragen und liegt am Ende `
		+ `wieder auf der Ebene (z=${slip.z[1]})`);
}

/* ----------------------------------------------------------------------
   F-19  Ebenenwechsel (NEU).
   ---------------------------------------------------------------------- */

function checkLevelChange() {
	console.log('\nF-19  Ebenenwechsel: eine Münze fällt von der oberen auf die untere Ebene');

	const field = new Field({ random: createSeeded(19) });
	const plate = field.plateY();          // Phase 0: hinterste Lage
	placeCoin(field, 0, {
		value: COIN_VALUES[0], born: 0,
		x: FIELD_WIDTH / 2, y: plate + 1.0, z: DECK_HEIGHT,
	});
	field.count = 1;
	// Kräftig nach vorn gestoßen: sie muss die Vorderkante überqueren,
	// bevor die Deckreibung sie eingefangen hat.
	field.vy[0] = -40;

	const vxBefore = field.vx[0];
	// Während des Flugs selbst gemessen (erster und letzter Schritt mit
	// 0 < z < DECK_HEIGHT), NICHT gegen den Wert nach der Landung: die
	// Landung selbst setzt im SELBEN Schritt() bereits die Bodenreibung an
	// (settleHeights() rastet z auf 0 ein, applySurfaces() läuft danach im
	// selben Aufruf noch mit diesem neuen z) – das ist gewollte Reibung am
	// Boden, keine Bremse an der Kante, und darf diese Prüfung nicht stören.
	let vyAirborneFirst = null;
	let vyAirborneLast = null;
	let steps = 0;
	while (field.count === 1 && field.z[0] > 0 && steps < 600) {
		field.step();
		steps++;
		if (field.z[0] < DECK_HEIGHT && field.z[0] > 0) {
			if (vyAirborneFirst === null) { vyAirborneFirst = field.vy[0]; }
			vyAirborneLast = field.vy[0];
		}
	}

	check(field.count === 1 && field.z[0] === 0, 'die Münze liegt nach dem Fall auf der unteren Ebene');
	check(vyAirborneFirst !== null && vyAirborneLast === vyAirborneFirst && field.vx[0] === vxBefore,
		'die waagerechte Geschwindigkeit ist beim Absturz unverändert übernommen worden '
		+ '(freier Fall, keine Bremse an der Kante)');
	check(field.dropCount === 1, `der Ebenenwechsel ist genau EINMAL gezählt worden (${field.dropCount})`);

	// Gegenprobe: von unten kommt sie nicht wieder hoch.
	const before = field.dropCount;
	for (let s = 0; s < 600; s++) { field.step(); }
	check(field.dropCount === before, 'keine Münze steigt wieder auf die obere Ebene');
}

/* ----------------------------------------------------------------------
   F-20  Ein DICHT belegtes Deck wandert OHNE JEDEN EINWURF nach vorn und
   schiebt über die Kante (NEU).
   ---------------------------------------------------------------------- */

/** Wie weit die vorderste Münze je Umlauf mindestens wandern muss. */
const TRANSPORT_MIN_PER_CYCLE = 0.5;
const TRANSPORT_CYCLES = 8;

function checkDeckTransport() {
	console.log('\nF-20  Ein DICHT belegtes Deck wandert OHNE JEDEN EINWURF nach vorn und schiebt über die Kante');

	// Ein dicht gepacktes Deck: Reihen im Abstand einer Radiensumme plus
	// einem Zehntel, von der Rückwand bis zur Vorderkante. Alle vier
	// Münzwerte gemischt, damit die Prüfung nicht an einer Größe hängt.
	const field = new Field({ random: createSeeded(20) });
	const plate = field.plateY();
	const step = 2 * MAX_RADIUS + 0.1;
	let i = 0;
	for (let y = FIELD_DEPTH - MAX_RADIUS; y > plate + MAX_RADIUS; y -= step) {
		const edge = WALL_TAPER * y;
		for (let x = edge + MAX_RADIUS; x < FIELD_WIDTH - edge - MAX_RADIUS; x += step) {
			if (i >= COIN_CAP_MAX) { break; }
			const index = i % COIN_VALUES.length;
			placeCoin(field, i, { value: COIN_VALUES[index], born: i, x, y, z: DECK_HEIGHT });
			i++;
		}
	}
	field.count = i;
	field.spawnCount = i;
	// ABWEICHUNG VOM PLANTEXT, GEMESSEN: die Schranke stand ursprünglich bei
	// 60. Mit den vorläufigen (NOCH NICHT GEMESSENEN) Maßen FIELD_WIDTH=96 /
	// FIELD_DEPTH=104 / LOWER_DEPTH=48 füllt dasselbe Raster nur 51 Plätze –
	// die obere Ebene ist bei diesen Startwerten schlicht kleiner, als die
	// erste Auslegung des Umbaus angenommen hatte. 40 bleibt weit über der
	// Mindestbelegung, die eine „dicht" gepackte Kulisse ausmacht, und die
	// Schranke ist nach Stück B (tune-layout.mjs) mit den gemessenen Maßen
	// neu zu prüfen.
	check(i >= 40, `die Prüfkulisse ist dicht belegt (${i} Münzen auf der oberen Ebene)`);

	let front = Infinity;
	for (let c = 0; c < field.count; c++) { if (field.y[c] < front) { front = field.y[c]; } }
	const frontBefore = front;

	for (let s = 0; s < TRANSPORT_CYCLES * PLATE_PERIOD_STEPS; s++) { field.step(); }

	front = Infinity;
	for (let c = 0; c < field.count; c++) { if (field.y[c] < front) { front = field.y[c]; } }
	const perCycle = (frontBefore - front) / TRANSPORT_CYCLES;

	check(field.spawnCount === i, 'in der ganzen Prüfung wurde KEINE Münze eingeworfen');
	check(perCycle >= TRANSPORT_MIN_PER_CYCLE,
		`die vorderste Münze wandert ${perCycle.toFixed(2)} Einheiten je Umlauf nach vorn `
		+ `(verlangt >= ${TRANSPORT_MIN_PER_CYCLE})`);
	check(field.dropCount > 0,
		`ohne Einwurf sind ${field.dropCount} Münzen von der oberen auf die untere Ebene gefallen`);
	check(field.wonCount + field.chuteCount > 0,
		`ohne Einwurf haben ${field.wonCount + field.chuteCount} Münzen das Feld vorn verlassen `
		+ `(${field.wonCount} über die Abwurfkante, ${field.chuteCount} seitlich)`);
}

/* ----------------------------------------------------------------------
   F-21  Stückzahlerhaltung (NEU) – „keine Münze verschwindet oder verdoppelt
   sich".
   ---------------------------------------------------------------------- */

function checkPieceConservation(referenceRun) {
	console.log('\nF-21  Stückzahlerhaltung – keine Münze verschwindet oder verdoppelt sich');
	const field = referenceRun.field;

	check(field.spawnCount === field.wonCount + field.chuteCount + field.valveCount + field.count,
		`spawnCount (${field.spawnCount}) === wonCount + chuteCount + valveCount + Bestand `
		+ `(${field.wonCount} + ${field.chuteCount} + ${field.valveCount} + ${field.count})`);

	// Und keine Geburtsnummer doppelt: remove() kopiert die letzte Spalte nach
	// vorn, und genau dort entstünde ein Duplikat, wenn die Buchhaltung
	// danebengriffe. Das war der Kern des Kapazitätsfehlers aus Phase 8 – er
	// blieb 28.000 Würfe lang unbemerkt, weil ihn keine der damals 138
	// Prüfungen sehen konnte.
	const seen = new Set();
	let duplicate = null;
	let maxBorn = -1;
	for (let i = 0; i < field.count; i++) {
		if (seen.has(field.born[i])) { duplicate = field.born[i]; break; }
		seen.add(field.born[i]);
		if (field.born[i] > maxBorn) { maxBorn = field.born[i]; }
	}
	check(duplicate === null, duplicate === null
		? `alle ${field.count} Geburtsnummern sind verschieden`
		: `Geburtsnummer ${duplicate} kommt doppelt vor`);
	check(maxBorn < field.spawnCount,
		`keine Geburtsnummer (größte: ${maxBorn}) liegt über spawnCount (${field.spawnCount})`);
}

/* ----------------------------------------------------------------------
   F-22  Beide Ebenen sind besetzt (NEU).
   ---------------------------------------------------------------------- */

function checkBothLevels(settleRuns) {
	console.log('\nF-22  Beide Ebenen sind besetzt: mindestens 20 % je Ebene, mittlere Stapelhöhe über 1,25');
	for (const value of COIN_VALUES) {
		const run = settleRuns.get(value);
		const { layers, upperShare } = stackStats(run.field);
		check(upperShare >= 0.20 && (1 - upperShare) >= 0.20,
			`Münzwert ${value}: obere Ebene ${(upperShare * 100).toFixed(1)} %, untere Ebene `
			+ `${((1 - upperShare) * 100).toFixed(1)} % – beide mindestens 20 %`);
		check(layers > 1.25, `Münzwert ${value}: mittlere Stapelhöhe ${layers.toFixed(2)} Lagen (> 1,25)`);
	}
}

/* ----------------------------------------------------------------------
   F-23  Die Ablenkleiste lenkt ab – und nur, wen sie soll.
   ---------------------------------------------------------------------- */

function checkRails() {
	console.log('\nF-23  Die schräge Ablenkleiste führt nach außen, der Durchlass in der Mitte bleibt frei');

	// Zwei gleiche Münzen, gleiche Tiefe, gleicher Anstoß – nur die
	// Seitenlage unterscheidet sie. Die eine liegt im Fang der linken
	// Leiste, die andere in der Mitte.
	//
	// ABWEICHUNG VOM PLANTEXT, GEMESSEN: eine EINZELNE Münze auf der unteren
	// Ebene hat außerhalb der Reichweite der Vorderwand (y < LOWER_DEPTH -
	// PLATE_STROKE) keinen eigenen Antrieb – F-25 weist das als Haftreibung
	// gegen die Neigung ausdrücklich nach, und ein einmaliger Anstoß (vy=-6)
	// zerfällt binnen rund 50 Schritten auf unter eine Einheit Weg (dieselbe
	// Coulomb-Reibung, die F-25 prüft). Mit dem einmaligen Anstoß allein kam
	// die Münze nie in die Nähe der Leiste (gemessen: 2.400 Schritte ohne
	// Ergebnis). Im echten Spiel schiebt der nachdrängende Haufen sie weiter
	// – das prüfen F-20/F-26 getrennt und bereits erfolgreich. Damit DIESE
	// Prüfung nur die GEOMETRIE der Leiste isoliert (lenkt sie ab, oder
	// lässt sie durch), bekommt die Münze vor jedem Schritt einen gleich
	// bleibenden Vorschub von 3 Einheiten/s als Platzhalter für den
	// Nachbardruck – die Reibung darf ihn danach wie gewohnt verarbeiten,
	// nur zehrt sie ihn nicht mehr bis zum Stillstand auf.
	//
	// OFFENER BEFUND, GEMESSEN (gehört nach Stück B): mit dem Vorschub-
	// Platzhalter bleibt „im Fang der Leiste" bei den vorläufigen Maßen
	// (CHUTE_REACH=18, WALL_TAPER=0,10) an EINEM festen Punkt stehen
	// (x=6,541, y=21,414 – geprüft für x0 zwischen 3 und 16, immer derselbe
	// Punkt) und erreicht weder den Schacht noch die Abwurfkante. An dieser
	// Stelle berührt die Leiste (versetzt um den Halbmesser) genau die
	// verjüngte Bodenkante – ein geometrischer Winkel, aus dem ein Punkt
	// ohne seitlichen Anstoß nicht mehr herausfindet, weil applyWalls()
	// jede seitliche Bewegung sofort zurückklemmt (Reihenfolge in step():
	// die Wand hat das letzte Wort) und applyRails() den Vorwärtsanteil der
	// Geschwindigkeit an genau diesem Punkt vollständig aufzehrt. Das ist
	// kein Fehler in field.js gegenüber dem Plan – F-1 (Leistengeometrie),
	// F-24 (Trichter) und der „Mitte"-Fall dieser Prüfung sind grün – sondern
	// eine Eigenschaft der NOCH NICHT GEMESSENEN Zahlenwerte CHUTE_REACH und
	// WALL_TAPER. Ob die reale, gedrängte Münzmenge (siehe F-20, mit echtem
	// Nachbarkontakt statt eines Platzhalters) genau diesen Punkt in der
	// Praxis überwindet, oder ob Stück B (tune-chute.mjs) eine Kombination
	// suchen muss, die diesen Winkel vermeidet, ist damit NICHT beantwortet
	// und bleibt hier bewusst rot stehen, statt es zu beschönigen.
	for (const [label, x, expectChute] of [
		['im Fang der Leiste', CHUTE_REACH * 0.5, true],
		['in der Mitte des Durchlasses', FIELD_WIDTH / 2, false],
	]) {
		const field = new Field({ random: createSeeded(23) });
		placeCoin(field, 0, {
			value: COIN_VALUES[3], born: 0,   // der größte Wert: der ungünstigste Fall
			x, y: DEFLECT_DEPTH - 1, z: 0,
		});
		field.count = 1;
		let s = 0;
		while (field.count === 1 && s < 4 * PLATE_PERIOD_STEPS) {
			field.vy[0] = -3;   // Nachbardruck-Platzhalter, siehe Kommentar oben
			field.step();
			s++;
		}
		check(field.count === 0, `${label}: die Münze hat das Feld verlassen (${s} Schritte)`);
		if (expectChute) {
			check(field.chuteCount === 1 && field.wonCount === 0,
				`${label}: sie ist seitlich verloren gegangen, nicht gewonnen`);
		} else {
			check(field.wonCount === 1 && field.chuteCount === 0,
				`${label}: sie ist über die Abwurfkante gefallen, nicht seitlich verloren`);
		}
	}
}

/* ----------------------------------------------------------------------
   F-24  Der Trichter hält und verjüngt.
   ---------------------------------------------------------------------- */

function checkTaper() {
	console.log('\nF-24  Die Seitenwand läuft trichterförmig zu und hält');

	const field = new Field({ random: createSeeded(24) });
	// Eine Münze wird hinten mit Schwung nach links geschickt, weit hinter
	// dem vorderen Bereich – dort ist die Wand geschlossen.
	const y = FIELD_DEPTH - 2 * MAX_RADIUS;
	placeCoin(field, 0, { value: COIN_VALUES[0], born: 0, x: FIELD_WIDTH / 2, y, z: DECK_HEIGHT });
	field.count = 1;
	field.vx[0] = -60;
	for (let s = 0; s < 240; s++) { field.step(); }
	check(field.count === 1, 'hinten geht keine Münze seitlich verloren – dort ist die Wand geschlossen');
	check(field.x[0] >= WALL_TAPER * field.y[0] + field.r[0] - 1e-9,
		`sie liegt an der verjüngten Bodenkante an (x=${field.x[0].toFixed(3)}, `
		+ `Kante ${(WALL_TAPER * field.y[0] + field.r[0]).toFixed(3)})`);
	check(field.x[0] > MAX_RADIUS,
		'die Kante liegt hinten weiter innen als vorn – der Trichter wirkt');
}

/* ----------------------------------------------------------------------
   F-25  Haftreibung: ein ruhender Haufen rutscht nicht.
   ---------------------------------------------------------------------- */

function checkStaticFriction() {
	console.log('\nF-25  Die Haftreibung hält gegen die Neigung: eine ruhende Münze bleibt EXAKT liegen');

	const field = new Field({ random: createSeeded(25) });
	// Auf der unteren Ebene, vor der vordersten Lage der Vorderwand und
	// hinter den Ablenkleisten: nichts als der Boden und die Neigung.
	//
	// ABWEICHUNG VOM PLANTEXT, GEMESSEN: der einfache Mittelwert aus
	// DEFLECT_DEPTH und (LOWER_DEPTH - PLATE_STROKE) lag mit den
	// vorläufigen Maßen bei y=29,3 — nur 2,7 Einheiten vor der vordersten
	// Lage der Vorderwand (32) und damit NÄHER als der Halbmesser dieser
	// Münze (4,0). Die Vorderwand streifte sie deshalb einmal je Umlauf
	// kurz an, wenn sie ihre vorderste Lage erreichte (limit = 32 - 4,0 =
	// 28 < 29,3), und schob sie über vier Umläufe messbar nach vorn (y
	// endete bei 25,05 statt unverändert bei 29,3) — kein Fehler der
	// Haftreibung, sondern eine zu knapp bemessene Prüfkulisse. DEFLECT_DEPTH
	// selbst zieht dieselbe Sicherheitsspanne (MAX_RADIUS + 1) bereits von
	// der vordersten Lage der Vorderwand ab; ein kleiner fester Abstand
	// dahinter platziert die Münze sicher außerhalb der Reichweite der
	// Vorderwand, unabhängig vom später gesuchten Maß.
	const y = DEFLECT_DEPTH + 0.3;
	placeCoin(field, 0, { value: COIN_VALUES[2], born: 0, x: FIELD_WIDTH / 2, y, z: 0 });
	field.count = 1;
	for (let s = 0; s < 4 * PLATE_PERIOD_STEPS; s++) { field.step(); }
	check(field.count === 1 && field.y[0] === y,
		`nach vier Umläufen liegt sie auf das letzte Bit unverändert (y=${field.y[0]})`);
	check(field.vy[0] === 0, `und sie steht still (vy=${field.vy[0]})`);
}

/* ----------------------------------------------------------------------
   F-26  Eine EINZELNE Münze auf dem fahrenden Deck wandert nach vorn.
   ---------------------------------------------------------------------- */

function checkSingleCoinCreep() {
	console.log('\nF-26  Auch eine EINZELNE Münze auf dem Deck wandert je Umlauf nach vorn');

	// Der Nachweis, dass der Vorschub NICHT an der Berührungskette hängt:
	// eine Münze, ganz allein, ohne Nachbarn und ohne Rückwandkontakt.
	const field = new Field({ random: createSeeded(26) });
	const y = (FIELD_DEPTH + LOWER_DEPTH) / 2;
	placeCoin(field, 0, { value: COIN_VALUES[0], born: 0, x: FIELD_WIDTH / 2, y, z: DECK_HEIGHT });
	field.count = 1;
	for (let s = 0; s < 4 * PLATE_PERIOD_STEPS; s++) { field.step(); }
	const perCycle = (y - field.y[0]) / 4;
	check(perCycle > 0,
		`sie ist je Umlauf um ${perCycle.toFixed(3)} Einheiten nach vorn gewandert – ohne jeden Nachbarn`);
	check(Math.abs(field.x[0] - FIELD_WIDTH / 2) < 1e-9,
		'und sie ist dabei nicht seitlich abgewandert');
	return perCycle;
}

/* ----------------------------------------------------------------------
   Kennzahlenblock.
   ---------------------------------------------------------------------- */

/**
 * @param {Map<number, {field: Field, violation: string|null}>} settleRuns
 * @param {{field: Field}} referenceRun
 * @param {number} singleCoinAdvancePerCycle F-26: Vorschub einer einzelnen Münze
 * @returns {void}
 */
function report(settleRuns, referenceRun, singleCoinAdvancePerCycle) {
	console.log('\nKennzahlen');
	console.log('  Münzwert  eingependelte Stückzahl  Flächendeckung  mittl. Stapelhöhe  obere Ebene');
	for (const value of COIN_VALUES) {
		const run = settleRuns.get(value);
		const coverage = run.field.area / (run.field.fillArea / run.field.fillTarget);
		const { layers, upperShare } = stackStats(run.field);
		console.log(`  ${String(value).padStart(8)}  ${String(run.field.count).padStart(23)}  `
			+ `${(coverage * 100).toFixed(1).padStart(13)} %  ${layers.toFixed(2).padStart(17)}  `
			+ `${(upperShare * 100).toFixed(1).padStart(10)} %`);
	}
	console.log(`  Vorschub je Umlauf, einzelne Münze (F-26)   ${singleCoinAdvancePerCycle.toFixed(3)} Einheiten`);
	console.log(`  Länge des Speicherstands (Referenzlauf)   ${referenceRun.field.serialize().length} Zeichen`);
	const dropsPerThousand = referenceRun.field.spawnCount > 0
		? (referenceRun.field.dropCount / referenceRun.field.spawnCount) * 1000
		: 0;
	console.log(`  Ebenenwechsel je 1.000 Einwürfe (Referenzlauf)   ${dropsPerThousand.toFixed(1)}`);
}

/* ----------------------------------------------------------------------
   Ablauf.
   ---------------------------------------------------------------------- */

const fieldSource = await readFile(FIELD_JS_PATH, 'utf8');
const rngSource = await readFile(RNG_JS_PATH, 'utf8');
const storageSource = await readFile(STORAGE_JS_PATH, 'utf8');

const started = process.hrtime.bigint();

checkMeasurements();
await checkNoForbiddenMath(fieldSource);
checkChuteWidthSingleLocation(fieldSource, rngSource, storageSource);

const referenceRun = checkDeterminism();
checkOverlapAndBounds(referenceRun);
const settleRuns = checkCapAndValve();
checkValveRule();
checkValueConservation(referenceRun);
checkResume();
checkCorruptedStates();
checkStorageEncapsulation(fieldSource);
checkRandomUsage();
checkPlateCycle();
checkStacking();
checkLevelChange();
checkDeckTransport();
checkPieceConservation(referenceRun);
checkBothLevels(settleRuns);
checkRails();
checkTaper();
checkStaticFriction();
const singleCoinAdvancePerCycle = checkSingleCoinCreep();

const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;
report(settleRuns, referenceRun, singleCoinAdvancePerCycle);
console.log(`  Rechenleistung                             `
	+ `${Math.round(referenceRun.field.stepCount * 5 / elapsedSeconds).toLocaleString('de-DE')} Zeitschritte/s `
	+ `(überschlägig, über den gesamten Skriptlauf gemittelt)`);

console.log(failed
	? '\nERGEBNIS: mindestens eine Prüfung des Physikkerns ist fehlgeschlagen.'
	: '\nERGEBNIS: der Physikkern ist wiederholbar, verlustfrei speicherbar und hält seine Grenzen ein.');

process.exit(failed ? 1 : 0);
