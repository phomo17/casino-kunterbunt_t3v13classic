/**
 * Casino Kunterbunt – die Setzfläche eines Spieltisches (Ansicht)
 * ===============================================================
 *
 * Die zweite Hälfte von CONCEPT.md C.3: das ANZEIGEN. Die Buchführung steht in
 * table-bets.js und wird von hier nur bedient.
 *
 * Diese Datei fasst das Dokument an — als einzige der Setzflächen-Bausteine.
 * Dieselbe Aufteilung wie credit.js neben credit-display.js: ein Spiel, das
 * seine Setzfläche selbst zeichnen will, soll keinen DOM-Code importieren
 * müssen, und die Buchführung soll ohne Browser prüfbar bleiben.
 *
 *
 * WAS DAS SPIEL LIEFERT
 * ---------------------
 * Ein Element (das Tuch) und darin je Feld genau einen
 *
 *   <button type="button" data-ck-field="feld-a"> … sichtbare Beschriftung … </button>
 *
 * Mehr nicht. Wie das Tuch aussieht, wo die Felder liegen, welche Form sie
 * haben — das ist Sache des Spiels und geht diese Datei nichts an. Sie sucht
 * [data-ck-field], gleicht die Kennungen gegen die Feldliste ab und meldet
 * jede Abweichung in beide Richtungen auf der Konsole: ein Knopf ohne Feld und
 * ein Feld ohne Knopf sind beide ein Fehler des Spiels, und beide fallen ohne
 * diese Meldung erst beim Setzen auf.
 *
 * WARUM EIN <button> UND KEIN <div>
 * ---------------------------------
 * Ein echter Knopf bringt Rolle, Fokusreihenfolge, Tastaturbedienung und das
 * Verhalten von Eingabe- und Leertaste von selbst mit. Ein <div role="button">
 * müsste all das nachbauen — ARIA fügt niemals Verhalten hinzu, nur eine
 * Beschreibung. Wer hier etwas anderes als einen <button> liefert, bekommt
 * eine Meldung und ein unverdrahtetes Feld; halb bedienbar ist schlechter als
 * ehrlich stumm.
 *
 *
 * DIE ERWARTETEN SCHLÜSSEL VON „texts" — EINE EIGENE FESTLEGUNG
 * ----------------------------------------------------------------
 * Die Namen der Bausteine aus CONCEPT.md/Plan legen nur fest, DASS die
 * deutschen Satzbauten von außen hereinkommen, nicht unter welchen Schlüsseln.
 * Diese Datei erwartet sie so benannt (an den data-text-*-Attributen aus
 * Table/Status.html angelehnt, ohne das Präfix „text"):
 *
 *   texts.placed     table.announce.placed    {0}=Wert {1}=Feldname {2}=Gesamt
 *   texts.removed     table.announce.removed   {0}=Wert {1}=Feldname {2}=Gesamt
 *   texts.fieldmax    table.announce.fieldmax  {0}=Feldname {1}=Limit
 *   texts.roundmax    table.announce.roundmax  {0}=Limit
 *   texts.locked      table.announce.locked    (ohne Platzhalter)
 *   texts.nochip      table.announce.nochip    {0}=Wert
 *   texts.fieldname   table.field.name         {0}=Feldname {1}=Auszahlung
 *                                               {2}=Limit {3}=gesetzter Betrag
 *   texts.fieldnameEmpty (optional)
 *                     table.field.name.empty  {0}=Feldname {1}=Auszahlung {2}=Limit
 *
 * table.announce.cleared, table.announce.doubled und table.announce.repeated
 * werden nicht von dieser Datei angesagt — sie betreffen die Bedienleiste
 * („Alles zurücknehmen", „Verdoppeln", „Wiederholen") und liegen deshalb in
 * table-controls.js (Teilstück C1-D).
 *
 * table.field.name.empty ist seit Teilstück C1-D verdrahtet (texts.fieldnameEmpty,
 * optional): liegt auf einem Feld nichts, sagt der Name „…, nichts gesetzt"
 * statt „…, 0 Euro gesetzt". Fehlt texts.fieldnameEmpty (eine Einbindung, die
 * das zugehörige data-text-Attribut noch nicht liefert), gilt unverändert die
 * bisherige Zusage: table.field.name trägt dann auch den Fall „nichts gesetzt"
 * mit einer eingesetzten 0.
 *
 * AUCH SEIT C1-D: aria-disabled an gesperrten Feldern
 * ----------------------------------------------------
 * paintField() setzt aria-disabled="true" an jedem Feldknopf, solange
 * !bets.open (die Runde nimmt keine Einsätze mehr an), und entfernt es sonst.
 * Ein disabled-Knopf wäre aus der Tastaturreihenfolge heraus und beantwortete
 * nirgends die Frage, warum er nicht geht — genau die Frage, die sich hier
 * stellt, weil die Sperre eine Regel ist (C.3) und kein Fehler. Der Mustertisch
 * sperrt nie (er ruft bets.lock() nie auf), daher bleibt dieser Zweig dort
 * unbenutzt, aber korrekt für jedes künftige Spiel.
 *
 * FELDER OHNE SICHTBARE AUFSCHRIFT — SEIT PHASE C3 (ROULETTE)
 * ---------------------------------------------------------------
 * Ein Feld, das für seine Aufschrift keinen Platz hat — ein Roulette-Split ist
 * die Linie zwischen zwei Zahlen und auf 24 Bildpunkten breit —, nennt seinen
 * Namen stattdessen im Attribut data-ck-field-label und bringt zusätzlich ein
 * serverseitig gesetztes aria-label mit, damit es auch ohne JavaScript einen
 * Namen hat. collect() bevorzugt data-ck-field-label vor dem sichtbaren Text
 * (el.textContent); fehlt das Attribut, gilt unverändert der sichtbare Text —
 * kein bestehender Tisch (Mustertisch) ändert sich dadurch. Die Erweiterung
 * ist zwei Zeilen lang und rückwärtsverträglich (siehe casino_startpage/README.md,
 * Abschnitt "Vertrag für das Tuch eines Spiels").
 */

/**
 * Verdrahtet eine Setzfläche.
 *
 * @param {Element} root das Tuch
 * @param {import('./table-bets.js').BetTable} bets die Buchführung
 * @param {{
 *   selectedChip: function(): number,
 *   onPlace?: function(fieldId: string, value: number): (Promise<{ok: boolean, reason?: string}>|{ok: boolean, reason?: string}),
 *   onTakeBack?: function(fieldId: string, value: number): (Promise<{ok: boolean}>|{ok: boolean}),
 *   announce?: function(text: string): void,
 *   symbolIdFor?: function(value: number): string,
 *   texts?: Object<string, string>
 * }} options
 * @returns {{refresh: function(): void, destroy: function(): void}}
 *
 * selectedChip()  liefert den gerade gewählten Chipwert. Diese Datei kennt die
 *                 Bedienleiste NICHT und fragt nur.
 * onPlace()       darf den Zug ablehnen. Genau hier hängt in C1-D das Geld
 *                 ein: table-buyin.js nimmt den Chip aus dem Rack und bucht
 *                 den Einsatz, und wenn das nicht geht, wird auch nicht
 *                 gelegt. Ohne onPlace legt die Setzfläche ohne Geld — das ist
 *                 der Zustand nach Teilstück C1-C und der Grund, warum dieses
 *                 Teilstück für sich prüfbar ist.
 * announce()      der einzige Weg zur Ansage. Kein Live-Bereich wird hier
 *                 angelegt; er steht schon im HTML (Table/Status.html).
 * texts           die deutschen Satzbauten mit {0}, {1} … als Platzhalter,
 *                 aus der XLIFF-Datei. In dieser Datei steht KEIN deutscher
 *                 Anzeigetext.
 */
export function connectFelt(root, bets, options) {
	const {
		selectedChip,
		onPlace = null,
		onTakeBack = null,
		announce = null,
		symbolIdFor = null,
		texts = {},
	} = options ?? {};

	/** @type {Map<string, HTMLButtonElement>} Feld-id → Knopf */
	const knoepfe = new Map();
	/** @type {Map<string, string>} Feld-id → sichtbare Beschriftung, EINMAL beim Einsammeln gemerkt */
	const etiketten = new Map();
	/** @type {Set<Element>} von dieser Datei angelegte Stapelbereiche, für destroy() */
	const angelegteStapelbereiche = new Set();

	let ansageZeitgeber = 0;
	let ersteAnsageAusstehend = true;

	/** Setzt {0}, {1} … in einer Vorlage ein. Fehlt die Vorlage, wird nichts angesagt. */
	function fuelle(vorlage, werte) {
		if (typeof vorlage !== 'string' || vorlage === '') {
			return '';
		}
		return vorlage.replace(/\{(\d+)\}/g, (_, n) => String(werte[Number(n)] ?? ''));
	}

	/**
	 * Ansage mit 700 ms Entprellung (dieselbe Zahl wie credit-display.js). Die
	 * erste Ansage nach dem Verdrahten geht sofort heraus, jede weitere
	 * innerhalb von 700 ms ersetzt die vorherige, noch wartende.
	 */
	function announceDebounced(text) {
		if (typeof announce !== 'function' || text === '') {
			return;
		}
		if (ersteAnsageAusstehend) {
			ersteAnsageAusstehend = false;
			announce(text);
			return;
		}
		if (ansageZeitgeber) {
			clearTimeout(ansageZeitgeber);
		}
		ansageZeitgeber = setTimeout(() => {
			ansageZeitgeber = 0;
			announce(text);
		}, 700);
	}

	function labelOf(fieldId) {
		return etiketten.get(fieldId) ?? fieldId;
	}

	/**
	 * Der erreichbare Name eines Feldes: sichtbarer Text zuerst (WCAG 2.5.3).
	 *
	 * Liegt nichts auf dem Feld, wird — falls verdrahtet — texts.fieldnameEmpty
	 * benutzt ("…, nichts gesetzt") statt texts.fieldname mit einer eingesetzten
	 * 0 ("…, 0 Euro gesetzt"). Ohne texts.fieldnameEmpty (ältere Einbindung, die
	 * das Attribut noch nicht liefert) bleibt die bisherige Zusage unverändert:
	 * table.field.name trägt dann auch den Fall "nichts gesetzt" mit.
	 */
	function nameField(fieldId) {
		const button = knoepfe.get(fieldId);
		const feld = bets.fields.get(fieldId);
		if (!button || !feld) {
			return;
		}
		const gesetzt = bets.stakeOn(fieldId);
		const name = gesetzt === 0 && texts.fieldnameEmpty
			? fuelle(texts.fieldnameEmpty, [labelOf(fieldId), feld.payout, feld.max])
			: fuelle(texts.fieldname, [labelOf(fieldId), feld.payout, feld.max, gesetzt]);
		if (name !== '') {
			button.setAttribute('aria-label', name);
		}
	}

	/** Der Stapelbereich eines Knopfs — falls nicht vorhanden, einmalig angelegt. */
	function stapelbereich(button) {
		let bereich = button.querySelector('[data-ck-stack]');
		if (!bereich) {
			bereich = document.createElement('span');
			bereich.setAttribute('data-ck-stack', '');
			bereich.className = 'ck-chipstack__group';
			bereich.setAttribute('aria-hidden', 'true');
			button.appendChild(bereich);
			angelegteStapelbereiche.add(bereich);
		}
		return bereich;
	}

	/** Zeichnet die Stapel eines Feldes neu und führt seinen Namen nach. */
	function paintField(fieldId) {
		const button = knoepfe.get(fieldId);
		if (!button) {
			return;
		}
		const bereich = stapelbereich(button);
		// Über innerHTML statt createElementNS: ein <svg>-Tag innerhalb von
		// HTML-Inhalt wird vom HTML-Parser selbst als Fremdinhalt erkannt und
		// bekommt seinen Namensraum automatisch — kein explizites xmlns nötig.
		// So bleibt der Namensraum-Bezeichner (eine http-Adresse, aber keine
		// nachgeladene Ressource) aus dem Quelltext heraus.
		const teileMarkup = [];
		for (const { value, count } of bets.stacksOn(fieldId)) {
			// Beides wird unten in Markup eingesetzt, deshalb hier hart auf die
			// erlaubte Form eingegrenzt: der Bezeichner auf Buchstaben, Ziffern
			// und Bindestrich, die Anzahl auf eine ganze Zahl. Heute liefern
			// beide Quellen ohnehin nur solche Werte — die Schranke steht da,
			// damit das so bleibt, wenn hier einmal etwas anderes einfließt.
			const rohId = typeof symbolIdFor === 'function' ? symbolIdFor(value) : '';
			const symbolId = /^[A-Za-z0-9_-]+$/.test(String(rohId)) ? String(rohId) : '';
			const sichtbareChips = Math.min(count, 8);
			let stapelMarkup = '';
			for (let i = 0; i < sichtbareChips; i += 1) {
				stapelMarkup += `<svg class="ck-chip"><use href="#${symbolId}"></use></svg>`;
			}
			if (count > sichtbareChips) {
				stapelMarkup += `<span class="ck-chipstack__count">${Number(count) || 0}</span>`;
			}
			teileMarkup.push(`<span class="ck-chipstack">${stapelMarkup}</span>`);
		}
		bereich.innerHTML = teileMarkup.join('');
		// aria-disabled statt disabled (Teilstück C1-D): ein gesperrtes Feld
		// bleibt fokussierbar, die Ansage nennt bei einem Versuch den Grund
		// ('locked', siehe announceReject). Ein disabled-Knopf wäre aus der
		// Tastaturreihenfolge heraus und beantwortete nirgends, WARUM.
		if (bets.open) {
			button.removeAttribute('aria-disabled');
		} else {
			button.setAttribute('aria-disabled', 'true');
		}
		nameField(fieldId);
	}

	/** Ansage einer Absage. 'value', 'unknown' und 'empty' sind Entwicklerfehler
	 *  bzw. für den Spieler ohne Bedeutung und werden nicht angesagt. */
	function announceReject(ergebnis, fieldId) {
		if (!ergebnis) {
			return;
		}
		if (ergebnis.reason === 'fieldmax') {
			announceDebounced(fuelle(texts.fieldmax, [labelOf(fieldId), ergebnis.limit]));
		} else if (ergebnis.reason === 'roundmax') {
			announceDebounced(fuelle(texts.roundmax, [ergebnis.limit]));
		} else if (ergebnis.reason === 'locked') {
			announceDebounced(texts.locked ?? '');
		} else if (ergebnis.reason === 'nochip' || ergebnis.reason === 'insufficient' || ergebnis.reason === 'closed') {
			const wert = typeof selectedChip === 'function' ? selectedChip() : '';
			announceDebounced(fuelle(texts.nochip, [wert]));
		}
	}

	/** Legt einen Chip: erst die Buchführung, dann — falls verdrahtet — das Geld. */
	async function legen(fieldId) {
		const value = typeof selectedChip === 'function' ? selectedChip() : NaN;
		if (!Number.isInteger(value) || value < 1) {
			console.error(`table-felt.js: selectedChip() lieferte keinen gültigen Chipwert (${String(value)}).`);
			return;
		}
		const versuch = bets.place(fieldId, value);
		if (!versuch.ok) {
			announceReject(versuch, fieldId);
			return;
		}
		paintField(fieldId);
		if (typeof onPlace === 'function') {
			const antwort = await onPlace(fieldId, value);
			if (!antwort || antwort.ok !== true) {
				// Das Geld hat den Zug abgelehnt: die eben gelegte Buchung wird
				// rückgängig gemacht. takeBack() nimmt den OBERSTEN (zuletzt
				// gelegten) Chip eines Feldes zurück — das ist genau der eben
				// gelegte Chip, SOLANGE zwischen bets.place() oben und diesem
				// await kein zweiter legen()-Lauf auf DASSELBE Feld dazwischen
				// abgeschlossen werden konnte. Das gilt heute (Behebung Review
				// C3, L3, überprüfbar formuliert statt allgemein "läuft
				// einfädig"): onPlace() → machineCredit.stake()
				// (machine-credit.js) enthält kein echtes await, seine
				// Fortsetzung läuft deshalb als Microtask VOR jedem weiteren
				// Klick. Bekäme stake() irgendwann einen echten Wartepunkt
				// (Sperre, IndexedDB, BroadcastChannel), könnten sich zwei
				// legen()-Läufe auf demselben Feld verschränken, und takeBack()
				// nähme dann möglicherweise den falschen Chipwert zurück.
				bets.takeBack(fieldId);
				paintField(fieldId);
				announceReject(antwort ?? { reason: 'nochip' }, fieldId);
				return;
			}
		}
		announceDebounced(fuelle(texts.placed, [value, labelOf(fieldId), bets.total]));
	}

	/** Nimmt den obersten Chip eines Feldes zurück. */
	async function zurueck(fieldId) {
		const versuch = bets.takeBack(fieldId);
		if (!versuch.ok) {
			announceReject(versuch, fieldId);
			return;
		}
		paintField(fieldId);
		if (typeof onTakeBack === 'function') {
			await onTakeBack(fieldId, versuch.value);
		}
		announceDebounced(fuelle(texts.removed, [versuch.value, labelOf(fieldId), bets.total]));
	}

	function onClick(event) {
		const fieldId = event.currentTarget.getAttribute('data-ck-field');
		if (event.shiftKey) {
			zurueck(fieldId);
		} else {
			legen(fieldId);
		}
	}

	function onKeyDown(event) {
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			zurueck(event.currentTarget.getAttribute('data-ck-field'));
		}
	}

	/** Sucht die Feldknöpfe im Tuch und gleicht sie gegen die Feldliste ab. */
	function collect() {
		const bekannt = new Set(bets.fields.keys());
		const belegt = new Set();
		for (const el of root.querySelectorAll('[data-ck-field]')) {
			const fieldId = el.getAttribute('data-ck-field');
			if (el.tagName !== 'BUTTON' || el.type !== 'button') {
				console.error(`table-felt.js: [data-ck-field="${fieldId}"] ist kein <button type="button"> — Feld bleibt unverdrahtet.`);
				continue;
			}
			if (!bekannt.has(fieldId)) {
				console.error(`table-felt.js: Knopf für Feld "${fieldId}" — dieses Feld kennt der Tisch nicht.`);
				continue;
			}
			// Ein Feld, das für seine Aufschrift keinen Platz hat (die Linie
			// zwischen zwei Zahlen ist 24 Bildpunkte breit), nennt seinen Namen
			// stattdessen in data-ck-field-label. Fehlt das Attribut, gilt
			// unverändert der sichtbare Text — kein bestehender Tisch ändert sich.
			const eigenerName = el.getAttribute('data-ck-field-label');
			etiketten.set(fieldId, typeof eigenerName === 'string' && eigenerName !== ''
				? eigenerName
				: el.textContent.trim());
			knoepfe.set(fieldId, el);
			belegt.add(fieldId);
			el.addEventListener('click', onClick);
			el.addEventListener('keydown', onKeyDown);
		}
		for (const fieldId of bekannt) {
			if (!belegt.has(fieldId)) {
				console.error(`table-felt.js: Feld "${fieldId}" hat keinen Knopf im Tuch.`);
			}
		}
	}

	function refresh() {
		for (const fieldId of knoepfe.keys()) {
			paintField(fieldId);
		}
	}

	function destroy() {
		for (const button of knoepfe.values()) {
			button.removeEventListener('click', onClick);
			button.removeEventListener('keydown', onKeyDown);
		}
		for (const bereich of angelegteStapelbereiche) {
			bereich.remove();
		}
		if (ansageZeitgeber) {
			clearTimeout(ansageZeitgeber);
			ansageZeitgeber = 0;
		}
		knoepfe.clear();
		etiketten.clear();
		angelegteStapelbereiche.clear();
	}

	collect();
	refresh();

	return { refresh, destroy };
}

export default connectFelt;
