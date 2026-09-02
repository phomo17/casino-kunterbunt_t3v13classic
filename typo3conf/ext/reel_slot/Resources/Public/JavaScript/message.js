/**
 * Reel Slot – das Meldungsschild
 * ==============================================
 *
 * Die Tafel über dem Walzenfenster, nach Art der alten „TILT"-Schilder. Phase 5
 * hat sie verborgen ins Markup gelegt und den Haken .rs-message--shown
 * vorgesehen (machine.css, Abschnitt 7); Phase 7 füllt sie zum ersten Mal.
 *
 * Sie sitzt AUF dem Gerät, nicht daneben — CONCEPT.md Abschnitt 3.2 schließt
 * jede Textbox neben dem Automaten aus. Das ist auch der Grund, warum es
 * überhaupt eine solche Tafel gibt und keine Statuszeile wie am Leuchtschild
 * im Saal.
 *
 *
 * WARUM DIE TEXTE NICHT IN DIESER DATEI STEHEN
 * --------------------------------------------
 * CONCEPT.md Abschnitt 4 verlangt alle sichtbaren Beschriftungen über XLIFF,
 * auch bei einsprachigem Frontend. Das Schild bringt seine Texte deshalb selbst
 * mit, als data-Attribute aus der Sprachdatei:
 *
 *   data-rs-text-insufficient   GUTHABEN ZU GERING
 *   data-rs-text-invalid        BETRAG UNGÜLTIG
 *   data-rs-text-capped         KONTO VOLL
 *   data-rs-text-void           RUNDE UNGÜLTIG
 *
 * Dasselbe Verfahren benutzt casino_startpage an seinem Leuchtschild. In dieser
 * Datei steht kein deutscher Anzeigetext.
 *
 *
 * WARUM ES SICH VON ALLEIN AUSBLENDET
 * -----------------------------------
 * Das Schild liegt auf x 16–68 / y 68–85 und verdeckt damit die Gewinnlinie.
 * Ein stehen gebliebenes Schild wäre kein Hinweis mehr, sondern ein Vorhang.
 * Nach 2,6 Sekunden geht es von allein wieder weg; jede erneute Meldung setzt
 * die Uhr zurück, und wer den Grund beseitigt (Geld nachlegt, einen kleineren
 * Einsatz wählt), sieht es sofort verschwinden — darum kümmert sich wallet.js.
 *
 *
 * SEIT DEM AUDIT-NACHLAUF IST DIE TAFEL EIN LIVE-BEREICH
 * ------------------------------------------------------
 * Cabinet.html gibt sie mit role="status" und LEER aus. Damit liest ein
 * Bildschirmleser jede Meldung von selbst vor (Audit A-01, WCAG 4.1.3) — das
 * ist der einzige Rückmeldekanal der Kassenregeln aus Phase 3. Zwei Dinge
 * hängen daran und dürfen nicht wieder verloren gehen:
 *
 *   - machine.css darf die Tafel NICHT mit visibility oder display verbergen;
 *     das nähme sie aus dem Barrierebaum und mit ihr die Ansage.
 *   - Nach dem Ausblenden wird der Text abgeräumt (CLEAR_MS), sonst bliebe
 *     eine Wiederholung derselben Meldung stumm.
 */

/** Der Haken aus machine.css, Abschnitt 7. */
const SHOWN_CLASS = 'rs-message--shown';

/**
 * Standzeit einer Meldung in Millisekunden.
 *
 * 2,6 s sind länger als der längste selbsttätige Walzenhalt (2,6 s ab
 * Hebelzug) und damit lang genug, um im Spielfluss gelesen zu werden, ohne die
 * Gewinnlinie in die nächste Runde hinein zu verdecken.
 */
const SHOW_MS = 2600;

/**
 * Wie lange nach dem Ausblenden gewartet wird, bevor der Text aus der Tafel
 * genommen wird.
 *
 * Muss mindestens so lang sein wie die Überblendung --ck-duration-base
 * (220 ms, tokens.css:241) — sonst stünde die Tafel schon leer da, während sie
 * noch ausblendet. 400 ms sind die Überblendung plus Reserve.
 *
 * Warum überhaupt abgeräumt wird: die Tafel ist seit Phase „Audit-Nachlauf"
 * ein Live-Bereich (role="status", Cabinet.html). Bliebe der alte Text stehen,
 * läse ihn ein Bildschirmleser im Lesemodus als stehende Meldung vor, und
 * dieselbe Meldung ein zweites Mal wäre für den Live-Bereich keine Änderung
 * mehr und bliebe unangesagt.
 */
const CLEAR_MS = 400;

/**
 * Die erlaubten Meldungen und ihr Platz im dataset.
 *
 * Eine feste Liste, kein freier Text: so kann keine Stelle im Code versehentlich
 * einen Text erfinden, der nicht aus der Sprachdatei kommt.
 */
const TEXT_KEYS = Object.freeze({
	insufficient: 'rsTextInsufficient',
	invalid: 'rsTextInvalid',
	capped: 'rsTextCapped',
	void: 'rsTextVoid',
	// Seit Ausbaustufe 2, Phase 3: die KASSE gibt den Einwurf nicht her
	// (CONCEPT.md B.5.2). Nicht zu verwechseln mit "insufficient" — das
	// meint den GERÄTEKREDIT und damit den Einsatz, nicht den Einwurf.
	nocash: 'rsTextNocash',
});

/**
 * Das Meldungsschild eines Gehäuses.
 */
export class MessageBoard {
	/**
	 * @param {?HTMLElement} element das .rs-message, oder null
	 */
	constructor(element) {
		// Fehlt das Schild, tut diese Klasse gar nichts — genau wie
		// findNixieGroup() lieber null liefert, als das Spiel anzuhalten. Ein
		// fehlendes Hinweisschild ist kein Grund, einen Automaten stillzulegen.
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
	 * @param {'insufficient'|'invalid'|'capped'|'void'|'nocash'} key
	 * @returns {void}
	 */
	show(key) {
		if (this.element === null) {
			return;
		}

		const datasetKey = TEXT_KEYS[key];
		if (datasetKey === undefined) {
			console.error(`[reel-slot] Unbekannte Meldung: ${String(key)}`);
			return;
		}

		const text = this.element.dataset[datasetKey];
		if (typeof text !== 'string' || text === '') {
			// Das Markup bringt den Text nicht mit. Lieber schweigen als eine
			// leere Tafel einblenden.
			console.error(`[reel-slot] Am Meldungsschild fehlt data-rs-text-${key}.`);
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
		// CLEAR_MS. Steht ohnehin nichts da, wird auch kein Zeitgeber
		// gestartet: hide() wird von wallet.js bei jeder Änderung des
		// Gerätekredits gerufen, meistens ohne dass etwas stünde.
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

		// CONCEPT.md Phase 9 verlangt sauberes Aufräumen JEDES Zeitgebers.
		// hide() hat eben einen bestellt; er wird hier abbestellt und die
		// Tafel sofort abgeräumt.
		this.clearWipeTimer();
		if (this.element !== null) {
			this.element.textContent = '';
		}
	}
}

export default MessageBoard;
