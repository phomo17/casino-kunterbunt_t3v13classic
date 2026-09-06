/**
 * FruitRisk – Drucktasten für Zeiger UND Tastatur
 * ================================================
 *
 * Eine einzige Funktion, damit derselbe Block nicht in machine.js und (ab
 * Phase F5) risk.js und auto.js mehrfach steht. Sie hat KEINEN Import:
 * risk.js und auto.js dürfen den Spielkern nicht importieren, und ein
 * Helfer, der aus machine.js käme, brächte genau diese Kopplung durch die
 * Hintertür.
 *
 * WARUM DER ZEIGER SOFORT WIRKT
 * -----------------------------
 * pointerdown, nicht click: eine Taste an einem Spielautomaten reagiert im
 * Moment des Drückens. Bei 40 ms Trefferfenster in einer künftigen
 * Risiko-Leiter ist das keine Geschmacksfrage — click feuert erst beim
 * Loslassen.
 *
 * NUR DIE LINKE/PRIMÄRE TASTE (Behebungslauf REVIEW-fruitrisk-f4.md [M8]):
 * pointerdown feuert für JEDE gedrückte Maustaste, nicht nur die linke.
 * event.isPrimary unterscheidet nur den primären Zeiger von einem zweiten
 * Finger, NICHT die gedrückte Taste — dafür steht event.button (0 = links).
 * Ohne diese Prüfung buchte ein Rechts- oder Mittelklick auf START eine
 * Runde ab, während gleichzeitig ein Kontextmenü aufgeht.
 *
 * WARUM DIE TASTATUR ÜBER keydown UND NICHT ÜBER click.detail LÄUFT
 * -------------------------------------------------------------------
 * Eine frühere Fassung unterschied Zeiger und Tastatur am ausgelösten click:
 * ein vom Zeiger erzeugtes click zählt event.detail ab 1, ein von der
 * Tastatur erzeugtes trägt 0. Das ist KEINE verlässliche Grenze (REVIEW-
 * fruitrisk-f4.md [M9]): ob Spracheingabe, Switch Access oder ein
 * Bildschirmleser wirklich ein click mit detail 0 synthetisieren oder ein
 * gewöhnliches erzeugen, ist von hier aus nicht zu wissen und je nach
 * Hilfsmittel verschieden. Diese Fassung braucht die Unterscheidung deshalb
 * gar nicht mehr: Enter und Leertaste werden über einen eigenen keydown-
 * Zuhörer sofort ausgelöst (event.preventDefault() unterdrückt dabei den
 * synthetischen click, den ein echtes <button> danach ohnehin auslösen
 * würde — kein doppeltes Auslösen). Ein click, der weder von pointerdown
 * noch von keydown herrührt, kommt von einem Hilfsmittel, das click direkt
 * synthetisiert (etwa Spracheingabe) — auch DER löst aus, unabhängig von
 * seinem detail. Jeder Bedienweg reagiert damit an seiner eigenen Quelle,
 * nicht an einer geratenen Eigenschaft eines fremden Ereignisses.
 *
 * DER MERKER IST TROTZDEM SICHER
 * -------------------------------
 * Die frühere Fassung war bewusst OHNE Merker gebaut, weil ein Merker, der
 * sich „gerade lief ein Zeigerdruck" merkt, hängen bleibt, sobald der Zeiger
 * die Taste vor dem Loslassen verlässt — dann kommt gar kein click, der
 * Merker stünde weiter, und die nächste Bedienung würde verschluckt. Diese
 * Fassung braucht trotzdem einen Merker (er unterscheidet „kam der click von
 * pointerdown/keydown dieser Taste" von „kam er von woanders"), löst die
 * beschriebene Falle aber auf: pointerup, pointercancel UND pointerleave
 * setzen ihn zurück, genau wie sie die gedrückte Kappe zurücknehmen — der
 * Merker kann also nicht länger stehen bleiben als die Kappe selbst gedrückt
 * aussieht. Beim Zeiger geschieht das Zurücksetzen ERST NACH DEM CLICK
 * desselben Vorgangs (siehe unten, Behebungslauf REVIEW-fruitrisk-f5.md
 * [C1]) — sonst löst jeder Zeigerdruck zweimal aus.
 *
 * DRUCKRÜCKMELDUNG AUCH ÜBER DIE TASTATUR (Behebungslauf REVIEW-fruitrisk-f4.md
 * [L6]): die gedrückte Kappe (pressedClass) wird jetzt auch bei keydown
 * gesetzt und bei keyup wieder abgenommen — symmetrisch zu
 * pointerdown/pointerup. Wer STOP mit der Leertaste bedient, sieht die
 * Kappe jetzt ebenso einsinken wie mit dem Finger. keyup filtert dabei auf
 * Enter/Leertaste, genau wie keydown — ein keyup von Tab, Shift oder einer
 * Pfeiltaste darf den Merker nicht anfassen (Behebungslauf
 * REVIEW-fruitrisk-f5.md [L2]).
 *
 * WARUM DER ZEIGER-MERKER ERST NACH DEM CLICK FÄLLT (Behebungslauf
 * REVIEW-fruitrisk-f5.md [C1])
 * ------------------------------------------------------------------
 * Die Ereignisreihenfolge im Browser ist pointerdown → pointerup → click,
 * NICHT pointerdown → click → pointerup. Setzte pointerup den Merker sofort
 * zurück, sähe der click, der noch im selben Vorgang folgt, den Merker
 * schon auf false und hielte sich für einen fremden, direkt synthetisierten
 * click — action() liefe dadurch ZWEIMAL je Zeigerdruck. Deshalb schiebt
 * onPointerRelease das Zurücksetzen über globalThis.setTimeout(…, 0) einen
 * Tick hinter den click desselben Task-Durchlaufs: click selbst feuert noch
 * synchron in derselben Microtask-Kette wie pointerup, der setTimeout-
 * Callback erst danach. Der Rückfall gegen „Zeiger verlässt die Taste vor
 * dem Loslassen" bleibt erhalten, weil pointerleave denselben verzögerten
 * Reset auslöst — in diesem Fall kommt ohnehin kein click, das Verzögern
 * ist dort folgenlos.
 * Die Tastatur braucht diese Verzögerung nicht: onKeyDown unterdrückt den
 * synthetischen click von Enter/Leertaste per preventDefault(), es entsteht
 * also gar kein click, gegen den der Merker noch stehen müsste.
 *
 * In dieser Datei steht kein deutscher Anzeigetext.
 */

/**
 * Verdrahtet eine Drucktaste für Zeiger UND Tastatur.
 *
 * @param {?HTMLElement} element die Taste, oder null
 * @param {string} pressedClass Klasse für die gedrückte Kappe
 * @param {() => void} action was beim Drücken geschehen soll
 * @returns {?() => void} Abmelde-Funktion, oder null, wenn element fehlt
 */
export function wirePressButton(element, pressedClass, action) {
	if (element === null) {
		return null;
	}

	// True, solange ein click aus demselben Bedienvorgang (Zeiger oder
	// Tastatur) noch aussteht. Ein click, der eintrifft, während dieser
	// Merker noch true ist, ist der Folge-click des eigenen
	// pointerdown/keydown und darf NICHT zusätzlich auslösen. Beim Zeiger
	// kommt click ERST NACH pointerup — der Merker fällt deshalb bei
	// pointerup/pointercancel/pointerleave nicht sofort, sondern über
	// setTimeout(…, 0) einen Tick später (siehe Dateikopf, [C1]).
	let ownClickPending = false;

	const onPointerDown = (event) => {
		// Nur die primäre, linke Taste. event.isPrimary unterscheidet nur
		// den primären Zeiger von einem zweiten Finger, NICHT die gedrückte
		// Maustaste — siehe Dateikopf, [M8].
		if (!event.isPrimary || event.button !== 0) {
			return;
		}
		ownClickPending = true;
		element.classList.add(pressedClass);
		action();
	};
	const onKeyDown = (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		// Kein Nachfeuern, solange die Taste gehalten wird.
		if (event.repeat) {
			return;
		}
		// Unterdrückt den synthetischen click, den ein echtes <button> nach
		// Enter/Leertaste ohnehin auslöst — sonst liefe action() zweimal.
		event.preventDefault();
		ownClickPending = true;
		element.classList.add(pressedClass);
		action();
	};
	const onClick = () => {
		if (ownClickPending) {
			// Der Folge-click des eigenen pointerdown/keydown — schon
			// ausgelöst, hier nichts weiter tun.
			return;
		}
		// Weder pointerdown noch keydown dieser Verdrahtung ging voraus: ein
		// Hilfsmittel hat click direkt synthetisiert (siehe Dateikopf,
		// [M9]). Auch das löst aus, unabhängig von event.detail.
		action();
	};
	const clearClickPending = () => {
		ownClickPending = false;
	};
	// pointerup/pointercancel/pointerleave: die Kappe hebt sofort ab, der
	// Merker fällt aber erst einen Tick später — siehe Dateikopf, [C1].
	const onPointerRelease = () => {
		element.classList.remove(pressedClass);
		globalThis.setTimeout(clearClickPending, 0);
	};
	// keyup: nur Enter/Leertaste dürfen den Merker anfassen, sonst nimmt ein
	// keyup von Tab, Shift oder einer Pfeiltaste der Kappe fälschlich die
	// gedrückte Kappe ab (siehe Dateikopf, [L2]). Der Merker fällt auch hier
	// erst einen Tick später: bei der Leertaste liegt die native
	// Klick-Auslösung eines <button> auf keyup, nicht auf keydown — ein
	// Merker, der bei keyup sofort fiele, sähe einen solchen click schon als
	// fremd an (dieselbe Falle wie beim Zeiger, siehe Dateikopf, [C1]).
	// preventDefault() in onKeyDown unterdrückt diesen click zwar bereits,
	// die Verzögerung bleibt aber die robustere, symmetrische Lösung.
	const onKeyUp = (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		element.classList.remove(pressedClass);
		globalThis.setTimeout(clearClickPending, 0);
	};

	element.addEventListener('pointerdown', onPointerDown);
	element.addEventListener('keydown', onKeyDown);
	element.addEventListener('click', onClick);
	element.addEventListener('pointerup', onPointerRelease);
	element.addEventListener('pointercancel', onPointerRelease);
	element.addEventListener('pointerleave', onPointerRelease);
	element.addEventListener('keyup', onKeyUp);

	return () => {
		element.removeEventListener('pointerdown', onPointerDown);
		element.removeEventListener('keydown', onKeyDown);
		element.removeEventListener('click', onClick);
		element.removeEventListener('pointerup', onPointerRelease);
		element.removeEventListener('pointercancel', onPointerRelease);
		element.removeEventListener('pointerleave', onPointerRelease);
		element.removeEventListener('keyup', onKeyUp);
		element.classList.remove(pressedClass);
	};
}

export default wirePressButton;
