/**
 * Casino Kunterbunt – Anzeige und Bedienung des Guthabens
 * =======================================================
 *
 * Verbindet die Guthaben-Schnittstelle mit dem Markup eines Leuchtschildes.
 * Bewusst von credit.js getrennt: dort steht der Vertrag und der Speicher,
 * hier steht nur die Verdrahtung mit dem Dokument. Ein Automat, der seine
 * Anzeige selbst zeichnet, importiert nur credit.js und niemals diese Datei.
 *
 * Erwartetes Markup (siehe Partials/Hall/Credit.html):
 *
 *   [data-ck-credit]                    das ganze Schild
 *     [data-ck-credit-display]          die Stelle, an der die Zahl steht
 *     [data-ck-credit-form]             das Formular des Münzeinwurfs
 *       [data-ck-credit-add="10"]       Schnellwert-Knopf
 *       [data-ck-credit-input]          Feld für einen freien Betrag
 *     [data-ck-credit-status]           Zeile für Rückmeldungen
 *     [data-ck-credit-announce]         unsichtbarer Bereich für die Ansage
 *
 *   Die deutschen Rückmeldungen stehen als data-message-* am Schild und
 *   kommen aus der XLIFF-Datei. In dieser Datei steht kein deutscher
 *   Anzeigetext (CONCEPT.md Abschnitt 4: alle Beschriftungen über XLIFF).
 */

import { credit } from '@phomo17/casino-startpage/credit.js';

const SELECTOR_SIGN = '[data-ck-credit]';
const SELECTOR_DISPLAY = '[data-ck-credit-display]';
const SELECTOR_ADD = '[data-ck-credit-add]';
const SELECTOR_FORM = '[data-ck-credit-form]';
const SELECTOR_INPUT = '[data-ck-credit-input]';
const SELECTOR_STATUS = '[data-ck-credit-status]';
const SELECTOR_ANNOUNCE = '[data-ck-credit-announce]';

/**
 * Ruhezeit der Ansage. Ohne sie sagte ein Bildschirmleser bei drei schnellen
 * Einwürfen dreimal an. Dieselben 700 ms wie am Kassenfenster der Geräte.
 */
const ANNOUNCE_MS = 700;

/** Zeitgeber und „schon einmal angesagt" je Ansagebereich. */
const announceState = new WeakMap();

const KICK_CLASS = 'ck-credit__value--kick';
const KICK_MS = 190;

/** Schon verdrahtete Schilder – verhindert doppelte Zuhörer. */
const wired = new WeakSet();

/** Die eine Anmeldung bei der Guthaben-Schnittstelle. */
let unsubscribe = null;

/**
 * Schreibt den aktuellen Stand in jede Anzeige des Dokuments.
 *
 * @returns {void}
 */
function paintAll() {
	const text = credit.format(credit.balance);
	for (const display of document.querySelectorAll(SELECTOR_DISPLAY)) {
		if (display.textContent === text) {
			continue;
		}
		display.textContent = text;
		// Klasse kurz entfernen und den Umbruch erzwingen, damit der kleine
		// Ruck auch bei zwei Änderungen kurz hintereinander neu anläuft.
		display.classList.remove(KICK_CLASS);
		void display.offsetWidth;
		display.classList.add(KICK_CLASS);
		globalThis.setTimeout(() => display.classList.remove(KICK_CLASS), KICK_MS);
	}

	// Dieselbe Zahl noch einmal, für Hilfsmittel — verzögert. Siehe announce().
	for (const announcer of document.querySelectorAll(SELECTOR_ANNOUNCE)) {
		announce(announcer, text);
	}
}

/**
 * Sagt den Guthabenstand an — entprellt.
 *
 * Geschrieben wird in den unsichtbaren Bereich mit role="status". Erst dessen
 * Textänderung löst die Ansage aus; die gezeichnete Tafel daneben trägt
 * aria-hidden und ist für Hilfsmittel gar nicht da. Deshalb steht hier der
 * GANZE Satz und nicht nur die Zahl.
 *
 * Die allererste Ansage geht ohne Wartezeit hinaus: sie fällt in den
 * Seitenaufbau und ist der Anfangsstand, keine Meldung „es hat sich etwas
 * geändert".
 *
 * @param {Element} announcer
 * @param {string} value der bereits formatierte Stand
 * @returns {void}
 */
function announce(announcer, value) {
	const template = announcer.dataset.ckTextCredit ?? '';
	if (template === '') {
		return;
	}
	const text = template.replace('{0}', value);
	if (announcer.textContent === text) {
		return;
	}

	const state = announceState.get(announcer) ?? { timer: 0, announced: false };
	announceState.set(announcer, state);

	if (state.timer !== 0) {
		globalThis.clearTimeout(state.timer);
		state.timer = 0;
	}

	if (!state.announced) {
		state.announced = true;
		announcer.textContent = text;
		return;
	}

	state.timer = globalThis.setTimeout(() => {
		state.timer = 0;
		announcer.textContent = text;
	}, ANNOUNCE_MS);
}

/**
 * Zeigt eine Rückmeldung an oder löscht sie.
 *
 * @param {Element} sign
 * @param {string} datasetKey  '' löscht die Zeile
 * @returns {void}
 */
function say(sign, datasetKey) {
	const status = sign.querySelector(SELECTOR_STATUS);
	if (status === null) {
		return;
	}
	status.textContent = datasetKey === '' ? '' : (sign.dataset[datasetKey] ?? '');
}

/**
 * Wirft einen Betrag ein.
 *
 * @param {Element} sign
 * @param {number} amount
 * @returns {Promise<boolean>} true, wenn etwas gutgeschrieben wurde
 */
async function insert(sign, amount) {
	if (!Number.isInteger(amount) || amount < 1 || amount > credit.MAX_CREDITS) {
		say(sign, 'messageInvalid');
		return false;
	}
	const result = await credit.add(amount);
	say(sign, result.capped ? 'messageCapped' : '');
	// Am Höchststand ist credited 0: dann ist nichts angekommen, und der
	// Aufrufer soll das Eingabefeld stehen lassen statt es zu leeren.
	return result.credited > 0;
}

/**
 * @param {Element} sign
 * @param {HTMLFormElement} form
 * @returns {Promise<void>}
 */
async function submitCustomAmount(sign, form) {
	const input = form.querySelector(SELECTOR_INPUT);
	if (input === null) {
		return;
	}
	const amount = Number.parseInt(input.value.trim(), 10);
	const accepted = await insert(sign, amount);
	if (accepted) {
		input.value = '';
	}
}

/**
 * @param {Element} sign
 * @returns {void}
 */
function wireSign(sign) {
	if (wired.has(sign)) {
		return;
	}
	wired.add(sign);

	for (const button of sign.querySelectorAll(SELECTOR_ADD)) {
		button.addEventListener('click', () => {
			void insert(sign, Number.parseInt(button.dataset.ckCreditAdd ?? '', 10));
		});
	}

	const form = sign.querySelector(SELECTOR_FORM);
	if (form !== null) {
		form.addEventListener('submit', (event) => {
			// Ohne das würde das Formular die Seite neu laden.
			event.preventDefault();
			void submitCustomAmount(sign, form);
		});
	}
}

/**
 * Verdrahtet alle Leuchtschilder unterhalb von root.
 *
 * Findet sich nichts, passiert nichts: keine Anmeldung, kein Fehler, keine
 * Ausgabe. Eine Automaten-Extension, die ihr Gehäuse nachträglich ins
 * Dokument hängt, kann diese Funktion selbst aufrufen.
 *
 * @param {Document|Element} [root]
 * @returns {number} Anzahl der gefundenen Anzeigen
 */
export function bindCreditDisplays(root = document) {
	const signs = root.querySelectorAll(SELECTOR_SIGN);
	for (const sign of signs) {
		wireSign(sign);
	}

	const displays = root.querySelectorAll(SELECTOR_DISPLAY);
	if (displays.length === 0 && signs.length === 0) {
		return 0;
	}

	if (unsubscribe === null) {
		// Hier wird bewusst NICHT abgemeldet: im Saal läuft nichts, was weiterliefe —
		// kein Dauer-Zeitgeber (der Ansage-Zeitgeber läuft höchstens 700 ms und
		// räumt sich selbst ab), keine Zeichenschleife, kein Klang. Es gibt also nichts
		// abzuräumen, und ein pagehide-Zuhörer wäre eine Zeile, die nur so aussieht,
		// als täte sie etwas. Ein Modul mit eigenem Takt braucht dagegen sein
		// destroy() — siehe die Automaten-Module.
		// subscribe() ruft sofort einmal auf und setzt damit den Startwert.
		unsubscribe = credit.subscribe(paintAll);
	} else {
		paintAll();
	}

	return displays.length;
}

/**
 * Der Core bindet Module über den AssetCollector mit "async" ein. Das Modul
 * kann deshalb schon laufen, bevor der Körper der Seite fertig geparst ist.
 *
 * @returns {void}
 */
function boot() {
	bindCreditDisplays(document);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}

export default bindCreditDisplays;
