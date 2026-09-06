/**
 * Casino Kunterbunt – das Geld am Spieltisch (Buy-in)
 * ====================================================
 *
 * CONCEPT.md C.4: „Die Kasse aus B.5 bleibt unverändert der einzige Zugriff auf
 * den Speicher. Am Tisch heißt der Gerätekredit Buy-in."
 *
 * Diese Datei ist der Aufsatz auf machine-credit.js, der aus einem Betrag
 * einen Chipbestand macht — und die einzige Stelle im Tisch, an der Chips und
 * Euro aufeinandertreffen.
 *
 *   credit.js          die KASSE, allen Geräten gemeinsam
 *   machine-credit.js  der GERÄTEKREDIT eines Geräts
 *   diese Datei        derselbe Gerätekredit, in Chips ausgedrückt
 *
 * Von machine-credit.js wird KEINE Zeile geändert. Der Tisch ist für sie ein
 * Gerät wie jedes andere; sie behandelt den Schlüssel als undurchsichtige
 * Zeichenkette und muss von Tischen nichts wissen.
 *
 *
 * DIE EINE INVARIANTE
 * -------------------
 *   rack.total === machineCredit.amount        immer, nach jedem Schritt
 *
 * Das Rack ist keine Anzeige des Buy-ins, es IST der Buy-in in Chips. Daraus
 * folgt alles Weitere von selbst:
 *
 *   Chip aufs Tuch     rack.take(wert) + machineCredit.stake(wert)
 *   Chip zurück        machineCredit.award(wert) + rack.put(wert)
 *   Gewinn             machineCredit.award(betrag) + rack.fill(betrag)
 *   Buy-in             machineCredit.insert(betrag) + rack.fill(betrag)
 *   CASH OUT           rack.clear() + machineCredit.cashOut()
 *
 * WARUM DARAUS DIE DREI REGELN AUS C.4 OHNE ZUTUN FOLGEN
 * ------------------------------------------------------
 *  1. „Beim Verlassen der Seite wandert der Buy-in von selbst zurück in die
 *     Kasse; noch nicht ausgewertete Einsätze verfallen." Ein Einsatz ist
 *     über stake() bereits aus dem Gerätekredit heraus; close() bucht nur
 *     zurück, was noch drin ist — also das Rack. Keine Zeile Code dafür.
 *  2. „CASH OUT ist gesperrt, solange Chips auf dem Tuch liegen." Ohne die
 *     Sperre verschwände genau der ausgesetzte Betrag. Die Sperre ist deshalb
 *     hier eingebaut und nicht in der Bedienleiste: eine Regel, an der die
 *     Bilanz hängt, gehört nicht in ein Bedienteil.
 *  3. „Reicht der Buy-in für einen Einsatz nicht, ist der Chip nicht ablegbar
 *     und die Anzeige sagt es." Ohne Chip im Rack kein Zug — und der Grund
 *     kommt als Rückgabewert, nicht als Schweigen.
 *
 * KEIN NEUER SPEICHERSCHLÜSSEL
 * ----------------------------
 * Die Absturzsicherung ist unverändert die aus B.5.2. Die Zusammensetzung des
 * Racks wird NICHT gespiegelt: nach einem Absturz wandert der Betrag ohnehin
 * in die Kasse zurück. Die Schlüsselliste aus B.5.3 bleibt damit wörtlich, wie
 * sie ist.
 *
 * KEIN pagehide HIER
 * ------------------
 * Wie machine-credit.js meldet sich auch diese Datei NICHT beim Verlassen der
 * Seite an. Das tut die Bedienleiste (table-controls.js) und ruft close().
 * Derselbe Grund wie dort: wer abräumt, muss den Umfang bestimmen dürfen.
 *
 *
 * WARUM DIESE DATEI EINE EIGENE ANMELDUNG (subscribe/notify) TRÄGT — EIGENE
 * ENTSCHEIDUNG, IM PLAN NICHT AUSFORMULIERT
 * --------------------------------------------------------------------------
 * Der Plan nennt subscribe() nur dem Namen nach ("wie machineCredit.subscribe").
 * Zwei Wege wurden erwogen:
 *
 *   a) subscribe() reicht direkt an machineCredit.subscribe() durch.
 *   b) Diese Klasse führt eine EIGENE, kleine Anmeldeliste und benachrichtigt
 *      sie selbst am Ende jeder eigenen Methode.
 *
 * (a) wurde verworfen: machineCredit meldet auch dann, wenn eine ANDERE
 * Registerkarte den Platz übernimmt (reason 'surrendered') — in diesem Fall
 * dürfte das Rack nicht blind aus dem neuen Betrag neu zusammengesetzt werden
 * (breakDown() ist eine KANONISCHE Zerlegung und würde eine gewachsene, durch
 * Wechseln oder Gewinne uneinheitliche Chip-Zusammensetzung stillschweigend
 * einschmelzen). (b) vermeidet das: die eigene Anmeldung wird nur an genau den
 * Stellen ausgelöst, an denen diese Datei das Rack selbst schon korrekt
 * nachgeführt hat.
 */

import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';
import { Rack } from '@phomo17/casino-startpage/table-chips.js';

/** Alle auf dieser Seite offenen Bankverbindungen, je Schlüssel höchstens eine. */
const open = new Map();

export class TableBank {
	/**
	 * Nicht selbst aufrufen – openTableBank() benutzen.
	 *
	 * @param {string} key der Schlüssel des Tisches, z. B. 'muster_tisch'
	 */
	constructor(key) {
		this.key = key;
		this.machineCredit = openMachineCredit(key);
		this.rack = new Rack();
		/** Summe dessen, was auf dem Tuch liegt — aus dem Gerätekredit heraus. */
		this.staked = 0;
		this.listeners = new Set();
		this.closed = false;

		/**
		 * Das Versprechen der Absturz-Übernahme aus machine-credit.js. Steht
		 * dort ein Rest, wandert er in die KASSE (nicht in dieses Rack) — so
		 * ist es in B.5.2 festgelegt, und so bleibt es. Danach wird das Rack
		 * auf den tatsächlichen Gerätekredit gebracht, der dann in aller Regel
		 * 0 ist. Der Ausnahmefall „Kasse am Höchststand, Rest bleibt im Gerät"
		 * ist genau der Grund, warum hier synchronisiert und nicht 0 gesetzt wird.
		 *
		 * Diese Synchronisation geschieht bewusst NUR hier, beim Anlegen: das
		 * Rack ist zu diesem Zeitpunkt leer, ein "Einschmelzen" in die
		 * kanonische Zerlegung von breakDown() kann also keine bestehende,
		 * gewachsene Zusammensetzung zerstören.
		 */
		this.ready = this.machineCredit.ready.then((claimResult) => {
			this.syncRack();
			this.notify('claimed');
			return claimResult;
		});
	}

	/** Der Buy-in in Euro. Synchron lesbar. */
	get amount() {
		return this.machineCredit.amount;
	}

	/** Liegt noch etwas auf dem Tuch? Dann ist CASH OUT gesperrt (C.4). */
	get hasStake() {
		return this.staked > 0;
	}

	/** Hat der Spieler einen Chip dieses Werts? */
	canPlace(value) {
		return this.rack.countOf(value) > 0;
	}

	/**
	 * Buy-in: Kassengeld in Chips wechseln (C.4).
	 * Alles oder nichts, wie machineCredit.insert().
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, moved: number, chips: Array}
	 *                  |{ok: false, reason: 'nocash'|'full'|'closed', missing?: number}>}
	 * @throws {RangeError} bei allem, was kein gültiger Betrag ist
	 */
	async buyIn(amount) {
		if (this.closed) {
			return { ok: false, reason: 'closed' };
		}
		const result = await this.machineCredit.insert(amount);
		if (result.ok !== true) {
			return { ok: false, reason: result.reason, missing: result.missing };
		}
		this.rack.fill(result.moved);
		this.notify('buyin');
		return { ok: true, moved: result.moved, chips: this.rack.toArray() };
	}

	/**
	 * CASH OUT: alles zurück in die Kasse.
	 * @returns {Promise<{ok: true, moved: number, capped: boolean}
	 *                  |{ok: false, reason: 'staked'|'empty'|'closed'}>}
	 *
	 * 'staked' ist die Sperre aus C.4. Sie steht VOR allem anderen, damit sie
	 * auch dann greift, wenn das Rack gerade leer ist, aber Chips liegen —
	 * genau der Fall, in dem sonst still nichts passierte.
	 */
	async cashOut() {
		if (this.closed) {
			return { ok: false, reason: 'closed' };
		}
		if (this.hasStake) {
			return { ok: false, reason: 'staked' };
		}
		if (this.amount <= 0) {
			return { ok: false, reason: 'empty' };
		}
		const result = await this.machineCredit.cashOut();
		// Das Rack wird über syncRack() neu zusammengesetzt statt nur geleert:
		// bleibt wegen eines Kassen-Höchststands ein Rest im Gerät (result.capped),
		// bildet syncRack() genau diesen Rest wieder als Chips ab. Ein reines
		// clear() ließe das Rack in diesem seltenen Fall leer aussehen, obwohl
		// noch Geld im Gerät steht — die Invariante wäre gebrochen.
		this.syncRack();
		this.notify('cashout');
		return { ok: true, moved: result.moved, capped: result.capped };
	}

	/**
	 * Ein Chip wandert aufs Tuch.
	 * Reihenfolge: erst aus dem Rack nehmen, dann buchen. Schlägt das Buchen
	 * fehl, kommt der Chip ins Rack zurück — es kann kein Chip verschwinden.
	 * @param {number} value
	 * @returns {Promise<{ok: true, value: number}|{ok: false, reason: 'nochip'|'insufficient'|'closed'}>}
	 */
	async placeChip(value) {
		if (this.closed) {
			return { ok: false, reason: 'closed' };
		}
		if (!this.rack.take(value)) {
			return { ok: false, reason: 'nochip' };
		}
		const staked = await this.machineCredit.stake(value);
		if (staked.ok !== true) {
			// Kann bei intaktem Rack praktisch nicht vorkommen (rack.total ===
			// machineCredit.amount ist die tragende Invariante dieser Datei),
			// wird aber trotzdem sauber zurückgerollt — genau das prüft M-8.
			this.rack.put(value);
			return { ok: false, reason: staked.reason };
		}
		this.staked += value;
		this.notify('place');
		return { ok: true, value };
	}

	/**
	 * Ein Chip kommt vom Tuch zurück.
	 * @param {number} value
	 * @returns {Promise<{ok: true, value: number}|{ok: false, reason: 'notstaked'|'closed'}>}
	 */
	async returnChip(value) {
		if (this.closed) {
			return { ok: false, reason: 'closed' };
		}
		if (this.staked < value) {
			return { ok: false, reason: 'notstaked' };
		}
		const awarded = await this.machineCredit.award(value);
		if (awarded.ok !== true) {
			return { ok: false, reason: 'closed' };
		}
		this.rack.put(value);
		this.staked -= value;
		this.notify('return');
		return { ok: true, value };
	}

	/**
	 * Auszahlung einer Runde: Einsätze und Gewinne zusammen.
	 *
	 * @param {number} returned was insgesamt an den Spieler zurückgeht
	 * @param {number} sweptStake was vom Tuch genommen und NICHT zurückgegeben wird
	 *
	 * Beide Zahlen kommen aus BetTable.settle(). Sie werden getrennt übergeben,
	 * weil sie Verschiedenes bedeuten: sweptStake verringert nur die Merkgröße
	 * staked (das Geld ist längst gebucht), returned wird tatsächlich
	 * gutgeschrieben. Sie in eine Zahl zusammenzuziehen wäre der klassische
	 * Weg, wie in einer Verrechnung ein Betrag doppelt oder gar nicht ankommt.
	 * @returns {Promise<{ok: true, credited: number, capped: boolean}|{ok: false, reason: 'closed'}>}
	 */
	async payout(returned, sweptStake) {
		// Behebung Review C3, L8: läuft bets.total je über this.staked hinaus,
		// klemmt Math.max(0, …) die Abweichung stumm ab — die Invariante
		// bets.total === bank.staked ist danach wieder erfüllt, ohne dass
		// jemals etwas rot wurde. Kein Verhaltenswechsel, nur eine Meldung,
		// dieselbe Bauart wie callOne() bei einem geworfenen Zuhörer.
		if (sweptStake > this.staked) {
			console.error(`[casino] table-buyin.js: payout() sollte ${sweptStake} € vom Tuch abräumen, die Kasse hatte nur ${this.staked} € gemerkt.`);
		}
		this.staked = Math.max(0, this.staked - sweptStake);
		if (returned <= 0) {
			this.notify('payout');
			return { ok: true, credited: 0, capped: false };
		}
		if (this.closed) {
			return { ok: false, reason: 'closed' };
		}
		const result = await this.machineCredit.award(returned);
		if (result.ok !== true) {
			return { ok: false, reason: 'closed' };
		}
		this.rack.fill(result.credited);
		this.notify('payout');
		return { ok: true, credited: result.credited, capped: result.capped };
	}

	/** Wechselfeld: kleiner wechseln. Berührt die Kasse NIE. */
	exchangeDown(value) {
		const result = this.rack.exchangeDown(value);
		if (result.ok === true) {
			this.notify('exchange');
		}
		return result;
	}

	/** Wechselfeld: größer wechseln. Berührt die Kasse NIE. */
	exchangeUp(value) {
		const result = this.rack.exchangeUp(value);
		if (result.ok === true) {
			this.notify('exchange');
		}
		return result;
	}

	/**
	 * Beim Verlassen der Seite. Was auf dem Tuch liegt, verfällt (C.4) — und
	 * zwar nicht, weil es hier gelöscht würde, sondern weil es längst nicht
	 * mehr im Gerätekredit ist.
	 * @returns {Promise<{ok: true, moved: number, amount: number, capped: boolean}>}
	 */
	async close() {
		if (this.closed) {
			return { ok: true, moved: 0, amount: this.amount, capped: false };
		}
		this.closed = true;
		open.delete(this.key);
		this.rack.clear();
		const result = await this.machineCredit.close();
		this.listeners.clear();
		return result;
	}

	/**
	 * Meldet einen Zuhörer an. Er wird sofort einmal mit dem aktuellen Stand
	 * aufgerufen (reason: 'subscribe'), damit eine frisch angebundene Anzeige
	 * nicht leer bleibt — gleiches Verhalten wie machineCredit.subscribe().
	 *
	 * @param {function({amount: number, staked: number, reason: string}): void} listener
	 * @returns {function(): void} Abmeldefunktion
	 * @throws {TypeError}
	 */
	subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('bank.subscribe() erwartet eine Funktion.');
		}
		this.listeners.add(listener);
		this.callOne(listener, 'subscribe');
		return () => {
			this.listeners.delete(listener);
		};
	}

	/** Bringt das Rack auf den tatsächlichen Gerätekredit. */
	syncRack() {
		this.rack.clear();
		this.rack.fill(this.machineCredit.amount);
	}

	/**
	 * @param {function} listener
	 * @param {string} reason
	 * @returns {void}
	 */
	callOne(listener, reason) {
		try {
			listener(Object.freeze({ amount: this.amount, staked: this.staked, reason }));
		} catch (error) {
			console.error('[casino] Ein Zuhörer der Tischbank hat einen Fehler geworfen.', error);
		}
	}

	/**
	 * @param {string} reason
	 * @returns {void}
	 */
	notify(reason) {
		for (const listener of [...this.listeners]) {
			this.callOne(listener, reason);
		}
	}
}

/**
 * Öffnet die Bank eines Tisches.
 *
 * Je Schlüssel und Seite genau eine — dieselbe Zusage wie openMachineCredit(),
 * hier zusätzlich selbst geführt, damit die Fehlermeldung vom Tisch spricht und
 * nicht vom darunterliegenden Gerätekredit.
 *
 * @param {string} key Schlüssel des Tisches, z. B. 'muster_tisch'
 * @returns {TableBank}
 * @throws {Error} wenn dieser Schlüssel auf dieser Seite schon offen ist
 */
export function openTableBank(key) {
	if (open.has(key)) {
		throw new Error(
			`Die Bank des Tisches "${key}" ist auf dieser Seite bereits offen. Das Objekt weiterreichen statt eine zweite zu öffnen.`
		);
	}
	const instance = new TableBank(key);
	open.set(key, instance);
	return instance;
}

export default openTableBank;
