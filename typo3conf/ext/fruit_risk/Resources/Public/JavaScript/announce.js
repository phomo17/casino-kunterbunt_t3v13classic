/**
 * FruitRisk – ein Live-Bereich, ein Eigentümer
 * ===============================================
 *
 * Die vier Live-Bereiche dieses Geräts (machine, grid, credit, risk) sind
 * knapp und fest; jeder braucht GENAU EINEN Eigentümer und dieselbe
 * Entprell-Regel (CONCEPT.md C.14.12). Bei den übrigen Automaten dieses
 * Projekts steckt dieselbe Entprellung mehrfach in mehreren Dateien, weil
 * dort jede Anzeige ihren eigenen Bereich hat. Hier wäre das dreimal
 * derselbe Block über zwei geteilte Bereiche (machine.js und message.js über
 * „machine"; wallet.js, bank.js und counter.js über „credit") — genau die
 * Stelle, an der zwei Schreiber sich gegenseitig überschreiben würden. Ein
 * kleines eigenes Modul löst das baulich statt durch Disziplin.
 *
 * Warum nicht im Site Package: casino_startpage kennt kein Gerät, und dieses
 * Modul ist vier Zeilen Buchführung um textContent — ein geteilter Baustein
 * dafür wäre mehr Verdrahtung als gesparter Code. Sollte ein zweites Gerät
 * dasselbe brauchen, ist das der Zeitpunkt, es zu teilen — nicht vorher.
 *
 * Diese Datei hat keinen Import.
 */

/** Ruhezeit vor einer Ansage, in Millisekunden. Eine je Gerät, nicht drei. */
const ANNOUNCE_MS = 700;

/**
 * Ein Live-Bereich des Gehäuses.
 */
export class LiveRegion {
	/**
	 * @param {?HTMLElement} element ein [data-fr-announce="…"], oder null
	 */
	constructor(element) {
		this.element = element;
		/** Laufender Zeitgeber, oder 0. */
		this.timer = 0;
		/** Wurde schon einmal angesagt? Die erste Ansage wartet nicht. */
		this.announced = false;
	}

	/** Die Satzmuster und Namen, die im Markup an diesem Bereich hängen. */
	get data() {
		return this.element?.dataset ?? {};
	}

	/**
	 * Schreibt einen Satz in den Bereich.
	 *
	 * Entprellt: während einer Zählfahrt ändert sich ein Wert dutzendfach in
	 * kurzer Folge, angesagt wird nur der Endstand. Die allererste Ansage
	 * geht ohne Wartezeit hinaus — sie fällt in den Seitenaufbau und ist der
	 * Anfangsstand, keine Änderungsmeldung.
	 *
	 * GRENZE, EHRLICH BENANNT (Behebungslauf REVIEW-fruitrisk-f4.md [L8]):
	 * `this.element.textContent === text` oben vergleicht gegen den
	 * AKTUELLEN Text des Bereichs — nicht gegen die zuletzt AUSGESAGTE
	 * Zeichenkette. Das ist nur deshalb richtig, weil jeder Aufrufer dieser
	 * Datei den Bereich beim Rundenstart über clear() leert, BEVOR die
	 * nächste say() kommt: fielen zwei Runden mit demselben Ergebnis
	 * unmittelbar hintereinander, ohne dass dazwischen geleert wird, bliebe
	 * die zweite Ansage stumm, weil der Bereich noch denselben Text trägt.
	 * Ein künftiger Aufrufer, der nicht vorher leert, muss das wissen.
	 *
	 * @param {string} text
	 * @param {{immediate?: boolean}} [options]
	 * @returns {void}
	 */
	say(text, { immediate = false } = {}) {
		if (this.element === null || this.element.textContent === text) {
			return;
		}
		this.cancel();
		if (immediate || !this.announced) {
			this.announced = true;
			this.element.textContent = text;
			return;
		}
		this.timer = globalThis.setTimeout(() => {
			this.timer = 0;
			this.element.textContent = text;
		}, ANNOUNCE_MS);
	}

	/**
	 * Leert den Bereich. Beim Rundenstart gerufen: ein leerer Text sagt
	 * nichts an, so bleibt es bei genau einer Ansage je Runde, und während
	 * des Laufs steht keine veraltete Behauptung da.
	 *
	 * ACHTUNG, EINE FALLE: say('') läuft hier mit immediate: true. Würde das
	 * Leeren entprellt, käme es nach dem Ergebnissatz an und löschte ihn.
	 *
	 * @returns {void}
	 */
	clear() {
		this.say('', { immediate: true });
	}

	/** @returns {void} */
	cancel() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
			this.timer = 0;
		}
	}

	/** @returns {void} */
	destroy() {
		this.cancel();
		if (this.element !== null) {
			this.element.textContent = '';
		}
	}
}

/**
 * Sucht einen der vier Live-Bereiche an seiner Kennung.
 *
 * @param {Element} root das Gehäuse
 * @param {'machine'|'grid'|'credit'|'risk'} name
 * @returns {LiveRegion} auch dann, wenn der Bereich fehlt — dann still
 */
export function findRegion(root, name) {
	return new LiveRegion(root.querySelector(`[data-fr-announce="${name}"]`));
}

export default LiveRegion;
