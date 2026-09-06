/**
 * Casino Kunterbunt – der Mustertisch
 * ===================================
 *
 * Der Beispieltisch aus CONCEPT.md C.9: er zeigt die geteilten Bausteine des
 * Spieltisches an einem Tuch mit vier Feldern und HAT KEIN SPIEL. Kein
 * Ergebnis, kein Rundenauslöser, kein Klang, keine Auswertung. Das ist keine
 * Auslassung, sondern die wörtliche Vorgabe: „Ein Beispieltisch OHNE SPIEL
 * lässt sich im Saal öffnen."
 *
 * Damit ist diese Datei zugleich die kürzeste vollständige Anleitung, wie ein
 * echter Tisch (ab Phase C2) verdrahtet wird. Was ihm gegenüber diesem hier
 * fehlt, ist genau das Spiel: eine Zufallsquelle, eine Physik, ein Ergebnis
 * und der Ruf von bets.settle() / bank.payout().
 *
 * WAS DER RUNDENABLAUF HIER TUT: NICHTS
 * -------------------------------------
 * table-round.js wird bewusst NICHT eingebunden. Ein Zustandswerk ohne
 * Ereignis wäre eine Maschine, die zwischen zwei Zuständen hin- und
 * herschaltet, ohne dass etwas geschieht — das sähe aus wie ein Spiel und
 * wäre keines. Bewiesen ist es unter Node (verify-table-bets.mjs, B-10/B-11);
 * seinen ersten Nutzer im Browser bekommt es in Phase C2.
 *
 * WIE DIE TEXTE HIERHER KOMMEN
 * -----------------------------
 * table-felt.js erwartet ein texts-Objekt (siehe dessen Dateikopf); diese
 * Datei liest die passenden Sätze aus den data-text-*-Attributen, die
 * Table/Status.html ohnehin schon ausliefert — dieselbe Quelle, aus der auch
 * table-controls.js seine geteilten Ansagetexte liest.
 */

import { openTableBank } from '@phomo17/casino-startpage/table-buyin.js';
import { BetTable } from '@phomo17/casino-startpage/table-bets.js';
import { CHIPS } from '@phomo17/casino-startpage/table-chips.js';
import { connectFelt } from '@phomo17/casino-startpage/table-felt.js';
import { connectControls } from '@phomo17/casino-startpage/table-controls.js';
import { connectHistory } from '@phomo17/casino-startpage/table-history.js';

/**
 * Die Feldliste des Mustertisches. Das EINZIGE, was ein Spiel selbst mitbringt
 * (CONCEPT.md C.3: „Jedes Spiel liefert nur seine Feldliste").
 *
 * covers ist hier überall eine leere Liste: ohne Ergebnis gewinnt kein Feld.
 * Die Auszahlungen und Limits sind trotzdem echt, weil genau sie geprüft
 * werden sollen (Anhang F, Höchsteinsatzprinzip).
 */
const FIELDS = [
	{ id: 'feld-a', label: 'mustertisch.feld.a', covers: [], payout: 1, max: 100 },
	{ id: 'feld-b', label: 'mustertisch.feld.b', covers: [], payout: 2, max: 100 },
	{ id: 'feld-c', label: 'mustertisch.feld.c', covers: [], payout: 8, max: 40 },
	{ id: 'feld-d', label: 'mustertisch.feld.d', covers: [], payout: 35, max: 10 },
];

const ROUND_MAX = 100;

/**
 * Verdrahtet genau einen Mustertisch.
 *
 * Baureihenfolge (wie im Kopfkommentar des Plans festgelegt): Bank, Setzfläche,
 * Verlauf, Ansicht der Setzfläche, Bedienleiste. Schlägt ein Schritt fehl,
 * wird in umgekehrter Reihenfolge abgeräumt — dieselbe Machart, die schon die
 * bestehenden Geräte-Extensions bei ihrem eigenen Abräumweg benutzen: ein
 * Gehäuse mit falschem Markup darf die Seite nicht mitreißen.
 *
 * @param {Element} root das [data-ck-table]
 * @returns {void}
 */
function bindTable(root) {
	const key = root.getAttribute('data-ck-table-key');
	if (typeof key !== 'string' || key === '') {
		console.error('[casino] muster-tisch.js: [data-ck-table] ohne data-ck-table-key gefunden.');
		return;
	}

	let bank = null;
	let bets = null;
	let history = null;
	let felt = null;
	let controls = null;

	try {
		bank = openTableBank(key);
		bets = new BetTable({ fields: FIELDS, roundMax: ROUND_MAX });

		const historyEl = root.querySelector('[data-ck-table-history]');
		const emptyHintText = root.querySelector('[data-ck-table-history-empty]')?.textContent ?? '';
		if (historyEl) {
			history = connectHistory(historyEl, { texts: { empty: emptyHintText } });
		}

		const statusEl = root.querySelector('[data-ck-table-status]');
		felt = connectFelt(root, bets, {
			selectedChip: () => controls?.selectedChip() ?? 1,
			onPlace: (fieldId, value) => bank.placeChip(value),
			onTakeBack: (fieldId, value) => bank.returnChip(value),
			announce: (text) => {
				if (statusEl) {
					statusEl.textContent = text;
				}
			},
			symbolIdFor: (value) => CHIPS[value]?.symbolId ?? '',
			texts: {
				placed: statusEl?.dataset.textPlaced ?? '',
				removed: statusEl?.dataset.textRemoved ?? '',
				fieldmax: statusEl?.dataset.textFieldmax ?? '',
				roundmax: statusEl?.dataset.textRoundmax ?? '',
				locked: statusEl?.dataset.textLocked ?? '',
				nochip: statusEl?.dataset.textNochip ?? '',
				fieldname: statusEl?.dataset.textFieldname ?? '',
				fieldnameEmpty: statusEl?.dataset.textFieldnameEmpty ?? '',
			},
		});

		controls = connectControls(root, { bank, bets, felt, history });
	} catch (error) {
		controls?.destroy();
		felt?.destroy();
		if (bank) {
			void bank.close();
		}
		console.error('[casino] muster-tisch.js: Der Mustertisch konnte nicht verdrahtet werden.', error);
	}
}

/** Bereits verdrahtete Tische, damit ein zweiter boot()-Lauf nichts doppelt anmeldet. */
const bound = new WeakSet();

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Dieses Modul
 * kann deshalb schon laufen, bevor der Körper der Seite fertig geparst ist.
 * @returns {void}
 */
function boot() {
	for (const root of document.querySelectorAll('[data-ck-table]')) {
		if (bound.has(root)) {
			continue;
		}
		bound.add(root);
		bindTable(root);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}
