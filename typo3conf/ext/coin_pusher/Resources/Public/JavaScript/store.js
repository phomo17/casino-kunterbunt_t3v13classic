/**
 * Coin Pusher – der Spielstand
 * ====================================================
 *
 * Die Brücke zwischen dem Physikkern und dem Browserspeicher. Sie ist die
 * einzige Datei von Lauf 1, die storage.js benutzt — und storage.js ist laut
 * Phase 8 die eine benannte Stelle, an der der Spielstand herkommt.
 */

import { Field } from '@phomo17/coin-pusher/field.js';
import { drawUint32 } from '@phomo17/coin-pusher/rng.js';
import { read, write } from '@phomo17/coin-pusher/storage.js';
import { buildSeedState } from '@phomo17/coin-pusher/seed.js';

/** Abstand zweier Sicherungen im laufenden Betrieb, in Millisekunden. */
export const SAVE_MS = 5000;

import { konto } from '@phomo17/casino-startpage/account-backend.js';

/**
 * localStorage, oder null, wenn der Zugriff verboten ist (privates Fenster,
 * abgeschaltete Speicherung). Kein Fehler, keine Konsolenausgabe.
 *
 * @returns {?Storage}
 */
function safeStorage() {
	// Ab Teil D gehört das Feld nicht mehr dem Browser, sondern der Person
	// (CONCEPT.md D.8). konto.speicher ist Storage-förmig — dieselben drei
	// Methoden, dieselbe synchrone Bauart —, sammelt die Schreibvorgänge und
	// schickt sie gebündelt. Der 5-Sekunden-Takt aus AutoSave bleibt
	// unverändert; es wird also NICHT bei jeder Münze gebucht.
	if (konto.istServer) {
		return konto.speicher;
	}
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

/**
 * Holt das Spielfeld: den gespeicherten Stand, sonst den Grundhaufen.
 *
 * Drei Stufen, und jede hat ihren Grund. Ein gültiger Stand wird
 * fortgesetzt. Ein fehlender, beschädigter oder abgeschnittener liefert
 * null — ohne Fehler und ohne Konsolenausgabe, so ist Field.restore()
 * gebaut — und wird durch den Grundhaufen ersetzt; B.9.5 verlangt genau
 * das. Scheitert selbst der Grundhaufen, was nur ein Programmierfehler
 * sein kann, läuft das Gerät mit leerem Feld weiter statt gar nicht.
 *
 * @param {?Storage} [store]
 * @returns {{field: Field, restored: boolean}}
 */
export function loadField(store = safeStorage()) {
	const options = { random: drawUint32 };

	const kept = Field.restore(read(store), options);
	if (kept !== null) {
		return { field: kept, restored: true };
	}

	const seeded = Field.restore(buildSeedState(drawUint32), options);
	if (seeded !== null) {
		return { field: seeded, restored: false };
	}

	return { field: new Field(options), restored: false };
}

/**
 * Der Sicherungstakt eines laufenden Felds.
 *
 * Warum nicht jedes Bild: localStorage schreibt synchron, und ein voller
 * Stand ist rund 9 kB — sechzigmal je Sekunde wäre das eine messbare
 * Bremse für nichts. Fünf Sekunden bedeuten im schlimmsten Fall fünf
 * verlorene Sekunden Haufenbewegung; das sieht niemand.
 */
export class AutoSave {
	/**
	 * @param {Field} field
	 * @param {?Storage} [store]
	 */
	constructor(field, store = safeStorage()) {
		this.field = field;
		this.store = store;
		this.timer = globalThis.setInterval(() => this.save(), SAVE_MS);
	}

	/** Schreibt sofort. Wird auch beim Verlassen der Seite gerufen. */
	save() {
		write(this.store, this.field.serialize());
	}

	/** Zeitgeber weg, EINE letzte Sicherung. */
	destroy() {
		globalThis.clearInterval(this.timer);
		this.save();
	}
}

export default loadField;
