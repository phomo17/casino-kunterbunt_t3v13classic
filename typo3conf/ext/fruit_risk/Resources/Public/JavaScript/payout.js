/**
 * FruitRisk – der Gewinnanspruch
 * ================================
 *
 * Ein Anspruch ist ein Betrag, der erspielt, aber noch nicht gutgeschrieben
 * ist. Genau ein Objekt je Runde — und an diesem Gerät entsteht in JEDER
 * Runde einer, weil die Gewinngarantie baulich erzwungen ist (C.14.7).
 *
 *
 * WOZU DAS GUT IST — DIE ÜBERGABESTELLE FÜR PHASE F5
 * -----------------------------------------------------
 * Phase F4 kennt nur einen Weg: gewonnen, im Angebot liegen gelassen, durch
 * REWARD oder das nächste START gutgeschrieben. Eine künftige Phase F5 kennt
 * mehr: ein Risikospiel kann denselben Anspruch übernehmen, verdoppeln oder
 * verlieren. Stünde in wallet.js schlicht `await claim.collect()`, müsste
 * F5 diese Zeile wieder aufbrechen. Stattdessen fragt wallet.js per
 * ABBRECHBAREM Ereignis, ob jemand den Anspruch übernehmen will:
 *
 *   const claim = new WinClaim(root, win, machineCredit);
 *   if (!emit('fr:offer', { win, stake, claim }, true).defaultPrevented) {
 *       await claim.collect();          // niemand hat übernommen
 *   }
 *
 * Phase F5 hört auf fr:offer, ruft preventDefault(), behält den Anspruch,
 * und ruft später claim.collect() (Ausstieg) oder claim.discard()
 * (Fehlgriff). Verdoppelt wird mit claim.amount *= 2. An dieser Übergabe
 * ändert sich dafür keine Zeile — ein Mechanismus, nicht zwei.
 *
 *
 * WARUM DIE KAPPUNG HIER SITZT UND NICHT ANDERSWO
 * --------------------------------------------------
 * Eine künftige Leiter darf unbegrenzt verdoppeln, ein Gerätekredit sättigt
 * bei 999.999.999 (README.md, „Der Gerätekredit"), und award() wirft
 * oberhalb davon absichtlich einen RangeError — ein zu großer Betrag ist
 * dort ein Programmierfehler. Ein hoch geleiterter Gewinn ist aber KEIN
 * Programmierfehler, sondern ein ausdrücklich vorgesehener Fall. Also wird
 * hier auf den Höchstbetrag gekappt, bevor gutgeschrieben wird, und die
 * Kappung wird gemeldet.
 *
 *
 * WAS DIESE DATEI NICHT TUT
 * ---------------------------
 * Sie fasst keine Anzeige an. Die GEWINN-Röhren gehören machine.js, eine
 * künftige Stufenanzeige gehört risk.js. Ein Anspruch ist eine Zahl mit
 * einem Zustand, kein Bildschirmelement.
 *
 * GUTGESCHRIEBEN WIRD DEM GERÄT, NICHT DER KASSE
 * -------------------------------------------------
 * Ein Gewinn landet im GERÄTEKREDIT, nicht in der Kasse (CONCEPT.md B.5.2:
 * „Gespielt wird ausschließlich vom Gerätekredit."). Diese Datei importiert
 * credit.js deshalb nicht und kennt die Kasse gar nicht; sie bekommt den
 * Gerätekredit als drittes Argument gereicht — angelegt wird er in
 * wallet.js.
 *
 * WARUM DIESE KLASSE IM GERÄT STEHT UND NICHT IM SITE PACKAGE
 * ---------------------------------------------------------------
 * Sie sendet ein GERÄTEEIGENES Ereignis am Gehäuse und ist damit
 * DOM-gebunden; ein geteilter Baustein darf kein Gerät kennen.
 */

/**
 * Ein erspielter, noch nicht verrechneter Gewinn.
 */
export class WinClaim {
	/**
	 * @param {HTMLElement} root das .fr-machine — nur, um fr:collect dort zu melden
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
		 * Eine künftige Phase F5 schreibt hier hinein: `claim.amount *= 2`
		 * nach einem Treffer. Nach collect() oder discard() ist Schreiben
		 * wirkungslos — der Anspruch ist dann erledigt.
		 */
		this.amount = Math.max(0, Math.trunc(Number.isFinite(amount) ? amount : 0));

		/**
		 * Erledigt? Wird beim ersten collect() oder discard() gesetzt und
		 * nie wieder zurückgenommen. Verhindert, dass derselbe Gewinn
		 * zweimal gutgeschrieben wird — der wichtigste Schutz dieser Klasse.
		 */
		this.settled = false;
	}

	/**
	 * Schreibt den Anspruch dem Gerätekredit gut und meldet das als
	 * fr:collect am Gehäuse.
	 *
	 * Ein zweiter Aufruf tut nichts und meldet den Programmfehler laut.
	 *
	 * @returns {Promise<{ok: boolean, amount: number, credited: number,
	 *                    capped: boolean, machineCredit: number, reason?: string}>}
	 */
	async collect() {
		if (this.settled) {
			console.error('[fruit-risk] Ein bereits erledigter Gewinnanspruch sollte erneut eingelöst werden.');
			return {
				ok: false,
				reason: 'settled',
				amount: this.amount,
				credited: 0,
				capped: false,
				machineCredit: this.machineCredit.amount,
			};
		}

		// Vor dem await gesetzt: zwei Aufrufe im selben Takt dürfen sich
		// nicht beide durchmogeln.
		this.settled = true;

		const amount = this.amount;

		// An diesem Gerät ist ein Gewinn von 0 baulich unerreichbar
		// (Gewinngarantie, C.14.7) — trotzdem behandelt statt behauptet.
		// award(0) würde werfen, also wird gar nicht erst gebucht.
		if (amount === 0) {
			return { ok: true, amount: 0, credited: 0, capped: false, machineCredit: this.machineCredit.amount };
		}

		// Siehe Dateikopf: der Anspruch darf größer sein als ein
		// Gerätekredit fassen kann.
		const payable = Math.min(amount, this.machineCredit.MAX);
		const result = await this.machineCredit.award(payable);
		const capped = result.capped || payable < amount;

		const detail = Object.freeze({
			amount,
			credited: result.credited,
			capped,
			machineCredit: result.amount,
		});
		this.root.dispatchEvent(new CustomEvent('fr:collect', { detail, bubbles: true }));

		return { ok: true, amount, credited: result.credited, capped, machineCredit: result.amount };
	}

	/**
	 * Verwirft den Anspruch, ohne etwas gutzuschreiben.
	 *
	 * Phase F4 ruft das nie — es gibt dort keinen Weg, einen Gewinn zu
	 * verlieren. Eine künftige Risikospiel-Phase ruft es beim Fehlgriff. Der
	 * Gerätekredit bleibt dabei unverändert; der Einsatz war schon beim
	 * Rundenstart abgebucht.
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
