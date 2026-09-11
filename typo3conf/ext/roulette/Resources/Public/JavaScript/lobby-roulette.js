/**
 * Roulette – der Anschluss an die Lobby (CONCEPT.md D.10, Phase D5a)
 * ===================================================================
 *
 * DIE EINE AUFGABE. Wenn die Lobby sagt „Runde läuft, hier ist die Saat",
 * dann: den Geber auf die Saat umstellen, das Rad starten, das Ergebnis
 * zurückmelden und den Geber wieder zurückstellen. Wenn die Lobby sagt „so
 * sieht der Tisch gerade aus", dann: die Einsätze der anderen zeichnen
 * lassen.
 *
 * KEIN fetch-Aufruf, KEINE ADRESSE, KEIN GELD (Plan 4.0 und D.10.7). Diese Datei
 * schickt nichts an den Server; sie wirft ein Ereignis, und lobby-live.js
 * bringt es hin. Und sie bucht nichts: die Auszahlung läuft unverändert über
 * RouletteRound → bank.payout() → machine-credit.js → den Buchungsendpunkt
 * aus D.7. Wer hier eine Buchung einbaut, hat den zweiten Geldweg gebaut.
 *
 * KEIN DOKUMENT AUSSER DEN VIER EREIGNISSEN. document.addEventListener und
 * document.dispatchEvent sind der ganze Umfang. Alles Übrige — Elemente,
 * Texte, Zeichnen — bleibt in roulette.js.
 *
 * WAS PASSIERT, WENN ES KEINE LOBBY GIBT: nichts. Bei ausgeschaltetem
 * QR-Modus wird lobby-live.js nie eingespeist, also kommt kein Ereignis, also
 * läuft in dieser Datei keine Zeile über die Anmeldung der Zuhörer hinaus.
 * Der Tisch spielt wie bisher.
 */

/** Die Zustände, in denen das Tuch für eigene Chips offen ist. */
const OFFEN = 'setzen';

/**
 * Verdrahtet einen Roulette-Tisch mit der Lobby.
 *
 * @param {{
 *   saatGeber: function(string): function(): number,  // saat -> wiederholbarer Geber
 *   geberSetzen: function(?function(): number): void, // null = zurück auf echten Zufall
 *   starten: function(): {ok: boolean, reason?: string},
 *   einsaetze: function(): Array<{f: string, b: number}>,
 *   sperren: function(boolean): void,
 *   fremdeEinsaetze: function(Array<object>): void,
 *   uhr: function(number, string): void
 * }} teile
 * @returns {{melden: function(object): void, destroy: function(): void}}
 */
export function connectLobby(teile) {
	let runde = 0;
	let gemeldet = false;
	let letzteFelder = '';

	/** Die Saat wird zum Geber, das Rad läuft los. */
	function aufRunde(ereignis) {
		const saat = String(ereignis.detail?.saat ?? '');
		runde = Number(ereignis.detail?.runde ?? 0);
		gemeldet = false;
		if (saat === '') {
			return;
		}
		teile.geberSetzen(teile.saatGeber(saat));
		const ergebnis = teile.starten();
		if (ergebnis.ok !== true) {
			// Kein Einsatz, oder der Tisch ist gerade nicht bereit. Dann
			// läuft die Runde für die anderen trotzdem — dieser Browser
			// schaut zu und meldet nichts. Der Geber geht sofort zurück,
			// damit ein späterer Einzelwurf nicht aus der Saat zöge.
			teile.geberSetzen(null);
		}
	}

	/**
	 * Der Tisch hat sein Ergebnis. Zwei Dinge gehen an die Lobby: das
	 * Ergebnis (das der Server festschreibt, D.10.4) und die eigene Bilanz
	 * (reine Anzeige für die anderen).
	 *
	 * @param {{zahl: string, ausgaenge: Object<string, number>}} ausgang
	 */
	function melden(ausgang) {
		if (gemeldet) {
			return;
		}
		gemeldet = true;
		teile.geberSetzen(null);
		document.dispatchEvent(new CustomEvent('casino:lobby-fertig', {
			detail: { ergebnis: ausgang.zahl },
		}));
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'bilanz', daten: { runde, aus: ausgang.ausgaenge } },
		}));
	}

	/**
	 * Jede geänderte Abfrage. Zwei Aufgaben: die Einsätze der anderen
	 * weiterreichen und das Tuch nach dem Zustand des SERVERS auf- oder
	 * zusperren — nicht nach dem eigenen Rundenzustand. In der Lobby sagt die
	 * Uhr, wann „nichts mehr geht" (D.10.6), nicht der eigene Knopf.
	 */
	function aufStand(ereignis) {
		const stand = ereignis.detail ?? {};
		teile.sperren(stand.z !== OFFEN);
		teile.uhr(Number(stand.rest) || 0, String(stand.z ?? ''));
		teile.fremdeEinsaetze(Array.isArray(stand.p) ? stand.p : []);

		// Den eigenen Einsatz melden, aber nur, wenn er sich geändert hat:
		// eine Meldung je Sekunde und Person, und nur dann, wenn wirklich
		// ein Chip dazukam oder wegging. Ohne diesen Vergleich stiege die
		// Stand-Nummer im Sekundentakt, und die 204-Antworten der anderen
		// hörten während der ganzen Setzzeit auf.
		if (stand.z === OFFEN) {
			const felder = teile.einsaetze();
			const abdruck = JSON.stringify(felder);
			if (abdruck !== letzteFelder) {
				letzteFelder = abdruck;
				document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
					detail: { art: 'einsatz', daten: { runde: Number(stand.runde ?? 0), felder } },
				}));
			}
		} else {
			letzteFelder = '';
		}
	}

	document.addEventListener('casino:lobby-runde', aufRunde);
	document.addEventListener('casino:lobby-stand', aufStand);

	return {
		melden,
		destroy() {
			document.removeEventListener('casino:lobby-runde', aufRunde);
			document.removeEventListener('casino:lobby-stand', aufStand);
		},
	};
}

export default connectLobby;
