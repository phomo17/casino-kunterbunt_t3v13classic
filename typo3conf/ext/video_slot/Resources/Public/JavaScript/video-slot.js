/**
 * Video Slot – Einstieg
 * ====================================
 *
 * Das einzige Modul, das das Fluid-Template über <f:asset.module> anfordert.
 * Alles andere zieht es sich über die Import-Map nach.
 *
 * Struktur bewusst identisch zu reel_slot/reel-slot.js, damit Phase 7 nur
 * Zeilen ergänzt (Wallet, Bank, RiskPanel, AutoPlay, MachineSound) statt die
 * Datei umzubauen.
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

/** Ist der Zuhörer fürs Seitenende schon angemeldet? */
let teardownWired = false;

/**
 * Hält alle Automaten der Seite an.
 *
 * pagehide statt unload: unload verhindert, dass der Browser die Seite in
 * seinen Vor-/Zurück-Zwischenspeicher legt, und wird in manchen Fällen gar
 * nicht mehr ausgelöst. pagehide feuert zuverlässig, auch auf Mobilgeräten.
 *
 * @returns {void}
 */
function teardown() {
	for (const machine of machines) {
		machine.destroy();
	}
	machines.clear();
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
			board.show('norng');
		}
		return 0;
	}

	let count = 0;
	for (const element of found) {
		if (wired.has(element)) {
			continue;
		}
		wired.add(element);
		try {
			machines.add(new Machine(element));
			count++;
		} catch (error) {
			// Ein Gehäuse, dessen Markup nicht stimmt, darf die Seite nicht
			// mitreißen. Der Fehler wird gemeldet, der Rest läuft weiter.
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
