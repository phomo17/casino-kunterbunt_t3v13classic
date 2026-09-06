/**
 * Blackjack – Das Regelwerk
 * =========================
 *
 * DIE EINE QUELLE. Kartenwerte, Ablauf, Hausregeln und das Zieh-Schema des
 * Gebers stehen AUSSCHLIESSLICH hier. Es gibt keine zweite Abschrift — nicht
 * in einer PHP-Klasse, nicht in der README, nicht in ext_emconf.php, nicht in
 * einer XLIFF-Datei, nicht in einem Fluid-Template. Wer die Regeln lesen
 * will, lässt sie sich mit dump-rules.mjs aus genau dieser Datei ausdrucken.
 * Prüfung A-11 in verify-cabinet.mjs setzt das in beide Richtungen durch:
 * sie schlägt fehl, sobald eine Regelzahl irgendwo sonst auftaucht, UND sie
 * schlägt fehl, sobald eine Regel HIER fehlt.
 *
 * Diese Datei ist zustandslos, dokument- und importfrei: kein `document`,
 * kein `window`, kein `Math.random`, keine Zeile mit `import`. Sie kennt
 * weder Schlitten noch Runde noch Geld — sie sagt nur, was gilt. Genau
 * deshalb kann sie von den Prüfskripten UNMITTELBAR unter Node geladen
 * werden, ohne die Import-Map von TYPO3 nachzubilden (Plan Abschnitt 4,
 * Festlegung 3).
 *
 * WARUM ES KEINE PHP-SPIEGELUNG GIBT
 * -----------------------------------
 * Anders als beim Roulette, wo BetLayout.php die Feldliste ein zweites Mal
 * trägt — und genau daraus sind in Review C3 die Befunde M2 und M4
 * entstanden: eine dritte und vierte Abschrift, die niemand mehr verglichen
 * hat. Ein Regelwerk, das an zwei Stellen steht, ist ein Regelwerk, das
 * irgendwann an zwei Stellen etwas anderes sagt.
 *
 * ============================================================================
 * WORTLAUT VON CONCEPT.md, ANHANG G — „Blackjack: Regelwerk" (zitiert)
 * ============================================================================
 *
 * Kartenwerte
 * -----------
 * - 2 bis 10 zählen ihren Aufdruck.
 * - Bube, Dame, König zählen 10.
 * - Ass zählt 11, oder 1, wenn 11 das Blatt über 21 treiben würde. Ein Blatt
 *   mit einem als 11 gezählten Ass heißt weich.
 *
 * Ablauf
 * ------
 * 1. Einsatz setzen (1 € bis 100 €).
 * 2. Spieler bekommt zwei offene Karten, die auf dem Tuch verdeckt liegen und
 *    in der Bedienleiste offen zu sehen sind. Der Geber bekommt eine offene
 *    und eine verdeckte.
 * 3. Zeigt der Geber ein Ass, wird die Versicherung angeboten.
 * 4. Zeigt der Geber ein Ass oder einen Zehner, prüft er sofort auf
 *    Blackjack. Hat er ihn, endet die Runde; nur ein Blackjack des Spielers
 *    ist dann ein Patt.
 * 5. Der Spieler handelt: Karte, Stehen, Verdoppeln, Teilen, Aufgeben gibt es
 *    nicht.
 * 6. Der Geber deckt auf und zieht nach Schema.
 * 7. Auswertung und Auszahlung.
 *
 * Hausregeln (verbindlich)
 * ------------------------
 *   Decks                       6
 *   Trennkarte                  bei rund 75 % Durchdringung
 *   Geber auf weicher 17        steht (S17)
 *   Verdeckte Karte             ja, mit sofortiger Prüfung
 *   Blackjack zahlt             3:2
 *   Gewinnende Hand zahlt       1:1
 *   Gleichstand                 Patt, Einsatz zurück
 *   Verdoppeln                  auf jedes Blatt aus zwei Karten
 *   Verdoppeln nach Teilen      erlaubt
 *   Teilen                      bis zu dreimal, höchstens vier Blätter
 *   Geteilte Asse                genau eine Karte, kein erneutes Teilen
 *   Zehn und Bube               gelten als teilbares Paar
 *   Versicherung                ja, 2:1, höchstens der halbe Einsatz
 *   Aufgeben (Surrender)        nein
 *   Seitenwetten                keine
 *   Erwarteter Hausvorteil      rund 0,40 %
 *
 * Zieh-Schema des Gebers (starr, ohne Ausnahme)
 * ----------------------------------------------
 *     harte Summe ≤ 16   → Karte ziehen
 *     harte Summe ≥ 17   → stehen
 *     weiche 17          → stehen
 *     weiche Summe ≥ 18  → stehen
 *
 * Nachzuweisen
 * ------------
 * - Mischgleichverteilung über 312 Plätze, ≥ 1.000.000 Mischungen,
 *   Chi-Quadrat p > 0,01.
 * - Auszahlungsquote 99,6 % ± 0,3 Prozentpunkte über ≥ 10.000.000 Hände bei
 *   Spiel nach Grundstrategie. Die Grundstrategie liegt ausschließlich im
 *   Nachweisskript.
 * - Vorzeitiges Mischen tritt ausschließlich oberhalb eines wahren Zählers
 *   von +3 ein.
 *
 * ============================================================================
 * ENDE DES ZITATS. Alles Folgende ist genau dieser Text, in Code übersetzt,
 * und steht NIRGENDS SONST in diesem Projekt wiederholt.
 * ============================================================================
 *
 * DREI STELLEN, AN DENEN DIESER CODE ÜBER DEN WORTLAUT HINAUSGEHT
 * ------------------------------------------------------------------
 * Der Wortlaut lässt drei Dinge offen, die ein lauffähiges Regelwerk
 * entscheiden muss. Alle drei stehen zusätzlich in DECISIONS.md.
 *
 * (1) DIE LÜCKE DER WEICHEN SUMME ≤ 16 IM ZIEH-SCHEMA.
 *     Die vier Zeilen oben nennen „weiche 17" und „weiche Summe ≥ 18", aber
 *     keine weiche Summe von 16 oder weniger (zum Beispiel Ass + 5, also
 *     weich 16). Unter „steht auf weicher 17" (S17) fallen die Zeilen für
 *     harte und weiche Blätter zusammen: ziehen bei 16 und weniger, stehen ab
 *     17 — für BEIDE Artend es Blattes. Ein weiches Blatt von 16 oder weniger
 *     kann außerdem nie überkaufen (das ungünstigste Folgeergebnis ist eine
 *     Umwandlung zu einer harten Zahl ≤ 16), und stehen zu bleiben verletzte
 *     die Regel „stehen erst ab 17" unmittelbar. Die einzige mit dem übrigen
 *     Schema verträgliche Lesart ist deshalb: ziehen. Siehe dealerMustDraw()
 *     unten; Prüfung R-4 in verify-rules.mjs weist das ERSCHÖPFEND über alle
 *     erreichbaren Geberlagen nach, nicht als Stichprobe.
 *
 * (2) ASS + ZEHNER NACH DEM TEILEN IST KEIN BLACKJACK.
 *     Ein „Blackjack" ist weltweit üblich als zwei ERSTE Karten definiert,
 *     die zusammen 21 ergeben. Anhang G sagt das nicht ausdrücklich, setzt es
 *     aber voraus: die Auszahlung „Blackjack zahlt 3:2" bezieht sich auf die
 *     Ausgangshand, nicht auf jedes Blatt, das nach einer Teilung zufällig 21
 *     erreicht. Ein Ass mit einer Zehnerkarte nach einer Teilung zählt 21 und
 *     zahlt wie jede gewonnene Hand 1:1. Ohne diese Festlegung läge der
 *     Hausvorteil spürbar unter den zugesagten rund 0,40 % — siehe
 *     splitAceTenIsNotBlackjack in HOUSE.
 *
 * (3) DER ZÄHLER DES HAUSES ZÄHLT JEDE KARTE, DIE DEN SCHLITTEN VERLÄSST.
 *     Das betrifft nicht diese Datei (sie kennt gar keinen Zähler — der
 *     laufende Zähler ist Zustand des Schlittens, siehe shoe.js), sondern die
 *     Auslegung von C.7.3. Sie steht hier nur als Verweis, damit sie an der
 *     Stelle auffindbar ist, an der jemand nach dem Zähler sucht.
 *
 * FESTLEGUNG DIESES PLANS, DIE VOM WORTLAUT ABWEICHT — DER EINSATZ
 * --------------------------------------------------------------------
 * Anhang G nennt „Einsatz setzen (1 € bis 100 €)". BET_MIN steht hier
 * ausdrücklich auf 2, nicht auf 1 — ein bewusster, dokumentierter Verstoß
 * gegen den Wortlaut (siehe DECISIONS.md, Eintrag „Der Einsatz ist
 * geradzahlig"). Grund in Kürze: das Guthaben des Projekts ist eine ganze
 * Zahl (credit.js, machine-credit.js werfen bei allem, was keine ganze Zahl
 * ist), und Blackjack zahlt gleichzeitig 3:2 (also 1,5×) und verlangt eine
 * Versicherung von höchstens dem HALBEN Einsatz. Bei Einsatz 1 wären das
 * 1,50 und 0,50 — Beträge, die die Kasse nicht kennt. Nur ein geradzahliger
 * Einsatz lässt jede Zusage aus Anhang G unverändert.
 */

/* ===================================================== Die Karten ======= */

/** Die 13 Ränge, in der Reihenfolge eines Blattes im Schlitten. */
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** Die vier Farben. H = Herz, D = Karo, S = Pik, C = Kreuz. */
export const SUITS = ['H', 'D', 'S', 'C'];

/** Die beiden roten Farben — für die Anzeige (Phase C5), keine Spielregel. */
export const RED_SUITS = ['H', 'D'];

/* =================================================== Der Schlitten ======= */

/** Karten in einem einzelnen Deck. */
export const CARDS_PER_DECK = 52;

/** „Decks: 6" aus der Hausregeltabelle. */
export const DECK_COUNT = 6;

/** 6 × 52 — die Größe des vollen Schlittens. */
export const SHOE_SIZE = DECK_COUNT * CARDS_PER_DECK;

/** „Trennkarte bei rund 75 % Durchdringung" aus der Hausregeltabelle. */
export const PENETRATION = 0.75;

/**
 * Die Kartenposition, ab der die Trennkarte erreicht ist — auf eine ganze
 * Karte gerundet, weil eine Trennkarte nicht zwischen zwei Karten schwebt.
 */
export const CUT_INDEX = Math.round(SHOE_SIZE * PENETRATION);

/* ====================================================== Der Zähler ======= */

/**
 * „Steigt der wahre Zähler über +3, wird … vorzeitig neu gemischt" (C.7.3).
 * Diese Zahl ist eine REGEL (die Schwelle); der laufende und der wahre
 * Zähler selbst sind ZUSTAND und liegen deshalb im Schlitten (shoe.js), nicht
 * hier.
 */
export const TRUE_COUNT_SHUFFLE_UP = 3;

/* ===================================================== Die Einsätze ====== */

/**
 * Mindesteinsatz. ABWEICHUNG vom Wortlaut (Anhang G nennt 1 €) — siehe die
 * ausführliche Begründung im Kopfkommentar dieser Datei und DECISIONS.md.
 */
export const BET_MIN = 2;

/** Höchsteinsatz je Hand, für den Grundeinsatz (C.7.5). */
export const BET_MAX = 100;

/** Jeder legale Einsatz ist ein Vielfaches hiervon — die Kehrseite von BET_MIN. */
export const BET_STEP = 2;

/* ============================ Die Hausregeln, als ein Objekt gebündelt === */

/**
 * Jede Zeile der Hausregeltabelle aus Anhang G, als eine einzige,
 * eingefrorene Quelle. `Object.freeze` verhindert, dass ein Aufrufer eine
 * Regel zur Laufzeit verändert — ein Regelwerk, das sich selbst ändern
 * könnte, wäre keine Zusage mehr.
 */
export const HOUSE = Object.freeze({
	/** „Decks: 6". */
	decks: DECK_COUNT,
	/** „Trennkarte: bei rund 75 % Durchdringung". */
	penetration: PENETRATION,
	/** „Geber auf weicher 17: steht (S17)". */
	standsOnSoft17: true,
	/** „Verdeckte Karte: ja". */
	holeCard: true,
	/** „… mit sofortiger Prüfung" — Peek bei Ass oder Zehner. */
	peek: true,
	/** „Blackjack zahlt: 3:2" — [Zähler, Nenner]. */
	blackjackPays: [3, 2],
	/** „Gewinnende Hand zahlt: 1:1". */
	winPays: [1, 1],
	/** „Versicherung: ja, 2:1 …". */
	insurancePays: [2, 1],
	/** „Gleichstand: Patt, Einsatz zurück". */
	pushReturnsStake: true,
	/** „Verdoppeln: auf jedes Blatt aus zwei Karten". */
	doubleOnAnyTwo: true,
	/** „Verdoppeln nach Teilen: erlaubt". */
	doubleAfterSplit: true,
	/** „Teilen: bis zu dreimal" — drei Teilungen, also höchstens vier Blätter. */
	splitMax: 3,
	/** Folgt aus splitMax: höchstens vier Blätter gleichzeitig. */
	handsMax: 4,
	/** „Geteilte Asse: genau eine Karte". */
	splitAcesOneCard: true,
	/** „… kein erneutes Teilen". */
	resplitAces: false,
	/** Festlegung (2) im Kopfkommentar: Ass + Zehner nach Teilen ist kein Blackjack. */
	splitAceTenIsNotBlackjack: true,
	/** „Zehn und Bube gelten als teilbares Paar" — nach WERT, nicht nach Rang. */
	tenAndJackAreAPair: true,
	/** „Versicherung: ja". */
	insurance: true,
	/** „… höchstens der halbe Einsatz" — [Zähler, Nenner] des Bruchteils. */
	insuranceMaxFraction: [1, 2],
	/** „Aufgeben (Surrender): nein". */
	surrender: false,
	/** „Seitenwetten: keine". */
	sideBets: false,
	/** Dieselbe Schwelle wie TRUE_COUNT_SHUFFLE_UP, hier zusätzlich benannt. */
	trueCountShuffleUp: TRUE_COUNT_SHUFFLE_UP,
});

/* ===================================================== Reine Funktionen == */

/**
 * Der Kartenwert eines Rangs. „2 bis 10 zählen ihren Aufdruck. Bube, Dame,
 * König zählen 10. Ass zählt 11 …" (Anhang G, Kartenwerte). Die Herabsetzung
 * eines Asses auf 1 ist NICHT hier — sie ist eine Eigenschaft des ganzen
 * Blattes (siehe handTotal()), nicht des einzelnen Rangs.
 *
 * @param {string} rank einer der RANKS
 * @returns {number}
 * @throws {RangeError} bei einem unbekannten Rang
 */
export function cardValue(rank) {
	if (rank === 'A') {
		return 11;
	}
	if (rank === 'J' || rank === 'Q' || rank === 'K') {
		return 10;
	}
	const zahl = Number(rank);
	if (!Number.isInteger(zahl) || zahl < 2 || zahl > 10) {
		throw new RangeError(`Unbekannter Rang: ${String(rank)}`);
	}
	return zahl;
}

/**
 * @param {string} rank
 * @returns {boolean}
 */
export function isAce(rank) {
	return rank === 'A';
}

/**
 * @param {string} rank
 * @returns {boolean}
 */
export function isTenValue(rank) {
	return cardValue(rank) === 10;
}

/**
 * Die Summe eines Blattes nach den Kartenwerten aus Anhang G, einschließlich
 * der Ass-Herabsetzung: „Ass zählt 11, oder 1, wenn 11 das Blatt über 21
 * treiben würde. Ein Blatt mit einem als 11 gezählten Ass heißt weich."
 *
 * Jedes Ass wird zunächst als 11 gezählt; solange die Summe 21 übersteigt und
 * noch ein als 11 gezähltes Ass übrig ist, wird EIN Ass auf 1 herabgesetzt
 * (Differenz −10) und die Schleife wiederholt. Nach dieser Reduktion bleibt
 * höchstens EIN Ass weiterhin als 11 gezählt — zwei gleichzeitig als 11
 * gezählte Asse ergäben allein schon 22 und würden sofort reduziert. „weich"
 * ist deshalb ein einfaches Ja/Nein, kein Zähler.
 *
 * @param {string[]} ranks
 * @returns {{total: number, soft: boolean, busted: boolean, cards: number}}
 */
export function handTotal(ranks) {
	let total = 0;
	let elfer = 0; // Zahl der noch als 11 gezählten Asse — nach Reduktion höchstens 1
	for (const rang of ranks) {
		const wert = cardValue(rang);
		total += wert;
		if (wert === 11) {
			elfer++;
		}
	}
	while (total > 21 && elfer > 0) {
		total -= 10;
		elfer--;
	}
	return { total, soft: elfer > 0, busted: total > 21, cards: ranks.length };
}

/**
 * „Ein Blackjack" — Ablauf Schritt 4 und die Hausregeltabelle setzen voraus,
 * dass er aus GENAU ZWEI Karten mit Summe 21 besteht (die Ausgangshand). Ein
 * Blatt aus mehr als zwei Karten, das später zufällig 21 erreicht, ist kein
 * Blackjack, sondern eine gewonnene Hand — das betrifft insbesondere ein
 * Ass + Zehner NACH einer Teilung (Festlegung (2) im Kopfkommentar).
 *
 * @param {string[]} ranks
 * @returns {boolean}
 */
export function isBlackjack(ranks) {
	return ranks.length === 2 && handTotal(ranks).total === 21;
}

/**
 * DAS ZIEH-SCHEMA DES GEBERS — starr, ohne Ausnahme (Anhang G).
 *
 * Unter „steht auf jeder 17, auch auf einer weichen 17" (S17, C.7.4) fallen
 * die vier Zeilen des Zieh-Schemas für harte und weiche Blätter auf dieselbe
 * Grenze zusammen: bei 16 und darunter wird gezogen, ab 17 wird gestanden —
 * unabhängig davon, ob die Summe weich oder hart ist. Siehe Festlegung (1) im
 * Kopfkommentar für die Herleitung der einzigen dort nicht ausdrücklich
 * genannten Zeile (weiche Summe ≤ 16). Geprüft ERSCHÖPFEND über alle
 * erreichbaren Geberlagen durch R-4 in verify-rules.mjs — nicht als
 * Stichprobe über gespielte Runden.
 *
 * Liest ABSICHTLICH nichts außer `hand.total` — insbesondere keinen Zähler.
 * C.7.3 ist eindeutig: „Der Geber selbst spielt vollkommen starr … Er weicht
 * nie vom Zieh-Schema ab, unabhängig vom Zähler." R-12 in verify-rules.mjs
 * und Q-9 in verify-round.mjs (Umsetzungsstück C4d) weisen das nach.
 *
 * @param {{total: number}} hand das Ergebnis von handTotal()
 * @returns {boolean} true, wenn der Geber eine weitere Karte ziehen muss
 */
export function dealerMustDraw(hand) {
	return hand.total <= 16;
}

/**
 * „Zehn und Bube gelten als teilbares Paar" — Teilen richtet sich nach dem
 * WERT der beiden Karten, nicht nach dem Rang. Zehn, Bube, Dame und König
 * sind deshalb paarweise teilbar; Ass + Ass ebenfalls (beide zählen 11).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isSplittablePair(a, b) {
	return cardValue(a) === cardValue(b);
}

/**
 * Die Hi-Lo-Marke eines Rangs (C.7.3): „Karten 2–6 zählen +1, Karten 7–9
 * zählen 0, Zehner, Bildkarten und Asse zählen −1." Reine Funktion einer
 * Karte — der LAUFENDE Zähler (die Summe über gezogene Karten) ist Zustand
 * des Schlittens, nicht dieser Datei.
 *
 * @param {string} rank
 * @returns {1|0|-1}
 */
export function hiLoTag(rank) {
	const wert = cardValue(rank);
	if (wert >= 2 && wert <= 6) {
		return 1;
	}
	if (wert >= 7 && wert <= 9) {
		return 0;
	}
	return -1; // Zehner, Bildkarten (Wert 10) und Asse (Wert 11)
}

/**
 * Der wahre Zähler (C.7.3): „laufender Zähler geteilt durch die geschätzte
 * Zahl der noch nicht gespielten Decks". Hier wird die Zahl der noch nicht
 * gespielten Decks EXAKT aus den verbleibenden Karten gerechnet, nicht auf
 * ein halbes oder viertel Deck geschätzt (DECISIONS.md hält das als eigene
 * Festlegung fest). `Math.max(cardsRemaining, 1)` verhindert eine Division
 * durch null, ohne den Zähler bei einem fast leeren Schlitten unsinnig groß
 * werden zu lassen — der Schlitten mischt ohnehin lange vorher neu.
 *
 * @param {number} running der laufende Hi-Lo-Zähler
 * @param {number} cardsRemaining noch nicht gezogene Karten im Schlitten
 * @returns {number}
 */
export function trueCount(running, cardsRemaining) {
	const decksLeft = Math.max(cardsRemaining, 1) / CARDS_PER_DECK;
	return running / decksLeft;
}

/**
 * „Steigt der wahre Zähler über +3, wird … vorzeitig neu gemischt" (C.7.3).
 * Ausdrücklich ÜBER +3, nicht AB +3 — ein wahrer Zähler von genau +3 löst
 * noch KEIN vorzeitiges Mischen aus. Geprüft in S-8 (verify-shoe.mjs,
 * Umsetzungsstück C4c) und Q-13 (verify-round.mjs, Umsetzungsstück C4d).
 *
 * @param {number} running
 * @param {number} cardsRemaining
 * @returns {boolean}
 */
export function shouldShuffleUp(running, cardsRemaining) {
	return trueCount(running, cardsRemaining) > TRUE_COUNT_SHUFFLE_UP;
}

/**
 * „Einsatz setzen (1 € bis 100 €)" aus Anhang G, mit der dokumentierten
 * Abweichung BET_MIN = 2 (siehe Kopfkommentar): eine ganze Zahl, mindestens
 * BET_MIN, höchstens BET_MAX, ein Vielfaches von BET_STEP.
 *
 * @param {*} amount
 * @returns {boolean}
 */
export function isLegalStake(amount) {
	return Number.isInteger(amount)
		&& amount >= BET_MIN && amount <= BET_MAX
		&& amount % BET_STEP === 0;
}

/**
 * „Versicherung … höchstens der halbe Einsatz." Weil BET_MIN und BET_STEP
 * geradzahlig sind, ist stake/2 für jeden legalen Einsatz stets eine ganze
 * Zahl — die Voraussetzung dafür, dass Festlegung 1 im Kopfkommentar
 * überhaupt trägt.
 *
 * @param {number} stake der Grundeinsatz
 * @returns {number}
 */
export function insuranceMax(stake) {
	const [zaehler, nenner] = HOUSE.insuranceMaxFraction;
	return (stake * zaehler) / nenner;
}

/**
 * „Blackjack zahlt 3:2" — der Einsatz kommt zurück, zuzüglich 3/2 davon.
 * @param {number} stake
 * @returns {number}
 */
export function blackjackReturn(stake) {
	const [zaehler, nenner] = HOUSE.blackjackPays;
	return stake + (stake * zaehler) / nenner;
}

/**
 * „Gewinnende Hand zahlt 1:1" — der Einsatz kommt zurück, zuzüglich derselben
 * Summe noch einmal.
 * @param {number} stake
 * @returns {number}
 */
export function winReturn(stake) {
	const [zaehler, nenner] = HOUSE.winPays;
	return stake + (stake * zaehler) / nenner;
}

/**
 * „Gleichstand: Patt, Einsatz zurück."
 * @param {number} stake
 * @returns {number}
 */
export function pushReturn(stake) {
	return stake;
}

/** Eine verlorene Hand gibt nichts zurück. @returns {0} */
export function loseReturn() {
	return 0;
}

/**
 * „Versicherung … zahlt 2:1." Der eingesetzte Versicherungsbetrag kommt
 * zurück, zuzüglich 2/1 davon — macht das Dreifache des Einsatzes.
 * @param {number} amount der versicherte Betrag
 * @returns {number}
 */
export function insuranceReturn(amount) {
	const [zaehler, nenner] = HOUSE.insurancePays;
	return amount + (amount * zaehler) / nenner;
}
