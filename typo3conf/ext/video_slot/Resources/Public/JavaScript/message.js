/**
 * Video Slot – das Meldungsschild
 * ==============================================
 *
 * Bauform aus reel_slot/message.js, mit vs-Präfixen.
 *
 * Die Tafel über dem Sichtfeld, nach Art der alten „TILT"-Schilder. Phase 5
 * hat sie verborgen ins Markup gelegt und den Haken .vs-message--shown
 * vorgesehen (machine.css); diese Datei füllt sie zum ersten Mal.
 *
 * Sie sitzt AUF dem Gerät, nicht daneben — CONCEPT.md Abschnitt 3.2 schließt
 * jede Textbox neben dem Automaten aus.
 *
 *
 * WARUM DIE TEXTE NICHT IN DIESER DATEI STEHEN
 * --------------------------------------------
 * CONCEPT.md Abschnitt 4 verlangt alle sichtbaren Beschriftungen über XLIFF,
 * auch bei einsprachigem Frontend. Das Schild bringt seine Texte deshalb selbst
 * mit, als data-Attribute aus der Sprachdatei:
 *
 *   data-vs-text-insufficient   GUTHABEN ZU GERING
 *   data-vs-text-invalid        BETRAG UNGÜLTIG
 *   data-vs-text-capped         KONTO VOLL
 *   data-vs-text-void           RUNDE UNGÜLTIG
 *   data-vs-text-nocash         (Phase 7)
 *   data-vs-text-norng          AUSSER BETRIEB
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 *
 *
 * WARUM ES SICH VON ALLEIN AUSBLENDET
 * -----------------------------------
 * Nach 2,6 Sekunden geht die Tafel von allein wieder weg; jede erneute
 * Meldung setzt die Uhr zurück.
 *
 *
 * DIE TAFEL IST EIN LIVE-BEREICH
 * ------------------------------------------------------
 * Cabinet.html gibt sie mit role="status" und LEER aus. Damit liest ein
 * Bildschirmleser jede Meldung von selbst vor — das ist einer der Rückmelde-
 * kanäle dieses Geräts. Zwei Dinge hängen daran und dürfen nicht wieder
 * verloren gehen:
 *
 *   - machine.css darf die Tafel NICHT mit visibility oder display verbergen;
 *     das nähme sie aus dem Barrierebaum und mit ihr die Ansage.
 *   - Nach dem Ausblenden wird der Text abgeräumt (CLEAR_MS), sonst bliebe
 *     eine Wiederholung derselben Meldung stumm.
 */

/** Der Haken aus machine.css. */
const SHOWN_CLASS = 'vs-message--shown';

/**
 * Standzeit einer Meldung in Millisekunden.
 */
const SHOW_MS = 2600;

/**
 * Wie lange nach dem Ausblenden gewartet wird, bevor der Text aus der Tafel
 * genommen wird.
 *
 * Muss mindestens so lang sein wie die Überblendung --ck-duration-base
 * (220 ms) — sonst stünde die Tafel schon leer da, während sie noch
 * ausblendet. 400 ms sind die Überblendung plus Reserve.
 */
const CLEAR_MS = 400;

/**
 * Die erlaubten Meldungen und ihr Platz im dataset.
 *
 * Eine feste Liste, kein freier Text: so kann keine Stelle im Code versehentlich
 * einen Text erfinden, der nicht aus der Sprachdatei kommt.
 *
 * Die fünf ersten liegen seit Phase 5 im ausgelieferten Markup; norng ist
 * der einzige, den Phase 6 tatsächlich aufruft.
 */
const TEXT_KEYS = Object.freeze({
	insufficient: 'vsTextInsufficient',
	invalid: 'vsTextInvalid',
	capped: 'vsTextCapped',
	void: 'vsTextVoid',
	nocash: 'vsTextNocash',
	norng: 'vsTextNorng',
});

/**
 * Das Meldungsschild eines Gehäuses.
 */
export class MessageBoard {
	/**
	 * @param {?HTMLElement} element das .vs-message, oder null
	 */
	constructor(element) {
		// Fehlt das Schild, tut diese Klasse gar nichts — ein fehlendes
		// Hinweisschild ist kein Grund, einen Automaten stillzulegen.
		this.element = element;

		/** Laufender Ausblend-Zeitgeber, oder 0. */
		this.timer = 0;

		/** Laufender Abräum-Zeitgeber, oder 0. */
		this.wipeTimer = 0;

		/** Welche Meldung gerade steht, oder '' — nur zur Auskunft. */
		this.current = '';
	}

	/**
	 * Zeigt eine Meldung und startet die Standzeit neu.
	 *
	 * @param {'insufficient'|'invalid'|'capped'|'void'|'nocash'|'norng'} key
	 * @returns {void}
	 */
	show(key) {
		if (this.element === null) {
			return;
		}

		const datasetKey = TEXT_KEYS[key];
		if (datasetKey === undefined) {
			console.error(`[video-slot] Unbekannte Meldung: ${String(key)}`);
			return;
		}

		const text = this.element.dataset[datasetKey];
		if (typeof text !== 'string' || text === '') {
			// Das Markup bringt den Text nicht mit. Lieber schweigen als eine
			// leere Tafel einblenden.
			console.error(`[video-slot] Am Meldungsschild fehlt data-vs-text-${key}.`);
			return;
		}

		// Ein noch laufendes Abräumen abbestellen: sonst nähme es den gerade
		// gesetzten Text gleich wieder weg.
		this.clearWipeTimer();

		this.element.textContent = text;
		this.element.classList.add(SHOWN_CLASS);
		this.current = key;

		this.clearTimer();
		this.timer = globalThis.setTimeout(() => {
			this.timer = 0;
			this.hide();
		}, SHOW_MS);
	}

	/**
	 * Blendet aus. Gefahrlos aufrufbar, auch wenn nichts steht.
	 *
	 * @returns {void}
	 */
	hide() {
		this.clearTimer();
		this.current = '';
		this.element?.classList.remove(SHOWN_CLASS);

		// Den Text erst nehmen, wenn die Tafel ausgeblendet IST — siehe
		// CLEAR_MS.
		if (this.element !== null && this.element.textContent !== '') {
			this.clearWipeTimer();
			this.wipeTimer = globalThis.setTimeout(() => {
				this.wipeTimer = 0;
				this.element.textContent = '';
			}, CLEAR_MS);
		}
	}

	/** @returns {void} */
	clearWipeTimer() {
		if (this.wipeTimer !== 0) {
			globalThis.clearTimeout(this.wipeTimer);
			this.wipeTimer = 0;
		}
	}

	/** @returns {void} */
	clearTimer() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
			this.timer = 0;
		}
	}

	/**
	 * Räumt den Zeitgeber ab. Wird beim Verlassen der Seite gerufen.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.hide();

		this.clearWipeTimer();
		if (this.element !== null) {
			this.element.textContent = '';
		}
	}
}

export default MessageBoard;
