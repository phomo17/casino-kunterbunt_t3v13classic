/**
 * FruitRisk – Einstieg
 * ======================
 *
 * Das einzige Modul, das die Fluid-Vorlage über <f:asset.module> anfordert.
 * Alles andere zieht es sich über die Import-Map nach.
 *
 * Bewusst von machine.js getrennt — dieselbe Aufteilung wie bei den übrigen
 * Automaten dieses Projekts: dort der Vertrag, hier die Verdrahtung mit dem
 * Dokument. Wer den Automaten aus eigenem Code aufbauen will, importiert
 * Machine und ruft nie diese Datei.
 *
 * In dieser Datei steht kein einziger deutscher Anzeigetext. Meldungen für
 * den Spieler kommen aus der XLIFF-Datei über das Markup; was hier steht,
 * sind Entwicklermeldungen für die Browserkonsole.
 */

import { isAvailable } from '@phomo17/fruit-risk/rng.js';
import { findRegion } from '@phomo17/fruit-risk/announce.js';
import { MessageBoard } from '@phomo17/fruit-risk/message.js';
import { Machine } from '@phomo17/fruit-risk/machine.js';
import { Wallet } from '@phomo17/fruit-risk/wallet.js';
import { Bank } from '@phomo17/fruit-risk/bank.js';
import { RiskPanel } from '@phomo17/fruit-risk/risk.js';
import { AutoPlay } from '@phomo17/fruit-risk/auto.js';
import { MachineSound, shutdownSound } from '@phomo17/fruit-risk/sound.js';

const SELECTOR_MACHINE = '.fr-machine';

/** Schon verdrahtete Gehäuse. Beim Zurückkommen aus dem Vor-/Zurück-
 *  Zwischenspeicher wird die Menge komplett ausgetauscht (siehe onPageShow). */
let wired = new WeakSet();

/** Alle laufenden Spielkerne dieser Seite, für das Aufräumen. */
const machines = new Set();

/** Die zugehörigen Verrechnungen. Getrennt, weil sie einander nicht kennen. */
const wallets = new Set();

/** Die zugehörigen Kassenanzeigen samt CASH OUT. Ebenfalls getrennt. */
const banks = new Set();

/** Die zugehörigen Risikospiele. Ebenfalls getrennt (Phase F5b). */
const risks = new Set();

/** Die zugehörigen Auto-Modi. Ebenfalls getrennt (Phase F5c). */
const autos = new Set();

/** Die zugehörigen Klangpulte. Ebenfalls getrennt (Phase F5d). */
const sounds = new Set();

/**
 * Die zugehörigen Tafeln (Behebungslauf REVIEW-fruitrisk-f4.md [M4]): ohne
 * dieses Verzeichnis blieb board.destroy() beim Verlassen der Seite
 * ungerufen, ihre beiden Zeitgeber liefen weiter, und eine neu aufgebaute
 * Tafel nach dem Vor-/Zurück-Zwischenspeicher (onPageShow) teilte sich den
 * Live-Bereich „machine" mit der alten — genau der Fall, für den
 * announce.js gebaut wurde.
 */
const boards = new Set();

/** Alle angelegten Live-Bereiche dieser Seite. */
const regions = new Set();

/** Ist der Zuhörer fürs Seitenende schon angemeldet? */
let teardownWired = false;

/**
 * Hält alle Automaten der Seite an.
 *
 * pagehide statt unload: unload verhindert den Vor-/Zurück-Zwischenspeicher
 * des Browsers und wird teils gar nicht mehr ausgelöst.
 *
 * DIE REIHENFOLGE IST NICHT BELIEBIG:
 *  1. Auto-Modi (Phase F5c) ZUERST — bevor die Spielkerne sterben, damit
 *     kein Zeitgeber mehr in ein halb abgeräumtes Gerät feuern kann. Ein
 *     laufender Pausen-Zeitgeber, der erst NACH dem Spielkern gelöscht
 *     würde, könnte sonst noch ein fr:spin an ein Gehäuse senden, dessen
 *     machine.js schon abgemeldet ist.
 *  2. Spielkerne: Zeichenschleife aus, danach kann keine Runde mehr enden.
 *  3. Risikospiele (Phase F5b): reichen an alle drei Leitern weiter — eine
 *     laufende schreibt ihren offenen Gewinn GUT, sie verfällt nicht — und
 *     schreiben zusätzlich einen im Angebot noch selbst gehaltenen Anspruch
 *     gut. Das MUSS geschehen, BEVOR wallet.destroy() den Gerätekredit
 *     schließt: sonst landete der Gewinn in einem bereits geschlossenen
 *     Gerätekredit und wäre verloren.
 *  4. Klangpulte (Phase F5d) DANACH und VOR den Kassenanzeigen: so bleiben
 *     die Geldbewegungen des restlichen Abräumens (Punkt 5 und 6) für dieses
 *     Gehäuse stumm — sound.js hört noch bis hierher zu, aber nicht mehr
 *     danach. sound.js selbst bricht dabei KEINE fremden Stimmen ab (der
 *     AudioContext gehört der Seite), sondern nur sein eigenes Brummen
 *     (idle.destroy()) und seinen eigenen Zeitgeber.
 *  5. Kassenanzeigen: bank.destroy() meldet nur ab und bucht NICHTS — sonst
 *     zahlte der Gerätekredit zweimal aus.
 *  6. Verrechnungen: wallet.destroy() löst ein offenes Angebot ein und ruft
 *     DANACH machineCredit.close(). Der Gewinn wandert damit mit zurück in
 *     die Kasse. Es ist die einzige Stelle, an der close() gerufen wird.
 *  7. Tafeln DANACH: wallet.destroy() kann über den Kredit-Zuhörer noch
 *     einmal board.show()/hide() auslösen (machineCredit.close()) — die
 *     Tafel muss dafür noch leben.
 *  8. Live-Bereiche zuletzt: bis dahin darf noch etwas angesagt werden.
 *  9. shutdownSound() GANZ AM ENDE, EINMAL JE SEITE, NICHT JE GERÄT: alle
 *     Geräte einer Seite teilen sich einen AudioContext (Kopf von
 *     casino_startpage/…/sound.js). Erst wenn kein Gehäuse mehr etwas zu
 *     sagen hat, wird er geschlossen.
 *
 * @returns {void}
 */
function teardown() {
	for (const auto of autos) {
		auto.destroy();
	}
	autos.clear();
	for (const machine of machines) {
		machine.destroy();
	}
	machines.clear();
	for (const risk of risks) {
		risk.destroy();
	}
	risks.clear();
	for (const board of sounds) {
		board.destroy();
	}
	sounds.clear();
	for (const bank of banks) {
		bank.destroy();
	}
	banks.clear();
	for (const wallet of wallets) {
		wallet.destroy();
	}
	wallets.clear();
	for (const board of boards) {
		board.destroy();
	}
	boards.clear();
	for (const region of regions) {
		region.destroy();
	}
	regions.clear();
	shutdownSound();
}

/**
 * Die Seite kommt aus dem Vor-/Zurück-Zwischenspeicher zurück.
 *
 * teardown() hat beim Verlassen ALLES abgemeldet. Käme dasselbe DOM zurück,
 * stünde ein Gehäuse da, das vollständig aussieht und auf nichts reagiert —
 * der unangenehmste aller Fehler, weil er sich nicht meldet.
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
 * @param {Document|Element} [root]
 * @returns {number} Anzahl der verdrahteten Automaten
 */
export function bindMachines(root = document) {
	const found = root.querySelectorAll(SELECTOR_MACHINE);
	if (found.length === 0) {
		return 0;
	}

	// OHNE SICHERE ZUFALLSQUELLE WIRD NICHT GESPIELT (C.14.14). Das Gehäuse
	// bleibt unverdrahtet — keine Kasse, kein Münzschlitz, kein Spielkern —
	// und die Tafel zeigt AUSSER BETRIEB, dauerhaft (sticky): eine Meldung,
	// die sich nach 2,6 Sekunden von selbst wegnimmt, hinterließe ein
	// stummes, unerklärtes Gerät. Geprüft wird EINMAL für die ganze Seite.
	if (!isAvailable()) {
		console.error('[fruit-risk] Keine sichere Zufallsquelle (crypto.getRandomValues).'
			+ ' Der Automat bleibt unbedienbar.');
		for (const element of found) {
			if (wired.has(element)) {
				continue;
			}
			wired.add(element);
			const region = findRegion(element, 'machine');
			regions.add(region);
			const board = new MessageBoard(element.querySelector('.fr-message'), region);
			board.show('norng', { sticky: true });
			boards.add(board);
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
			// zweites Gehäuse bekäme keinen eigenen und bliebe stumm, ohne
			// dass ein Redakteur das sähe. Sichtbar statt still.
			//
			// inert (Behebungslauf REVIEW-fruitrisk-f4.md [L3]): opacity und
			// pointer-events sperren nur den Zeigerweg. Ohne inert blieben
			// zwölf Schaltflächen und die vier leeren Live-Bereiche für
			// Tastatur und Hilfsmittel erreichbar, ohne je etwas zu bewirken.
			element.classList.add('fr-machine--duplicate');
			element.inert = true;
			console.error('[fruit-risk] Ein zweites FruitRisk-Gehäuse auf derselben Seite'
				+ ' bleibt unbedienbar (nur ein Gerätekredit je Schlüssel und Seite).');
			continue;
		}

		// Ein zuvor als Duplikat gesperrtes Gehäuse (etwa nach dem Vor-/
		// Zurück-Zwischenspeicher, wo wired neu beginnt) wird beim regulären
		// Verdrahten wieder freigegeben (Behebungslauf [L3]) — sonst bliebe
		// die Sperre stehen, obwohl dieses Gehäuse jetzt das einzige ist.
		element.classList.remove('fr-machine--duplicate');
		element.inert = false;

		let wallet = null;
		let bank = null;
		let machine = null;
		let board = null;
		let risk = null;
		let auto = null;
		let soundBoard = null;
		try {
			// Die vier Live-Bereiche: EINMAL gesucht und weitergereicht. So
			// gibt es je Bereich genau einen Eigentümer.
			const machineRegion = findRegion(element, 'machine');
			const gridRegion = findRegion(element, 'grid');
			const creditRegion = findRegion(element, 'credit');
			regions.add(machineRegion);
			regions.add(gridRegion);
			regions.add(creditRegion);

			board = new MessageBoard(element.querySelector('.fr-message'), machineRegion);
			boards.add(board);

			// Die Verrechnung zuerst: sie legt den Gerätekredit an
			// (openMachineCredit) — die EINZIGE Stelle, an der das geschieht.
			wallet = new Wallet(element, board);

			// Die Kassenanzeige MUSS danach kommen: sie bekommt den
			// Gerätekredit gereicht; ein zweites openMachineCredit() mit
			// demselben Schlüssel würde werfen.
			bank = new Bank(element, wallet.machineCredit, board, creditRegion);

			machine = new Machine(element, gridRegion);

			// Der Live-Bereich „risk" bekommt in dieser Phase seinen
			// Eigentümer — je Bereich genau einer (C.14.12).
			const riskRegion = findRegion(element, 'risk');
			regions.add(riskRegion);
			risk = new RiskPanel(element, riskRegion);

			// Der Auto-Modus (Phase F5c) zuletzt gebaut: er braucht das
			// verdrahtete .fr-cabinet, tut aber nichts, bis jemand ihn
			// einschaltet.
			auto = new AutoPlay(element);

			// Das Klangpult (Phase F5d) ganz zuletzt: die Baureihenfolge ist
			// hier gleichgültig, es sendet nichts, bricht nichts ab und ändert
			// keinen Zustand des Spiels — es hört nur zu, und zwar ab dem
			// Augenblick seines Baus.
			soundBoard = new MachineSound(element);

			machines.add(machine);
			wallets.add(wallet);
			banks.add(bank);
			risks.add(risk);
			autos.add(auto);
			sounds.add(soundBoard);
			count++;
		} catch (error) {
			// Ein Gehäuse, dessen Markup nicht stimmt, darf die Seite nicht
			// mitreißen. Schon Gebautes wird in derselben Reihenfolge wie in
			// teardown() abgeräumt (Behebungslauf REVIEW-fruitrisk-f5.md [L1]:
			// vormals stand soundBoard hier an erster statt an vierter Stelle —
			// folgenlos, weil an dieser Stelle noch nichts gelaufen war, aber
			// die Aussage stimmte nicht).
			auto?.destroy();
			machine?.destroy();
			risk?.destroy();
			soundBoard?.destroy();
			bank?.destroy();
			wallet?.destroy();
			// Sichtbar statt stumm (Behebungslauf REVIEW-fruitrisk-f4.md
			// [L9]): ohne diese Meldung stand ein vollständig gezeichnetes,
			// totes Gehäuse da, ohne dass ein Besucher eine Erklärung sah —
			// dieselbe Behandlung wie im norng-Zweig oben.
			board?.show('broken', { sticky: true });
			console.error('[fruit-risk] Ein Automat konnte nicht verdrahtet werden.', error);
		}
	}

	if (count > 0 && !teardownWired) {
		teardownWired = true;
		globalThis.addEventListener('pagehide', teardown);
		globalThis.addEventListener('pageshow', onPageShow);
	}
	return count;
}

/** Der Kern bindet Module mit „async" ein; dieses kann vor dem Körper laufen. */
function boot() {
	bindMachines(document);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}

export default bindMachines;
