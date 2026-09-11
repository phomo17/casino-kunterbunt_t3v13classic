/**
 * Blackjack – die Tischfolge einer Lobby-Runde (CONCEPT.md D.10.4, D.10.6)
 * =========================================================================
 *
 * KEIN IMPORT, KEIN DOKUMENT. Schlitten, Regelmodul und Geber werden
 * eingespeist. verify-lobby-blackjack.mjs rechnet mit DIESER Datei.
 *
 * DIE AUFGABE IN EINEM SATZ: aus der Saat des Servers und dem Zugprotokoll
 * des Servers dieselbe Kartenfolge erzeugen wie in jedem anderen Browser —
 * und dabei genau die Karten, die dem EIGENEN Platz zustehen, an die
 * vorhandene Rundenlogik (BlackjackRound) durchreichen.
 *
 * DIE AUSTEILFOLGE, wie am echten Tisch:
 *   1. Runde: Platz 1, Platz 2, … , Geber (offen)
 *   2. Runde: Platz 1, Platz 2, … , Geber (verdeckt)
 * Danach wird der Reihe nach gefragt; jede gezogene Karte kommt aus demselben
 * Schlitten, in der Reihenfolge des Protokolls.
 *
 * DIE EINE OFFENGELEGTE ABWEICHUNG — DIE KARTEN DES GEBERS
 * --------------------------------------------------------
 * Zieht der Geber am Ende nach, nimmt er die nächsten Karten des Schlittens —
 * also solche, deren Lage davon abhängt, wie oft die Plätze vorher gezogen
 * haben. Das ist am echten Tisch so und wäre auch hier richtig, ABER:
 * BlackjackRound spielt den Geber SOFORT aus, sobald das eigene Blatt fertig
 * ist (_maybeAdvanceToDealer()), also womöglich lange bevor die anderen
 * Plätze entschieden haben. Dieser Browser zöge die Geberkarten dann zu
 * früh — und bekäme andere als ein Browser, der länger gewartet hat.
 *
 * Deshalb zieht der Geber seine NACHKARTEN aus dem ENDE des Schlittens
 * (Position 311 abwärts), das zu Rundenbeginn feststeht. Seine beiden ersten
 * Karten kommen regulär aus der Austeilfolge. Damit ist sein Blatt in jedem
 * Browser gleich, unabhängig davon, wann er es ausrechnet. Der Preis: die
 * Nachkarten des Gebers hängen nicht mehr davon ab, wie viele Karten die
 * Plätze gezogen haben. Auf die Quote hat das keinen Einfluss — der Schlitten
 * ist gemischt, eine Karte vom Ende ist so zufällig wie eine von vorn —, wohl
 * aber auf das Kartenzählen. Das steht in der README, bei den übrigen
 * offengelegten Grenzen.
 *
 * DIE ZWEITE OFFENGELEGTE ABWEICHUNG — DIE VERSICHERUNG
 * -----------------------------------------------------
 * Am echten Tisch wird die Versicherung ALLEN zugleich angeboten, bevor
 * gespielt wird. Hier wird sie jedem Platz als erste Frage SEINES Zuges
 * gestellt (Buchstaben 'i' und 'n' im Protokoll). Grund: eine zusätzliche
 * Tischphase bräuchte eine fünfte Uhr und einen fünften Zustand für einen
 * Nebenfall. Auf das Geld hat es keinen Einfluss — die Versicherung ist eine
 * Einzelwette gegen den Geber und hängt von keinem anderen Platz ab.
 *
 * WER MITTENDRIN GEHT: sein Platz verschwindet aus dem Stand, seine bisher
 * gezogenen Karten bleiben liegen, sein Protokoll bleibt stehen (es hat die
 * Kartenfolge bereits verschoben und darf nicht rückwirkend verschwinden).
 * Der Server überspringt ihn beim Weiterschalten. Sein Geld ist längst weg
 * (table-buyin.js) — D.10.3, wörtlich.
 */

/** Die Buchstaben des Zugprotokolls und wie viele Karten sie kosten. */
const KARTEN_JE_ZUG = { h: 1, d: 1, p: 2, s: 0, i: 0, n: 0 };

export class LobbyTableSequence {
	/**
	 * @param {{shoe: Object, meinPlatz: number, plaetze: Array<number>}} teile
	 *   shoe       ein FRISCH aus der Saat gemischter Schlitten
	 *   meinPlatz  die eigene Platznummer
	 *   plaetze    alle mitspielenden Platznummern, aufsteigend
	 */
	constructor({ shoe, meinPlatz, plaetze }) {
		this.shoe = shoe;
		this.meinPlatz = meinPlatz;
		this.plaetze = [...plaetze].sort((a, b) => a - b);
		/** Karten je Platz, in Ziehreihenfolge. Für die Rücken der anderen. */
		this.blaetter = new Map(this.plaetze.map((nr) => [nr, []]));
		/** Die zwei ersten Karten des Gebers. */
		this.geber = [];
		/** Wie viele Züge des Protokolls bereits angewendet wurden. */
		this.angewendet = 0;
		/** Die Reserve, aus der der Geber nachzieht: das Ende des Schlittens. */
		this.reserve = [];
	}

	/**
	 * Teilt aus. Danach steht fest, was jeder Platz und was der Geber offen
	 * liegen hat — in jedem Browser dasselbe, weil derselbe Schlitten aus
	 * derselben Saat und dieselbe Platzliste vom Server.
	 *
	 * @returns {{mein: Array<object>, geber: Array<object>}}
	 */
	austeilen() {
		// Die Reserve zuerst abschneiden, damit sie von keiner Ziehung mehr
		// berührt wird. 16 Karten reichen für jedes denkbare Geberblatt
		// (die längste mögliche Hand ist elf Karten).
		this.reserve = this.shoe.cards.slice(-16).reverse();

		for (let durchgang = 0; durchgang < 2; durchgang++) {
			for (const nr of this.plaetze) {
				this.blaetter.get(nr).push(this.shoe.draw());
			}
			this.geber.push(this.shoe.draw());
		}
		return { mein: [...this.blaetter.get(this.meinPlatz)], geber: [...this.geber] };
	}

	/**
	 * Wendet das Zugprotokoll des Servers an, so weit es noch nicht
	 * angewendet ist, und zieht dabei für JEDEN fremden Platz die Karten, die
	 * er genommen hat.
	 *
	 * DIE EIGENEN ZÜGE WERDEN ÜBERSPRUNGEN: ihre Karten hat die eigene
	 * BlackjackRound bereits über den Ersatzschlitten gezogen (siehe
	 * lobby-blackjack.js). Ein zweites Ziehen für denselben Zug verschöbe die
	 * Folge um genau so viele Karten, wie man selbst genommen hat — der
	 * klassische Weg, wie zwei Browser auseinanderlaufen.
	 *
	 * @param {string} moves das vollständige Protokoll, z. B. "1h1s2n2s"
	 * @returns {Array<{platz: number, zug: string}>} die neu angewendeten Züge
	 */
	anwenden(moves) {
		const paare = String(moves ?? '').match(/\d+[hsdpin]/g) ?? [];
		const neue = [];
		for (let i = this.angewendet; i < paare.length; i++) {
			const paar = paare[i];
			const platz = Number(paar.slice(0, -1));
			const zug = paar.slice(-1);
			if (platz !== this.meinPlatz) {
				const anzahl = KARTEN_JE_ZUG[zug] ?? 0;
				for (let k = 0; k < anzahl; k++) {
					this.blaetter.get(platz)?.push(this.shoe.draw());
				}
			}
			neue.push({ platz, zug });
		}
		this.angewendet = paare.length;
		return neue;
	}

	/** Wie viele Karten liegen an diesem Platz? Für die Rücken in der Platzleiste. */
	kartenAm(platz) {
		return this.blaetter.get(platz)?.length ?? 0;
	}

	/**
	 * Die nächste Karte für die EIGENE Hand. Sie kommt aus dem gemeinsamen
	 * Schlitten, weil der eigene Zug an genau dieser Stelle des Protokolls
	 * steht und alle anderen Browser ihn dort ebenfalls anwenden.
	 */
	meineKarte() {
		const karte = this.shoe.draw();
		this.blaetter.get(this.meinPlatz)?.push(karte);
		return karte;
	}

	/** Die nächste NACHkarte des Gebers — aus der Reserve (siehe Dateikopf). */
	geberKarte() {
		if (this.reserve.length === 0) {
			throw new RangeError('Die Geberreserve ist leer — das Blatt ist länger als elf Karten.');
		}
		return this.reserve.pop();
	}
}

export default LobbyTableSequence;
