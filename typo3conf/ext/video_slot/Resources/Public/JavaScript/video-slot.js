/**
 * Video Slot – Einstieg
 * ====================================
 *
 * Das einzige Modul, das das Fluid-Template über <f:asset.module> anfordert.
 * Alles andere zieht es sich über die Import-Map nach.
 *
 * Struktur bewusst identisch zu reel_slot/reel-slot.js. Phase 7 hat, wie im
 * Kopf von Phase 6 angekündigt, nur Zeilen ergänzt: Wallet, Bank, RiskPanel,
 * AutoPlay und MachineSound kamen dazu, umgebaut wurde nichts. Die
 * Abräumreihenfolge in teardown() ist der einzige Teil, an dem es auf jede
 * Zeile ankommt — sie ist dort einzeln begründet.
 *
 * Bewusst von machine.js getrennt – dieselbe Aufteilung wie beim Reel Slot:
 * dort der Vertrag, hier die Verdrahtung mit dem Dokument. Wer den Automaten
 * aus eigenem Code aufbauen will, importiert Machine und ruft nie diese
 * Datei.
 *
 * In dieser Datei steht kein einziger deutscher Anzeigetext. Meldungen für den
 * Spieler kommen aus der XLIFF-Datei über das Markup; was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { isAvailable } from '@phomo17/video-slot/rng.js';
import { Machine } from '@phomo17/video-slot/machine.js';
import { MessageBoard } from '@phomo17/video-slot/message.js';
import { Wallet } from '@phomo17/video-slot/wallet.js';
import { Bank } from '@phomo17/video-slot/bank.js';
import { RiskPanel } from '@phomo17/video-slot/risk.js';
import { AutoPlay } from '@phomo17/video-slot/auto.js';
import { MachineSound, shutdownSound } from '@phomo17/video-slot/sound.js';

const SELECTOR_MACHINE = '.vs-machine';

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
 * Ausnahme gibt es seit Phase 7, und die ist zwingend:
 *
 *  0. Klangpulte ZUERST. RiskPanel.destroy() feuert gleich darauf ein
 *     vs:collect für den offenen Gewinn; wäre das Klangpult dann noch
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
	// AUSSER BETRIEB meldet, als eines, das bei jedem Tastendruck in die
	// Konsole schreibt oder – schlimmer – heimlich mit Math.random()
	// weiterwürfelt. Geprüft wird EINMAL für die ganze Seite.
	if (!isAvailable()) {
		console.error(
			'[video-slot] Keine sichere Zufallsquelle (crypto.getRandomValues). '
			+ 'Der Automat bleibt unbedienbar.'
		);
		for (const element of found) {
			if (wired.has(element)) {
				continue;
			}
			wired.add(element);
			const board = new MessageBoard(element.querySelector('.vs-message'));
			// sticky: ein Gehäuse ohne sichere Zufallsquelle bleibt dauerhaft
			// unbedienbar. Ohne sticky nähme sich die Meldung nach 2,6
			// Sekunden von selbst weg und hinterließe ein vollständig
			// gezeichnetes Gehäuse, das auf nichts reagiert und nichts mehr
			// sagt (Phase 10, Befund M5).
			board.show('norng', { sticky: true });
		}
		return 0;
	}

	let count = 0;
	for (const element of found) {
		if (wired.has(element)) {
			continue;
		}
		wired.add(element);

		if (machines.size > 0) {
			// Ein Gerätekredit gilt je Schlüssel und Seite genau einmal. Ein
			// zweites Gehäuse auf derselben Seite bekäme keinen eigenen Kredit
			// und bliebe stumm, ohne dass ein Redakteur das sähe. Sichtbar
			// statt still: eine Konsolenzeile und eine Klasse am Gehäuse.
			element.classList.add('vs-machine--duplicate');
			console.error(
				'[video-slot] Ein zweites "Video Slot"-Gehäuse auf derselben Seite bleibt '
				+ 'unbedienbar (nur ein Gerätekredit je Schlüssel und Seite).'
			);
			continue;
		}

		let board = null;
		let wallet = null;
		let bank = null;
		let panel = null;
		let auto = null;
		let machine = null;
		try {
			// Das Klangpult zuerst: es meldet in der Erfassungsphase seine
			// beiden Gesten-Zuhörer an, an denen die Autoplay-Sperre hängt,
			// und hört ab dem ersten Augenblick alles mit. Es sendet nichts,
			// bricht nichts ab und ändert keinen Zustand des Spiels.
			board = new MachineSound(element);

			// Die Verrechnung. Sie legt dabei den Gerätekredit an
			// (openMachineCredit) — die EINZIGE Stelle, an der das geschieht.
			wallet = new Wallet(element);

			// Die Kassenanzeige und CASH OUT. Sie MUSS nach der Verrechnung
			// gebaut werden, denn sie bekommt deren Gerätekredit gereicht: es
			// gibt je Schlüssel und Seite genau einen, und ein zweites
			// openMachineCredit() würde werfen. Das Meldungsschild wandert aus
			// demselben Grund weiter.
			bank = new Bank(element, wallet.machineCredit, wallet.board);

			// Das Bedienfeld der Risiko-Leiter. Auf die Reihenfolge dieser
			// Zeilen kommt es ausdrücklich NICHT an: risk.js hört vs:round in
			// der Erfassungsphase am Dokument ab und läuft damit unabhängig
			// von der Baureihenfolge vor der Kasse. Das Spielwerk selbst liegt
			// in casino_startpage (CONCEPT.md B.6.2).
			panel = new RiskPanel(element);

			// Der Auto-Modus. Auch hier ist die Baureihenfolge gleichgültig:
			// gesendet wird erst, wenn ein Mensch die Taste drückt.
			auto = new AutoPlay(element);

			machine = new Machine(element);
			machines.add(machine);
			wallets.add(wallet);
			banks.add(bank);
			panels.add(panel);
			autos.add(auto);
			sounds.add(board);
			count++;
		} catch (error) {
			// Ein Gehäuse, dessen Markup nicht stimmt, darf die Seite nicht
			// mitreißen. Schon gebaute Teile werden abgeräumt, sonst blieben
			// sie mit ihren Zuhörern am Dokument hängen. Die Reihenfolge ist
			// dieselbe wie in teardown(): die Kassenanzeige VOR der
			// Verrechnung, damit sie den Gerätekredit nicht mehr liest, wenn
			// dessen close() läuft. machine steht ohne lokale Variable nicht
			// zur Verfügung, wenn der Konstruktor selbst wirft — deshalb hier,
			// zwischen panel und bank, wie es teardown() auch täte.
			auto?.destroy();
			panel?.destroy();
			machine?.destroy();
			bank?.destroy();
			wallet?.destroy();
			board?.destroy();
			console.error('[video-slot] Ein Automat konnte nicht verdrahtet werden.', error);
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
