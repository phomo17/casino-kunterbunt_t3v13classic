/**
 * Casino Kunterbunt – der Gerätekredit
 * ====================================
 *
 * Die zweite Hälfte des zweistufigen Guthabens aus CONCEPT.md B.5.
 *
 *   credit.js     die KASSE. Der Gesamtbestand, allen Geräten gemeinsam,
 *                 liegt unter casinoKunterbunt.credits.
 *   diese Datei   der GERÄTEKREDIT. Der Betrag, den der Spieler bewusst in
 *                 EIN Gerät eingeworfen hat. Beim Betreten der Seite immer 0.
 *                 Gespielt wird ausschließlich von ihm.
 *
 * Das Problem, das damit gelöst wird (B.5): bis Ausbaustufe 1 lag das ganze
 * Geld in jedem Gerät gleichzeitig. Man konnte alles an einem Gerät
 * verspielen, ohne es je entschieden zu haben. Jetzt entscheidet der Spieler,
 * wie viel er einem Gerät aussetzt.
 *
 * Einbindung in einer Geräte-Erweiterung:
 *
 *   import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';
 *   const machineCredit = openMachineCredit('mein_geraet');
 *
 * Der Schlüsselbestandteil kommt vom GERÄT. Diese Datei führt keine Liste der
 * Geräte und darf keines kennen (CONCEPT.md Abschnitt 5, Grundsatz 2). Sie
 * behandelt den Namen als undurchsichtige Zeichenkette und setzt ihn nur
 * hinter die feste Vorsilbe casinoKunterbunt.machine. — ein Gerät, das es
 * noch gar nicht gibt, funktioniert damit ohne eine Zeile Änderung hier.
 *
 *
 * DIE ZUSAGEN — DIESELBEN WIE BEI credit.js
 * -----------------------------------------
 *   Lesen ist synchron          amount, canAfford()
 *   Jedes Ändern ist asynchron  insert(), cashOut(), withdraw(), stake(),
 *                               award(), close()
 *   Andere Registerkarten       werden über das storage-Ereignis mitgeführt
 *
 * Der Grund für die asynchronen Methoden ist derselbe wie dort: sie sind die
 * Bruchstelle, an der Stufe 3 ein serverseitiges Konto einhängt. Heute läuft
 * ihr ganzer Rumpf synchron ab; nur der Rückgabewert kommt als bereits
 * erfülltes Versprechen. Wären sie heute synchron, müsste beim Umstieg jeder
 * Aufruf in jeder Geräte-Erweiterung angefasst werden.
 *
 *
 * DER SPIEGEL UND DIE ABSTURZSICHERUNG (B.5.2)
 * --------------------------------------------
 * Solange ein Gerätekredit größer als 0 ist, steht er zusätzlich im Speicher:
 *
 *   casinoKunterbunt.machine.<schlüssel>   =   "<kennung>|<betrag>"
 *
 * Bei 0 wird der Schlüssel GELÖSCHT. Im Ruhezustand liegen deshalb nur die
 * Schlüssel im Speicher, die B.5.3 nennt, und nicht mehr.
 *
 * Die <kennung> ist eine Zeichenkette, die dieser Seitenaufruf beim Anlegen
 * bekommt. Sie ist die ganze Antwort auf die Frage „hat gerade jemand ANDERES
 * meinen Platz übernommen, oder war das mein eigenes Schreiben?" Ohne sie ist
 * der Fall zweier Registerkarten desselben Geräts nicht sauber aufzulösen —
 * und genau der ist real: ein Klick mit der mittleren Maustaste auf ein Gerät
 * im Saal öffnet ihn.
 *
 *   Beim Anlegen         steht dort ein Restbetrag? Dann ist er entweder eine
 *                        Karteileiche eines Absturzes oder er gehört einer
 *                        anderen Registerkarte. Beide Male ist dieselbe
 *                        Antwort richtig: Platz übernehmen, Betrag in die
 *                        Kasse buchen, Schlüssel löschen, bei 0 anfangen.
 *   Schlüssel gelöscht,  Mein Betrag wurde soeben von einer anderen
 *   und die alte Kennung Registerkarte in die Kasse gebucht. Ich gehe auf 0
 *   war meine            und buche NICHTS — sonst stünde er doppelt im Konto.
 *   Fremde Kennung       Jemand anderes führt den Platz jetzt. Ich buche
 *   steht dort           meinen eigenen Betrag zurück in die Kasse und gehe
 *                        auf 0. Es entsteht und verschwindet nichts.
 *
 * Nach dem Zurückbuchen wird zusätzlich geprüft, ob im Speicher noch die
 * EIGENE Kennung steht. Das ist genau dann der Fall, wenn zwei Karten im
 * selben Augenblick geschrieben haben; ohne diese Zeile bliebe ein überholter
 * Eintrag stehen und würde beim nächsten Laden ein zweites Mal gutgeschrieben.
 *
 * Übernommen wird ein Rest ausschließlich beim Anlegen, also beim Öffnen der
 * Seite DIESES Geräts — nicht bei jedem beliebigen Seitenaufruf. Sonst leerte
 * ein nebenbei geöffneter Saal ein Gerät, an dem gerade gespielt wird.
 *
 *
 * WARUM HIER KEIN pagehide STEHT (B.5.4)
 * --------------------------------------
 * Diese Datei meldet sich NICHT beim Verlassen der Seite an und räumt sich
 * nicht selbst ab. Das Gerät ruft close(), und zwar aus seinem eigenen
 * Abräumweg heraus.
 *
 * Der Grund steht in B.5.4: beim Münzschieber ist eine eingeworfene Münze
 * Spielmaterial und kein Kredit mehr. Zurück in die Kasse wandert dort nur der
 * NICHT eingeworfene Gerätekredit. Ein geteilter Baustein, der beim Verlassen
 * von sich aus alles zurückbucht, würde diesem Gerät eine falsche Regel
 * aufzwingen. So bestimmt das Gerät den Umfang: was es über stake() aus dem
 * Gerätekredit herausgenommen hat, ist beim Abräumen nicht mehr da. Für den
 * Münzschieber entsteht dafür heute keine Zeile Code.
 *
 *
 * WAS DIESE DATEI NICHT TUT
 * -------------------------
 * Sie fasst kein Dokument an, keine Anzeige, keine Taste. Sie kennt weder
 * Röhren noch Meldungsschilder. Wer eine Anzeige daran hängen will, benutzt
 * subscribe(). Dieselbe Trennung wie credit.js gegen credit-display.js.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Was hier steht, sind
 * Entwicklermeldungen für die Browserkonsole.
 */

import { credit } from '@phomo17/casino-startpage/credit.js';
// ÜBER DAS PRÄFIX — siehe die ausführliche Begründung im Kopf von credit.js:
// ein Gerätemodul (store.js) in einer ANDEREN Extension importiert
// account-backend.js zwangsläufig über das Präfix; ein hier abweichender relativer
// Import erzeugte im Browser ein ZWEITES konto-Objekt unter einer zweiten
// Adresse (gemessen, kein Verdacht). Für machine-credit.js selbst ändert das
// an der Ladeweise unter Node nichts: die Datei hat schon wegen ihres
// Imports von credit.js NIE über ihre eigene Datei-Adresse geladen werden
// können, jedes Prüfskript im Haus liest sie als Text und patcht die
// Modulnamen — genau dieselbe Behandlung bekommt auch dieser Name.
import { konto } from '@phomo17/casino-startpage/account-backend.js';

/** Feste Vorsilbe aller Spiegel-Schlüssel. Der Rest kommt vom Gerät. */
export const MACHINE_STORAGE_PREFIX = 'casinoKunterbunt.machine.';

/** Nur zum Prüfen, ob der Speicher überhaupt beschreibbar ist. */
const PROBE_KEY = 'casinoKunterbunt.probe';

/** Trennzeichen zwischen Kennung und Betrag im Spiegel. */
const SEPARATOR = '|';

/**
 * Erlaubte Gestalt eines Geräteschlüssels.
 *
 * Absichtlich eng: der Schlüssel wird Teil eines Speicherschlüssels, und ein
 * Punkt oder ein senkrechter Strich darin würde die Vorsilbe oder das
 * Trennzeichen mehrdeutig machen. Buchstaben, Ziffern, Strich, Unterstrich.
 */
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Der Speicher – oder null, wenn es keinen gibt.
 *
 * Wortgleich zur Prüfung in credit.js: im privaten Modus mancher Browser ist
 * localStorage zwar vorhanden, wirft beim Schreiben aber. Ohne Speicher gibt
 * es keine Absturzsicherung; das Spiel läuft trotzdem, denn der Gerätekredit
 * lebt ohnehin im Arbeitsspeicher und wird beim Verlassen zurückgebucht.
 */
const store = (() => {
	try {
		const candidate = globalThis.localStorage;
		if (!candidate) {
			return null;
		}
		candidate.setItem(PROBE_KEY, '1');
		candidate.removeItem(PROBE_KEY);
		return candidate;
	} catch {
		return null;
	}
})();

/** Alle auf DIESER Seite offenen Gerätekredite, je Schlüssel höchstens einer. */
const open = new Map();

/** Fortlaufende Nummer, damit zwei Kredite derselben Seite verschiedene Kennungen bekommen. */
let tokenCounter = 0;

/**
 * Erzeugt die Kennung dieses Seitenaufrufs.
 *
 * Bewusst OHNE Zufall: Math.random() ist in diesem Projekt für Spielwerte
 * verboten, und ein zweiter Weg zu Zufallszahlen neben der Zufallsquelle des
 * Geräts wäre eine unnötige zweite Quelle. Uhrzeit, Feinuhr des Seitenaufrufs
 * und eine laufende Nummer reichen vollkommen: zwei gleichzeitig geöffnete
 * Karten haben verschiedene Feinuhren, weil die bei jedem Seitenaufruf neu bei
 * null beginnt.
 *
 * @returns {string}
 */
function nextToken() {
	tokenCounter += 1;
	const clock = typeof globalThis.performance?.now === 'function'
		? Math.trunc(globalThis.performance.now() * 1000)
		: 0;
	return `${Date.now().toString(36)}-${clock.toString(36)}-${tokenCounter.toString(36)}`;
}

/**
 * Bringt eine beliebige Zahl in den gültigen Bereich eines Gerätekredits.
 *
 * Dieselben Grenzen wie beim Konto: 0 bis 999.999.999. Der Grund ist derselbe
 * — JavaScript rechnet nur bis 2^53−1 exakt, und ein Gerätekredit, der die
 * Genauigkeit verlässt, machte jede Bilanz wertlos.
 *
 * @param {number} value
 * @returns {number}
 */
function clamp(value) {
	if (!Number.isFinite(value)) {
		return credit.MIN_CREDITS;
	}
	const whole = Math.floor(value);
	if (whole < credit.MIN_CREDITS) {
		return credit.MIN_CREDITS;
	}
	if (whole > credit.MAX_CREDITS) {
		return credit.MAX_CREDITS;
	}
	return whole;
}

/**
 * @param {number} amount
 * @param {string} method
 * @returns {number}
 * @throws {RangeError} bei allem, was keine ganze Zahl von 1 bis MAX_CREDITS ist
 */
function requireAmount(amount, method) {
	if (!Number.isInteger(amount) || amount <= 0 || amount > credit.MAX_CREDITS) {
		throw new RangeError(
			`machineCredit.${method}() erwartet eine ganze Zahl von 1 bis ${credit.MAX_CREDITS}, bekam: ${String(amount)}`
		);
	}
	return amount;
}

/**
 * Zerlegt einen gespeicherten Spiegelwert.
 *
 * Ein Wert ohne Trennzeichen wird als reiner Betrag ohne Kennung gelesen. Das
 * ist kein Zugeständnis an eine alte Fassung, sondern der Fall „von Hand oder
 * von einem Prüfskript in den Speicher geschrieben": genau so wird der
 * Absturz in der Abnahme nachgestellt.
 *
 * @param {?string} raw
 * @returns {?{token: string, amount: number}} null, wenn dort nichts Brauchbares steht
 */
function parseMirror(raw) {
	if (typeof raw !== 'string') {
		return null;
	}
	const text = raw.trim();
	if (text === '') {
		return null;
	}
	const cut = text.indexOf(SEPARATOR);
	const token = cut === -1 ? '' : text.slice(0, cut);
	const digits = cut === -1 ? text : text.slice(cut + 1);
	if (!/^\d{1,18}$/.test(digits)) {
		return null;
	}
	return { token, amount: clamp(Number(digits)) };
}

/**
 * Der Gerätekredit genau eines Geräts auf genau dieser Seite.
 */
export class MachineCredit {
	/**
	 * Nicht selbst aufrufen – openMachineCredit() benutzen. Nur so ist
	 * sichergestellt, dass es je Schlüssel und Seite genau einen gibt.
	 *
	 * @param {string} key der Schlüssel des Geräts
	 */
	constructor(key) {
		/** Der Schlüssel, den das Gerät genannt hat. */
		this.key = key;

		/** Der vollständige Speicherschlüssel des Spiegels. */
		this.storageKey = MACHINE_STORAGE_PREFIX + key;

		/** Die Kennung dieses Seitenaufrufs. Siehe Dateikopf. */
		this.token = nextToken();

		/** Der Gerätekredit. Beim Betreten der Seite immer 0 (B.5.2). */
		this.amount = 0;

		/** Steht mein eigener Spiegel gerade im Speicher? */
		this.owns = false;

		/** Nach close() wirkungslos. */
		this.closed = false;

		/** Alle angemeldeten Zuhörer. */
		this.listeners = new Set();

		this.onStorage = (event) => this.receiveStorage(event);
		if (!konto.istServer && typeof globalThis.addEventListener === 'function') {
			globalThis.addEventListener('storage', this.onStorage);
		}

		/**
		 * SEIT AUSBAUSTUFE 3, D3b: im Servermodus gibt es keinen Spiegel und
		 * keinen storage-Zuhörer (oben schon nicht registriert) — stattdessen
		 * bekommt GENAU DIESE Instanz ihre eigenen, an den Server gebundenen
		 * Methoden (installServerBackend() weiter unten in dieser Datei). Sie
		 * überschreiben NUR diese Instanz, nie den Prototypen: die
		 * Prototyp-Methoden insert()/cashOut()/withdraw()/stake()/award()/
		 * close()/claim() bleiben dadurch Zeile für Zeile dieselben wie vor
		 * D3 — verify-table-money.mjs führt über genau diese Methoden einen
		 * SHA-256-Hash mit (Zusage: „seit Phase C1 buchstabengleich"), und der
		 * lokale Weg läuft im lokalen Modus ausschließlich über sie.
		 */
		if (konto.istServer) {
			installServerBackend(this);
		}

		/**
		 * Das Versprechen der Übernahme beim Anlegen. Ein Gerät muss es nicht
		 * abwarten – der Speicherzugriff und die Löschung laufen schon vor dem
		 * ersten await ab, die Buchung eine Mikroaufgabe später. Prüfskripte
		 * und spätere Fassungen mit einem Server warten darauf.
		 *
		 * @type {Promise<{claimed: number, rest: number}>}
		 */
		this.ready = this.claim();
	}

	/** Höchster Stand, den ein Gerätekredit annehmen kann. */
	get MAX() {
		return credit.MAX_CREDITS;
	}

	/** Kleinster Stand. Ein Minusstand kann nicht entstehen. */
	get MIN() {
		return credit.MIN_CREDITS;
	}

	/**
	 * Der rohe Spiegelwert, wie er gerade im Speicher steht, oder ''.
	 *
	 * Nur zum Nachmessen gedacht: ein Gerät kann seinen Spiegel damit als
	 * data-Attribut ans Gehäuse schreiben, ohne selbst an den Speicher zu
	 * gehen. Genau dafür ist der Getter da – er ist der Ersatz für den
	 * verbotenen eigenen Zugriff (B.5.3).
	 *
	 * @returns {string}
	 */
	get mirror() {
		const raw = this.read();
		return raw === null ? '' : raw;
	}

	/**
	 * @param {number} amount
	 * @returns {boolean}
	 */
	canAfford(amount) {
		return Number.isInteger(amount) && amount >= 0 && this.amount >= amount;
	}

	/**
	 * Meldet einen Zuhörer an. Er wird sofort einmal mit dem aktuellen Stand
	 * aufgerufen (reason: 'subscribe'), damit eine frisch angebundene Anzeige
	 * nicht leer bleibt – gleiches Verhalten wie credit.subscribe().
	 *
	 * reason ist danach 'insert', 'cashout', 'stake', 'award', 'claimed',
	 * 'surrendered' oder 'closed'.
	 *
	 * @param {function({amount: number, previous: number, reason: string, key: string}): void} listener
	 * @returns {function(): void} Abmeldefunktion
	 * @throws {TypeError}
	 */
	subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('machineCredit.subscribe() erwartet eine Funktion.');
		}
		this.listeners.add(listener);
		this.callOne(listener, this.amount, 'subscribe');
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Wirft einen Betrag aus der Kasse in das Gerät (B.5.2).
	 *
	 * ALLES ODER NICHTS: reicht die Kasse nicht, wird nichts bewegt und die
	 * Absage zurückgegeben. Das ist dieselbe Zusage, die credit.subtract()
	 * schon gibt, und sie ist die verständlichere: wer 100 einwirft und 40
	 * hat, bekommt eine Meldung statt einer stillen Teilbuchung, die er nicht
	 * verlangt hat.
	 *
	 * Reihenfolge: erst aus der Kasse abbuchen, dann dem Gerät gutschreiben.
	 * Nur so kann bei einem Fehlschlag nichts entstehen.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, amount: number, moved: number}
	 *                  |{ok: false, reason: 'nocash'|'full'|'closed', amount: number, moved: 0, missing?: number}>}
	 * @throws {RangeError}
	 */
	async insert(amount) {
		requireAmount(amount, 'insert');
		if (this.closed) {
			return { ok: false, reason: 'closed', amount: this.amount, moved: 0 };
		}
		if (amount > this.MAX - this.amount) {
			return { ok: false, reason: 'full', amount: this.amount, moved: 0 };
		}
		if (!credit.canAfford(amount)) {
			return {
				ok: false,
				reason: 'nocash',
				amount: this.amount,
				moved: 0,
				missing: amount - credit.balance,
			};
		}
		const result = await credit.subtract(amount);
		if (result.ok !== true) {
			return {
				ok: false,
				reason: 'nocash',
				amount: this.amount,
				moved: 0,
				missing: result.missing ?? amount,
			};
		}
		this.setAmount(this.amount + result.debited, 'insert');
		return { ok: true, amount: this.amount, moved: result.debited };
	}

	/**
	 * Bucht den Gerätekredit vollständig in die Kasse zurück (Taste CASH OUT
	 * und jeder Weg beim Verlassen der Seite).
	 *
	 * Ist die Kasse voll, wird gutgeschrieben, was hineinpasst, und der Rest
	 * bleibt im Gerät stehen. Das ist die Kappungsregel aus Teil A, Phase 7 –
	 * jetzt an der Kasse. Sie meldet sich über capped, damit das Gerät
	 * „KONTO VOLL" zeigen kann. Verschwinden kann dabei nichts.
	 *
	 * Reihenfolge: erst aus dem Gerät nehmen (setAmount(0, …) vor dem einzigen
	 * await), dann der Kasse geben. Zweierlei hängt daran:
	 *  - ein zweiter Aufruf, der in das Wartefenster fällt (ein zweiter Klick
	 *    auf CASH OUT, sobald credit.add() einmal eine echte Netzanfrage wird),
	 *    liest schon this.amount === 0 und bucht nichts nach – kein eigener
	 *    Merker nötig.
	 *  - der Spiegel ist damit VOR der Kassenbuchung gelöscht statt danach: ein
	 *    harter Abbruch dazwischen kann jetzt höchstens noch den Betrag
	 *    verlieren, nie ihn verdoppeln (CONCEPT.md B.5 erlaubt nur die erste
	 *    Richtung). Passt nicht alles in die Kasse, wird der Rest hinterher mit
	 *    setAmount() zurückgeschrieben.
	 *
	 * @param {string} [reason] nur für die Zuhörer
	 * @returns {Promise<{ok: true, moved: number, amount: number, capped: boolean}>}
	 */
	async cashOut(reason = 'cashout') {
		if (this.amount <= 0) {
			return { ok: true, moved: 0, amount: this.amount, capped: false };
		}
		const wanted = this.amount;
		this.setAmount(0, reason);
		const result = await credit.add(Math.min(wanted, this.MAX));
		const leftover = wanted - result.credited;
		if (leftover > 0) {
			this.setAmount(leftover, reason);
		}
		return {
			ok: true,
			moved: result.credited,
			amount: this.amount,
			capped: result.credited < wanted,
		};
	}

	/**
	 * Bucht einen TEILBETRAG des Gerätekredits in die Kasse zurück.
	 *
	 * Der Weg für „einen einzelnen Chip zurückgeben" (CONCEPT.md C.4.1 in der
	 * Fassung der Ansage vom 2026-09-07). cashOut() bleibt daneben unverändert
	 * bestehen und bucht weiterhin ALLES zurück; die beiden werden bewusst
	 * NICHT zusammengelegt, weil cashOut() der seit Ausbaustufe 2 geprüfte
	 * Weg jedes Automaten ist und ein Umbau dort nichts gewinnt.
	 *
	 * ALLES ODER NICHTS an der Geräteseite: reicht der Gerätekredit nicht, wird
	 * nichts bewegt. An der Kassenseite gilt dieselbe Kappungsregel wie bei
	 * cashOut(): passt nicht alles in die Kasse, bleibt der Rest im Gerät und
	 * capped meldet es. Verschwinden kann nichts.
	 *
	 * Reihenfolge wie in cashOut(): erst aus dem Gerät nehmen (setAmount vor
	 * dem einzigen await), dann der Kasse geben, dann einen etwaigen Rest
	 * zurückschreiben. Ein harter Abbruch dazwischen kann höchstens den Betrag
	 * verlieren, nie ihn verdoppeln.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @param {string} [reason] nur für die Zuhörer
	 * @returns {Promise<{ok: true, moved: number, amount: number, capped: boolean}
	 *                  |{ok: false, reason: 'insufficient'|'closed', amount: number, moved: 0}>}
	 * @throws {RangeError}
	 */
	async withdraw(amount, reason = 'withdraw') {
		requireAmount(amount, 'withdraw');
		if (this.closed) {
			return { ok: false, reason: 'closed', amount: this.amount, moved: 0 };
		}
		if (this.amount < amount) {
			return { ok: false, reason: 'insufficient', amount: this.amount, moved: 0 };
		}
		const previous = this.amount;
		this.setAmount(previous - amount, reason);
		const result = await credit.add(amount);
		const leftover = amount - result.credited;
		if (leftover > 0) {
			this.setAmount(this.amount + leftover, reason);
		}
		return {
			ok: true,
			moved: result.credited,
			amount: this.amount,
			capped: result.credited < amount,
		};
	}

	/**
	 * Bucht einen Einsatz vom Gerätekredit ab.
	 *
	 * Die Kasse wird dabei NICHT angefasst: gespielt wird ausschließlich vom
	 * Gerätekredit (B.5.2). Reicht er nicht, wird nichts abgebucht.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, amount: number, debited: number}
	 *                  |{ok: false, reason: 'insufficient'|'closed', amount: number, missing: number}>}
	 * @throws {RangeError}
	 */
	async stake(amount) {
		requireAmount(amount, 'stake');
		if (this.closed) {
			return { ok: false, reason: 'closed', amount: this.amount, missing: amount };
		}
		if (this.amount < amount) {
			return {
				ok: false,
				reason: 'insufficient',
				amount: this.amount,
				missing: amount - this.amount,
			};
		}
		const previous = this.amount;
		this.setAmount(previous - amount, 'stake');
		return { ok: true, amount: this.amount, debited: previous - this.amount };
	}

	/**
	 * Schreibt einen Gewinn dem Gerätekredit gut.
	 *
	 * Gekappt wird am Höchststand; capped meldet das zurück, damit das Gerät
	 * die Wahrheit anzeigen kann statt still zu schlucken.
	 *
	 * Nach close() abgelehnt, aus demselben Grund wie bei insert() und
	 * stake(): eine verspätete Gutschrift legte über setAmount() sonst einen
	 * neuen Spiegel an, der die Seite überlebt – entgegen B.5.3.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, amount: number, credited: number, capped: boolean}
	 *                  |{ok: false, reason: 'closed', amount: number, credited: 0, capped: false}>}
	 * @throws {RangeError}
	 */
	async award(amount) {
		requireAmount(amount, 'award');
		if (this.closed) {
			return { ok: false, reason: 'closed', amount: this.amount, credited: 0, capped: false };
		}
		const credited = Math.min(amount, this.MAX - this.amount);
		if (credited > 0) {
			this.setAmount(this.amount + credited, 'award');
		}
		return { ok: true, amount: this.amount, credited, capped: credited < amount };
	}

	/**
	 * Schließt den Gerätekredit: alles zurück in die Kasse, Spiegel weg,
	 * Zuhörer ab.
	 *
	 * Das Gerät ruft das aus seinem eigenen Abräumweg (pagehide) heraus –
	 * siehe Dateikopf, „WARUM HIER KEIN pagehide STEHT". Zurück wandert genau
	 * das, was jetzt noch im Gerät liegt; was das Gerät vorher über stake()
	 * herausgenommen hat, ist nicht mehr Sache dieses Bausteins.
	 *
	 * @returns {Promise<{ok: true, moved: number, amount: number, capped: boolean}>}
	 */
	async close() {
		if (this.closed) {
			return { ok: true, moved: 0, amount: this.amount, capped: false };
		}
		this.closed = true;
		open.delete(this.key);
		if (typeof globalThis.removeEventListener === 'function') {
			globalThis.removeEventListener('storage', this.onStorage);
		}
		const result = await this.cashOut('closed');
		this.listeners.clear();
		return result;
	}

	/* ------------------------------------------------------------------
	 * Ab hier: nichts davon ist für ein Gerät gedacht.
	 * ------------------------------------------------------------------ */

	/**
	 * Übernimmt beim Anlegen einen vorgefundenen Restbetrag.
	 *
	 * Der Platz wird SOFORT übernommen – gelöscht wird der Schlüssel, bevor
	 * gebucht wird. Eine andere Registerkarte, die denselben Rest gerade hält,
	 * sieht diese Löschung und gibt ihn kommentarlos auf (receiveStorage).
	 * Umgekehrt gäbe es ein Zeitfenster, in dem zwei Karten denselben Betrag
	 * beanspruchen.
	 *
	 * Lesen und Löschen sind zwei getrennte Speicherzugriffe. Öffnen zwei
	 * Registerkarten dasselbe Gerät im selben Augenblick (nach einem
	 * Browserabsturz der Regelfall, und genau dann liegt auch ein Spiegel
	 * vor), könnten beide denselben Rest lesen, bevor die erste ihn löscht.
	 * Bevor gebucht wird, wird der Rest deshalb zunächst unter der EIGENEN
	 * Kennung neu geschrieben und sofort erneut gelesen: der letzte Schreiber
	 * gewinnt eindeutig, die andere Karte findet danach eine fremde Kennung
	 * vor und bucht nichts – derselbe Weg wie bei surrenderTaken().
	 *
	 * @returns {Promise<{claimed: number, rest: number}>}
	 */
	async claim() {
		const found = parseMirror(this.read());
		if (found === null || found.amount <= 0) {
			// Steht dort Unlesbares, wird es weggeräumt: ein Wert, den niemand
			// deuten kann, ist kein Guthaben, sondern Müll.
			if (this.read() !== null) {
				this.owns = true;
				this.writeMirror();
			}
			return { claimed: 0, rest: 0 };
		}

		try {
			store.setItem(this.storageKey, this.token + SEPARATOR + String(found.amount));
		} catch {
			// siehe writeMirror()
		}
		let confirmed = null;
		try {
			confirmed = parseMirror(store.getItem(this.storageKey));
		} catch {
			confirmed = null;
		}
		if (confirmed === null || confirmed.token !== this.token) {
			// Eine andere Karte hat im selben Augenblick geschrieben und
			// gewonnen. Ich buche nichts – sonst stünde der Rest doppelt.
			return { claimed: 0, rest: 0 };
		}
		this.owns = true;

		const result = await credit.add(Math.min(found.amount, this.MAX));
		const rest = found.amount - result.credited;
		if (rest > 0) {
			// Nur erreichbar, wenn die Kasse am Höchststand steht. Der Rest
			// wird zum Gerätekredit dieser Seite statt zu verschwinden – die
			// einzige Auflösung, bei der die Bilanz stimmt.
			this.setAmount(rest, 'claimed');
		} else {
			this.removeMirror();
		}
		return { claimed: result.credited, rest };
	}

	/**
	 * Eine andere Registerkarte hat am Speicher gearbeitet.
	 *
	 * Die drei Fälle und ihre Begründung stehen im Dateikopf unter „DER
	 * SPIEGEL UND DIE ABSTURZSICHERUNG".
	 *
	 * @param {StorageEvent} event
	 * @returns {void}
	 */
	receiveStorage(event) {
		if (this.closed) {
			return;
		}
		if (store !== null && event.storageArea !== null && event.storageArea !== undefined
			&& event.storageArea !== store) {
			return;
		}
		// event.key ist null, wenn der ganze Speicher geleert wurde.
		if (event.key === null || event.key === undefined) {
			this.surrenderClaimed();
			return;
		}
		if (event.key !== this.storageKey) {
			return;
		}
		if (event.newValue === null || event.newValue === undefined) {
			const before = parseMirror(event.oldValue);
			if (before !== null && before.token === this.token) {
				this.surrenderClaimed();
			}
			return;
		}
		const after = parseMirror(event.newValue);
		if (after !== null && after.token === this.token) {
			// Kann nur mein eigenes Schreiben gewesen sein; das storage-Ereignis
			// feuert zwar nie in der schreibenden Karte, aber die Prüfung kostet
			// nichts und macht die Zusage im Code sichtbar.
			return;
		}
		void this.surrenderTaken();
	}

	/**
	 * Mein Betrag wurde von einer anderen Registerkarte in die Kasse gebucht.
	 * Ich gehe auf 0 und buche NICHTS – sonst stünde er zweimal im Konto.
	 *
	 * @returns {void}
	 */
	surrenderClaimed() {
		this.owns = false;
		if (this.amount === 0) {
			return;
		}
		const previous = this.amount;
		this.amount = 0;
		this.notify(previous, 'surrendered');
	}

	/**
	 * Eine andere Registerkarte führt den Platz jetzt. Ich buche meinen
	 * eigenen Betrag zurück in die Kasse und gehe auf 0.
	 *
	 * Bleibt dabei etwas übrig (Kasse am Höchststand), bleibt es im Gerät
	 * stehen und ist nicht gespiegelt; beim Verlassen der Seite wandert es
	 * über close() zurück. Verschwinden kann es nicht.
	 *
	 * @returns {Promise<void>}
	 */
	async surrenderTaken() {
		this.owns = false;
		if (this.amount > 0) {
			const previous = this.amount;
			const result = await credit.add(Math.min(previous, this.MAX));
			this.amount = clamp(previous - result.credited);
			this.notify(previous, 'surrendered');
		}
		// Steht im Speicher noch die eigene Kennung, hat mein letztes Schreiben
		// das fremde überholt. Dieser Eintrag ist erledigt und würde beim
		// nächsten Laden ein zweites Mal gutgeschrieben.
		const current = parseMirror(this.read());
		if (current !== null && current.token === this.token) {
			this.removeMirror();
		}
	}

	/**
	 * @param {number} next
	 * @param {string} reason
	 * @returns {void}
	 */
	setAmount(next, reason) {
		const previous = this.amount;
		this.amount = clamp(next);
		this.writeMirror();
		if (this.amount !== previous) {
			this.notify(previous, reason);
		}
	}

	/** @returns {?string} */
	read() {
		if (store === null) {
			return null;
		}
		try {
			return store.getItem(this.storageKey);
		} catch {
			return null;
		}
	}

	/**
	 * Schreibt den Spiegel oder löscht ihn bei 0.
	 *
	 * Gelöscht wird nur, wenn der Platz mir gehört: nach einer Aufgabe steht
	 * dort der Eintrag einer anderen Karte, und den anzufassen wäre falsch.
	 *
	 * @returns {void}
	 */
	writeMirror() {
		if (store === null) {
			return;
		}
		try {
			if (this.amount > 0) {
				store.setItem(this.storageKey, this.token + SEPARATOR + String(this.amount));
				this.owns = true;
			} else if (this.owns) {
				store.removeItem(this.storageKey);
				this.owns = false;
			}
		} catch {
			// Absichtlich still: ein voller Speicher ist kein Grund, das Spiel
			// abzubrechen. Ohne Spiegel entfällt nur die Absturzsicherung.
		}
	}

	/** @returns {void} */
	removeMirror() {
		if (store === null) {
			return;
		}
		try {
			store.removeItem(this.storageKey);
		} catch {
			// siehe writeMirror()
		}
		this.owns = false;
	}

	/**
	 * @param {function} listener
	 * @param {number} previous
	 * @param {string} reason
	 * @returns {void}
	 */
	callOne(listener, previous, reason) {
		try {
			listener(Object.freeze({ amount: this.amount, previous, reason, key: this.key }));
		} catch (error) {
			console.error('[casino] Ein Zuhörer des Gerätekredits hat einen Fehler geworfen.', error);
		}
	}

	/**
	 * Ein Fehler in einem Zuhörer darf die anderen nicht mitreißen.
	 *
	 * @param {number} previous
	 * @param {string} reason
	 * @returns {void}
	 */
	notify(previous, reason) {
		for (const listener of [...this.listeners]) {
			this.callOne(listener, previous, reason);
		}
	}
}

/**
 * Schaltet die Methoden EINER Instanz auf den Server um (Servermodus,
 * CONCEPT.md D.7, D.8, D.11 D3b).
 *
 * WARUM ALS EIGENE FUNKTION UND NICHT ALS GEÄNDERTE PROTOTYP-METHODE:
 * verify-table-money.mjs führt einen SHA-256-Hash über den QUELLTEXT von
 * insert(), cashOut(), stake(), award(), close() und claim() mit — die
 * Zusage, dass diese Methoden „seit Phase C1 buchstabengleich geblieben"
 * sind (Zusage 9 an die Automaten, insbesondere den eingefrorenen
 * Münzschieber). Eine Änderung AM PROTOTYPEN würde diese Zusage brechen,
 * obwohl der LOKALE Weg dadurch kein bisschen anders liefe: die
 * Prototyp-Methoden werden im Servermodus schlicht nie aufgerufen, weil
 * jede Instanz hier ihre eigenen Methoden bekommt, die den Prototyp
 * verdecken (reines JavaScript — eine Instanzeigenschaft geht einer
 * gleichnamigen Prototyp-Methode vor). Der Quelltext der geprüften Methoden
 * bleibt damit Zeile für Zeile derselbe, und der Nachweis muss nicht
 * angetastet werden.
 *
 * amount FOLGT konto.geraet — jede Serverantwort bringt den ganzen neuen
 * Stand mit, ob die Buchung angenommen wurde oder nicht (der Server ist die
 * alleinige Wahrheit, D.7.2). Es gibt hier keinen eigenen Zähler mehr, der
 * mit dem Server auseinanderlaufen könnte.
 *
 * DER SPIEGEL UND DIE ABSTURZSICHERUNG ENTFALLEN ERSATZLOS: writeMirror(),
 * removeMirror(), receiveStorage() und die beiden surrender*()-Methoden
 * bleiben auf dem Prototypen stehen, werden im Servermodus aber nie
 * aufgerufen — es gibt weder einen registrierten storage-Zuhörer (siehe
 * Konstruktor) noch einen Aufrufer, der sie von hier aus riefe. Die
 * Absturzsicherung IST der Server.
 *
 * @param {MachineCredit} instance
 * @returns {void}
 */
function installServerBackend(instance) {
	/**
	 * @param {{geraet: number}} antwort
	 * @param {string} reason
	 * @returns {void}
	 */
	function angleichen(antwort, reason) {
		const previous = instance.amount;
		instance.amount = antwort.geraet;
		if (instance.amount !== previous) {
			instance.notify(previous, reason);
		}
	}

	instance.claim = async () => {
		// Platz übernehmen: Gerätekredit UND Gewinnspeicher zurück in die
		// Kasse (CONCEPT.md D.7: „ein Gerätewechsel verliert kein Geld").
		const antwort = await konto.uebernahme();
		angleichen(antwort, 'claimed');
		return { claimed: 0, rest: 0 };
	};

	instance.insert = async (amount) => {
		requireAmount(amount, 'insert');
		if (instance.closed) {
			return { ok: false, reason: 'closed', amount: instance.amount, moved: 0 };
		}
		// EINE Buchung statt „erst Kasse abbuchen, dann Gerät gutschreiben" —
		// dazwischen kann nichts mehr verlorengehen.
		const antwort = await konto.einwurf(amount);
		angleichen(antwort, 'insert');
		return antwort.ok === true
			? { ok: true, amount: instance.amount, moved: antwort.bewegt }
			: { ok: false, reason: 'nocash', amount: instance.amount, moved: 0 };
	};

	instance.cashOut = async (reason = 'cashout') => {
		if (instance.amount <= 0) {
			return { ok: true, moved: 0, amount: instance.amount, capped: false };
		}
		const antwort = await konto.auszahlung(null);
		const moved = antwort.ok === true ? antwort.bewegt : 0;
		angleichen(antwort, reason);
		return { ok: true, moved, amount: instance.amount, capped: antwort.gekappt === true };
	};

	instance.withdraw = async (amount, reason = 'withdraw') => {
		requireAmount(amount, 'withdraw');
		if (instance.closed) {
			return { ok: false, reason: 'closed', amount: instance.amount, moved: 0 };
		}
		const antwort = await konto.auszahlung(amount);
		angleichen(antwort, reason);
		return antwort.ok === true
			? { ok: true, moved: antwort.bewegt, amount: instance.amount, capped: antwort.gekappt === true }
			: { ok: false, reason: 'insufficient', amount: instance.amount, moved: 0 };
	};

	instance.stake = async (amount) => {
		requireAmount(amount, 'stake');
		if (instance.closed) {
			return { ok: false, reason: 'closed', amount: instance.amount, missing: amount };
		}
		const antwort = await konto.einsatz(amount);
		angleichen(antwort, 'stake');
		return antwort.ok === true
			? { ok: true, amount: instance.amount, debited: antwort.bewegt }
			: { ok: false, reason: 'insufficient', amount: instance.amount, missing: amount };
	};

	instance.award = async (amount) => {
		requireAmount(amount, 'award');
		if (instance.closed) {
			return { ok: false, reason: 'closed', amount: instance.amount, credited: 0, capped: false };
		}
		const antwort = await konto.gewinn(amount);
		angleichen(antwort, 'award');
		// award() kennt lokal nur EINEN Ablehnungsgrund ('closed') — die
		// Schnittstelle bleibt zeichengenau; ein Serverfehlschlag (praktisch
		// nicht erreichbar, requireAmount() schließt einen ungültigen Betrag
		// schon aus) bekäme sonst einen Grund, den kein Aufrufer kennt.
		return antwort.ok === true
			? { ok: true, amount: instance.amount, credited: antwort.bewegt, capped: antwort.gekappt === true }
			: { ok: false, reason: 'closed', amount: instance.amount, credited: 0, capped: false };
	};

	instance.close = async () => {
		if (instance.closed) {
			return { ok: true, moved: 0, amount: instance.amount, capped: false };
		}
		instance.closed = true;
		open.delete(instance.key);
		// close() bucht wie bisher über cashOut() zurück (jetzt die
		// serverseitige Fassung oben) — konto.auszahlung(null), mit
		// keepalive, weil 'auszahlung' zu SCHLUSSVORGAENGE in
		// account-backend.js gehört.
		const result = await instance.cashOut('closed');
		instance.listeners.clear();
		return result;
	};

	Object.defineProperty(instance, 'mirror', {
		get: () => '',
		configurable: true,
		enumerable: true,
	});
}

/**
 * Öffnet den Gerätekredit eines Geräts.
 *
 * Je Schlüssel und Seite genau einer. Ein zweiter Aufruf mit demselben
 * Schlüssel ist ein Programmfehler und wird laut: zwei Stellen, die denselben
 * Kredit getrennt führen, wären zwei Wahrheiten über denselben Betrag – genau
 * das verbietet CONCEPT.md Abschnitt 5, Grundsatz 8. Wer den Kredit an einer
 * zweiten Stelle braucht, reicht das Objekt dorthin weiter.
 *
 * @param {string} key Schlüssel des Geräts, z. B. 'mein_geraet'
 * @returns {MachineCredit}
 * @throws {TypeError} bei einem unbrauchbaren Schlüssel
 * @throws {Error} wenn dieser Schlüssel auf dieser Seite schon offen ist
 */
export function openMachineCredit(key) {
	if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
		throw new TypeError(
			`openMachineCredit() erwartet einen Schlüssel aus Buchstaben, Ziffern, Strich oder Unterstrich, bekam: ${String(key)}`
		);
	}
	if (open.has(key)) {
		throw new Error(
			`Der Gerätekredit "${key}" ist auf dieser Seite bereits offen. Das Objekt weiterreichen statt ein zweites zu öffnen.`
		);
	}
	const instance = new MachineCredit(key);
	open.set(key, instance);
	return instance;
}

export default openMachineCredit;
