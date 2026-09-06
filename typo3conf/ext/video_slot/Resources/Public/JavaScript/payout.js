/**
 * Video Slot – der Gewinnanspruch
 * ==============================================
 *
 * Ein Anspruch ist ein Betrag, der erspielt, aber noch nicht gutgeschrieben
 * ist. Genau ein Objekt je gewonnener Runde.
 *
 *
 * WOZU DAS GUT IST — DIE NAHT ZU PHASE 7
 * --------------------------------------
 * Phase 6 kennt nur einen Weg: gewonnen, gutgeschrieben, fertig. Phase 7 kennt
 * drei (CONCEPT.md Abschnitt 3.4):
 *
 *   RISK drücken   → verdoppeln oder alles verlieren, Leiter läuft weiter
 *   REWARD drücken → aussteigen und gutschreiben
 *   Hebel ziehen   → gutschreiben und die nächste Runde beginnen
 *
 * Stünde in Phase 6 schlicht `await machineCredit.award(win)`, müsste Phase 7
 * diese Zeile wieder aufbrechen. Stattdessen erzeugt wallet.js einen Anspruch
 * und fragt per ABBRECHBAREM Ereignis, ob ihn jemand übernehmen will:
 *
 *   const claim = new WinClaim(root, win, machineCredit);
 *   if (!emit('vs:payout', { win, bet, claim }, true).defaultPrevented) {
 *       await claim.collect();          // niemand hat übernommen
 *   }
 *
 * Phase 7 hört auf vs:payout, ruft preventDefault(), behält den Anspruch, und
 * ruft später claim.collect() (Treffer, REWARD, Hebel) oder claim.discard()
 * (Fehlgriff). Verdoppelt wird mit claim.amount *= 2. An Phase 6 ändert sich
 * dafür keine Zeile — dasselbe Verfahren, mit dem dieses Gerät schon vs:round für
 * die Kasse abbrechbar gemacht hat. Ein Mechanismus, nicht zwei.
 *
 *
 * WARUM DIE KAPPUNG HIER SITZT UND NICHT IN PHASE 7
 * -------------------------------------------------
 * Die Leiter darf unbegrenzt verdoppeln, ein Gerätekredit sättigt bei
 * 999.999.999 (DECISIONS.md, Phase 3), und award() wirft oberhalb davon
 * absichtlich einen RangeError — ein zu großer Betrag ist dort ein
 * Programmierfehler. Ein hoch geleiterter Gewinn ist aber KEIN
 * Programmierfehler, sondern der ausdrücklich vorgesehene Fall. Also wird hier
 * auf den Höchstbetrag gekappt, bevor gutgeschrieben wird, und die Kappung
 * wird gemeldet. Läge das in Phase 7, müsste jede weitere Phase mit Gewinnen
 * es erneut bedenken.
 *
 *
 * WAS DIESE DATEI NICHT TUT
 * -------------------------
 * Sie fasst keine Anzeige an. Die GEWINN-Röhren gehören Phase 6, die
 * Stufenanzeige der Leiter gehört risk.js. Ein Anspruch ist eine Zahl mit
 * einem Zustand, kein Bildschirmelement.
 *
 * SEIT AUSBAUSTUFE 2, PHASE 3: GUTGESCHRIEBEN WIRD DEM GERÄT
 * ----------------------------------------------------------
 * Ein Gewinn landet im GERÄTEKREDIT, nicht in der Kasse (CONCEPT.md B.5.2:
 * „Gespielt wird ausschließlich vom Gerätekredit. Einsatz und Gewinn
 * verrechnen sich dort."). Diese Datei importiert credit.js deshalb nicht mehr
 * und kennt die Kasse gar nicht; sie bekommt den Gerätekredit als drittes
 * Argument gereicht — angelegt wird er in wallet.js.
 *
 * Für die geteilte Risiko-Leiter ändert das NICHTS: sie verlangt vom Anspruch
 * nur amount, collect() und discard() (casino_startpage/README.md, Abschnitt
 * „Der Anspruch"). Genau deshalb ist risk-ladder.js in dieser Phase nicht
 * angefasst worden — der Vertrag hat gehalten.
 *
 * WARUM DIESE KLASSE IM GERÄT STEHT UND NICHT IM SITE PACKAGE
 * ------------------------------------------------------------
 * Geprüft in Phase 7, wie es DECISIONS.md als offenen Punkt verlangt: Sie
 * sendet ein GERÄTEEIGENES Ereignis am Gehäuse und ist damit DOM-gebunden;
 * ein geteilter Baustein darf kein Gerät kennen. Geteilt ist bereits das
 * Richtige — der VERTRAG (amount, collect(), discard()) steht in
 * casino_startpage/README.md und im Kopf von risk-ladder.js. Die
 * Sättigung beim Verdoppeln liegt ohnehin in der Leiter, die Kappung am
 * Höchststand im Gerätekredit. Übrig bliebe eine Klasse, der man den
 * Ereignisnamen hineinreichen müsste — mehr Verdrahtung als gesparter Code.
 */

/**
 * Ein erspielter, noch nicht verrechneter Gewinn.
 */
export class WinClaim {
	/**
	 * @param {HTMLElement} root das .vs-machine — nur, um vs:collect dort zu melden
	 * @param {number} amount der erspielte Betrag, ganze Zahl ab 0
	 * @param {object} machineCredit der Gerätekredit, dem gutgeschrieben wird.
	 *        Übergeben und nicht importiert: es gibt je Gehäuse genau einen,
	 *        und angelegt wird er in wallet.js.
	 */
	constructor(root, amount, machineCredit) {
		this.root = root;
		this.machineCredit = machineCredit;

		/**
		 * Der offene Betrag.
		 *
		 * Phase 7 schreibt hier hinein: `claim.amount *= 2` nach einem Treffer.
		 * Nach collect() oder discard() ist Schreiben wirkungslos — der Anspruch
		 * ist dann erledigt.
		 */
		this.amount = Math.max(0, Math.trunc(Number.isFinite(amount) ? amount : 0));

		/**
		 * Erledigt? Wird beim ersten collect() oder discard() gesetzt und nie
		 * wieder zurückgenommen. Verhindert, dass derselbe Gewinn zweimal
		 * gutgeschrieben wird — der wichtigste Schutz dieser Klasse.
		 */
		this.settled = false;
	}

	/**
	 * Schreibt den Anspruch dem Guthaben gut und meldet das als vs:collect am
	 * Gehäuse (auto.js und sound.js dieser Ausbaustufe hängen dort an).
	 *
	 * Ein zweiter Aufruf tut nichts und meldet den Programmfehler laut.
	 *
	 * @returns {Promise<{ok: boolean, amount: number, credited: number,
	 *                    capped: boolean, machineCredit: number, reason?: string}>}
	 */
	async collect() {
		if (this.settled) {
			console.error('[video-slot] Ein bereits erledigter Gewinnanspruch sollte erneut eingelöst werden.');
			return {
				ok: false,
				reason: 'settled',
				amount: this.amount,
				credited: 0,
				capped: false,
				machineCredit: this.machineCredit.amount,
			};
		}

		// Vor dem await gesetzt: zwei Aufrufe im selben Takt dürfen sich nicht
		// beide durchmogeln.
		this.settled = true;

		const amount = this.amount;

		// Ein Gewinn von 0 ist kein Fehler, sondern der Normalfall in rund 81 % der Runden (Trefferhäufigkeit 0,192662 je
		// Runde, README „Walzenbänder und Quote"). award(0) würde werfen, also wird gar nicht erst
		// gebucht — und auch nichts gemeldet: es gibt nichts auszuzahlen.
		if (amount === 0) {
			return { ok: true, amount: 0, credited: 0, capped: false, machineCredit: this.machineCredit.amount };
		}

		// Siehe Dateikopf: der Anspruch darf größer sein als ein Gerätekredit
		// fassen kann.
		const payable = Math.min(amount, this.machineCredit.MAX);
		const result = await this.machineCredit.award(payable);
		const capped = result.capped || payable < amount;

		// vs:collect behält seinen Namen und sein Feld "amount" — sound.js
		// hängt die Münzkaskade daran und wird von dieser Phase nicht berührt.
		// Nur "balance" heißt jetzt "machineCredit", weil es der Gerätekredit
		// ist und kein Kassenstand; ein Feld, das etwas anderes bedeutet als
		// sein Name sagt, wäre eine Falle für den nächsten Leser.
		const detail = Object.freeze({
			amount,
			credited: result.credited,
			capped,
			machineCredit: result.amount,
		});
		this.root.dispatchEvent(new CustomEvent('vs:collect', { detail, bubbles: true }));

		return { ok: true, amount, credited: result.credited, capped, machineCredit: result.amount };
	}

	/**
	 * Verwirft den Anspruch, ohne etwas gutzuschreiben.
	 *
	 * Phase 6 ruft das nie — es gibt dort keinen Weg, einen Gewinn zu verlieren.
	 * Die Risiko-Leiter ruft es beim Fehlgriff. Der Gerätekredit bleibt dabei
	 * unverändert; der Einsatz war schon beim Hebelzug abgebucht
	 * (CONCEPT.md Abschnitt 3.4).
	 *
	 * @returns {boolean} false, wenn der Anspruch schon erledigt war
	 */
	discard() {
		if (this.settled) {
			return false;
		}
		this.settled = true;
		return true;
	}
}

export default WinClaim;
