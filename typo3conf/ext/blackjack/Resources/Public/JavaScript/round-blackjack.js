/**
 * Blackjack – Der Ablauf einer Runde und der starre Geber
 * ==========================================================
 *
 * WARUM ES DIESE DATEI GIBT
 * -----------------------------
 * Die Auswertung einer Hand ist die Stelle, an der Geld bewegt wird, und sie
 * muss nachweisbar richtig sein. Läge sie im Einstiegsmodul (das Elemente im
 * Dokument sucht), könnte kein Nachweis sie erreichen — ein Prüfskript müsste
 * den Ablauf NACHBAUEN und prüfte dann seine eigene Nachbildung statt des
 * Spiels. Genau diese Fehlerklasse hat dieses Projekt schon zweimal Geld
 * gekostet (siehe verify-round.mjs, Kopfkommentar). Deshalb liegt die
 * Rundenlogik in dieser EIGENEN, DOKUMENT- und IMPORTFREIEN Datei — dieselbe
 * Bauart wie round-roulette.js beim Roulette.
 *
 * KEIN IMPORT. Alles, was diese Datei braucht, wird ihr EINGESPEIST:
 * new BlackjackRound({ rules, shoe }). rules ist rules-blackjack.js als
 * Ganzes, shoe eine Instanz von Shoe (shoe.js) oder — im Nachweis — ein
 * Objekt, das nur draw() nachbildet (Plan Abschnitt 4, Festlegung 3). Weil
 * diese Datei keine einzige Regelzahl selbst kennen KANN, ist Festlegung 2
 * hier nicht nur behauptet, sondern erzwungen.
 *
 * KEIN DOKUMENT. Node lädt diese Datei unmittelbar, ohne die Import-Map von
 * TYPO3 zu kennen — dieselbe Zusage wie bei rules-blackjack.js und shoe.js.
 *
 * WAS DIESE DATEI IN PHASE C4 AUSDRÜCKLICH NOCH NICHT TUT
 * -------------------------------------------------------------
 * Sie fasst KEIN Geld an. Sie RECHNET aus, was zurückgeht, und legt es in
 * einen Bericht (report); das Verbuchen gegen den Buy-in
 * (bank.payout(returned, sweptStake)) verdrahtet Phase C5, genau wie beim
 * Roulette. staked (alles, was auf dem Tisch lag) und returned (alles, was
 * zurückkommt) werden deshalb GETRENNT geführt und nie zu einer Zahl
 * zusammengezogen — sie zusammenzuziehen ist der klassische Weg, wie in einer
 * Verrechnung ein Betrag doppelt oder gar nicht ankommt (table-buyin.js beim
 * Roulette hält das ausdrücklich fest).
 *
 * SIE MISCHT NIE. shuffle() wird in dieser Datei an KEINER Stelle aufgerufen.
 * Der statische Helfer shouldReshuffle(shoe) fragt den Schlitten nur, OB
 * gemischt werden muss (er leitet lediglich an shoe.needsShuffle weiter);
 * WANN gemischt wird, entscheidet die Aufruferin (ab Phase C5, ausschließlich
 * ZWISCHEN zwei begin()-Aufrufen). Diese Trennung ist die Zusage aus C.7.3,
 * dass der Zähler ausschließlich den Mischzeitpunkt steuert — siehe
 * Prüfung Q-12 in verify-round.mjs.
 *
 * DER STARRE GEBER — EIN EINZIGER AUFRUF, KEIN ZWEITER PFAD
 * ---------------------------------------------------------------
 * Die einzige Stelle im ganzen Gerät, an der der Geber eine Entscheidung
 * trifft, ist _playDealer(): eine Schleife
 * "while (rules.dealerMustDraw(rules.handTotal(karten))) { ziehen }". Diese
 * Datei liest dabei NICHTS außer den gezogenen Kartenrängen — insbesondere
 * fragt sie nie shoe.running, shoe.runningCount oder shoe.trueCount ab (die
 * Zahlenwerte des Zählers). Der Zähler ist hier schlicht nicht erreichbar,
 * weil diese Datei ihn nirgends liest. Q-9 in verify-round.mjs weist das am
 * echten Spiel nach, zusätzlich zum vollständigen Nachweis R-4 in
 * verify-rules.mjs (Zustandsabschluss über alle erreichbaren Geberlagen).
 *
 * Ausnahme, die keine ist (Plan Abschnitt 4.4): sind ALLE Blätter des
 * Spielers überkauft, deckt der Geber auf und zieht NICHT — es gibt nichts
 * mehr zu schlagen, und das Ergebnis änderte sich durch weiteres Ziehen
 * ohnehin nicht. Das ist keine Abweichung vom Zieh-Schema, sondern das Ende
 * der Runde VOR dem Schema; dealer.playedOut ist in diesem Fall false, weil
 * das Schema gar nicht erst befragt wurde. dealer.playedOut ist ebenso false,
 * wenn der Geber schon beim Aufdecken (peek) einen Blackjack hat — auch dann
 * wurde das Zieh-Schema nie befragt. In jedem anderen Fall ist playedOut
 * true, UNABHÄNGIG davon, ob das Schema am Ende null oder mehrere Karten
 * gezogen hat: "das Schema wurde befragt und hat entschieden" ist die
 * Aussage, nicht "es wurde tatsächlich gezogen".
 *
 * DER ABLAUF NACH ANHANG G, SCHRITT FÜR SCHRITT (Plan Abschnitt 4.4)
 * -----------------------------------------------------------------------
 *   1  begin(stake) lehnt einen unzulässigen Einsatz ab, BEVOR eine Karte den
 *      Schlitten verlässt. Eine abgelehnte Runde verändert nichts, auch
 *      nicht den Zähler des Schlittens.
 *   2  Vier Karten, in der Reihenfolge des echten Tisches: Spieler, Geber
 *      (offen), Spieler, Geber (verdeckt).
 *   3  Zeigt der Geber ein Ass, wird die Versicherung angeboten
 *      (state === 'versicherung').
 *   4  Zeigt der Geber ein Ass ODER einen Zehner, prüft er SOFORT auf
 *      Blackjack — nach der Versicherungsentscheidung, aber VOR jeder
 *      Spielerhandlung. Hat er ihn, endet die Runde sofort (siehe
 *      _settleDealerBlackjack()): alle Blätter verlieren, nur ein Blackjack
 *      des Spielers ist ein Patt, die Versicherung zahlt 2:1.
 *   5  state === 'spieler': der Spieler handelt Blatt für Blatt.
 *      legalActions() liefert je nach Lage 'hit', 'stand', 'double', 'split'
 *      — NIE 'surrender' (Anhang G: kein Aufgeben). act('surrender') wird
 *      IMMER abgewiesen, unabhängig vom Zustand — nicht stillschweigend
 *      ignoriert.
 *   6  state === 'geber': der Geber deckt auf und zieht nach Schema (siehe
 *      oben).
 *   7  Auswertung und Auszahlung in den Bericht (report), siehe
 *      _settleRound().
 *
 * TEILEN, VERDOPPELN, VERSICHERUNG — ALLES AUS rules.HOUSE
 * -----------------------------------------------------------------
 * - Verdoppeln auf jedes Blatt aus genau zwei Karten, auch nach dem Teilen
 *   (rules.HOUSE.doubleAfterSplit). Es legt genau den bisherigen Einsatz
 *   dieses Blattes noch einmal nach (hand.stake verdoppelt sich) und gibt
 *   genau eine weitere Karte; danach steht das Blatt.
 * - Teilen nur bei rules.isSplittablePair(a, b) — nach WERT, weshalb Zehn und
 *   Bube ein teilbares Paar sind. Höchstens rules.HOUSE.splitMax = 3
 *   Teilungen, also höchstens rules.HOUSE.handsMax = 4 Blätter; ein weiterer
 *   Versuch wird ABGEWIESEN, nicht ignoriert. Jedes neue Blatt bekommt sofort
 *   eine weitere Karte, damit beide Blätter unmittelbar aus zwei Karten
 *   bestehen (Voraussetzung für ein sofortiges Verdoppeln nach dem Teilen).
 * - Geteilte Asse (rules.HOUSE.splitAcesOneCard) bekommen GENAU DIESE eine
 *   automatisch nachgelegte Karte und werden sofort als fertig markiert:
 *   kein Hit, kein weiteres Teilen (rules.HOUSE.resplitAces === false), kein
 *   Verdoppeln. Ein Ass mit einer Zehnerkarte nach dem Teilen ist 21, KEIN
 *   Blackjack (rules.HOUSE.splitAceTenIsNotBlackjack), und zahlt wie jede
 *   gewonnene Hand 1:1 — das gilt in dieser Datei für JEDES aus einer Teilung
 *   entstandene Blatt, nicht nur für Ass+Zehner (siehe der Kopfkommentar von
 *   isBlackjack() in rules-blackjack.js: "insbesondere" Ass+Zehner, nicht
 *   ausschließlich).
 * - Versicherung zahlt 2:1 auf den eingesetzten Betrag (rules.insuranceReturn
 *   gibt das Dreifache zurück, Einsatz eingeschlossen); sie wird SOFORT nach
 *   der Spielerentscheidung ausgewertet (_afterInsuranceDecision()), nicht
 *   erst am Rundenende — unabhängig davon, wie die Runde weiterläuft.
 * - Teilen und Verdoppeln brauchen Geld: legalActions({ available }) blendet
 *   'split' und 'double' aus, wenn der übergebene verfügbare Betrag nicht
 *   reicht. In Phase C4 ist available standardmäßig unbegrenzt (Infinity);
 *   ab Phase C5 reicht das Einstiegsmodul den tatsächlichen Buy-in herein.
 *   act() selbst prüft KEIN Guthaben (es bekommt keins übergeben) — es prüft
 *   ausschließlich die STRUKTURELLEN Regeln (Kartenzahl, Teilbarkeit,
 *   Teilungslimit), unabhängig von legalActions().
 *
 * WARUM EIN NATÜRLICHER BLACKJACK NICHT ANGERÜHRT WIRD
 * ---------------------------------------------------------
 * Anhang G sagt nicht ausdrücklich, was mit einem Blackjack des Spielers
 * geschieht, wenn der Geber KEINEN hat — weltweit üblich (und die einzige mit
 * "Blackjack zahlt 3:2" verträgliche Lesart) ist: die Hand steht fest, sie
 * wird nicht mehr angerührt. legalActions() liefert für ein ungeteiltes,
 * genau zweikartiges Blatt mit Summe 21 ausschließlich ['stand'] — kein Hit
 * (ein Hit könnte die 21 zerstören, was sinnlos und am echten Tisch nicht
 * vorgesehen ist), kein Verdoppeln, kein Teilen. act() weist 'hit' und
 * 'double' auf einem solchen Blatt zusätzlich strukturell ab, unabhängig
 * davon, ob die Aufruferin legalActions() vorher befragt hat. Diese
 * Festlegung wandert nach DECISIONS.md.
 *
 * DER BERICHT (report) — ERST IM ZUSTAND 'fertig', UND DANACH UNVERÄNDERLICH
 * -------------------------------------------------------------------------------
 * report ist null, solange die Runde nicht 'fertig' ist. Ist sie fertig, wird
 * der Bericht GENAU EINMAL berechnet, zwischengespeichert (this._report) und
 * mit Object.freeze eingefroren — jeder weitere Lesezugriff liefert exakt
 * denselben, bereits berechneten Bericht zurück. Das ist die Absicherung
 * gegen ein zweites Einlösen: diese Datei bucht selbst kein Geld, aber sie
 * garantiert, dass ein zweiter, dritter oder hundertster Lesezugriff auf
 * report NIE eine andere Zahl liefert als der erste — eine Aufruferin, die
 * versehentlich zweimal ausliest und zweimal an die Bank weiterreicht, würde
 * zweimal denselben (bereits feststehenden) Betrag weiterreichen, niemals
 * einen wachsenden. Ein neuer begin()-Aufruf setzt this._report auf null und
 * berechnet für die NEUE Runde einen neuen, unabhängigen Bericht; der alte,
 * eingefrorene Bericht bleibt für eine Aufruferin, die ihn noch hält,
 * unverändert gültig. Q-11 in verify-round.mjs prüft die Bilanz jeder
 * einzelnen Runde und die Unveränderlichkeit über mehrfaches Lesen.
 *
 * begin() DARF AUS 'bereit' UND AUS 'fertig' GERUFEN WERDEN — EIGENE
 * FESTLEGUNG, NICHT WÖRTLICH IM PLAN
 * -------------------------------------------------------------------------
 * Der Plan nennt keine eigene reset()-Methode, ein Tisch spielt aber
 * ununterbrochen viele Runden hintereinander. 'bereit' ist der Zustand vor
 * der allerersten Runde; 'fertig' ist der Zustand nach jeder abgeschlossenen
 * Runde — beide sind gleichermaßen "bereit für die nächste Runde". begin()
 * lehnt deshalb NUR einen Aufruf MITTEN in einer laufenden Runde ab
 * ('versicherung', 'spieler', 'geber'), niemals aus 'bereit' oder 'fertig'.
 * Entscheidung siehe DECISIONS.md.
 */

export class BlackjackRound {
	/**
	 * @param {{rules: Object, shoe: {draw: function(): {rank: string, suit: string}}}} teile
	 *   rules  das Regelmodul (rules-blackjack.js), als GANZES eingespeist
	 *   shoe   der Kartenschlitten (shoe.js: Shoe) oder, im Nachweis, ein
	 *          Objekt, das nur draw() nachbildet
	 */
	constructor({ rules, shoe } = {}) {
		if (rules === null || typeof rules !== 'object') {
			throw new TypeError('BlackjackRound braucht "rules": new BlackjackRound({ rules, shoe }).');
		}
		if (shoe === null || typeof shoe !== 'object' || typeof shoe.draw !== 'function') {
			throw new TypeError('BlackjackRound braucht "shoe": ein Objekt mit draw().');
		}
		this.rules = rules;
		this.shoe = shoe;

		/** @type {'bereit'|'versicherung'|'spieler'|'geber'|'fertig'} */
		this._state = 'bereit';
		/** @type {Array<{cards: Array, stake: number, doubled: boolean, fromSplit: boolean, fromSplitAce: boolean, done: boolean, outcome: ?string, returned: ?number}>} */
		this._hands = [];
		/** @type {Array<{rank: string, suit: string}>} */
		this._dealerCards = [];
		this._dealerPlayedOut = false;
		this._insurance = { staked: 0, returned: 0 };
		this._initialStake = null;
		this._splitsPerformed = 0;
		this._report = null;
	}

	/** @returns {'bereit'|'versicherung'|'spieler'|'geber'|'fertig'} */
	get state() {
		return this._state;
	}

	/**
	 * Schritt 1 und 2 aus Anhang G: Einsatz prüfen, dann austeilen.
	 *
	 * Darf aus 'bereit' oder 'fertig' gerufen werden (siehe Kopfkommentar);
	 * ein Aufruf mitten in einer laufenden Runde wird abgewiesen.
	 *
	 * @param {number} stake der Grundeinsatz
	 * @returns {{ok: true, state: string}|{ok: false, reason: 'state'|'stake'}}
	 */
	begin(stake) {
		if (this._state !== 'bereit' && this._state !== 'fertig') {
			return { ok: false, reason: 'state' };
		}
		if (!this.rules.isLegalStake(stake)) {
			return { ok: false, reason: 'stake' };
		}

		this._hands = [];
		this._dealerCards = [];
		this._dealerPlayedOut = false;
		this._insurance = { staked: 0, returned: 0 };
		this._initialStake = stake;
		this._splitsPerformed = 0;
		this._report = null;

		// Reihenfolge des echten Tisches: Spieler, Geber (offen), Spieler, Geber (verdeckt).
		const p1 = this.shoe.draw();
		const d1 = this.shoe.draw();
		const p2 = this.shoe.draw();
		const d2 = this.shoe.draw();
		this._dealerCards = [d1, d2];
		this._hands = [this._neueHand([p1, p2], stake, false, false)];

		if (this.rules.isAce(d1.rank)) {
			this._state = 'versicherung';
		} else {
			this._afterInsuranceDecision();
		}
		return { ok: true, state: this._state };
	}

	/**
	 * @param {Array<{rank: string, suit: string}>} cards
	 * @param {number} stake
	 * @param {boolean} fromSplit
	 * @param {boolean} fromSplitAce
	 * @returns {{cards: Array, stake: number, doubled: boolean, fromSplit: boolean, fromSplitAce: boolean, done: boolean, outcome: ?string, returned: ?number}}
	 */
	_neueHand(cards, stake, fromSplit, fromSplitAce) {
		return {
			cards,
			stake,
			doubled: false,
			fromSplit,
			fromSplitAce,
			done: fromSplitAce, // geteilte Asse sind sofort fertig, siehe Kopfkommentar
			outcome: null,
			returned: null,
		};
	}

	/**
	 * Schritt 3: nur bei sichtbarem Ass angeboten.
	 * @returns {{insurance: boolean}}
	 */
	get offers() {
		return { insurance: this._state === 'versicherung' };
	}

	/**
	 * Schritt 3, Annahme der Versicherung.
	 * @param {number} amount ganzzahlig, 1 bis rules.insuranceMax(initialStake)
	 * @returns {{ok: true, state: string}|{ok: false, reason: 'state'|'amount'}}
	 */
	takeInsurance(amount) {
		if (this._state !== 'versicherung') {
			return { ok: false, reason: 'state' };
		}
		const max = this.rules.insuranceMax(this._initialStake);
		if (!Number.isInteger(amount) || amount < 1 || amount > max) {
			return { ok: false, reason: 'amount' };
		}
		this._insurance.staked = amount;
		this._afterInsuranceDecision();
		return { ok: true, state: this._state };
	}

	/**
	 * Schritt 3, Ablehnung der Versicherung.
	 * @returns {{ok: true, state: string}|{ok: false, reason: 'state'}}
	 */
	declineInsurance() {
		if (this._state !== 'versicherung') {
			return { ok: false, reason: 'state' };
		}
		this._insurance.staked = 0;
		this._afterInsuranceDecision();
		return { ok: true, state: this._state };
	}

	/**
	 * Schritt 4: die sofortige Blackjack-Prüfung des Gebers, ausgeführt
	 * unmittelbar nach der Versicherungsentscheidung (oder, ohne sichtbares
	 * Ass, unmittelbar nach dem Austeilen) und VOR jeder Spielerhandlung.
	 * Wertet in derselben Bewegung eine offene Versicherung aus — das
	 * Ergebnis der Versicherung hängt an nichts, was danach noch passiert.
	 */
	_afterInsuranceDecision() {
		const upcard = this._dealerCards[0];
		const peekBerechtigt = this.rules.isAce(upcard.rank) || this.rules.isTenValue(upcard.rank);
		const dealerHatBlackjack = peekBerechtigt && this.rules.isBlackjack(this._dealerCards.map((c) => c.rank));

		this._insurance.returned = dealerHatBlackjack
			? this.rules.insuranceReturn(this._insurance.staked)
			: 0;

		if (dealerHatBlackjack) {
			this._settleDealerBlackjack();
		} else {
			this._state = 'spieler';
		}
	}

	/**
	 * Schritt 4, Geber-Blackjack: die Runde endet SOFORT. Alle Blätter
	 * verlieren, außer der Spieler hat selbst einen Blackjack — dann ist es
	 * ein Patt. Vor jeder Spielerhandlung, deshalb gibt es in diesem
	 * Augenblick immer genau ein Blatt (noch keine Teilung möglich).
	 */
	_settleDealerBlackjack() {
		const hand = this._hands[0];
		const spielerHatBlackjack = this.rules.isBlackjack(hand.cards.map((c) => c.rank));
		hand.outcome = spielerHatBlackjack ? 'push' : 'lose';
		hand.returned = spielerHatBlackjack ? this.rules.pushReturn(hand.stake) : this.rules.loseReturn();
		hand.done = true;
		this._dealerPlayedOut = false; // das Schema wurde nie befragt
		this._state = 'fertig';
	}

	/**
	 * @returns {?{cards: Array, stake: number, doubled: boolean, fromSplit: boolean, fromSplitAce: boolean, done: boolean, outcome: ?string, returned: ?number}}
	 *   das erste noch nicht fertige Blatt, oder null, wenn alle fertig sind
	 */
	_currentHand() {
		return this._hands.find((h) => !h.done) ?? null;
	}

	/**
	 * Schritt 5: welche Handlungen sind auf dem aktiven Blatt gerade erlaubt?
	 * NIE 'surrender' — Anhang G kennt kein Aufgeben, es fehlt hier nicht nur
	 * zufällig, es gehört nicht zur Liste möglicher Rückgaben.
	 *
	 * @param {{available?: number}} [options] available: verfügbares Guthaben
	 *   für Verdoppeln/Teilen; unbegrenzt, wenn nicht angegeben (Phase C4)
	 * @returns {Array<'hit'|'stand'|'double'|'split'>}
	 */
	legalActions(options) {
		if (this._state !== 'spieler') {
			return [];
		}
		const hand = this._currentHand();
		if (!hand) {
			return [];
		}
		const { available = Infinity } = options ?? {};
		const ranks = hand.cards.map((c) => c.rank);

		if (hand.fromSplitAce) {
			// Unerreichbar unter normalem Ablauf: geteilte Asse sind bereits
			// bei ihrer Entstehung als fertig markiert (siehe _neueHand()) und
			// werden von _currentHand() deshalb nie zurückgegeben. Diese
			// Zeile ist ausschließlich defensiv.
			return [];
		}

		if (hand.cards.length === 2 && !hand.fromSplit && this.rules.isBlackjack(ranks)) {
			// Ein natürlicher Blackjack wird nicht angerührt (siehe Kopfkommentar).
			return ['stand'];
		}

		const actions = ['hit', 'stand'];
		if (hand.cards.length === 2) {
			if ((!hand.fromSplit || this.rules.HOUSE.doubleAfterSplit) && available >= hand.stake) {
				actions.push('double');
			}
			if (
				this._splitsPerformed < this.rules.HOUSE.splitMax
				&& this._hands.length < this.rules.HOUSE.handsMax
				&& this.rules.isSplittablePair(ranks[0], ranks[1])
				&& available >= hand.stake
			) {
				actions.push('split');
			}
		}
		return actions;
	}

	/**
	 * Schritt 5: eine Spielerhandlung auf dem aktiven Blatt.
	 *
	 * 'surrender' wird IMMER abgewiesen, unabhängig vom Zustand — Anhang G
	 * kennt kein Aufgeben. Jede andere Handlung wird abgewiesen, wenn sie
	 * strukturell nicht zulässig ist (falscher Zustand, kein aktives Blatt,
	 * falsche Kartenzahl, kein teilbares Paar, Teilungslimit erreicht,
	 * natürlicher Blackjack) — unabhängig davon, ob legalActions() vorher
	 * befragt wurde.
	 *
	 * @param {'hit'|'stand'|'double'|'split'|'surrender'} action
	 * @returns {{ok: true}|{ok: false, reason: string}}
	 */
	act(action) {
		if (action === 'surrender') {
			return { ok: false, reason: 'unsupported' };
		}
		if (this._state !== 'spieler') {
			return { ok: false, reason: 'state' };
		}
		const hand = this._currentHand();
		if (!hand) {
			return { ok: false, reason: 'state' };
		}

		let result;
		switch (action) {
			case 'hit':
				result = this._hit(hand);
				break;
			case 'stand':
				result = this._stand(hand);
				break;
			case 'double':
				result = this._doubleAction(hand);
				break;
			case 'split':
				result = this._splitAction(hand);
				break;
			default:
				return { ok: false, reason: 'unknown' };
		}

		if (result.ok) {
			this._maybeAdvanceToDealer();
		}
		return result;
	}

	/** @param {Object} hand @returns {{ok: true}|{ok: false, reason: string}} */
	_hit(hand) {
		if (hand.fromSplitAce) {
			return { ok: false, reason: 'illegal' };
		}
		if (!hand.fromSplit && hand.cards.length === 2 && this.rules.isBlackjack(hand.cards.map((c) => c.rank))) {
			return { ok: false, reason: 'illegal' };
		}
		hand.cards.push(this.shoe.draw());
		if (this.rules.handTotal(hand.cards.map((c) => c.rank)).busted) {
			hand.done = true;
		}
		return { ok: true };
	}

	/** @param {Object} hand @returns {{ok: true}} */
	_stand(hand) {
		hand.done = true;
		return { ok: true };
	}

	/** @param {Object} hand @returns {{ok: true}|{ok: false, reason: string}} */
	_doubleAction(hand) {
		if (hand.cards.length !== 2) {
			return { ok: false, reason: 'illegal' };
		}
		if (hand.fromSplitAce) {
			return { ok: false, reason: 'illegal' };
		}
		if (hand.fromSplit && !this.rules.HOUSE.doubleAfterSplit) {
			return { ok: false, reason: 'illegal' };
		}
		if (!hand.fromSplit && this.rules.isBlackjack(hand.cards.map((c) => c.rank))) {
			return { ok: false, reason: 'illegal' };
		}
		hand.stake += hand.stake; // legt genau den bisherigen Einsatz dieses Blattes noch einmal nach
		hand.doubled = true;
		hand.cards.push(this.shoe.draw());
		hand.done = true;
		return { ok: true };
	}

	/** @param {Object} hand @returns {{ok: true}|{ok: false, reason: string}} */
	_splitAction(hand) {
		if (hand.cards.length !== 2) {
			return { ok: false, reason: 'illegal' };
		}
		if (hand.fromSplitAce) {
			return { ok: false, reason: 'illegal' };
		}
		if (!this.rules.isSplittablePair(hand.cards[0].rank, hand.cards[1].rank)) {
			return { ok: false, reason: 'illegal' };
		}
		if (this._splitsPerformed >= this.rules.HOUSE.splitMax || this._hands.length >= this.rules.HOUSE.handsMax) {
			return { ok: false, reason: 'splitLimit' };
		}

		const istAssPaar = this.rules.isAce(hand.cards[0].rank) && this.rules.isAce(hand.cards[1].rank);
		const idx = this._hands.indexOf(hand);
		const handA = this._neueHand([hand.cards[0], this.shoe.draw()], hand.stake, true, istAssPaar);
		const handB = this._neueHand([hand.cards[1], this.shoe.draw()], hand.stake, true, istAssPaar);
		this._hands.splice(idx, 1, handA, handB);
		this._splitsPerformed++;
		return { ok: true };
	}

	/** Zwischen Spielerhandlungen: sind alle Blätter fertig, ist der Geber dran. */
	_maybeAdvanceToDealer() {
		if (this._currentHand() === null) {
			this._playDealer();
		}
	}

	/**
	 * Schritt 6: der starre Geber. Siehe Kopfkommentar für die Ausnahme, die
	 * keine ist (alle Spielerblätter überkauft ⇒ kein Ziehen).
	 */
	_playDealer() {
		this._state = 'geber';
		const alleUeberkauft = this._hands.every(
			(h) => this.rules.handTotal(h.cards.map((c) => c.rank)).busted,
		);
		if (alleUeberkauft) {
			this._dealerPlayedOut = false;
		} else {
			let hand = this.rules.handTotal(this._dealerCards.map((c) => c.rank));
			while (this.rules.dealerMustDraw(hand)) {
				this._dealerCards.push(this.shoe.draw());
				hand = this.rules.handTotal(this._dealerCards.map((c) => c.rank));
			}
			this._dealerPlayedOut = true;
		}
		this._settleRound();
	}

	/**
	 * Schritt 7: Auswertung. Ein natürlicher (ungeteilter, zweikartiger)
	 * Blackjack schlägt jede Nicht-Blackjack-21 des Gebers, unabhängig davon,
	 * mit wie vielen Karten der Geber sie erreicht hat — deshalb wird dieser
	 * Fall VOR dem Summenvergleich behandelt, nicht durch ihn.
	 */
	_settleRound() {
		const dealerRanks = this._dealerCards.map((c) => c.rank);
		const dealerHand = this.rules.handTotal(dealerRanks);

		for (const hand of this._hands) {
			const ranks = hand.cards.map((c) => c.rank);
			const total = this.rules.handTotal(ranks);
			const istNatuerlicherBlackjack = !hand.fromSplit && this.rules.isBlackjack(ranks);

			if (total.busted) {
				hand.outcome = 'bust';
				hand.returned = this.rules.loseReturn();
			} else if (istNatuerlicherBlackjack) {
				hand.outcome = 'blackjack';
				hand.returned = this.rules.blackjackReturn(hand.stake);
			} else if (dealerHand.busted || total.total > dealerHand.total) {
				hand.outcome = 'win';
				hand.returned = this.rules.winReturn(hand.stake);
			} else if (total.total === dealerHand.total) {
				hand.outcome = 'push';
				hand.returned = this.rules.pushReturn(hand.stake);
			} else {
				hand.outcome = 'lose';
				hand.returned = this.rules.loseReturn();
			}
			hand.done = true;
		}
		this._state = 'fertig';
	}

	/**
	 * Die Blätter des Spielers, offen einsehbar — während des Spiels UND nach
	 * Rundenende. outcome/returned bleiben null, bis die Runde 'fertig' ist.
	 * @returns {Array<{cards: Array, stake: number, doubled: boolean, fromSplit: boolean, fromSplitAce: boolean, total: number, soft: boolean, busted: boolean, outcome: ?string, returned: ?number}>}
	 */
	get hands() {
		return this._hands.map((h) => {
			const total = this.rules.handTotal(h.cards.map((c) => c.rank));
			return {
				cards: h.cards.slice(),
				stake: h.stake,
				doubled: h.doubled,
				fromSplit: h.fromSplit,
				fromSplitAce: h.fromSplitAce,
				total: total.total,
				soft: total.soft,
				busted: total.busted,
				outcome: h.outcome,
				returned: h.returned,
			};
		});
	}

	/**
	 * Der Geber. cards enthält immer BEIDE Karten (auch die verdeckte) — diese
	 * Datei kennt kein Dokument und keine Anzeige; WAS davon sichtbar
	 * gerendert wird, entscheidet ausschließlich die Ansicht (ab Phase C5),
	 * nie diese Klasse.
	 * @returns {{upcard: ?Object, cards: Array, total: number, soft: boolean, busted: boolean, blackjack: boolean, playedOut: boolean}}
	 */
	get dealer() {
		const ranks = this._dealerCards.map((c) => c.rank);
		const total = this.rules.handTotal(ranks);
		return {
			upcard: this._dealerCards[0] ?? null,
			cards: this._dealerCards.slice(),
			total: total.total,
			soft: total.soft,
			busted: total.busted,
			blackjack: this._dealerCards.length === 2 && this.rules.isBlackjack(ranks),
			playedOut: this._dealerPlayedOut,
		};
	}

	/**
	 * Schritt 7, als abschließende Zahlengrundlage — erst im Zustand
	 * 'fertig', davor null. Wird GENAU EINMAL berechnet und danach
	 * eingefroren (siehe Kopfkommentar, "kein zweites Einlösen").
	 *
	 * @returns {?{
	 *   initialStake: number,
	 *   hands: Array,
	 *   insurance: {staked: number, returned: number},
	 *   dealer: Object,
	 *   staked: number,
	 *   returned: number,
	 *   net: number
	 * }}
	 */
	get report() {
		if (this._state !== 'fertig') {
			return null;
		}
		if (this._report) {
			return this._report;
		}
		const hands = this.hands;
		const dealer = this.dealer;
		const staked = hands.reduce((summe, h) => summe + h.stake, 0) + this._insurance.staked;
		const returned = hands.reduce((summe, h) => summe + h.returned, 0) + this._insurance.returned;

		this._report = Object.freeze({
			initialStake: this._initialStake,
			hands: Object.freeze(hands.map((h) => Object.freeze(h))),
			insurance: Object.freeze({ staked: this._insurance.staked, returned: this._insurance.returned }),
			dealer: Object.freeze(dealer),
			staked,
			returned,
			net: returned - staked,
		});
		return this._report;
	}

	/**
	 * Fragt AUSSCHLIESSLICH den Schlitten, ob vor der nächsten Runde gemischt
	 * werden muss — wird NIE aus dieser Klasse selbst heraus aufgerufen. Die
	 * Aufruferin (ab Phase C5) ruft dies NUR zwischen zwei begin()-Aufrufen
	 * und mischt gegebenenfalls selbst (shoe.shuffle()), nie diese Klasse.
	 *
	 * @param {{needsShuffle: boolean}} shoe
	 * @returns {boolean}
	 */
	static shouldReshuffle(shoe) {
		return shoe.needsShuffle;
	}
}

export default BlackjackRound;
