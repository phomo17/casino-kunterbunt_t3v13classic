/**
 * Casino Kunterbunt – die Setzfläche eines Spieltisches (Zustand)
 * ===============================================================
 *
 * CONCEPT.md C.3: „Ein Tuch mit Feldern, auf die Chips gelegt werden. Ein Feld
 * kennt seinen Namen, seine abgedeckten Ergebnisse, seine Auszahlung und sein
 * Höchsteinsatzlimit. Jedes Spiel liefert nur seine Feldliste; das Legen,
 * Stapeln, Zurücknehmen, Anzeigen und Auszahlen ist geteilter Baustein."
 *
 * Diese Datei ist die eine Hälfte davon: das Legen, Stapeln, Zurücknehmen und
 * Auszahlen als reine Buchführung. Das ANZEIGEN steht in table-felt.js.
 *
 * Einbindung in einer Tisch-Extension:
 *
 *   import { BetTable } from '@phomo17/casino-startpage/table-bets.js';
 *
 *
 * KEIN IMPORT, KEIN DOKUMENT, KEIN GELD
 * -------------------------------------
 * Kein import, kein document, kein window, kein localStorage, kein
 * Math.random — wie table-chips.js, und aus denselben zwei Gründen (Node lädt
 * sie unmittelbar; sie kann kein Gerät kennen).
 *
 * Und KEIN GELD: diese Datei bucht nichts. Sie zählt Chips auf Feldern. Ob der
 * Spieler den Chip überhaupt hat und was er kostet, entscheidet table-buyin.js
 * — dort liegt die Verbindung zu Rack, Gerätekredit und Kasse. Die Trennung
 * ist der Grund, warum der Nachweis dieser Datei ohne jede Kassenmechanik
 * auskommt und der Nachweis der Kassenmechanik ohne jede Feldliste.
 *
 *
 * WIE EIN FELD GEWINNT
 * --------------------
 * Ein Feld beschreibt seine Treffer auf eine von zwei Arten:
 *
 *   covers   eine Liste abgedeckter Ergebnisse. Verglichen wird mit ===, die
 *            Ergebnisse dürfen Zahlen oder Zeichenketten sein — beim Roulette
 *            sind es 0 bis 36 UND '00', also beides zugleich (Anhang F).
 *   matches  wahlweise statt covers: eine Funktion (ergebnis) => true|false.
 *            Craps braucht sie, weil dort eine Wette über MEHRERE Würfe läuft
 *            und ihr Ausgang nicht aus einem einzelnen Wurf ablesbar ist
 *            (C.8.4). Roulette und Blackjack kommen mit covers aus.
 *
 * Daneben steht optional push: eine Liste von Ergebnissen, bei denen der
 * Einsatz zurückkommt, ohne dass gewonnen oder verloren wurde. Blackjack
 * braucht das für den Gleichstand, Craps für Don't Pass bei der 12 (Bar 12,
 * Anhang H). Ohne push müsste jedes Spiel das Patt außerhalb dieses Bausteins
 * nachbauen — genau die Doppelung, die C.3 vermeiden will.
 *
 *
 * DIE BERICHTSFELDER VON settle() — EINE EIGENE FESTLEGUNG
 * ----------------------------------------------------------
 * Je Feld unterscheidet der Bericht "payout" (nur der reine Gewinnanteil,
 * ohne den zurückgegebenen Einsatz) von "returned" (was insgesamt an den
 * Buy-in zurückgeht: bei win Einsatz+Gewinn, bei push nur der Einsatz, bei
 * loss nichts). Auf oberster Ebene ist "total" die Summe der Einsätze und
 * "payout" die Summe aller "returned" — also genau der Betrag, den
 * table-buyin.js als "returned" an payout() übergibt, während "total" dort
 * als "sweptStake" dient. Das Konzept nennt für settle() nur die Feldnamen,
 * nicht ihre genaue Bedeutung; diese Zuordnung ist deshalb eine eigene
 * Festlegung (DECISIONS.md), gewählt danach, was table-buyin.js in C1-D
 * unmittelbar braucht.
 *
 *
 * ODDS ZÄHLEN NICHT MIT — countsToRoundMax
 * ----------------------------------------
 * roundMax ist der Gesamteinsatz einer Runde über alle Felder. Craps braucht
 * eine Ausnahme: „Odds zählen nicht in den Gesamteinsatz je Wurf. Alles andere
 * zusammen höchstens 300 €" (CONCEPT.md Anhang H). Ein Feld kann deshalb
 * countsToRoundMax: false tragen; es unterliegt dann nur noch seinem eigenen
 * max. Ohne Angabe gilt true, und für Roulette und Blackjack ändert sich
 * nichts.
 *
 * VERTRAGSWETTEN — freeze(feld, betrag)
 * -------------------------------------
 * Eine Pass Line darf nach dem Point weder erhöht noch zurückgenommen werden.
 * freeze(feldId, betrag) legt für ein Feld einen SOCKEL fest: bis auf diesen
 * Betrag darf abgeräumt werden, darunter nicht. Ein Sockel statt eines
 * bloßen Schalters, aus einem handfesten Grund: table-felt.js legt einen Chip
 * ZUERST und fragt das Geld erst danach; lehnt das Geld ab, nimmt es den eben
 * gelegten Chip mit takeBack() wieder herunter. Ein Feld, das komplett
 * gesperrt wäre, ließe diese Rücknahme scheitern und behielte einen Chip, den
 * niemand bezahlt hat. Mit einem Sockel geht sie immer, weil der eben gelegte
 * Chip per Definition ÜBER dem Sockel liegt.
 *
 * Was der Sockel bewirkt:
 *   takeBack()  Absage 'frozen', sobald der Rest unter den Sockel fiele
 *   undo()      überspringt geschützte Chips und nimmt den nächsten freien
 *   clear()     lässt den Sockel liegen und gibt nur den Rest zurück
 *   double()    lässt Felder MIT Sockel unangetastet (an einer Vertragswette
 *               wird nicht nachgelegt) und verdoppelt nur die übrigen
 *   repeat()    unverändert — es verlangt ohnehin ein leeres Tuch
 * Ohne freeze() ist jeder Sockel 0 und alles verhält sich wie bisher.
 */

/**
 * Ein Feld der Setzfläche.
 *
 * id       eindeutig innerhalb eines Tisches. Er steht später als
 *          data-ck-field im Markup und ist die Klammer zwischen Tuch und
 *          Buchführung.
 * label    XLIFF-Verweis oder Klartext. Wird NIE von dieser Datei ausgegeben —
 *          sie reicht ihn nur an die Ansicht durch.
 * covers   Array abgedeckter Ergebnisse, oder null
 * matches  Funktion (ergebnis) => boolean, oder null
 * push     Array von Ergebnissen mit Einsatzrückgabe, oder null
 * payout   das Verhältnis der Auszahlung: 35 heißt 35 : 1. Ganzzahlig oder
 *          gebrochen (Craps zahlt 7 : 6, also 7/6). Ausgezahlt wird
 *          abgerundet auf ganze Euro — es gibt keine halben Chips.
 * max      Höchsteinsatz auf diesem Feld in Euro
 * countsToRoundMax  zählt dieses Feld in den Rundenhöchstbetrag? Ohne Angabe
 *          true. Craps braucht false für Odds (siehe Dateikopf).
 */
export class BetField {
	constructor({ id, label, covers = null, matches = null, push = null, payout, max, countsToRoundMax = true }) {
		if (typeof id !== 'string' || id === '') {
			throw new TypeError('Ein Feld braucht eine id.');
		}
		if (covers === null && typeof matches !== 'function') {
			throw new TypeError(`Feld "${id}": entweder covers oder matches, sonst gewinnt es nie.`);
		}
		if (!Number.isFinite(payout) || payout <= 0) {
			throw new RangeError(`Feld "${id}": payout muss größer als 0 sein.`);
		}
		if (!Number.isInteger(max) || max < 1) {
			throw new RangeError(`Feld "${id}": max muss eine ganze Zahl ab 1 sein.`);
		}
		this.id = id;
		this.label = label;
		this.covers = covers === null ? null : Object.freeze([...covers]);
		this.matches = matches;
		this.push = push === null ? null : Object.freeze([...push]);
		this.payout = payout;
		this.max = max;
		/** Zählt dieses Feld in den Rundenhöchstbetrag? Odds tun das nicht. */
		this.countsToRoundMax = countsToRoundMax !== false;
	}

	/**
	 * Wie dieses Feld ein Ergebnis wertet.
	 * @returns {'win'|'push'|'loss'}
	 */
	outcome(result) {
		if (this.push !== null && this.push.includes(result)) {
			return 'push';
		}
		const trifft = this.matches !== null ? this.matches(result) : this.covers.includes(result);
		return trifft ? 'win' : 'loss';
	}
}

/**
 * Die Setzfläche eines Tisches.
 */
export class BetTable {
	/**
	 * @param {{fields: Array, roundMax: number}} options
	 *   fields    die Feldliste des Spiels — BetField-Objekte oder Beschreibungen
	 *   roundMax  Gesamteinsatz je Runde über ALLE Felder (Roulette 100 €,
	 *             Craps 300 € ohne Odds — Anhang F und H)
	 */
	constructor({ fields, roundMax }) {
		if (!Number.isInteger(roundMax) || roundMax < 1) {
			throw new RangeError(`roundMax muss eine ganze Zahl ab 1 sein, bekam: ${String(roundMax)}`);
		}
		this.fields = new Map();
		for (const beschreibung of fields) {
			const feld = beschreibung instanceof BetField ? beschreibung : new BetField(beschreibung);
			if (this.fields.has(feld.id)) {
				throw new TypeError(`Doppelte Feld-id: "${feld.id}"`);
			}
			this.fields.set(feld.id, feld);
		}
		this.roundMax = roundMax;
		this.locked = false;
		/** @type {Array<{fieldId: string, value: number}>} in Legereihenfolge */
		this.placements = [];
		/** @type {Array<{fieldId: string, value: number}>|null} für repeat() */
		this.lastRound = null;
		/** @type {Map<string, number>} Feld → festliegender Sockel (Vertragswette). */
		this.floors = new Map();
	}

	/** true, solange gesetzt werden darf. Wird vom Rundenablauf gesetzt. */
	get open() {
		return !this.locked;
	}

	lock() {
		this.locked = true;
	}

	unlock() {
		this.locked = false;
	}

	/** Gesamteinsatz über alle Felder. */
	get total() {
		let summe = 0;
		for (const p of this.placements) {
			summe += p.value;
		}
		return summe;
	}

	/**
	 * Gesamteinsatz über alle Felder, die in den Rundenhöchstbetrag zählen.
	 * Für Roulette und Blackjack identisch mit total.
	 */
	get countedTotal() {
		let summe = 0;
		for (const p of this.placements) {
			const feld = this.fields.get(p.fieldId);
			if (feld && feld.countsToRoundMax) {
				summe += p.value;
			}
		}
		return summe;
	}

	/** Der festliegende Sockel eines Feldes. */
	floorOn(fieldId) {
		return this.floors.get(fieldId) ?? 0;
	}

	/**
	 * Legt einen Sockel fest: bis auf diesen Betrag darf abgeräumt werden.
	 * @param {string} fieldId
	 * @param {number} amount 0 hebt den Sockel auf
	 */
	freeze(fieldId, amount) {
		if (!Number.isInteger(amount) || amount <= 0) {
			this.floors.delete(fieldId);
			return;
		}
		this.floors.set(fieldId, amount);
	}

	/** Hebt den Sockel eines Feldes auf. */
	unfreeze(fieldId) {
		this.floors.delete(fieldId);
	}

	/** Einsatz auf einem Feld. */
	stakeOn(fieldId) {
		let summe = 0;
		for (const p of this.placements) {
			if (p.fieldId === fieldId) {
				summe += p.value;
			}
		}
		return summe;
	}

	/**
	 * Die Stapel eines Feldes, absteigend nach Chipwert.
	 * Gestapelt wird nach Wert: ein Stapel besteht immer aus gleichen Chips,
	 * mehrere Werte liegen als mehrere Stapel nebeneinander (C.4.1).
	 * @returns {Array<{value: number, count: number}>}
	 */
	stacksOn(fieldId) {
		const zaehler = new Map();
		for (const p of this.placements) {
			if (p.fieldId !== fieldId) {
				continue;
			}
			zaehler.set(p.value, (zaehler.get(p.value) ?? 0) + 1);
		}
		return [...zaehler.entries()]
			.sort((a, b) => b[0] - a[0])
			.map(([value, count]) => ({ value, count }));
	}

	/**
	 * Legt einen Chip auf ein Feld.
	 *
	 * Geprüft wird in dieser Reihenfolge, und die erste Absage gewinnt:
	 *   'value'     kein ganzzahliger Chipwert ab 1
	 *   'unknown'   dieses Feld gibt es an diesem Tisch nicht
	 *   'locked'    die Runde nimmt keine Einsätze mehr an
	 *   'fieldmax'  der Höchsteinsatz DIESES Feldes wäre überschritten
	 *   'roundmax'  der Gesamteinsatz der Runde wäre überschritten
	 *
	 * Bei jeder Absage wird NICHTS verändert. Kein stiller Fehlschlag: der
	 * Grund kommt als Rückgabewert, damit die Ansage ihn aussprechen kann
	 * (CONCEPT.md C.4, letzter Punkt).
	 *
	 * @returns {{ok: true, value: number, fieldId: string, total: number}
	 *          |{ok: false, reason: string, limit?: number, total: number}}
	 */
	place(fieldId, chipValue) {
		if (!Number.isInteger(chipValue) || chipValue < 1) {
			return { ok: false, reason: 'value', total: this.total };
		}
		const feld = this.fields.get(fieldId);
		if (!feld) {
			return { ok: false, reason: 'unknown', total: this.total };
		}
		if (this.locked) {
			return { ok: false, reason: 'locked', total: this.total };
		}
		const bisher = this.stakeOn(fieldId);
		if (bisher + chipValue > feld.max) {
			return { ok: false, reason: 'fieldmax', limit: feld.max, total: this.total };
		}
		if (feld.countsToRoundMax && this.countedTotal + chipValue > this.roundMax) {
			return { ok: false, reason: 'roundmax', limit: this.roundMax, total: this.total };
		}
		this.placements.push({ fieldId, value: chipValue });
		return { ok: true, value: chipValue, fieldId, total: this.total };
	}

	/**
	 * Nimmt den obersten Chip EINES Feldes zurück — den zuletzt dort
	 * gelegten. „Oben" ist damit dasselbe wie „zuletzt", und das ist die
	 * einzige Deutung, die mit dem Bild eines Stapels zusammenpasst.
	 * @returns {{ok: true, value: number, total: number}
	 *          |{ok: false, reason: 'unknown'|'locked'|'empty'|'frozen', floor?: number}}
	 */
	takeBack(fieldId) {
		const feld = this.fields.get(fieldId);
		if (!feld) {
			return { ok: false, reason: 'unknown' };
		}
		if (this.locked) {
			return { ok: false, reason: 'locked' };
		}
		const sockel = this.floorOn(fieldId);
		const gesetzt = this.stakeOn(fieldId);
		for (let i = this.placements.length - 1; i >= 0; i -= 1) {
			if (this.placements[i].fieldId === fieldId) {
				if (gesetzt - this.placements[i].value < sockel) {
					return { ok: false, reason: 'frozen', floor: sockel };
				}
				const [entfernt] = this.placements.splice(i, 1);
				return { ok: true, value: entfernt.value, total: this.total };
			}
		}
		return { ok: false, reason: 'empty' };
	}

	/**
	 * „Letzten Einsatz zurücknehmen" der Bedienleiste: der zuletzt gelegte
	 * Chip überhaupt, gleichgültig auf welchem Feld.
	 * @returns {{ok: true, fieldId: string, value: number, total: number}
	 *          |{ok: false, reason: 'locked'|'empty'|'frozen'}}
	 */
	undo() {
		if (this.locked) {
			return { ok: false, reason: 'locked' };
		}
		if (this.placements.length === 0) {
			return { ok: false, reason: 'empty' };
		}
		// Von hinten nach vorn den letzten Chip suchen, der nicht durch einen
		// Sockel geschützt ist. Ein geschützter Chip wird ÜBERSPRUNGEN, nicht
		// abgelehnt: sonst wäre "Letzten Einsatz zurücknehmen" wirkungslos,
		// sobald irgendwo eine Vertragswette liegt.
		for (let i = this.placements.length - 1; i >= 0; i -= 1) {
			const p = this.placements[i];
			if (this.stakeOn(p.fieldId) - p.value < this.floorOn(p.fieldId)) {
				continue;
			}
			const [entfernt] = this.placements.splice(i, 1);
			return { ok: true, fieldId: entfernt.fieldId, value: entfernt.value, total: this.total };
		}
		return { ok: false, reason: 'frozen' };
	}

	/**
	 * „Alles zurücknehmen": leert das ganze Tuch. Bei gesperrter Runde
	 * geschieht NICHTS (dieselbe Sperre wie bei den übrigen fünf Methoden,
	 * die ein Einsatzbild verändern können).
	 * @returns {Array<{fieldId: string, value: number}>|{ok: false, reason: 'locked'}} was
	 *          zurückgegeben wurde, oder die Absage
	 */
	clear() {
		if (this.locked) {
			return { ok: false, reason: 'locked' };
		}
		// Von hinten nach vorn abräumen, damit die ZUERST gelegten Chips
		// liegen bleiben: sie sind die Vertragswette. unshift() stellt in
		// beiden Listen die ursprüngliche Reihenfolge wieder her.
		const rest = new Map();
		for (const p of this.placements) {
			rest.set(p.fieldId, (rest.get(p.fieldId) ?? 0) + p.value);
		}
		const entfernt = [];
		const bleiben = [];
		for (let i = this.placements.length - 1; i >= 0; i -= 1) {
			const p = this.placements[i];
			const uebrig = rest.get(p.fieldId) ?? 0;
			if (uebrig - p.value >= this.floorOn(p.fieldId)) {
				rest.set(p.fieldId, uebrig - p.value);
				entfernt.unshift({ ...p });
			} else {
				bleiben.unshift({ ...p });
			}
		}
		this.placements = bleiben;
		return entfernt;
	}

	/**
	 * „Verdoppeln": jeder liegende Chip ein zweites Mal.
	 *
	 * ALLES ODER NICHTS. Passt auch nur ein einziger Chip nicht mehr in sein
	 * Feldlimit oder in den Rundenhöchstbetrag, wird gar nichts verdoppelt und
	 * die Absage zurückgegeben. Dieselbe Zusage wie beim Einwerfen
	 * (DECISIONS.md 2026-09-02, „Einwerfen ist alles oder nichts") und aus
	 * demselben Grund: wer verdoppeln drückt und die Hälfte bekommt, hat etwas
	 * bekommen, das er nicht verlangt hat.
	 *
	 * @returns {{ok: true, added: Array}|{ok: false, reason: 'locked'|'empty'|'fieldmax'|'roundmax'}}
	 */
	double() {
		if (this.locked) {
			return { ok: false, reason: 'locked' };
		}
		// Ein Feld mit Sockel ist eine Vertragswette; an ihr wird nicht
		// nachgelegt. Verdoppelt wird, was frei ist.
		const frei = this.placements.filter((p) => this.floorOn(p.fieldId) === 0);
		if (frei.length === 0) {
			return { ok: false, reason: 'empty' };
		}
		const freiJeFeld = new Map();
		for (const p of frei) {
			freiJeFeld.set(p.fieldId, (freiJeFeld.get(p.fieldId) ?? 0) + p.value);
		}
		let zusatzGezaehlt = 0;
		for (const [fieldId, zusatz] of freiJeFeld) {
			const feld = this.fields.get(fieldId);
			if (this.stakeOn(fieldId) + zusatz > feld.max) {
				return { ok: false, reason: 'fieldmax' };
			}
			if (feld.countsToRoundMax) {
				zusatzGezaehlt += zusatz;
			}
		}
		if (this.countedTotal + zusatzGezaehlt > this.roundMax) {
			return { ok: false, reason: 'roundmax' };
		}
		const added = frei.map((p) => ({ ...p }));
		for (const p of added) {
			this.placements.push({ ...p });
		}
		return { ok: true, added };
	}

	/**
	 * „Wiederholen": die Einsätze der zuletzt ausgewerteten Runde noch einmal.
	 * Ebenfalls alles oder nichts, aus demselben Grund.
	 * @returns {{ok: true, placed: Array}|{ok: false, reason: 'locked'|'nothing'|'fieldmax'|'roundmax'|'notempty'}}
	 */
	repeat() {
		if (this.locked) {
			return { ok: false, reason: 'locked' };
		}
		if (this.placements.length > 0) {
			return { ok: false, reason: 'notempty' };
		}
		if (!this.lastRound || this.lastRound.length === 0) {
			return { ok: false, reason: 'nothing' };
		}
		const gesetztJeFeld = new Map();
		for (const p of this.lastRound) {
			gesetztJeFeld.set(p.fieldId, (gesetztJeFeld.get(p.fieldId) ?? 0) + p.value);
		}
		for (const [fieldId, gesetzt] of gesetztJeFeld) {
			const feld = this.fields.get(fieldId);
			if (!feld || gesetzt > feld.max) {
				return { ok: false, reason: 'fieldmax' };
			}
		}
		let neuerGesamteinsatz = 0;
		for (const p of this.lastRound) {
			if (this.fields.get(p.fieldId)?.countsToRoundMax) {
				neuerGesamteinsatz += p.value;
			}
		}
		if (neuerGesamteinsatz > this.roundMax) {
			return { ok: false, reason: 'roundmax' };
		}
		const placed = this.lastRound.map((p) => ({ ...p }));
		for (const p of placed) {
			this.placements.push({ ...p });
		}
		return { ok: true, placed };
	}

	/**
	 * Wertet ein Ergebnis aus und rechnet die Auszahlung.
	 *
	 * Ausgezahlt wird je Feld:
	 *   win    Einsatz + abgerundet(Einsatz × payout)
	 *   push   Einsatz
	 *   loss   0
	 *
	 * Abgerundet wird mit Math.floor, weil es keine halben Chips gibt und
	 * weil Aufrunden dem Haus Geld abnähme, das die Auszahlungstabellen nicht
	 * vorsehen. Bei den Quoten aus Anhang F und H fällt das nur bei 7 : 6 und
	 * 9 : 5 überhaupt an, und dort schreibt die Tabelle ohnehin Vielfache von
	 * 6 beziehungsweise 5 als Einsatz vor.
	 *
	 * settle() räumt das Tuch NICHT leer und bucht nichts — es rechnet. Erst
	 * sweep() nimmt die Chips herunter. Zwei Schritte, damit die Ansicht die
	 * gewinnenden Stapel noch zeigen kann, bevor sie eingesammelt werden.
	 *
	 * @returns {{result: *, total: number, payout: number,
	 *            fields: Array<{fieldId, staked, outcome, payout, returned}>}}
	 */
	settle(result) {
		const gesetztJeFeld = new Map();
		for (const p of this.placements) {
			gesetztJeFeld.set(p.fieldId, (gesetztJeFeld.get(p.fieldId) ?? 0) + p.value);
		}
		let total = 0;
		let payoutSumme = 0;
		const fields = [];
		for (const [fieldId, staked] of gesetztJeFeld) {
			const feld = this.fields.get(fieldId);
			const outcome = feld.outcome(result);
			let payout = 0;
			let returned = 0;
			if (outcome === 'win') {
				payout = Math.floor(staked * feld.payout);
				returned = staked + payout;
			} else if (outcome === 'push') {
				returned = staked;
			}
			total += staked;
			payoutSumme += returned;
			fields.push({ fieldId, staked, outcome, payout, returned });
		}
		return { result, total, payout: payoutSumme, fields };
	}

	/**
	 * Nimmt alle Chips vom Tuch und merkt sich die Runde für repeat().
	 * @returns {Array<{fieldId: string, value: number}>}
	 */
	sweep() {
		const entfernt = this.placements.map((p) => ({ ...p }));
		this.lastRound = entfernt.map((p) => ({ ...p }));
		this.placements = [];
		return entfernt;
	}

	/** Momentaufnahme für Prüfskripte und für den späteren Mehrspielerbetrieb (Teil D). */
	snapshot() {
		return {
			locked: this.locked,
			placements: this.placements.map((p) => ({ ...p })),
			lastRound: this.lastRound === null ? null : this.lastRound.map((p) => ({ ...p })),
			floors: [...this.floors.entries()],
		};
	}

	/** Setzt eine Momentaufnahme zurück. Der Gegenweg zu snapshot(). */
	restore(snapshot) {
		this.locked = snapshot.locked;
		this.placements = snapshot.placements.map((p) => ({ ...p }));
		this.lastRound = snapshot.lastRound === null ? null : snapshot.lastRound.map((p) => ({ ...p }));
		this.floors = new Map(snapshot.floors ?? []);
	}
}

export default BetTable;
