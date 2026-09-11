/**
 * Coin Pusher – Nachweis von Sammler, Lichtdrossel, Grundhaufen und Abbildung
 * ==============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit;
 * es genügt ein Node ab Version 18.
 *
 * Lädt die ECHTEN Module über ihre Dateiadresse und ersetzt dabei die
 * Import-Map-Namen im Quelltext durch Dateipfade — dasselbe Verfahren, das
 * video_slot/Resources/Private/Scripts/verify-sound.mjs schon benutzt.
 * field.js, rng.js und storage.js haben selbst keine Importe und werden
 * unverändert über ihre Dateiadresse geladen — wie in verify-physics.mjs.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-view.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 *
 * WAS HIER BEWIESEN WIRD (Plan-Abschnitt 4.21)
 * -----------------------------------------------
 *   V-1  der Sammler ist bildratenunabhängig
 *   V-2  die Sperre gegen zu langes Nachholen greift
 *   V-3  die Lichtdrossel hält die Grenze
 *   V-4  der Grundhaufen ist ein gültiger Spielstand
 *   V-5  der Grundhaufen ist kein Kredit
 *   V-6  Speichern und Fortsetzen ohne Sprung
 *   V-7  ein beschädigter Stand führt zum Grundhaufen, nicht zum Fehler
 *   V-8  die Abbildung stimmt
 *   V-9  die Physik ist unverändert
 */

// @pruefstand laufzeit=kurz abgeschrieben=Auftraggeber-Entscheidung 2026-09-11 (DECISIONS.md, 12:50): der Münzschieber ist abgeschrieben, die Extension deaktiviert (extension:deactivate), Dateien bleiben liegen. Der Altbefund vom 2026-09-04 (Prüfsumme field.js, 104 statt 110-130 Münzen, 19 Überlappungen) ist damit gegenstandslos und wird nicht mehr gefahren.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/coin_pusher/Resources/Public/JavaScript/ */
const JS = resolve(HIER, '../../Public/JavaScript');
const FIELD_URL = new URL('field.js', `file://${JS}/`).href;
const FIELD_NAME = '@phomo17/coin-pusher/field.js';

let fehler = 0;

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
	fehler++;
	console.log(`  FEHLER  ${message}`);
}

/**
 * Liest eine Datei als Text, ersetzt die Import-Map-Namen im Quelltext durch
 * ihre Dateiadresse und liefert das Modul als data:-URL zurück. Es ist Zeile
 * für Zeile derselbe Code; nur der Modulname ist ein anderer.
 *
 * @param {string} datei absoluter Pfad
 * @param {Array<[string, string]>} ersetzungen
 * @returns {Promise<string>} data:-URL
 */
async function alsModul(datei, ersetzungen) {
	let quelltext = await readFile(datei, 'utf8');
	for (const [name, ziel] of ersetzungen) {
		quelltext = quelltext.replaceAll(`'${name}'`, JSON.stringify(ziel));
	}
	return `data:text/javascript;base64,${Buffer.from(quelltext, 'utf8').toString('base64')}`;
}

console.log('\nCoin Pusher – Nachweis von Sammler, Lichtdrossel, Grundhaufen und Abbildung');
console.log('================================================================================\n');

/* -------------------------------------------------------- Die echten Module */

const { Field, checksum, createField, COIN_VALUES, COIN_RADIUS, FIELD_WIDTH, FIELD_DEPTH,
	LOWER_DEPTH, DECK_HEIGHT, FRONT_ZONE_DEPTH, COIN_CAP_MIN, MAX_RADIUS }
	= await import(FIELD_URL);
const { createSeeded } = await import(new URL('rng.js', `file://${JS}/`).href);
const { read: storageRead, write: storageWrite } = await import(new URL('storage.js', `file://${JS}/`).href);

const seedUrl = await alsModul(resolve(JS, 'seed.js'), [[FIELD_NAME, FIELD_URL]]);
const { buildSeedState, SEED_LOWER_ROWS, SEED_UPPER_ROWS, SEED_COLS } = await import(seedUrl);
check(typeof buildSeedState === 'function', 'seed.js geladen (buildSeedState)');

const pusherUrl = await alsModul(resolve(JS, 'pusher.js'), [[FIELD_NAME, FIELD_URL]]);
const { planSteps, DT_MS, MAX_CATCHUP_STEPS } = await import(pusherUrl);
check(typeof planSteps === 'function', 'pusher.js geladen (planSteps)');

const viewUrl = await alsModul(resolve(JS, 'view.js'), [[FIELD_NAME, FIELD_URL]]);
const { toCanvasX, toCanvasY, DRAW_WIDTH, DRAW_HEIGHT, DRAW_MARGIN_X, DRAW_TOP } = await import(viewUrl);
check(typeof toCanvasX === 'function' && typeof toCanvasY === 'function', 'view.js geladen (toCanvasX, toCanvasY)');

const { Lamp, LAMP_MIN_ON_MS, LAMP_MIN_OFF_MS } = await import(new URL('lamp.js', `file://${JS}/`).href);
check(typeof Lamp === 'function', 'lamp.js geladen (keine Importe, unverändert)');

/* =================================================== V-1 Sammler, bildratenfrei */

console.log('\nV-1  Der Sammler ist bildratenunabhängig');
{
	const SPAN_MS = 60000;
	const erwartet = Math.floor(SPAN_MS / DT_MS);

	// Der letzte Bildabstand wird auf die verbleibende Zeit gekappt, damit
	// die Folge exakt SPAN_MS Millisekunden abdeckt – sonst schösse das
	// letzte Bild über SPAN_MS hinaus und läge außerhalb der Vergleichsbasis.
	function laufe(schrittfolge) {
		let carry = 0;
		let total = 0;
		let elapsed = 0;
		while (elapsed < SPAN_MS) {
			const dt = Math.min(schrittfolge(), SPAN_MS - elapsed);
			elapsed += dt;
			const plan = planSteps(dt, carry);
			total += plan.steps;
			carry = plan.carryMs;
		}
		return total;
	}

	const gleichmaessig60 = laufe(() => 1000 / 60);
	const gleichmaessig120 = laufe(() => 1000 / 120);
	let seed = 20260903;
	function pseudo() {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		return 5 + (seed % 41); // 5…45 ms
	}
	const unregelmaessig = laufe(pseudo);

	for (const [name, wert] of [
		['16,67 ms (60 Hz)', gleichmaessig60],
		['8,33 ms (120 Hz)', gleichmaessig120],
		['5…45 ms unregelmäßig', unregelmaessig],
	]) {
		check(Math.abs(wert - erwartet) <= 1,
			`${name}: ${wert} Schritte (erwartet ${erwartet} ± 1)`);
	}
}

/* ============================================== V-2 Sperre gegen Nachholen */

console.log('\nV-2  Die Sperre gegen zu langes Nachholen greift');
{
	const FUENF_MINUTEN_MS = 5 * 60 * 1000;
	const plan = planSteps(FUENF_MINUTEN_MS, 0);
	check(plan.steps === MAX_CATCHUP_STEPS,
		`ein Sprung von 5 Minuten liefert genau MAX_CATCHUP_STEPS Schritte (${plan.steps} von ${MAX_CATCHUP_STEPS})`);
	check(plan.carryMs === 0, `carryMs ist 0 (${plan.carryMs})`);
}

/* ==================================================== V-3 Die Lichtdrossel */

console.log('\nV-3  Die Lichtdrossel hält die Grenze');
{
	/**
	 * Fährt 1000 trigger()-Aufrufe mit einer künstlichen Uhr in den
	 * gegebenen Abständen und liefert die Zeitpunkte, an denen die Lampe
	 * NEU aufleuchtet (nicht: jeden trigger()-Aufruf).
	 *
	 * @param {() => number} abstandsfolge liefert je Aufruf den Abstand
	 *        zum vorigen trigger() in Millisekunden
	 * @returns {number[]}
	 */
	function fahreLamp(abstandsfolge) {
		let clock = 0;
		const lamp = new Lamp(null, 'cp-tray__lamp--on', () => clock);
		// setTimeout/clearTimeout werden durch die künstliche Uhr entwertet:
		// die Prüfung ruft turnOff() selbst zum richtigen Zeitpunkt auf,
		// statt echte Zeitgeber laufen zu lassen.
		lamp.scheduleOff = () => {};

		const onTimes = [];
		for (let i = 0; i < 1000; i++) {
			clock += abstandsfolge();
			if (lamp.lit && lamp.offAt <= clock) {
				lamp.turnOff();
			}
			const warLit = lamp.lit;
			lamp.trigger();
			if (!warLit && lamp.lit) {
				onTimes.push(clock);
			}
		}
		return onTimes;
	}

	// Fall A: die im Plan vorgesehenen 5…80 ms. Weil jeder einzelne Abstand
	// kürzer ist als LAMP_MIN_ON_MS (400 ms), verlängert jeder Auslöser nur
	// die schon leuchtende Lampe (trigger()s Erster Zweig) – die Lampe
	// leuchtet GENAU EINMAL auf und bleibt für den ganzen Lauf ein ruhiges
	// Dauerlicht. Das ist die spezifikationsgemäße Auslegung von B.9.3: ein
	// dichter Münzregen erzeugt keinen zweiten Hell-Wechsel, geschweige denn
	// mehr als drei je Sekunde.
	let seedA = 20260904;
	const onTimesA = fahreLamp(() => {
		seedA = (seedA * 1103515245 + 12345) & 0x7fffffff;
		return 5 + (seedA % 76); // 5…80 ms
	});
	check(onTimesA.length === 1,
		`5…80 ms Abstand: ein dichter Münzregen erzeugt genau EIN Aufleuchten, kein Flackern (${onTimesA.length})`);

	// Fall B: mit gelegentlichen längeren Pausen (bis 900 ms), damit die
	// Lampe auch tatsächlich mehrfach erlischt und wieder aufleuchtet – nur
	// so lässt sich der Mindestabstand zwischen zwei EINSCHALTzeitpunkten
	// überhaupt messen.
	let seedB = 20260905;
	const onTimesB = fahreLamp(() => {
		seedB = (seedB * 1103515245 + 12345) & 0x7fffffff;
		return 5 + (seedB % 896); // 5…900 ms
	});
	let kuerzesterAbstand = Infinity;
	for (let i = 1; i < onTimesB.length; i++) {
		kuerzesterAbstand = Math.min(kuerzesterAbstand, onTimesB[i] - onTimesB[i - 1]);
	}
	check(onTimesB.length > 1, `5…900 ms Abstand: die Lampe leuchtet mehrfach auf (${onTimesB.length} ×)`);
	check(kuerzesterAbstand >= LAMP_MIN_ON_MS + LAMP_MIN_OFF_MS,
		`kürzester Abstand zweier Einschaltzeitpunkte ${kuerzesterAbstand} ms`
		+ ` (mindestens ${LAMP_MIN_ON_MS + LAMP_MIN_OFF_MS} ms verlangt) – nie mehr als drei Hell-Wechsel je Sekunde`);
}

/* ============================================ V-4 Grundhaufen ist gültig */

console.log('\nV-4  Der Grundhaufen ist ein gültiger Spielstand');
{
	const random = createSeeded(20260903);
	const payload = buildSeedState(random);
	const field = Field.restore(payload, { random: createSeeded(1) });

	check(field !== null, 'Field.restore(buildSeedState(seed)) liefert ein Feld, nicht null');

	if (field !== null) {
		const erwarteteAnzahl = (SEED_LOWER_ROWS + SEED_UPPER_ROWS) * SEED_COLS;
		check(field.count === erwarteteAnzahl,
			`das Feld enthält ${erwarteteAnzahl} Münzen `
			+ `((${SEED_LOWER_ROWS} + ${SEED_UPPER_ROWS}) x ${SEED_COLS}; gefunden: ${field.count})`);
		check(field.count < COIN_CAP_MIN,
			`${field.count} liegt sicher unter COIN_CAP_MIN (${COIN_CAP_MIN}) – das Ventil zieht beim Start nicht`);
		check(field.count >= 110 && field.count <= 130,
			`${field.count} liegt in der vom Auftraggeber gesetzten Spanne 110–130. `
			+ `Reißt diese Prüfung, ist die SPANNE anzupassen und in DECISIONS.md zu begründen – `
			+ `NICHT eine der fünf Geometriebedingungen im Kopf von seed.js zu lockern.`);

		const plate = field.plateY();     // Phase 0: die hinterste Lage
		let ausserhalb = 0;
		let imVorderenBereich = 0;
		let unbekannterWert = 0;
		let zuTief = 0;                   // NEU – genau die Lücke aus M2
		let falscheHoehe = 0;             // NEU
		let imBlock = 0;                  // NEU
		for (let i = 0; i < field.count; i++) {
			const r = field.r[i];
			if (field.x[i] - r < -0.001 || field.x[i] + r > FIELD_WIDTH + 0.001) { ausserhalb++; }
			if (field.value[i] === undefined || !COIN_VALUES.includes(field.value[i])) { unbekannterWert++; }

			if (field.z[i] === 0) {
				// untere Ebene: vor dem vorderen Bereich, hinter der
				// Vorderwand ist kein Platz.
				if (field.y[i] - r < FRONT_ZONE_DEPTH - 0.001) { imVorderenBereich++; }
				if (field.y[i] + r > plate + 0.001) { imBlock++; }
			} else if (field.z[i] === DECK_HEIGHT) {
				// obere Ebene: zwischen Vorderwand und Rückwand, und zwar mit
				// dem GANZEN Halbmesser. GENAU DAS hat V-4 bisher nicht
				// geprüft, und genau daran ist die Zusage im Kopf von seed.js
				// gescheitert (Befund M2 der Prüfung vom Phase-10-Lauf).
				if (field.y[i] - r < plate - 0.001) { imBlock++; }
				if (field.y[i] + r > FIELD_DEPTH + 0.001) { zuTief++; }
			} else {
				falscheHoehe++;
			}
		}
		check(ausserhalb === 0, `jede Münze liegt vollständig im Feldboden (${ausserhalb} außerhalb)`);
		check(imVorderenBereich === 0,
			`keine Münze der unteren Ebene ragt in den vorderen Bereich (${imVorderenBereich})`);
		check(imBlock === 0, `keine Münze steckt im Block (${imBlock})`);
		check(zuTief === 0,
			`keine Münze der oberen Ebene ragt über die Rückwand hinaus – y + r <= FIELD_DEPTH `
			+ `für jede Münze (${zuTief} Verletzungen). DAS IST DIE PRÜFUNG, DIE BEFUND M2 `
			+ `durchgelassen hat.`);
		check(falscheHoehe === 0,
			`jede Saatmünze liegt einlagig auf genau einer der beiden Ebenen (${falscheHoehe} weder noch)`);
		check(unbekannterWert === 0, `alle Werte stammen aus COIN_VALUES (${unbekannterWert} unbekannt)`);

		let ueberlappungen = 0;
		for (let i = 0; i < field.count; i++) {
			for (let j = i + 1; j < field.count; j++) {
				if (field.z[i] !== field.z[j]) { continue; }   // verschiedene Ebenen überlappen sich nicht
				const dx = field.x[j] - field.x[i];
				const dy = field.y[j] - field.y[i];
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < field.r[i] + field.r[j] - 0.001) {
					ueberlappungen++;
				}
			}
		}
		check(ueberlappungen === 0, `keine zwei Münzen überlappen sich (${ueberlappungen} Paare)`);
	}
}

/* ============================================ V-5 Grundhaufen ist kein Kredit */

console.log('\nV-5  Der Grundhaufen ist kein Kredit');
{
	const random = createSeeded(20260905);
	const field = Field.restore(buildSeedState(random), { random: createSeeded(2) });
	check(field !== null, 'der Grundhaufen wird wiederhergestellt');
	if (field !== null) {
		check(field.thrownValue === 0, `thrownValue ist 0 (${field.thrownValue})`);
		check(field.wonValue === 0, `wonValue ist 0 (${field.wonValue})`);
		check(field.chuteValue === 0, `chuteValue ist 0 (${field.chuteValue})`);
		check(field.valveValue === 0, `valveValue ist 0 (${field.valveValue})`);
		check(field.dropCount === 0, `dropCount ist 0 (${field.dropCount}) – der Grundhaufen ist nicht gefallen`);
	}

	// Wie viele Zahlen zieht buildSeedState() tatsächlich? jitter() zieht je
	// Aufruf einmal aus random() und wird PRO SAATMÜNZE ZWEIMAL gerufen
	// (einmal für x, einmal für y) – „genau zwei Züge" stimmt NICHT (siehe
	// Kopfkommentar von seed.js). Die richtige Formel: eine für turn, zwei je
	// Münze.
	let zuegeVerbraucht = 0;
	const zaehlenderZufall = (() => {
		const basis = createSeeded(20260905);
		return () => { zuegeVerbraucht++; return basis(); };
	})();
	buildSeedState(zaehlenderZufall);
	const erwarteteZuege = 1 + 2 * (SEED_LOWER_ROWS + SEED_UPPER_ROWS) * SEED_COLS;
	check(zuegeVerbraucht === erwarteteZuege,
		`buildSeedState() zieht 1 + 2 × Anzahl der Saatmünzen Zahlen `
		+ `(${zuegeVerbraucht}, erwartet ${erwarteteZuege}) – eine für das Anfangsmuster, `
		+ `zwei je Münze (x und y), keine je Münze für den Wert`);
}

/* ============================================ V-6 Speichern ohne Sprung */

console.log('\nV-6  Speichern und Fortsetzen ohne Sprung');
{
	/*
	 * Field.restore() bekommt einen FRISCHEN Zufallsgeber übergeben – der
	 * Spielstand speichert die Münzen, nicht den inneren Zähler des
	 * Generators (das kann er auch nicht, drawUint32() im echten Betrieb hat
	 * gar keinen). Damit die weiteren 500 Schritte auf field (das seinen
	 * Generator seit dem Anlegen ununterbrochen weiterbenutzt) und auf
	 * wiederhergestellt (dessen Generator bei restore() neu beginnt)
	 * trotzdem dieselben Zufallszahlen ziehen, wird der frische Generator um
	 * genau so viele Aufrufe VORGESPULT, wie field's Generator bis zum
	 * Speicherzeitpunkt schon verbraucht hat – throwCoin() ist die einzige
	 * Stelle, die zieht (ein Aufruf je Münze).
	 */
	let verbrauchteZuege = 0;
	const zaehlenderZufall = (() => {
		const basis = createSeeded(20260906);
		return () => { verbrauchteZuege++; return basis(); };
	})();

	const field = createField({ random: zaehlenderZufall });
	for (let i = 0; i < 5000; i++) {
		if (i % 48 === 0) {
			field.throwCoin(COIN_VALUES[i % COIN_VALUES.length]);
		}
		field.step();
	}
	const stand1 = field.serialize();

	const vorgespult = createSeeded(20260906);
	for (let i = 0; i < verbrauchteZuege; i++) {
		vorgespult();
	}
	const wiederhergestellt = Field.restore(stand1, { random: vorgespult });
	check(wiederhergestellt !== null, 'ein gespeicherter Stand lässt sich wiederherstellen');
	check(wiederhergestellt !== null && wiederhergestellt.serialize() === stand1,
		'serialize() vor und nach dem Wiederherstellen ist zeichengleich');

	if (wiederhergestellt !== null) {
		for (let i = 0; i < 500; i++) {
			if (i % 48 === 0) {
				field.throwCoin(COIN_VALUES[i % COIN_VALUES.length]);
				wiederhergestellt.throwCoin(COIN_VALUES[i % COIN_VALUES.length]);
			}
			field.step();
			wiederhergestellt.step();
		}
		check(field.serialize() === wiederhergestellt.serialize(),
			'weitere 500 Schritte auf beiden liefern erneut zeichengleiche Stände');
	}
}

/* ============================================ V-7 Beschädigter Stand */

console.log('\nV-7  Ein beschädigter Stand führt zum Grundhaufen, nicht zum Fehler');
{
	/** Ein nachgebautes Regal (Storage), ohne echten Browserspeicher. */
	function nachgebautesRegal(anfangswert) {
		const zellen = new Map();
		if (anfangswert !== undefined) {
			zellen.set('casinoKunterbunt.coinPusher.field', anfangswert);
		}
		return {
			getItem: (key) => (zellen.has(key) ? zellen.get(key) : null),
			setItem: (key, value) => { zellen.set(key, String(value)); },
			removeItem: (key) => { zellen.delete(key); },
		};
	}

	const random = createSeeded(20260907);
	const echterStand = (() => {
		const f = createField({ random: createSeeded(1) });
		f.throwCoin(1);
		f.step();
		return f.serialize();
	})();

	// Ein gültiger Stand im ALTEN Format cp1: in sich stimmig, nur eben von
	// gestern. Er MUSS ebenfalls zum Grundhaufen führen – er ist der Fall,
	// der beim Umbau tatsächlich eintritt, und darf sich nicht anders
	// verhalten als ein beschädigter Stand.
	const legacyPayload = '0|2|1,0,50,30,0,0;10,1,60,35,0,-1';
	const legacyStand = `cp1|${checksum(legacyPayload)}|${legacyPayload}`;

	const faelle = {
		abgeschnitten: echterStand.slice(0, Math.floor(echterStand.length / 2)),
		veraendert: echterStand.slice(0, -1) + (echterStand.endsWith('0') ? '1' : '0'),
		leer: '',
		'alter cp1-Stand': legacyStand,
	};

	for (const [name, text] of Object.entries(faelle)) {
		const regal = nachgebautesRegal(text);
		let geworfeneAusnahme = null;
		let gelesen = null;
		try {
			gelesen = storageRead(regal);
		} catch (e) {
			geworfeneAusnahme = e;
		}
		check(geworfeneAusnahme === null, `${name}: read() wirft keine Ausnahme`);

		const kept = Field.restore(gelesen, { random: createSeeded(3) });
		check(kept === null, `${name}: Field.restore() liefert null für den beschädigten Stand`);

		const seeded = Field.restore(buildSeedState(random), { random: createSeeded(4) });
		const erwarteteSaatzahl = (SEED_LOWER_ROWS + SEED_UPPER_ROWS) * SEED_COLS;
		check(seeded !== null && seeded.count === erwarteteSaatzahl,
			`${name}: der Grundhaufen springt ein (${seeded?.count ?? 'null'} Münzen, erwartet ${erwarteteSaatzahl})`);
	}
}

/* ============================================ V-8 Die Abbildung stimmt */

console.log('\nV-8  Die Abbildung stimmt');
{
	check(toCanvasY(0, 1) === DRAW_HEIGHT, `toCanvasY(0, 1) === DRAW_HEIGHT (${toCanvasY(0, 1)} = ${DRAW_HEIGHT})`);
	check(toCanvasY(FIELD_DEPTH, 1) === DRAW_TOP,
		`toCanvasY(FIELD_DEPTH, 1) === DRAW_TOP (${toCanvasY(FIELD_DEPTH, 1)} = ${DRAW_TOP})`);
	check(toCanvasX(0, 1) === DRAW_MARGIN_X, `toCanvasX(0, 1) === DRAW_MARGIN_X (${toCanvasX(0, 1)} = ${DRAW_MARGIN_X})`);
	check(toCanvasX(FIELD_WIDTH, 1) === DRAW_WIDTH - DRAW_MARGIN_X,
		`toCanvasX(FIELD_WIDTH, 1) === DRAW_WIDTH - DRAW_MARGIN_X (${toCanvasX(FIELD_WIDTH, 1)} = ${DRAW_WIDTH - DRAW_MARGIN_X})`);
}

/* ============================================ V-9 Die Physik ist unverändert */

console.log('\nV-9  Die Physik ist unverändert');
{
	/*
	 * Die Prüfsummen wurden am 2026-09-03 mit sha256sum gegen den Stand nach
	 * Phase 8 erstellt (Lauf 1 dieser Phase rührt field.js, rng.js und
	 * storage.js nicht an). Der Hash von field.js wurde in Lauf 2 einmalig
	 * nachgezogen, als Ä-1 der Copyright-Prüfung vom 2026-09-03 einen
	 * fremden Herstellermodellnamen aus vier Kommentaren dieser Datei
	 * entfernt hat — keine einzige Rechenzeile hat sich dabei geändert
	 * (verify-physics.mjs läuft danach unverändert grün). Schlägt diese
	 * Prüfung darüber hinaus an, ist entweder der Kern angefasst worden —
	 * was diese Phase ausschließt — oder der Quotennachweis muss erneut
	 * laufen.
	 */
	const ERWARTET = {
		'field.js': '3032817e06ef06f4a98fdcfcce1cce92b3efebcfad2e6c5aaea46b7f13a1b581',
		'rng.js': '2715942c0d9f077b818f6992a9aa6976b437b772fbdf01a4958b6ef85344c262',
		'storage.js': 'ece236ed79bf77324cac35f30516967c61093ba5f495dc4d6efc2c3f349495b7',
	};
	for (const [name, erwarteterHash] of Object.entries(ERWARTET)) {
		const text = await readFile(resolve(JS, name), 'utf8');
		const hash = createHash('sha256').update(text, 'utf8').digest('hex');
		check(hash === erwarteterHash, `${name}: sha256 unverändert (${hash === erwarteterHash ? 'stimmt' : `${hash} ≠ ${erwarteterHash}`})`);
	}
	// checksum() aus field.js selbst wird bereits von verify-physics.mjs
	// geprüft; hier zusätzlich, dass sie überhaupt geladen werden konnte.
	check(typeof checksum === 'function', 'checksum() aus field.js ist erreichbar');
	check(typeof MAX_RADIUS === 'number', 'MAX_RADIUS aus field.js ist erreichbar');
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
