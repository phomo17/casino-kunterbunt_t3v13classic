/**
 * Casino Kunterbunt – die Chips der Spieltische
 * ==============================================
 *
 * An den Tischen wird NICHT mit Euro gesetzt, sondern mit Chips, die einen
 * Euro-Wert tragen (CONCEPT.md C.4.1). Gelegt, gestapelt und zurückgenommen
 * wird immer ein CHIP, nie ein frei eingetippter Betrag. Der Buy-in ist der
 * Umtausch von Kassengeld in Chips, CASH OUT der Umtausch zurück.
 *
 * Einbindung in einer Tisch-Extension:
 *
 *   import { CHIPS, CHIP_VALUES, breakDown, Rack } from '@phomo17/casino-startpage/table-chips.js';
 *
 *
 * DIESE DATEI IMPORTIERT NICHTS UND KENNT KEIN DOKUMENT
 * -----------------------------------------------------
 * Kein import, kein document, kein window, kein localStorage, kein
 * Math.random. Zwei Gründe, beide hart:
 *   1. Node kann sie unmittelbar laden. Der Nachweis rechnet damit mit GENAU
 *      DIESER Datei; eine eigens geschriebene Nachbildung könnte richtig
 *      rechnen, während das Spiel falsch wechselt (C.5.3).
 *   2. Sie kennt kein Gerät, weil ihr nichts übergeben wird, womit sie eines
 *      erreichen könnte — dieselbe bauliche Zusage wie bei risk-ladder.js
 *      (CONCEPT.md Teil A, Abschnitt 5, Grundsatz 2).
 *
 * Gezeichnet werden die Chips NICHT hier, sondern einmal als SVG-Satz im
 * Fluid-Partial Table/ChipSprite.html. Diese Datei liefert nur die Kennung
 * des passenden <symbol> (symbolId); wer einen Chip anzeigt, setzt ein
 * <use href="#…"> darauf. So gibt es die Zeichnung genau einmal im Dokument,
 * gleichgültig wie viele Chips auf dem Tuch liegen.
 */

/**
 * Die fünf Chips, absteigend nach Wert.
 *
 * Die Reihenfolge IST die Wechselreihenfolge aus CONCEPT.md C.4.1
 * (100 → 25 → 20 → 5 → 1) und wird von breakDown() genau so abgearbeitet.
 * Sie ist deshalb keine Sortierung nach Geschmack, sondern eine Festlegung.
 */
export const CHIP_VALUES = Object.freeze([100, 25, 20, 5, 1]);

/**
 * Alles, was einen Chip ausmacht.
 *
 * value      der Euro-Wert. Verbindlich nach C.4.1, an allen drei Tischen gleich.
 * colour     der Farbname als Wort. Er steht in KEINEM Anzeigetext — die deutschen
 *            Beschriftungen kommen aus der XLIFF-Datei. Er ist der Bindestrich-Teil
 *            der Design-Tokens (--ck-chip-<colour>) und die Kennung im Nachweis.
 * groups     Zahl der Kerbengruppen auf dem Rand.
 * perGroup   Zahl der Kerben je Gruppe.
 * symbolId   die id des <symbol> in Table/ChipSprite.html.
 *
 * WARUM ZWEI ZAHLEN FÜR DAS RANDMUSTER UND NICHT EINE
 * ---------------------------------------------------
 * C.4.1 verlangt „unterschiedliche ANZAHL UND ANORDNUNG der hellen
 * Randkerben je Wert". Eine bloße Anzahl erfüllt nur die Hälfte davon und
 * wäre bei 6 gegen 8 Kerben auf einem Chip von 44 Bildpunkten nicht mehr
 * zählbar. Mit (groups × perGroup) unterscheiden sich Gelb und Grün nicht in
 * einer schwer zählbaren Zahl, sondern in der GESTALT: sechs Einzelkerben
 * gegen vier Paare. Das erkennt man auf einen Blick, auch in Graustufen und
 * auch mit einer Rot-Grün-Sehschwäche — und genau darum geht es der Regel,
 * die aus B.9.2 (Münzen des Münzschiebers) übernommen ist.
 *
 * Beide Kennwerte sind zusätzlich für sich allein eindeutig:
 *   Gesamtzahl der Kerben   3, 4, 6, 8, 12
 *   Paar (groups, perGroup) (3,1) (4,1) (6,1) (4,2) (4,3)
 * Der Nachweis prüft beides (C-2).
 */
export const CHIPS = Object.freeze({
	1:   Object.freeze({ value: 1,   colour: 'white',  groups: 3, perGroup: 1, symbolId: 'ck-chip-1' }),
	5:   Object.freeze({ value: 5,   colour: 'red',    groups: 4, perGroup: 1, symbolId: 'ck-chip-5' }),
	20:  Object.freeze({ value: 20,  colour: 'yellow', groups: 6, perGroup: 1, symbolId: 'ck-chip-20' }),
	25:  Object.freeze({ value: 25,  colour: 'green',  groups: 4, perGroup: 2, symbolId: 'ck-chip-25' }),
	100: Object.freeze({ value: 100, colour: 'black',  groups: 4, perGroup: 3, symbolId: 'ck-chip-100' }),
});

/**
 * Zerlegt einen Betrag in möglichst große Chips (CONCEPT.md C.4.1).
 *
 * Abgearbeitet wird streng in der Reihenfolge 100 → 25 → 20 → 5 → 1. Das ist
 * eine WÖRTLICHE Vorgabe des Konzepts und ausdrücklich nicht dasselbe wie
 * „möglichst wenige Chips": 40 € werden zu 25 + 5 + 5 + 5 (vier Chips) und
 * nicht zu 20 + 20 (zwei Chips), weil 25 in der vorgegebenen Reihenfolge vor
 * 20 kommt. Das ist hingenommen und hat keine Folgen fürs Spiel — ein Einsatz
 * von 20 € entsteht ebenso gut aus vier Fünfern, und wer einen 20er will,
 * wechselt am Wechselfeld (Rack.exchangeUp).
 *
 * @param {number} amount ganze Zahl ab 0
 * @returns {Array<{value: number, count: number}>} absteigend, ohne Nullposten
 * @throws {RangeError} bei allem, was keine ganze Zahl ab 0 ist
 */
export function breakDown(amount) {
	if (!Number.isInteger(amount) || amount < 0) {
		throw new RangeError(`breakDown() erwartet eine ganze Zahl ab 0, bekam: ${String(amount)}`);
	}
	const out = [];
	let rest = amount;
	for (const value of CHIP_VALUES) {
		const count = Math.floor(rest / value);
		if (count > 0) {
			out.push({ value, count });
			rest -= count * value;
		}
	}
	// rest ist hier immer 0, weil der kleinste Chip 1 ist. Die Zusicherung
	// steht trotzdem da: fiele der 1er-Chip je weg, wäre das der Ort, an dem
	// es auffällt, und nicht drei Bausteine später beim Kassensturz.
	if (rest !== 0) {
		throw new RangeError(`breakDown(${amount}) lässt ${rest} übrig — der kleinste Chip ist nicht 1.`);
	}
	return out;
}

/**
 * Die Zerlegung, in die ein Chip beim Kleinwechseln zerfällt.
 * 100 → 4 × 25 · 25 → 20 + 5 · 20 → 4 × 5 · 5 → 5 × 1 · 1 → nicht wechselbar.
 *
 * Jede Zeile ist die breakDown() des Werts über die NÄCHSTKLEINEREN Chips.
 * Sie steht als Tabelle da statt als Rechnung, damit sie im Nachweis Zeile
 * für Zeile gegen breakDown() gehalten werden kann — eine Rechnung, die sich
 * selbst prüft, prüft nichts.
 */
export const CHIP_SPLIT = Object.freeze({
	100: Object.freeze([{ value: 25, count: 4 }]),
	25:  Object.freeze([{ value: 20, count: 1 }, { value: 5, count: 1 }]),
	20:  Object.freeze([{ value: 5,  count: 4 }]),
	5:   Object.freeze([{ value: 1,  count: 5 }]),
	1:   Object.freeze([]),
});

/**
 * Der Chipbestand eines Spielers am Tisch.
 *
 * Was hier liegt, ist GELD: die Summe des Racks ist zu jedem Zeitpunkt genau
 * der Buy-in (CONCEPT.md C.4). table-buyin.js hält diese Zusage aufrecht, und
 * der Nachweis prüft sie nach jedem einzelnen Schritt. Diese Klasse selbst
 * bucht nichts und kennt weder Kasse noch Gerätekredit — sie zählt Chips.
 */
export class Rack {
	constructor() {
		/** @type {Map<number, number>} Wert → Stückzahl. Nie negativ, nie 0 als Eintrag. */
		this.counts = new Map();
	}

	/** Summe aller Chips in Euro. @returns {number} */
	get total() {
		let summe = 0;
		for (const [value, count] of this.counts) {
			summe += value * count;
		}
		return summe;
	}

	/** Stückzahl eines Werts, 0 wenn keiner da ist. @returns {number} */
	countOf(value) {
		return this.counts.get(value) ?? 0;
	}

	/**
	 * Bestand absteigend nach Wert, ohne Nullposten.
	 * Iteriert über CHIP_VALUES statt über die Map, damit die Reihenfolge
	 * festgelegt ist und nicht von der Einfügereihenfolge abhängt.
	 * @returns {Array<{value: number, count: number}>}
	 */
	toArray() {
		const out = [];
		for (const value of CHIP_VALUES) {
			const count = this.countOf(value);
			if (count > 0) {
				out.push({ value, count });
			}
		}
		return out;
	}

	/**
	 * Legt Chips hinein.
	 * @throws {RangeError} bei unbekanntem Wert oder count < 1
	 */
	put(value, count = 1) {
		if (!Object.prototype.hasOwnProperty.call(CHIPS, value)) {
			throw new RangeError(`Rack.put(): unbekannter Chipwert: ${String(value)}`);
		}
		if (!Number.isInteger(count) || count < 1) {
			throw new RangeError(`Rack.put(): count muss eine ganze Zahl ab 1 sein, bekam: ${String(count)}`);
		}
		this.counts.set(value, this.countOf(value) + count);
	}

	/**
	 * Nimmt genau EINEN Chip heraus.
	 * @returns {boolean} false, wenn keiner da ist — ohne jede Nebenwirkung
	 */
	take(value) {
		const vorhanden = this.countOf(value);
		if (vorhanden < 1) {
			return false;
		}
		if (vorhanden === 1) {
			this.counts.delete(value);
		} else {
			this.counts.set(value, vorhanden - 1);
		}
		return true;
	}

	/** Füllt einen Betrag als möglichst große Chips auf. Der Weg jedes Gewinns und jedes Buy-ins. */
	fill(amount) {
		for (const { value, count } of breakDown(amount)) {
			this.put(value, count);
		}
	}

	/** Leert das Rack und liefert die alte Summe zurück. */
	clear() {
		const summe = this.total;
		this.counts.clear();
		return summe;
	}

	/**
	 * Wechselt EINEN Chip in die nächstkleineren (CHIP_SPLIT).
	 * Der Wert des Racks ändert sich dabei NIE.
	 * @returns {{ok: true, into: Array}|{ok: false, reason: 'none'|'smallest'}}
	 */
	exchangeDown(value) {
		if (value === 1) {
			return { ok: false, reason: 'smallest' };
		}
		if (!this.take(value)) {
			return { ok: false, reason: 'none' };
		}
		const teile = CHIP_SPLIT[value];
		for (const { value: kleinererWert, count } of teile) {
			this.put(kleinererWert, count);
		}
		return { ok: true, into: teile };
	}

	/**
	 * Fasst die nächstkleineren Chips zu EINEM Chip dieses Werts zusammen —
	 * der Rückweg von exchangeDown.
	 *
	 * Im Konzept nicht ausdrücklich verlangt (C.4.1 nennt nur das
	 * Kleinwechseln), wird aber gebaut, weil ein Rack sonst mit jeder
	 * Auszahlung weiter zerfasert: wer dreißigmal gewinnt und zwischendurch
	 * kleinwechselt, steht am Ende mit zweihundert Einern da und kann keinen
	 * Stapel mehr sinnvoll legen. Zwölf Zeilen Code gegen ein unbenutzbares
	 * Wechselfeld.
	 *
	 * @returns {{ok: true}|{ok: false, reason: 'missing'|'smallest'}}
	 */
	exchangeUp(value) {
		const teile = CHIP_SPLIT[value];
		if (!teile || teile.length === 0) {
			return { ok: false, reason: 'smallest' };
		}
		for (const { value: kleinererWert, count } of teile) {
			if (this.countOf(kleinererWert) < count) {
				return { ok: false, reason: 'missing' };
			}
		}
		for (const { value: kleinererWert, count } of teile) {
			for (let i = 0; i < count; i += 1) {
				this.take(kleinererWert);
			}
		}
		this.put(value, 1);
		return { ok: true };
	}
}

export default CHIPS;
