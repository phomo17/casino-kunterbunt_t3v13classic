/**
 * Coin Pusher – Einstieg
 * ====================================================
 *
 * Die einzige Datei, die das Fluid-Template über <f:asset.module> anfordert;
 * alles andere zieht sie sich über die Import-Map nach. Bewusst getrennt von
 * pusher.js: dort der Vertrag, hier die Verdrahtung mit dem Dokument. Aufbau
 * bewusst gleich zu video_slot/video-slot.js.
 *
 * Lauf 2 ERGÄNZT ZEILEN, es baut nichts um. NixieDisplay wird nicht direkt
 * importiert, sondern mittelbar über Wallet (GUTHABEN) und CoinSlot
 * (MÜNZWERT).
 *
 * In dieser Datei steht kein einziger deutscher Anzeigetext. Meldungen für
 * den Spieler kommen aus der XLIFF-Datei über das Markup; was hier steht,
 * ist eine einzige Entwicklermeldung für die Browserkonsole.
 */

import { isAvailable } from '@phomo17/coin-pusher/rng.js';
import { loadField, AutoSave } from '@phomo17/coin-pusher/store.js';
import { FieldView } from '@phomo17/coin-pusher/view.js';
import { Pusher } from '@phomo17/coin-pusher/pusher.js';
import { Lamp } from '@phomo17/coin-pusher/lamp.js';
import { MessageBoard } from '@phomo17/coin-pusher/message.js';
import { findNixie } from '@phomo17/coin-pusher/nixie.js';
import { Wallet } from '@phomo17/coin-pusher/wallet.js';
import { MoneySlot } from '@phomo17/coin-pusher/moneyslot.js';
import { CoinSlot } from '@phomo17/coin-pusher/coinslot.js';
import { Bank } from '@phomo17/coin-pusher/bank.js';
import { MachineSound, shutdownSound } from '@phomo17/coin-pusher/sound.js';

const SELECTOR_MACHINE = '.cp-machine';

/**
 * Schon verdrahtete Gehäuse. Absichtlich `let` und nicht `const`: beim
 * Zurückkommen aus dem Vor-/Zurück-Zwischenspeicher wird die Menge komplett
 * ausgetauscht, damit dieselben Elemente erneut verdrahtet werden dürfen.
 * Ein WeakSet kennt kein clear(), deshalb eine neue Menge statt einer Leerung.
 */
let wired = new WeakSet();

/** Alle laufenden Automaten dieser Seite, für das Aufräumen. */
const pushers = new Set();

/** Die zugehörigen Zeichenflächen. Getrennt, weil sie einander nicht kennen. */
const views = new Set();

/** Die zugehörigen Sicherungstakte. Ebenfalls getrennt, aus demselben Grund. */
const autoSaves = new Set();

/** Die zugehörigen Lampen der Auswurfschale. Ebenfalls getrennt. */
const lamps = new Set();

/** Die zugehörigen Meldungsschilder. Ebenfalls getrennt. */
const boards = new Set();

/** Die zugehörigen Verrechnungen (Gerätekredit). Ebenfalls getrennt. */
const wallets = new Set();

/** Die zugehörigen Einwürfe — Münzeinwurf UND Geldeinwurf. Ebenfalls getrennt. */
const slots = new Set();

/** Die zugehörigen Kassenanzeigen samt CASH OUT. Ebenfalls getrennt. */
const banks = new Set();

/** Die zugehörigen Klangpulte. Ebenfalls getrennt. */
const sounds = new Set();

/**
 * Die Röhrengruppe „IM FELD" je Automat, zusammen mit dem Gehäuse und dem
 * Zuhörer, der sie nachführt. Sie hängt an keinem eigenen Baustein: Pusher
 * sendet bei jeder Änderung des Bestands cp:coins, und mehr braucht eine
 * Anzeige nicht. Gemerkt wird das Dreigespann, weil destroy() der Gruppe
 * den Zuhörer nicht kennt und ihn sonst niemand wieder abmeldete.
 */
const fieldCounters = new Set();

/** Ist der Zuhörer fürs Seitenende schon angemeldet? */
let teardownWired = false;

/**
 * Hält alle Automaten der Seite an.
 *
 * pagehide statt unload: unload verhindert, dass der Browser die Seite in
 * seinen Vor-/Zurück-Zwischenspeicher legt, und wird in manchen Fällen gar
 * nicht mehr ausgelöst. pagehide feuert zuverlässig, auch auf Mobilgeräten.
 *
 * Reihenfolge, und hier kommt es auf jede Zeile an:
 *
 *  1. Klangpulte      zuerst. Danach kann kein Ereignis mehr einen Klang in
 *                     eine sterbende Seite planen.
 *  2. Einwürfe        (CoinSlot vor MoneySlot je Gehäuse, siehe die Menge
 *                     `slots`): keine neue Münze und kein Einwurf mehr.
 *  3. Bank            meldet nur ab und bucht NICHTS — sonst zahlte der
 *                     Gerätekredit zweimal aus.
 *  4. Lamp            Zeitgeber weg.
 *  5. AutoSave        die LETZTE Sicherung des Felds. Muss VOR dem Pusher
 *                     stehen: danach steht die Physik, und der gesicherte
 *                     Stand ist genau der, den man zuletzt gesehen hat.
 *  6. Pusher          Zeichenschleife aus.
 *  7. FieldView       Beobachter ab.
 *  8. Wallet          close(): der Gerätekredit wandert vollständig in die
 *                     Kasse zurück, der Spiegel wird gelöscht. Das Feld
 *                     bleibt, wie es ist — B.5.4. Die EINZIGE Stelle, an
 *                     der close() gerufen wird.
 *  9. MessageBoard    erst jetzt: nichts, was noch eine Meldung zeigen
 *                     könnte, ist zu diesem Zeitpunkt noch angemeldet.
 * 10. shutdownSound   alle Stimmen aus, AudioContext geschlossen. Einmal je
 *                     Seite, nicht je Gerät — die Geräte teilen sich einen
 *                     Kontext.
 *
 * @returns {void}
 */
function teardown() {
	for (const counter of fieldCounters) {
		counter.element.removeEventListener('cp:coins', counter.onCoins);
		counter.display.destroy();
	}
	fieldCounters.clear();
	for (const machineSound of sounds) {
		machineSound.destroy();
	}
	sounds.clear();
	for (const slot of slots) {
		slot.destroy();
	}
	slots.clear();
	for (const bank of banks) {
		bank.destroy();
	}
	banks.clear();
	for (const lamp of lamps) {
		lamp.destroy();
	}
	lamps.clear();
	for (const autoSave of autoSaves) {
		autoSave.destroy();
	}
	autoSaves.clear();
	for (const pusher of pushers) {
		pusher.destroy();
	}
	pushers.clear();
	for (const view of views) {
		view.destroy();
	}
	views.clear();
	for (const wallet of wallets) {
		wallet.destroy();
	}
	wallets.clear();
	for (const board of boards) {
		board.destroy();
	}
	boards.clear();
	shutdownSound();
}

/**
 * Die Seite kommt aus dem Vor-/Zurück-Zwischenspeicher zurück.
 *
 * teardown() hat beim Verlassen ALLES abgemeldet: Zuhörer, Zeitgeber,
 * Zeichenschleifen. Legt der Browser die Seite in den Zwischenspeicher, statt
 * sie zu verwerfen, kehrt beim Zurück-Knopf dasselbe DOM zurück — ein
 * Gehäuse, das vollständig aussieht und auf nichts reagiert, ohne dass
 * irgendwo eine Meldung erschiene. Genau das wäre der unangenehmste aller
 * Fehler: einer, der sich nicht meldet.
 *
 * event.persisted unterscheidet die beiden Fälle. Bei false wurde die Seite
 * frisch geladen und hat sich ohnehin selbst verdrahtet; nur bei true ist
 * hier etwas zu tun.
 *
 * @param {PageTransitionEvent} event
 * @returns {void}
 */
function onPageShow(event) {
	if (event.persisted !== true) {
		return;
	}
	wired = new WeakSet();
	bindMachines(document);
}

/**
 * Verdrahtet alle Automaten unterhalb von root.
 *
 * Findet sich nichts, passiert nichts: keine Anmeldung, kein Fehler, keine
 * Ausgabe.
 *
 * @param {Document|Element} [root]
 * @returns {number} Anzahl der verdrahteten Automaten
 */
export function bindMachines(root = document) {
	const found = root.querySelectorAll(SELECTOR_MACHINE);
	if (found.length === 0) {
		return 0;
	}

	// Ohne sichere Zufallsquelle wird nicht gespielt. Lieber ein Gerät, das
	// AUSSER BETRIEB meldet, als eines, das heimlich mit Math.random()
	// weiterwürfelt. Geprüft wird EINMAL für die ganze Seite.
	//
	// Seit Lauf 2 benutzt dieser Zweig MessageBoard.show('norng') statt die
	// Klasse und den Text von Hand zu setzen — die einzige Notlösung aus
	// Lauf 1.
	if (!isAvailable()) {
		console.error(
			'[coin-pusher] Keine sichere Zufallsquelle (crypto.getRandomValues). '
			+ 'Der Automat bleibt unbedienbar.'
		);
		for (const element of found) {
			if (wired.has(element)) {
				continue;
			}
			wired.add(element);
			new MessageBoard(element.querySelector('.cp-message')).show('norng');
		}
		return 0;
	}

	let count = 0;
	for (const element of found) {
		if (wired.has(element)) {
			continue;
		}
		wired.add(element);

		let sound = null;
		let board = null;
		let view = null;
		let pusher = null;
		let autoSave = null;
		let lamp = null;
		let wallet = null;
		let bank = null;
		let moneySlot = null;
		let coinSlot = null;
		let fieldCounter = null;
		try {
			const fieldElement = element.querySelector('.cp-field');
			if (fieldElement === null) {
				throw new Error('Kein .cp-field im Automaten gefunden.');
			}

			// Das Klangpult zuerst: es meldet in der Erfassungsphase seine
			// Gesten-Zuhörer an und hört ab dem ersten Augenblick mit. Es
			// sendet nichts.
			sound = new MachineSound(element);

			// Alle folgenden brauchen das Meldungsschild zum Melden.
			board = new MessageBoard(element.querySelector('.cp-message'));

			const { field } = loadField();
			view = new FieldView(fieldElement, field);
			pusher = new Pusher(element, field, view);
			autoSave = new AutoSave(field);
			lamp = new Lamp(element.querySelector('[data-cp-lamp]'));
			element.addEventListener('cp:won', () => lamp.trigger());

			// Die Röhrengruppe „IM FELD" zeigt, wie viele Münzen gerade
			// liegen. Der Anfangswert wird einmal gesetzt, danach führt
			// cp:coins sie nach — Pusher sendet das nur bei einer echten
			// Änderung, die Anzeige rechnet also nicht je Bild mit.
			const fieldDisplay = findNixie(element, 'feld');
			if (fieldDisplay !== null) {
				fieldDisplay.set(field.count);
				const onCoins = (event) => fieldDisplay.set(event.detail.count);
				element.addEventListener('cp:coins', onCoins);
				fieldCounter = { element, display: fieldDisplay, onCoins };
			}

			// Legt den Gerätekredit an — die EINZIGE Stelle. Muss VOR Bank
			// und MoneySlot stehen, denn beide bekommen ihn gereicht; ein
			// zweites openMachineCredit() würde werfen.
			wallet = new Wallet(element, board);
			bank = new Bank(element, wallet.machineCredit, board);
			moneySlot = new MoneySlot(element, board, wallet.machineCredit);
			coinSlot = new CoinSlot(element, wallet, pusher);

			if (fieldCounter !== null) {
				fieldCounters.add(fieldCounter);
			}
			sounds.add(sound);
			boards.add(board);
			views.add(view);
			pushers.add(pusher);
			autoSaves.add(autoSave);
			lamps.add(lamp);
			wallets.add(wallet);
			banks.add(bank);
			slots.add(coinSlot);
			slots.add(moneySlot);
			count++;
		} catch {
			// Ein Gehäuse, dessen Markup nicht stimmt, darf die Seite nicht
			// mitreißen. Schon gebaute Teile werden abgeräumt, sonst blieben
			// sie mit ihren Zuhörern am Dokument hängen. Anders als beim
			// Video Slot bleibt die Browserkonsole hier stumm: Abnahme­
			// kriterium dieser Phase erlaubt genau eine Konsolenmeldung, im
			// Zweig „keine sichere Zufallsquelle" weiter oben. Die
			// Reihenfolge spiegelt teardown(): zuletzt Gebautes zuerst.
			if (fieldCounter !== null) {
				fieldCounter.element.removeEventListener('cp:coins', fieldCounter.onCoins);
				fieldCounter.display.destroy();
			}
			coinSlot?.destroy();
			moneySlot?.destroy();
			bank?.destroy();
			lamp?.destroy();
			autoSave?.destroy();
			pusher?.destroy();
			view?.destroy();
			wallet?.destroy();
			board?.destroy();
			sound?.destroy();
		}
	}

	if (count > 0 && !teardownWired) {
		teardownWired = true;
		globalThis.addEventListener('pagehide', teardown);
		globalThis.addEventListener('pageshow', onPageShow);
	}

	return count;
}

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses
 * Modul kann deshalb schon laufen, bevor der Körper der Seite fertig
 * geparst ist.
 *
 * @returns {void}
 */
function boot() {
	bindMachines(document);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}

export default bindMachines;
