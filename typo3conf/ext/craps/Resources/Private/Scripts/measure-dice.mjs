/**
 * Craps – Messlauf Gleichverteilung und Unabhängigkeit der Würfel (M-C6-1)
 * ============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Der lange Messlauf aus
 * CONCEPT.md C.5.4 in voller Länge. Er wird von Umsetzungsstück C6c GEBAUT,
 * aber NICHT in voller Länge gefahren — lange Läufe gehören nicht in einen
 * Agentenlauf; die Hauptsitzung führt ihn in vollem Umfang aus und trägt das
 * Ergebnis in README.md und MEMORY.md nach (Plan Teil 2, Abschnitt 4.35;
 * Plan Teil 3, Abschnitt 7.3; DECISIONS.md 2026-09-04 11:03, Punkt 3).
 *
 * Aufruf, mit den in C.5.4 verlangten Vorgaben:
 *
 *   ddev exec node typo3conf/ext/craps/Resources/Private/Scripts/measure-dice.mjs \
 *       --runs=500000 --seed=20260907
 *
 * Ohne Angabe: --runs=500000, --seed=1. Ein kleinerer Umfang wird
 * angenommen, aber im Bericht ausdrücklich als „UNTER DEM GEFORDERTEN
 * UMFANG" gekennzeichnet — C.5.4 verlangt mindestens 500.000 Würfe.
 * Rückgabewert 0, wenn BEIDE Tests (Gleichverteilung je Würfel UND
 * Unabhängigkeit) UND die Gegenprobe „feste Startlage" bestehen; 1 sonst.
 *
 * WAS GEMESSEN UND BERICHTET WIRD — VIER BLÖCKE (Plan 4.35)
 * -------------------------------------------------------------
 *   1  Gleichverteilung je Würfel: zwei 6-Felder-Zähltabellen,
 *      chiSquareUniform() je Würfel, df=5. BESTANDEN BEI p > 0,01.
 *   2  Unabhängigkeit der beiden Würfel: die 6×6-Kreuztabelle,
 *      chiSquareIndependence(), df=25. BESTANDEN BEI p > 0,01.
 *   3  Die Summenverteilung — DIAGNOSE, KEINE PRÜFGRÖSSE: die elf Summen
 *      2…12 gegen ihre bekannten Wahrscheinlichkeiten. Ein dritter Test auf
 *      denselben Daten wäre nur eine weitere Gelegenheit für einen
 *      Fehlalarm; sie steht im Bericht, weil sie die Zahl ist, die ein
 *      Mensch am Tisch tatsächlich sieht, und weil Phase C7 auf ihr aufbaut.
 *   4  Der Beleg, dass das Modell nicht hohl ist: mittlere/größte
 *      Wurfdauer, mittlere Kippschritte je Würfel, mittlere Bandenstöße,
 *      Anteil der Würfe mit Zusammenstoß, Anteil ungültiger (wiederholter)
 *      Würfe, und „Verwendete Werte" — maschinell aus den numerischen
 *      Exporten von dice-physics.js ermittelt, nicht abgeschrieben, damit
 *      Bericht und Quelltext nicht auseinanderlaufen können.
 *
 * DIE MINDESTWURF-REGEL GILT AUCH IM NACHWEIS
 * ------------------------------------------------
 * Gezählt werden nur gültige Würfe; ungültige werden wiederholt — über
 * wurfBisGueltig() aus verify-physics.mjs, damit Spiel und Nachweis
 * DIESELBE Regel benutzen (dieselbe Funktion, nicht nur dieselbe Formel).
 * Die Zahl der Wiederholungen (Gesamtversuche minus gezählte Würfe) wird
 * mitberichtet.
 *
 * EIN EINZIGES DiceTable-OBJEKT FÜR DEN GANZEN LAUF, GERECHNET MIT
 * dice-physics.js SELBST (C.5.3), über einen dynamischen Import — dieselbe
 * Bauart wie measure-shuffle.mjs beim Kartentisch.
 *
 * DER ZUFALLSGEBER IST createSeeded(seed), NIE drawUint32 — ein Nachweis
 * muss auf jeder Maschine dieselbe Zahl liefern (C.5.2/C.5.3).
 *
 * DER EINGEBAUTE SELBSTTEST — stats.mjs prüft sich zuerst gegen ihre von
 * Hand abgeschriebenen Referenzwerte. Schlägt das fehl, BRICHT DIESER LAUF
 * AB: eine Messung mit falscher Statistik soll gar nicht erst laufen
 * (C.5.4).
 *
 * DIE GEGENPROBE „FESTE STARTLAGE" — DER WICHTIGSTE TEIL DIESES NACHWEISES
 * ----------------------------------------------------------------------------
 * Nach dem Hauptlauf läuft ein ZWEITER Lauf mit runs/5 Würfen, bei dem beide
 * Würfel in JEDEM Wurf mit derselben festen Lage [1,2,3] starten — gezogen
 * werden nur noch die Wurfparameter. Auch dieser Lauf muss p > 0,01 je
 * Würfel liefern. Ohne ihn würde ein bestandener Hauptlauf nichts beweisen:
 * die gezogene Startlage allein würde die Gleichverteilung schon erzeugen,
 * selbst wenn die Physik gar nichts mischte. Erst der zweite Lauf zeigt,
 * dass die Mischung tatsächlich von den Kippschritten kommt.
 *
 * WAS PASSIERT, WENN EIN TEST DURCHFÄLLT. CONCEPT.md C.5.4 ist eindeutig:
 * nachgebessert wird die GEOMETRIE/AUSLEGUNG, niemals der Zufallsgenerator
 * verbogen und niemals ein Ergebnis nachträglich verschoben. Reihenfolge:
 * Plan Teil 2, Abschnitt 4.34.
 */

import { createSeeded } from '../../Public/JavaScript/rng.js';
import { chiSquareUniform, chiSquareIndependence, selbsttest } from './stats.mjs';
import { wurfBisGueltig } from './verify-physics.mjs';

/* ================================================== Kommandozeile ======= */

function parseArgs(argv) {
	const werte = { runs: 500000, seed: 1, nurGegenprobe: false };
	for (const arg of argv) {
		const treffer = /^--(runs|seed)=(-?\d+)$/.exec(arg);
		if (treffer) {
			werte[treffer[1]] = Number(treffer[2]);
		} else if (arg === '--nur-gegenprobe') {
			werte.nurGegenprobe = true;
		}
	}
	return werte;
}

/**
 * --nur-gegenprobe (Zwischenstand-Schalter, nicht Teil von C.5.4): überspringt
 * den Hauptlauf (Blöcke 1–4) vollständig und führt NUR die Gegenprobe „feste
 * Startlage" aus, mit --runs direkt als Wurfzahl (nicht runs/5) — für schnelle
 * Nachbesserungs-Zwischenmessungen. Der reguläre Aufruf ohne diesen Schalter
 * ist unverändert der vollständige Nachweis aus C.5.4.
 */
const { runs: ANZAHL, seed: SAAT, nurGegenprobe: NUR_GEGENPROBE } = parseArgs(process.argv.slice(2));

console.log('\nCraps – Messlauf Gleichverteilung und Unabhängigkeit der Würfel (M-C6-1)');
console.log('============================================================================\n');

/* ================================================== Selbsttest stats.mjs */

console.log('Selbsttest: stats.mjs gegen von Hand abgeschriebene Referenzwerte');
if (!selbsttest((ok, text) => console.log(`  ${ok ? '✓' : '✗'} ${text}`))) {
	console.error('\nABBRUCH: der Selbsttest von stats.mjs ist fehlgeschlagen. Eine Messung mit'
		+ ' falscher Statistik soll gar nicht erst laufen (CONCEPT.md C.5.4).');
	process.exit(1);
}
console.log('  → bestanden.\n');

/* ============================================== dice-physics.js laden === */

const modul = await import(new URL('../../Public/JavaScript/dice-physics.js', import.meta.url));
const { DiceTable, DT, COLLIDE_RADIUS } = modul;

if (ANZAHL < 500000) {
	console.log(`ACHTUNG: --runs=${ANZAHL} liegt UNTER DEM GEFORDERTEN UMFANG von 500.000 Würfen`
		+ ' aus CONCEPT.md C.5.4. Dieser Lauf ist eine Kurzprobe, kein abschließender Nachweis.\n');
}

/**
 * Misst `anzahl` GÜLTIGE Würfe auf einem einzigen DiceTable. Ungültige Würfe
 * werden über wurfBisGueltig() wiederholt (dieselbe Regel wie im Spiel).
 *
 * Die Kollisionserkennung geschieht über einen einmalig eingehängten
 * Aufruf-Zähler um DiceTable.prototype.step() herum (dieselbe Bauart wie
 * die Rautentreffer-Instrumentierung beim Rad des anderen Tisches): der
 * Physikkern selbst bleibt unverändert, es wird nur beobachtet, ob sich die
 * beiden Würfelmittelpunkte während eines Wurfs (einschließlich seiner
 * ungültigen Vorversuche) einmal näher als 2 · COLLIDE_RADIUS kommen.
 *
 * @param {InstanceType<typeof DiceTable>} tisch
 * @param {number} anzahl gültige Würfe
 * @param {{festeStartlage?: boolean, fortschritt?: boolean}} [optionen]
 * @returns {object}
 */
function messeLauf(tisch, anzahl, { festeStartlage = false, fortschritt = false } = {}) {
	const faceCounts = [new Array(7).fill(0), new Array(7).fill(0)];
	const kreuzTabelle = Array.from({ length: 6 }, () => new Array(6).fill(0));
	const sumCounts = new Array(13).fill(0); // Index 2…12 genutzt
	let tipsSum = 0;
	let wallHitsSum = 0;
	let totalSteps = 0;
	let maxSteps = 0;
	let versucheGesamt = 0;
	let wuerfeMitZusammenstoss = 0;

	const setup = festeStartlage
		? [{ top: 1, front: 2, right: 3 }, { top: 1, front: 2, right: 3 }]
		: null;

	/* Kollisionszähler: einmalig um step() gelegt, für die Dauer dieser Funktion. */
	let kollisionInDiesemWurf = false;
	const originalStep = Object.getPrototypeOf(tisch).step;
	Object.getPrototypeOf(tisch).step = function (...args) {
		const ergebnis = originalStep.apply(this, args);
		if (this.dice.length === 2) {
			const [d0, d1] = this.dice;
			const dx = d1.x - d0.x;
			const dy = d1.y - d0.y;
			if (dx * dx + dy * dy < (2 * COLLIDE_RADIUS) * (2 * COLLIDE_RADIUS)) {
				kollisionInDiesemWurf = true;
			}
		}
		return ergebnis;
	};

	const schritt = Math.max(1, Math.floor(anzahl / 20));
	const start = Date.now();
	for (let i = 0; i < anzahl; i++) {
		kollisionInDiesemWurf = false;
		const { faces, tries } = wurfBisGueltig(tisch, setup);
		versucheGesamt += tries;
		if (kollisionInDiesemWurf) {
			wuerfeMitZusammenstoss++;
		}

		faceCounts[0][faces[0]]++;
		faceCounts[1][faces[1]]++;
		kreuzTabelle[faces[0] - 1][faces[1] - 1]++;
		sumCounts[faces[0] + faces[1]]++;

		for (const die of tisch.dice) {
			tipsSum += die.tips;
			wallHitsSum += die.wallHits;
		}
		totalSteps += tisch.steps;
		if (tisch.steps > maxSteps) {
			maxSteps = tisch.steps;
		}

		if (fortschritt && (i + 1) % 25000 === 0) {
			const vergangen = (Date.now() - start) / 1000;
			const proWurf = vergangen / (i + 1);
			const restSekunden = proWurf * (anzahl - (i + 1));
			console.log(`  … ${(i + 1).toLocaleString('de-DE')} / ${anzahl.toLocaleString('de-DE')}`
				+ ` (${vergangen.toFixed(1)} s verstrichen, Hochrechnung Rest: ${restSekunden.toFixed(0)} s)`);
		}
	}

	Object.getPrototypeOf(tisch).step = originalStep;

	return {
		faceCounts, kreuzTabelle, sumCounts,
		tipsSum, wallHitsSum, totalSteps, maxSteps,
		versucheGesamt, wuerfeMitZusammenstoss,
		dauerMs: Date.now() - start,
	};
}

/* ==================================================== Der Hauptlauf ===== */

let block1Bestanden = true;
let block2Bestanden = true;

if (NUR_GEGENPROBE) {
	console.log('--nur-gegenprobe: Hauptlauf (Blöcke 1–4) übersprungen — Zwischenstand-Schalter,'
		+ ' nicht Teil des vollständigen Nachweises nach C.5.4.\n');
} else {
	console.log(`Hauptlauf: ${ANZAHL.toLocaleString('de-DE')} gültige Würfe, Saat ${SAAT}, echte Physik (dice-physics.js)`);
	const tisch = new DiceTable({ random: createSeeded(SAAT) });
	const haupt = messeLauf(tisch, ANZAHL, { fortschritt: ANZAHL >= 50000 });

	/* ------------------------------------------------ Block 1: Gleichverteilung */

	console.log('\nBlock 1  Gleichverteilung je Würfel (Prüfgröße, bestanden bei p > 0,01)');
	const ergebnisWuerfel = [
		chiSquareUniform(haupt.faceCounts[0].slice(1)),
		chiSquareUniform(haupt.faceCounts[1].slice(1)),
	];
	for (let w = 0; w < 2; w++) {
		const e = ergebnisWuerfel[w];
		console.log(`  Würfel ${w}: Tabelle [${haupt.faceCounts[w].slice(1).join(', ')}]`);
		console.log(`  Würfel ${w}: χ²=${e.chi2.toFixed(3)}  df=${e.df}  p=${e.p.toFixed(5)}`
			+ `  größte Abweichung: Auge ${e.maxDeviation.index + 1} (${e.maxDeviation.absolute.toFixed(2)},`
			+ ` ${e.maxDeviation.sigmas.toFixed(2)} σ)`);
		if (!(e.p > 0.01)) {
			block1Bestanden = false;
		}
	}
	console.log(`  → ${block1Bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Schranke: p > 0,01, beide Würfel)`);

	/* ------------------------------------------------- Block 2: Unabhängigkeit */

	console.log('\nBlock 2  Unabhängigkeit der beiden Würfel (Prüfgröße, bestanden bei p > 0,01)');
	const unabh = chiSquareIndependence(haupt.kreuzTabelle);
	console.log('  Kreuztabelle (Zeile = Auge Würfel 0, Spalte = Auge Würfel 1):');
	for (let r = 0; r < 6; r++) {
		console.log(`    [${haupt.kreuzTabelle[r].join(', ')}]`);
	}
	console.log(`  χ²=${unabh.chi2.toFixed(3)}  df=${unabh.df}  p=${unabh.p.toFixed(5)}`);
	console.log(`  auffälligste Zelle: [Würfel0=${unabh.maxCell.row + 1}, Würfel1=${unabh.maxCell.col + 1}]`
		+ ` beobachtet=${unabh.maxCell.observed}  erwartet=${unabh.maxCell.expected.toFixed(2)}`);
	block2Bestanden = unabh.p > 0.01;
	console.log(`  → ${block2Bestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Schranke: p > 0,01)`);

	/* -------------------------------------------- Block 3: Summenverteilung === */

	console.log('\nBlock 3  Summenverteilung (DIAGNOSE, keine Prüfgröße — kein dritter Test auf denselben Daten)');
	const SUMMEN_WAHRSCHEINLICHKEIT = {
		2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36, 7: 6 / 36,
		8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36,
	};
	for (let summe = 2; summe <= 12; summe++) {
		const beobachtet = haupt.sumCounts[summe];
		const erwartungsAnteil = SUMMEN_WAHRSCHEINLICHKEIT[summe];
		const erwartet = erwartungsAnteil * ANZAHL;
		console.log(`  Summe ${String(summe).padStart(2)}: beobachtet ${beobachtet.toLocaleString('de-DE')}`
			+ `  erwartet ${erwartet.toFixed(1)}  (Anteil ${(erwartungsAnteil * 100).toFixed(2)} %,`
			+ ` gemessen ${((beobachtet / ANZAHL) * 100).toFixed(2)} %)`);
	}

	/* --------------------------------------- Block 4: das Modell ist nicht hohl */

	console.log('\nBlock 4  Der Beleg, dass das Modell nicht hohl ist (keine Prüfgröße, nur Beleg)');
	const mittlereSekunden = (haupt.totalSteps / ANZAHL) * DT;
	const groessteSekunden = haupt.maxSteps * DT;
	const mittlereTips = haupt.tipsSum / (ANZAHL * 2);
	const mittlereWallHits = haupt.wallHitsSum / (ANZAHL * 2);
	const anteilZusammenstoss = haupt.wuerfeMitZusammenstoss / ANZAHL;
	const anteilUngueltig = (haupt.versucheGesamt - ANZAHL) / haupt.versucheGesamt;
	console.log(`  mittlere Wurfdauer:                 ${mittlereSekunden.toFixed(3)} s`);
	console.log(`  größte Wurfdauer:                    ${groessteSekunden.toFixed(3)} s`);
	console.log(`  mittlere Kippschritte je Würfel:     ${mittlereTips.toFixed(2)}`);
	console.log(`  mittlere Bandenstöße je Würfel:      ${mittlereWallHits.toFixed(2)}`);
	console.log(`  Anteil der Würfe mit Zusammenstoß:   ${(anteilZusammenstoss * 100).toFixed(2)} %`);
	console.log(`  Anteil ungültiger (wiederholter) Würfe an allen Versuchen: ${(anteilUngueltig * 100).toFixed(2)} %`
		+ ` (${haupt.versucheGesamt.toLocaleString('de-DE')} Versuche für ${ANZAHL.toLocaleString('de-DE')} gezählte Würfe)`);
	console.log(`  Laufzeit Hauptlauf:                  ${(haupt.dauerMs / 1000).toFixed(1)} s`);

	console.log('\n  Verwendete Werte (maschinell aus den numerischen Exporten von dice-physics.js ermittelt):');
	const numerischeExporte = Object.entries(modul).filter(([, w]) => typeof w === 'number');
	for (const [name, wert] of numerischeExporte) {
		console.log(`    ${name.padEnd(20)} ${wert}`);
	}
}

/* ================================== Die Gegenprobe „feste Startlage" ==== */

const GEGENPROBE_ANZAHL = NUR_GEGENPROBE ? ANZAHL : Math.max(1, Math.floor(ANZAHL / 5));
console.log(`\nGegenprobe „feste Startlage": ${GEGENPROBE_ANZAHL.toLocaleString('de-DE')} Würfe, beide Würfel`
	+ ' starten IMMER mit der festen Lage [1,2,3] — nur die Wurfparameter werden noch gezogen');
const gegenTisch = new DiceTable({ random: createSeeded(SAAT + 1) });
const gegen = messeLauf(gegenTisch, GEGENPROBE_ANZAHL, { festeStartlage: true, fortschritt: GEGENPROBE_ANZAHL >= 50000 });
const gegenErgebnisWuerfel = [
	chiSquareUniform(gegen.faceCounts[0].slice(1)),
	chiSquareUniform(gegen.faceCounts[1].slice(1)),
];
let gegenprobeBestanden = true;
for (let w = 0; w < 2; w++) {
	const e = gegenErgebnisWuerfel[w];
	console.log(`  Würfel ${w}: Tabelle [${gegen.faceCounts[w].slice(1).join(', ')}]`);
	console.log(`  Würfel ${w}: χ²=${e.chi2.toFixed(3)}  df=${e.df}  p=${e.p.toFixed(5)}`);
	if (!(e.p > 0.01)) {
		gegenprobeBestanden = false;
	}
}
console.log(`  Laufzeit Gegenprobe: ${(gegen.dauerMs / 1000).toFixed(1)} s`);
console.log(`  → ${gegenprobeBestanden ? 'BESTANDEN' : 'DURCHGEFALLEN'} (Schranke: p > 0,01, beide Würfel)`);
if (!gegenprobeBestanden) {
	console.log('  WICHTIG: Fällt diese Gegenprobe durch, während der Hauptlauf besteht, ist das Modell'
		+ ' HOHL — die Gleichverteilung käme dann allein aus der gezogenen Startlage, nicht aus der'
		+ ' Physik. Nachbessern nach Plan Teil 2, Abschnitt 4.34.');
}

/* ------------------------------------------------------------- Ergebnis */

const bestanden = block1Bestanden && block2Bestanden && gegenprobeBestanden;
if (NUR_GEGENPROBE) {
	console.log(gegenprobeBestanden
		? '\nERGEBNIS (--nur-gegenprobe, kein vollständiger Nachweis): Gegenprobe „feste Startlage" bestanden.'
		: '\nERGEBNIS (--nur-gegenprobe, kein vollständiger Nachweis): Gegenprobe „feste Startlage" DURCHGEFALLEN.'
		+ ' Nachbessern nach Plan Teil 2, Abschnitt 4.34 — niemals den Zufallsgenerator verbiegen, niemals'
		+ ' ein Ergebnis nachträglich verschieben.');
} else {
	console.log(bestanden
		? '\nERGEBNIS: BESTANDEN. Gleichverteilung je Würfel, Unabhängigkeit der beiden Würfel und'
		+ ' die Gegenprobe „feste Startlage" sind alle drei erfüllt — die Mischung kommt nachweislich'
		+ ' aus der Physik und nicht aus der gezogenen Startlage.'
		: '\nERGEBNIS: DURCHGEFALLEN. Nachbessern nach Plan Teil 2, Abschnitt 4.34 — niemals den'
		+ ' Zufallsgenerator verbiegen, niemals ein Ergebnis nachträglich verschieben.');
}

process.exit(bestanden ? 0 : 1);
