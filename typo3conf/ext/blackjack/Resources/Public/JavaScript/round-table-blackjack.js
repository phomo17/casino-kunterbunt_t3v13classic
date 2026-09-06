/**
 * Blackjack – die Runde am Tisch: Ablauf, Geld, Auszahlung
 * =========================================================
 *
 * Die Klammer zwischen drei Dingen, die einander nicht kennen:
 *   TableRound      das Zustandswerk des Tisches (casino_startpage)
 *   BlackjackRound  die Rundenlogik des Spiels (Phase C4)
 *   TableBank/BetTable   das Geld (casino_startpage)
 *
 * KEIN IMPORT, KEIN DOKUMENT. Node lädt diese Datei unmittelbar
 * (verify-table.mjs), damit der Nachweis mit dem ECHTEN Ablauf rechnet statt
 * mit einer Nachbildung — dieselbe Zusage und derselbe Grund wie bei
 * round-blackjack.js und round-roulette.js. Alles wird hereingereicht.
 *
 * SIE ZEICHNET NICHTS. Was auf dem Bildschirm passiert, entscheidet
 * view-blackjack.js; diese Datei meldet nur, DASS sich etwas geändert hat
 * (onRound), und WAS am Ende herauskam (onResult).
 *
 * SIE KENNT KEINE SPIELREGEL. Mindest- und Höchsteinsatz, der Anteil der
 * Versicherung, die Zahl der erlaubten Teilungen: alles kommt aus dem
 * hereingereichten Regelmodul (rules-blackjack.js). In dieser Datei steht
 * keine Regelzahl (Prüfung A-11).
 *
 * DER MISCHZEITPUNKT. Gemischt wird AUSSCHLIESSLICH hier, in deal(), VOR dem
 * Austeilen und damit zwischen zwei Runden — nie mitten in einer Hand
 * (CONCEPT.md C.7.3; round-blackjack.js ruft shuffle() an keiner Stelle
 * selbst). Ob gemischt werden muss, beantwortet allein der Schlitten
 * (shouldReshuffle); WARUM er es sagt (Trennkarte oder Zähler), wird für den
 * Verlaufsstreifen weitergereicht, aber dem Spieler nicht begründet — genau
 * wie am echten Tisch.
 *
 * GELD NACHLEGEN MITTEN IN DER RUNDE — das eine wirklich neue Stück Mechanik.
 * Der Grundeinsatz wandert über die geteilten Bausteine aufs Tuch. Verdoppeln,
 * Teilen und Versicherung brauchen dagegen einen BETRAG, nicht einen Chip, und
 * der Spieler hat vielleicht keine passenden Chips (er will 3 € versichern und
 * hat nur einen Fünfer). _stakeAmount() legt deshalb abwechselnd den größten
 * PASSENDEN Chip und wechselt, wenn keiner passt, den kleinsten ZU GROSSEN
 * klein (bank.exchangeDown, ändert den Wert des Racks nicht). Dass das immer
 * aufgeht, folgt aus zwei Zusagen des Site Packages: rack.total ===
 * bank.amount, und der kleinste Chip ist 1. Deshalb steht die Prüfung
 * bank.amount >= betrag GANZ VORNE; danach kann der Fall „kein passender und
 * kein zu großer Chip" nicht mehr eintreten.
 *
 * ALLES ODER NICHTS. Schlägt das Nachlegen unterwegs fehl, werden die schon
 * gelegten Chips einzeln zurückgenommen und die Handlung abgelehnt, ohne dass
 * eine Karte den Schlitten verlassen hat. Dieselbe Zusage wie beim Einwerfen
 * und beim Verdoppeln der Setzfläche.
 *
 * DIE BILANZ. Nach jeder Runde gilt zentgenau:
 *     Kasse + Buy-in + liegender Einsatz  =  vorher + report.net
 * Nachgewiesen in verify-table.mjs (T-3), über tausende echt gespielte Runden.
 */

export class BlackjackTable {
	/**
	 * @param {{
	 *   round: Object, game: Object, shoe: Object, bets: Object, bank: Object,
	 *   rules: Object, shouldReshuffle: function(Object): boolean,
	 *   chipValues?: Array<number>,
	 *   wait?: function(number): Promise<void>, settleDelayMs?: number,
	 *   onRound?: function(): void,
	 *   onResult?: function({report: Object, credited: number, staked: number}): void,
	 *   onReshuffle?: function(string): void,
	 *   onAbort?: function(): void,
	 *   onRefresh?: function(): void
	 * }} teile
	 * @throws {TypeError} wenn eines der fünf Pflichtstücke fehlt
	 */
	constructor({
		round, game, shoe, bets, bank, rules, shouldReshuffle,
		chipValues = [],
		wait = null, settleDelayMs = 0,
		onRound = null, onResult = null, onReshuffle = null,
		onAbort = null, onRefresh = null,
	} = {}) {
		for (const [name, wert] of [['round', round], ['game', game], ['shoe', shoe], ['bets', bets], ['bank', bank], ['rules', rules]]) {
			if (wert === null || typeof wert !== 'object') {
				throw new TypeError(`BlackjackTable braucht "${name}": new BlackjackTable({ round, game, shoe, bets, bank, rules, shouldReshuffle }).`);
			}
		}
		if (typeof shouldReshuffle !== 'function') {
			throw new TypeError('BlackjackTable braucht "shouldReshuffle": function(shoe) => boolean.');
		}

		this.round = round;
		this.game = game;
		this.shoe = shoe;
		this.bets = bets;
		this.bank = bank;
		this.rules = rules;
		this.shouldReshuffle = shouldReshuffle;
		this.chipValues = Array.isArray(chipValues) ? chipValues : [];
		this.wait = typeof wait === 'function' ? wait : null;
		this.settleDelayMs = Number.isFinite(settleDelayMs) && settleDelayMs >= 0 ? settleDelayMs : 0;
		this.onRound = typeof onRound === 'function' ? onRound : null;
		this.onResult = typeof onResult === 'function' ? onResult : null;
		this.onReshuffle = typeof onReshuffle === 'function' ? onReshuffle : null;
		this.onAbort = typeof onAbort === 'function' ? onAbort : null;
		this.onRefresh = typeof onRefresh === 'function' ? onRefresh : null;

		/** Der Grundeinsatz der laufenden Runde. 0, solange keine läuft. */
		this._grundeinsatz = 0;
		/** Bereits nachgelegte Beträge (Verdoppeln/Teilen), zur Nachvollziehbarkeit. */
		this._nachgelegt = [];
		/** Was in der laufenden Runde als Versicherung nachgelegt wurde. */
		this._versichert = 0;

		// Dieselbe Bauart wie bei RouletteRound (DECISIONS.md, C3d): diese
		// Klasse biegt round.onEnter ERST HIER, in ihrem eigenen Konstruktor,
		// auf sich selbst um. blackjack.js legt round deshalb OHNE eigene
		// onEnter-Option an.
		this.round.onEnter = (detail) => {
			this.onRound?.(detail);
		};
	}

	/** Der Zustand des SPIELS ('bereit'|'versicherung'|'spieler'|'geber'|'fertig'). */
	get state() {
		return this.game.state;
	}

	/** Was gerade legal ist — mit dem tatsächlich verfügbaren Buy-in als Schranke. */
	legalActions() {
		return this.game.legalActions({ available: this.bank.amount });
	}

	/** Der Betrag, den die Versicherung kostet: der halbe Grundeinsatz (Regel). */
	get insuranceCost() {
		return this.rules.insuranceMax(this._grundeinsatz);
	}

	/** Liegt ein legaler Einsatz auf dem Setzkreis? */
	get stakeIsLegal() {
		return this.rules.isLegalStake(this.bets.total);
	}

	/** Der Grundeinsatz der laufenden (oder zuletzt gespielten) Runde. */
	get baseStake() {
		return this._grundeinsatz ?? 0;
	}

	/**
	 * Was in der laufenden Runde bereits als Versicherung nachgelegt wurde —
	 * live lesbar, auch während die Runde noch läuft (anders als
	 * game.report, das erst im Zustand 'fertig' existiert). Gesetzt in
	 * takeInsurance(), zurückgesetzt in deal().
	 */
	get insuranceStaked() {
		return this._versichert;
	}

	/**
	 * Der Rundenbeginn.
	 * @returns {Promise<{ok: true, state: string}|{ok: false, reason: 'state'|'stake'}>}
	 */
	async deal() {
		if (this.round.state !== 'setzen') {
			return { ok: false, reason: 'state' };
		}
		const stake = this.bets.total;
		if (!this.rules.isLegalStake(stake)) {
			return { ok: false, reason: 'stake' };
		}

		// Mischen, falls nötig — HIER und NUR HIER, vor dem Austeilen und
		// damit zwischen zwei Runden (CONCEPT.md C.7.3).
		if (this.shouldReshuffle(this.shoe)) {
			const grund = this.shoe.shuffleReason;
			this.shoe.shuffle();
			this.onReshuffle?.(grund);
		}

		this.round.lock();
		this.bets.lock();
		this.round.run();

		this._grundeinsatz = stake;
		this._nachgelegt = [];
		this._versichert = 0;

		const begonnen = this.game.begin(stake);
		if (!begonnen.ok) {
			// Kann nach der isLegalStake()-Prüfung oben nur ein Programmierfehler
			// sein — trotzdem sauber zurückgerollt, statt den Tisch in einem
			// halb gesperrten Zustand stehen zu lassen.
			this.bets.unlock();
			this.round.abort('deal');
			return begonnen;
		}

		this.onRound?.();

		if (this.game.state === 'fertig') {
			// Geber-Blackjack oder Spieler-Blackjack ohne Treffer des Gebers:
			// die Runde endet ohne jede Spielerhandlung.
			await this._finish();
		}

		return { ok: true, state: this.game.state };
	}

	/**
	 * Die Versicherung annehmen — IMMER der volle halbe Einsatz, keine Wahl
	 * (siehe Dateikopf des Plans: an einem echten Tisch trifft niemand eine
	 * andere Wahl).
	 * @returns {Promise<{ok: true, amount: number}|{ok: false, reason: string}>}
	 */
	async takeInsurance() {
		if (!this.game.offers.insurance) {
			return { ok: false, reason: 'state' };
		}
		const betrag = this.insuranceCost;
		const gelegt = await this._stakeAmount(betrag);
		if (!gelegt.ok) {
			return { ok: false, reason: 'nocash' };
		}
		const antwort = this.game.takeInsurance(betrag);
		if (!antwort.ok) {
			await this._unstake(gelegt.placed);
			return antwort;
		}
		this._versichert = betrag;
		this.onRound?.();
		if (this.game.state === 'fertig') {
			await this._finish();
		}
		return { ok: true, amount: betrag };
	}

	/**
	 * Die Versicherung ablehnen.
	 * @returns {Promise<{ok: true, state: string}|{ok: false, reason: string}>}
	 */
	async declineInsurance() {
		const antwort = this.game.declineInsurance();
		if (!antwort.ok) {
			return antwort;
		}
		this.onRound?.();
		if (this.game.state === 'fertig') {
			await this._finish();
		}
		return antwort;
	}

	/**
	 * Eine Spielerhandlung. 'double' und 'split' legen zuerst den nötigen
	 * Betrag nach (_stakeAmount) — schlägt das fehl, geschieht am Spiel
	 * selbst nichts.
	 * @param {'hit'|'stand'|'double'|'split'} action
	 * @returns {Promise<{ok: true}|{ok: false, reason: string}>}
	 */
	async act(action) {
		if (this.game.state !== 'spieler') {
			return { ok: false, reason: 'state' };
		}
		const braucht = (action === 'double' || action === 'split');
		let gelegt = { ok: true, placed: [] };
		if (braucht) {
			gelegt = await this._stakeAmount(this._aktiverEinsatz());
			if (!gelegt.ok) {
				return { ok: false, reason: 'nocash' };
			}
		}
		const antwort = this.game.act(action);
		if (!antwort.ok) {
			if (braucht) {
				await this._unstake(gelegt.placed);
			}
			return antwort;
		}
		this.onRound?.();
		if (this.game.state === 'fertig') {
			await this._finish();
		}
		return antwort;
	}

	/**
	 * Der Einsatz des aktiven Blattes — das erste noch nicht fertige Blatt.
	 * round-blackjack.js bietet dafür keinen öffentlichen Zugriff auf
	 * _currentHand(); der Einsatz ist aber über hands sichtbar. Weil hands
	 * eine Kopie ist, wird die Reihenfolge benutzt: das aktive Blatt ist das
	 * erste, das noch nicht überkauft und noch nicht ausgewertet ist.
	 *
	 * ANMERKUNG: dies ist der einzige Punkt, an dem diese Datei etwas über
	 * die innere Reihenfolge von round-blackjack.js annimmt. Prüfung T-6 und
	 * T-7 in verify-table.mjs weisen die Herleitung am echten Spiel nach.
	 * Fällt eine der beiden durch, war die Annahme falsch — dann bekommt
	 * round-blackjack.js einen öffentlichen Getter currentHand, und DAS ist
	 * der Ausweg, nicht eine Schätzung hier.
	 * @returns {number}
	 */
	_aktiverEinsatz() {
		const blaetter = this.game.hands;
		for (const blatt of blaetter) {
			if (blatt.outcome === null && !blatt.busted && blatt.total <= 21) {
				return blatt.stake;
			}
		}
		return this._grundeinsatz;
	}

	/**
	 * Auswertung und Auszahlung — die eine Stelle mit Geld.
	 * @returns {Promise<void>}
	 */
	async _finish() {
		const report = this.game.report; // eingefroren, mehrfach lesbar
		this.round.resolve(report); // → 'auswerten'
		this.round.pay(report); // → 'auszahlen'
		if (this.settleDelayMs > 0 && typeof this.wait === 'function') {
			await this.wait(this.settleDelayMs); // die Stapel bleiben kurz stehen
		}
		this.bets.sweep(); // die Chips vom Setzkreis nehmen — bewegt kein Geld
		const gebucht = await this.bank.payout(report.returned, report.staked);
		if (gebucht.ok !== true) {
			// Bank bereits geschlossen (pagehide während die Hand lief).
			this.round.abort('closed');
			this.onAbort?.();
			return;
		}
		this.bets.unlock();
		this.round.finish(); // → 'setzen'
		this.onResult?.({ report, credited: gebucht.credited, staked: report.staked });
		this.onRefresh?.();
	}

	/**
	 * Legt genau `betrag` Euro auf den Tisch nach — für Verdoppeln, Teilen und
	 * Versicherung, wenn im Rack kein einzelner passender Chip liegt.
	 * ALLES ODER NICHTS: schlägt es unterwegs fehl, werden die schon gelegten
	 * Chips einzeln zurückgenommen.
	 * @param {number} betrag
	 * @returns {Promise<{ok: true, placed: Array<number>}|{ok: false, reason: string, placed: Array<number>}>}
	 */
	async _stakeAmount(betrag) {
		if (!Number.isInteger(betrag) || betrag < 1) {
			return { ok: false, reason: 'amount', placed: [] };
		}
		if (this.bank.amount < betrag) {
			return { ok: false, reason: 'nocash', placed: [] };
		}
		const placed = [];
		let rest = betrag;
		let notbremse = 0;
		while (rest > 0) {
			if (++notbremse > 5000) {
				console.error('[blackjack] round-table-blackjack.js: Nachlegen kommt nicht zum Ende.');
				break;
			}
			const passend = this._groesstenPassenden(rest);
			if (passend === 0) {
				const zuGross = this._kleinstenUeber(rest);
				if (zuGross === 0) {
					break;
				}
				this.bank.exchangeDown(zuGross);
				continue;
			}
			const antwort = await this.bank.placeChip(passend);
			if (antwort.ok !== true) {
				break;
			}
			placed.push(passend);
			rest -= passend;
		}
		if (rest !== 0) {
			await this._unstake(placed);
			return { ok: false, reason: 'nocash', placed: [] };
		}
		return { ok: true, placed };
	}

	/** Der größte Chipwert, der im Rack liegt und nicht größer als `rest` ist. */
	_groesstenPassenden(rest) {
		for (const wert of this.chipValues) { // absteigend, wie vom Aufrufer übergeben
			if (wert <= rest && this.bank.canPlace(wert)) {
				return wert;
			}
		}
		return 0;
	}

	/** Der kleinste Chipwert, der im Rack liegt und größer als `rest` ist. */
	_kleinstenUeber(rest) {
		for (let i = this.chipValues.length - 1; i >= 0; i -= 1) {
			const wert = this.chipValues[i];
			if (wert > rest && this.bank.canPlace(wert)) {
				return wert;
			}
		}
		return 0;
	}

	/** Nimmt genau die eben gelegten Chips wieder zurück, in umgekehrter Folge. */
	async _unstake(placed) {
		for (const wert of [...placed].reverse()) {
			await this.bank.returnChip(wert);
		}
	}
}

export default BlackjackTable;
