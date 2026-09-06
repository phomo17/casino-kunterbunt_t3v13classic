/**
 * Casino Kunterbunt – Nachweis der Bilanz von Kasse und Gerätekredit
 * ==================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-machine-credit.mjs
 *
 * Rückgabewert 0, wenn ALLES stimmt; 1 bei der ersten Abweichung.
 *
 *
 * WAS HIER BEWIESEN WIRD (CONCEPT.md B.10, Phase 3)
 * -------------------------------------------------
 *  1. Über eine längere Spielfolge stimmt die Summe aus Kasse und
 *     Gerätekredit auf den Kredit genau. Geprüft wird nach JEDEM einzelnen
 *     Schritt, nicht nur am Ende.
 *  2. Ein simulierter Absturz (Speicher mit Restbetrag, Seite neu geladen)
 *     bucht zurück und löscht den Spiegel.
 *  3. Zwei geöffnete Registerkarten laufen nicht auseinander, und zwei
 *     Karten, die im selben Augenblick denselben Absturzrest beanspruchen,
 *     schreiben ihn nicht beide gut (Phase 10, Befund M3).
 *  4. Im Ruhezustand liegen genau die in B.5.3 genannten Schlüssel im
 *     Speicher.
 *  5. Ohne ausreichenden Gerätekredit wird nichts abgebucht.
 *  6. Die Kappung am Höchststand lässt nichts verschwinden.
 *
 *
 * WARUM MIT DEN ECHTEN DATEIEN UND WIE
 * ------------------------------------
 * Eine eigens für die Prüfung geschriebene Nachbildung könnte richtig rechnen,
 * während das Spiel falsch bucht; dann wäre der Nachweis wertlos. Gerechnet
 * wird deshalb mit credit.js und machine-credit.js selbst.
 *
 * Zwei Hindernisse und ihre Auflösung:
 *
 *  a) machine-credit.js importiert credit.js über den Namen aus der
 *     Import-Map von TYPO3. Node kennt diese Karte nicht. Deshalb wird die
 *     Datei ALS TEXT gelesen, genau dieser eine Name durch die vollständige
 *     Dateiadresse ersetzt und das Ergebnis als data:-Modul geladen. Es ist
 *     Zeile für Zeile derselbe Code; nur der Modulname ist ein anderer.
 *     Dasselbe Verfahren, mit dem das Prüfskript aus Teil A Phase 6 schon
 *     Rules.php als Text liest.
 *  b) Beide Dateien lesen beim Laden den Browserspeicher und melden sich für
 *     Speicherereignisse an. Node hat weder das eine noch das andere. Beides
 *     wird VOR dem Laden hier bereitgestellt: ein Speicher im Arbeitsspeicher
 *     und eine Anmeldeliste. Genau dadurch wird der Zwei-Karten-Fall
 *     überhaupt prüfbar — die Ereignisse einer zweiten Karte lassen sich von
 *     Hand auslösen.
 *
 * Alle Vergleiche sind ganzzahlig. Im ganzen Skript steht kein Vergleich
 * zweier Kommazahlen auf Gleichheit.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const JS_DIR = new URL('../../Public/JavaScript/', import.meta.url);
const CREDIT_URL = new URL('credit.js', JS_DIR);
const MACHINE_URL = new URL('machine-credit.js', JS_DIR);

const CREDIT_KEY = 'casinoKunterbunt.credits';
const MACHINE_KEY = 'pruefgeraet';
const MIRROR_KEY = `casinoKunterbunt.machine.${MACHINE_KEY}`;

let failed = false;

/**
 * @param {boolean} condition
 * @param {string} label
 * @returns {void}
 */
function check(condition, label) {
	if (!condition) {
		failed = true;
	}
	console.log(`${condition ? '  ok  ' : '  FEHLER  '}${label}`);
}

/* --------------------------------------------------------------------------
   Ein Browserspeicher im Arbeitsspeicher, samt Ereignissen.
   -------------------------------------------------------------------------- */

/** @type {Map<string, string>} */
const cells = new Map();

/** Alle für 'storage' angemeldeten Funktionen, in Anmeldereihenfolge. */
const storageListeners = [];

const fakeStore = {
	getItem(key) {
		return cells.has(key) ? cells.get(key) : null;
	},
	setItem(key, value) {
		cells.set(key, String(value));
	},
	removeItem(key) {
		cells.delete(key);
	},
	clear() {
		cells.clear();
	},
	key(index) {
		return [...cells.keys()][index] ?? null;
	},
	get length() {
		return cells.size;
	},
};

globalThis.localStorage = fakeStore;

globalThis.addEventListener = (type, handler) => {
	if (type === 'storage') {
		storageListeners.push(handler);
	}
};
globalThis.removeEventListener = (type, handler) => {
	if (type !== 'storage') {
		return;
	}
	const at = storageListeners.indexOf(handler);
	if (at !== -1) {
		storageListeners.splice(at, 1);
	}
};

/**
 * Spielt ein Speicherereignis einer ZWEITEN Registerkarte ein.
 *
 * Wichtig: das Ereignis feuert im Browser nie in der schreibenden Karte. Diese
 * Funktion schreibt deshalb absichtlich SELBST in den Speicher und meldet es
 * anschließend – genau die Lage, in der sich die erste Karte befindet.
 *
 * @param {string} key
 * @param {?string} newValue null löscht
 * @returns {Promise<void>}
 */
async function foreignWrite(key, newValue) {
	const oldValue = fakeStore.getItem(key);
	if (newValue === null) {
		cells.delete(key);
	} else {
		cells.set(key, newValue);
	}
	const event = { key, oldValue, newValue, storageArea: fakeStore };
	for (const handler of [...storageListeners]) {
		handler(event);
	}
	// Den Zuhörern eine Mikroaufgabe Zeit geben: das Zurückbuchen läuft über
	// ein Versprechen.
	await Promise.resolve();
	await Promise.resolve();
}

/* --------------------------------------------------------------------------
   Die echten Module laden.
   -------------------------------------------------------------------------- */

const machineSource = await readFile(fileURLToPath(MACHINE_URL), 'utf8');
const patched = machineSource.replaceAll(
	"'@phomo17/casino-startpage/credit.js'",
	JSON.stringify(CREDIT_URL.href)
);
check(patched !== machineSource, 'der Modulname in machine-credit.js wurde für Node aufgelöst');

const { credit } = await import(CREDIT_URL.href);
const machineModule = await import(
	`data:text/javascript;base64,${Buffer.from(patched, 'utf8').toString('base64')}`
);
const { openMachineCredit, MachineCredit } = machineModule;

/* --------------------------------------------------------------------------
   Der Bilanzwächter.
   -------------------------------------------------------------------------- */

/**
 * Die Gesamtmenge Kredite, die es geben darf.
 *
 * Bei insert(), cashOut() und der Absturzsicherung wird nur UMVERTEILT
 * zwischen Kasse und Gerätekredit — der Wert bleibt gleich. Bei stake() und
 * award() dagegen entsteht bzw. verschwindet Kredit ABSICHTLICH: ein Einsatz
 * ist Spielkosten, ein Gewinn ist neu gezogenes Guthaben, sonst gäbe es keine
 * Quote. Für diese beiden Fälle wird expectedTotal deshalb im Spielverlauf um
 * genau den von der Schnittstelle selbst gemeldeten Betrag nachgeführt.
 */
let expectedTotal = 0;

/**
 * @param {{amount: number}} machine
 * @param {string} label
 * @returns {void}
 */
function checkBalance(machine, label) {
	const total = credit.balance + machine.amount;
	check(total === expectedTotal,
		`${label}: Kasse ${credit.balance} + Gerät ${machine.amount} = ${total} (erwartet ${expectedTotal})`);
}

/**
 * Eine kleine, wiederholbare Zahlenfolge – kein Zufall, damit jeder Lauf
 * dasselbe Ergebnis liefert und ein Fehlschlag nachstellbar ist.
 *
 * @param {number} seed
 * @returns {function(number): number} liefert 0 bis grenze−1
 */
function sequence(seed) {
	let state = seed;
	return (limit) => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state % limit;
	};
}

console.log('Kasse und Gerätekredit – Ausgangslage');

await credit.reload();
expectedTotal = credit.balance;
check(credit.balance === credit.START_BALANCE,
	`Startguthaben bei leerem Speicher: ${credit.balance}`);
check(fakeStore.getItem(MIRROR_KEY) === null, 'kein Spiegel vorhanden');

const machine = openMachineCredit(MACHINE_KEY);
await machine.ready;
check(machine.amount === 0, 'der Gerätekredit ist beim Betreten der Seite 0 (B.5.2)');
checkBalance(machine, 'nach dem Anlegen');

console.log('\nEinwurf aus der Kasse');

await credit.set(1000);
expectedTotal = 1000;

let result = await machine.insert(2000);
check(result.ok === false && result.reason === 'nocash' && machine.amount === 0
	&& credit.balance === 1000,
	'mehr als der Kassenbestand geht nicht, und es wird nichts bewegt');

result = await machine.insert(250);
check(result.ok === true && result.moved === 250 && machine.amount === 250
	&& credit.balance === 750,
	'250 wandern aus der Kasse in das Gerät');
checkBalance(machine, 'nach dem Einwurf');
check(fakeStore.getItem(MIRROR_KEY) === `${machine.token}|250`,
	'der Spiegel trägt Kennung und Betrag');

console.log('\nEine längere Spielfolge – nach jedem Schritt geprüft');

const draw = sequence(20260902);
let rounds = 0;
let refused = 0;
for (let i = 0; i < 400; i++) {
	const bet = [1, 2, 5, 10][draw(4)];
	const staked = await machine.stake(bet);
	if (staked.ok !== true) {
		refused += 1;
		check(machine.amount < bet, 'abgelehnt wurde nur, wenn der Gerätekredit nicht reichte');
		// Nachwerfen, solange die Kasse etwas hergibt.
		if (credit.canAfford(100)) {
			await machine.insert(100);
		} else if (credit.balance > 0) {
			await machine.insert(credit.balance);
		} else {
			break;
		}
		if (credit.balance + machine.amount !== expectedTotal) {
			check(false, 'Bilanz nach dem Nachwerfen');
		}
		continue;
	}
	rounds += 1;
	// Ein Einsatz ist Spielkosten: er verlässt das System, sobald er verloren
	// ist. Ein Gewinn ist neu entstandenes Guthaben aus der Ziehung. Beides ist
	// hier ABSICHT (Glücksspiel erzeugt und vernichtet Kredit per Definition,
	// sonst gäbe es keine Quote) und keine undichte Stelle. Geprüft wird
	// deshalb, ob genau der von der Schnittstelle SELBST gemeldete Betrag
	// bewegt wurde — nicht mehr und nicht weniger.
	expectedTotal -= staked.debited;
	const factor = [0, 0, 0, 0, 0, 1, 3, 5, 8, 10, 14, 20, 50, 100][draw(14)];
	if (factor > 0) {
		const awarded = await machine.award(factor * bet);
		expectedTotal += awarded.credited;
	}
	if (credit.balance + machine.amount !== expectedTotal) {
		check(false, `Bilanz nach Runde ${i + 1}`);
		break;
	}
}
check(rounds > 0, `${rounds} Runden gespielt, ${refused} Züge mangels Gerätekredit abgelehnt`);
checkBalance(machine, 'nach der ganzen Spielfolge');

console.log('\nAuszahlen und Verlassen');

const before = credit.balance + machine.amount;
const paid = await machine.cashOut();
check(machine.amount === 0 && credit.balance === before,
	`CASH OUT bucht ${paid.moved} vollständig in die Kasse zurück`);
check(fakeStore.getItem(MIRROR_KEY) === null, 'bei 0 wird der Spiegel gelöscht');
check([...cells.keys()].sort().join(', ') === CREDIT_KEY,
	`im Ruhezustand liegt genau ein Schlüssel im Speicher: ${[...cells.keys()].join(', ')}`);

await machine.insert(120);
const closed = await machine.close();
check(closed.moved === 120 && machine.amount === 0 && credit.balance === before,
	'close() bucht den Gerätekredit vollständig zurück – kein Geld bleibt liegen');
check(fakeStore.getItem(MIRROR_KEY) === null, 'close() räumt den Spiegel weg');

console.log('\nAbsturzsicherung');

expectedTotal = credit.balance + 25;
fakeStore.setItem(MIRROR_KEY, '25');
const afterCrash = openMachineCredit(MACHINE_KEY);
await afterCrash.ready;
check(credit.balance + afterCrash.amount === expectedTotal,
	'ein vorgefundener Restbetrag wird sofort zurückgebucht');
check(afterCrash.amount === 0, 'das Gerät beginnt trotzdem bei 0');
check(fakeStore.getItem(MIRROR_KEY) === null, 'der Spiegel wurde gelöscht');

console.log('\nZwei Registerkarten');

await afterCrash.insert(80);
const held = afterCrash.amount;
const total = credit.balance + held;

// Fall 1: die zweite Karte übernimmt den Platz beim Anlegen. Sie löscht den
// Schlüssel und bucht den Betrag selbst — hier nachgestellt.
await credit.add(held);
await foreignWrite(MIRROR_KEY, null);
check(afterCrash.amount === 0 && credit.balance === total,
	'wird mein Spiegel von einer anderen Karte übernommen, gehe ich auf 0 und buche nichts nach');

// Fall 2: die zweite Karte schreibt ihren eigenen Betrag über den Platz.
await afterCrash.insert(60);
const beforeTakeover = credit.balance + afterCrash.amount;
await foreignWrite(MIRROR_KEY, 'fremdeKennung|15');
check(afterCrash.amount === 0 && credit.balance === beforeTakeover,
	'schreibt eine andere Karte auf den Platz, buche ich meinen Betrag zurück – die Summe bleibt gleich');
check(fakeStore.getItem(MIRROR_KEY) === 'fremdeKennung|15',
	'der Eintrag der anderen Karte bleibt unangetastet');

console.log('\nZwei Registerkarten legen gleichzeitig an (M3)');

// Zwei Instanzen mit demselben Schlüssel sind auf EINER Seite nicht möglich
// (openMachineCredit() wirft) – zwei echte Registerkarten sind aber zwei
// getrennte Prozesse, jede mit einem eigenen open-Register. Nachgestellt wird
// deshalb die Race an der Speicherstelle selbst: eine "fremde" Karte schreibt
// GENAU in dem Augenblick über den Platz, in dem claim() ihren eigenen
// Schreibvorgang bestätigen will – also zwischen dem ersten setItem() und dem
// bestätigenden getItem().
const RACE_KEY = 'casinoKunterbunt.machine.pruefgeraetdrei';
fakeStore.setItem(RACE_KEY, '40');
const beforeRace = credit.balance;

const realSetItem = fakeStore.setItem.bind(fakeStore);
let raced = false;
fakeStore.setItem = (key, value) => {
	realSetItem(key, value);
	if (key === RACE_KEY && !raced) {
		raced = true;
		// Die fremde Karte gewinnt: sie schreibt direkt im Anschluss über
		// denselben Platz, bevor die erste Karte ihn zurückliest.
		realSetItem(RACE_KEY, 'fremdeKennung|40');
	}
};

const racer = new MachineCredit('pruefgeraetdrei');
await racer.ready;
fakeStore.setItem = realSetItem;

check(racer.amount === 0 && credit.balance === beforeRace,
	'verliert eine Karte das Wettrennen um denselben Absturzrest, bucht sie nichts nach');
check(fakeStore.getItem(RACE_KEY) === 'fremdeKennung|40',
	'der Eintrag der gewinnenden Karte bleibt unangetastet');

console.log('\nKappung am Höchststand');

await foreignWrite(MIRROR_KEY, null);
const full = openMachineCredit('pruefgeraetzwei');
await full.ready;
await credit.set(credit.MAX_CREDITS - 10);
await credit.subtract(50);
await full.insert(50);
await credit.set(credit.MAX_CREDITS);
const overflow = await full.cashOut();
check(overflow.capped === true && overflow.moved === 0 && full.amount === 50,
	'ist die Kasse voll, bleibt der Rest im Gerät stehen statt zu verschwinden');
await full.close();

console.log(failed
	? '\nERGEBNIS: die Bilanz von Kasse und Gerätekredit stimmt NICHT.'
	: '\nERGEBNIS: über die ganze Spielfolge entstehen und verschwinden keine Kredite, '
	+ 'der Absturzrest wird zurückgebucht, zwei Registerkarten laufen nicht auseinander, '
	+ 'und im Ruhezustand liegt genau der Kassenschlüssel im Speicher.');

process.exit(failed ? 1 : 0);
