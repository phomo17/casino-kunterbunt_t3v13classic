/**
 * Blackjack – der Anschluss an die Lobby (CONCEPT.md D.10, Umsetzungsstück D5-4)
 * ==================================================================================
 *
 * Aufbau wie roulette/lobby-roulette.js und craps/lobby-craps.js (D5-3) —
 * dieselben vier Ereignisse, dieselbe Regel „kein fetch-Aufruf, keine
 * Adresse, kein Geld". Blackjack unterscheidet sich an EINER Stelle
 * grundlegend von den beiden anderen Tischen: dort läuft eine Runde
 * ATOMAR (Saat rein, Ergebnis raus); hier ist 'laeuft' die REIHE DER
 * ENTSCHEIDUNGEN — jeder Platz bekommt 20 Sekunden, der Reihe nach
 * (D.10.6). Diese Datei kennt deshalb ZWEI zusätzliche Begriffe, die es bei
 * Roulette/Craps nicht gibt: "bin ich gerade dran" und "der Geberdeckel"
 * (das Ergebnis erst zeigen, wenn niemand mehr aussteht).
 *
 * WAS DIESE DATEI NICHT TUT — UND WARUM DAS WICHTIG IST
 * -------------------------------------------------------
 * KEIN fetch-Aufruf, KEINE ADRESSE, KEIN GELD (Plan 4.0 und D.10.7). Diese
 * Datei schickt nichts an den Server; sie wirft ein Ereignis, und
 * lobby-live.js bringt es hin.
 *
 * KEIN DOKUMENT AUSSER DEN VIER EREIGNISSEN. document.addEventListener und
 * document.dispatchEvent sind der ganze Umfang.
 *
 * KEIN KARTENWISSEN. Diese Datei zieht selbst KEINE Karte und kennt weder
 * LobbyTableSequence noch Shoe noch BlackjackRound. Das Austeilen, das
 * Anwenden des Zugprotokolls, der Ersatzschlitten und der Geberdeckel-
 * Rechenweg liegen alle in blackjack.js (das ohnehin schon alle nötigen
 * Bausteine importiert hat) und werden dieser Datei als Rückrufe
 * hereingereicht — dieselbe Bauart wie saatGeber/geberSetzen bei den beiden
 * anderen Tischen, nur um vier Rückrufe erweitert (folgeBauen, zugAnwenden,
 * meinZug, geberDeckel).
 *
 * WAS PASSIERT, WENN ES KEINE LOBBY GIBT: nichts. Bei ausgeschaltetem
 * QR-Modus wird lobby-live.js nie eingespeist, also kommt kein Ereignis,
 * also läuft in dieser Datei keine Zeile über die Anmeldung der Zuhörer
 * hinaus. Der Tisch spielt wie bisher.
 *
 * WANN GEMELDET WIRD — DER EINE PUNKT, DER DIESE DATEI VON DEN ANDEREN
 * BEIDEN TISCHEN UNTERSCHEIDET
 * ------------------------------------------------------------------------
 * Bei Roulette/Craps ist die eigene Runde fertig, sobald die Physik steht —
 * fast immer im selben Augenblick bei allen Browsern. Beim Blackjack wird
 * die EIGENE BlackjackRound schon 'fertig', sobald das EIGENE Blatt fertig
 * ist (round-blackjack.js#_maybeAdvanceToDealer()) — das kann Platz 1 sein,
 * während Platz 5 noch überlegt. Würde diese Datei sofort melden, schriebe
 * der SCHNELLSTE Platz das Ergebnis der Lobby fest und schnitte allen
 * langsameren Plätzen die Runde ab. Gemeldet wird deshalb ERST, wenn der
 * SERVER sagt, dass niemand mehr aussteht (stand.t === 0) — siehe
 * aufStand() unten. Das eigene Geld ist zu diesem Zeitpunkt längst
 * abgerechnet (table.deal()/table.act() haben schon bezahlt, siehe
 * blackjack.js#onResult()); es wird nur die MELDUNG an den Server
 * zurückgehalten, nicht die Auszahlung.
 */

/** Die Zustände, in denen das Tuch für eigene Chips offen ist. */
const OFFEN = 'setzen';

/**
 * Die Nutzlast, die der Server festschreibt (D.10.4). Anders als beim
 * Roulette (eine Zahl) oder Craps (Würfelaugen und Point) gibt es beim
 * Blackjack kein EINES gemeinsames Ergebnis — jeder Platz gewinnt oder
 * verliert für sich. Das einzige, was wirklich für alle gleich ist, ist das
 * Blatt des GEBERS (aus derselben Saat, derselben Austeilfolge). Genau das
 * wird hier festgehalten — als Beleg, dass alle Browser denselben Geber
 * sahen, nicht als etwas, das irgendjemand nachrechnet (der Server tut das
 * ohnehin nicht, dieselbe offengelegte Grenze wie beim Craps-Ergebnis).
 *
 * Form: "<summe>_<busted|blackjack|ok>", etwa "23_bust", "21_bj", "18_ok".
 *
 * @param {{total: number, busted: boolean, blackjack: boolean}} dealer
 * @returns {string}
 */
export function nutzlast(dealer) {
	const kurz = dealer.busted ? 'bust' : (dealer.blackjack ? 'bj' : 'ok');
	return `${dealer.total}_${kurz}`;
}

/**
 * Verdrahtet einen Blackjack-Tisch mit der Lobby.
 *
 * @param {{
 *   saatGeber: function(string): function(): number,
 *   geberSetzen: function(?function(): number): void,
 *   folgeBauen: function(string, number, Array<number>): void,
 *   starten: function(): Promise<{ok: boolean, reason?: string}>,
 *   zugAnwenden: function(string): void,
 *   meinZug: function(boolean, number): void,
 *   geberDeckel: function(boolean): void,
 *   eigenesErgebnisFertig: function(): boolean,
 *   eigenesErgebnis: function(): ?{dealer: {total: number, busted: boolean, blackjack: boolean}, net: number},
 *   einsaetze: function(): Array<{f: string, b: number}>,
 *   sperren: function(boolean): void,
 *   fremdeEinsaetze: function(Array<object>): void,
 *   uhr: function(number, string): void
 * }} teile
 * @returns {{zug: function(string, boolean): void, destroy: function(): void}}
 */
export function connectLobby(teile) {
	let runde = 0;
	let meinPlatz = 0;
	let gemeldet = false;
	let letzteFelder = '';
	/**
	 * War der EIGENE Zug in dieser Runde schon gemeldet? Zurückgesetzt bei
	 * jedem Rundenstart (aufRunde()). Bewacht den Sonderfall in aufStand()
	 * unten: ein Geber-Blackjack beendet die EIGENE Runde bereits INNERHALB
	 * von begin() (round-blackjack.js#_settleDealerBlackjack()), also BEVOR
	 * dieser Platz je etwas zu entscheiden hatte. Ohne eine eigene Meldung
	 * wüsste der Server nichts davon und schaltete diesen Platz erst nach
	 * der vollen 20-Sekunden-Notbremse weiter (RoundClock::ZUGZEIT,
	 * LobbyService::aufraeumenEinzeln()) — spielbar, aber unnötig langsam
	 * für alle wartenden Plätze danach. Ohne diese Sperre würde derselbe
	 * Zug bei jeder weiteren Abfrage erneut gemeldet, solange der Server die
	 * erste Meldung noch nicht verarbeitet hat.
	 */
	let eigenerZugGemeldet = false;
	/**
	 * Der zuletzt gesehene casino:lobby-stand, roh (ereignis.detail).
	 *
	 * WARUM DAS HIER GEBRAUCHT WIRD (Behebungslauf, gefunden am Gegenstand):
	 * lobby-live.js sendet casino:lobby-stand IMMER VOR casino:lobby-runde
	 * (dieselbe abfragen()-Antwort, zwei Ereignisse nacheinander — siehe
	 * dessen Quelltext, Abschnitt „DIE BRÜCKE ZU DEN DREI TISCHEN" gefolgt
	 * vom rundeStarten()-Aufruf). Auf GENAU DER Abfrage, die den Zustand nach
	 * 'laeuft' kippt, läuft aufStand() deshalb ZUERST — mit meinPlatz noch
	 * auf dem Wert der VORHERIGEN Runde (0 bei der allerersten) und OHNE
	 * folge (folgeBauen() unten läuft erst danach, aus casino:lobby-runde).
	 * Die Kartenzahlen der anderen blieben dadurch auf "0" stehen, und der
	 * eigene Zug erschien fälschlich gesperrt — nicht dauerhaft falsch
	 * berechnet, sondern nur EINEN Umlauf zu spät geschrieben. Der nächste
	 * echte Umlauf kommt aber erst, wenn sich die Server-Revision wieder
	 * ändert — und weil ein frisch ausgeteilter Tisch von sich aus nichts
	 * meldet (Karten werden rein lokal aus der Saat gezogen, keine Buchung),
	 * kann das bis zur vollen 20-Sekunden-Notbremse (RoundClock::ZUGZEIT)
	 * dauern. aufRunde() verarbeitet deshalb DENSELBEN, gerade gesehenen
	 * Stand ein zweites Mal, sobald meinPlatz und folge stehen — dieselbe
	 * Verarbeitung wie ein echter neuer Umlauf, nur ohne auf ihn zu warten.
	 */
	let letzterStand = null;

	/**
	 * Die Saat wird zum Geber, die Tischfolge wird gebaut, ausgeteilt und
	 * ausgespielt. Anders als bei Roulette/Craps IST diese Funktion nicht
	 * "die ganze Runde" — sie teilt nur aus; was danach kommt (die
	 * Entscheidungen), treibt aufStand() über meinZug() an.
	 */
	async function aufRunde(ereignis) {
		const saat = String(ereignis.detail?.saat ?? '');
		runde = Number(ereignis.detail?.runde ?? 0);
		meinPlatz = Number(ereignis.detail?.mein ?? 0);
		const plaetze = Array.isArray(ereignis.detail?.plaetze) ? ereignis.detail.plaetze : [];
		gemeldet = false;
		eigenerZugGemeldet = false;
		if (saat === '' || meinPlatz === 0 || plaetze.length === 0) {
			return;
		}
		teile.geberSetzen(teile.saatGeber(saat));
		teile.folgeBauen(saat, meinPlatz, plaetze);
		const ergebnis = await teile.starten();
		if (ergebnis.ok !== true) {
			// Kein Einsatz, oder der Tisch war gerade nicht bereit. Die Runde
			// läuft für die anderen trotzdem weiter — dieser Browser schaut
			// zu und meldet nichts. Der Geber geht sofort zurück, damit ein
			// späterer Einzelwurf nicht aus der Saat zöge.
			teile.geberSetzen(null);
		}
		// Siehe Kopfkommentar von letzterStand: derselbe Stand, den
		// aufStand() für DIESE Abfrage bereits (zu früh) verarbeitet hat,
		// wird jetzt — mit stehendem meinPlatz und stehender folge — noch
		// einmal verarbeitet. Ist noch gar kein Stand bekannt (sollte nicht
		// vorkommen, casino:lobby-runde kommt immer nach casino:lobby-stand),
		// passiert nichts.
		if (letzterStand !== null) {
			verarbeiteStand(letzterStand);
		}
	}

	/**
	 * Eine eigene Entscheidung. Angewendet wird SOFORT (blackjack.js hat
	 * table.act()/takeInsurance()/declineInsurance() bereits gerufen, bevor
	 * diese Funktion überhaupt aufgerufen wird), gemeldet unmittelbar danach
	 * — gefahrlos, weil in diesem Augenblick NUR dieser Platz ziehen darf
	 * (der Server hat turn_seat auf ihn gesetzt, sonst wären die Knöpfe
	 * gesperrt gewesen). Das eigene Protokollpaar kommt später über stand.mv
	 * zurück und wird von LobbyTableSequence.anwenden() ÜBERSPRUNGEN
	 * (eigener Platz, siehe dort) — kein doppeltes Ziehen.
	 *
	 * @param {string} buchstabe genau ein Zeichen aus [h,s,d,p,i,n]
	 * @param {boolean} fertig endet damit der EIGENE Zug (Wechsel zum Geber)?
	 */
	function zug(buchstabe, fertig) {
		if (fertig) {
			// Auch bei einer ECHTEN, vom Klick ausgelösten Meldung gesetzt —
			// nicht nur beim Geber-Blackjack-Sonderfall oben —, damit ein
			// erneuter Aufruf während des Netzwerk-Umwegs zum Server nicht
			// denselben abschließenden Zug ein zweites Mal auslöst.
			eigenerZugGemeldet = true;
		}
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'zug', daten: { runde, zug: buchstabe, fertig } },
		}));
	}

	/**
	 * Meldet der Lobby, WAS beim Geber herauskam, und die eigene Bilanz —
	 * aber erst, wenn niemand mehr aussteht (siehe Dateikopf). Die eigene
	 * Auszahlung ist zu diesem Zeitpunkt längst gebucht; hier geht nur noch
	 * die MELDUNG an den Server.
	 */
	function melden() {
		if (gemeldet) {
			return;
		}
		const ausgabe = teile.eigenesErgebnis();
		if (ausgabe === null) {
			return;
		}
		gemeldet = true;
		document.dispatchEvent(new CustomEvent('casino:lobby-fertig', {
			detail: { ergebnis: nutzlast(ausgabe.dealer) },
		}));
		document.dispatchEvent(new CustomEvent('casino:lobby-handlung', {
			detail: { art: 'bilanz', daten: { runde, aus: { box: ausgabe.net } } },
		}));
	}

	/**
	 * Jede geänderte Abfrage — hier steckt beim Blackjack deutlich mehr
	 * Arbeit als bei den beiden anderen Tischen, weil 'laeuft' hier die
	 * Reihe der Entscheidungen IST (lobby-live.js fragt deshalb während
	 * 'laeuft' weiter ab, siehe dessen Kopfkommentar zu D5-2).
	 *
	 * AUSGELAGERT AUS aufStand() (Behebungslauf, siehe letzterStand oben):
	 * dieselbe Verarbeitung läuft zweimal für denselben Stand, wenn eine
	 * Abfrage die Runde startet — einmal zu früh (aus aufStand(), noch ohne
	 * meinPlatz/folge), einmal richtig (aus aufRunde(), danach). Das ist
	 * gefahrlos wiederholbar: zugAnwenden()/anwenden() zählt selbst mit,
	 * wie weit es schon gekommen ist (KEINE doppelten Kartenzüge), und
	 * gemeldet/eigenerZugGemeldet/letzteFelder verhindern jede doppelte
	 * Meldung an den Server.
	 * @param {object} stand ereignis.detail von casino:lobby-stand
	 */
	function verarbeiteStand(stand) {
		// Fremde Züge nachziehen (Kartenzahlen der anderen, und — falls DIESER
		// Platz gerade selbst durch die serverseitige 20-Sekunden-Notbremse
		// übersprungen wurde — die eigene Rundenlogik nachziehen). Siehe
		// blackjack.js#zugAnwenden() für das Vorgehen im Einzelnen.
		teile.zugAnwenden(String(stand.mv ?? ''));

		const dran = Number(stand.t) === meinPlatz && meinPlatz > 0;
		teile.meinZug(dran, Number(stand.rest) || 0);
		teile.geberDeckel(Number(stand.t) > 0);

		// GEBER-BLACKJACK, DER SONDERFALL: dieser Platz ist an der Reihe,
		// hat aber NICHTS zu entscheiden — sein eigenes Blatt stand schon
		// beim Austeilen fest (siehe eigenerZugGemeldet oben). 's' kostet
		// keine Karte (KARTEN_JE_ZUG.s === 0 in round-lobby-blackjack.js),
		// verschiebt also die gemeinsame Kartenfolge für niemanden.
		if (dran && !eigenerZugGemeldet && teile.eigenesErgebnisFertig()) {
			eigenerZugGemeldet = true;
			zug('s', true);
		}

		teile.sperren(stand.z !== OFFEN);
		teile.uhr(Number(stand.rest) || 0, String(stand.z ?? ''));
		teile.fremdeEinsaetze(Array.isArray(stand.p) ? stand.p : []);

		// Niemand steht mehr aus (t === 0) UND die eigene Runde ist wirklich
		// fertig (kann auch bei t===0 kurz false sein, wenn diese Abfrage vor
		// der eigenen letzten Entscheidung eintrifft) → jetzt erst melden.
		if (Number(stand.t) === 0 && teile.eigenesErgebnisFertig()) {
			melden();
		}

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

	/**
	 * Der eigentliche Ereignis-Zuhörer: merkt sich den Stand (für aufRunde(),
	 * siehe letzterStand oben) und verarbeitet ihn.
	 */
	function aufStand(ereignis) {
		letzterStand = ereignis.detail ?? {};
		verarbeiteStand(letzterStand);
	}

	document.addEventListener('casino:lobby-runde', aufRunde);
	document.addEventListener('casino:lobby-stand', aufStand);

	return {
		zug,
		destroy() {
			document.removeEventListener('casino:lobby-runde', aufRunde);
			document.removeEventListener('casino:lobby-stand', aufStand);
		},
	};
}

export default connectLobby;
