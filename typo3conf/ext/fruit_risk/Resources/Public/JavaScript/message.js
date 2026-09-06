/**
 * FruitRisk – die Tafel
 * =======================
 *
 * Die Tafel über dem Sichtfeld, nach Art der alten Meldeschilder. Phase F4b
 * hat sie verborgen ins Markup gelegt und den Haken .fr-message--shown
 * vorgesehen (machine.css); diese Datei füllt sie zum ersten Mal.
 *
 * Sie sitzt AUF dem Gerät, nicht daneben.
 *
 *
 * WARUM DIE TEXTE NICHT IN DIESER DATEI STEHEN
 * -----------------------------------------------
 * Alle sichtbaren Beschriftungen kommen über XLIFF, auch bei einsprachigem
 * Frontend. Die Tafel bringt ihre Texte deshalb selbst mit, als
 * data-Attribute aus der Sprachdatei:
 *
 *   data-fr-text-insufficient   GUTHABEN ZU GERING
 *   data-fr-text-invalid        BETRAG UNGÜLTIG
 *   data-fr-text-capped         KONTO VOLL
 *   data-fr-text-void           RUNDE UNGÜLTIG
 *   data-fr-text-nocash         KASSE ZU GERING
 *   data-fr-text-norng          AUSSER BETRIEB
 *   data-fr-text-broken         GERÄT GESTÖRT (Behebungslauf
 *                               REVIEW-fruitrisk-f4.md [L9]: ein Gehäuse,
 *                               dessen Markup nicht zum Spielkern passt)
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 *
 *
 * WARUM ES SICH VON ALLEIN AUSBLENDET
 * ---------------------------------------
 * Nach 2,6 Sekunden geht die Tafel von allein wieder weg; jede erneute
 * Meldung setzt die Uhr zurück. Eine Ausnahme: show(key, { sticky: true })
 * lässt den Ausblend-Zeitgeber aus. Gebraucht wird das für „AUSSER BETRIEB"
 * (norng, fruit-risk.js): ein Gehäuse ohne sichere Zufallsquelle bleibt
 * dauerhaft unbedienbar, und eine Meldung, die sich nach 2,6 Sekunden von
 * selbst wegnimmt, hinterließe ein stummes, unerklärtes Gehäuse.
 *
 *
 * DIE EINE ANPASSUNG GEGENÜBER DEN ÜBRIGEN AUTOMATEN DIESES PROJEKTS
 * -----------------------------------------------------------------------
 * An diesem Gerät ist die Tafel KEIN eigener Live-Bereich (CONCEPT.md
 * C.14.12 legt deren Zahl auf vier fest: machine, grid, credit, risk). Sie
 * ist eine gezeichnete Anzeige mit aria-hidden="true"; ihr Text muss deshalb
 * zusätzlich in den vorhandenen Bereich „machine" geschrieben werden, sonst
 * hörte ein Hilfsmittel nichts. Diese Klasse bekommt dafür einen zweiten
 * Konstruktorparameter — den einzigen Unterschied zur Bauform der übrigen
 * Automaten dieses Projekts, deren Tafel selbst role="status" trägt.
 *
 *   - machine.css darf die Tafel NICHT mit visibility oder display
 *     verbergen; das nähme sie aus dem Barrierebaum, und mit ihr — über den
 *     Umweg der Zweiteilung — nichts Zusätzliches, aber es wäre trotzdem
 *     falsch.
 *   - Nach dem Ausblenden wird der sichtbare Text abgeräumt (CLEAR_MS),
 *     sonst bliebe eine Wiederholung derselben Meldung optisch stumm.
 *   - Der Live-Bereich „machine" wird SOFORT gefüllt (immediate: true), denn
 *     eine Meldung ist eine Auskunft auf eine Handlung, die gerade
 *     geschehen ist — während sie 2,6 Sekunden sichtbar steht, ist sie
 *     längst angesagt.
 */

/** Der Haken aus machine.css. */
const SHOWN_CLASS = 'fr-message--shown';

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
 * Eine feste Liste, kein freier Text: so kann keine Stelle im Code
 * versehentlich einen Text erfinden, der nicht aus der Sprachdatei kommt.
 */
const TEXT_KEYS = Object.freeze({
	insufficient: 'frTextInsufficient',
	invalid: 'frTextInvalid',
	capped: 'frTextCapped',
	void: 'frTextVoid',
	nocash: 'frTextNocash',
	norng: 'frTextNorng',
	broken: 'frTextBroken',
});

/**
 * Die Tafel eines Gehäuses.
 */
export class MessageBoard {
	/**
	 * @param {?HTMLElement} element das .fr-message, oder null
	 * @param {?import('./announce.js').LiveRegion} region der Live-Bereich
	 *        „machine", oder null. Die Tafel trägt aria-hidden und wird
	 *        deshalb NICHT selbst angesagt; ihr Text reist durch diesen
	 *        Bereich (CONCEPT.md C.14.12). Übergeben und nicht selbst
	 *        gesucht: es gibt je Gehäuse genau einen, und angelegt wird er
	 *        in fruit-risk.js.
	 */
	constructor(element, region = null) {
		// Fehlt die Tafel, tut diese Klasse gar nichts — ein fehlendes
		// Hinweisschild ist kein Grund, einen Automaten stillzulegen.
		this.element = element;
		this.region = region;

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
	 * @param {'insufficient'|'invalid'|'capped'|'void'|'nocash'|'norng'|'broken'} key
	 * @param {{sticky?: boolean}} [options] sticky unterdrückt den
	 *        Ausblend-Zeitgeber – für eine Meldung, die stehen bleiben muss,
	 *        siehe Dateikopf.
	 * @returns {void}
	 */
	show(key, { sticky = false } = {}) {
		if (this.element === null) {
			return;
		}

		const datasetKey = TEXT_KEYS[key];
		if (datasetKey === undefined) {
			console.error(`[fruit-risk] Unbekannte Meldung: ${String(key)}`);
			return;
		}

		const text = this.element.dataset[datasetKey];
		if (typeof text !== 'string' || text === '') {
			// Das Markup bringt den Text nicht mit. Lieber schweigen als
			// eine leere Tafel einblenden.
			console.error(`[fruit-risk] An der Tafel fehlt data-fr-text-${key}.`);
			return;
		}

		// Ein noch laufendes Abräumen abbestellen: sonst nähme es den
		// gerade gesetzten Text gleich wieder weg.
		this.clearWipeTimer();

		this.element.textContent = text;
		this.element.classList.add(SHOWN_CLASS);
		this.current = key;

		// Dieselbe Meldung noch einmal, für Hilfsmittel — SOFORT und nicht
		// entprellt: eine Meldung ist eine Auskunft auf eine Handlung, die
		// gerade geschehen ist. Während sie 2,6 Sekunden steht, ist sie
		// längst angesagt.
		this.region?.say(text, { immediate: true });

		this.clearTimer();
		if (!sticky) {
			this.timer = globalThis.setTimeout(() => {
				this.timer = 0;
				this.hide();
			}, SHOW_MS);
		}
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
		this.region?.clear();

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
	 * Räumt die Zeitgeber ab. Wird beim Verlassen der Seite gerufen.
	 *
	 * Der Live-Bereich selbst wird NICHT hier zerstört — er gehört
	 * fruit-risk.js, das ihn allen Modulen reicht.
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
