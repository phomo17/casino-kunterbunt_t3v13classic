/**
 * Casino Kunterbunt – die Leerlaufgeräusche eines Geräts
 * ======================================================
 *
 * CONCEPT.md B.7: „Leerlaufgeräusche: leises Brummen des Geräts, gelegentliches
 * Relaisklicken, Ticken — hörbar, aber nie aufdringlich, und abschaltbar wie
 * alles andere."
 *
 * Einbindung in einer Automaten-Extension:
 *
 *   import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';
 *   const idle = new IdleNoise();
 *   idle.start();            // nach der ersten echten Nutzergeste
 *   idle.setBusy(true);      // solange das Gerät arbeitet
 *   idle.destroy();          // beim Abräumen
 *
 * Sie kennt kein Gerät: kein Element, kein Ereignisname, kein Selektor. Das
 * Gerät sagt ihr, WANN es läuft und wann es arbeitet; sie entscheidet, WIE ein
 * ruhendes Gerät klingt. Dieselbe Aufteilung wie bei der Risiko-Leiter.
 *
 *
 * DREI GERÄUSCHE, DREI VERSCHIEDENE NATUREN
 * -----------------------------------------
 *   BRUMMEN     Ein DAUERKLANG. Es fängt nicht an und hört nicht auf, solange
 *               das Gerät eingeschaltet ist. Gebaut aus 50, 100 und 150 Hz —
 *               der Netzfrequenz und ihren ersten beiden Vielfachen. Genau so
 *               brummt ein Transformator; das ist keine Erfindung, sondern der
 *               Grund, warum alte Geräte alle ähnlich brummen.
 *   RELAISKLICK Selten und unregelmäßig. Ein Relais, das ohne erkennbaren
 *               Anlass schaltet, ist das, was ein Gerät lebendig macht.
 *   TICKEN      Häufiger, aber viel leiser: ein Zählwerk, das mitläuft.
 *
 * Brummen und Ticken zusammen ergeben einen Untergrund; der Relaisklick ist
 * das Ereignis darin. Ohne den Klick wäre es eine Klimaanlage.
 *
 *
 * WARUM ES NIE AUFDRINGLICH WIRD — DREI SPERREN
 * ---------------------------------------------
 *  1. Der Pegel ist rund ein Zehntel eines Spielklangs. Er ist da, wenn man
 *     darauf achtet, und weg, wenn man spielt.
 *  2. WÄHREND DAS GERÄT ARBEITET schweigen Klick und Ticken vollständig und
 *     das Brummen geht zurück (setBusy). Zwischen zwölf Rasten je Sekunde
 *     gehört kein Relais; es klänge wie ein Defekt.
 *  3. Der Abstand zwischen zwei Geräuschen ist ZUFÄLLIG. Ein Geräusch in
 *     festem Takt wird nach einer Minute unerträglich, weil man anfängt,
 *     darauf zu warten. Math.random() ist dafür richtig — hier wird nichts
 *     gezogen, dieselbe Begründung wie im Kopf von sound-kit.js.
 *
 *
 * DIE AUTOPLAY-SPERRE GILT AUCH HIER
 * ----------------------------------
 * start() vor der ersten echten Nutzergeste bewirkt NICHTS: sound.sustain()
 * liefert dann null, weil es keinen Kontext gibt und geben darf. Das ist kein
 * Fehlerfall, sondern der Normalfall beim Laden der Seite. Deshalb ist start()
 * beliebig oft aufrufbar und legt nie einen zweiten Dauerklang an — das Gerät
 * ruft es einfach bei jeder Nutzergeste erneut, und der erste Aufruf, der
 * greifen kann, greift.
 *
 * Dasselbe gilt nach sound.stopAll(): ein versteckter Tab bricht auch das
 * Brummen ab, der Griff meldet danach running === false, und der nächste
 * start() legt es neu an.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import { metal, ratchet } from '@phomo17/casino-startpage/sound-kit.js';

/** Lautstärke des Brummens im Ruhezustand. */
const HUM_IDLE = 0.024;

/**
 * Anteil davon, solange das Gerät arbeitet.
 *
 * Nicht null: ein Gerät, dessen Brummen beim Hebelzug verstummt, klingt, als
 * ginge es aus. Es tritt nur zurück.
 */
const HUM_BUSY_FACTOR = 0.55;

/** Anschwellzeit des Brummens in Sekunden. Es geht an wie ein Trafo, nicht wie ein Schalter. */
const HUM_ATTACK_S = 0.7;

/** Ausblendzeit beim Anhalten, in Sekunden. */
const HUM_FADE_S = 0.4;

/** Kürzester und längster Abstand zwischen zwei Leerlaufgeräuschen, in Millisekunden. */
const MIN_GAP_MS = 2200;
const MAX_GAP_MS = 9000;

/**
 * Wie oft ein Leerlaufgeräusch ein RELAIS ist und nicht ein Ticken.
 *
 * Ein Fünftel: das Ticken trägt den Untergrund, das Relais ist das Ereignis
 * darin. Umgekehrt klänge das Gerät nach Schaltschrank.
 */
const RELAY_SHARE = 0.2;

/**
 * Die Leerlaufgeräusche genau eines Geräts.
 */
export class IdleNoise {
	/**
	 * @param {{humLevel?: number, humTones?: object[], minGapMs?: number,
	 *          maxGapMs?: number, relayShare?: number, gain?: number}} [options]
	 *        Alles freiwillig. Ein Gerät, das nichts übergibt, klingt wie ein
	 *        Gerät dieses Hauses – und genau das ist der Sinn eines geteilten
	 *        Bausteins.
	 */
	constructor(options = {}) {
		this.humLevel = Number(options.humLevel) > 0 ? Number(options.humLevel) : HUM_IDLE;
		this.minGapMs = Number(options.minGapMs) > 0 ? Number(options.minGapMs) : MIN_GAP_MS;
		this.maxGapMs = Number(options.maxGapMs) > this.minGapMs
			? Number(options.maxGapMs)
			: MAX_GAP_MS;
		this.relayShare = Number.isFinite(Number(options.relayShare))
			? Math.min(1, Math.max(0, Number(options.relayShare)))
			: RELAY_SHARE;
		this.gain = Number(options.gain) > 0 ? Number(options.gain) : 1;

		/**
		 * Die Bestandteile des Brummens.
		 *
		 * 50 Hz trägt, 100 Hz gibt ihm Körper, 150 Hz macht es hörbar — eine
		 * reine Sinusschwingung bei 50 Hz geben viele Lautsprecher gar nicht
		 * wieder. Darunter ein tief gefiltertes Rauschen: das ist die Luft im
		 * Gehäuse, ohne die das Brummen nach Prüfton klingt.
		 */
		this.humTones = options.humTones ?? [
			{ type: 'sine', freq: 50, gain: 1, filter: { type: 'lowpass', freq: 160, q: 0.7 } },
			{ type: 'triangle', freq: 100, gain: 0.35, filter: { type: 'lowpass', freq: 240, q: 0.7 } },
			{ type: 'sine', freq: 150, gain: 0.12, filter: { type: 'lowpass', freq: 320, q: 0.7 } },
		];

		/** Der Griff des laufenden Brummens, oder null. */
		this.hum = null;

		/** Soll überhaupt etwas zu hören sein? */
		this.running = false;

		/** Arbeitet das Gerät gerade? */
		this.busy = false;

		/** Kennung des Zeitgebers, oder 0. Immer höchstens einer. */
		this.timer = 0;

		this.step = () => this.fire();
	}

	/**
	 * Schaltet die Leerlaufgeräusche ein.
	 *
	 * BELIEBIG OFT AUFRUFBAR. Läuft das Brummen schon, passiert nichts; ist es
	 * abgebrochen worden (versteckter Tab, Ton aus und wieder an), wird es neu
	 * angelegt. Genau deshalb darf ein Gerät es bei jeder Nutzergeste rufen,
	 * ohne mitzuzählen.
	 *
	 * @returns {boolean} true, wenn danach ein Brummen läuft
	 */
	start() {
		this.running = true;

		if (this.hum !== null && this.hum.running !== true) {
			// Der alte Griff ist tot (stopAll, Ausschalten, Tabwechsel). Ihn
			// stehen zu lassen hieße, ihn nie wieder anzulegen.
			this.hum = null;
		}

		if (this.hum === null) {
			this.hum = sound.sustain({
				gain: this.level(),
				attack: HUM_ATTACK_S,
				tones: this.humTones,
				noise: { gain: 0.06, rate: 0.35, filter: { type: 'lowpass', freq: 340, q: 0.7 } },
			});
		}

		if (this.hum === null) {
			// Noch keine Nutzergeste oder Ton aus. Kein Fehler, kein
			// Zeitgeber: ein Zeitgeber, der ins Leere feuert, wäre Arbeit ohne
			// Wirkung.
			return false;
		}

		this.arm();
		return true;
	}

	/**
	 * Schaltet sie ab: Brummen ausblenden, Zeitgeber löschen.
	 *
	 * @returns {void}
	 */
	stop() {
		this.running = false;
		this.clearTimer();
		this.hum?.stop(HUM_FADE_S);
		this.hum = null;
	}

	/**
	 * Sagt, ob das Gerät gerade arbeitet.
	 *
	 * @param {boolean} flag
	 * @returns {void}
	 */
	setBusy(flag) {
		const next = flag === true;
		if (next === this.busy) {
			return;
		}
		this.busy = next;
		this.hum?.setLevel(this.level(), 0.3);
		if (this.busy) {
			// Kein Klick und kein Ticken, solange etwas läuft. Der Zeitgeber
			// wird GELÖSCHT und nicht nur übersprungen: einer, der während des
			// ganzen Zuges weiterläuft, feuert genau in dem Augenblick, in dem
			// der Zug endet — und das wäre der eine Zeitpunkt, an dem es wie
			// eine Rückmeldung auf das Ergebnis klänge.
			this.clearTimer();
		} else if (this.running && this.hum !== null) {
			this.arm();
		}
	}

	/**
	 * Der Pegel, der jetzt gelten soll.
	 *
	 * @returns {number}
	 */
	level() {
		return this.humLevel * this.gain * (this.busy ? HUM_BUSY_FACTOR : 1);
	}

	/**
	 * Spannt den Zeitgeber für das nächste Geräusch.
	 *
	 * Immer höchstens EINER: arm() löscht zuerst den alten. Dieselbe Regel wie
	 * beim Klappern des Walzenlaufs und bei der Pause des Auto-Modus.
	 *
	 * @returns {void}
	 */
	arm() {
		this.clearTimer();
		const wait = this.minGapMs + Math.random() * (this.maxGapMs - this.minGapMs);
		this.timer = globalThis.setTimeout(this.step, wait);
	}

	/**
	 * Ein Leerlaufgeräusch, dann das nächste.
	 *
	 * @returns {void}
	 */
	fire() {
		this.timer = 0;
		if (!this.running || this.busy) {
			return;
		}

		if (Math.random() < this.relayShare) {
			// Das Relais. Hoch, hart, sehr kurz — und leise genug, dass es
			// niemanden erschreckt, der gerade nichts erwartet.
			metal({ key: 'idle-relay', minGap: 1, pitch: 2.1, gain: 0.26 * this.gain });
		} else {
			// Das Ticken eines mitlaufenden Zählwerks: ein einzelner Klick.
			ratchet({ key: 'idle-tick', minGap: 0.8, count: 1, pitch: 1.3, gain: 0.2 * this.gain });
		}

		this.arm();
	}

	/** @returns {void} */
	clearTimer() {
		if (this.timer !== 0) {
			globalThis.clearTimeout(this.timer);
			this.timer = 0;
		}
	}

	/**
	 * Räumt ab. Beim Verlassen der Seite zu rufen.
	 *
	 * ANDERS ALS DAS KLANGPULT EINES GERÄTS BRICHT DIESE KLASSE SEHR WOHL EINEN
	 * KLANG AB — nämlich genau ihren eigenen Dauerklang. Der Kontext gehört der
	 * Seite, das Brummen aber gehört DIESEM Gerät: stehen zwei Automaten auf
	 * einer Seite, brummt jeder für sich, und wenn einer abgeräumt wird, muss
	 * sein Brummen gehen und das des anderen bleiben. Ein Dauerklang, den
	 * niemand anhält, wäre ein Leck, das bis zum Verlassen der Seite hörbar
	 * bliebe.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.stop();
		this.busy = false;
	}
}

export default IdleNoise;
