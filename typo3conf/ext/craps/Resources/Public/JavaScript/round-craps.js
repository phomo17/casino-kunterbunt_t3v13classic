/**
 * Craps – der Ablauf einer Runde (ein Wurf)
 * ==========================================
 *
 * EINE RUNDE IST EIN WURF, NICHT EINE GANZE SERIE
 * -----------------------------------------------
 * Der geteilte Rundenablauf (table-round.js) hat fünf Zustände: setzen →
 * gesperrt → laeuft → auswerten → auszahlen → setzen. Beim Craps entspricht
 * das GENAU EINEM WURF. Zwischen zwei Würfen darf gesetzt werden (Come,
 * Place, Odds) — deshalb kehrt der Ablauf nach jedem Wurf nach „setzen"
 * zurück. Was über den Wurf hinaus lebt, ist der POINT, und der liegt in
 * wagers-craps.js, nicht hier.
 *
 * KEIN IMPORT, KEIN DOKUMENT
 * --------------------------
 * Alles wird übergeben: die Setzfläche, die Bank, das Zustandswerk, der
 * Würfelwerfer, der Wettzustand, eine Wartefunktion, die Rückrufe. Node lädt
 * diese Datei unmittelbar; verify-round.mjs rechnet mit IHR (CONCEPT.md
 * C.5.3). Prüfung V-14 hält im Gegenzug fest, dass craps.js keine der hier
 * liegenden Entscheidungen selbst trifft.
 *
 * DIE ACHT SCHRITTE VON onRest() — DIE REIHENFOLGE IST BINDEND
 * ------------------------------------------------------------
 *   0  ungültiger Wurf  → onInvalid(), Zustand bleibt 'laeuft', ENDE
 *   1  stakesFromBets()                    was liegt gerade wo
 *   2  wagers.resolve(...)                 die Urteile, der neue Point
 *   3  round.resolve(result)               'laeuft'   → 'auswerten'
 *   4  round.pay(report)                   'auswerten' → 'auszahlen'
 *   5  wait(settleDelayMs)                 gewinnende Stapel bleiben sichtbar
 *   6  bank.payout(report.payout, report.total)   das Geld wandert
 *   7  applyReport(report)                 Chips abräumen, wandern, festlegen
 *   8  bets.unlock() + round.finish()      'auszahlen' → 'setzen'
 *
 * Schritt 5 zwischen Rechnung und Abräumen ist der Grund, warum table-bets.js
 * settle() und sweep() überhaupt trennt — hier übernimmt applyReport() beides
 * auf einmal, weil beim Craps NICHT das ganze Tuch abgeräumt wird, sondern
 * nur die aufgelösten Felder.
 *
 * WARUM bank.payout(payout, total) UND NICHT EINE ZAHL
 * ----------------------------------------------------
 * table-buyin.js verlangt beide Größen getrennt: „returned" ist, was
 * gutgeschrieben wird, „sweptStake" ist, was vom Tuch genommen und NICHT
 * zurückgegeben wird. Sie in eine Zahl zusammenzuziehen ist der klassische
 * Weg, wie in einer Verrechnung ein Betrag doppelt oder gar nicht ankommt.
 * Beim Craps ist „total" ausdrücklich NUR die Summe der AUFGELÖSTEN Einsätze
 * — was liegen bleibt, wurde nie vom Tuch genommen.
 *
 * WARUM DIE CHIPS ÜBER restore() BEWEGT WERDEN
 * --------------------------------------------
 * Nach einem Wurf verschwinden manche Chips, andere WANDERN (Come → Come-Zahl),
 * und wieder andere bleiben liegen. Einzelne takeBack()/place()-Aufrufe
 * könnten das nicht: place() ist bei gesperrter Runde abgeriegelt, und
 * takeBack() nimmt immer den obersten Chip. bets.restore() setzt die
 * Platzierungsliste in einem Zug — genau die Aufgabe, für die es
 * ausdrücklich vorgesehen ist (table-bets.js: „Der Gegenweg zu snapshot()").
 */

export class CrapsRound {
	/**
	 * @param {{
	 *   round:  {state: string, lock: function, run: function, resolve: function,
	 *            pay: function, finish: function, abort: function, onEnter?: ?function},
	 *   bets:   {open: boolean, total: number, fields: Map, lock: function, unlock: function,
	 *            stakeOn: function, snapshot: function, restore: function, freeze: function},
	 *   bank:   {amount: number, payout: function},
	 *   dice:   {throw: function(?Array<object>): boolean},
	 *   wagers: {point: ?number, resolve: function, contracts: function},
	 *   wait: function(number): Promise<void>,
	 *   settleDelayMs?: number,
	 *   placeWorking?: function(): boolean,
	 *   onState?:      function({state: string, previous: ?string}): void,
	 *   onThrowStart?: function(): void,
	 *   onInvalid?:    function(): void,
	 *   onResult?:     function({report: Object, credited: number, staked: number}): void,
	 *   onAbort?:      function({reason: string}): void,
	 *   onRefresh?:    function(): void
	 * }} parts
	 * @throws {TypeError} wenn ein Pflichtstück fehlt
	 */
	constructor(parts) {
		const {
			round, bets, bank, dice, wagers, wait,
			settleDelayMs = 0,
			placeWorking = null,
			onState = null, onThrowStart = null, onInvalid = null,
			onResult = null, onAbort = null, onRefresh = null,
		} = parts ?? {};

		for (const [name, wert] of [['round', round], ['bets', bets], ['bank', bank], ['dice', dice], ['wagers', wagers]]) {
			if (wert === null || typeof wert !== 'object') {
				throw new TypeError(`CrapsRound braucht "${name}": new CrapsRound({ round, bets, bank, dice, wagers, wait }).`);
			}
		}
		if (typeof wait !== 'function') {
			throw new TypeError('CrapsRound braucht "wait": function(ms) => Promise<void>.');
		}

		this.round = round;
		this.bets = bets;
		this.bank = bank;
		this.dice = dice;
		this.wagers = wagers;
		this.wait = wait;
		this.settleDelayMs = Number.isFinite(settleDelayMs) && settleDelayMs >= 0 ? settleDelayMs : 0;
		this.placeWorking = typeof placeWorking === 'function' ? placeWorking : () => true;
		this.onState = typeof onState === 'function' ? onState : null;
		this.onThrowStart = typeof onThrowStart === 'function' ? onThrowStart : null;
		this.onInvalid = typeof onInvalid === 'function' ? onInvalid : null;
		this.onResult = typeof onResult === 'function' ? onResult : null;
		this.onAbort = typeof onAbort === 'function' ? onAbort : null;
		this.onRefresh = typeof onRefresh === 'function' ? onRefresh : null;

		// Dieselbe Rückverdrahtung wie bei RouletteRound: craps.js baut das
		// Zustandswerk VOR dieser Klasse, an jener Stelle gibt es also noch
		// niemanden, dem onEnter etwas melden könnte. Ab hier ist diese
		// Klasse der einzige Zuhörer.
		this.round.onEnter = (detail) => {
			if (this.onState) {
				this.onState({ state: detail.state, previous: detail.previous });
			}
		};
	}

	/** Was gerade auf welchem Feld liegt. @returns {Object<string, number>} */
	stakesFromBets() {
		const stand = {};
		for (const id of this.bets.fields.keys()) {
			const wert = this.bets.stakeOn(id);
			if (wert > 0) {
				stand[id] = wert;
			}
		}
		return stand;
	}

	/** Einsatz auf den beiden Linienwetten zusammen. @returns {number} */
	lineStake() {
		return this.bets.stakeOn('pass') + this.bets.stakeOn('dont-pass');
	}

	/**
	 * Darf jetzt geworfen werden?
	 *
	 * Beim Come-out braucht es eine Linienwette — am echten Tisch würfelt
	 * niemand ohne. Ohne diese Bedingung ließe sich der Tisch beliebig oft
	 * leer würfeln, und der Verlaufsstreifen füllte sich mit Würfen, auf die
	 * nie jemand gesetzt hat. Steht dagegen ein Point, MUSS weitergeworfen
	 * werden — er will aufgelöst werden, auch wenn gerade nichts Neues liegt.
	 *
	 * @returns {boolean}
	 */
	mayThrow() {
		if (this.round.state !== 'setzen') {
			return false;
		}
		if (this.wagers.point !== null) {
			return true;
		}
		return this.lineStake() > 0;
	}

	/**
	 * Ein Wurf beginnt: das Tuch wird geschlossen und gewürfelt.
	 * @param {?Array<object>} setup null heißt „alles ziehen"
	 * @returns {{ok: true}|{ok: false, reason: 'state'|'nostake'|'dice'}}
	 */
	start(setup) {
		if (this.round.state !== 'setzen') {
			return { ok: false, reason: 'state' };
		}
		if (!this.mayThrow()) {
			return { ok: false, reason: 'nostake' };
		}
		this.bets.lock();     // 1  das Tuch nimmt nichts mehr an
		this.round.lock();    // 2  'setzen'   → 'gesperrt'
		this.round.run();     // 3  'gesperrt' → 'laeuft'
		if (this.onRefresh) {
			this.onRefresh();  //   aria-disabled an allen Feldern nachführen
		}
		if (this.dice.throw(setup) === false) {
			// Die Ansicht konnte keinen echten Anschluss an die Wanne
			// herstellen. Ohne diesen Zweig bliebe die Runde für immer in
			// 'laeuft' stehen: die Chips blieben liegen und gesperrt, CASH OUT
			// bliebe blockiert — eingesperrtes Geld ohne Ausgang.
			this.round.abort('dice');
			this.bets.unlock();
			if (this.onRefresh) {
				this.onRefresh();
			}
			return { ok: false, reason: 'dice' };
		}
		if (this.onThrowStart) {
			this.onThrowStart();
		}
		return { ok: true };
	}

	/**
	 * Der vorige Wurf war zu kurz (Mindestwurf-Regel, C.8.2): es wird ohne
	 * neuen Zustandswechsel noch einmal geworfen. Das Tuch bleibt gesperrt —
	 * ein ungültiger Wurf ist kein Grund, die Einsätze wieder freizugeben.
	 * @param {?Array<object>} setup
	 * @returns {{ok: true}|{ok: false, reason: 'state'|'dice'}}
	 */
	rethrow(setup) {
		if (this.round.state !== 'laeuft') {
			return { ok: false, reason: 'state' };
		}
		if (this.dice.throw(setup) === false) {
			return { ok: false, reason: 'dice' };
		}
		if (this.onThrowStart) {
			this.onThrowStart();
		}
		return { ok: true };
	}

	/**
	 * Die Würfel liegen. Wird von der Ansicht GENAU EINMAL je Lauf gerufen.
	 * @param {{faces: number[], sum: number, valid: boolean}} ergebnis
	 * @returns {Promise<{ok: boolean, reason?: string}>}
	 */
	async onRest(ergebnis) {
		if (this.round.state !== 'laeuft') {
			return { ok: false, reason: 'state' };
		}
		if (ergebnis.valid !== true) {
			if (this.onInvalid) {
				this.onInvalid();
			}
			return { ok: false, reason: 'short' };
		}

		const stakes = this.stakesFromBets();                                  // 1
		const report = this.wagers.resolve({                                   // 2
			sum: ergebnis.sum,
			faces: ergebnis.faces,
			stakes,
			placeWorking: this.placeWorking() === true,
		});

		this.round.resolve({ sum: ergebnis.sum, faces: ergebnis.faces });      // 3
		this.round.pay(report);                                                // 4

		await this.wait(this.settleDelayMs);                                   // 5

		const gebucht = await this.bank.payout(report.payout, report.total);   // 6
		if (!gebucht || gebucht.ok !== true) {
			// Die Bank wurde zwischen Wurfbeginn und Auszahlung geschlossen
			// (pagehide, während die Würfel noch rollten). Sie bucht dann
			// NICHTS. Kein Abräumen (die Chips bleiben als Aufzeichnung
			// liegen), kein unlock() (ein wieder freigegebenes Tuch täuschte
			// einen Tisch vor, der noch spielt), aber zurück nach 'setzen',
			// weil abort() der einzige Weg aus jedem Zustand ist.
			this.round.abort('closed');
			if (this.onAbort) {
				this.onAbort({ reason: 'closed' });
			}
			if (this.onRefresh) {
				this.onRefresh();
			}
			return { ok: false, reason: 'closed' };
		}

		this.applyReport(report);                                              // 7
		this.bets.unlock();                                                    // 8a
		this.round.finish();                                                   // 8b

		if (this.onResult) {
			this.onResult({ report, credited: gebucht.credited, staked: report.total });
		}
		if (this.onRefresh) {
			this.onRefresh();
		}
		return { ok: true };
	}

	/**
	 * Bringt das Tuch auf den Stand nach dem Wurf: aufgelöste Felder werden
	 * geleert, wandernde Chips wechseln ihr Feld, alles Übrige bleibt liegen.
	 * Anschließend werden die Vertragswetten neu festgelegt.
	 * @param {object} report
	 * @returns {void}
	 */
	applyReport(report) {
		const alt = this.bets.snapshot();
		const geleert = new Set(report.cleared);
		const wandern = new Map(report.moves.map((m) => [m.from, m.to]));

		const neue = [];
		const abgeraeumt = [];
		for (const p of alt.placements) {
			if (geleert.has(p.fieldId)) {
				abgeraeumt.push({ ...p });
				continue;
			}
			neue.push(wandern.has(p.fieldId)
				? { fieldId: wandern.get(p.fieldId), value: p.value }
				: { ...p });
		}

		// Sockel ZUERST löschen und danach neu setzen: ein Point, der gerade
		// gefallen ist, darf seine Pass Line nicht weiter festhalten.
		this.bets.restore({
			locked: true,
			placements: neue,
			lastRound: abgeraeumt.length > 0 ? abgeraeumt : alt.lastRound,
			floors: [],
		});
		for (const [fieldId, betrag] of this.wagers.contracts(this.stakesFromBets())) {
			this.bets.freeze(fieldId, betrag);
		}
	}
}

export default CrapsRound;
