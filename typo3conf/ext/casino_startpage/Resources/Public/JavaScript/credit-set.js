/**
 * Casino Kunterbunt – der Kassenstand von Hand
 * ============================================
 *
 * CONCEPT.md B.5.1: „Am Guthaben-Leuchtschild kann der Spieler den Bestand
 * FREI EINSTELLEN: Betrag eintippen und übernehmen. Erlaubt sind ganze Zahlen
 * von 0 bis 999999999; ein freies Setzen darf den Bestand auch VERRINGERN."
 *
 *
 * WARUM DAS EINE EIGENE DATEI IST
 * -------------------------------
 * Weil es die Bruchstelle ist. Derselbe Abschnitt sagt: „sobald es
 * Benutzerkonten gibt (Stufe 3), kommt der Wert vom Server und dieses
 * Eingabefeld verschwindet ersatzlos. Es wird deshalb als eigener, klar
 * benannter Bedienteil gebaut, nicht als Beiwerk."
 *
 * Dieser Rückbau sollte einmal genau drei Handgriffe und keine Zeile
 * Nacharbeit kosten:
 *
 *   1. diese Datei löschen
 *   2. Partials/Hall/CreditSet.html löschen
 *   3. die eine Renderzeile in Partials/Hall/Credit.html löschen
 *
 * NACHTRAG (Umsetzungsstück D3c, PLAN-d3-guthaben.md, Befund 2): dieser
 * Rückbau FINDET NICHT STATT. D.7.3 verlangt „ersatzlos", aber nur für
 * Nicht-Admins — für Admins lebt derselbe Bedienteil weiter (D.7.3, D.9: das
 * freie Setzen bleibt ein Verwaltungswerkzeug). Was verschwindet, verschwindet
 * deshalb ZUR LAUFZEIT und nur für die, die es nicht haben dürfen: siehe
 * bindCreditSet() unten. Die Datei bleibt.
 *
 * Läge das Setzen in credit-display.js, müsste es dort später aus einer
 * Datei herausgetrennt werden, die zugleich das Aufladen und die Anzeige
 * führt. Getrennte Lebensdauer, getrennte Datei.
 *
 *
 * WARUM set() UND NICHT add()/subtract()
 * --------------------------------------
 * credit.js hält für genau diesen Fall set() bereit und sagt in seinem Kopf,
 * es sei „nur für Verwaltung und Rücksetzen gedacht, nicht für den
 * Spielablauf". Das ist Verwaltung. add()/subtract() nachzubilden hieße, aus
 * dem Unterschied zweier Zahlen zu rechnen, was set() in einem Schritt kann –
 * und würde bei 0 scheitern, weil beide Methoden erst ab 1 annehmen.
 *
 *
 * ERWARTETES MARKUP (siehe Partials/Hall/CreditSet.html)
 * ------------------------------------------------------
 *   [data-ck-credit-set]              der ganze Bedienteil
 *     [data-ck-credit-set-form]       das Formular
 *     [data-ck-credit-set-input]      das Feld
 *     [data-ck-credit-set-status]     die Zeile für Rückmeldungen (role="status")
 *
 * Die deutschen Rückmeldungen reist der Bedienteil als data-message-* mit und
 * bezieht sie damit aus der XLIFF-Sprachdatei. In dieser Datei steht kein
 * deutscher Anzeigetext (CONCEPT.md Abschnitt 4).
 */

import { credit } from '@phomo17/casino-startpage/credit.js';
import { konto } from '@phomo17/casino-startpage/account-backend.js';

const SELECTOR_PART = '[data-ck-credit-set]';
const SELECTOR_FORM = '[data-ck-credit-set-form]';
const SELECTOR_INPUT = '[data-ck-credit-set-input]';
const SELECTOR_STATUS = '[data-ck-credit-set-status]';

/** Schon verdrahtete Bedienteile – verhindert doppelte Zuhörer. */
const wired = new WeakSet();

/**
 * Zeigt eine Rückmeldung an oder löscht sie.
 *
 * Die Statuszeile trägt role="status": Hilfsmittel lesen eine Änderung darin
 * von selbst vor, ohne dass der Blick des Benutzers dorthin wandern muss. Der
 * Kasten muss dafür schon beim Laden im Dokument stehen – deshalb steht er im
 * Template und wird hier nur gefüllt. Ein erst per JavaScript erzeugter
 * Bereich wird von Hilfsmitteln nicht angesagt.
 *
 * @param {Element} part
 * @param {string} datasetKey  '' löscht die Zeile
 * @param {string} [replacement] ersetzt {betrag} im Text
 * @returns {void}
 */
function say(part, datasetKey, replacement = '') {
	const status = part.querySelector(SELECTOR_STATUS);
	if (status === null) {
		return;
	}
	if (datasetKey === '') {
		status.textContent = '';
		return;
	}
	const template = part.dataset[datasetKey] ?? '';
	status.textContent = template.replace('{betrag}', replacement);
}

/**
 * Übernimmt den eingetippten Stand.
 *
 * Geprüft wird hier und nicht in credit.js: dort ist ein unsinniger Wert ein
 * Programmierfehler, hier ist er eine Fehleingabe eines Menschen und damit ein
 * normaler Betriebsfall.
 *
 * aria-invalid sagt Hilfsmitteln, dass genau dieses Feld beanstandet wird;
 * aria-describedby (im Template gesetzt) verbindet es dauerhaft mit der
 * Statuszeile, sodass die Meldung beim Feld angesagt wird und nicht irgendwo.
 * Der Fokus springt danach zurück ins Feld – wer nichts sieht, steht sonst
 * ratlos hinter dem Absendeknopf.
 *
 * Die Farbe des Rahmens ist NICHT das einzige Zeichen: die Statuszeile sagt
 * denselben Sachverhalt in Worten.
 *
 * @param {Element} part
 * @param {HTMLFormElement} form
 * @returns {Promise<void>}
 */
async function applyAmount(part, form) {
	const input = form.querySelector(SELECTOR_INPUT);
	if (input === null) {
		return;
	}
	const text = input.value.trim();
	const amount = Number.parseInt(text, 10);

	if (!/^\d{1,9}$/.test(text) || !Number.isInteger(amount)
		|| amount < credit.MIN_CREDITS || amount > credit.MAX_CREDITS) {
		input.setAttribute('aria-invalid', 'true');
		say(part, 'messageInvalid');
		input.focus();
		return;
	}

	input.removeAttribute('aria-invalid');
	const result = await credit.set(amount);
	say(part, 'messageDone', credit.format(result.balance));
	input.value = '';
}

/**
 * @param {Element} part
 * @returns {void}
 */
function wirePart(part) {
	if (wired.has(part)) {
		return;
	}
	wired.add(part);

	const form = part.querySelector(SELECTOR_FORM);
	if (form === null) {
		return;
	}
	form.addEventListener('submit', (event) => {
		// Ohne das würde das Formular die Seite neu laden.
		event.preventDefault();
		void applyAmount(part, form);
	});
}

/**
 * Verdrahtet alle Setz-Bedienteile unterhalb von root.
 *
 * Findet sich nichts, passiert nichts: keine Anmeldung, kein Fehler, keine
 * Ausgabe. Nach dem Rückbau in Stufe 3 wird diese Datei gar nicht mehr
 * geladen; bis dahin ist sie folgenlos, wo kein Bedienteil steht.
 *
 * @param {Document|Element} [root]
 * @returns {number} Anzahl der gefundenen Bedienteile
 */
export function bindCreditSet(root = document) {
	const parts = root.querySelectorAll(SELECTOR_PART);
	for (const part of parts) {
		// CONCEPT.md D.7.3: bei eingeschaltetem QR-Modus verschwindet das freie
		// Setzen „ersatzlos" — außer für Admins. Ersatzlos heißt: aus dem
		// Dokument, nicht nur unsichtbar. Ein bloß ausgeblendeter Bedienteil
		// wäre mit der Tabulatortaste weiter erreichbar und ein Hilfsmittel
		// läse ihn vor.
		//
		// Das Ausblenden per CSS in casino_account (frontend.css) passiert
		// zusätzlich und FRÜHER — es verhindert das Aufblitzen, bevor dieses
		// Modul läuft.
		if (konto.istServer && !konto.darfVerwalten) {
			part.remove();
			continue;
		}
		wirePart(part);
	}
	return parts.length;
}

/**
 * Der Kern bindet Module über den AssetCollector mit "async" ein. Das Modul
 * kann deshalb schon laufen, bevor der Körper der Seite fertig geparst ist.
 *
 * @returns {void}
 */
function boot() {
	bindCreditSet(document);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}

export default bindCreditSet;
