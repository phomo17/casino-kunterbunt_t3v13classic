/**
 * Casino Kunterbunt – Kontenleiste und Sperranzeige im Betrieb (D3c)
 * ===================================================================
 *
 * DREI EREIGNISSE, EINE RICHTUNG:
 *   casino:konto            → die drei Beträge haben sich geändert
 *   casino:konto-gesperrt   → der Server antwortet nicht mehr
 *   casino:konto-frei       → er antwortet wieder
 * und genau eines zurück:
 *   casino:konto-wiederholen → „schick die liegengebliebene Buchung erneut"
 *
 * Ausgesendet werden sie von account-backend.js in casino_startpage. Warum
 * über Ereignisse und nicht über einen Import: casino_startpage darf
 * casino_account nicht kennen (D.1 — ohne casino_account verhält sich die
 * Seite exakt wie nach Teil C), und ein Ereignis, das niemand hört, kostet
 * nichts.
 *
 * KEIN EINZIGER IMPORT — genau wie gate-scan.js. Die Import-Karte dieser
 * Extension ist mit dependencies: ['backend'] fürs Backend angemeldet; im
 * Frontend wird die Datei als schlichtes ES-Modul über ein script-Element in
 * der Vorlage eingehängt (AccountBar/Index.html, Attribut jsUrl), wie auf
 * der Torseite.
 *
 * In dieser Datei steht kein deutscher Anzeigetext. Jeder Satz kommt aus der
 * Vorlage (data-Attribut oder bereits gerenderter Inhalt) und damit aus der
 * XLIFF-Sprachdatei.
 */

const bar = document.querySelector('[data-ca-bar]');
const total = document.querySelector('[data-ca-bar-total]');
const ansage = document.querySelector('[data-ca-bar-announce]');
const lock = document.querySelector('[data-ca-lock]');
const zahl = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/**
 * BEHOBENER BEFUND (Audit nach D3, Teil 2, N-01): role="status" stand bisher
 * auf .ca-bar__total selbst, also GENAU dort, wo auch die sichtbare Zahl
 * steht — jede Buchung änderte die Zahl UND löste damit (aria-atomic="true",
 * von role="status" mitgebracht) eine vollständige Neuansage aus. Auf
 * /coin-pusher waren das rund 1,5 Ansagen pro Sekunde, endlos.
 *
 * Die Vorlage trägt role="status" jetzt auf einem EIGENEN, optisch
 * verborgenen Element ([data-ca-bar-announce], AccountBar/Index.html) statt
 * auf der sichtbaren Zahl. Diese Datei drosselt NUR die Änderungen an diesem
 * zweiten Element — die sichtbare Zahl (unten, [data-ca-bar-total-value])
 * läuft weiterhin bei JEDER Buchung sofort mit, wie D.7.2 es verlangt
 * („Angezeigt wird IMMER, was der Server zurückgegeben hat").
 *
 * ansageLabel/ansageEinheit werden EINMALIG aus dem bereits gerenderten
 * Markup gelesen, nicht hier als Text eingetragen — dieselbe Regel wie im
 * Dateikopf: kein deutscher Anzeigetext in dieser Datei.
 */
const ansageLabel = bar?.querySelector('.ca-bar__total-label')?.textContent ?? '';
const ansageEinheit = bar?.querySelector('.ca-bar__unit')?.textContent ?? '';
/** Mindestabstand zwischen zwei Ansagen — gesammelt, nicht pro Buchung. */
const ANSAGE_TAKT_MS = 2000;
let ansageLetzterZeitpunkt = 0;
let ansageTimer = null;
let ansageAusstehenderWert = null;

/** Schreibt den vollständigen Satz in den Live-Bereich — dasselbe Format wie
 * die serverseitig gerenderte Anfangsfassung (AccountBar/Index.html). */
function ansageSchreiben(gesamt) {
	if (ansage === null) {
		return;
	}
	ansage.textContent = `${ansageLabel} ${zahl.format(gesamt)} ${ansageEinheit}`;
	ansageLetzterZeitpunkt = Date.now();
}

/**
 * Taktung statt reinem Debounce: die ERSTE Änderung nach einer Ruhephase
 * wird sofort angesagt, jede weitere innerhalb des Takts sammelt sich in
 * ansageAusstehenderWert, und am Taktende wird genau einmal der dann
 * aktuellste Wert nachgereicht. Ein reines Debounce (erst ansagen, wenn
 * nichts mehr passiert) würde bei einem Gerät, das nie zur Ruhe kommt (der
 * bekannte Coin-Pusher-Altbefund, Audit N-02/M-03), überhaupt nie ansagen —
 * die Taktung sagt stattdessen zuverlässig spätestens alle ANSAGE_TAKT_MS
 * einmal an.
 */
function ansagePlanen(gesamt) {
	ansageAusstehenderWert = gesamt;
	const jetzt = Date.now();
	const verstrichen = jetzt - ansageLetzterZeitpunkt;
	if (verstrichen >= ANSAGE_TAKT_MS) {
		ansageSchreiben(gesamt);
		ansageAusstehenderWert = null;
		return;
	}
	if (ansageTimer !== null) {
		return;   // ein Timer ist schon unterwegs, der holt sich den neuesten Wert selbst
	}
	ansageTimer = setTimeout(() => {
		ansageTimer = null;
		if (ansageAusstehenderWert !== null) {
			ansageSchreiben(ansageAusstehenderWert);
			ansageAusstehenderWert = null;
		}
	}, ANSAGE_TAKT_MS - verstrichen);
}

/**
 * Liefert den passenden Satz für einen Sperrgrund aus den data-Attributen
 * des <dialog> (siehe AccountBar::beschriftungen(), Index.html).
 *
 * @param {string} grund 'offline' oder 'fehler'
 * @returns {string}
 */
function textFuerGrund(grund) {
	if (lock === null) {
		return '';
	}
	if (grund === 'offline') {
		return lock.dataset.caLockTextOffline ?? '';
	}
	return lock.dataset.caLockTextError ?? '';
}

document.addEventListener('casino:konto', (ereignis) => {
	// Angezeigt wird IMMER, was der Server zurückgegeben hat (D.7.2).
	const gesamt = Number(ereignis.detail?.gesamt);
	if (bar === null || total === null || !Number.isFinite(gesamt)) {
		return;
	}
	total.dataset.value = String(gesamt);
	// BEHOBENER BEFUND (Audit nach D3, K-01): nur noch den eigenen Anker
	// [data-ca-bar-total-value] ersetzen, nicht mehr total.firstChild —
	// seit die Vorlage vor der Zahl eine eigene (optisch verborgene)
	// Beschriftung ausgibt, ist firstChild nicht mehr der Zahlenknoten.
	// BEHOBENER BEFUND (Audit nach D3, Teil 2, N-01): .ca-bar__total selbst
	// trägt seitdem KEIN role="status" mehr — diese Zeile aktualisiert nur
	// noch die SICHTBARE Zahl, ungedrosselt, wie D.7.2 es verlangt.
	const stelle = total.querySelector('[data-ca-bar-total-value]');
	if (stelle !== null) {
		stelle.textContent = zahl.format(gesamt);
	}
	// Die ANSAGE (der Live-Bereich [data-ca-bar-announce]) läuft getrennt
	// und gedrosselt — siehe ansagePlanen() oben.
	ansagePlanen(gesamt);
});

document.addEventListener('casino:konto-gesperrt', (ereignis) => {
	if (lock === null || lock.open) {
		return;
	}
	const text = lock.querySelector('[data-ca-lock-text]');
	if (text !== null) {
		text.textContent = textFuerGrund(ereignis.detail?.grund);
	}
	lock.showModal();   // ab hier ist die ganze Seite unerreichbar
	lock.querySelector('[data-ca-lock-retry]')?.focus();
});

document.addEventListener('casino:konto-frei', () => {
	lock?.close();
});

// Eine Sperre lässt sich nicht wegdrücken: der Server ist ja immer noch weg.
lock?.addEventListener('cancel', (ereignis) => ereignis.preventDefault());

lock?.querySelector('[data-ca-lock-retry]')?.addEventListener('click', () => {
	const text = lock.querySelector('[data-ca-lock-text]');
	if (text !== null) {
		text.textContent = lock.dataset.caLockTextRetrying ?? '';
	}
	document.dispatchEvent(new CustomEvent('casino:konto-wiederholen'));
});
lock?.querySelector('[data-ca-lock-reload]')?.addEventListener('click', () => {
	globalThis.location.reload();
});
