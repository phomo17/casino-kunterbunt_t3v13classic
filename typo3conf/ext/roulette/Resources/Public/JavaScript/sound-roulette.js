/**
 * Roulette – die Klangzuordnung dieses Tisches
 * =============================================
 *
 * Die STIMME dieses Geräts. sound.js (casino_startpage) weiß, WIE ein Klang
 * aus einer Tonfrequenz entsteht; sound-kit.js weiß, wie eine Münze, ein
 * Metallanschlag oder eine Registrierkasse klingt. Erst diese Datei weiß,
 * WANN am Roulette-Tisch etwas zu hören ist — und genau diese Zuordnung wird
 * NICHT von einem anderen Gerät übernommen (CONCEPT.md B.7): ein Roulette
 * klingt anders als ein Automat, weil es ein laufendes Rad, eine Kugel, die
 * über die Rillen springt, und einen Moment hat, in dem sie liegen bleibt.
 *
 * ALLES ENTSTEHT AUS TONFREQUENZEN IM BROWSER
 * ---------------------------------------------
 * Keine Audiodatei, kein Netzzugriff, keine Melodie, kein Sample, nichts
 * nach Gehör Nachgebautes (B.3 Nr. 11). Jeder Klang dieser Datei ist ein
 * Aufruf von sound.js oder sound-kit.js mit einer Tonfrequenz, einer
 * Hüllkurve und einer Dauer — nichts sonst.
 *
 *
 * DIE KLANGZUORDNUNG (jeweils mit key/minGap, damit sich nichts stapelt)
 * -----------------------------------------------------------------------
 *   Ereignis                    Baustein                    key
 *   Chip aufs Tuch gelegt       metal({pitch: tief})        ro-chip-place
 *   Chip zurückgenommen         metal({pitch: höher, leiser}) ro-chip-remove
 *   "Nichts geht mehr"          sound.sequence() (2 Klopfer) ro-nogomore
 *   Radscheibe dreht            sound.sustain() (Dauerklang) — kein key, siehe unten
 *   Kugel auf der Laufbahn      sound.sustain() (Dauerklang) — kein key, siehe unten
 *   Rillenstoß                  sound.noise()                ro-fret
 *   Rautentreffer                metal({pitch: tief, laut})   ro-deflector
 *   Kugel liegt                 ratchet() (3 enger werdend)  ro-ball-rest
 *   Gewinn wird ausgezählt       countStep() (je Zählschritt) ro-count
 *   Auszahlung                  coinCascade()                ro-payout
 *   Verlust                     sheet()                      ro-loss
 *   CASH OUT                    cashRegister()                ro-cashout
 *
 * EHRLICH, NICHT SPANNUNGSSTEIGERND (B.7, ausdrückliche Vorgabe des
 * Auftraggebers): jeder Klang gehört zu etwas, das wirklich passiert. Kein
 * hervorgehobener Beinahe-Treffer, keine Verlustrunde, die wie ein Gewinn
 * klingt, kein Klang für ein Ereignis, das es nicht gibt. onResult() spielt
 * deshalb NUR eine der drei sich gegenseitig ausschließenden Antworten
 * (Gewinn, Verlust, kein Einsatz), nie mehr als eine.
 *
 *
 * WOHER DIE RILLENSTÖSSE KOMMEN — DIE OFFENE FRAGE DES PLANS, ENTSCHIEDEN
 * --------------------------------------------------------------------------
 * wheel-view.js meldet sie über einen zusätzlichen, REIN ZÄHLENDEN Rückruf
 * onFret(zahl) in connectWheel() (ebenso onDeflector() für den einmaligen
 * Rautenstoß). Entschieden gegen "Ablesen eines vorhandenen Zählers", weil
 * wheel-physics.js schlicht keinen solchen Zähler führt und keinen bekommen
 * darf: JEDE Änderung an dieser Datei — und sei es nur ein Zähler ohne
 * Wirkung auf eine einzige Zahl — hätte den 500.000-Läufe-Gleichverteilungs-
 * nachweis entwertet, der ausdrücklich NICHT erneut gefahren wird (Auftrag,
 * Abschnitt "Der Klang"). Stattdessen liest wheel-view.js (die ANSICHT, keine
 * Physik) vor und nach jedem wheel.step() drei bereits öffentliche Werte
 * (phase, ballH, ballVh) und erkennt daran, ob und welcher Stoß eben
 * stattfand — siehe der lange Kommentar dort bei connectWheel(). Diese Datei
 * selbst weiß von alledem nichts; sie bekommt nur noch onFret(zahl) gerufen.
 * → DECISIONS.md.
 *
 *
 * ZWEI DAUERKLÄNGE, DIE IHRE TONHÖHE NACHFÜHREN — WIE, UND WARUM SO
 * ----------------------------------------------------------------------
 * sound.sustain() liefert einen Griff mit setLevel() (Lautstärke), aber KEIN
 * setFrequency(): die gemeinsame Klangerzeugung (casino_startpage/sound.js)
 * erlaubt bewusst keine laufende Tonhöhenänderung an einem Dauerklang, und
 * diese Datei erweitert sie NICHT — das wäre eine zweite, unbegründete
 * Änderung am Site Package neben data-ck-field-label, und der Auftrag
 * erlaubt ausdrücklich nur die eine.
 *
 * Die Tonhöhe "folgt" der Geschwindigkeit deshalb in kleinen, hörbaren
 * Schritten statt gleitend: alle REPITCH_MS Millisekunden wird der laufende
 * Dauerklang mit kurzem Überblenden (stop() mit Ausblendzeit, sustain() mit
 * ebenso langer Anschwellzeit) durch einen neuen mit der dann aktuellen
 * Tonhöhe ersetzt. Das ist eine bewusste, durch die geteilte Schnittstelle
 * erzwungene Vereinfachung — ob sie nach einem echten Gleiten klingt oder
 * nach hörbaren Stufen, kann nur ein menschliches Ohr beurteilen (siehe
 * test.txt).
 *
 * Beide Dauerklänge hängen an onFrame() aus connectWheel(), das GENAU
 * EINMAL je gezeichnetem Bild kommt, solange sich am Rad etwas bewegt
 * (wheel-view.js: inBewegung()). Die Radscheibe läuft nach C.6.2 fort, auch
 * wenn die Kugel längst liegt — ihr Dauerklang folgt deshalb ausschließlich
 * wheelOmega und läuft weiter, bis onMotionEnd() meldet, dass wirklich gar
 * nichts mehr in Bewegung ist. Der Kugel-Dauerklang dagegen hört auf, sobald
 * die Phase nicht mehr 'bahn', 'abstieg' oder 'rotor' ist — eine liegende
 * Kugel rollt nicht mehr.
 *
 *
 * DER TON-SCHALTER
 * -----------------
 * [data-ro-sound] (Table/Roulette/SoundSwitch.html) meldet sich hier an.
 * sound.subscribe() führt aria-pressed am Schalter UND den Messpunkt
 * data-ro-sound-on an der Tischwurzel nach — auch wenn eine ANDERE
 * Registerkarte umschaltet (dasselbe "reason: 'remote'" wie bei jedem
 * anderen Ton-Schalter dieses Hauses). data-text-on/-off liefern den
 * vollständigen Satz ("Ton ist an"/"Ton ist aus") für aria-label — er ENTHÄLT
 * den sichtbaren Text "Ton" und verletzt damit WCAG 2.5.3 nicht.
 *
 * data-ro-sound-sustained an der Tischwurzel zählt die von DIESER Datei
 * gehaltenen Dauerklang-Griffe (0, 1 oder 2) — der Nachweis dafür, dass beim
 * Abräumen keiner vergessen wird.
 *
 *
 * AUTOPLAY-SPERRE
 * -----------------
 * sound.unlock() UND idle.start() werden ausschließlich aus einem Zuhörer für
 * ein ECHTES Ereignis gerufen (event.isTrusted === true), einmal auf der
 * Tischwurzel angemeldet (pointerdown UND keydown — der Tastaturweg schaltet
 * ebenso frei wie der Zeiger). Der Ton-Schalter selbst braucht dafür KEINEN
 * eigenen isTrusted-Zuhörer: sein click kommt bei einer echten Betätigung
 * immer NACH einem echten pointerdown oder keydown auf derselben Wurzel, ein
 * nachgemachter click allein durchläuft diesen Weg nie. sound.toggle()
 * selbst schaltet trotzdem bei JEDEM Klick um — nur das Anlegen des Kontexts
 * bleibt an die echte Geste gebunden.
 *
 *
 * ABRÄUMEN
 * ---------
 * destroy() beendet beide Dauerklänge, den Leerlauf, meldet alle Zuhörer ab
 * (einschließlich des eigenen pagehide-Zuhörers, nach demselben Muster wie
 * table-controls.js) und entfernt die beiden Messpunkte dieser Datei wieder.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import { metal, ratchet, sheet, cashRegister, countStep, coinCascade } from '@phomo17/casino-startpage/sound-kit.js';
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';
import { WHEEL_DRIVE_MEAN, MAX_BALL_SPEED } from '@phomo17/roulette/wheel-physics.js';

/** Wie oft der Dauerklang seine Tonhöhe höchstens nachführt, in Millisekunden. */
const REPITCH_MS = 220;

/** An- und Ausblendzeit beim Nachführen, in Sekunden. */
const REPITCH_FADE_S = 0.14;

/** Ausblendzeit beim endgültigen Anhalten (onMotionEnd, destroy), in Sekunden. */
const STOP_FADE_S = 0.3;

/** Tonhöhe des Radscheiben-Dauerklangs: tief, leise. */
const WHEEL_BASE_HZ = 44;
const WHEEL_RANGE_HZ = 30;
const WHEEL_GAIN = 0.05;

/** Tonhöhe des Kugel-Dauerklangs: heller, folgt bis zum Stillstand ab. */
const BALL_BASE_HZ = 130;
const BALL_RANGE_HZ = 260;
const BALL_GAIN = 0.045;

/** Wie viele Zählschritte "Gewinn wird ausgezählt" höchstens macht. */
const COUNT_STEPS = 6;

/** Abstand zwischen zwei Zählschritten, in Millisekunden — echte Zeit, siehe unten. */
const COUNT_STEP_MS = 90;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Verdrahtet den Klang genau eines Tisches.
 *
 * @param {Element} root das [data-ck-table]
 * @param {{bank: import('@phomo17/casino-startpage/table-buyin.js').TableBank}} parts
 * @returns {{
 *   onFret: function(number): void,
 *   onDeflector: function(): void,
 *   onFrame: function({phase: string, wheelOmega: number, ballOmega: number, ballR: number}): void,
 *   onMotionEnd: function(): void,
 *   onRoundStart: function(): void,
 *   onBallRest: function(): void,
 *   onResult: function({hadBet: boolean, credited: number, staked: number}): void,
 *   setBusy: function(boolean): void,
 *   destroy: function(): void,
 * }}
 */
export function connectSound(root, parts) {
	const { bank } = parts ?? {};

	const switchEl = root.querySelector('[data-ro-sound]');
	const idle = new IdleNoise();

	/** @type {?ReturnType<sound.sustain>} */
	let wheelDrone = null;
	let wheelDroneFreq = 0;
	/** @type {?ReturnType<sound.sustain>} */
	let ballDrone = null;
	let ballDroneFreq = 0;
	let lastRepitch = 0;

	let countTimer = 0;
	let payoutTimer = 0;

	let destroyed = false;

	/** Zählt, wie viele der beiden Dauerklänge dieser Tisch gerade hält, und trägt es nach. @returns {void} */
	function paintSustainMeter() {
		const count = (wheelDrone !== null ? 1 : 0) + (ballDrone !== null ? 1 : 0);
		root.setAttribute('data-ro-sound-sustained', String(count));
	}

	/** @param {number} omega @returns {number} */
	function wheelFreq(omega) {
		const speed = clamp(Math.abs(omega) / WHEEL_DRIVE_MEAN, 0, 1);
		return WHEEL_BASE_HZ + WHEEL_RANGE_HZ * speed;
	}

	/** @param {number} omega @returns {number} */
	function ballFreq(omega) {
		const speed = clamp(Math.abs(omega) / MAX_BALL_SPEED, 0, 1);
		return BALL_BASE_HZ + BALL_RANGE_HZ * speed;
	}

	/**
	 * Legt den Radscheiben-Dauerklang mit einer neuen Tonhöhe an — und blendet
	 * einen laufenden zuvor aus. Siehe Dateikopf: sound.sustain() kennt kein
	 * setFrequency(), deshalb wird bei jeder hörbaren Änderung neu angelegt.
	 * @param {number} freq
	 * @returns {void}
	 */
	function setWheelDrone(freq) {
		if (wheelDrone !== null && Math.abs(freq - wheelDroneFreq) < 0.4) {
			return;
		}
		wheelDrone?.stop(REPITCH_FADE_S);
		wheelDrone = sound.sustain({
			gain: WHEEL_GAIN,
			attack: REPITCH_FADE_S,
			tones: [
				{ type: 'sine', freq, gain: 1, filter: { type: 'lowpass', freq: freq * 3, q: 0.7 } },
			],
			noise: { gain: 0.35, rate: 0.28, filter: { type: 'lowpass', freq: 220, q: 0.7 } },
		});
		wheelDroneFreq = freq;
		paintSustainMeter();
	}

	/**
	 * Dasselbe für den Kugel-Dauerklang — heller, mit einer bandpassgefilterten
	 * Rauschkomponente für das Rollen auf der Laufbahn.
	 * @param {number} freq
	 * @returns {void}
	 */
	function setBallDrone(freq) {
		if (ballDrone !== null && Math.abs(freq - ballDroneFreq) < 0.4) {
			return;
		}
		ballDrone?.stop(REPITCH_FADE_S);
		ballDrone = sound.sustain({
			gain: BALL_GAIN,
			attack: REPITCH_FADE_S,
			tones: [
				{ type: 'triangle', freq, gain: 1, filter: { type: 'bandpass', freq, q: 3 } },
			],
			noise: { gain: 0.5, rate: 0.6, filter: { type: 'bandpass', freq: freq * 1.4, q: 1.4 } },
		});
		ballDroneFreq = freq;
		paintSustainMeter();
	}

	/** @param {number} [fadeS] @returns {void} */
	function stopWheelDrone(fadeS = STOP_FADE_S) {
		if (wheelDrone === null) {
			return;
		}
		wheelDrone.stop(fadeS);
		wheelDrone = null;
		wheelDroneFreq = 0;
		paintSustainMeter();
	}

	/** @param {number} [fadeS] @returns {void} */
	function stopBallDrone(fadeS = STOP_FADE_S) {
		if (ballDrone === null) {
			return;
		}
		ballDrone.stop(fadeS);
		ballDrone = null;
		ballDroneFreq = 0;
		paintSustainMeter();
	}

	/**
	 * Rückruf aus connectWheel(): einmal je gezeichnetem Bild, solange sich am
	 * Rad etwas bewegt. Drosselt selbst auf REPITCH_MS, damit nicht 60-mal je
	 * Sekunde ein Dauerklang neu angelegt wird.
	 * @param {{phase: string, wheelOmega: number, ballOmega: number, ballR: number}} frame
	 * @returns {void}
	 */
	function onFrame(frame) {
		const ballUnterwegs = frame.phase === 'bahn' || frame.phase === 'abstieg' || frame.phase === 'rotor';

		if (!ballUnterwegs) {
			stopBallDrone();
		}

		const jetzt = Date.now();
		if (jetzt - lastRepitch < REPITCH_MS) {
			return;
		}
		lastRepitch = jetzt;

		if (frame.wheelOmega !== 0) {
			setWheelDrone(wheelFreq(frame.wheelOmega));
		}
		if (ballUnterwegs) {
			setBallDrone(ballFreq(frame.ballOmega));
		}
	}

	/** Rückruf aus connectWheel(): die Zeichenschleife hat von sich aus angehalten. @returns {void} */
	function onMotionEnd() {
		lastRepitch = 0;
		stopWheelDrone();
		stopBallDrone();
	}

	/**
	 * Rückruf aus connectWheel(): ein Rillenstoß. zahl ist der reine Zähler
	 * dieses Laufs (siehe Dateikopf) — er streut die Tonhöhe leicht, ohne dass
	 * diese Datei die Physik selbst befragt.
	 * @param {number} zahl
	 * @returns {void}
	 */
	function onFret(zahl) {
		const streuung = 1 + ((zahl % 5) - 2) * 0.03 + Math.random() * 0.04;
		sound.noise({
			key: 'ro-fret',
			minGap: 0.03,
			duration: 0.012,
			gain: 0.09,
			filter: { type: 'highpass', freq: 4200 * streuung, q: 0.8 },
		});
	}

	/** Rückruf aus connectWheel(): der einmalige Rautenstoß. @returns {void} */
	function onDeflector() {
		metal({ key: 'ro-deflector', minGap: 0.05, pitch: 0.5, gain: 1.15 });
	}

	/** "Nichts geht mehr": zwei kurze, absteigende Holzschläge. @returns {void} */
	function onRoundStart() {
		sound.sequence({
			key: 'ro-nogomore',
			minGap: 0.3,
			noises: [
				{ at: 0, duration: 0.03, attack: 0.001, gain: 0.13, filter: { type: 'bandpass', freq: 520, q: 6 } },
				{ at: 0.1, duration: 0.03, attack: 0.001, gain: 0.11, filter: { type: 'bandpass', freq: 400, q: 6 } },
			],
		});
	}

	/** Die Kugel liegt: drei enger werdende Klicks. @returns {void} */
	function onBallRest() {
		ratchet({ key: 'ro-ball-rest', minGap: 0.3, count: 3, tighten: 0.8, pitch: 0.9 });
	}

	/** @returns {void} */
	function clearCountTimer() {
		if (countTimer !== 0) {
			globalThis.clearTimeout(countTimer);
			countTimer = 0;
		}
	}

	/** @returns {void} */
	function clearPayoutTimer() {
		if (payoutTimer !== 0) {
			globalThis.clearTimeout(payoutTimer);
			payoutTimer = 0;
		}
	}

	/**
	 * Zählt einen Gewinn hoch, GEKOPPELT an echte Zeit statt an eine im Voraus
	 * geplante Folge (sound-kit.js, Kopf von countStep()): jeder Schritt ruft
	 * countStep() erst, wenn der vorige wirklich erklungen ist — ein
	 * setTimeout je Schritt, kein einziger Aufruf mit mehreren at-Werten.
	 * Grund: sound.tone()/sound.sequence() drosseln über die ECHTE Uhrzeit des
	 * Aufrufs (sound.js, allow()), nicht über den geplanten at-Zeitpunkt — ein
	 * vorausgeplanter Stapel würfe alle Schritte bis auf den ersten weg.
	 *
	 * Ohne eigene sichtbare Zähleranzeige an diesem Tisch ist "je sichtbarem
	 * Zählschritt" hier nicht wörtlich einzuhalten; es zählt eine feste,
	 * kurze Folge. Das ist eine bewusste Vereinfachung — siehe test.txt.
	 *
	 * @param {number} steps
	 * @param {function(): void} onDone
	 * @returns {void}
	 */
	function countUp(steps, onDone) {
		let index = 0;
		const step = () => {
			countTimer = 0;
			countStep({ key: 'ro-count', minGap: 0.02, index, steps });
			index += 1;
			if (index <= steps) {
				countTimer = globalThis.setTimeout(step, COUNT_STEP_MS);
			} else {
				onDone();
			}
		};
		step();
	}

	/**
	 * Rückruf aus roulette.js: das Ergebnis EINER Runde. Genau eine der drei
	 * Antworten klingt, nie mehr — die Ehrlichkeitszusage aus dem Dateikopf.
	 * @param {{hadBet: boolean, credited: number, staked: number}} ergebnis
	 * @returns {void}
	 */
	function onResult({ hadBet, credited, staked }) {
		clearCountTimer();
		clearPayoutTimer();
		if (!hadBet) {
			// Kein Einsatz lag auf dem Tuch — es ist finanziell nichts
			// passiert, also klingt auch nichts (Ehrlichkeitszusage).
			return;
		}
		// Behebung Review C3, L5: credited > 0 sagt allein nicht "Gewinn" —
		// eine Teilrückgabe (0 < credited <= staked) ist netto ein Verlust
		// und darf nicht wie ein Gewinn klingen (dieselbe Ehrlichkeitszusage,
		// jetzt auch im Klang statt nur im Text).
		if (credited > staked) {
			countUp(COUNT_STEPS, () => {
				payoutTimer = globalThis.setTimeout(() => {
					payoutTimer = 0;
					coinCascade({ key: 'ro-payout', minGap: 0.3, count: clamp(Math.round(credited / 10), 2, 9) });
				}, 60);
			});
			return;
		}
		sheet({ key: 'ro-loss', minGap: 0.3 });
	}

	/** @param {{enabled: boolean, reason: string}} detail @returns {void} */
	function paintSwitch(detail) {
		if (switchEl) {
			switchEl.setAttribute('aria-pressed', String(detail.enabled));
			const text = detail.enabled ? switchEl.dataset.textOn : switchEl.dataset.textOff;
			if (typeof text === 'string' && text !== '') {
				switchEl.setAttribute('aria-label', text);
			}
		}
		root.setAttribute('data-ro-sound-on', detail.enabled ? '1' : '0');
	}
	const unsubscribeSwitch = sound.subscribe(paintSwitch);

	/** Der Ton-Schalter schaltet bei JEDEM Klick um — nur unlock() bleibt an eine echte Geste gebunden. @returns {void} */
	function onSwitchClick() {
		sound.toggle();
	}
	switchEl?.addEventListener('click', onSwitchClick);

	/**
	 * Die einzige unlock()-Stelle dieser Datei. Nur bei event.isTrusted, sonst
	 * bliebe ein nachgemachtes Ereignis in der Lage, einen AudioContext zu
	 * erzeugen (S-3).
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

	/** @param {{amount: number, staked: number, reason: string}} detail @returns {void} */
	function onBankNotify(detail) {
		if (detail.reason === 'place') {
			metal({ key: 'ro-chip-place', minGap: 0.05, pitch: 0.55 });
		} else if (detail.reason === 'return') {
			metal({ key: 'ro-chip-remove', minGap: 0.05, pitch: 0.83, gain: 0.7 });
		} else if (detail.reason === 'cashout') {
			cashRegister({ key: 'ro-cashout', minGap: 0.25, size: 0.6 });
		}
	}
	const unsubscribeBank = typeof bank?.subscribe === 'function' ? bank.subscribe(onBankNotify) : () => {};

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
		clearCountTimer();
		clearPayoutTimer();
		stopWheelDrone(0.05);
		stopBallDrone(0.05);
		idle.destroy();
		root.removeAttribute('data-ro-sound-sustained');
		root.removeAttribute('data-ro-sound-on');
	}

	/**
	 * Derselbe pagehide-Weg wie in table-controls.js (dort für felt/bank) —
	 * hier für den Klang, der an keiner geteilten Stelle abgeräumt wird.
	 * @returns {void}
	 */
	function onPagehide() {
		destroy();
	}
	globalThis.addEventListener('pagehide', onPagehide);

	return Object.freeze({
		onFret,
		onDeflector,
		onFrame,
		onMotionEnd,
		onRoundStart,
		onBallRest,
		onResult,
		setBusy,
		destroy,
	});
}

export default connectSound;
