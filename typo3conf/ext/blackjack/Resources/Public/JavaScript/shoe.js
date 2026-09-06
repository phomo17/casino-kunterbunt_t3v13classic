/**
 * Blackjack – Der Kartenschlitten
 * ================================
 *
 * Die 312 Karten in ihrer Reihenfolge, das Mischen, das Ziehen, die
 * Trennkarte und der mitlaufende Hi-Lo-Zähler des Hauses. Dokument- und
 * importfrei; Regelmodul und Zufallsgeber werden EINGESPEIST
 * (new Shoe({ rules, random })), nicht importiert (Plan Abschnitt 4,
 * Festlegung 3) — genau dieselbe Bauart wie new Wheel({ random }) beim
 * Roulette. Weil diese Datei dadurch keine einzige Regelzahl selbst kennen
 * KANN, ist Festlegung 2 („eine einzige Quelle für jede Regel") hier nicht
 * nur behauptet, sondern erzwungen: DECK_COUNT, CUT_INDEX, hiLoTag(),
 * trueCount() und shouldShuffleUp() kommen ausschließlich aus dem
 * eingespeisten rules-blackjack.js.
 *
 * WARUM drawIndex() UND shuffleInPlace() ÖFFENTLICH UND FÜR SICH PRÜFBAR SIND
 * -----------------------------------------------------------------------------
 * Ein schiefes Mischen ist an einem Kartenspiel der schwerste denkbare
 * Fehler: es fällt beim Spielen nicht auf, sieht in keiner einzelnen Runde
 * falsch aus, und macht trotzdem jede Aussage über Quote und Hausvorteil
 * wertlos. Ein Nachweis kann das nur finden, wenn er GENAU diese Funktionen
 * aufruft, nicht eine Nachbildung davon. Deshalb stehen beide als
 * eigenständige, exportierte Funktionen da und nicht versteckt in der
 * Klasse — verify-shoe.mjs (S-4, S-10, S-11) und measure-shuffle.mjs rechnen
 * unmittelbar mit ihnen, mit dem echten Code dieser Datei.
 *
 * WARUM DER ZÄHLER HIER LIEGT UND NICHT IM REGELMODUL
 * -------------------------------------------------------
 * Der laufende und der wahre Zähler ändern sich mit jeder gezogenen Karte und
 * mit jedem Mischen — sie sind ZUSTAND. Die Schwelle, ab der vorzeitig
 * gemischt wird (TRUE_COUNT_SHUFFLE_UP), ist dagegen eine REGEL und liegt in
 * rules-blackjack.js. Dieser Schlitten führt den Zustand; das Regelmodul
 * liefert die reinen Funktionen, mit denen er ausgewertet wird
 * (rules.hiLoTag, rules.trueCount, rules.shouldShuffleUp).
 *
 * DIE ZUSAGE AUS C.7.3, AUSDRÜCKLICH
 * ------------------------------------
 * Dieser Zähler steuert AUSSCHLIESSLICH den ZEITPUNKT des Mischens
 * (needsShuffle/shuffleReason) und NIEMALS eine Spielentscheidung des
 * Gebers: rules-blackjack.js kennt gar keinen Zähler, und dealerMustDraw()
 * liest ausschließlich hand.total (R-12 in verify-rules.mjs weist das nach).
 * Q-9 in verify-round.mjs (Umsetzungsstück C4d) weist es zusätzlich am echten
 * Spiel nach.
 *
 * DER ZÄHLER ZÄHLT JEDE KARTE, DIE DEN SCHLITTEN VERLÄSST — AUCH DIE VERDECKTE
 * -------------------------------------------------------------------------------
 * Ein Mensch am Tisch zählt nur, was aufgedeckt wurde; das Haus kennt seine
 * eigene verdeckte Karte. draw() zählt deshalb bei JEDEM Aufruf, unabhängig
 * davon, ob die gezogene Karte im Spiel offen oder verdeckt liegt — das
 * entscheidet die Runde (round-blackjack.js), nicht dieser Schlitten. Der
 * Unterschied betrifft ausschließlich den oben genannten Mischzeitpunkt und
 * macht eine prüfbare Invariante möglich: über einen vollständig gezogenen
 * Schlitten summiert sich der Hi-Lo-Zähler auf genau null, weil jeder Rang
 * 24-mal vorkommt (6 Decks × 4 Farben) und sich die Hi-Lo-Marken je Rang
 * gegenseitig aufheben (siehe R-8 in verify-rules.mjs und S-7 in
 * verify-shoe.mjs). Entscheidung siehe DECISIONS.md.
 *
 * needsShuffle WIRD NUR ZWISCHEN RUNDEN GEFRAGT
 * ------------------------------------------------
 * Dieser Schlitten sagt nur, OB gemischt werden muss; WANN gefragt wird,
 * entscheidet round-blackjack.js. Diese Trennung ist Voraussetzung für
 * Prüfung Q-12 in verify-round.mjs (Umsetzungsstück C4d).
 */

/**
 * Eine ganze Zahl aus [0, bound) — über das VERWERFUNGSVERFAHREN aus
 * CONCEPT.md C.5.2, nie über eine bloße Restdivision auf den rohen
 * Zufallswert.
 *
 * WARUM VERWERFEN, UND NICHT EINFACH TEILEN
 * 2^32 ist durch die meisten Schranken nicht ohne Rest teilbar. Wer den
 * rohen Wert einfach modulo rechnet, macht die ersten (2^32 mod bound)
 * Ergebnisse um ein Haar wahrscheinlicher als die übrigen — eine
 * Restklassen-Schieflage. Sie ist winzig und genau deshalb gefährlich: ein
 * Nachweis über eine Million Mischungen würde sie nicht finden, aber sie
 * wäre da. Die Schleife unten schneidet den überzähligen Rest ab und zieht
 * neu, bis der Wert im sauber teilbaren Bereich liegt.
 *
 * Der Rest-Operator % steht in dieser gesamten Datei AUSSCHLIESSLICH hier,
 * auf einer bereits verworfenen 32-Bit-Ganzzahl. Prüfung S-5 in
 * verify-shoe.mjs hält das fest.
 *
 * @param {function(): number} random liefert eine vorzeichenlose 32-Bit-Zahl
 * @param {number} bound obere Schranke (ausschließlich), > 0
 * @returns {number} eine ganze Zahl aus [0, bound)
 */
export function drawIndex(random, bound) {
	const RANGE = 4294967296; // 2^32
	const limit = RANGE - (RANGE % bound);
	let wert;
	do {
		wert = random();
	} while (wert >= limit);
	return wert % bound;
}

/**
 * Fisher-Yates, rückwärts. Für i von n−1 hinunter bis 1 wird die Karte an
 * Stelle i mit einer Karte aus [0, i] getauscht — die Schranke ist i+1,
 * NICHT n. Das ist der eine Unterschied zwischen einem gleichverteilten
 * Mischen und dem verbreitetsten Mischfehler überhaupt; die falsche Fassung
 * erzeugt eine messbar schiefe Verteilung. Prüfung S-10 in verify-shoe.mjs
 * unterscheidet die beiden Fassungen mit einem einzigen, von Hand
 * nachgerechneten Sonderfall, ohne jede Statistik.
 *
 * @param {Array} cards wird IN PLACE gemischt
 * @param {function(): number} random liefert eine vorzeichenlose 32-Bit-Zahl
 * @returns {Array} dasselbe Array, gemischt
 */
export function shuffleInPlace(cards, random) {
	for (let i = cards.length - 1; i > 0; i--) {
		const j = drawIndex(random, i + 1);
		const zwischen = cards[i];
		cards[i] = cards[j];
		cards[j] = zwischen;
	}
	return cards;
}

/**
 * Der Kartenschlitten: sechs Decks, gemischt, mit Trennkarte und
 * mitlaufendem Hi-Lo-Zähler des Hauses.
 */
export class Shoe {
	/**
	 * @param {{rules: Object, random: function(): number}} teile
	 *   rules   das Regelmodul (rules-blackjack.js), als GANZES eingespeist
	 *   random  ein Geber vorzeichenloser 32-Bit-Zahlen (rng.js:
	 *           drawUint32 im Spiel, createSeeded(saat)() im Nachweis)
	 */
	constructor({ rules, random }) {
		this.rules = rules;
		this.random = random;
		/** @type {{rank: string, suit: string}[]} */
		this.cards = [];
		this.pos = 0;
		this.running = 0;
		this.cutIndex = rules.CUT_INDEX;
		this.shuffles = 0;
		this.shuffle();
	}

	/**
	 * Baut den Schlitten NEU auf — nicht: mischt die bereits vorhandene
	 * Reihenfolge ein zweites Mal — und mischt ihn danach. Ein Neuaufbau
	 * kostet nichts und macht S-2 in verify-shoe.mjs (keine Karte geht
	 * verloren, keine wird erfunden) zu einer echten Aussage über den
	 * Aufbau, nicht nur über das Mischen.
	 */
	shuffle() {
		const frisch = [];
		for (let deck = 0; deck < this.rules.DECK_COUNT; deck++) {
			for (const suit of this.rules.SUITS) {
				for (const rank of this.rules.RANKS) {
					frisch.push({ rank, suit });
				}
			}
		}
		this.cards = shuffleInPlace(frisch, this.random);
		this.pos = 0;
		this.running = 0;
		this.cutIndex = this.rules.CUT_INDEX;
		this.shuffles++;
	}

	/**
	 * Zieht die nächste Karte. Zählt sie SOFORT in den laufenden Zähler
	 * ein — unabhängig davon, ob sie im Spiel offen oder verdeckt liegt
	 * (siehe Kopfkommentar dieser Datei). Ein leerer Schlitten WIRFT, statt
	 * still neu zu mischen: die Trennkarte liegt bei 234 von 312 Karten, es
	 * bleiben also immer 78 Karten Reserve — ein Schlitten, der mitten in
	 * einer Hand heimlich neu mischt, wäre ein lügendes Gerät
	 * (CONCEPT.md C.5.1).
	 *
	 * @returns {{rank: string, suit: string}}
	 * @throws {RangeError} wenn der Schlitten leer ist
	 */
	draw() {
		if (this.pos >= this.cards.length) {
			throw new RangeError('Der Schlitten ist leer — er mischt NICHT still neu.');
		}
		const karte = this.cards[this.pos];
		this.pos++;
		this.running += this.rules.hiLoTag(karte.rank);
		return karte;
	}

	/** Noch nicht gezogene Karten. */
	get remaining() {
		return this.cards.length - this.pos;
	}

	/** Bereits gezogene Karten. */
	get dealt() {
		return this.pos;
	}

	/** Der laufende Hi-Lo-Zähler — die Summe der Marken aller bereits gezogenen Karten. */
	get runningCount() {
		return this.running;
	}

	/**
	 * Der wahre Zähler, EXAKT aus den tatsächlich verbleibenden Karten
	 * gerechnet — keine Halbdeck-Schätzung (DECISIONS.md hält das als
	 * eigene Festlegung fest).
	 */
	get trueCount() {
		return this.rules.trueCount(this.running, this.remaining);
	}

	/** „Trennkarte erreicht" — ab genau der CUT_INDEX-ten gezogenen Karte. */
	get cutReached() {
		return this.dealt >= this.cutIndex;
	}

	/**
	 * Muss VOR der nächsten Runde neu gemischt werden? Dieser Getter sagt
	 * nur, OB — WANN gefragt wird, entscheidet round-blackjack.js (nur
	 * zwischen Runden, siehe Kopfkommentar).
	 */
	get needsShuffle() {
		return this.cutReached || this.rules.shouldShuffleUp(this.running, this.remaining);
	}

	/**
	 * Der Grund für needsShuffle, oder null. Die Trennkarte ist der ältere,
	 * härtere Grund: treffen beide Gründe gleichzeitig zu, ist das Ergebnis
	 * ausdrücklich 'cut', nicht 'count' — S-8 in verify-shoe.mjs prüft genau
	 * diese Reihenfolge, damit sie nicht dem Zufall überlassen bleibt.
	 *
	 * @returns {'cut'|'count'|null}
	 */
	get shuffleReason() {
		if (this.cutReached) {
			return 'cut';
		}
		if (this.rules.shouldShuffleUp(this.running, this.remaining)) {
			return 'count';
		}
		return null;
	}

	/** Wie oft dieser Schlitten schon gemischt wurde (den Aufbau eingeschlossen). */
	get shuffleCount() {
		return this.shuffles;
	}
}
