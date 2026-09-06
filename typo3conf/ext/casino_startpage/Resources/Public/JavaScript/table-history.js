/**
 * Casino Kunterbunt – der Verlaufsstreifen eines Spieltisches
 * ===========================================================
 *
 * CONCEPT.md C.3: „Die letzten Ergebnisse als kleine Marken am Rand des
 * Tisches — bei Roulette die Zahlenreihe, bei Craps die Würfe, bei Blackjack
 * die Ausgänge. Rein zur Ansicht, ohne Einfluss auf das Spiel."
 *
 * Und C.10, Nicht-Ziele: „Keine Spielerstatistik, kein Verlauf über die
 * Sitzung hinaus. Der Verlaufsstreifen zeigt nur die letzten Runden und wird
 * beim Verlassen vergessen." Deshalb wird hier NICHTS gespeichert — kein
 * localStorage, kein Schlüssel, keine Zeile dafür.
 *
 * KEIN LIVE-BEREICH
 * -----------------
 * Der Streifen ist ausdrücklich KEIN role="status". Er ist eine Chronik zum
 * Nachsehen, keine Meldung; jedes Ergebnis einer Runde wird ohnehin schon vom
 * Ansagebereich gesprochen. Beides zugleich hieße, jedes Ergebnis zweimal zu
 * hören. Er ist stattdessen eine benannte Liste, die ein Bildschirmleser
 * ansteuern und der Reihe nach lesen kann.
 *
 * WARUM ZWÖLF
 * -----------
 * An einem echten Tisch hängt eine Tafel mit den letzten Ergebnissen; zwölf
 * ist die Zahl, bei der der Streifen auf einem Telefon noch in eine Zeile
 * passt und noch etwas aussagt. Sie ist kein Naturgesetz und steht deshalb als
 * benannte Konstante da.
 *
 * WAS DIESE DATEI VOM MARKUP ERWARTET
 * ------------------------------------
 * root ist unmittelbar die <ol data-ck-table-history></ol> aus
 * Table/History.html — LEER ausgeliefert. Die Liste wird ausschließlich von
 * push()/clear() gefüllt, nie beim Anlegen: derselbe Grund wie beim
 * Ansagebereich, nur andersherum — hier geht es nicht um Vorlesen, sondern
 * darum, dass die Chronik beim Öffnen der Seite tatsächlich leer ist (C.10).
 */

/** An einem echten Tisch hängt eine Tafel mit den letzten Ergebnissen. */
const MAX_MARKS = 12;

/**
 * Verdrahtet den Verlaufsstreifen.
 *
 * @param {Element} root das <ol data-ck-table-history>
 * @param {{texts?: {empty?: string}}} [options]
 * @returns {{push: function({text: string, title?: string, tone?: string}): void,
 *            clear: function(): void, destroy: function(): void}}
 *
 * push({text, title, tone})
 *   text   sichtbarer und vorgelesener Inhalt der Marke (z. B. "17", "6+3").
 *          Farbe ist NIE die einzige Aussage — genau deshalb muss jede Marke
 *          einen Text tragen, auch wenn sie zusätzlich eine tone-Farbe hat.
 *   title  optionaler Klartext-Zusatz (z. B. "Rot"), landet im title-Attribut
 *          der Marke — rein ergänzend, nie der einzige Träger einer Aussage.
 *   tone   ein Wort, aus dem die CSS-Klasse ck-history__mark--<tone> wird:
 *          'neutral' | 'red' | 'black' | 'green' | 'win' | 'loss' | 'event'.
 *          WELCHE Farbe ein Spiel benutzt, entscheidet das Spiel; diese Datei
 *          kennt nur die Wörter.
 *
 * Neue Marken werden am ANFANG der Liste eingefügt (die neueste zuerst), ältere
 * fallen ab MAX_MARKS heraus. Der leere Hinweistext
 * ([data-ck-table-history-empty] im Markup) wird ein-/ausgeblendet, je nachdem
 * ob die Liste Einträge hat.
 */
export function connectHistory(root, options = {}) {
	const { texts = {} } = options ?? {};

	/** Das Geschwister-Element mit dem Leer-Hinweis, falls vorhanden. */
	const emptyHint = root.parentElement?.querySelector('[data-ck-table-history-empty]') ?? null;

	/**
	 * @returns {void}
	 */
	function updateEmptyHint() {
		if (!emptyHint) {
			return;
		}
		const hasEntries = root.children.length > 0;
		emptyHint.hidden = hasEntries;
		if (!hasEntries && typeof texts.empty === 'string' && texts.empty !== '') {
			emptyHint.textContent = texts.empty;
		}
	}

	/**
	 * @param {{text: string, title?: string, tone?: string}} entry
	 * @returns {void}
	 */
	function push(entry) {
		if (!entry || typeof entry.text !== 'string' || entry.text === '') {
			console.error('[casino] table-history.js: push() erwartet mindestens { text }.');
			return;
		}
		const li = document.createElement('li');
		const toneWort = typeof entry.tone === 'string' && /^[a-z]+$/.test(entry.tone) ? entry.tone : 'neutral';
		li.className = `ck-history__mark ck-history__mark--${toneWort}`;
		li.textContent = entry.text;
		if (typeof entry.title === 'string' && entry.title !== '') {
			li.title = entry.title;
		}
		root.insertBefore(li, root.firstChild);
		while (root.children.length > MAX_MARKS) {
			root.removeChild(root.lastChild);
		}
		updateEmptyHint();
	}

	/** Leert die Chronik — z. B. wenn ein Spiel neu mischt. */
	function clear() {
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		updateEmptyHint();
	}

	/** Nichts anzumelden gab es hier nie — destroy() räumt nur das Markup ab. */
	function destroy() {
		clear();
	}

	updateEmptyHint();

	return { push, clear, destroy };
}

export default connectHistory;
