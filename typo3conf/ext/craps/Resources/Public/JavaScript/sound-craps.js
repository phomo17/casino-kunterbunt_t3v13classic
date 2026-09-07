/**
 * Craps – die Klangzuordnung dieses Tisches
 * ===========================================
 *
 * Die STIMME dieses Geräts. sound.js (casino_startpage) weiß, WIE ein Klang
 * aus einer Tonfrequenz entsteht; sound-kit.js weiß, wie eine Münze, ein
 * Metallanschlag, eine Klinke oder eine Registrierkasse klingt. Erst diese
 * Datei weiß, WANN am Craps-Tisch etwas zu hören ist — und genau diese
 * Zuordnung wird NICHT von einem anderen Gerät übernommen (CONCEPT.md B.7):
 * ein Würfeltisch klingt anders als ein Rad, weil er ein Schütteln in der
 * Hand, einen Aufschlag beim Liegenbleiben und einen Punktstand kennt, den
 * kein anderer Tisch dieses Hauses hat.
 *
 * ALLES ENTSTEHT AUS TONFREQUENZEN IM BROWSER
 * ---------------------------------------------
 * Keine Audiodatei, kein Netzzugriff, keine Melodie, kein Sample, nichts nach
 * Gehör Nachgebautes (B.3 Nr. 11). Jeder Klang dieser Datei ist ein Aufruf
 * von sound.js oder sound-kit.js mit einer Tonfrequenz, einer Hüllkurve und
 * einer Dauer — nichts sonst.
 *
 *
 * DIE KLANGZUORDNUNG (jeweils mit key/minGap, damit sich nichts stapelt)
 * -----------------------------------------------------------------------
 *   Ereignis                          Baustein                    key
 *   Chip aufs Tuch gelegt             metal({pitch: tief})        cr-chip-place
 *   Chip zurückgenommen               metal({pitch: höher, leiser}) cr-chip-remove
 *   Wurf beginnt (onThrow)            ratchet() (Rasseln in der Hand) cr-shake
 *   Würfel liegen (onDiceRest)        metal({pitch: hoch})        cr-dice-rest
 *   Point wird gesetzt (point-set)    metal({pitch: tief, laut})  cr-puck
 *   Seven-out (seven-out)             sheet() (das Abräumen)      cr-sevenout
 *   Gewinn (credited > staked)        coinCascade()               cr-payout
 *   Teilrückgabe (0 < credited <= staked) coin()                  cr-partial
 *   Verlust mit Einsatz               sheet()                     cr-loss
 *   CASH OUT (bank, reason: cashout)  cashRegister()               cr-cashout
 *
 * EHRLICH, NICHT SPANNUNGSSTEIGERND (B.7, ausdrückliche Vorgabe des
 * Auftraggebers): jeder Klang gehört zu etwas, das wirklich passiert. Kein
 * hervorgehobener Beinahe-Treffer, keine Verlustrunde, die wie ein Gewinn
 * klingt, kein Klang für ein Ereignis, das es nicht gibt. onResult() spielt
 * deshalb aus den vier sich gegenseitig ausschließenden Geldantworten (kein
 * Einsatz, Gewinn, Teilrückgabe, Verlust) IMMER GENAU EINE, nie mehr — als
 * eine einzige if/else-if-Kette, nicht als vier unabhängige if. Das
 * Ereignisgeräusch (Puck, Seven-out) ist davon unabhängig und kommt VOR der
 * Geldantwort, nicht statt ihrer: der Point kann auch stehen, ohne dass ein
 * Einsatz lag, und das Stehen selbst ist ein eigenes, wirklich stattfindendes
 * Ereignis.
 *
 *
 * KEIN DAUERKLANG — UND WARUM DAS EIN UNTERSCHIED ZUM RAD IST
 * ----------------------------------------------------------------
 * Der Roulette-Tisch hält zwei Dauerklänge (Radscheibe, Kugel), weil er zwei
 * laufende Körper mit einer hörbar wechselnden Geschwindigkeit hat. Dieser
 * Tisch hält KEINEN: die Würfelansicht (dice-view.js) bleibt in dieser Phase
 * unangetastet und hat keinen Bild-für-Bild-Rückruf, an dem ein Poltern
 * hängen könnte. Ein Rasseln beim Wurfbeginn und ein Aufschlag beim
 * Liegenbleiben sind zwei echte, punktuelle Ereignisse; ein nachgeschobenes
 * Poltern ohne Bezug zur tatsächlichen Physik wäre erfunden — genau die Art
 * Klang, die dieses Haus nicht baut. data-cr-sound-sustained an der
 * Tischwurzel wird deshalb einmal beim Anlegen auf '0' gesetzt und ändert
 * sich nie wieder; er ist der Nachweis, dass hier nichts hängen bleibt, kein
 * Zähler eines tatsächlich laufenden Dauerklangs.
 *
 *
 * WARUM "WÜRFEL LIEGEN" EIN EINZIGER ANSCHLAG IST, NICHT ZWEI
 * -------------------------------------------------------------
 * Der Plantext beschreibt den Aufschlag als "zwei kurze metal()" — ABWEICHUNG
 * hier zu EINEM metal()-Aufruf je onDiceRest(). Grund: sound.js drosselt
 * einen Klangschlüssel über den Abstand zur letzten ECHTEN Aufrufzeit
 * (ctx.currentTime beim Aufruf, siehe sound.js, allow()), nicht über einen
 * geplanten at-Versatz innerhalb eines Aufrufs. Zwei metal()-Aufrufe mit
 * demselben Schlüssel im selben Augenblick ließen den zweiten durch minGap
 * verschluckt zurück — ein Klang, der nur manchmal zu hören wäre, wäre
 * unehrlicher als ein sauberer einzelner. Außerdem meldet dice-view.js über
 * onRest() ohnehin nur EIN Ereignis, sobald BEIDE Würfel stillstehen
 * (wurfBisGueltig()); wann welcher der beiden einzeln zur Ruhe kam, weiß
 * diese Datei gar nicht und dürfte es sich folglich auch nicht ausdenken.
 * → DECISIONS.md.
 *
 *
 * DER TON-SCHALTER
 * -----------------
 * [data-cr-sound] (Table/Craps/SoundSwitch.html) meldet sich hier an.
 * sound.subscribe() führt aria-pressed am Schalter UND den Messpunkt
 * data-cr-sound-on an der Tischwurzel nach — auch wenn eine ANDERE
 * Registerkarte umschaltet (dasselbe "reason: 'remote'" wie bei jedem
 * anderen Ton-Schalter dieses Hauses). data-text-on/-off liefern den
 * vollständigen Satz ("Ton ist an, ausschalten"/"Ton ist aus, einschalten")
 * für aria-label — er ENTHÄLT den sichtbaren Text "Ton" und verletzt damit
 * WCAG 2.5.3 nicht.
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
 * nachgemachter click allein durchläuft diesen Weg nie. sound.toggle() selbst
 * schaltet trotzdem bei JEDEM Klick um — nur das Anlegen des Kontexts bleibt
 * an die echte Geste gebunden.
 *
 *
 * ABRÄUMEN
 * ---------
 * destroy() meldet alle Zuhörer wieder ab (Ton-Schalter, Bank, pointerdown,
 * keydown, den eigenen pagehide-Zuhörer), beendet den Leerlauf und entfernt
 * die beiden Messpunkte dieser Datei wieder. Beliebig oft aufrufbar, nur die
 * erste Ausführung wirkt. Diese Datei meldet pagehide SELBST an — der Klang
 * wird an keiner geteilten Stelle abgeräumt (dieselbe Bauart wie
 * roulette/…/sound-roulette.js).
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

import { sound } from '@phomo17/casino-startpage/sound.js';
import { coin, coinCascade, metal, sheet, ratchet, cashRegister } from '@phomo17/casino-startpage/sound-kit.js';
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';

/**
 * Verdrahtet den Klang genau eines Tisches.
 *
 * @param {Element} root das [data-ck-table]
 * @param {{bank: import('@phomo17/casino-startpage/table-buyin.js').TableBank}} parts
 * @returns {{
 *   onThrow: function(): void,
 *   onDiceRest: function(): void,
 *   onResult: function({event: string, hadBet: boolean, credited: number, staked: number}): void,
 *   setBusy: function(boolean): void,
 *   destroy: function(): void,
 * }}
 */
export function connectSound(root, parts) {
	const { bank } = parts ?? {};

	const switchEl = root.querySelector('[data-cr-sound]');
	const idle = new IdleNoise();

	let destroyed = false;

	// Kein Dauerklang an diesem Tisch — siehe Dateikopf. Der Messpunkt wird
	// einmal gesetzt und nie wieder verändert; er ist der Nachweis, nicht ein
	// laufender Zähler.
	root.setAttribute('data-cr-sound-sustained', '0');

	/** Der Wurf beginnt: das Rasseln der Würfel in der Hand, einmal. @returns {void} */
	function onThrow() {
		ratchet({ key: 'cr-shake', minGap: 0.4, count: 5, tighten: 0.92, pitch: 0.7, gain: 0.9 });
	}

	/** Die Würfel liegen: ein Aufschlag. Siehe Dateikopf, "Würfel liegen". @returns {void} */
	function onDiceRest() {
		metal({ key: 'cr-dice-rest', minGap: 0.1, pitch: 1.2 });
	}

	/**
	 * Rückruf aus craps.js: das Ergebnis EINES Wurfs. event kommt aus
	 * round-craps.js/CrapsRound (dieselben sechs Werte wie in craps.js,
	 * ereignisSatz()): 'natural', 'craps', 'point-set', 'point-made',
	 * 'seven-out', 'roll'. Nur zwei davon haben ein eigenes Klangereignis;
	 * die übrigen vier melden sich ausschließlich über die Geldantwort.
	 * @param {{event: string, hadBet: boolean, credited: number, staked: number}} ergebnis
	 * @returns {void}
	 */
	function onResult({ event, hadBet, credited, staked }) {
		if (event === 'point-set') {
			// Der Puck wird umgelegt — hörbar, unabhängig davon, ob überhaupt
			// ein Einsatz lag (Dateikopf, "Ehrlich, nicht spannungssteigernd").
			metal({ key: 'cr-puck', minGap: 0.05, pitch: 0.45, gain: 0.8 });
		} else if (event === 'seven-out') {
			// Das Abräumen des Points.
			sheet({ key: 'cr-sevenout', minGap: 0.3 });
		}

		// Die Geldantwort: GENAU eine der vier sich ausschließenden Antworten,
		// als eine einzige if/else-if-Kette (Prüfung S-7) — nie vier
		// unabhängige if, die theoretisch auch zusammen zuträfen.
		if (!hadBet) {
			// Kein Einsatz lag am Tuch — es ist finanziell nichts passiert,
			// also klingt auch nichts (Ehrlichkeitszusage).
		} else if (credited > staked) {
			coinCascade({ key: 'cr-payout', minGap: 0.3 });
		} else if (credited > 0) {
			coin({ key: 'cr-partial', minGap: 0.2 });
		} else {
			sheet({ key: 'cr-loss', minGap: 0.3 });
		}
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
		root.setAttribute('data-cr-sound-on', detail.enabled ? '1' : '0');
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
			metal({ key: 'cr-chip-place', minGap: 0.05, pitch: 0.55 });
		} else if (detail.reason === 'return') {
			metal({ key: 'cr-chip-remove', minGap: 0.05, pitch: 0.83, gain: 0.7 });
		} else if (detail.reason === 'cashout') {
			cashRegister({ key: 'cr-cashout', minGap: 0.25, size: 0.6 });
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
		idle.destroy();
		root.removeAttribute('data-cr-sound-sustained');
		root.removeAttribute('data-cr-sound-on');
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
		onThrow,
		onDiceRest,
		onResult,
		setBusy,
		destroy,
	});
}

export default connectSound;
