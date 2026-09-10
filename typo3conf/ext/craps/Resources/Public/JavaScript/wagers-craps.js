/**
 * Craps – der Wettzustand über mehrere Würfe (CONCEPT.md C.8.4, Anhang H)
 * ========================================================================
 *
 * DIE EINE AUFGABE
 * ----------------
 * Diese Datei weiß, ob ein Point steht und welcher, und sie beantwortet für
 * jeden einzelnen Wurf zwei Fragen:
 *
 *   resolve()   Was wird aus jedem Einsatz, der auf dem Tuch liegt?
 *   mayPlace()  Darf dieser Chip überhaupt auf dieses Feld?
 *
 * Sie bucht KEIN Geld, sie fasst KEIN Dokument an und sie kennt weder Chips
 * noch Kasse. Sie bekommt eine Aufstellung „Feld → Einsatz" und liefert
 * Urteile zurück. Das Geld bewegt round-craps.js, die Chips bewegt
 * table-bets.js, die Anzeige table-felt.js.
 *
 * KEIN IMPORT, KEIN DOKUMENT
 * --------------------------
 * Node lädt sie unmittelbar; verify-wagers.mjs rechnet mit DIESER Datei
 * (CONCEPT.md C.5.3). Alles, was sie braucht — ratioFor, oddsMax, payout —,
 * wird ihr im Konstruktor übergeben. Sie kann nichts erreichen, weil ihr
 * nichts gegeben wird, womit sie etwas erreichen könnte. Dieselbe bauliche
 * Zusage wie bei round-roulette.js.
 *
 * DIE FÜNF URTEILE
 * ----------------
 *   'win'   gewonnen: Einsatz und Gewinn gehen zurück, die Chips gehen vom Tuch
 *   'loss'  verloren: die Chips gehen vom Tuch, nichts kommt zurück
 *   'push'  Patt (Don't Pass/Don't Come bei der 12, „Bar 12"): der Einsatz
 *           kommt zurück, die Chips gehen vom Tuch
 *   'stay'  unentschieden: die Chips BLEIBEN liegen und warten auf den
 *           nächsten Wurf. Das ist der Fall, den Roulette und Blackjack nicht
 *           kennen und der Grund, warum es diese Datei gibt.
 *   'move'  die Chips wandern auf ein anderes Feld (Come → Come-Zahl)
 *
 * DER POINT WECHSELT NACH DEN URTEILEN, NICHT VORHER
 * ---------------------------------------------------
 * Jede Wette wird gegen den Zustand VOR dem Wurf beurteilt. Wer die
 * Reihenfolge umdreht, lässt eine Pass Line beim Come-out-Wurf gegen einen
 * Point verlieren, den derselbe Wurf gerade erst gesetzt hat.
 *
 * ZWEI HAUSREGELN, DIE ANHANG H OFFENLÄSST — EIGENE FESTLEGUNG
 * ------------------------------------------------------------
 * 1. Odds arbeiten IMMER, auch beim Come-out. Ihr Hausvorteil ist in beiden
 *    Fällen genau null, die Regel ändert also an der Quote nichts; sie ist
 *    nur einfacher zu erklären als „beim Come-out ruhen sie, außer man sagt
 *    etwas anderes".
 * 2. Hardways arbeiten IMMER. Die Hausvorteile 11,11 % und 9,09 % aus
 *    Anhang H sind genau für diesen Fall gerechnet.
 * 3. C & E arbeitet IMMER, auch beim Come-out. Sie ist eine Einwurfwette wie
 *    Any Craps und die Elf, aus denen sie zusammengesetzt ist; beide arbeiten
 *    ebenfalls immer. Der Hausvorteil −1/9 ist genau für diesen Fall
 *    gerechnet.
 * Place-Wetten ruhen dagegen beim Come-out IMMER (klassische Regel, für den
 * Spieler günstig) und sind während des Points über einen Schalter an- und
 * abschaltbar (C.8.4 verlangt die Schaltbarkeit ausdrücklich). Ihre
 * Hausvorteile sind je AUFGELÖSTER Wette gerechnet und ändern sich dadurch
 * nicht.
 */

/** Die sechs Point-Zahlen. Ausgeschrieben, weil diese Datei nichts importiert. */
const POINT_ZAHLEN = Object.freeze([4, 5, 6, 8, 9, 10]);

export class CrapsWagers {
	/**
	 * @param {{ratioFor: function(string, object): ?object,
	 *          oddsMax: function(number, number, boolean): number,
	 *          payout: function(number, object): number}} parts
	 * @throws {TypeError} wenn ein Pflichtstück fehlt
	 */
	constructor(parts) {
		const { ratioFor, oddsMax, payout } = parts ?? {};
		for (const [name, wert] of [['ratioFor', ratioFor], ['oddsMax', oddsMax], ['payout', payout]]) {
			if (typeof wert !== 'function') {
				throw new TypeError(`CrapsWagers braucht "${name}": new CrapsWagers({ ratioFor, oddsMax, payout }).`);
			}
		}
		this.ratioFor = ratioFor;
		this.oddsMax = oddsMax;
		this.payout = payout;
		/** @type {?number} null = Come-out, sonst 4,5,6,8,9 oder 10 */
		this.pointValue = null;
	}

	/** @returns {?number} */
	get point() {
		return this.pointValue;
	}

	/** @returns {'comeout'|'point'} */
	get phase() {
		return this.pointValue === null ? 'comeout' : 'point';
	}

	/**
	 * Der Einsatz auf einem Feld, aus der übergebenen Aufstellung.
	 * @param {Object<string, number>} stakes
	 * @param {string} id
	 * @returns {number}
	 */
	static stakeOf(stakes, id) {
		const wert = Number(stakes?.[id] ?? 0);
		return Number.isFinite(wert) && wert > 0 ? wert : 0;
	}

	/**
	 * Darf dieser Chip auf dieses Feld?
	 *
	 * WICHTIG: stakes ist der Stand VOR diesem Chip. Die Setzfläche
	 * (table-bets.js) bucht den Chip, BEVOR der Rückruf onPlace läuft; wer ihr
	 * den Stand danach übergäbe, prüfte gegen einen bereits gelegten Chip und
	 * ließe genau einen zu viel durch.
	 *
	 * @param {string} fieldId
	 * @param {number} chipValue
	 * @param {Object<string, number>} stakes
	 * @returns {{ok: true, hint?: 'unit', unit?: number}
	 *          |{ok: false, reason: 'contract'|'comeout'|'traveled'|'nopoint'|'nobase'|'oddsmax', limit?: number}}
	 */
	mayPlace(fieldId, chipValue, stakes) {
		const s = (id) => CrapsWagers.stakeOf(stakes, id);
		const p = this.pointValue;

		// Pass Line und Don't Pass: nur beim Come-out. Danach ist die Wette
		// eine Vertragswette — sie darf weder erhöht noch verringert werden.
		if (fieldId === 'pass' || fieldId === 'dont-pass') {
			return p === null ? { ok: true } : { ok: false, reason: 'contract' };
		}
		// Come und Don't Come: nur, wenn ein Point steht. Beim Come-out wären
		// sie dieselbe Wette wie die Linie und hätten keinen eigenen Sinn.
		if (fieldId === 'come' || fieldId === 'dont-come') {
			return p !== null ? { ok: true } : { ok: false, reason: 'comeout' };
		}
		// Die Zahlenkästen selbst nehmen keinen Chip an: dorthin WANDERT eine
		// Come-Wette von selbst. Ein Chip, den man dort ablegen könnte, wäre
		// eine Wette zu 1 : 1 auf eine Zahl, die Anhang H nicht kennt.
		if (/^come-\d+$/.test(fieldId) || /^dont-come-\d+$/.test(fieldId)) {
			return { ok: false, reason: 'traveled' };
		}
		// Odds hinter der Linie.
		if (fieldId === 'pass-odds' || fieldId === 'dont-pass-odds') {
			if (p === null) {
				return { ok: false, reason: 'nopoint' };
			}
			const dunkel = fieldId === 'dont-pass-odds';
			const basis = dunkel ? 'dont-pass' : 'pass';
			if (s(basis) <= 0) {
				return { ok: false, reason: 'nobase' };
			}
			const grenze = this.oddsMax(p, s(basis), dunkel);
			if (s(fieldId) + chipValue > grenze) {
				return { ok: false, reason: 'oddsmax', limit: grenze };
			}
			return this.einheitshinweis(fieldId, s(fieldId) + chipValue, p);
		}
		// Odds hinter einer Come-Zahl.
		const hell = /^come-odds-(\d+)$/.exec(fieldId);
		const dunkel = /^dont-come-odds-(\d+)$/.exec(fieldId);
		if (hell !== null || dunkel !== null) {
			const n = Number((hell ?? dunkel)[1]);
			const istDunkel = dunkel !== null;
			const basis = istDunkel ? `dont-come-${n}` : `come-${n}`;
			if (s(basis) <= 0) {
				return { ok: false, reason: 'nobase' };
			}
			const grenze = this.oddsMax(n, s(basis), istDunkel);
			if (s(fieldId) + chipValue > grenze) {
				return { ok: false, reason: 'oddsmax', limit: grenze };
			}
			return this.einheitshinweis(fieldId, s(fieldId) + chipValue, n);
		}
		// Place-Wetten: erlaubt, aber mit Hinweis, wenn der Einsatz die
		// Einheit verfehlt (Anhang H: „Vielfache von 5" bzw. „von 6").
		if (/^place-\d+$/.test(fieldId)) {
			return this.einheitshinweis(fieldId, s(fieldId) + chipValue, null);
		}
		return { ok: true };
	}

	/**
	 * Ein Hinweis — KEINE Absage —, wenn der neue Einsatz kein Vielfaches der
	 * Einheit ist und deshalb beim Abrunden einen Teil der Auszahlung verliert.
	 * @param {string} fieldId
	 * @param {number} neuerEinsatz
	 * @param {?number} point
	 * @returns {{ok: true, hint?: 'unit', unit?: number}}
	 */
	einheitshinweis(fieldId, neuerEinsatz, point) {
		const r = this.ratioFor(fieldId, { point });
		const einheit = r === null ? 1 : r.den;
		if (einheit > 1 && neuerEinsatz % einheit !== 0) {
			return { ok: true, hint: 'unit', unit: einheit };
		}
		return { ok: true };
	}

	/**
	 * Welche Beträge festliegen und nicht mehr zurückgenommen werden dürfen.
	 *
	 * Das sind genau zwei Fälle: eine Pass Line, sobald ihr Point steht, und
	 * jede Come-Wette, die schon auf ihrer Zahl liegt. Die dunkle Seite
	 * (Don't Pass, Don't Come) darf zurückgenommen werden — sie hat den
	 * gefährlichen Teil hinter sich, und am echten Tisch ist das erlaubt.
	 * Odds und Place-Wetten sind ohnehin jederzeit abräumbar.
	 *
	 * @param {Object<string, number>} stakes
	 * @returns {Array<[string, number]>} Feld → festliegender Betrag
	 */
	contracts(stakes) {
		const s = (id) => CrapsWagers.stakeOf(stakes, id);
		const feste = [];
		if (this.pointValue !== null && s('pass') > 0) {
			feste.push(['pass', s('pass')]);
		}
		for (const n of POINT_ZAHLEN) {
			if (s(`come-${n}`) > 0) {
				feste.push([`come-${n}`, s(`come-${n}`)]);
			}
		}
		return feste;
	}

	/**
	 * Wertet einen gültigen Wurf aus.
	 *
	 * @param {{sum: number, faces: number[], stakes: Object<string, number>,
	 *          placeWorking?: boolean}} wurf
	 * @returns {{sum: number, faces: number[], hard: boolean,
	 *            point: ?number, previousPoint: ?number,
	 *            event: 'natural'|'craps'|'point-set'|'point-made'|'seven-out'|'roll',
	 *            fields: Array<{fieldId: string, staked: number,
	 *                           outcome: 'win'|'loss'|'push'|'stay'|'move',
	 *                           payout: number, returned: number, movedTo: ?string}>,
	 *            moves: Array<{from: string, to: string}>,
	 *            cleared: string[], total: number, payout: number}}
	 */
	resolve({ sum, faces, stakes, placeWorking = true }) {
		const vorher = this.pointValue;
		const hart = Array.isArray(faces) && faces.length === 2 && faces[0] === faces[1];
		const s = (id) => CrapsWagers.stakeOf(stakes, id);

		/* 1  Der neue Point steht fest, BEVOR ein einziges Urteil fällt. */
		let neuerPoint = vorher;
		let ereignis = 'roll';
		if (vorher === null) {
			if (sum === 7 || sum === 11) {
				ereignis = 'natural';
			} else if (sum === 2 || sum === 3 || sum === 12) {
				ereignis = 'craps';
			} else {
				neuerPoint = sum;
				ereignis = 'point-set';
			}
		} else if (sum === vorher) {
			neuerPoint = null;
			ereignis = 'point-made';
		} else if (sum === 7) {
			neuerPoint = null;
			ereignis = 'seven-out';
		}

		/* 2  Die Urteile. */
		const urteile = [];
		const moves = [];
		const cleared = [];

		const gewinnt = (id, ctx) => {
			const einsatz = s(id);
			const gewinn = this.payout(einsatz, this.ratioFor(id, ctx));
			urteile.push({ fieldId: id, staked: einsatz, outcome: 'win', payout: gewinn, returned: einsatz + gewinn, movedTo: null });
			cleared.push(id);
		};
		const verliert = (id) => {
			urteile.push({ fieldId: id, staked: s(id), outcome: 'loss', payout: 0, returned: 0, movedTo: null });
			cleared.push(id);
		};
		const patt = (id) => {
			const einsatz = s(id);
			urteile.push({ fieldId: id, staked: einsatz, outcome: 'push', payout: 0, returned: einsatz, movedTo: null });
			cleared.push(id);
		};
		const bleibt = (id) => {
			urteile.push({ fieldId: id, staked: s(id), outcome: 'stay', payout: 0, returned: 0, movedTo: null });
		};
		const wandert = (id, ziel) => {
			urteile.push({ fieldId: id, staked: s(id), outcome: 'move', payout: 0, returned: 0, movedTo: ziel });
			moves.push({ from: id, to: ziel });
		};

		for (const fieldId of Object.keys(stakes ?? {})) {
			if (s(fieldId) <= 0) {
				continue;
			}

			/* --- Pass Line --- */
			if (fieldId === 'pass') {
				if (vorher === null) {
					if (sum === 7 || sum === 11) { gewinnt(fieldId, {}); }
					else if (sum === 2 || sum === 3 || sum === 12) { verliert(fieldId); }
					else { bleibt(fieldId); }
				} else if (sum === vorher) { gewinnt(fieldId, {}); }
				else if (sum === 7) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Don't Pass, Bar 12 --- */
			if (fieldId === 'dont-pass') {
				if (vorher === null) {
					if (sum === 2 || sum === 3) { gewinnt(fieldId, {}); }
					else if (sum === 7 || sum === 11) { verliert(fieldId); }
					else if (sum === 12) { patt(fieldId); }
					else { bleibt(fieldId); }
				} else if (sum === 7) { gewinnt(fieldId, {}); }
				else if (sum === vorher) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Odds hinter der Linie: gewinnen und verlieren mit ihr --- */
			if (fieldId === 'pass-odds' || fieldId === 'dont-pass-odds') {
				if (vorher === null) { bleibt(fieldId); continue; }
				const dunkel = fieldId === 'dont-pass-odds';
				const gewinnZahl = dunkel ? 7 : vorher;
				const verlustZahl = dunkel ? vorher : 7;
				if (sum === gewinnZahl) { gewinnt(fieldId, { point: vorher }); }
				else if (sum === verlustZahl) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Come und Don't Come: wandern auf ihre Zahl --- */
			if (fieldId === 'come' || fieldId === 'dont-come') {
				if (vorher === null) {
					// Kann nicht vorkommen (mayPlace verhindert es). Die Chips
					// bleiben liegen, statt eine Regel zu erfinden.
					bleibt(fieldId);
					continue;
				}
				const dunkel = fieldId === 'dont-come';
				if (sum === 7 || sum === 11) { if (dunkel) { verliert(fieldId); } else { gewinnt(fieldId, {}); } }
				else if (sum === 2 || sum === 3) { if (dunkel) { gewinnt(fieldId, {}); } else { verliert(fieldId); } }
				else if (sum === 12) { if (dunkel) { patt(fieldId); } else { verliert(fieldId); } }
				else { wandert(fieldId, dunkel ? `dont-come-${sum}` : `come-${sum}`); }
				continue;
			}
			/* --- Die Come-Zahlen und ihre Odds --- */
			const zahl = /^(dont-)?come(-odds)?-(\d+)$/.exec(fieldId);
			if (zahl !== null) {
				const dunkel = zahl[1] === 'dont-';
				const n = Number(zahl[3]);
				const gewinnZahl = dunkel ? 7 : n;
				const verlustZahl = dunkel ? n : 7;
				if (sum === gewinnZahl) { gewinnt(fieldId, { point: n }); }
				else if (sum === verlustZahl) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Place-Wetten --- */
			const platz = /^place-(\d+)$/.exec(fieldId);
			if (platz !== null) {
				const n = Number(platz[1]);
				const arbeitet = vorher !== null && placeWorking === true;
				if (!arbeitet) { bleibt(fieldId); }
				else if (sum === n) { gewinnt(fieldId, {}); }
				else if (sum === 7) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Field: eine Einmalwette --- */
			if (fieldId === 'field') {
				if ([2, 3, 4, 9, 10, 11, 12].includes(sum)) { gewinnt(fieldId, { sum }); }
				else { verliert(fieldId); }
				continue;
			}
			/* --- Hardways: die Zahl als Doppel vor der einfachen Zahl und vor der 7 --- */
			const hardway = /^hard-(\d+)$/.exec(fieldId);
			if (hardway !== null) {
				const n = Number(hardway[1]);
				if (sum === n && hart) { gewinnt(fieldId, {}); }
				else if (sum === n || sum === 7) { verliert(fieldId); }
				else { bleibt(fieldId); }
				continue;
			}
			/* --- Die Einmalwetten der Mitte --- */
			const einmal = {
				'any-seven': (w) => w === 7,
				'any-craps': (w) => w === 2 || w === 3 || w === 12,
				two: (w) => w === 2,
				three: (w) => w === 3,
				eleven: (w) => w === 11,
				twelve: (w) => w === 12,
				// C & E gewinnt auf VIER Summen, aber mit ZWEI verschiedenen
				// Quoten. Deshalb steht sie hier in der Tabelle (damit sie
				// nie 'stay' wird) und bekommt zusätzlich unten den
				// Zusammenhang { sum } mitgegeben — genau wie „field".
				'craps-eleven': (w) => w === 2 || w === 3 || w === 11 || w === 12,
			}[fieldId];
			if (typeof einmal === 'function') {
				// { sum } schadet den sechs quotenfesten Einmalwetten nicht
				// (ratioFor beachtet sum bei ihnen gar nicht) und ist für
				// craps-eleven zwingend: ohne sum bekäme die 11 die
				// Craps-Quote 3 zu 1 statt ihrer 7 zu 1.
				if (einmal(sum)) { gewinnt(fieldId, { sum }); } else { verliert(fieldId); }
				continue;
			}
			// Eine Kennung, die diese Datei nicht kennt, wird NICHT stillschweigend
			// verloren gegeben: sie bleibt liegen und fällt beim nächsten
			// Abgleich der Feldlisten auf.
			bleibt(fieldId);
		}

		/* 3  Summen und Zustandswechsel. */
		let total = 0;
		let ausgezahlt = 0;
		for (const u of urteile) {
			if (u.outcome === 'win' || u.outcome === 'loss' || u.outcome === 'push') {
				total += u.staked;
				ausgezahlt += u.returned;
			}
		}
		this.pointValue = neuerPoint;

		return {
			sum, faces: [...faces], hard: hart,
			point: neuerPoint, previousPoint: vorher, event: ereignis,
			fields: urteile, moves, cleared,
			total, payout: ausgezahlt,
		};
	}

	/** Momentaufnahme — für Prüfskripte und für Teil D. */
	snapshot() {
		return { point: this.pointValue };
	}

	/** Der Gegenweg zu snapshot(). */
	restore(snapshot) {
		this.pointValue = snapshot?.point ?? null;
	}
}

export default CrapsWagers;
