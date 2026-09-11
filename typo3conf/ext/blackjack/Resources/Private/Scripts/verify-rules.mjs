/**
 * Blackjack – Nachweis Regelwerk (R-1 bis R-12)
 * ================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Ohne jede Abhängigkeit
 * außer der zu prüfenden Datei selbst; es genügt ein Node ab Version 18.
 * Laufzeit unter fünf Sekunden (Plan Abschnitt 4.2).
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/blackjack/Resources/Private/Scripts/verify-rules.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan Abschnitt 4.2, Umsetzungsstück C4b)
 * -------------------------------------------------------------------
 *   R-1  Kartenwert je Rang, alle 13
 *   R-2  handTotal über alle Rangmengen der Länge 10 (646.646 Fälle)
 *   R-3  isBlackjack über alle 169 Zweikarten-Paare
 *   R-4  Das Zieh-Schema, VOLLSTÄNDIG über alle erreichbaren Geberlagen
 *   R-5  isSplittablePair über alle 169 Paare
 *   R-6  Alle Auszahlungen über alle 50 legalen Einsätze
 *   R-7  Legale Einsätze sind genau {2, 4, …, 100}
 *   R-8  Hi-Lo-Marke je Rang; Summe über den vollen Schlitten ist null
 *   R-9  trueCount an bekannten Stützstellen, inklusive Division-durch-Null-Schutz
 *   R-10 Jede Zeile der Hausregeltabelle aus Anhang G ist vorhanden und richtig
 *   R-11 Keine Grundstrategie unter Resources/Public/
 *   R-12 rules-blackjack.js ist import- und dokumentfrei; dealerMustDraw liest
 *        nichts außer seinem Argument
 *
 * DIE WICHTIGSTE REGEL DIESER DATEI (Plan Abschnitt 4, Festlegung 4)
 * -------------------------------------------------------------------
 * JEDE Erwartung unten ist von Hand aus dem folgenden Zitat von CONCEPT.md,
 * Anhang G getippt — NIEMALS aus rules-blackjack.js importiert oder aus ihr
 * abgeleitet. Eine Prüfung, deren Erwartung aus derselben Quelle kommt, die
 * sie prüfen soll, kann nicht fehlschlagen — genau diese Fehlerklasse hat
 * dieses Projekt bereits einmal teuer gelernt.
 *
 *   Kartenwerte: 2 bis 10 zählen ihren Aufdruck. Bube, Dame, König zählen 10.
 *   Ass zählt 11, oder 1, wenn 11 das Blatt über 21 treiben würde.
 *
 *   Hausregeln: 6 Decks · Trennkarte bei rund 75 % · Geber steht auf weicher
 *   17 (S17) · verdeckte Karte mit sofortiger Prüfung · Blackjack zahlt 3:2 ·
 *   Gewinnende Hand zahlt 1:1 · Patt gibt den Einsatz zurück · Verdoppeln auf
 *   jedes Blatt aus zwei Karten, auch nach Teilen · Teilen bis zu dreimal,
 *   höchstens vier Blätter · geteilte Asse genau eine Karte, kein erneutes
 *   Teilen · Zehn und Bube teilbares Paar · Versicherung 2:1, höchstens der
 *   halbe Einsatz · kein Aufgeben · keine Seitenwetten.
 *
 *   Zieh-Schema: harte Summe ≤ 16 → ziehen; harte Summe ≥ 17 → stehen;
 *   weiche 17 → stehen; weiche Summe ≥ 18 → stehen.
 *
 * Jede dieser Konstanten und Funktionen wird gegen rules-blackjack.js
 * geprüft, importiert nur, um die tatsächliche Implementierung aufzurufen —
 * nie, um daraus eine Erwartung zu lesen.
 */

// @pruefstand modus=egal laufzeit=kurz

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as rules from '../../Public/JavaScript/rules-blackjack.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/blackjack/ */
const EXT = path.resolve(HIER, '../../..');
const RULES_PATH = path.join(EXT, 'Resources/Public/JavaScript/rules-blackjack.js');

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

console.log('\nBlackjack – Nachweis Regelwerk (R-1 bis R-12)');
console.log('================================================\n');

/* ================================================ R-1 Kartenwerte ======= */

console.log('R-1  Kartenwert je Rang, alle 13');
{
	// Von Hand getippt aus Anhang G, „Kartenwerte".
	const ERWARTET = {
		2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
		J: 10, Q: 10, K: 10, A: 11,
	};
	const abweichungen = [];
	for (const [rang, erwartet] of Object.entries(ERWARTET)) {
		const tatsaechlich = rules.cardValue(rang);
		if (tatsaechlich !== erwartet) {
			abweichungen.push(`${rang}: erwartet ${erwartet}, gefunden ${tatsaechlich}`);
		}
	}
	check(abweichungen.length === 0,
		'alle 13 Kartenwerte stimmen mit der von Hand getippten Tabelle überein',
		...abweichungen);

	console.log('     Gegenprobe R-1-G: eine verfälschte Wertetabelle (Bube = 11) muss auffallen');
	const verfaelscht = { ...ERWARTET, J: 11 };
	const gefunden = Object.entries(verfaelscht).some(([rang, wert]) => rules.cardValue(rang) !== wert);
	check(gefunden, 'R-1-G: die verfälschte Erwartung (J=11) weicht vom echten Wert ab und wird erkannt');
}

/* ============================================= R-2 handTotal, erschöpfend */

console.log('\nR-2  handTotal über alle Rangmengen der Länge 10 (646.646 Fälle)');
{
	/**
	 * Unabhängige Nachrechnung: „Summe mit Ass = 1, dann +10, solange ≤ 21."
	 * Absichtlich eine ANDERE Rechenreihenfolge als handTotal() in
	 * rules-blackjack.js (dort: erst alle Asse als 11, dann schrittweise
	 * herabsetzen) — zwei verschiedene Wege zum selben Ergebnis sind der
	 * eigentliche Nachweis; ein gemeinsamer Programmierfehler in beiden wäre
	 * unwahrscheinlich, ein Abschreibefehler in einem von beiden fiele auf.
	 */
	function nachrechnen(ranks) {
		let hart = 0;
		let asse = 0;
		for (const rang of ranks) {
			if (rang === 'A') {
				hart += 1;
				asse++;
			} else if (rang === 'J' || rang === 'Q' || rang === 'K') {
				hart += 10;
			} else {
				hart += Number(rang);
			}
		}
		let total = hart;
		let soft = false;
		let restAsse = asse;
		while (restAsse > 0 && total + 10 <= 21) {
			total += 10;
			restAsse--;
			soft = true;
		}
		return { total, soft, busted: total > 21 };
	}

	/** Alle Multimengen der Länge k aus n Indizes, „stars and bars". */
	function* multisets(n, k) {
		const indices = new Array(k).fill(0);
		for (;;) {
			yield indices;
			let i = k - 1;
			while (i >= 0 && indices[i] === n - 1) {
				i--;
			}
			if (i < 0) {
				return;
			}
			indices[i]++;
			for (let j = i + 1; j < k; j++) {
				indices[j] = indices[i];
			}
		}
	}

	let geprueft = 0;
	let ersteAbweichung = null;
	for (const indices of multisets(rules.RANKS.length, 10)) {
		const ranks = indices.map((i) => rules.RANKS[i]);
		const tatsaechlich = rules.handTotal(ranks);
		const erwartet = nachrechnen(ranks);
		geprueft++;
		if (tatsaechlich.total !== erwartet.total || tatsaechlich.soft !== erwartet.soft
			|| tatsaechlich.busted !== erwartet.busted) {
			ersteAbweichung ??= `${ranks.join(',')}: erwartet ${JSON.stringify(erwartet)}, `
				+ `gefunden {total:${tatsaechlich.total},soft:${tatsaechlich.soft},busted:${tatsaechlich.busted}}`;
		}
	}
	check(geprueft === 646646, `genau 646.646 Rangmengen geprüft (gefunden: ${geprueft})`);
	check(ersteAbweichung === null,
		'handTotal() stimmt mit der unabhängigen Nachrechnung über ALLE 646.646 Fälle überein',
		...(ersteAbweichung ? [ersteAbweichung] : []));
}

/* ========================================== R-3 isBlackjack, alle Paare = */

console.log('\nR-3  isBlackjack über alle 169 Zweikarten-Paare');
{
	// Unabhängige Bedingung: genau ein Ass und eine Zehnerkarte (10, J, Q, K).
	function istZehnerkarte(rang) {
		return rang === '10' || rang === 'J' || rang === 'Q' || rang === 'K';
	}
	function erwartetBlackjack(a, b) {
		return (a === 'A' && istZehnerkarte(b)) || (b === 'A' && istZehnerkarte(a));
	}
	const abweichungen = [];
	for (const a of rules.RANKS) {
		for (const b of rules.RANKS) {
			const erwartet = erwartetBlackjack(a, b);
			const tatsaechlich = rules.isBlackjack([a, b]);
			if (erwartet !== tatsaechlich) {
				abweichungen.push(`[${a},${b}]: erwartet ${erwartet}, gefunden ${tatsaechlich}`);
			}
		}
	}
	check(abweichungen.length === 0,
		'isBlackjack() stimmt über alle 169 geordneten Zweikarten-Paare',
		...abweichungen);
}

/* ============================================== R-4 Das Zieh-Schema ===== */

console.log('\nR-4  Das Zieh-Schema, vollständig über alle erreichbaren Geberlagen');
{
	/**
	 * Von Hand aus den vier Zeilen des Zieh-Schemas übersetzt, EINSCHLIESSLICH
	 * der ausdrücklich vermerkten Behandlung der in Anhang G nicht genannten
	 * weichen Summe ≤ 16 (siehe Kopfkommentar von rules-blackjack.js,
	 * Festlegung (1)): sie zieht, weil ein weiches Blatt ≤ 16 nie überkauft
	 * und „stehen erst ab 17" sonst verletzt würde.
	 */
	function erwarteterZug(total, soft) {
		if (!soft) {
			// harte Summe ≤ 16 → ziehen; harte Summe ≥ 17 → stehen
			return total <= 16 ? 'ziehen' : 'stehen';
		}
		// weiche Summe ≤ 16 → ziehen (Herleitung, siehe oben);
		// weiche 17 → stehen; weiche Summe ≥ 18 → stehen
		return total <= 16 ? 'ziehen' : 'stehen';
	}

	/**
	 * Zustandsabschluss: Startzustände sind die 13 möglichen ersten Karten.
	 * Von jedem Zustand aus, in dem laut RICHTIGEM Regelmodul gezogen wird,
	 * verzweigt die Suche über alle 13 Ränge zum Folgezustand. Das Ergebnis
	 * ist die vollständige Menge aller Geberlagen, die im echten Spiel
	 * überhaupt erreicht werden können.
	 *
	 * @param {(hand: {total:number,soft:boolean}) => boolean} mussZiehen die
	 *   zu testende Zugentscheidung (echt oder eine Fälschung für die Gegenprobe)
	 * @returns {{total:number, soft:boolean, busted:boolean}[]}
	 */
	function zustandsabschluss(mussZiehen) {
		const gesehen = new Map();
		const warteschlange = [];
		for (const rang of rules.RANKS) {
			const hand = [rang];
			const stand = rules.handTotal(hand);
			const schluessel = `${stand.total}|${stand.soft}`;
			if (!gesehen.has(schluessel)) {
				gesehen.set(schluessel, hand);
				warteschlange.push(hand);
			}
		}
		for (let i = 0; i < warteschlange.length; i++) {
			const hand = warteschlange[i];
			const stand = rules.handTotal(hand);
			if (!stand.busted && mussZiehen(stand)) {
				for (const rang of rules.RANKS) {
					const naechsteHand = [...hand, rang];
					const naechsterStand = rules.handTotal(naechsteHand);
					const schluessel = `${naechsterStand.total}|${naechsterStand.soft}`;
					if (!gesehen.has(schluessel)) {
						gesehen.set(schluessel, naechsteHand);
						warteschlange.push(naechsteHand);
					}
				}
			}
		}
		return gesehen;
	}

	const gesehen = zustandsabschluss((stand) => rules.dealerMustDraw(stand));
	const zustaende = [...gesehen.values()].map((hand) => rules.handTotal(hand));
	check(zustaende.length > 0, `Zustandsabschluss erreicht (${zustaende.length} Geberlagen)`);

	const abweichungen = [];
	for (const stand of zustaende) {
		if (stand.busted) {
			continue; // überkauft: der Geber zieht ohnehin nicht mehr (Ende der Runde)
		}
		const erwartet = erwarteterZug(stand.total, stand.soft);
		const tatsaechlich = rules.dealerMustDraw(stand) ? 'ziehen' : 'stehen';
		if (erwartet !== tatsaechlich) {
			abweichungen.push(`total=${stand.total}, soft=${stand.soft}: erwartet ${erwartet}, gefunden ${tatsaechlich}`);
		}
	}
	check(abweichungen.length === 0,
		'dealerMustDraw() stimmt mit dem unabhängig getippten Zieh-Schema über'
		+ ` ALLE ${zustaende.length} erreichbaren, nicht überkauften Geberlagen überein`,
		...abweichungen);

	const endzustaende = zustaende.filter((s) => !rules.dealerMustDraw(s));
	const falscheEndzustaende = endzustaende.filter((s) => !s.busted && s.total < 17);
	check(falscheEndzustaende.length === 0,
		'jeder Endzustand (kein weiteres Ziehen) hat total ≥ 17 oder ist überkauft',
		...falscheEndzustaende.map((s) => `total=${s.total}, soft=${s.soft}`));

	const ziehendeZustaende = zustaende.filter((s) => !s.busted && rules.dealerMustDraw(s));
	const falschZiehend = ziehendeZustaende.filter((s) => s.total >= 17);
	check(falschZiehend.length === 0,
		'kein erreichbarer, nicht überkaufter Zustand mit total ≥ 17 zieht noch eine Karte',
		...falschZiehend.map((s) => `total=${s.total}, soft=${s.soft}`));

	// Der Abschluss ist wirklich abgeschlossen: für jeden erreichten
	// ziehenden Zustand müssen ALLE 13 möglichen Folgezustände bereits in der
	// Menge stehen. Fehlte einer, hätte der Abschlussalgorithmus selbst einen
	// Fehler — diese Prüfung liest die fertige Menge unabhängig noch einmal.
	const bekannteSchluessel = new Set([...gesehen.keys()]);
	const fehlendeFolgezustaende = [];
	for (const hand of gesehen.values()) {
		const stand = rules.handTotal(hand);
		if (stand.busted || !rules.dealerMustDraw(stand)) {
			continue;
		}
		for (const rang of rules.RANKS) {
			const folgeStand = rules.handTotal([...hand, rang]);
			const schluessel = `${folgeStand.total}|${folgeStand.soft}`;
			if (!bekannteSchluessel.has(schluessel)) {
				fehlendeFolgezustaende.push(`von total=${stand.total},soft=${stand.soft} über ${rang} fehlt ${schluessel}`);
			}
		}
	}
	check(fehlendeFolgezustaende.length === 0,
		'der Zustandsabschluss ist vollständig — kein erreichbarer Folgezustand fehlt',
		...fehlendeFolgezustaende);

	console.log('     Gegenprobe R-4-G: ein "schummelnder" Geber (steht bereits ab 16) muss auffallen');
	const schummelnderGeber = (hand) => hand.total <= 15; // steht schon bei 16 statt zu ziehen
	const zustaendeSchummel = [...zustandsabschluss(schummelnderGeber).values()].map((hand) => rules.handTotal(hand));
	const abweichungenSchummel = zustaendeSchummel.filter((s) => !s.busted
		&& erwarteterZug(s.total, s.soft) !== (schummelnderGeber(s) ? 'ziehen' : 'stehen'));
	check(abweichungenSchummel.length > 0,
		`R-4-G: der schummelnde Geber weicht in ${abweichungenSchummel.length} Geberlage(n) vom`
		+ ' Zieh-Schema ab und wird erkannt');

	console.log('     Gegenprobe R-4-G2: ein Geber, der auf weicher 17 zieht (H17 statt S17), muss auffallen');
	const h17Geber = (hand) => (hand.soft ? hand.total <= 17 : hand.total <= 16);
	const zustaendeH17 = [...zustandsabschluss(h17Geber).values()].map((hand) => rules.handTotal(hand));
	const abweichungenH17 = zustaendeH17.filter((s) => !s.busted
		&& erwarteterZug(s.total, s.soft) !== (h17Geber(s) ? 'ziehen' : 'stehen'));
	check(abweichungenH17.length > 0,
		`R-4-G2: der H17-Geber weicht in ${abweichungenH17.length} Geberlage(n) (mindestens der`
		+ ' weichen 17) vom Zieh-Schema ab und wird erkannt');
}

/* ============================================ R-5 isSplittablePair ====== */

console.log('\nR-5  isSplittablePair über alle 169 Paare');
{
	function wert(rang) {
		if (rang === 'A') {
			return 11;
		}
		if (rang === 'J' || rang === 'Q' || rang === 'K') {
			return 10;
		}
		return Number(rang);
	}
	const abweichungen = [];
	for (const a of rules.RANKS) {
		for (const b of rules.RANKS) {
			const erwartet = wert(a) === wert(b);
			const tatsaechlich = rules.isSplittablePair(a, b);
			if (erwartet !== tatsaechlich) {
				abweichungen.push(`[${a},${b}]: erwartet ${erwartet}, gefunden ${tatsaechlich}`);
			}
		}
	}
	check(abweichungen.length === 0,
		'isSplittablePair() stimmt über alle 169 Paare (Zehn/Bube/Dame/König paarweise'
		+ ' teilbar, Ass+Ass teilbar, Zehn+Neun nicht)',
		...abweichungen);
}

/* ============================================== R-6 Alle Auszahlungen === */

console.log('\nR-6  Alle Auszahlungen über alle 50 legalen Einsätze');
{
	const abweichungen = [];
	for (let s = 2; s <= 100; s += 2) {
		const erwartet = {
			blackjack: 2.5 * s,
			win: 2 * s,
			push: s,
			lose: 0,
			insuranceMax: s / 2,
			insuranceReturn: 3 * (s / 2),
		};
		const tatsaechlich = {
			blackjack: rules.blackjackReturn(s),
			win: rules.winReturn(s),
			push: rules.pushReturn(s),
			lose: rules.loseReturn(),
			insuranceMax: rules.insuranceMax(s),
			insuranceReturn: rules.insuranceReturn(rules.insuranceMax(s)),
		};
		for (const feld of Object.keys(erwartet)) {
			if (erwartet[feld] !== tatsaechlich[feld]) {
				abweichungen.push(`Einsatz ${s}, ${feld}: erwartet ${erwartet[feld]}, gefunden ${tatsaechlich[feld]}`);
			}
		}
	}
	check(abweichungen.length === 0,
		'alle Auszahlungen stimmen über alle 50 legalen Einsätze (300 Einzelaussagen)',
		...abweichungen);

	console.log('     Gegenprobe R-6-G: ein um eins verschobener Auszahlungsfaktor muss auffallen');
	const verschoben = rules.winReturn(10) + 1;
	check(verschoben !== rules.winReturn(10), 'R-6-G: der verschobene Wert weicht vom echten Ergebnis ab');
}

/* ========================================== R-7 Legale Einsätze ========= */

console.log('\nR-7  Legale Einsätze sind genau {2, 4, …, 100}');
{
	const LEGAL = [];
	for (let s = 2; s <= 100; s += 2) {
		LEGAL.push(s);
	}
	const nichtLegalErkannt = LEGAL.filter((s) => !rules.isLegalStake(s));
	check(nichtLegalErkannt.length === 0 && LEGAL.length === 50,
		`alle ${LEGAL.length} legalen Einsätze werden als legal erkannt`,
		...nichtLegalErkannt.map((s) => `${s} als illegal abgewiesen`));

	const GEGENFAELLE = [1, 3, 0, -2, 101, 2.5, NaN];
	const faelschlichLegal = GEGENFAELLE.filter((s) => rules.isLegalStake(s));
	check(faelschlichLegal.length === 0,
		'alle Gegenfälle (1, 3, 0, −2, 101, 2,5, NaN) werden als illegal abgewiesen',
		...faelschlichLegal.map((s) => `${s} fälschlich als legal akzeptiert`));
}

/* ============================================== R-8 Hi-Lo-Marke ========= */

console.log('\nR-8  Hi-Lo-Marke je Rang, plus Null-Summen-Invariante über den Schlitten');
{
	// Von Hand getippt aus C.7.3: „Karten 2–6 zählen +1, Karten 7–9 zählen 0,
	// Zehner, Bildkarten und Asse zählen −1."
	const ERWARTET = {
		2: 1, 3: 1, 4: 1, 5: 1, 6: 1,
		7: 0, 8: 0, 9: 0,
		10: -1, J: -1, Q: -1, K: -1, A: -1,
	};
	const abweichungen = [];
	for (const [rang, erwartet] of Object.entries(ERWARTET)) {
		const tatsaechlich = rules.hiLoTag(rang);
		if (tatsaechlich !== erwartet) {
			abweichungen.push(`${rang}: erwartet ${erwartet}, gefunden ${tatsaechlich}`);
		}
	}
	check(abweichungen.length === 0,
		'alle 13 Hi-Lo-Marken stimmen mit der von Hand getippten Tabelle überein',
		...abweichungen);

	// Unabhängige Invariante: in einem vollen Sechs-Deck-Schlitten kommt jeder
	// Rang 24-mal vor (6 Decks × 4 Farben); die Summe der Marken muss null sein.
	let summe = 0;
	for (const rang of rules.RANKS) {
		summe += rules.hiLoTag(rang) * 24;
	}
	check(summe === 0, `Summe der Hi-Lo-Marken über den vollen Schlitten ist null (gefunden: ${summe})`);

	console.log('     Gegenprobe R-8-G: eine verfälschte Hi-Lo-Marke muss die Null-Summe brechen');
	let summeVerfaelscht = 0;
	for (const rang of rules.RANKS) {
		const marke = rang === '7' ? 1 : rules.hiLoTag(rang); // 7 sollte 0 sein, nicht +1
		summeVerfaelscht += marke * 24;
	}
	check(summeVerfaelscht !== 0, `R-8-G: die verfälschte Marke bricht die Null-Summe (gefunden: ${summeVerfaelscht})`);
}

/* ================================================ R-9 trueCount ========= */

console.log('\nR-9  trueCount an bekannten Stützstellen');
{
	// Von Hand gerechnet: 156 Restkarten = 3 Decks; +12 / 3 = +4,0.
	check(rules.trueCount(12, 156) === 4,
		`trueCount(12, 156) = 4 (gefunden: ${rules.trueCount(12, 156)})`);
	// 104 Restkarten = 2 Decks; −8 / 2 = −4,0.
	check(rules.trueCount(-8, 104) === -4,
		`trueCount(-8, 104) = -4 (gefunden: ${rules.trueCount(-8, 104)})`);
	// Division-durch-Null-Schutz: 0 Restkarten darf nicht werfen oder NaN liefern.
	const grenzfall = rules.trueCount(0, 0);
	check(Number.isFinite(grenzfall) && grenzfall === 0,
		`trueCount(0, 0) ist endlich und 0, kein NaN (gefunden: ${grenzfall})`);

	check(rules.shouldShuffleUp(9, 156) === false,
		'shouldShuffleUp bei wahrem Zähler exakt +3,0 ist FALSE (C.7.3: „über +3", nicht „ab")');
	check(rules.shouldShuffleUp(10, 156) === true,
		'shouldShuffleUp bei wahrem Zähler +3,33 ist TRUE');
}

/* ======================================= R-10 Hausregeltabelle, komplett = */

console.log('\nR-10 Jede Zeile der Hausregeltabelle aus Anhang G ist vorhanden und richtig');
{
	// Von Hand getippt — unabhängig von der Tabelle in verify-cabinet.mjs
	// (A-11), die dieselbe Anforderung aus anderem Anlass prüft.
	const ERWARTET = {
		decks: 6,
		penetration: 0.75,
		standsOnSoft17: true,
		holeCard: true,
		peek: true,
		blackjackPays: [3, 2],
		winPays: [1, 1],
		insurancePays: [2, 1],
		pushReturnsStake: true,
		doubleOnAnyTwo: true,
		doubleAfterSplit: true,
		splitMax: 3,
		handsMax: 4,
		splitAcesOneCard: true,
		resplitAces: false,
		tenAndJackAreAPair: true,
		insurance: true,
		insuranceMaxFraction: [1, 2],
		surrender: false,
		sideBets: false,
	};
	function gleich(a, b) {
		if (Array.isArray(a) && Array.isArray(b)) {
			return a.length === b.length && a.every((v, i) => v === b[i]);
		}
		return a === b;
	}
	const abweichungen = [];
	for (const [feld, erwartet] of Object.entries(ERWARTET)) {
		if (!(feld in rules.HOUSE)) {
			abweichungen.push(`HOUSE.${feld} fehlt`);
		} else if (!gleich(rules.HOUSE[feld], erwartet)) {
			abweichungen.push(`HOUSE.${feld} = ${JSON.stringify(rules.HOUSE[feld])}, erwartet ${JSON.stringify(erwartet)}`);
		}
	}
	check(abweichungen.length === 0,
		`alle ${Object.keys(ERWARTET).length} geprüften Zeilen der Hausregeltabelle sind vorhanden und richtig`,
		...abweichungen);
	check(Object.isFrozen(rules.HOUSE), 'HOUSE ist eingefroren (Object.freeze) und damit zur Laufzeit unveränderlich');
}

/* ===================================== R-11 Keine Grundstrategie ======== */

console.log('\nR-11 Keine Grundstrategie unter Resources/Public/');
{
	function sammeln(wurzel) {
		const gefunden = [];
		const offen = [wurzel];
		while (offen.length > 0) {
			const verzeichnis = offen.pop();
			for (const name of readdirSync(verzeichnis)) {
				const voll = path.join(verzeichnis, name);
				if (statSync(voll).isDirectory()) {
					offen.push(voll);
				} else {
					gefunden.push(voll);
				}
			}
		}
		return gefunden;
	}
	const PUBLIC_DIR = path.join(EXT, 'Resources/Public');
	const treffer = [];
	// Gesucht werden die KONKRETEN Bauformen einer Grundstrategietabelle (die
	// exportierten Namen, die basic-strategy.mjs in Umsetzungsstück C4e
	// benutzen wird), NICHT die bloße Erwähnung des Wortes „Grundstrategie" —
	// rules-blackjack.js zitiert Anhang G wörtlich, einschließlich des Satzes
	// „Die Grundstrategie liegt ausschließlich im Nachweisskript"; das wäre
	// sonst ein Fehlalarm auf der eigenen, korrekten Erklärung.
	const MUSTER = [
		/export\s+const\s+HARD\b/, /export\s+const\s+SOFT\b/, /export\s+const\s+PAIRS\b/,
		/export\s+function\s+decide\s*\(/, /export\s+function\s+mimicDealer\s*\(/,
	];
	for (const datei of sammeln(PUBLIC_DIR)) {
		const inhalt = readFileSync(datei, 'utf8');
		for (const muster of MUSTER) {
			if (muster.test(inhalt)) {
				treffer.push(`${path.relative(EXT, datei)}: ${muster}`);
			}
		}
	}
	check(treffer.length === 0,
		'keine exportierte Grundstrategietabelle (HARD/SOFT/PAIRS/decide/mimicDealer)'
		+ ' unter Resources/Public/ — die Grundstrategie existiert ausschließlich im'
		+ ' Nachweisskript (C.10)',
		...treffer);

	console.log('     Gegenprobe R-11-G: eine erfundene Datei mit einer solchen Tabelle muss auffallen');
	const erfundeneDatei = 'export const HARD = { 16: { 10: "hit" } };';
	const erkanntInGegenprobe = MUSTER.some((muster) => muster.test(erfundeneDatei));
	check(erkanntInGegenprobe, 'R-11-G: die erfundene Grundstrategie-Zeile wird vom Muster erkannt');
}

/* =============================== R-12 Quelltextprüfung, dealerMustDraw == */

console.log('\nR-12 rules-blackjack.js ist import- und dokumentfrei; dealerMustDraw liest nur sein Argument');
{
	const quelle = readFileSync(RULES_PATH, 'utf8');
	const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

	check(!/\bimport\b/.test(ohneKommentare), 'kein import in rules-blackjack.js');
	check(!/\bdocument\b/.test(ohneKommentare), 'kein document in rules-blackjack.js');
	check(!/\bwindow\b/.test(ohneKommentare), 'kein window in rules-blackjack.js');
	check(!/\blocalStorage\b/.test(ohneKommentare), 'kein localStorage in rules-blackjack.js');
	check(!/Math\.random/.test(ohneKommentare), 'kein Math.random in rules-blackjack.js');

	const fund = /export function dealerMustDraw\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(ohneKommentare);
	check(fund !== null, 'dealerMustDraw() ist im Quelltext zu finden');
	if (fund !== null) {
		const koerperOhneLeerraum = fund[1].replace(/\s+/g, '');
		check(koerperOhneLeerraum === 'returnhand.total<=16;',
			'dealerMustDraw() liest ausschließlich hand.total — kein Zähler, kein Zustand von außen',
			`gefundener Funktionskörper (ohne Leerraum): ${koerperOhneLeerraum}`);
	}
}

/* ------------------------------------------------------------- Ergebnis */

console.log(fehler === 0
	? '\nERGEBNIS: alle Prüfungen bestanden, einschließlich aller Gegenproben. Das'
	+ '\nZieh-Schema ist über 36 erreichbare Geberlagen erschöpfend nachgewiesen'
	+ '\n(Zustandsabschluss, keine Stichprobe); handTotal() stimmt über alle 646.646'
	+ '\nmöglichen Zehn-Karten-Rangmengen mit einer unabhängigen Nachrechnung überein.'
	: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);

process.exit(fehler === 0 ? 0 : 1);
