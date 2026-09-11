/**
 * Casino Kunterbunt – gemeinsame Guthaben-Schnittstelle
 * =====================================================
 *
 * Dies ist die einzige Stelle im gesamten Projekt, die den KASSENstand im
 * Speicher anfasst. Kein Automat greift selbst auf den localStorage zu
 * (CONCEPT.md B.5.3). Den Spiegel des Gerätekredits führt machine-credit.js,
 * ebenfalls hier im Site Package und ebenfalls außerhalb der Reichweite eines
 * Automaten.
 *
 * Einbindung in einer Automaten-Extension:
 *
 *   import { credit } from '@phomo17/casino-startpage/credit.js';
 *
 * Öffentliche Schnittstelle: siehe README.md, Abschnitt
 * „Guthaben-Schnittstelle". Kurzfassung:
 *
 *   credit.balance                 Zahl, synchron, immer aktuell
 *   credit.canAfford(betrag)       true/false, synchron
 *   credit.format(wert?)           deutsche Tausenderpunkte
 *   await credit.add(betrag)       gutschreiben
 *   await credit.subtract(betrag)  abbuchen, mit Absage statt Minusstand
 *   await credit.set(betrag)       setzen (nur Verwaltung/Rücksetzen)
 *   await credit.reload()          Speicher neu einlesen
 *   credit.subscribe(fn)           anmelden, liefert Abmeldefunktion
 *
 * SEIT AUSBAUSTUFE 2, PHASE 3 IST DAS NUR DIE HÄLFTE
 * --------------------------------------------------
 * Diese Datei führt die KASSE — den Gesamtbestand, der allen Geräten gehört
 * (CONCEPT.md B.5.1). Der GERÄTEKREDIT, also der Betrag, den ein Spieler in
 * EIN Gerät eingeworfen hat, liegt daneben in machine-credit.js. Gespielt
 * wird ausschließlich von dort; diese Datei wird von einem Gerät nur noch für
 * die ANZEIGE der Kasse gelesen und über machine-credit.js verändert.
 *
 * set() ist seit dieser Phase auch der Weg, mit dem das Leuchtschild den
 * Kassenstand frei einstellt (B.5.1, credit-set.js). Die Beschreibung „nur
 * für Verwaltung und Rücksetzen" gilt unverändert: das freie Setzen ist
 * Verwaltung, kein Spielzug, und verschwindet in Stufe 3 ersatzlos.
 *
 * Warum die ändernden Methoden schon heute asynchron sind, obwohl der
 * localStorage synchron arbeitet: sie sind die Stelle, an der später ein
 * serverseitiges Konto eingehängt wird (CONCEPT.md Abschnitt 8). Ein Server
 * antwortet erst nach einer Netzanfrage. Wären sie heute synchron, müsste
 * beim Umstieg jeder Aufrufer in jeder Automaten-Extension umgeschrieben
 * werden. So kostet der Umstieg genau eine Datei: diese hier — das stimmt
 * so nicht mehr, siehe den Nachtrag unten.
 *
 * SEIT AUSBAUSTUFE 3 GIBT ES ZWEI RÜCKSEITEN (2026-09-10)
 * --------------------------------------------------------
 * Die Bruchstelle von oben wird jetzt benutzt: account-backend.js entscheidet
 * beim Laden der Seite, ob diese Datei den Browserspeicher führt (wie bisher)
 * oder ein serverseitiges Konto (CONCEPT.md D.1.1, D.7). Diese Datei fragt bei
 * jeder Handlung `konto.istServer` und reicht im Servermodus an konto.aufladen
 * / .abbuchen / .setzen / .stand weiter — dieselbe öffentliche Schnittstelle,
 * derselbe Rückgabewert.
 *
 * Der Satz oben „So kostet der Umstieg genau eine Datei: diese hier" war zu
 * knapp: es sind zwei Dateien (diese hier und machine-credit.js) plus eine
 * neue (account-backend.js, die eine Umschaltstelle) — und weiterhin NULL
 * Zeilen in jedem Gerät.
 */

// ÜBER DAS PRÄFIX, nicht relativ (Korrektur vom 2026-09-10, zweiter
// Nachbesserungslauf): ein relativer Import ('./account-backend.js') schien
// zunächst der billigere Weg — er machte credit.js unter Node wieder ohne
// Text-Patch ladbar. Er hat aber eine echte Folge, die vorher übersehen
// wurde: ein Gerätemodul (store.js) in einer ANDEREN Extension liegt und MUSS
// account-backend.js über das Präfix importieren (eine relative Referenz
// über Extension-Grenzen hinweg wäre die verbotene Art von Kopplung). Ein
// Modul unter einer relativen Adresse UND dasselbe Modul unter der
// Import-Karten-Adresse (mit "?bust=…") sind für den Browser ZWEI
// VERSCHIEDENE Adressen — und ein ES-Modul wird je Adresse ein eigenes
// Mal ausgewertet. Ergebnis, an der laufenden Seite gemessen: zwei
// getrennte konto-Objekte, zwei Kundenkennungen, zwei Buchungsnummern-
// Zähler. Das ist kein Stilbruch, das ist ein Fehler in der Buchführung.
// Der einzige Weg zu GARANTIERT einem Exemplar: ALLE Importeure (auch
// dieser hier) verwenden dieselbe Adresse — das Präfix, weil store.js
// nicht anders kann. Der Preis: credit.js braucht unter Node wieder einen
// Text-Patch, wie machine-credit.js es ohnehin schon immer tat.
import { konto } from '@phomo17/casino-startpage/account-backend.js';

/** Der eine gemeinsame Schlüssel im Browserspeicher. */
const STORAGE_KEY = 'casinoKunterbunt.credits';

/** Startguthaben beim allerersten Besuch. Wird einmal geschrieben. */
const START_BALANCE = 100;

/** Kleinstmöglicher Stand. Ein Minusstand kann nicht entstehen. */
const MIN_CREDITS = 0;

/**
 * Höchststand. Neun Stellen.
 *
 * Grund: JavaScript rechnet nur bis 2^53-1 exakt. Darüber liefert jede
 * Addition stillschweigend falsche Ergebnisse. Die Risiko-Leiter darf laut
 * CONCEPT.md Abschnitt 3.4 unbegrenzt verdoppeln — das betrifft den Gewinn
 * im Automaten, nicht das Konto. Das Konto sättigt hier, weit unterhalb der
 * Rechengenauigkeit, damit jede Zwischensumme exakt bleibt. add() meldet
 * über "capped" zurück, wenn etwas abgeschnitten wurde.
 */
const MAX_CREDITS = 999999999;

/** Nur zum Prüfen, ob der Speicher überhaupt beschreibbar ist. */
const PROBE_KEY = 'casinoKunterbunt.probe';

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/**
 * Der Speicher – oder null, wenn es keinen gibt.
 *
 * Im privaten Modus mancher Browser ist localStorage zwar vorhanden, wirft
 * beim Schreiben aber. Deshalb wird einmal probeweise geschrieben. Ist kein
 * Speicher verfügbar, lebt das Guthaben nur bis zum nächsten Seitenwechsel;
 * das Spiel läuft trotzdem.
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

/** Alle angemeldeten Zuhörer auf dieser Seite. */
const listeners = new Set();

/** Der zwischengespeicherte Stand. Synchron lesbar über credit.balance. */
let balance = MIN_CREDITS;

/**
 * Bringt eine beliebige Zahl in den gültigen Bereich.
 *
 * @param {number} value
 * @returns {number} ganze Zahl zwischen MIN_CREDITS und MAX_CREDITS
 */
function clamp(value) {
	if (!Number.isFinite(value)) {
		return MIN_CREDITS;
	}
	const whole = Math.floor(value);
	if (whole < MIN_CREDITS) {
		return MIN_CREDITS;
	}
	if (whole > MAX_CREDITS) {
		return MAX_CREDITS;
	}
	return whole;
}

/**
 * Liest einen gespeicherten Rohwert aus.
 *
 * @param {?string} raw
 * @returns {?number} null, wenn nichts gespeichert war (erster Besuch);
 *                    sonst ein gültiger Stand. Ein beschädigter Wert wird zu
 *                    0. Bewusst nicht zum Startguthaben: ein manipulierter
 *                    Speicher soll nicht belohnt werden, und 0 ist ein
 *                    definierter Zustand, aus dem heraus das Aufladen
 *                    funktioniert.
 */
function parseStored(raw) {
	if (raw === null || raw === undefined) {
		return null;
	}
	const text = String(raw).trim();
	if (!/^-?\d{1,18}$/.test(text)) {
		return MIN_CREDITS;
	}
	return clamp(Number(text));
}

/**
 * Schreibt in den Speicher. Schlägt das fehl (Speicher voll, privater
 * Modus), läuft das Spiel mit dem Wert im Arbeitsspeicher weiter.
 *
 * @param {number} value
 * @returns {void}
 */
function writeStore(value) {
	if (konto.istServer) {
		return;
	}
	if (store === null) {
		return;
	}
	try {
		store.setItem(STORAGE_KEY, String(value));
	} catch {
		// Absichtlich still: ein voller Speicher ist kein Grund, das Spiel
		// abzubrechen.
	}
}

/**
 * Liest den Speicher und repariert ihn, falls nötig.
 *
 * @returns {number}
 */
function readStore() {
	if (konto.istServer) {
		return balance;
	}
	if (store === null) {
		return balance;
	}
	let raw = null;
	try {
		raw = store.getItem(STORAGE_KEY);
	} catch {
		return balance;
	}
	const parsed = parseStored(raw);
	if (parsed === null) {
		writeStore(START_BALANCE);
		return START_BALANCE;
	}
	if (String(parsed) !== raw) {
		writeStore(parsed);
	}
	return parsed;
}

/**
 * @param {function} listener
 * @param {string} reason
 * @returns {void}
 */
function notifyOne(listener, reason) {
	try {
		listener(Object.freeze({ balance, previous: balance, reason }));
	} catch (error) {
		console.error('[casino] Ein Guthaben-Zuhörer hat einen Fehler geworfen.', error);
	}
}

/**
 * Meldet eine Änderung an alle Zuhörer dieser Seite. Ein Fehler in einem
 * Zuhörer darf die anderen nicht mitreißen.
 *
 * @param {number} previous
 * @param {string} reason  'add' | 'subtract' | 'set' | 'reload' | 'remote'
 * @returns {void}
 */
function notify(previous, reason) {
	if (previous === balance) {
		return;
	}
	const detail = Object.freeze({ balance, previous, reason });
	for (const listener of [...listeners]) {
		try {
			listener(detail);
		} catch (error) {
			console.error('[casino] Ein Guthaben-Zuhörer hat einen Fehler geworfen.', error);
		}
	}
}

/**
 * @param {number} amount
 * @param {string} method
 * @returns {number}
 * @throws {RangeError} bei allem, was keine ganze Zahl von 1 bis MAX_CREDITS ist
 */
function requireAmount(amount, method) {
	if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_CREDITS) {
		throw new RangeError(
			`credit.${method}() erwartet eine ganze Zahl von 1 bis ${MAX_CREDITS}, bekam: ${String(amount)}`
		);
	}
	return amount;
}

// Startwert holen. Im Servermodus liegt er im Zustandsblock, den
// account-backend.js gelesen hat — der Browserspeicher wird dort nicht
// angefasst, auch nicht gelesen (kein Startguthaben aus dem Nichts). Beim
// allerersten lokalen Besuch legt readStore() dabei zugleich das
// Startguthaben im Speicher an, damit es nach dem ersten Nullstand nicht
// erneut vergeben wird.
balance = konto.istServer ? konto.kasse : readStore();

/**
 * Andere Registerkarten desselben Browsers.
 *
 * Das storage-Ereignis feuert ausschließlich in den *anderen* Karten, nie in
 * der schreibenden — eine Rückkopplung ist damit ausgeschlossen. Ohne diesen
 * Zuhörer würden zwei geöffnete Karten auseinanderlaufen und die zuletzt
 * schreibende die andere stillschweigend überschreiben. Ein Klick mit der
 * mittleren Maustaste auf ein Gerät im Saal öffnet genau so eine zweite
 * Karte, der Fall ist also real und kein Sonderfall.
 *
 * Gleichzeitige Schreibvorgänge löst das nicht auf; der letzte gewinnt. Das
 * ist hingenommen: es geht um kein echtes Geld, und gespielt wird in einer
 * Karte.
 */
if (!konto.istServer && typeof globalThis.addEventListener === 'function') {
	globalThis.addEventListener('storage', (event) => {
		// event.key ist null, wenn der ganze Speicher geleert wurde.
		if (event.key !== null && event.key !== STORAGE_KEY) {
			return;
		}
		if (store !== null && event.storageArea !== null && event.storageArea !== store) {
			return;
		}
		const previous = balance;
		balance = readStore();
		notify(previous, 'remote');
	});
}

/**
 * SEIT AUSBAUSTUFE 3: das serverseitige Gegenstück zum storage-Ereignis.
 *
 * Im Servermodus gibt es keinen Browserspeicher, den eine andere
 * Registerkarte anfassen könnte — jede autoritative Änderung kommt
 * stattdessen direkt vom Server, über jede Buchung UND über konto.stand().
 * Diese Anmeldung ist der einzige Weg, wie ein serverseitig gebuchter Betrag
 * seinen Weg in credit.balance findet; add()/subtract()/set()/reload() lösen
 * selbst KEIN eigenes notify() mehr aus, wenn konto.istServer gilt (siehe
 * dort) — genau diese Anmeldung erledigt es, einheitlich mit reason
 * 'remote', „damit jede vorhandene Anzeige ohne Änderung mitgeht".
 */
if (konto.istServer) {
	konto.abonnieren((zustand) => {
		const previous = balance;
		balance = zustand.kasse;
		notify(previous, 'remote');
	});
}

/**
 * Rückkehr aus dem Vor-/Zurück-Zwischenspeicher (bfcache).
 *
 * Das storage-Ereignis oben feuert NICHT, solange ein Dokument im
 * Zwischenspeicher liegt — es ist währenddessen laut Standard nicht „fully
 * active". Ohne diesen Zuhörer rechnete eine so wiederhergestellte Seite mit
 * dem Kassenstand von vor dem Verlassen weiter, obwohl eine andere Karte ihn
 * in der Zwischenzeit verändert haben kann.
 *
 * event.persisted ist nur bei genau diesem Fall true; ein gewöhnliches Laden
 * hat balance oben gerade erst über readStore() gesetzt und braucht keinen
 * zweiten Lesevorgang.
 */
if (typeof globalThis.addEventListener === 'function') {
	globalThis.addEventListener('pageshow', (event) => {
		if (event.persisted === true) {
			void credit.reload();
		}
	});
}

/**
 * Die öffentliche Schnittstelle.
 */
export const credit = {
	STORAGE_KEY,
	START_BALANCE,
	MIN_CREDITS,
	MAX_CREDITS,

	/**
	 * Der aktuelle Stand. Synchron, damit ihn auch eine Zeichenschleife
	 * gefahrlos abfragen kann.
	 *
	 * @returns {number}
	 */
	get balance() {
		return balance;
	},

	/**
	 * @param {number} amount
	 * @returns {boolean}
	 */
	canAfford(amount) {
		return Number.isInteger(amount) && amount >= 0 && balance >= amount;
	},

	/**
	 * Deutsche Schreibweise mit Tausenderpunkten.
	 *
	 * @param {number} [value] Voreinstellung: der aktuelle Stand
	 * @returns {string}
	 */
	format(value = balance) {
		return numberFormat.format(clamp(Number(value)));
	},

	/**
	 * Liest den Speicher neu ein.
	 *
	 * @returns {Promise<number>}
	 */
	async reload() {
		if (konto.istServer) {
			await konto.stand();
			// balance wurde von konto.abonnieren() bereits gesetzt (reason
			// 'remote') — hier gibt es nichts mehr zu tun.
			return balance;
		}
		const previous = balance;
		balance = readStore();
		notify(previous, 'reload');
		return balance;
	},

	/**
	 * Schreibt gut.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, balance: number, credited: number, capped: boolean}>}
	 * @throws {RangeError}
	 */
	async add(amount) {
		requireAmount(amount, 'add');
		if (konto.istServer) {
			const antwort = await konto.aufladen(amount);
			// balance wurde von konto.abonnieren() bereits gesetzt und notify()
			// ausgelöst — hier wird nur noch die vertraute Form gebildet.
			return antwort.ok
				? { ok: true, balance, credited: antwort.bewegt, capped: antwort.gekappt }
				: { ok: true, balance, credited: 0, capped: false };
		}
		const previous = balance;
		balance = clamp(previous + amount);
		writeStore(balance);
		notify(previous, 'add');
		const credited = balance - previous;
		return { ok: true, balance, credited, capped: credited < amount };
	},

	/**
	 * Bucht ab. Reicht das Guthaben nicht, wird nichts abgebucht und die
	 * Absage zurückgegeben — es entsteht niemals ein Minusstand.
	 *
	 * @param {number} amount ganze Zahl ab 1
	 * @returns {Promise<{ok: true, balance: number, debited: number}
	 *                  |{ok: false, reason: 'insufficient', balance: number, missing: number}>}
	 * @throws {RangeError}
	 */
	async subtract(amount) {
		requireAmount(amount, 'subtract');
		if (konto.istServer) {
			const antwort = await konto.abbuchen(amount);
			// Der Grund 'kasse_zu_gering' des Servers wird auf 'insufficient'
			// abgebildet, damit kein Aufrufer etwas Neues lernen muss.
			if (antwort.ok !== true) {
				return { ok: false, reason: 'insufficient', balance, missing: amount - balance };
			}
			return { ok: true, balance, debited: antwort.bewegt };
		}
		if (balance < amount) {
			return { ok: false, reason: 'insufficient', balance, missing: amount - balance };
		}
		const previous = balance;
		balance = clamp(previous - amount);
		writeStore(balance);
		notify(previous, 'subtract');
		return { ok: true, balance, debited: previous - balance };
	},

	/**
	 * Setzt den Stand hart. Nur für Verwaltung und Rücksetzen gedacht, nicht
	 * für den Spielablauf — dort gehören add() und subtract() hin.
	 *
	 * @param {number} amount
	 * @returns {Promise<{ok: true, balance: number}>}
	 */
	async set(amount) {
		if (konto.istServer) {
			await konto.setzen(clamp(Number(amount)));
			// balance wurde von konto.abonnieren() bereits gesetzt (wie bei add()).
			return { ok: true, balance };
		}
		const previous = balance;
		balance = clamp(Number(amount));
		writeStore(balance);
		notify(previous, 'set');
		return { ok: true, balance };
	},

	/**
	 * Meldet einen Zuhörer an. Er wird sofort einmal mit dem aktuellen Stand
	 * aufgerufen (reason: 'subscribe'), damit eine frisch angebundene Anzeige
	 * nicht leer bleibt.
	 *
	 * @param {function({balance: number, previous: number, reason: string}): void} listener
	 * @returns {function(): void} Abmeldefunktion
	 * @throws {TypeError}
	 */
	subscribe(listener) {
		if (typeof listener !== 'function') {
			throw new TypeError('credit.subscribe() erwartet eine Funktion.');
		}
		listeners.add(listener);
		notifyOne(listener, 'subscribe');
		return () => {
			listeners.delete(listener);
		};
	},
};

export default credit;
