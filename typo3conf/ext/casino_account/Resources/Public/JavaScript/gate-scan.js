/**
 * Casino Kunterbunt – casino_account: Kamera und Bild an der Torseite
 * ===================================================================
 *
 * Die Zugabe aus D.6.1, Wege 1 und 2. KEIN EIGENER QR-LESER (D.12 schließt
 * ihn ausdrücklich aus) — benutzt wird ausschließlich die eingebaute
 * Erkennung des Browsers (BarcodeDetector), die es geben kann oder auch
 * nicht (RESEARCH.md 10.5: WICG-Entwurf, „Limited availability"). Gibt es
 * sie nicht (oder verweigert sie das Format "qr_code"), tut diese Datei GAR
 * NICHTS und die Seite bleibt genau so, wie sie ausgeliefert wurde — Weg 3
 * (Gate/Index.html) steht bereits offen und sichtbar da.
 *
 * ERWARTETES MARKUP (Gate/Index.html): ein Formular mit dem Eingabefeld
 * #ca-gate-token, ein [data-ca-gate-handonly]-Absatz, ein
 * [data-ca-gate-scan]-Bereich mit den fünf data-message-*-Sätzen für die
 * Statuszeile, darin [data-ca-gate-camera] (zwei weitere data-message-*
 * für die Beschriftung), [data-ca-gate-video] und [data-ca-gate-file], und
 * eine leere Statuszeile [data-ca-gate-status][role="status"].
 *
 * WARUM DIE TEXTE ALS data-message-* MITREISEN: kein deutscher Anzeigetext
 * im JavaScript-Quelltext — jeder Satz kommt aus der XLIFF-Datei über die
 * Fluid-Vorlage, dieselbe Regel wie in qr-tools.js.
 *
 * AUFRÄUMEN: getTracks().forEach(t => t.stop()) beim Anhalten UND bei
 * pagehide — eine Kamera, die nach dem Verlassen der Seite weiterläuft, ist
 * ein Vertrauensbruch, auch wenn der Browser sie irgendwann selbst abschaltet.
 */

const scanSection = document.querySelector('[data-ca-gate-scan]');
const handonly = document.querySelector('[data-ca-gate-handonly]');
const cameraButton = document.querySelector('[data-ca-gate-camera]');
const video = document.querySelector('[data-ca-gate-video]');
const fileInput = document.querySelector('[data-ca-gate-file]');
const statusZeile = document.querySelector('[data-ca-gate-status]');
const tokenFeld = document.getElementById('ca-gate-token');
const formular = tokenFeld !== null ? tokenFeld.closest('form') : null;

let kann = 'BarcodeDetector' in window;
let detektor = null;

if (kann) {
	try {
		detektor = new BarcodeDetector({ formats: ['qr_code'] });
	} catch {
		// Der Browser meldet BarcodeDetector an, verweigert aber das Format
		// "qr_code" — dann ist die eingebaute Erkennung für uns wertlos.
		kann = false;
	}
}

const bereit = kann
	&& detektor !== null
	&& scanSection !== null
	&& handonly !== null
	&& cameraButton !== null
	&& video !== null
	&& fileInput !== null
	&& statusZeile !== null
	&& tokenFeld !== null
	&& formular !== null;

// Ohne die eingebaute Erkennung (oder ohne das erwartete Markup) passiert
// NICHTS. Kein Knopf erscheint, kein Hinweis, keine Meldung — der
// ausgelieferte Zustand ist bereits der richtige.
if (bereit) {
	// 1. Den Block sichtbar machen, den Satz „geht mit der Hand" entfernen —
	//    jetzt gibt es mehr als einen Weg, und die Feststellung stimmte nicht mehr.
	scanSection.hidden = false;
	handonly.hidden = true;

	let strom = null;
	let laeuftSeit = null;

	/** @param {string|undefined} text @returns {void} */
	function sage(text) {
		if (typeof text === 'string' && text !== '') {
			statusZeile.textContent = text;
		}
	}

	/** Hält die Kamera an und räumt Stift und Beschriftung zurück. @returns {void} */
	function kameraAnhalten() {
		if (laeuftSeit !== null) {
			window.clearInterval(laeuftSeit);
			laeuftSeit = null;
		}
		if (strom !== null) {
			for (const spur of strom.getTracks()) {
				spur.stop();
			}
			strom = null;
		}
		video.srcObject = null;
		cameraButton.setAttribute('aria-pressed', 'false');
		cameraButton.textContent = cameraButton.dataset.messageCameraStart ?? cameraButton.textContent;
	}

	/**
	 * Ein Erkennungsversuch auf dem laufenden Kamerabild.
	 * @returns {Promise<void>}
	 */
	async function bildPruefen() {
		if (video.readyState < 2) {
			return;
		}
		let treffer;
		try {
			treffer = await detektor.detect(video);
		} catch {
			// Ein einzelner missglückter Versuch ist kein Fehler — der
			// nächste folgt 250 ms später.
			return;
		}
		const erster = treffer[0];
		if (erster !== undefined && typeof erster.rawValue === 'string' && erster.rawValue !== '') {
			// 4. Fund: Wert ins Feld schreiben, Kamera anhalten, ansagen, absenden.
			tokenFeld.value = erster.rawValue;
			sage(scanSection.dataset.messageFound);
			kameraAnhalten();
			// requestSubmit() und nicht submit(): submit() umgeht die
			// Formularprüfung des Browsers und die submit-Ereignisse.
			formular.requestSubmit();
		}
	}

	/**
	 * 2. Kamera: getUserMedia, Bild in <video>, alle 250 ms detect() über
	 *    den laufenden Strom. Der Knopf schaltet an UND aus.
	 * @returns {Promise<void>}
	 */
	async function kameraStarten() {
		try {
			strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
		} catch {
			// 6. Abgelehnte Freigabe (oder kein Gerät): eine Feststellung,
			//    keine Fehlermeldung — die Handeingabe steht ohnehin offen.
			sage(scanSection.dataset.messageDenied);
			strom = null;
			return;
		}
		video.srcObject = strom;
		try {
			await video.play();
		} catch {
			sage(scanSection.dataset.messageDenied);
			kameraAnhalten();
			return;
		}
		cameraButton.setAttribute('aria-pressed', 'true');
		cameraButton.textContent = cameraButton.dataset.messageCameraStop ?? cameraButton.textContent;
		sage(scanSection.dataset.messageCameraOn);
		laeuftSeit = window.setInterval(bildPruefen, 250);
	}

	cameraButton.addEventListener('click', () => {
		if (strom !== null) {
			kameraAnhalten();
			sage(scanSection.dataset.messageCameraOff);
		} else {
			kameraStarten();
		}
	});

	// 3. Bild: createImageBitmap(datei) → detect() → gefunden oder nicht.
	//    KEIN Canvas nötig, BarcodeDetector nimmt ein ImageBitmap direkt.
	fileInput.addEventListener('change', async () => {
		const datei = fileInput.files !== null ? fileInput.files[0] : undefined;
		if (datei === undefined) {
			return;
		}
		let bild;
		try {
			bild = await createImageBitmap(datei);
		} catch {
			sage(scanSection.dataset.messageNothing);
			return;
		}
		let treffer;
		try {
			treffer = await detektor.detect(bild);
		} catch {
			sage(scanSection.dataset.messageNothing);
			return;
		}
		const erster = treffer[0];
		if (erster !== undefined && typeof erster.rawValue === 'string' && erster.rawValue !== '') {
			tokenFeld.value = erster.rawValue;
			sage(scanSection.dataset.messageFound);
			formular.requestSubmit();
		} else {
			sage(scanSection.dataset.messageNothing);
		}
	});

	// 5. Aufräumen beim Verlassen der Seite — eine weiterlaufende Kamera
	//    nach dem Verlassen ist ein Vertrauensbruch.
	window.addEventListener('pagehide', kameraAnhalten);
}
