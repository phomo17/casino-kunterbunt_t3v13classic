/**
 * Blackjack – die Klangzuordnung dieses Tisches
 * ================================================
 *
 * Die STIMME dieses Geräts. Das Site Package liefert drei Ebenen, und diese
 * Datei ist die vierte:
 *
 *   sound.js       WIE aus einer Tonfrequenz ein Klang entsteht.
 *   sound-kit.js   WIE eine Münze, ein Metallanschlag, eine Registrierkasse
 *                  klingt.
 *   idle-noise.js  WIE ein ruhendes Gerät brummt.
 *   diese Datei    WANN an einem Kartentisch etwas zu hören ist.
 *
 * ALLES ENTSTEHT AUS TONFREQUENZEN IM BROWSER
 * ---------------------------------------------
 * Keine Audiodatei, kein Netzzugriff, keine Melodie, kein Sample, nichts nach
 * Gehör Nachgebautes (CONCEPT.md B.3 Nr. 11).
 *
 * EHRLICH, NICHT SPANNUNGSSTEIGERND (B.7, ausdrückliche Vorgabe des
 * Auftraggebers): jeder Klang gehört zu etwas, das wirklich passiert. Kein
 * hervorgehobener Beinahe-Treffer, keine Verlustrunde, die wie ein Gewinn
 * klingt, kein Klang für ein Ereignis, das es nicht gibt.
 *
 *
 * DIE KLANGZUORDNUNG (jeweils mit key/minGap, damit sich nichts stapelt)
 * -----------------------------------------------------------------------
 *   Ereignis                       Baustein                          key
 *   Chip auf den Setzkreis gelegt  metal({pitch: 0.55})              bj-chip-place
 *   Chip zurückgenommen            metal({pitch: 0.83, gain: 0.7})   bj-chip-remove
 *   Karte wird gegeben             sound.noise() (kurzes Wischen)    bj-card-deal
 *   Karte des Gebers aufgedeckt    sound.noise() (kürzer, heller)    bj-card-flip
 *   Neu gemischt                   sheet() + ratchet()               bj-shuffle (+ …-ratchet)
 *   Blatt überkauft                sheet() (absteigendes Rutschen)   bj-bust
 *   Blackjack                      countStep()-Kette, dann coinCascade  bj-blackjack (+ …-count)
 *   Hand gewonnen                  coinCascade()                     bj-payout
 *   Patt                           metal({pitch: 0.7, gain: 0.6})    bj-push
 *   Hand verloren                  sheet()                           bj-loss
 *   CASH OUT                       cashRegister()                    bj-cashout
 *   Leerlauf                       IdleNoise                         eigene interne Schlüssel
 *
 * WARUM „BLACKJACK" UND „ÜBERKAUFT" NICHT ÜBER onResult() LAUFEN
 * -------------------------------------------------------------------
 * onResult({net}) kennt nur die FINANZIELLE Summe einer Runde und kann daraus
 * ausschließlich Gewinn/Verlust/Patt ableiten (net > 0 / < 0 / === 0) — genau
 * dieselben drei Antworten, die roulette.js aus seinem eigenen onResult()
 * kennt. Ein Blackjack (immer ein Gewinn) und ein Überkauf (immer ein
 * Verlust) sind darin nicht von einer gewöhnlichen Gewinn- bzw. Verlustrunde
 * zu unterscheiden. Deshalb trägt onHand({outcome}) diese zwei Sonderfälle
 * EIGENSTÄNDIG, für genau die zwei Ausgänge, die aus net allein nicht
 * hervorgehen — 'win', 'push' und die Verlustform bleiben bewusst
 * onResult() vorbehalten, damit jedes der zwölf Klangereignisse dieser Datei
 * genau eine zuständige Funktion hat und keine zwei Funktionen um denselben
 * Klang wetteifern.
 *
 * DIE BLACKJACK-FOLGE LÄUFT ÜBER EINE ECHTE setTimeout-KETTE, NICHT ÜBER
 * MEHRERE at-WERTE IN EINEM AUFRUF
 * ------------------------------------------------------------------------
 * sound.js prüft den Mindestabstand (minGap) über die ECHTE Aufrufzeit
 * (ctx.currentTime), nicht über den geplanten at-Zeitpunkt. Eine Schleife,
 * die alle Schritte auf einmal mit verschiedenen at aufruft, scheitert
 * deshalb bis auf den ersten Aufruf sofort an minGap. Das ist beim
 * Roulette-Tisch empirisch bestätigt worden (DECISIONS.md, C3e) und wird
 * hier nicht noch einmal falsch gemacht. Aus demselben Grund tragen sheet()
 * und der anschließende ratchet() in onShuffle() ZWEI verschiedene
 * Schlüssel: zwei synchron aufeinanderfolgende Aufrufe mit demselben
 * Schlüssel und einer minGap größer 0 würden sich sonst gegenseitig
 * blockieren, weil allow() den Abstand zur letzten ECHTEN Aufrufzeit prüft,
 * nicht zum geplanten at.
 *
 * WOHER DIESE DATEI IHRE EREIGNISSE BEKOMMT
 * --------------------------------------------
 * blackjack.js reicht sie herein — genau so, wie es roulette.js mit
 * sound-roulette.js tut. Es gibt keine eigene Beobachtung des Dokuments.
 *
 * onDeal(anzahlKarten) SPIELT EINE KARTE JE TATSÄCHLICH GEGEBENER KARTE, in
 * einer setTimeout-Kette mit rund 140 ms Abstand — vier Karten beim
 * Austeilen klingen dann wie vier Karten und nicht wie ein Knall. Wer die
 * Bewegung gedrosselt hat (prefers-reduced-motion), bekommt die Kette OHNE
 * Abstände als einen einzigen, etwas volleren Klang: die Kette ist eine
 * Bewegung in der Zeit, und die wird gedrosselt wie jede andere.
 *
 * DER TON-SCHALTER wird von dieser Datei bedient (Klick auf [data-bj-sound],
 * sound.toggle(), aria-pressed und data-bj-sound-on nachführen, BEIDE am
 * Schalter selbst — nicht an der Tischwurzel, siehe SoundSwitch.html) — sie
 * ist damit der einzige Schreiber dieser beiden Punkte.
 *
 * AUTOPLAY-SPERRE
 * -----------------
 * sound.unlock() und idle.start() werden ausschließlich aus einem Zuhörer
 * für ein ECHTES Ereignis gerufen (event.isTrusted === true), einmal auf der
 * Tischwurzel angemeldet (pointerdown UND keydown).
 *
 * ABRÄUMEN
 * ---------
 * destroy() beendet den Leerlauf, räumt alle Zeitgeber ab, meldet alle
 * Zuhörer ab (einschließlich des eigenen pagehide-Zuhörers, nach demselben
 * Muster wie table-controls.js).
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import { metal, ratchet, sheet, cashRegister, countStep, coinCascade } from '@phomo17/casino-startpage/sound-kit.js';
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';

/** Abstand zwischen zwei gegebenen Karten in einer Kette, in Millisekunden. */
const DEAL_STEP_MS = 140;

/** Wie viele Zählschritte die Blackjack-Fanfare macht — genau drei, wie geplant. */
const BLACKJACK_COUNT_CALLS = 3;

/** Abstand zwischen zwei Zählschritten der Blackjack-Fanfare, in Millisekunden. */
const BLACKJACK_COUNT_STEP_MS = 90;

/**
 * Ob „Bewegung reduzieren" aktiv ist — dieselbe plaine Abfrage wie in
 * blackjack.js/roulette.js.
 * @returns {boolean}
 */
function reducedMotionActive() {
	return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Verdrahtet den Klang genau eines Tisches.
 *
 * @param {Element} root das [data-ck-table]
 * @param {{bank: import('@phomo17/casino-startpage/table-buyin.js').TableBank}} parts
 * @returns {{
 *   onChipPlace: function(): void,
 *   onChipRemove: function(): void,
 *   onDeal: function(number): void,
 *   onFlip: function(): void,
 *   onShuffle: function(): void,
 *   onHand: function({outcome: string}): void,
 *   onResult: function({net: number}): void,
 *   onCashOut: function(): void,
 *   setBusy: function(boolean): void,
 *   destroy: function(): void,
 * }}
 */
export function connectSound(root, parts) {
	const { bank } = parts ?? {};

	const switchEl = root.querySelector('[data-bj-sound]');
	const idle = new IdleNoise();

	let dealTimer = 0;
	let blackjackTimer = 0;
	let destroyed = false;

	/** @returns {void} */
	function clearDealTimer() {
		if (dealTimer !== 0) {
			globalThis.clearTimeout(dealTimer);
			dealTimer = 0;
		}
	}

	/** @returns {void} */
	function clearBlackjackTimer() {
		if (blackjackTimer !== 0) {
			globalThis.clearTimeout(blackjackTimer);
			blackjackTimer = 0;
		}
	}

	/** Ein Chip wird auf den Setzkreis gelegt. @returns {void} */
	function onChipPlace() {
		metal({ key: 'bj-chip-place', minGap: 0.05, pitch: 0.55 });
	}

	/** Ein Chip wird vom Setzkreis zurückgenommen. @returns {void} */
	function onChipRemove() {
		metal({ key: 'bj-chip-remove', minGap: 0.05, pitch: 0.83, gain: 0.7 });
	}

	/**
	 * Eine Karte wird gegeben — ein kurzes Wischen über Filz.
	 * @returns {void}
	 */
	function dealSchritt() {
		sound.noise({
			key: 'bj-card-deal',
			minGap: 0.05,
			duration: 0.05,
			rate: 1.8,
			gain: 0.14,
			filter: { type: 'highpass', freq: 3800, q: 0.8 },
		});
	}

	/**
	 * anzahlKarten Karten werden ausgeteilt. Ohne gedrosselte Bewegung eine
	 * setTimeout-Kette mit rund 140 ms Abstand je Karte; mit gedrosselter
	 * Bewegung EIN einziger, etwas voller Klang (die Kette ist eine Bewegung
	 * in der Zeit und wird gedrosselt wie jede andere).
	 * @param {number} anzahlKarten
	 * @returns {void}
	 */
	function onDeal(anzahlKarten) {
		const n = Math.max(0, Math.trunc(Number(anzahlKarten) || 0));
		if (n === 0) {
			return;
		}
		if (reducedMotionActive()) {
			sound.noise({
				key: 'bj-card-deal',
				minGap: 0.05,
				duration: 0.09,
				rate: 1.8,
				gain: 0.18,
				filter: { type: 'highpass', freq: 3800, q: 0.8 },
			});
			return;
		}
		clearDealTimer();
		let i = 0;
		const schritt = () => {
			dealTimer = 0;
			dealSchritt();
			i += 1;
			if (i < n) {
				dealTimer = globalThis.setTimeout(schritt, DEAL_STEP_MS);
			}
		};
		schritt();
	}

	/** Die verdeckte Karte des Gebers wird aufgedeckt — kürzer, heller. @returns {void} */
	function onFlip() {
		sound.noise({
			key: 'bj-card-flip',
			minGap: 0.05,
			duration: 0.035,
			rate: 2.4,
			gain: 0.15,
			filter: { type: 'highpass', freq: 6200, q: 0.8 },
		});
	}

	/**
	 * Neu gemischt: Blattrauschen, dann das Einsetzen des Schlittens. ZWEI
	 * Schlüssel (siehe Dateikopf) — sonst blockiert der zweite, synchron
	 * folgende Aufruf sich selbst über minGap.
	 * @returns {void}
	 */
	function onShuffle() {
		sheet({ key: 'bj-shuffle', minGap: 0.3 });
		ratchet({ key: 'bj-shuffle-ratchet', minGap: 0.3, count: 5, tighten: 0.9 });
	}

	/**
	 * Ein Blatt ist überkauft — ein absteigendes Rutschen, dunkler und
	 * länger als die gewöhnliche Verlustrunde.
	 * @returns {void}
	 */
	function onBust() {
		sheet({ key: 'bj-bust', minGap: 0.3, duration: 0.32, from: 2200, to: 220 });
	}

	/**
	 * Ein Blackjack — drei Zählschritte in einer echten setTimeout-Kette
	 * (siehe Dateikopf, WARUM), danach eine etwas hellere Münzkaskade. Der
	 * dritte Schritt (index 2, steps 2) trifft dabei genau die oberste Sprosse
	 * der Zählleiter (countStep() rechnet rung = round(index/steps * 9)).
	 * @returns {void}
	 */
	function onBlackjack() {
		clearBlackjackTimer();
		let index = 0;
		const schritt = () => {
			blackjackTimer = 0;
			countStep({ key: 'bj-blackjack-count', minGap: 0.02, index, steps: BLACKJACK_COUNT_CALLS - 1 });
			index += 1;
			if (index < BLACKJACK_COUNT_CALLS) {
				blackjackTimer = globalThis.setTimeout(schritt, BLACKJACK_COUNT_STEP_MS);
			} else {
				coinCascade({ key: 'bj-blackjack', minGap: 0.3, gain: 1.15 });
			}
		};
		schritt();
	}

	/**
	 * Rückruf aus blackjack.js: der Ausgang EINES Blattes. Trägt
	 * ausschließlich die zwei Sonderfälle, die aus net (onResult) nicht
	 * hervorgehen — siehe Dateikopf. Jeder andere Ausgang ('win', 'push',
	 * die Verlustform) erzeugt hier bewusst KEINEN Klang, damit kein
	 * Ereignis zwei zuständige Funktionen hat.
	 * @param {{outcome: string}} detail
	 * @returns {void}
	 */
	function onHand({ outcome } = {}) {
		if (outcome === 'blackjack') {
			onBlackjack();
			return;
		}
		if (outcome === 'bust') {
			onBust();
		}
	}

	/**
	 * Rückruf aus blackjack.js: das finanzielle Ergebnis EINER Runde. Genau
	 * eine der drei einander ausschließenden Antworten klingt, nie mehr —
	 * die Ehrlichkeitszusage aus dem Dateikopf.
	 * @param {{net: number}} detail
	 * @returns {void}
	 */
	function onResult({ net } = {}) {
		const wert = Number(net) || 0;
		if (wert > 0) {
			coinCascade({ key: 'bj-payout', minGap: 0.3 });
			return;
		}
		if (wert < 0) {
			sheet({ key: 'bj-loss', minGap: 0.3 });
			return;
		}
		metal({ key: 'bj-push', minGap: 0.3, pitch: 0.7, gain: 0.6 });
	}

	/** CASH OUT — Glocke, dann die aufgezogene Schublade. @returns {void} */
	function onCashOut() {
		cashRegister({ key: 'bj-cashout', minGap: 0.25, size: 0.6 });
	}

	/** @param {{amount: number, staked: number, reason: string}} detail @returns {void} */
	function onBankNotify(detail) {
		if (detail?.reason === 'cashout') {
			onCashOut();
		}
	}
	const unsubscribeBank = typeof bank?.subscribe === 'function' ? bank.subscribe(onBankNotify) : () => {};

	/** @param {{enabled: boolean, reason: string}} detail @returns {void} */
	function paintSwitch(detail) {
		if (switchEl) {
			switchEl.setAttribute('aria-pressed', String(detail.enabled));
			switchEl.setAttribute('data-bj-sound-on', detail.enabled ? 'true' : 'false');
			const text = detail.enabled ? switchEl.dataset.textOn : switchEl.dataset.textOff;
			if (typeof text === 'string' && text !== '') {
				switchEl.setAttribute('aria-label', text);
			}
		}
	}
	const unsubscribeSwitch = sound.subscribe(paintSwitch);

	/** Der Ton-Schalter schaltet bei JEDEM Klick um — nur unlock() bleibt an eine echte Geste gebunden. @returns {void} */
	function onSwitchClick() {
		sound.toggle();
	}
	switchEl?.addEventListener('click', onSwitchClick);

	/**
	 * Die einzige unlock()-Stelle dieser Datei. Nur bei event.isTrusted,
	 * sonst bliebe ein nachgemachtes Ereignis in der Lage, einen
	 * AudioContext zu erzeugen.
	 * @param {Event} event
	 * @returns {void}
	 */
	function onUnlock(event) {
		if (event.isTrusted !== true) {
			return;
		}
		sound.unlock();
		idle.start();
	}
	root.addEventListener('pointerdown', onUnlock);
	root.addEventListener('keydown', onUnlock);

	/** @param {boolean} flag @returns {void} */
	function setBusy(flag) {
		idle.setBusy(flag === true);
	}

	/** Abräumen. Beliebig oft aufrufbar, nur die erste Ausführung wirkt. @returns {void} */
	function destroy() {
		if (destroyed) {
			return;
		}
		destroyed = true;
		globalThis.removeEventListener('pagehide', onPagehide);
		root.removeEventListener('pointerdown', onUnlock);
		root.removeEventListener('keydown', onUnlock);
		switchEl?.removeEventListener('click', onSwitchClick);
		unsubscribeSwitch();
		unsubscribeBank();
		clearDealTimer();
		clearBlackjackTimer();
		idle.destroy();
	}

	/**
	 * Derselbe pagehide-Weg wie in table-controls.js — hier für den Klang,
	 * der an keiner geteilten Stelle abgeräumt wird.
	 * @returns {void}
	 */
	function onPagehide() {
		destroy();
	}
	globalThis.addEventListener('pagehide', onPagehide);

	return Object.freeze({
		onChipPlace,
		onChipRemove,
		onDeal,
		onFlip,
		onShuffle,
		onHand,
		onResult,
		onCashOut,
		setBusy,
		destroy,
	});
}

export default connectSound;
