/**
 * Reel Slot – Einstieg
 * ====================================
 *
 * Das einzige Modul, das das Fluid-Template über <f:asset.module> anfordert.
 * Alles andere zieht es sich über die Import-Map nach.
 *
 * Bewusst von machine.js getrennt – dieselbe Aufteilung wie credit.js und
 * credit-display.js in casino_startpage: dort der Vertrag, hier die
 * Verdrahtung mit dem Dokument. Wer den Automaten aus eigenem Code aufbauen
 * will, importiert Machine und ruft nie diese Datei.
 *
 * In dieser Datei steht kein einziger deutscher Anzeigetext. Meldungen für den
 * Spieler kommen aus der XLIFF-Datei über das Markup (CONCEPT.md Abschnitt 4);
 * was hier steht, sind Entwicklermeldungen für die Browserkonsole.
 */

import { isAvailable } from '@phomo17/reel-slot/rng.js';
import { Machine } from '@phomo17/reel-slot/machine.js';
import { Wallet } from '@phomo17/reel-slot/wallet.js';
import { Bank } from '@phomo17/reel-slot/bank.js';
import { RiskPanel } from '@phomo17/reel-slot/risk.js';
import { AutoPlay } from '@phomo17/reel-slot/auto.js';
import { MachineSound, shutdownSound } from '@phomo17/reel-slot/sound.js';

const SELECTOR_MACHINE = '.rs-machine';

/**
 * Schon verdrahtete Gehäuse. Absichtlich `let` und nicht `const`: beim
 * Zurückkommen aus dem Vor-/Zurück-Zwischenspeicher wird die Menge komplett
 * ausgetauscht, damit dieselben Elemente erneut verdrahtet werden dürfen.
 * Ein WeakSet kennt kein clear(), deshalb eine neue Menge statt einer Leerung.
 */
let wired = new WeakSet();

/** Alle laufenden Automaten dieser Seite, für das Aufräumen. */
const machines = new Set();

/** Die zugehörigen Verrechnungen. Getrennt, weil sie einander nicht kennen. */
const wallets = new Set();

/** Die zugehörigen Kassenanzeigen samt CASH OUT. Ebenfalls getrennt. */
const banks = new Set();

/** Die zugehörigen Risiko-Bedienfelder. Ebenfalls getrennt, aus demselben Grund. */
const panels = new Set();

/** Die zugehörigen Auto-Modi. Getrennt, aus demselben Grund. */
const autos = new Set();

/** Die zugehörigen Klangpulte. Ebenfalls getrennt, aus demselben Grund. */
const sounds = new Set();

/** Ist der Zuhörer fürs Seitenende schon angemeldet? */
let teardownWired = false;

/**
 * Hält alle Automaten der Seite an.
 *
 * pagehide statt unload: unload verhindert, dass der Browser die Seite in
 * seinen Vor-/Zurück-Zwischenspeicher legt, und wird in manchen Fällen gar
 * nicht mehr ausgelöst. pagehide feuert zuverlässig, auch auf Mobilgeräten.
 *
 * Die Reihenfolge folgt der Absicht, nicht einer Notwendigkeit — teardown()
 * läuft synchron, dazwischen kann ohnehin kein Zeitgeber feuern. EINE
 * Ausnahme gibt es seit Phase 10, und die ist zwingend:
 *
 *  0. Klangpulte ZUERST. RiskPanel.destroy() feuert gleich darauf ein
 *     rs:collect für den offenen Gewinn; wäre das Klangpult dann noch
 *     angemeldet, plante es eine Münzkaskade in eine sterbende Seite.
 *  1. Auto-Modi: erst die Pause löschen, dann alles Weitere. Danach kann
 *     nichts mehr eine neue Runde anstoßen.
 *  2. Risiko-Bedienfelder: RiskPanel.destroy() reicht an die geteilte Leiter
 *     weiter, und die schreibt einen offenen Gewinn noch gut (Kopf von
 *     @phomo17/casino-startpage/risk-ladder.js). Das soll passieren, solange
 *     die Kasse ihre Anzeigen noch führt. Doppelt gutschreiben kann das nicht
 *     — WinClaim.settled verhindert es baulich.
 *  3. Spielkerne.
 *  4. Kassenanzeigen. Bank.destroy() meldet nur ab und bucht NICHTS — sonst
 *     zahlte der Gerätekredit zweimal aus.
 *  5. Verrechnungen. Wallet.destroy() ruft als erste Zeile
 *     machineCredit.close(): der Gerätekredit wandert vollständig in die
 *     Kasse zurück und der Spiegel wird gelöscht (CONCEPT.md B.5.2). Das
 *     steht bewusst NACH Punkt 2 — ein dort noch offener Gewinn der
 *     Risiko-Leiter ist dann schon dem Gerätekredit gutgeschrieben und
 *     wandert mit zurück. Es ist zugleich die EINZIGE Stelle im Automaten,
 *     an der close() gerufen wird.
 *  6. Zuletzt der Klang der ganzen Seite: alle Stimmen aus, AudioContext
 *     geschlossen. Einmal je Seite, nicht je Gerät — die Geräte teilen sich
 *     einen Kontext (Kopf von sound.js).
 *
 * @returns {void}
 */
function teardown() {
	for (const board of sounds) {
		board.destroy();
	}
	sounds.clear();
	for (const auto of autos) {
		auto.destroy();
	}
	autos.clear();
	for (const panel of panels) {
		panel.destroy();
	}
	panels.clear();
	for (const machine of machines) {
		machine.destroy();
	}
	machines.clear();
	for (const bank of banks) {
		bank.destroy();
	}
	banks.clear();
	for (const wallet of wallets) {
		wallet.destroy();
	}
	wallets.clear();
	shutdownSound();
}

/**
 * Die Seite kommt aus dem Vor-/Zurück-Zwischenspeicher zurück.
 *
 * teardown() hat beim Verlassen ALLES abgemeldet: Zuhörer, Zeitgeber,
 * Zeichenschleifen, den AudioContext. Legt der Browser die Seite in den
 * Zwischenspeicher, statt sie zu verwerfen, kehrt beim Zurück-Knopf dasselbe
 * DOM zurück — ein Gehäuse, das vollständig aussieht und auf nichts reagiert,
 * ohne dass irgendwo eine Meldung erschiene. Genau das wäre der unangenehmste
 * aller Fehler: einer, der sich nicht meldet.
 *
 * event.persisted unterscheidet die beiden Fälle. Bei false wurde die Seite
 * frisch geladen und hat sich ohnehin selbst verdrahtet; nur bei true ist hier
 * etwas zu tun.
 *
 * Die Menge der schon verdrahteten Gehäuse wird dabei komplett ausgetauscht,
 * nicht geleert — ein WeakSet kennt kein clear(). teardownWired bleibt stehen:
 * die beiden Zuhörer hängen am Fenster und haben den Zwischenspeicher
 * überlebt, ein zweites Anmelden wäre ein doppelter Aufruf.
 *
 * Auf dieser Instanz greift der Fall zurzeit nicht: TYPO3 liefert für die
 * Automatenseite Cache-Control: private, no-store, und damit legt der Browser
 * sie gar nicht erst in den Zwischenspeicher. Das ist eine Eigenschaft der
 * heutigen Cache-Einstellung, keine Zusage — deshalb steht die Vorsorge hier.
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
 * Ausgabe. Der Saal lädt dieses Modul nicht, aber selbst wenn — es bliebe
 * folgenlos.
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
	// stillsteht, als eines, das bei jedem Hebelzug in die Konsole schreibt
	// oder – schlimmer – heimlich mit Math.random() weiterwürfelt.
	if (!isAvailable()) {
		console.error(
			'[reel-slot] Keine sichere Zufallsquelle (crypto.getRandomValues). '
			+ 'Der Automat bleibt unbedienbar.'
		);
		return 0;
	}

	let count = 0;
	for (const element of found) {
		if (wired.has(element)) {
			continue;
		}
		wired.add(element);
		let board = null;
		let wallet = null;
		let bank = null;
		let panel = null;
		let auto = null;
		try {
			// Das Klangpult zuerst: es meldet in der Erfassungsphase den
			// pointerdown-Zuhörer an, an dem die Autoplay-Sperre hängt, und
			// hört ab dem ersten Augenblick alles mit. Es sendet nichts,
			// bricht nichts ab und ändert keinen Zustand des Spiels — die
			// Baureihenfolge ist deshalb auch hier gleichgültig, macht die
			// Absicht aber sichtbar.
			board = new MachineSound(element);

			// Die Verrechnung. Sie legt dabei den Gerätekredit an
			// (openMachineCredit) — die EINZIGE Stelle, an der das
			// geschieht.
			wallet = new Wallet(element);

			// Die Kassenanzeige und CASH OUT. Sie MUSS nach der
			// Verrechnung gebaut werden, denn sie bekommt deren
			// Gerätekredit gereicht: es gibt je Schlüssel und Seite genau
			// einen (CONCEPT.md Abschnitt 5, Grundsatz 8), und ein zweites
			// openMachineCredit() würde werfen. Das Meldungsschild wandert
			// aus demselben Grund weiter wie schon zum Münzschlitz.
			bank = new Bank(element, wallet.machineCredit, wallet.board);

			// Das Bedienfeld der Risiko-Leiter hängt an rs:payout, das die
			// Kasse sendet, und an rs:round, das der Spielkern sendet. Auf die
			// Reihenfolge dieser Zeilen kommt es ausdrücklich NICHT an:
			// risk.js hört rs:round in der Erfassungsphase am Dokument ab und
			// läuft damit unabhängig von der Baureihenfolge vor der Kasse.
			// Begründung im Kopf von risk.js. Das Spielwerk selbst liegt seit
			// Ausbaustufe 2, Phase 2 in casino_startpage (CONCEPT.md B.6.2).
			panel = new RiskPanel(element);

			// Der Auto-Modus hört rs:state, rs:result und rs:risk und sendet
			// rs:spin, rs:riskcollect und rs:auto — alles am Gehäuse. Auch
			// hier ist die Baureihenfolge gleichgültig: gesendet wird erst,
			// wenn ein Mensch die Taste drückt, und dann steht alles.
			auto = new AutoPlay(element);

			machines.add(new Machine(element));
			wallets.add(wallet);
			banks.add(bank);
			panels.add(panel);
			autos.add(auto);
			sounds.add(board);
			count++;
		} catch (error) {
			// Ein Gehäuse, dessen Markup nicht stimmt, darf die Seite nicht
			// mitreißen. Der Fehler wird gemeldet, der Rest läuft weiter.
			// Schon gebaute Teile werden dabei wieder abgeräumt, sonst blieben
			// sie mit ihren Zuhörern am Dokument hängen.
			//
			// Die Reihenfolge ist dieselbe wie in teardown(): die
			// Kassenanzeige VOR der Verrechnung, damit sie den
			// Gerätekredit nicht mehr liest, wenn dessen close() läuft.
			// Wallet.destroy() gibt den Schlüssel dabei wieder frei — ein
			// zweiter Anlauf über den Vor-/Zurück-Zwischenspeicher findet
			// ihn also nicht belegt vor.
			auto?.destroy();
			panel?.destroy();
			bank?.destroy();
			wallet?.destroy();
			board?.destroy();
			console.error('[reel-slot] Ein Automat konnte nicht verdrahtet werden.', error);
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
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses Modul
 * kann deshalb schon laufen, bevor der Körper der Seite fertig geparst ist.
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
