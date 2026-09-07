/**
 * Craps – Nachweis Physikkern (Wiederholbarkeit, Grenzen, Mischung, Unabhängigkeit)
 * ====================================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit
 * außer stats.mjs (derselbe Ordner); es genügt ein Node ab Version 18.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/verify-physics.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Teil 2, Abschnitt 4.33)
 * ---------------------------------------------------------
 *   P-1   Quelltext: nur bitgenau festgelegte Rechenarten
 *   P-2   Wiederholbarkeit: gleiche Saat → exakt gleicher Verlauf
 *   P-3   verschiedene Saat → verschiedene Folge (Gegenprobe zu P-2)
 *   P-4   kein Würfel verlässt je den Tisch, keiner bleibt auf einer Kante
 *   P-5   jeder Wurf endet mit genau zwei Augenzahlen
 *   P-6   die Notbremse (MAX_STEPS) greift nie
 *   P-7   alle sechs Flächen kommen vor — die Falle des Kippmodells ist geschlossen
 *   P-8   die Würfel erleben wirklich etwas, und das Auslegungsband stimmt
 *   P-9   die doppelt geführten Zahlen (dice-physics.js/dice-geometry.js) stimmen überein
 *   P-10  das Verwerfungsverfahren zieht sauber, keine frühe Schieflage
 *
 * WARUM DIESE DATEI SICH SELBST NICHT AUSFÜHRT, WENN SIE IMPORTIERT WIRD
 * ------------------------------------------------------------------------
 * measure-dice.mjs braucht wurfBisGueltig() aus genau dieser Datei. Ein
 * ES-Modul führt seinen Code beim ersten import aber sofort aus — stünde der
 * gesamte Prüflauf einschließlich process.exit() auf oberster Ebene, würde
 * jeder Import sofort P-1 bis P-10 mitlaufen lassen und den Prozess danach
 * beenden, bevor measure-dice.mjs auch nur eine Zeile seines eigenen Laufs
 * erreicht. Deshalb steht der komplette Prüflauf in main(), und main() wird
 * nur aufgerufen, wenn diese Datei das unmittelbar gestartete Programm ist
 * (Prüfung über process.argv[1] am Dateiende). Der Import von
 * wurfBisGueltig() bleibt dabei folgenlos: es ist eine reine Funktion ohne
 * Seiteneffekt beim Definieren.
 *
 * WARUM DER REST-OPERATOR-CHECK IN P-1 GENAU EINE STELLE AUSNIMMT
 * -------------------------------------------------------------------
 * zieheGanzzahl() in dice-physics.js wendet % ausschließlich auf
 * 32-Bit-Ganzzahlen an (das Verwerfungsverfahren aus CONCEPT.md C.5.2) —
 * dort ist der Rest-Operator bitgenau. Überall sonst wäre % auf einer
 * Fließkommazahl NICHT bitgenau festgelegt. Die Prüfung schneidet deshalb
 * genau den Funktionskörper von zieheGanzzahl() heraus und verlangt, dass im
 * Rest der Datei kein einziges % mehr vorkommt.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chiSquareUniform, chiSquareIndependence, selbsttest } from './stats.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/craps/ */
const EXT = path.resolve(HIER, '../../..');

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

/** Entfernt Block- und Zeilenkommentare. */
function ohneKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Wirft, bis der Wurf gültig ist, und zählt die Fehlversuche mit. Genau das,
 * was am Tisch geschieht: „erreichen die Würfel die gegenüberliegende Bande
 * nicht, gilt der Wurf nicht und wird wiederholt" (CONCEPT.md C.8.2).
 * Deshalb steht die Schleife hier an EINER Stelle und nicht zweimal — der
 * Nachweis muss dieselbe Regel benutzen wie das Spiel, sonst misst er ein
 * anderes Spiel.
 *
 * Exportiert für measure-dice.mjs (Plan Teil 2, Abschnitt 4.33/4.35).
 *
 * KEINE OBERE GRENZE DER VERSUCHE — eine Grenze wäre eine stille
 * Ergebniskorrektur; ein Modell, das nie einen gültigen Wurf zustande
 * brächte, muss hängen und auffallen, statt heimlich ein Ergebnis zu
 * liefern. P-8 sichert vorher ab, dass das nicht eintritt.
 *
 * @param {import('../../Public/JavaScript/dice-physics.js').DiceTable} tisch
 * @param {?Array<object>} [setup] wird unverändert an tisch.roll() durchgereicht
 * @returns {{faces: number[], sum: number, tries: number}}
 */
export function wurfBisGueltig(tisch, setup = null) {
	let tries = 0;
	let r;
	do {
		tisch.roll(setup);
		while (tisch.phase === 'rollt') {
			tisch.step();
		}
		r = tisch.result();
		tries += 1;
	} while (!r.valid);
	return { faces: r.faces, sum: r.sum, tries };
}

/* ===================================================== Der Prüflauf ===== */

async function main() {
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

	console.log('\nCraps – Nachweis Physikkern (Wiederholbarkeit, Grenzen, Mischung, Unabhängigkeit)');
	console.log('====================================================================================\n');

	console.log('Selbsttest: stats.mjs gegen von Hand abgeschriebene Referenzwerte');
	if (!selbsttest((ok, text) => console.log(`  ${ok ? '✓' : '✗'} ${text}`))) {
		console.error('\nABBRUCH: der Selbsttest von stats.mjs ist fehlgeschlagen. Ein Nachweis mit'
			+ ' falscher Statistik soll gar nicht erst laufen (CONCEPT.md C.5.4).');
		process.exit(1);
	}
	console.log('  → bestanden.\n');

	const PHYSICS_PATH = path.join(EXT, 'Resources/Public/JavaScript/dice-physics.js');
	const PHYSICS_SOURCE = lies(PHYSICS_PATH);
	const PHYSICS_CLEAN = ohneKommentare(PHYSICS_SOURCE);

	console.log('P-1  Quelltext: nur bitgenau festgelegte Rechenarten, keine Winkelfunktion');
	{
		const VERBOTENE_NAMEN = [
			'Date', 'performance', 'document', 'window', 'localStorage', 'require\\(',
		];
		for (const name of VERBOTENE_NAMEN) {
			check(!new RegExp(name).test(PHYSICS_CLEAN), `kein ${name.replace('\\(', '(')} im Quelltext`);
		}
		check(!/\bimport\s/.test(PHYSICS_CLEAN), 'kein import im Quelltext');
		check(!/Math\.random/.test(PHYSICS_CLEAN), 'kein Math.random im Quelltext');

		const VERBOTENE_FUNKTIONEN = [
			'sin', 'cos', 'tan', 'atan', 'asin', 'acos',
			'pow', 'exp', 'log', 'cbrt', 'sign', 'hypot',
		];
		for (const fn of VERBOTENE_FUNKTIONEN) {
			check(!new RegExp(`Math\\.${fn}\\b`).test(PHYSICS_CLEAN), `kein Math.${fn} im Quelltext`);
		}
		/* Math.PI/Math.SQRT2/Math.SQRT1_2: kein \b nach „PI"/„SQRT" verlangt, weil
		   SQRT2 sonst unentdeckt bliebe (kein Wortgrenzenübergang zwischen „T" und „2"). */
		check(!/Math\.PI\b/.test(PHYSICS_CLEAN), 'kein Math.PI im Quelltext');
		check(!/Math\.SQRT/.test(PHYSICS_CLEAN), 'kein Math.SQRT… im Quelltext');
		check(!/\*\*/.test(PHYSICS_CLEAN), 'kein ** (Potenzoperator) im Quelltext');

		const ziehFn = /function\s+zieheGanzzahl\([^)]*\)\s*\{[\s\S]*?\n\}/.exec(PHYSICS_CLEAN);
		check(ziehFn !== null, 'zieheGanzzahl() ist im Quelltext zu finden');
		const ohneZiehFn = ziehFn !== null ? PHYSICS_CLEAN.replace(ziehFn[0], '') : PHYSICS_CLEAN;
		check(!/%/.test(ohneZiehFn),
			'der Rest-Operator % kommt nirgends außerhalb von zieheGanzzahl() vor'
			+ ' (dort ausschließlich auf 32-Bit-Ganzzahlen, im Verwerfungsverfahren)');

		/* P-1-G: Gegenprobe. Eine künstlich eingefügte Math.sin-Zeile muss auffallen. */
		const VERGIFTET = ohneKommentare(PHYSICS_SOURCE + '\nconst probe = Math.sin(1);\n');
		check(/Math\.sin\b/.test(VERGIFTET),
			'P-1-G: eine künstlich eingefügte Math.sin-Zeile wird von der Regel erkannt (Gegenprobe der Prüfung selbst)');
	}

	let modul;
	let geometrieModul;
	let rngModul;
	try {
		modul = await import(new URL('../../Public/JavaScript/dice-physics.js', import.meta.url));
		geometrieModul = await import(new URL('../../Public/JavaScript/dice-geometry.js', import.meta.url));
		rngModul = await import(new URL('../../Public/JavaScript/rng.js', import.meta.url));
		check(true, 'dice-physics.js, dice-geometry.js und rng.js laden unter Node ohne jede Vorbereitung');
	} catch (fehlerObjekt) {
		check(false, 'dice-physics.js, dice-geometry.js und rng.js laden unter Node ohne jede Vorbereitung', String(fehlerObjekt));
		console.log(`\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen (Abbruch, Modul lädt nicht).`);
		process.exit(1);
	}

	const {
		DiceTable, DT, MAX_STEPS,
		FELT_LEFT, FELT_RIGHT, FELT_TOP, FELT_BOTTOM,
		DIE_EDGE, PYRAMID_PITCH, HALF_EDGE, DIAG_HALF, HILL_PEAK, TIP_ARC, INERTIA,
	} = modul;
	const { createSeeded } = rngModul;

	/* ========================================================= P-2 ===== */

	console.log('\nP-2  Wiederholbarkeit: gleiche Saat, gleicher Startzustand → exakt gleicher Verlauf');
	{
		const SEED = 4711;
		const LAUNCHES = 2000;

		function lauf(seed, n) {
			const t = new DiceTable({ random: createSeeded(seed) });
			const results = [];
			const snapshots = [];
			let stepCounter = 0;
			for (let i = 0; i < n; i++) {
				t.roll();
				while (t.phase !== 'liegt') {
					t.step();
					stepCounter++;
					if (stepCounter % 250 === 0) {
						snapshots.push(JSON.stringify(t.snapshot()));
					}
				}
				results.push(t.result());
			}
			return { results, snapshots };
		}

		const a = lauf(SEED, LAUNCHES);
		const b = lauf(SEED, LAUNCHES);

		check(JSON.stringify(a.results) === JSON.stringify(b.results),
			`${LAUNCHES} Würfe mit Saat ${SEED} liefern zweimal Zeichen für Zeichen dieselbe Folge von Augenzahlen`);
		check(a.snapshots.length === b.snapshots.length && a.snapshots.length > 0,
			`beide Läufe erzeugen dieselbe Anzahl Momentaufnahmen (gefunden: ${a.snapshots.length})`);
		const abweichend = [];
		for (let i = 0; i < Math.min(a.snapshots.length, b.snapshots.length); i++) {
			if (a.snapshots[i] !== b.snapshots[i]) {
				abweichend.push(`Momentaufnahme ${i}: unterscheidet sich`);
			}
		}
		check(abweichend.length === 0,
			`alle ${a.snapshots.length} Momentaufnahmen (je 250 Schritte) sind bitgleich (JSON.stringify(snapshot()))`,
			...abweichend.slice(0, 3));
	}

	/* ========================================================= P-3 ===== */

	console.log('\nP-3  Verschiedene Saat, verschiedene Folge');
	{
		const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const N = 200;
		const folgen = SEEDS.map((seed) => {
			const t = new DiceTable({ random: createSeeded(seed) });
			const results = [];
			for (let i = 0; i < N; i++) {
				results.push(t.runToRest());
			}
			return JSON.stringify(results);
		});
		const treffer = [];
		for (let i = 0; i < folgen.length; i++) {
			for (let j = i + 1; j < folgen.length; j++) {
				if (folgen[i] === folgen[j]) {
					treffer.push(`Saat ${SEEDS[i]} und Saat ${SEEDS[j]} liefern dieselbe Folge`);
				}
			}
		}
		check(treffer.length === 0,
			`alle ${SEEDS.length} Saaten liefern ${SEEDS.length} verschiedene Folgen von je ${N} Würfen`,
			...treffer);
	}

	/* ============== P-4, P-5, P-6, P-7, P-8, P-10 — der große Nachweislauf */
	/* Ein einziges DiceTable-Objekt für alle sechs Nachweise, dieselbe
	   Bauart wie beim Rad des anderen Tisches (C.6.2). */

	console.log('\nDer große Nachweislauf: 20.000 Würfe auf einem einzigen DiceTable-Objekt (C.6.2)');
	{
		const SEED = 424242;
		const N = 20000;
		const t = new DiceTable({ random: createSeeded(SEED) });

		const grenzverletzungen = [];
		const kantenverletzungen = [];
		const lagenverletzungen = [];
		let notbremseCount = 0;
		let ergebnisUngueltig = 0;
		let totalSteps = 0;
		let maxSteps = 0;

		/* P-7: Vorkommen jeder Augenzahl je Würfel, und wie viele verschiedene
		   Kippkanten ein Wurf im Mittel benutzt. */
		const faceCounts = [new Array(7).fill(0), new Array(7).fill(0)];
		let tipDirVarietySum = 0;

		/* P-8: mittlere Kippschritte, mittlere Bandenstöße, ungültige Würfe,
		   Zusammenstöße. */
		let tipsSum = 0;
		let wallHitsSum = 0;
		let ungueltigeWuerfe = 0;
		let wuerfeMitZusammenstoss = 0;

		/* P-9-Vorarbeit: gültige Lagen zum späteren Abgleich. */
		const ORIENTATION_SET = new Set(
			geometrieModul.ORIENTATIONS.map(([a, b, c]) => `${a},${b},${c}`)
		);

		for (let i = 0; i < N; i++) {
			t.roll();

			const seenTipDirs = new Set();
			/* Zusammenstoß-Instrumentierung über den öffentlichen Zustand: der
			   Abstand der beiden Würfelmittelpunkte wird während dieses Wurfs
			   beobachtet; unterschreitet er 2 · COLLIDE_RADIUS, hat es zu einem
			   Zusammenstoß gekommen (Plan Teil 2, 4.33, P-8). */
			let zusammenstossInDiesemWurf = false;
			const COLLIDE_RADIUS = 7; // aus dice-physics.js, siehe P-9

			while (t.phase !== 'liegt') {
				t.step();
				for (const die of t.dice) {
					if (die.x < FELT_LEFT + HALF_EDGE - 1e-6 || die.x > FELT_RIGHT - HALF_EDGE + 1e-6) {
						grenzverletzungen.push(`Wurf ${i}: x=${die.x}`);
					}
					if (die.y < FELT_TOP + HALF_EDGE - 1e-6 || die.y > FELT_BOTTOM - HALF_EDGE + 1e-6) {
						grenzverletzungen.push(`Wurf ${i}: y=${die.y}`);
					}
					if (die.h < -1e-6) {
						grenzverletzungen.push(`Wurf ${i}: h=${die.h} (unter dem Tuch)`);
					}
					if (die.phase === 'rollen' || die.phase === 'liegt') {
						seenTipDirs.add(die.tipDir);
					}
				}
				if (t.dice.length === 2) {
					const [d0, d1] = t.dice;
					const dx = d1.x - d0.x;
					const dy = d1.y - d0.y;
					if (dx * dx + dy * dy < (2 * COLLIDE_RADIUS) * (2 * COLLIDE_RADIUS)) {
						zusammenstossInDiesemWurf = true;
					}
				}
			}

			totalSteps += t.steps;
			if (t.steps > maxSteps) {
				maxSteps = t.steps;
			}
			if (t.steps >= MAX_STEPS) {
				notbremseCount++;
			}

			const r = t.result();
			if (r.faces.length === 2 && r.faces.every((f) => Number.isInteger(f) && f >= 1 && f <= 6)) {
				faceCounts[0][r.faces[0]]++;
				faceCounts[1][r.faces[1]]++;
			} else {
				ergebnisUngueltig++;
			}
			if (!r.valid) {
				ungueltigeWuerfe++;
			}
			if (zusammenstossInDiesemWurf) {
				wuerfeMitZusammenstoss++;
			}
			tipDirVarietySum += seenTipDirs.size;

			for (const die of t.dice) {
				if (die.tipPhase !== 0) {
					lagenverletzungen.push(`Wurf ${i}: tipPhase=${die.tipPhase} (Würfel bleibt auf einer Kante)`);
				}
				const key = `${die.top},${die.front},${die.right}`;
				if (!ORIENTATION_SET.has(key)) {
					lagenverletzungen.push(`Wurf ${i}: Lage [${key}] ist keine der 24 gültigen`);
				}
				tipsSum += die.tips;
				wallHitsSum += die.wallHits;
			}
		}

		console.log('\nP-4  Kein Würfel verlässt je den Tisch, keiner bleibt auf einer Kante');
		check(grenzverletzungen.length === 0,
			`x/y blieben in allen ${N} Würfen innerhalb der Bandeninnenkante (in jedem einzelnen Rechenschritt)`,
			...grenzverletzungen.slice(0, 5));
		check(lagenverletzungen.length === 0,
			`tipPhase === 0 und eine der 24 gültigen Lagen bei jedem Würfel nach jedem der ${N} Würfe`,
			...lagenverletzungen.slice(0, 5));

		console.log('\nP-5  Jeder Wurf endet mit genau zwei Augenzahlen');
		check(ergebnisUngueltig === 0,
			`alle ${N} Würfe enden mit zwei ganzzahligen Augenzahlen 1…6`);

		console.log('\nP-6  Die Notbremse greift nie');
		const mittlereSekunden = (totalSteps / N) * DT;
		const groessteSekunden = maxSteps * DT;
		console.log(`      mittlere Wurfdauer: ${mittlereSekunden.toFixed(3)} s   größte: ${groessteSekunden.toFixed(3)} s`);
		check(notbremseCount === 0, `MAX_STEPS (${MAX_STEPS}) wurde in keinem der ${N} Würfe erreicht`);

		console.log('\nP-7  Alle sechs Flächen kommen vor — die Falle des Kippmodells ist geschlossen');
		{
			const mindestens = [];
			for (let w = 0; w < 2; w++) {
				for (let auge = 1; auge <= 6; auge++) {
					if (faceCounts[w][auge] < 2000) {
						mindestens.push(`Würfel ${w}, Auge ${auge}: nur ${faceCounts[w][auge]}× (erwartet ≥ 2000)`);
					}
				}
			}
			console.log(`      Würfel 0: [${faceCounts[0].slice(1).join(', ')}]`);
			console.log(`      Würfel 1: [${faceCounts[1].slice(1).join(', ')}]`);
			check(mindestens.length === 0,
				`jede der sechs Augenzahlen erscheint bei jedem Würfel mindestens 2.000-mal über ${N} Würfe`,
				...mindestens.slice(0, 5));

			const mittlereVielfalt = tipDirVarietySum / N;
			console.log(`      mittlere Zahl verschiedener Kippkanten je Wurf und Würfel: ${mittlereVielfalt.toFixed(2)}`);
			check(mittlereVielfalt > 2,
				`die Kippkante wechselt im Mittel über einen Wurf hinweg (gemessen: ${mittlereVielfalt.toFixed(2)} > 2)`);
		}

		console.log('\nP-8  Die Würfel erleben wirklich etwas, und das Auslegungsband stimmt');
		{
			const mittlereTips = tipsSum / (N * 2);
			const mittlereWallHits = wallHitsSum / (N * 2);
			const anteilUngueltig = ungueltigeWuerfe / N;
			const anteilZusammenstoss = wuerfeMitZusammenstoss / N;
			console.log(`      mittlere Kippschritte je Würfel:    ${mittlereTips.toFixed(2)}   (Band: ≥ 8)`);
			console.log(`      mittlere Bandenstöße je Würfel:     ${mittlereWallHits.toFixed(2)}   (Band: ≥ 0,8)`);
			console.log(`      Anteil ungültiger Würfe:            ${(anteilUngueltig * 100).toFixed(2)} %   (Band: 0,5–25 %)`);
			console.log(`      Anteil mit Zusammenstoß der Würfel: ${(anteilZusammenstoss * 100).toFixed(2)} %   (Band: ≥ 2 %)`);
			check(mittlereTips >= 8, `mittlere Kippschritte je Würfel ≥ 8 (gemessen: ${mittlereTips.toFixed(2)})`);
			check(mittlereWallHits >= 0.8, `mittlere Bandenstöße je Würfel ≥ 0,8 (gemessen: ${mittlereWallHits.toFixed(2)})`);
			check(anteilUngueltig >= 0.005 && anteilUngueltig <= 0.25,
				`Anteil ungültiger Würfe zwischen 0,5 % und 25 % (gemessen: ${(anteilUngueltig * 100).toFixed(2)} %)`);
			check(anteilZusammenstoss >= 0.02,
				`mindestens 2 % der Würfe enthalten einen Zusammenstoß der beiden Würfel (gemessen: ${(anteilZusammenstoss * 100).toFixed(2)} %)`);
		}

		console.log('\nP-10  Das Verwerfungsverfahren zieht sauber, keine frühe Schieflage');
		{
			const p0 = chiSquareUniform(faceCounts[0].slice(1));
			const p1 = chiSquareUniform(faceCounts[1].slice(1));
			console.log(`      Würfel 0: chi2=${p0.chi2.toFixed(3)} df=${p0.df} p=${p0.p.toFixed(4)}`);
			console.log(`      Würfel 1: chi2=${p1.chi2.toFixed(3)} df=${p1.df} p=${p1.p.toFixed(4)}`);
			check(p0.p > 0.001, `Würfel 0: chiSquareUniform() besteht mit p > 0,001 (gemessen: p=${p0.p.toFixed(4)})`);
			check(p1.p > 0.001, `Würfel 1: chiSquareUniform() besteht mit p > 0,001 (gemessen: p=${p1.p.toFixed(4)})`);

			const kreuzTabelle = Array.from({ length: 6 }, () => new Array(6).fill(0));
			/* Aus denselben 20.000 Würfen: für jeden Wurf mit gültigem Ergebnis
			   wird die Zelle [Auge Würfel 0][Auge Würfel 1] gezählt. Dieselben
			   Läufe wie oben zu nutzen bräuchte eine zweite Zählung während der
			   Schleife; da beide Zähltabellen faceCounts bereits mitgezählt
			   haben, wird die Kreuztabelle in einem eigenen kurzen zweiten Lauf
			   auf einem NEUEN DiceTable mit fortgesetzter Saat gebildet, damit
			   dieser Block unabhängig von der Reihenfolge oben lesbar bleibt. */
			const t2 = new DiceTable({ random: createSeeded(SEED + 1) });
			const N2 = 20000;
			for (let i = 0; i < N2; i++) {
				const r = t2.runToRest();
				if (r.valid && r.faces.length === 2) {
					kreuzTabelle[r.faces[0] - 1][r.faces[1] - 1]++;
				}
			}
			const unabh = chiSquareIndependence(kreuzTabelle);
			console.log(`      Unabhängigkeit: chi2=${unabh.chi2.toFixed(3)} df=${unabh.df} p=${unabh.p.toFixed(4)}`
				+ ` auffälligste Zelle [${unabh.maxCell.row + 1},${unabh.maxCell.col + 1}]`
				+ ` beobachtet=${unabh.maxCell.observed} erwartet=${unabh.maxCell.expected.toFixed(2)}`);
			check(unabh.p > 0.001,
				`chiSquareIndependence() über die 6×6-Kreuztabelle besteht mit p > 0,001 (gemessen: p=${unabh.p.toFixed(4)})`);
		}
	}

	/* ========================================================= P-9 ===== */

	console.log('\nP-9  Die doppelt geführten Zahlen stimmen überein (dice-physics.js ↔ dice-geometry.js)');
	{
		const ZAHLEN = ['FELT_LEFT', 'FELT_RIGHT', 'FELT_TOP', 'FELT_BOTTOM', 'DIE_EDGE',
			'PYRAMID_PITCH', 'HALF_EDGE', 'DIAG_HALF', 'HILL_PEAK', 'TIP_ARC', 'INERTIA'];
		const abweichungen = [];
		for (const name of ZAHLEN) {
			if (modul[name] !== geometrieModul[name]) {
				abweichungen.push(`${name}: dice-physics.js=${modul[name]}  dice-geometry.js=${geometrieModul[name]}`);
			}
		}
		check(abweichungen.length === 0,
			`${ZAHLEN.length} Maßzahlen stimmen zwischen dice-physics.js und dice-geometry.js exakt überein`,
			...abweichungen);

		/* ORIENTATION_TABLE (dice-physics.js) gegen ORIENTATIONS (dice-geometry.js),
		   Zeile für Zeile. ORIENTATION_TABLE ist nicht exportiert — deshalb wird
		   die Datei ein zweites Mal als Text gelesen und die Tabelle herausgezogen. */
		const orientTreffer = /const ORIENTATION_TABLE = \[([\s\S]*?)\];/.exec(PHYSICS_SOURCE);
		check(orientTreffer !== null, 'ORIENTATION_TABLE ist im Quelltext von dice-physics.js zu finden');
		let orientationTable = [];
		if (orientTreffer !== null) {
			const zeilenText = orientTreffer[1];
			const zeilen = [...zeilenText.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g)];
			orientationTable = zeilen.map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
		}
		check(orientationTable.length === geometrieModul.ORIENTATIONS.length,
			`ORIENTATION_TABLE hat ${orientationTable.length} Zeilen, ORIENTATIONS hat ${geometrieModul.ORIENTATIONS.length}`);
		const zeilenAbweichungen = [];
		for (let i = 0; i < Math.min(orientationTable.length, geometrieModul.ORIENTATIONS.length); i++) {
			const a = orientationTable[i];
			const b = geometrieModul.ORIENTATIONS[i];
			if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) {
				zeilenAbweichungen.push(`Zeile ${i}: ORIENTATION_TABLE=[${a}]  ORIENTATIONS=[${b}]`);
			}
		}
		check(zeilenAbweichungen.length === 0,
			'ORIENTATION_TABLE und ORIENTATIONS stimmen Zeile für Zeile überein',
			...zeilenAbweichungen.slice(0, 5));

		/* kippeFlaechen() gegen tipFaces() über alle 24 Lagen mal alle 4
		   Richtungen (96 Vergleiche). kippeFlaechen() ist nicht exportiert;
		   es wird deshalb über ein Die-Objekt und einen Wurf indirekt
		   angesprochen: ein Wurf mit fest vorgegebener Lage, ein einzelner
		   Kippschritt über eine Richtung, und die neue Lage wird abgelesen. */
		const t3 = new DiceTable({ random: createSeeded(1) });
		let vergleicheGesamt = 0;
		const kippAbweichungen = [];
		for (const [top, front, right] of geometrieModul.ORIENTATIONS) {
			for (let dir = 0; dir < 4; dir++) {
				t3.roll([{ top, front, right, x: 100, y: 70, dx: -1, dy: 0, speed: 0, h: 0, vh: 0, bx: 1, by: 0 }, {}]);
				const die = t3.dice[0];
				/* Ein einzelner erzwungener Kippschritt: tipDir festsetzen und
				   tipPhase über die Schwelle heben, dann einen Schritt rechnen. */
				die.tipDir = dir;
				die.phase = 'rollen';
				die.tipPhase = 0.999;
				die.tipSpeed0 = 1e6; // genug Energie, damit der Schritt sicher gelingt
				t3.schrittWuerfel(die);
				const erwartet = geometrieModul.tipFaces(top, front, right, dir);
				vergleicheGesamt++;
				if (die.top !== erwartet[0] || die.front !== erwartet[1] || die.right !== erwartet[2]) {
					kippAbweichungen.push(
						`Lage [${top},${front},${right}] Richtung ${dir}: kippeFlaechen=[${die.top},${die.front},${die.right}]`
						+ ` tipFaces=[${erwartet}]`
					);
				}
				t3.phase = 'ruht';
			}
		}
		check(vergleicheGesamt === 96, `${vergleicheGesamt} Vergleiche durchgeführt (24 Lagen × 4 Richtungen)`);
		check(kippAbweichungen.length === 0,
			'kippeFlaechen() (dice-physics.js) und tipFaces() (dice-geometry.js) liefern in allen 96 Fällen dasselbe Ergebnis',
			...kippAbweichungen.slice(0, 5));

		/*
		 * P-9-G: Gegenprobe. Dieselbe Vergleichslogik wie oben, aber gegen
		 * einen künstlich verfälschten Wertesatz (FELT_LEFT um 1 erhöht) —
		 * sie MUSS genau eine Abweichung finden. Ohne diese Gegenprobe wäre
		 * nicht belegt, dass die Vergleichsschleife oben überhaupt etwas
		 * erkennen würde, statt immer „passt" zu melden.
		 */
		const FAELSCHUNG = Object.fromEntries(ZAHLEN.map((name) => [name, modul[name]]));
		FAELSCHUNG.FELT_LEFT = modul.FELT_LEFT + 1;
		const gegenprobeAbweichungen = ZAHLEN.filter((name) => FAELSCHUNG[name] !== geometrieModul[name]);
		check(gegenprobeAbweichungen.length === 1 && gegenprobeAbweichungen[0] === 'FELT_LEFT',
			'P-9-G: eine künstlich verfälschte Maßzahl (FELT_LEFT+1) wird von der Vergleichslogik oben als einzige Abweichung erkannt (Gegenprobe der Prüfung selbst)',
			`gefunden: [${gegenprobeAbweichungen.join(', ')}]`);
	}

	/* ------------------------------------------------------------- Ergebnis */

	console.log(fehler === 0
		? '\nERGEBNIS: alle Prüfungen bestanden. Der Physikkern ist wiederholbar,'
		+ '\nverlässt den Tisch nie, bleibt nie auf einer Kante liegen, endet immer'
		+ '\nmit zwei Augenzahlen, die Notbremse greift nie, alle sechs Flächen'
		+ '\nkommen vor, die Würfel erleben wirklich etwas, die doppelt geführten'
		+ '\nZahlen stimmen überein, und das Verwerfungsverfahren zieht sauber.'
		: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

	process.exit(fehler === 0 ? 0 : 1);
}

const DIESE_DATEI = fileURLToPath(import.meta.url);
if (process.argv[1] === DIESE_DATEI) {
	await main();
}
