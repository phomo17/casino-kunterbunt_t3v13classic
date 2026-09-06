/**
 * Coin Pusher – der Klang des Geräts
 * ================================================
 *
 * Hier steht, WANN etwas klingt. WIE ein Klang entsteht, steht in
 * casino_startpage/sound.js; WIE EINE MÜNZE KLINGT, im Baukasten
 * sound-kit.js. Drei Ebenen, und diese Datei ist die dritte — sie kennt
 * beides und wird von keiner der beiden gekannt.
 *
 *
 * SIE FASST DEN SPIELKERN NICHT AN
 * --------------------------------
 * Kein Import von Pusher, Wallet oder CoinSlot. Verbunden wird ausschließlich
 * über die DOM-Ereignisse, die Lauf 1 und die Module davor gebaut haben.
 * Diese Datei HÖRT NUR ZU: sie ändert keinen Zustand, bricht kein Ereignis ab
 * und ruft keine Methode eines anderen Moduls.
 *
 *   cp:throw    ok === true → Münze in den Schlitz
 *   cp:won      count === 1 → eine Münze fällt in die Schale
 *               count >= 2 → Münzkaskade
 *   cp:lost     seitlich weggerutscht
 *   cp:valve    nichts (B.9.3: „still und ohne Gutschrift")
 *   cp:plate    forward === true → Schub nach vorn
 *               forward === false → Rücklauf
 *   cp:coin     reason === 'ok' → Geldeinwurf
 *               reason !== 'ok' → Absage
 *   cp:cashout  moved > 0 → Auszahlung
 *   Ton-Schalter → Kippschalter
 *   Leerlauf → Brummen
 *
 *
 * DIE ZUORDNUNG — VOLLSTÄNDIG
 * ----------------------------
 * key und minGap sind die Drossel des geteilten Bausteins: gleicher
 * Schlüssel innerhalb der Sperrzeit heißt „nicht noch einmal".
 *
 * PITCH ist die einzige gerätespezifische Zahlentabelle dieser Datei: die
 * kleine Münze (Wert 1) klimpert höher als die große (Wert 10).
 *
 *
 * ZWEI BESONDERHEITEN GEGENÜBER DEN WALZENGERÄTEN, BEIDE BEGRÜNDET
 * --------------------------------------------------------------------
 * 1. DER LEERLAUF TRITT NIE ZURÜCK. An einem Walzengerät schweigen Brummen,
 *    Relais und Ticken, solange das Gerät arbeitet. Ein Münzschieber
 *    ARBEITET IMMER — die Platte fährt ununterbrochen. idle.setBusy() wird
 *    deshalb nie auf true gesetzt; das Brummen läuft durchgehend, und die
 *    Abstände zwischen Relaisklick und Ticken sind länger gewählt, damit sie
 *    neben dem Schub nicht zur Uhr werden (DECISIONS.md).
 * 2. KEIN ZÄHLKLANG, KEIN GEWINN-JINGLE, KEINE GEWINNSTUFEN. Es gibt keine
 *    Fahrt zum Hochzählen (siehe nixie.js) und keinen Treffer, der „größer"
 *    wäre als ein anderer — es fallen Münzen, mal eine, mal fünf. Der
 *    Unterschied ist die Kaskade selbst. B.7: „reich, aber ehrlich. Jeder
 *    Klang gehört zu etwas, das wirklich passiert."
 *
 *
 * DER TON-SCHALTER HÖRT AUF click UND NICHT AUF pointerdown
 * -------------------------------------------------------------
 * Dieselbe Begründung wie an den Walzengeräten: der Ton-Schalter hat keine
 * Rolle im Zeitverhalten des Spiels, das CSS kennt für ihn keinen gedrückten
 * Zustand (nur .cp-sound--on), und click ist das Ereignis, das die
 * Nutzeraktivierung zweifelsfrei erteilt.
 *
 *
 * WAS UNVERÄNDERT WEITERGILT
 * ----------------------------
 * (B.7, und der geteilte Baustein setzt es durch): ein einziger AudioContext
 * je Seite; KEIN Kontext vor der ersten echten Nutzergeste —
 * sound.unlock() wird aus einem Zuhörer für ein vertrauenswürdiges Ereignis
 * gerufen, den diese Datei in der Erfassungsphase anmeldet, damit er vor
 * allem anderen läuft; keine Konsolenausgabe; kein Übersteuern; keine
 * verworfenen Stimmen im Dauerlauf.
 *
 *
 * VERSTECKTES FENSTER
 * --------------------
 * visibilitychange hält das Brummen an und nimmt es beim Zurückkommen
 * wieder auf; pusher.js hat die Physik ohnehin schon angehalten.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Der Ton-Schalter trägt
 * seine Beschriftung aus der Sprachdatei im Markup.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import { coin, coinCascade, metal, sheet, ratchet } from '@phomo17/casino-startpage/sound-kit.js';
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';

/**
 * Tonhöhenfaktor je Münzwert. Die kleine Münze klimpert höher als die große.
 * Die einzige gerätespezifische Zahlentabelle dieser Datei.
 */
const PITCH = Object.freeze({ 1: 1.22, 2: 1.12, 5: 1.0, 10: 0.88 });

/** Der Ton-Schalter am Gehäuse. */
const SELECTOR_SOUND = '[data-cp-sound]';

/**
 * Der Klang eines Gehäuses.
 */
export class MachineSound {
	/**
	 * @param {HTMLElement} root ein .cp-machine
	 */
	constructor(root) {
		this.root = root;

		// Fehlt der Schalter, klingt der Automat trotzdem – er ist dann nur
		// nicht abschaltbar. Ein fehlendes Bedienteil legt kein Gerät still.
		this.button = root.querySelector(SELECTOR_SOUND);

		/**
		 * Die Leerlaufgeräusche GENAU DIESES Gehäuses. Deutlich längere
		 * Abstände als an den Walzengeräten (4 bis 14 s statt 2,2 bis 9 s):
		 * die Platte schiebt ununterbrochen, und ein Relaisklick im
		 * Gleichtakt mit dem Schub wäre für das Ohr eine zweite Uhr.
		 */
		this.idle = new IdleNoise({ minGapMs: 4000, maxGapMs: 14000, relayShare: 0.35 });

		/** @type {Array<{target: EventTarget, type: string, handler: function, capture: boolean}>} */
		this.bound = [];

		// Die Nutzergeste, an der die Autoplay-Sperre hängt. Erfassungsphase,
		// damit sie vor allem anderen läuft. ZWEI Wege: pointerdown für den
		// Zeiger, click für die Tastatur (event.isTrusted ist in beiden
		// Fällen die entscheidende Zeile).
		this.listen(root, 'pointerdown', (event) => this.onGesture(event), true);
		this.listen(root, 'click', (event) => this.onGesture(event), true);

		this.listen(root, 'cp:throw', (event) => this.onThrow(event));
		this.listen(root, 'cp:won', (event) => this.onWon(event));
		this.listen(root, 'cp:lost', (event) => this.onLost(event));
		this.listen(root, 'cp:plate', (event) => this.onPlate(event));
		this.listen(root, 'cp:coin', (event) => this.onCoin(event));
		this.listen(root, 'cp:cashout', (event) => this.onCashOut(event));

		this.listen(root.ownerDocument, 'visibilitychange', () => this.onVisibility());

		// click, nicht pointerdown: der Ton-Schalter hat keine Rolle im
		// Zeitverhalten des Spiels, und click erteilt die Nutzeraktivierung
		// zweifelsfrei.
		if (this.button !== null) {
			this.listen(this.button, 'click', () => this.onSwitch());
		}

		// Die eine Anmeldung beim Schalterzustand. subscribe() ruft SOFORT
		// einmal auf und bringt damit das Markup mit dem gespeicherten Wert
		// in Übereinstimmung.
		this.unsubscribe = sound.subscribe((detail) => this.paint(detail));
	}

	/**
	 * @param {EventTarget} target
	 * @param {string} type
	 * @param {function} handler
	 * @param {boolean} [capture]
	 * @returns {void}
	 */
	listen(target, type, handler, capture = false) {
		target.addEventListener(type, handler, capture);
		this.bound.push({ target, type, handler, capture });
	}

	/**
	 * Erste echte Nutzerhandlung am Gehäuse.
	 *
	 * event.isTrusted ist die entscheidende Zeile: ein nachgemachtes
	 * Ereignis erteilt in Chromium KEINE Nutzeraktivierung.
	 *
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	onGesture(event) {
		if (event.isTrusted !== true) {
			return;
		}
		sound.unlock();

		// Erst nach unlock(): vorher gibt es keinen AudioContext, und
		// sound.sustain() liefert dann null. start() ist beliebig oft
		// aufrufbar — es legt nie einen zweiten Dauerklang an.
		this.idle.start();
	}

	/**
	 * Eine Münze wird in den Einwurfschlitz geworfen.
	 *
	 * @param {CustomEvent} event cp:throw
	 * @returns {void}
	 */
	onThrow(event) {
		if (event.detail?.ok !== true) {
			return;
		}
		const pitch = PITCH[event.detail.value] ?? 1;
		coin({ pitch, body: 1, roll: 0.35, key: 'cp-throw', minGap: 0.06 });
	}

	/**
	 * Eine oder mehrere Münzen fallen vorn in die Schale.
	 *
	 * @param {CustomEvent} event cp:won
	 * @returns {void}
	 */
	onWon(event) {
		const count = Number(event.detail?.count);
		if (!Number.isFinite(count) || count <= 0) {
			return;
		}
		if (count === 1) {
			sheet({ duration: 0.16, from: 1100, to: 320, key: 'cp-tray', minGap: 0.09 });
			coin({ roll: 1, pitch: 0.95, key: 'cp-won' });
			return;
		}
		// Zwei oder mehr: EIN gemeinsames Blech der Schale plus die Kaskade.
		sheet({ duration: 0.16, from: 1100, to: 320, key: 'cp-tray', minGap: 0.09 });
		coinCascade({ count: Math.min(9, count), pitch: 0.95, key: 'cp-won', minGap: 0.2 });
	}

	/**
	 * Eine Münze rutscht seitlich weg.
	 *
	 * Dumpfer und leiser als die Schale: man hört, dass es woanders hingeht.
	 *
	 * @param {CustomEvent} event cp:lost
	 * @returns {void}
	 */
	onLost(event) {
		void event;
		sheet({ duration: 0.2, from: 760, to: 220, gain: 0.5, key: 'cp-lost', minGap: 0.25 });
	}

	/**
	 * Die Schubplatte wechselt die Richtung.
	 *
	 * @param {CustomEvent} event cp:plate
	 * @returns {void}
	 */
	onPlate(event) {
		if (event.detail?.forward === true) {
			sheet({ duration: 0.55, from: 480, to: 170, gain: 0.55, key: 'cp-plate', minGap: 0.8 });
			// Am Umschlagpunkt, wenn die Platte vorn ankommt.
			metal({ at: 0.55, pitch: 0.55, gain: 0.3, key: 'cp-plate-metal', minGap: 0.8 });
			return;
		}
		sheet({ duration: 0.45, from: 680, to: 300, gain: 0.35, key: 'cp-plate', minGap: 0.8 });
		ratchet({ count: 2, pitch: 0.8, gain: 0.4, key: 'cp-plate-ratchet', minGap: 0.8 });
	}

	/**
	 * Ein Geldeinwurf am Sockel — angenommen oder abgelehnt.
	 *
	 * Bei einer Absage: zwei dumpfe Anschläge, geräteeigene Töne, kein
	 * Metall — die Münze fällt durch, statt hineinzugehen.
	 *
	 * @param {CustomEvent} event cp:coin
	 * @returns {void}
	 */
	onCoin(event) {
		if (event.detail?.reason === 'ok') {
			coin({ roll: 0.6, key: 'cp-money' });
			return;
		}
		sound.sequence({
			key: 'cp-money-refused',
			minGap: 0.25,
			tones: [
				{ type: 'square', freq: 140, at: 0, duration: 0.07, attack: 0.002, gain: 0.16,
					filter: { type: 'lowpass', freq: 420, q: 0.8 } },
				{ type: 'square', freq: 130, at: 0.09, duration: 0.07, attack: 0.002, gain: 0.16,
					filter: { type: 'lowpass', freq: 420, q: 0.8 } },
			],
		});
	}

	/**
	 * CASH OUT: der Gerätekredit ist in die Kasse zurückgebucht.
	 *
	 * moved === 0 bleibt STILL — nichts ist geflossen.
	 *
	 * @param {CustomEvent} event cp:cashout
	 * @returns {void}
	 */
	onCashOut(event) {
		const moved = Number(event.detail?.moved);
		if (!Number.isFinite(moved) || moved <= 0) {
			return;
		}
		sheet({ key: 'cashout-tray', minGap: 0.4, duration: 0.2, from: 1000, to: 320, gain: 0.9 });
		coinCascade({ key: 'cashout', minGap: 0.4, at: 0.1, count: 6, pitch: 0.95 });
	}

	/**
	 * Der Ton-Schalter am Gehäuse.
	 *
	 * Beim Einschalten bestätigt ein kurzer, geräteeigener Klick, dass der
	 * Ton wirklich läuft. Beim Ausschalten klingt nichts.
	 *
	 * @returns {void}
	 */
	onSwitch() {
		const on = sound.toggle();
		if (on) {
			sound.unlock();
			sound.sequence({
				key: 'cp-switch',
				minGap: 0.15,
				noises: [{ duration: 0.012, attack: 0.0005, gain: 0.2,
					filter: { type: 'bandpass', freq: 2200, q: 2 } }],
				tones: [{ type: 'square', freq: 280, duration: 0.05, attack: 0.001, gain: 0.16,
					filter: { type: 'lowpass', freq: 1100, q: 0.7 } }],
			});
		}
	}

	/**
	 * Bringt den Schalter mit dem gespeicherten Zustand in Übereinstimmung.
	 *
	 * @param {{enabled: boolean, reason: string}} detail
	 * @returns {void}
	 */
	paint(detail) {
		const on = detail.enabled === true;
		this.button?.classList.toggle('cp-sound--on', on);
		this.button?.setAttribute('aria-pressed', on ? 'true' : 'false');

		if (detail.enabled !== true) {
			this.idle.stop();
		} else {
			this.idle.start();
		}
	}

	/**
	 * Das Fenster wurde versteckt oder kommt zurück.
	 *
	 * @returns {void}
	 */
	onVisibility() {
		if (this.root.ownerDocument.visibilityState === 'hidden') {
			// stopAll() blendet auch Dauerklänge aus und erwischt damit das
			// Brummen zusammen mit allem anderen.
			sound.stopAll();
			this.idle.stop();
			return;
		}
		// Beliebig oft aufrufbar: legt das Brummen neu an, wenn es
		// abgebrochen wurde, und tut nichts, wenn keine Geste vorlag oder
		// der Ton aus ist.
		this.idle.start();
	}

	/**
	 * Meldet alles ab und räumt den Zeitgeber weg.
	 *
	 * Bricht ABSICHTLICH keine Stimmen ab, die dem Kontext der ganzen Seite
	 * gehören — der Kontext gehört der Seite, das Brummen aber gehört
	 * DIESEM Gehäuse und wird deshalb ausdrücklich mit angehalten.
	 *
	 * @returns {void}
	 */
	destroy() {
		this.idle.destroy();

		this.unsubscribe?.();
		this.unsubscribe = null;

		for (const { target, type, handler, capture } of this.bound) {
			target.removeEventListener(type, handler, capture);
		}
		this.bound = [];
	}
}

/**
 * Schaltet den Klang der ganzen Seite ab und schließt den Kontext.
 *
 * Genau einmal je Seite aufzurufen, beim Verlassen — nicht je Gerät.
 *
 * @returns {void}
 */
export function shutdownSound() {
	sound.shutdown();
}

export default MachineSound;
