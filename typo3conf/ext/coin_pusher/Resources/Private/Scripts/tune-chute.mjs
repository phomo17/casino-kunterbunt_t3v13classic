/**
 * Coin Pusher – Suchlauf über die Ablenkleisten (CHUTE_REACH)
 * ===========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Zwei Stufen:
 *
 *   STUFE 0 – der NACHWEIS, dass die Schachtbreite (CHUTE_WIDTH) allein die
 *   Zielquote 48–52 % nicht mehr trägt. Anhang E benannte ursprünglich die
 *   Schachtbreite als die eine erlaubte Stellschraube; die Ablösung durch
 *   CHUTE_REACH ist ein ausdrücklich vermerkter Konzeptverstoß (DECISIONS.md,
 *   2026-09-04 11:38) und wird hier GEMESSEN, nicht behauptet.
 *
 *   STUFE 1 – die eigentliche Suche über CHUTE_REACH, die Stellschraube, die
 *   CHUTE_WIDTH abgelöst hat (CONCEPT.md B.9.4 / Anhang E, Ablösung siehe
 *   oben; „ihr Wert ist ein benannter, dokumentierter Wert an genau einer
 *   Stelle im Code" gilt jetzt für CHUTE_REACH).
 *
 * DIESES SKRIPT ÄNDERT KEINE DATEI. Es druckt eine Tabelle, und der Mensch
 * trägt den gewählten Wert danach von Hand in field.js ein. Das ist Absicht:
 * CONCEPT.md B.9.4 verbietet einen unsichtbaren Regler ausdrücklich – „das
 * Gerät soll nicht lügen" –, und eine Zahl, die ein Skript selbsttätig in den
 * Quelltext schreibt, kann niemand mehr nachvollziehen.
 *
 * REIHENFOLGE ZU tune-layout.mjs, UND WARUM SIE SICH JETZT UNTERSCHEIDET JE
 * STUFE (Ausführungsplan Abschnitt 7.2 / Manifest, `measurements`):
 *
 *   STUFE 0 LÄUFT VOR tune-layout.mjs (M1 vor M2). Sie prüft eine rein
 *   GEOMETRISCHE Eigenschaft von CHUTE_WIDTH gegen die Münzhalbmesser – ob
 *   ein Münzmittelpunkt die Bodenkante überhaupt überschreiten kann –, und
 *   diese Eigenschaft hängt kaum an der genauen Maßordnung. Sie darf deshalb
 *   mit der noch UNGEMESSENEN, vorläufigen Maßordnung aus field.js laufen.
 *
 *   STUFE 1 LÄUFT NACH tune-layout.mjs (M3 nach M2), UNVERÄNDERT AUS DER
 *   BEGRÜNDUNG DER ERSTEN AUSLEGUNG: tune-layout.mjs legt fest, ob der
 *   Mechanismus überhaupt trägt (Berührungskette, Stapeln, beide Ebenen
 *   besetzt, Vorschub ohne Einwurf) – ohne einen tragenden Mechanismus misst
 *   dieser Suchlauf nur Rauschen, weil eine Quote, die aus einem Feld kommt,
 *   das gar nicht richtig funktioniert, keine Aussage über CHUTE_REACH ist.
 *
 * Aufruf:
 *
 *   Stufe 0 (Nachweis, vor tune-layout.mjs, ca. 10 min):
 *     ddev exec node .../tune-chute.mjs --stage=0
 *
 *   Stufe 1 (die eigentliche Suche, nach tune-layout.mjs, ca. 20–40 min):
 *     ddev exec node .../tune-chute.mjs
 *
 *   Stufe 0 mit einer anderen Breitenliste:
 *     ddev exec node .../tune-chute.mjs --stage=0 --widths=4.5,5.0,5.5
 *
 *   Stufe 1 mit einer anderen Reichweitenliste (Nachlauf auf engerem Bereich):
 *     ddev exec node .../tune-chute.mjs --reaches=14,16,18,20
 *
 * Schreibt nichts, verändert nichts – nur Konsolenausgabe.
 *
 *
 * WAS IN BEIDEN STUFEN GEMESSEN WIRD
 * -------------------------------------
 * Je Kandidat (Breite in Stufe 0, Reichweite in Stufe 1) und Münzwert: ein
 * Feld mit dem für diesen Münzwert dokumentierten Startwert (SEEDS) anlegen,
 * WARMUP Münzen werfen und NICHT zählen (Einlauf, bis das Feld eingeschwungen
 * ist), dann alle Bilanzzähler auf null zurücksetzen und den Anfangsbestand
 * (Summe der Werte der dann im Feld liegenden Münzen) merken, SAMPLE Münzen
 * werfen und zählen, danach den Endbestand merken. Die gemessene Quote:
 *
 *   quote = wonValue / (thrownValue + anfangsbestand - endbestand)
 *
 * Der Bestandsausgleich im Nenner ist kein Beiwerk. Das Feld ist am Ende
 * nicht genau so voll wie am Anfang der Messphase. Ohne den Ausgleich
 * zählte man Münzen als „eingesetzt", die noch im Feld liegen und nur noch
 * nicht heruntergefallen sind – die Quote sähe künstlich niedrig aus. Mit
 * dem Ausgleich misst man das, was CONCEPT.md B.9.4 meint: von allem, was in
 * das Gerät hineingegangen ist, wie viel kommt vorn wieder heraus.
 *
 * STUFE 0 IST BEWUSST GRÖBER AUSGELEGT als Stufe 1 (weniger Einlauf, weniger
 * gezählte Münzen) – sie ist ein Vorlauf-Nachweis, kein Quotennachweis, und
 * soll Minuten dauern, nicht so lange wie die eigentliche Suche. Der
 * belastbare Nachweis der Quote kommt danach mit verify-payout.mjs über
 * 100.000 Münzen je Wert.
 *
 *
 * DIE OFFENE GEOMETRIE-RANDBEDINGUNG AUS F-23 – „IM FANG DER LEISTE"
 * ---------------------------------------------------------------------
 * verify-physics.mjs, F-23, hat mit den noch ungemessenen Werten
 * CHUTE_REACH = 18 und WALL_TAPER = 0,10 einen festen Punkt gefunden, an dem
 * eine Münze im Winkel zwischen Ablenkleiste und Trichterwand hängen bleibt
 * und weder den Schacht noch die Abwurfkante erreicht – F-1 (Leistengeometrie)
 * und F-24 (Trichter) bleiben davon unberührt, es ist kein Fehler in
 * field.js gegenüber dem Plan, sondern eine Eigenschaft dieser konkreten,
 * noch ungemessenen Zahlen. STUFE 1 behandelt das als RANDBEDINGUNG DER
 * MASSSUCHE: zu jeder geprüften Reichweite wird zusätzlich probeTrap()
 * gerechnet – dieselbe Kulisse wie F-23 (größter Münzwert, fester
 * Vorschub-Platzhalter von 3 Einheiten/s, bis zu vier Umläufe Zeit), an drei
 * Stellen im Fangbereich der Leiste (ein Viertel, die Hälfte, drei Viertel
 * der Reichweite). Bleibt die Münze an irgendeiner dieser Stellen stehen,
 * wird die Reichweite als „gefangen" markiert, in der Tabelle ausgewiesen
 * und von der EMPFEHLUNG ausgeschlossen – die gemessene Quote wird trotzdem
 * gedruckt, denn sie ist nicht falsch, nur die Reichweite ist als Bauwert
 * ungeeignet. Eine Reichweite, die nicht fängt, kommt in Frage; das ist eine
 * eigene Entscheidung des Umsetzenden (siehe Bericht), weil der Plan an
 * dieser Stelle offen lässt, ob die Suche selbst die Randbedingung tragen
 * muss – die Alternative, WALL_TAPER als zweite Stellschraube zu drehen,
 * wäre der von B.9.4 verbotene unsichtbare Regler und kommt nicht in Frage.
 *
 *
 * WENN STUFE 0 DIE ERWARTUNG NICHT TRIFFT
 * -----------------------------------------------
 * Erwartung, aus der Bauart hergeleitet: eine Münze gilt als verloren, sobald
 * ihr Mittelpunkt die Bodenkante überschreitet; ist CHUTE_WIDTH kleiner als
 * der Halbmesser, kann sie das nicht – die Schachtbreite wirkt je Münzwert
 * wie ein Schalter, nicht wie ein Regler. Bestätigt sich das NICHT (der
 * größte Münzwert fällt bei einer geprüften Breite unter das Band 48–52 %),
 * ist dieser Plan an dieser Stelle falsch: CHUTE_WIDTH wäre dann doch eine
 * brauchbare Stellschraube, CHUTE_REACH könnte auf 0 bleiben, und der Befund
 * gehört mit der gemessenen Tabelle nach DECISIONS.md, bevor Stufe 1 läuft.
 *
 *
 * WENN STUFE 1 KEINE REICHWEITE IM BAND FINDET
 * -------------------------------------------------
 * Das Skript sagt es ausdrücklich und nennt die Richtung:
 *
 *   – Alle Quoten zu HOCH bei Reichweite 0: das ist NICHT die Leiste,
 *     sondern die Maßordnung – tune-layout.mjs erneut lesen, Sonderfall K3.
 *   – Alle Quoten zu NIEDRIG bei der größten Reichweite: REACHES bis über
 *     0,30 × FIELD_WIDTH hinaus verlängern (--reaches=...).
 *   – Die vier Werte liegen weit auseinander (mehr als 4 Prozentpunkte
 *     zwischen kleinstem und größtem): F-8 in verify-physics.mjs erneut
 *     lesen (Stückzahlband 150–250), dann K4/K5 aus tune-layout.mjs.
 *   – Jede Reichweite, die im Band läge, ist „gefangen" (siehe oben): die
 *     Randbedingung schließt das ganze Band aus. WALL_TAPER ist Bauart und
 *     KEINE zweite Stellschraube; stattdessen prüfen, ob eine gröbere
 *     Rasterung der Suche eine schmale, ungefangene Lücke im Band
 *     übersprungen hat (--reaches= mit engerem Abstand), und den Befund nach
 *     DECISIONS.md melden.
 *
 * Jeder dieser Fälle ist eine Auslegung und gehört, wenn er eintritt, mit dem
 * gewählten Wert in DECISIONS.md.
 */

import {
	Field, COIN_VALUES, COIN_RADIUS, CHUTE_WIDTH, FIELD_WIDTH, DEFLECT_DEPTH, PLATE_PERIOD_STEPS,
} from '../../Public/JavaScript/field.js';
import { createSeeded } from '../../Public/JavaScript/rng.js';

/**
 * Startwert je Münzwert. Für JEDEN Kandidaten dieselben vier Startwerte,
 * damit die Kandidaten untereinander vergleichbar sind und nicht der Zufall
 * den Unterschied macht. Dieselben wie in tune-layout.mjs und
 * verify-payout.mjs.
 */
const SEEDS = { 1: 20260901, 2: 20260902, 5: 20260905, 10: 20260910 };

/** Startwert des Fallenproben-Feldes (probeTrap) – fest, unabhängig von SEEDS. */
const TRAP_SEED = 20260923;

/**
 * Zeitschritte zwischen zwei Einwürfen: 48 = 0,2 s = fünf Münzen je Sekunde.
 * Das ist die Taktrate eines Spielers, der die Taste gedrückt hält.
 */
const THROW_INTERVAL_STEPS = 48;

/**
 * STUFE 0 – die abgesuchten Schachtbreiten, über ihren ganzen baulich
 * sinnvollen Bereich (von unter dem kleinsten bis über dem größten
 * Halbmesser hinaus).
 */
const STAGE0_WIDTHS = [4.0, 6.0, 8.8, 12.0, 16.0, 20.0];

/**
 * STUFE 0 – bewusst GRÖBER als Stufe 1 (siehe Kopfkommentar): kleinerer
 * Einlauf, weniger gezählte Münzen. Ziel ist eine Größenordnung in wenigen
 * Minuten, nicht ein belastbarer Quotenwert.
 */
const STAGE0_WARMUP = 800;
const STAGE0_SAMPLE = 3000;

/**
 * STUFE 1 – die abgesuchten Reichweiten der Ablenkleiste, 0 bis
 * 0,30 × FIELD_WIDTH in zwölf gleichmäßigen Schritten (0 eingeschlossen –
 * das ist der Kontrollpunkt „keine Leiste", gegen den sich jede größere
 * Reichweite abhebt). FIELD_WIDTH kommt aus field.js und ist damit
 * automatisch die gemessene Maßordnung, sobald tune-layout.mjs gelaufen ist.
 */
const DEFAULT_REACHES = Array.from({ length: 12 }, (_, i) => (i * 0.30 * FIELD_WIDTH) / 11);

/**
 * STUFE 1 – Einlauf und gezählte Münzen. Bewusst klein – der Suchlauf soll
 * Minuten bis wenige zehn Minuten dauern, nicht Stunden; der belastbare
 * Nachweis kommt danach mit verify-payout.mjs über 100.000 Münzen je Wert.
 */
const WARMUP = 1500;
const SAMPLE = 8000;

const BAND_MIN = 0.48;
const BAND_MAX = 0.52;
const SPREAD_LIMIT = 0.04;

/**
 * probeTrap(): wie viele Umläufe Zeit die Fallenprobe bekommt, bevor eine
 * stehengebliebene Münze als „gefangen" gilt. Identisch mit F-23 in
 * verify-physics.mjs.
 */
const TRAP_PROBE_CYCLES = 4;

/**
 * Anzahl Zeitschritte, mit denen die Anfangsschätzung der Laufzeit
 * kalibriert wird – klein genug, um die Schätzung sofort zu drucken, groß
 * genug, um die Rechenlast der Stoßauflösung realistisch zu treffen.
 */
const CALIBRATION_STEPS = 20000;

/**
 * @param {string[]} argv
 * @returns {{stage: '0'|'1'}}
 */
function parseStage(argv) {
	const flag = argv.find((entry) => entry.startsWith('--stage='));
	if (flag === undefined) { return { stage: '1' }; }
	const stage = flag.slice('--stage='.length);
	if (stage !== '0' && stage !== '1') {
		throw new RangeError(`--stage muss "0" oder "1" sein, nicht "${stage}"`);
	}
	return { stage };
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @param {number[]} fallback
 * @returns {number[]}
 */
function parseNumberList(argv, name, fallback) {
	const flag = argv.find((entry) => entry.startsWith(`--${name}=`));
	if (flag === undefined) { return fallback; }
	const values = flag.slice(`--${name}=`.length).split(',').map(Number);
	if (values.some((v) => !Number.isFinite(v) || v < 0)) {
		throw new RangeError(`--${name} enthält einen ungültigen Wert: ${flag}`);
	}
	return values;
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
 * Wirft `coins` Münzen desselben Werts, dazwischen je THROW_INTERVAL_STEPS
 * Zeitschritte.
 *
 * @param {Field} field
 * @param {number} coins
 * @param {number} value
 * @returns {void}
 */
function runCoins(field, coins, value) {
	for (let c = 0; c < coins; c++) {
		field.throwCoin(value);
		for (let s = 0; s < THROW_INTERVAL_STEPS; s++) { field.step(); }
	}
}

/**
 * Misst die Quote nach dem Dreischritt aus dem Kopfkommentar: Einlauf →
 * Bestandsausgleich zurücksetzen → gezählter Lauf.
 *
 * @param {number} warmup
 * @param {number} sample
 * @param {number} value
 * @param {{chuteWidth?: number, chuteReach?: number}} fieldOptions
 * @returns {number} Quote, z. B. 0.50
 */
function measureQuote(warmup, sample, value, fieldOptions) {
	const field = new Field({ random: createSeeded(SEEDS[value]), ...fieldOptions });

	runCoins(field, warmup, value);

	field.thrownValue = 0;
	field.wonValue = 0;
	field.chuteValue = 0;
	field.valveValue = 0;
	const startBalance = balanceOfField(field);

	runCoins(field, sample, value);

	const endBalance = balanceOfField(field);
	const denominator = field.thrownValue + startBalance - endBalance;
	return field.wonValue / denominator;
}

/**
 * Platziert eine einzelne Münze von Hand, wie placeCoin() in
 * verify-physics.mjs. Lokal gehalten, damit tune-chute.mjs weiterhin ohne
 * Abhängigkeit zum Nachweisskript auskommt.
 *
 * @param {Field} field
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function placeProbeCoin(field, x, y) {
	const value = COIN_VALUES[COIN_VALUES.length - 1];   // größter Halbmesser, ungünstigster Fall
	field.x[0] = x;
	field.y[0] = y;
	field.z[0] = 0;
	field.vx[0] = 0;
	field.vy[0] = 0;
	field.vz[0] = 0;
	field.r[0] = COIN_RADIUS[COIN_VALUES.length - 1];
	field.value[0] = value;
	field.born[0] = 0;
	field.count = 1;
}

/**
 * Die F-23-Randbedingung, verallgemeinert auf eine beliebige Reichweite:
 * eine Münze im Fangbereich der Leiste, mit demselben Vorschub-Platzhalter
 * wie F-23 (3 Einheiten/s, weil eine einzelne Münze ohne Nachbardruck außer-
 * halb der Reichweite der Vorderwand binnen rund 50 Schritten steht bleibt –
 * F-25). Geprüft an drei Stellen im Fangbereich; „gefangen" heißt, dass die
 * Münze an mindestens einer davon das Feld nicht binnen TRAP_PROBE_CYCLES
 * Umläufen verlässt.
 *
 * @param {number} reach
 * @returns {number[]} die x-Werte, an denen die Münze gefangen blieb (leer,
 *          wenn keine Falle gefunden wurde oder reach === 0)
 */
function probeTrap(reach) {
	if (reach <= 0) { return []; }
	const budget = TRAP_PROBE_CYCLES * PLATE_PERIOD_STEPS;
	const trapped = [];
	for (const fraction of [0.25, 0.5, 0.75]) {
		const x = reach * fraction;
		const field = new Field({ random: createSeeded(TRAP_SEED), chuteReach: reach });
		placeProbeCoin(field, x, DEFLECT_DEPTH - 1);
		let s = 0;
		while (field.count === 1 && s < budget) {
			field.vy[0] = -3;   // Nachbardruck-Platzhalter, wie F-23 in verify-physics.mjs
			field.step();
			s++;
		}
		if (field.count === 1) { trapped.push(Number(x.toFixed(3))); }
	}
	return trapped;
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
 * Kalibriert die Zeitschritte/Sekunde dieser Maschine an einem kurzen Lauf,
 * damit die Gesamtlaufzeit VOR dem ersten Kandidaten geschätzt werden kann.
 *
 * @param {{chuteWidth?: number, chuteReach?: number}} fieldOptions
 * @returns {number} Zeitschritte/Sekunde
 */
function calibrate(fieldOptions) {
	const field = new Field({ random: createSeeded(SEEDS[1]), ...fieldOptions });
	const start = process.hrtime.bigint();
	let throws = 0;
	for (let step = 0; step < CALIBRATION_STEPS; step++) {
		if (step % THROW_INTERVAL_STEPS === 0) {
			field.throwCoin(COIN_VALUES[throws % COIN_VALUES.length]);
			throws++;
		}
		field.step();
	}
	const seconds = Number(process.hrtime.bigint() - start) / 1e9;
	return CALIBRATION_STEPS / seconds;
}

const args = process.argv.slice(2);
const { stage } = parseStage(args);

/* ==========================================================================
   STUFE 0 – der Nachweis, dass die Schachtbreite allein nicht genügt.
   ========================================================================== */

if (stage === '0') {
	const widths = parseNumberList(args, 'widths', STAGE0_WIDTHS);

	console.log(`STUFE 0 – Nachweis über ${widths.length} Schachtbreiten × ${COIN_VALUES.length} Münzwerte, `
		+ `chuteReach = 0 (also OHNE Ablenkleisten), ${STAGE0_WARMUP} Einlauf + ${STAGE0_SAMPLE} gezählt je `
		+ 'Münzwert. Bewusst gröber ausgelegt als Stufe 1, siehe Kopfkommentar.');
	console.log(`Breiten: ${widths.join(', ')}\n`);

	const stepsPerSecond = calibrate({ chuteWidth: widths[0], chuteReach: 0 });
	const totalSteps = widths.length * COIN_VALUES.length * (STAGE0_WARMUP + STAGE0_SAMPLE) * THROW_INTERVAL_STEPS;
	console.log(`Kalibrierung: ${Math.round(stepsPerSecond).toLocaleString('de-DE')} Zeitschritte/s auf dieser `
		+ `Maschine. Geschätzte Gesamtlaufzeit: ${formatDuration(totalSteps / stepsPerSecond)} für `
		+ `${totalSteps.toLocaleString('de-DE')} Zeitschritte insgesamt.\n`);

	/** @type {Map<number, Map<number, number>>} Breite → (Münzwert → Quote) */
	const results = new Map();
	const overallStart = process.hrtime.bigint();
	let stepsDone = 0;
	const stepsPerWidth = COIN_VALUES.length * (STAGE0_WARMUP + STAGE0_SAMPLE) * THROW_INTERVAL_STEPS;

	console.log('Breite  ' + COIN_VALUES.map((v) => `Wert ${v}`.padStart(10)).join('  ') + '  [verbleibend]');

	for (const width of widths) {
		const row = new Map();
		for (const value of COIN_VALUES) {
			row.set(value, measureQuote(STAGE0_WARMUP, STAGE0_SAMPLE, value, { chuteWidth: width, chuteReach: 0 }));
		}
		results.set(width, row);
		stepsDone += stepsPerWidth;

		const elapsedSeconds = Number(process.hrtime.bigint() - overallStart) / 1e9;
		const remainingSeconds = (elapsedSeconds / stepsDone) * (totalSteps - stepsDone);
		console.log(`${width.toFixed(1).padStart(6)}  ` + [...row.values()].map(formatPercent).join('  ')
			+ `  [verbleibend ${formatDuration(remainingSeconds)}]`);
	}

	// Der Befund: bleibt der GRÖSSTE Münzwert (Halbmesser 4,4) über JEDE
	// geprüfte Breite oberhalb des Bandes, ist die Schachtbreite je Münzwert
	// ein Schalter statt eines Reglers und die Ablösung durch CHUTE_REACH ist
	// belegt. Bleibt er das NICHT, ist der Plan an dieser Stelle falsch.
	const largestValue = COIN_VALUES[COIN_VALUES.length - 1];
	const largestQuotes = widths.map((w) => results.get(w).get(largestValue));
	const alwaysAboveBand = largestQuotes.every((q) => q > BAND_MAX);

	console.log('\nBEFUND:');
	if (alwaysAboveBand) {
		console.log(`  Münzwert ${largestValue} bleibt über alle ${widths.length} geprüften Schachtbreiten `
			+ `zwischen ${formatPercent(Math.min(...largestQuotes)).trim()} und `
			+ `${formatPercent(Math.max(...largestQuotes)).trim()} und damit über dem Band `
			+ `${BAND_MIN * 100}–${BAND_MAX * 100} % — die Schachtbreite allein erreicht die Zielquote NICHT. `
			+ 'Die Ablösung durch CHUTE_REACH (DECISIONS.md, 2026-09-04 11:38) ist damit gemessen bestätigt; '
			+ 'Stufe 1 kann laufen.');
	} else {
		console.log(`  Münzwert ${largestValue} fällt bei mindestens einer geprüften Schachtbreite in oder unter `
			+ `das Band ${BAND_MIN * 100}–${BAND_MAX * 100} % (kleinste gemessene Quote: `
			+ `${formatPercent(Math.min(...largestQuotes)).trim()}). DIESER PLAN IST AN DIESER STELLE FALSCH: `
			+ 'CHUTE_WIDTH wäre dann doch eine brauchbare Stellschraube. Diese Tabelle gehört mit dem Befund nach '
			+ 'DECISIONS.md, BEVOR Stufe 1 läuft.');
	}
	process.exit(0);
}

/* ==========================================================================
   STUFE 1 – die Suche über CHUTE_REACH.
   ========================================================================== */

const reaches = parseNumberList(args, 'reaches', DEFAULT_REACHES);

console.log(`STUFE 1 – Suchlauf über ${reaches.length} Reichweiten × ${COIN_VALUES.length} Münzwerte × `
	+ `${(WARMUP + SAMPLE).toLocaleString('de-DE')} Münzen (${WARMUP.toLocaleString('de-DE')} Einlauf, `
	+ `${SAMPLE.toLocaleString('de-DE')} gezählt) × ${THROW_INTERVAL_STEPS} Zeitschritte je Münze, `
	+ `CHUTE_WIDTH = ${CHUTE_WIDTH} (Bauart, unverändert).`);
console.log(`Reichweiten: ${reaches.map((r) => r.toFixed(2)).join(', ')}`);

const stepsPerSecond = calibrate({ chuteReach: reaches[0] });
const totalSteps = reaches.length * COIN_VALUES.length * (WARMUP + SAMPLE) * THROW_INTERVAL_STEPS;
console.log(`\nKalibrierung: ${Math.round(stepsPerSecond).toLocaleString('de-DE')} Zeitschritte/s auf dieser `
	+ `Maschine (${CALIBRATION_STEPS.toLocaleString('de-DE')} Schritte gemessen).`);
console.log(`Geschätzte Gesamtlaufzeit: ${formatDuration(totalSteps / stepsPerSecond)} für `
	+ `${totalSteps.toLocaleString('de-DE')} Zeitschritte insgesamt (die Fallenprobe je Reichweite kommt mit `
	+ 'wenigen tausend zusätzlichen Zeitschritten kaum ins Gewicht).\n');

/** @type {Map<number, Map<number, number>>} Reichweite → (Münzwert → Quote) */
const results = new Map();
/** @type {Map<number, number[]>} Reichweite → gefangene x-Werte (leer = sauber) */
const trapResults = new Map();

const overallStart = process.hrtime.bigint();
let stepsDone = 0;
const stepsPerReach = COIN_VALUES.length * (WARMUP + SAMPLE) * THROW_INTERVAL_STEPS;

console.log('Reichw. ' + COIN_VALUES.map((v) => `Wert ${v}`.padStart(10)).join('  ')
	+ '  kleinste  größte  Abstand zum Band  Falle');

for (const reach of reaches) {
	const row = new Map();
	for (const value of COIN_VALUES) {
		row.set(value, measureQuote(WARMUP, SAMPLE, value, { chuteReach: reach }));
	}
	results.set(reach, row);
	const trapped = probeTrap(reach);
	trapResults.set(reach, trapped);
	stepsDone += stepsPerReach;

	const quotes = [...row.values()];
	const min = Math.min(...quotes);
	const max = Math.max(...quotes);
	const distanceToBand = Math.min(min - BAND_MIN, BAND_MAX - max);

	const elapsedSeconds = Number(process.hrtime.bigint() - overallStart) / 1e9;
	const remainingSeconds = (elapsedSeconds / stepsDone) * (totalSteps - stepsDone);

	console.log(`${reach.toFixed(2).padStart(7)}  ` + quotes.map(formatPercent).join('  ')
		+ `  ${formatPercent(min)}  ${formatPercent(max)}  ${(distanceToBand * 100).toFixed(2).padStart(6)} Pkt`
		+ `  ${trapped.length > 0 ? `JA (${trapped.join('/')})` : '–'}`
		+ `   [verbleibend ${formatDuration(remainingSeconds)}]`);
}

/* ------------------------------------------------------------------------
   Empfehlung: die Reichweite mit dem größten Abstand zum näheren Bandrand,
   unter allen Reichweiten, bei denen ALLE VIER Münzwerte im Band liegen UND
   die Fallenprobe sauber bleibt (siehe F-23-Randbedingung im Kopfkommentar).
   ------------------------------------------------------------------------ */

console.log('');

const inBand = [];
const inBandButTrapped = [];
for (const [reach, row] of results) {
	const quotes = [...row.values()];
	if (quotes.every((q) => q >= BAND_MIN && q <= BAND_MAX)) {
		const margin = Math.min(...quotes.map((q) => Math.min(q - BAND_MIN, BAND_MAX - q)));
		if (trapResults.get(reach).length === 0) {
			inBand.push({ reach, margin, quotes: row });
		} else {
			inBandButTrapped.push({ reach, margin, quotes: row, trapped: trapResults.get(reach) });
		}
	}
}

if (inBand.length > 0) {
	inBand.sort((a, b) => b.margin - a.margin);
	const best = inBand[0];
	console.log(`EMPFEHLUNG: CHUTE_REACH = ${best.reach.toFixed(2)} – alle vier Münzwerte im Band `
		+ `${BAND_MIN * 100}–${BAND_MAX * 100} %, größter Abstand zum näheren Bandrand: `
		+ `${(best.margin * 100).toFixed(2)} Prozentpunkte, Fallenprobe sauber.`);
	for (const [value, quote] of best.quotes) {
		console.log(`  Münzwert ${value}: ${formatPercent(quote)}`);
	}
	if (inBandButTrapped.length > 0) {
		console.log(`\n  (${inBandButTrapped.length} weitere Reichweite(n) lägen ebenfalls im Band, sind aber `
			+ `„gefangen" (F-23-Randbedingung) und deshalb NICHT empfohlen: `
			+ `${inBandButTrapped.map((r) => r.reach.toFixed(2)).join(', ')}.)`);
	}
	process.exit(0);
}

console.log('KEINE Reichweite erfüllt „alle vier Münzwerte im Band UND Fallenprobe sauber" – siehe die vier '
	+ 'Sonderfälle im Kopfkommentar.');

if (inBandButTrapped.length > 0) {
	console.log(`\nSonderfall „im Band, aber gefangen": ${inBandButTrapped.length} Reichweite(n) lägen im Band `
		+ `${BAND_MIN * 100}–${BAND_MAX * 100} %, sind aber an der F-23-Randbedingung gefangen: `
		+ `${inBandButTrapped.map((r) => `${r.reach.toFixed(2)} (${r.trapped.join('/')})`).join('; ')}. `
		+ 'WALL_TAPER ist Bauart und KEINE zweite Stellschraube; ein engeres --reaches= kann eine schmale, '
		+ 'ungefangene Lücke im Band finden. Befund nach DECISIONS.md.');
}

const narrowest = results.get(reaches[0]);
const narrowestQuotes = [...narrowest.values()];
if (narrowestQuotes.every((q) => q > BAND_MAX)) {
	console.log(`\nSonderfall „zu hoch bei der kleinsten geprüften Reichweite": alle vier Quoten liegen bei `
		+ `Reichweite ${reaches[0].toFixed(2)} über ${BAND_MAX * 100} %. Ist das die Reichweite 0 (keine Leiste), `
		+ 'ist das nicht die Leiste, sondern die Maßordnung – tune-layout.mjs erneut lesen, dort Sonderfall K3. '
		+ 'Ist es eine größere Reichweite, REACHES bei 0 beginnen lassen, um das zu unterscheiden.');
}

const widest = results.get(reaches[reaches.length - 1]);
const widestQuotes = [...widest.values()];
if (widestQuotes.every((q) => q < BAND_MIN)) {
	console.log(`\nSonderfall „zu niedrig bei größter Reichweite": alle vier Quoten liegen bei der größten `
		+ `geprüften Reichweite (${reaches[reaches.length - 1].toFixed(2)}) unter ${BAND_MIN * 100} %. REACHES `
		+ 'über 0,30 × FIELD_WIDTH hinaus verlängern (--reaches=...).');
}

for (const [reach, row] of results) {
	const quotes = [...row.values()];
	const spread = Math.max(...quotes) - Math.min(...quotes);
	if (spread > SPREAD_LIMIT) {
		console.log(`\nSonderfall „weit auseinander" bei Reichweite ${reach.toFixed(2)}: Abstand zwischen `
			+ `kleinster und größter Quote ${(spread * 100).toFixed(2)} Prozentpunkte (Grenze `
			+ `${SPREAD_LIMIT * 100}). F-8 in verify-physics.mjs erneut lesen (Stückzahlband 150–250), dann K4/K5 `
			+ 'aus tune-layout.mjs prüfen.');
	}
}

process.exit(1);
