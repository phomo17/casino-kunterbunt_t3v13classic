/**
 * Roulette – der Ablauf einer Runde
 * ==================================
 *
 * WARUM ES DIESE DATEI GIBT — DIE WICHTIGSTE ENTSCHEIDUNG DIESES STÜCKS
 * -----------------------------------------------------------------------
 * Die Auswertung einer Runde ist die Stelle, an der Geld bewegt wird. Sie muss
 * nachweisbar richtig sein. Läge sie in roulette.js, könnte kein Nachweis sie
 * erreichen: roulette.js fasst das Dokument an (document.querySelector), und
 * Node hat kein Dokument. Ein Prüfskript müsste die Abläufe dann NACHBAUEN —
 * und prüfte damit seine eigene Nachbildung, nicht das Spiel. Genau diese
 * Fehlerklasse hat das Projekt am letzten Gerät zweimal Geld gekostet (siehe
 * verify-round.mjs, Kopfkommentar).
 *
 * Deshalb liegt die Rundenlogik in dieser EIGENEN, DOKUMENTFREIEN und
 * IMPORTFREIEN Datei. roulette.js bleibt reine Verdrahtung: es sucht die
 * Elemente, holt die Texte aus den data-Attributen und reicht Rückrufe herein.
 * Der Nachweis (verify-round.mjs) rechnet mit DIESER Datei — dieselbe Regel,
 * die CONCEPT.md C.5.3 schon für die Physik aufstellt, und dieselbe Bauart wie
 * table-bets.js neben table-felt.js. Prüfung V-14 (verify-view.mjs) hält im
 * Gegenzug fest, dass roulette.js keine der hier liegenden Entscheidungen mehr
 * selbst trifft (kein settle(, kein sweep(, kein payout(, kein .lock()/.unlock()).
 *
 * KEIN IMPORT. Alles, was diese Datei braucht, wird ihr übergeben: die
 * Setzfläche, die Bank, das Zustandswerk, die Radansicht, die Farbfunktion,
 * eine Wartefunktion, die Rückrufe. Sie kann kein Gerät und keinen Speicher
 * erreichen, weil ihr nichts gegeben wird, womit sie eines erreichen könnte.
 *
 * KEIN DOKUMENT. Node lädt diese Datei unmittelbar, ohne die Import-Map von
 * TYPO3 zu kennen — dieselbe Zusage wie bei wheel-physics.js und
 * bets-roulette.js.
 *
 * WIE DER RUNDENAUSLÖSER AUF DIESE DATEI TRIFFT
 * ------------------------------------------------
 * start() wird von roulette.js aus dem Klick auf den Auslöser der geteilten
 * Bedienleiste gerufen (über den onGo-Rückruf von connectControls()). Sie
 * lehnt zwei Dinge ab, BEVOR irgendetwas gesperrt wird:
 *
 *   'state'    eine Runde läuft schon — der zweite Klick auf den Auslöser,
 *              bevor der erste durch ist, ist kein Fehler, sondern der
 *              häufigste Fall überhaupt (siehe table-round.js, "WARUM DIE
 *              MASCHINE NICHT WIRFT").
 *   'nostake'  EIGENE FESTLEGUNG (DECISIONS.md): eine Runde ohne einen
 *              einzigen Chip auf dem Tuch ist an einem echten Tisch keine
 *              Runde. Ohne diese Absage könnte man das Rad beliebig oft leer
 *              drehen lassen, und der Verlaufsstreifen füllte sich mit
 *              Ergebnissen, auf die nie jemand gesetzt hat. Sie steht bewusst
 *              VOR dem Sperren — eine abgelehnte Runde verändert nichts.
 *
 * DIE SIEBEN SCHRITTE VON settleAt() — DIE REIHENFOLGE IST BINDEND
 * ---------------------------------------------------------------
 *   1  round.resolve(result)                      'laeuft'    → 'auswerten'
 *   2  bets.settle(label)                          RECHNET, räumt nicht ab
 *   3  round.pay(report)                           'auswerten' → 'auszahlen'
 *   4  wait(settleDelayMs)                         die gewinnenden Stapel
 *                                                   bleiben sichtbar
 *   5  bank.payout(report.payout, report.total)    das Geld wandert
 *   6  bets.sweep()                                die Chips kommen vom Tuch,
 *                                                   repeat() merkt sie sich
 *   7  bets.unlock() + round.finish()              'auszahlen' → 'setzen'
 *
 * Schritt 4 zwischen Rechnung (2) und Abräumen (6) ist genau der Grund, warum
 * table-bets.js settle() und sweep() trennt (siehe dessen Dateikopf).
 *
 * WARUM bank.payout(report.payout, report.total) UND NICHT EINE ZAHL
 * ----------------------------------------------------------------------
 * table-buyin.js verlangt beide Größen getrennt: "returned" ist, was
 * gutgeschrieben wird, "sweptStake" ist, was vom Tuch genommen und NICHT
 * zurückgegeben wird. Sie in eine Zahl zusammenzuziehen ist der klassische
 * Weg, wie in einer Verrechnung ein Betrag doppelt oder gar nicht ankommt —
 * der Dateikopf von table-buyin.js sagt das ausdrücklich. In
 * BetTable.settle() heißt die Summe aller Rückgaben "payout" und die Summe
 * aller Einsätze "total"; die Zuordnung ist also payout → returned,
 * total → sweptStake (dieselbe Festlegung wie schon in table-bets.js
 * dokumentiert).
 *
 * WARUM wait() EINGESPEIST WIRD
 * --------------------------------
 * Ein setTimeout im Prüfskript machte den Nachweis langsam und zeitabhängig.
 * Der Browser übergibt eine echte Wartefunktion (roulette.js), der Nachweis
 * eine, die sofort zurückkommt. Die RECHNUNG ist in beiden Fällen dieselbe —
 * genau das verlangt CONCEPT.md C.5.3.
 *
 * BEWEGUNGSDROSSELUNG
 * --------------------
 * settleDelayMs wird von roulette.js auf 0 gesetzt, wenn
 * matchMedia('(prefers-reduced-motion: reduce)') greift. Diese Datei
 * entscheidet das nicht selbst — sie kennt keinen Browser und keine
 * Media Query.
 *
 * WIE DER ZUSTANDSWECHSEL AM WURZELELEMENT ANKOMMT — EIGENE ENTSCHEIDUNG
 * --------------------------------------------------------------------------
 * table-round.js (TableRound) meldet jeden Zustandswechsel über GENAU EINEN
 * Zuhörer: die Option onEnter, die beim Anlegen übergeben wird. roulette.js
 * baut aber round (das Zustandswerk) VOR game (diese Klasse) — an der Stelle,
 * an der round entsteht, gibt es also noch kein game, dem onEnter etwas
 * melden könnte.
 *
 * Diese Klasse löst das, indem sie round.onEnter ERST HIER, in ihrem eigenen
 * Konstruktor, auf sich selbst umbiegt und jeden Wechsel an den optionalen
 * Rückruf onState weiterreicht. roulette.js kann round deshalb ohne eigene
 * onEnter-Option anlegen (oder mit einer, die hier ohnehin überschrieben
 * wird) — die Verdrahtung des Zustandswechsels ist damit vollständig Sache
 * dieser Datei und nicht auf eine bestimmte Baureihenfolge in roulette.js
 * angewiesen. Das ist eine eigene Festlegung (im Plan nicht Zeile für Zeile
 * ausformuliert) und dokumentiert in DECISIONS.md.
 *
 * Der allererste Übergang (nach 'setzen', beim Anlegen von TableRound) hat
 * dabei keinen Zuhörer gesehen — das ist gewollt, denn genau dieser
 * Anfangszustand steht bereits unveränderlich im ausgelieferten Markup
 * (Table.html: data-ro-state="setzen" data-ro-result="" data-ro-colour=""
 * data-ro-total="0").
 */

export class RouletteRound {
	/**
	 * @param {{
	 *   round: {state: string, lock: function, run: function, resolve: function,
	 *           pay: function, finish: function, abort: function, onEnter?: ?function},
	 *   bets:  {open: boolean, total: number, lock: function, unlock: function,
	 *           settle: function, sweep: function},
	 *   bank:  {amount: number, payout: function},
	 *   wheel: {launch: function},
	 *   colourOf: function(string): string,
	 *   wait: function(number): Promise<void>,
	 *   settleDelayMs?: number,
	 *   onState?:   function({state: string, previous: ?string}): void,
	 *   onResult?:  function({label: string, colour: string, report: Object,
	 *                         credited: number, staked: number}): void,
	 *   onAbort?:   function({reason: string}): void,
	 *   onRefresh?: function(): void
	 * }} parts
	 * @throws {TypeError} wenn ein Pflichtstück fehlt
	 */
	constructor(parts) {
		const {
			round, bets, bank, wheel,
			colourOf, wait,
			settleDelayMs = 0,
			onState = null,
			onResult = null,
			onAbort = null,
			onRefresh = null,
		} = parts ?? {};

		for (const [name, wert] of [['round', round], ['bets', bets], ['bank', bank], ['wheel', wheel]]) {
			if (wert === null || typeof wert !== 'object') {
				throw new TypeError(`RouletteRound braucht "${name}": new RouletteRound({ round, bets, bank, wheel, colourOf, wait }).`);
			}
		}
		if (typeof colourOf !== 'function') {
			throw new TypeError('RouletteRound braucht "colourOf": function(label) => "red"|"black"|"green".');
		}
		if (typeof wait !== 'function') {
			throw new TypeError('RouletteRound braucht "wait": function(ms) => Promise<void>.');
		}

		this.round = round;
		this.bets = bets;
		this.bank = bank;
		this.wheel = wheel;
		this.colourOf = colourOf;
		this.wait = wait;
		this.settleDelayMs = Number.isFinite(settleDelayMs) && settleDelayMs >= 0 ? settleDelayMs : 0;
		this.onState = typeof onState === 'function' ? onState : null;
		this.onResult = typeof onResult === 'function' ? onResult : null;
		this.onAbort = typeof onAbort === 'function' ? onAbort : null;
		this.onRefresh = typeof onRefresh === 'function' ? onRefresh : null;

		// Siehe Dateikopf, "WIE DER ZUSTANDSWECHSEL AM WURZELELEMENT ANKOMMT":
		// diese Klasse ist ab jetzt der einzige Zuhörer von round.
		this.round.onEnter = (detail) => {
			if (this.onState) {
				this.onState({ state: detail.state, previous: detail.previous });
			}
		};
	}

	/**
	 * Der Rundenauslöser wurde gedrückt.
	 *
	 * @returns {{ok: true}|{ok: false, reason: 'state'|'nostake'|'wheel'}}
	 */
	start() {
		if (this.round.state !== 'setzen') {
			return { ok: false, reason: 'state' };
		}
		if (this.bets.total <= 0) {
			return { ok: false, reason: 'nostake' };
		}
		this.bets.lock();          // 1. das Tuch nimmt nichts mehr an
		this.round.lock();         // 2. 'setzen'  → 'gesperrt'
		this.round.run();          // 3. 'gesperrt' → 'laeuft'
		if (this.onRefresh) {
			this.onRefresh();      //    aria-disabled an allen Feldern nachführen
		}
		// Behebung Review C3, M6: launch() liefert false zurück, wenn die
		// Ansicht keinen echten Rad-Anschluss herstellen konnte (fehlendes
		// [data-ro-head]/[data-ro-ball] im Markup — connectWheel() liefert
		// dann einen Platzhalter mit launch: () => false). Ohne diese Prüfung
		// bliebe die Runde für immer in 'laeuft' stehen: onRest() käme nie,
		// die Chips blieben liegen und gesperrt, CASH OUT bliebe blockiert —
		// eingesperrtes Geld ohne Ausgang. abort() ist der einzige vorgesehene
		// Weg zurück nach 'setzen' aus jedem Zustand.
		if (this.wheel.launch() === false) {
			this.round.abort('launch');
			this.bets.unlock();
			if (this.onRefresh) {
				this.onRefresh();
			}
			return { ok: false, reason: 'wheel' };
		}
		return { ok: true };
	}

	/**
	 * Die Kugel liegt. Wird von der Ansicht GENAU EINMAL je Lauf gerufen, über
	 * die Brücke onRest() → labelOf() → settleAt() in roulette.js.
	 *
	 * @param {string} label die Fachbeschriftung, '0' | '00' | '1' … '36'
	 * @returns {Promise<{ok: boolean}>}
	 */
	async settleAt(label) {
		const colour = this.colourOf(label);
		const result = { label, colour };

		this.round.resolve(result);                          // 1
		const report = this.bets.settle(label);               // 2
		this.round.pay(report);                                // 3

		await this.wait(this.settleDelayMs);                   // 4

		const payoutResult = await this.bank.payout(report.payout, report.total); // 5

		if (!payoutResult || payoutResult.ok !== true) {
			// Behebung Review C3, M8: die Bank wurde zwischen Rundenstart und
			// Auszahlung geschlossen (z. B. pagehide während die Kugel noch
			// lief — siehe DECISIONS.md, ob das künftig anders laufen soll).
			// bank.payout() bucht in diesem Fall NICHTS gut. Vorher lief
			// trotzdem sweep()/unlock()/finish() weiter und onResult() sagte
			// eine gewöhnliche Verlustrunde an — ein Gewinn verschwand damit
			// spurlos, ohne dass irgendetwas das anzeigte.
			//
			// Jetzt: kein sweep() (die Chips bleiben als Aufzeichnung sichtbar
			// liegen, bis die Seite neu lädt), kein unlock() (das Tuch bleibt
			// GESPERRT — dieselbe Bank kann auf dieser Seite nicht neu
			// geöffnet werden, ein wieder freigegebenes Tuch würde einen
			// Tisch vortäuschen, der noch spielt). round.abort() bringt den
			// Rundenautomaten zurück nach "setzen" (der einzige vorgesehene
			// Weg aus jedem Zustand, wie schon in start() bei M6) — roulette.js
			// hebt darauf reflexhaft aria-disabled am Auslöser auf; der eigene
			// onAbort()-Rückruf unten setzt es unmittelbar danach wieder, denn
			// die Runde bleibt für diese Seite endgültig zu Ende.
			this.round.abort('closed');
			if (this.onAbort) {
				this.onAbort({ reason: 'closed' });
			}
			if (this.onRefresh) {
				this.onRefresh();
			}
			return { ok: false, reason: 'closed' };
		}

		const credited = payoutResult.credited;

		this.bets.sweep();                                      // 6
		this.bets.unlock();                                     // 7a
		this.round.finish();                                    // 7b

		if (this.onResult) {
			this.onResult({ label, colour, report, credited, staked: report.total });
		}
		if (this.onRefresh) {
			this.onRefresh();
		}

		return { ok: true };
	}
}

export default RouletteRound;
