/**
 * Casino Kunterbunt – der Rundenablauf eines Spieltisches
 * =======================================================
 *
 * CONCEPT.md C.3: „Ein Zustandswerk mit den Zuständen setzen → gesperrt →
 * Ereignis läuft → auswerten → auszahlen → setzen. Jedes Spiel füllt die
 * Zustände, der Ablauf selbst ist geteilt. Er ist so gebaut, dass in Teil D
 * eine Zeituhr und mehrere Personen dazukommen können, ohne ihn umzuschreiben."
 *
 * Kein import, kein Dokument — wie table-chips.js und table-bets.js.
 *
 *
 * DIE FÜNF ZUSTÄNDE
 * -----------------
 *   'setzen'     Chips dürfen gelegt und zurückgenommen werden.
 *   'gesperrt'   „Nichts geht mehr." Das Tuch ist zu, das Ereignis noch nicht
 *                gestartet. Ein eigener Zustand und nicht bloß ein Augenblick,
 *                weil an einem echten Tisch dazwischen etwas passiert — der
 *                Croupier winkt ab — und weil in Teil D hier die Zeituhr
 *                abläuft und auf die Mitspieler gewartet wird.
 *   'laeuft'     Rad, Würfel oder Karten sind unterwegs.
 *   'auswerten'  Das Ergebnis steht fest, die Rechnung läuft.
 *   'auszahlen'  Die Rechnung steht, das Geld wandert.
 *
 * Ohne Umlaut in 'laeuft', weil der Zustandsname als data-Attribut und als
 * CSS-Klassenteil im Markup landet.
 *
 *
 * WARUM DIE MASCHINE NICHT WIRFT
 * ------------------------------
 * Ein unerlaubter Übergang liefert { ok: false } und ändert nichts. Sie wirft
 * NICHT, obwohl das Projekt sonst Programmierfehler laut macht — denn der
 * häufigste unerlaubte Übergang ist keiner: es ist der zweite Klick auf
 * „drehen", bevor der erste durch ist. Eine Ausnahme würde dabei die Seite
 * mitreißen. Genau das abzufangen ist die Aufgabe dieser Maschine; sie ist
 * der Wächter, nicht der Bewachte.
 *
 *
 * WAS IN TEIL D DAZUKOMMT, OHNE DASS HIER ETWAS UMGEBAUT WIRD
 * -----------------------------------------------------------
 * Eine Zeituhr ruft lock() aus einem Zeitgeber statt aus einem Tastendruck.
 * Mehrere Mitspieler heißen: mehrere Setzflächen an EINER Runde — die
 * Maschine kennt keine, sie meldet nur ihre Zustände. Beides braucht hier
 * keine Zeile. Deshalb steht hier auch keine spekulative Zeile dafür.
 */

/** Die fünf Zustände in der Reihenfolge des Ablaufs. */
export const ROUND_STATES = Object.freeze(['setzen', 'gesperrt', 'laeuft', 'auswerten', 'auszahlen']);

/**
 * Erlaubte Übergänge. Was hier nicht steht, geht nicht.
 * abort() ist die einzige Ausnahme: sie führt aus JEDEM Zustand nach 'setzen'
 * und ist der Weg für einen Abbruch — etwa wenn ein Spiel feststellt, dass
 * sein Ereignis nicht zu Ende gebracht werden kann.
 */
const ALLOWED = Object.freeze({
	setzen: ['gesperrt'],
	gesperrt: ['laeuft'],
	laeuft: ['auswerten'],
	auswerten: ['auszahlen'],
	auszahlen: ['setzen'],
});

export class TableRound {
	/**
	 * @param {{onEnter?: function({state, previous, detail}): void}} options
	 *   onEnter  wird nach JEDEM erfolgreichen Übergang gerufen, auch beim
	 *            ersten. Der einzige Weg nach draußen — dieselbe Bauart wie
	 *            paint() bei der Risiko-Leiter: die Maschine reicht eine
	 *            Momentaufnahme herüber, was daraus wird, entscheidet das Spiel.
	 */
	constructor({ onEnter = null } = {}) {
		this.onEnter = onEnter;
		this.current = 'setzen';
		this.melde(this.current, null, { reason: 'init' });
	}

	get state() {
		return this.current;
	}

	/** Ruft onEnter() genau einmal, mit derselben Momentaufnahme wie überall. */
	melde(state, previous, detail) {
		if (typeof this.onEnter === 'function') {
			this.onEnter({ state, previous, detail });
		}
	}

	/** 'setzen' → 'gesperrt'. Nichts geht mehr. */
	lock(detail) {
		return this.go('gesperrt', detail);
	}

	/** 'gesperrt' → 'laeuft'. Das Ereignis beginnt. */
	run(detail) {
		return this.go('laeuft', detail);
	}

	/** 'laeuft' → 'auswerten'. Das Ergebnis steht fest. */
	resolve(result) {
		return this.go('auswerten', { result });
	}

	/** 'auswerten' → 'auszahlen'. Die Rechnung steht. */
	pay(report) {
		return this.go('auszahlen', { report });
	}

	/** 'auszahlen' → 'setzen'. Die Runde ist zu Ende. */
	finish(detail) {
		return this.go('setzen', detail);
	}

	/** Aus jedem Zustand zurück nach 'setzen'. Für Abbrüche. */
	abort(reason) {
		const previous = this.current;
		this.current = 'setzen';
		this.melde(this.current, previous, { reason: reason ?? 'abort' });
		return { ok: true, state: this.current, previous };
	}

	/** @returns {{ok: true, state, previous}|{ok: false, reason: 'state', state, wanted}} */
	go(next, detail) {
		const erlaubt = ALLOWED[this.current] ?? [];
		if (!erlaubt.includes(next)) {
			return { ok: false, reason: 'state', state: this.current, wanted: next };
		}
		const previous = this.current;
		this.current = next;
		this.melde(this.current, previous, detail);
		return { ok: true, state: this.current, previous };
	}
}

export default TableRound;
