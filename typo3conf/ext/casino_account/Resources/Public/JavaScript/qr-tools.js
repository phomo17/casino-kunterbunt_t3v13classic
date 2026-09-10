/**
 * Casino Kunterbunt – PNG und Drucken in der QR-Ansicht
 * =====================================================
 *
 * Zwei kleine Handgriffe, für die es keinen Weg ohne JavaScript gibt:
 *
 *   PNG      CONCEPT.md D.4.3: „PNG wird daraus clientseitig über ein Canvas
 *            erzeugt." Das erspart dem Server die Bildbibliothek — und die
 *            wäre eine Abhängigkeit, die dieses Projekt nicht eingeht.
 *   Drucken  window.print(). Es gibt kein HTML-Element, das druckt.
 *
 * DAS SVG WIRD NICHT NEU GEZEICHNET. Es steht bereits im Dokument; hier wird
 * genau dieses eine genommen. Ein zweiter Zeichner in JavaScript wäre eine
 * zweite Wahrheit — und die erste Regel dieses Hauses lautet, dass es von
 * jeder Sache genau eine Quelle gibt.
 *
 * WARUM EINE „data:"-ADRESSE UND KEIN „blob:"
 * --------------------------------------------
 * Das TYPO3-Backend erzwingt seit Fassung 13 eine Inhaltssicherheitsregel
 * (Content-Security-Policy); der Schalter dafür ist fest an
 * (typo3/sysext/core/Classes/Configuration/Features.php:68 —
 * „security.backend.enforceContentSecurityPolicy" steht in der Liste der
 * immer aktiven Merkmale). Die Grundregel des Backends erlaubt für Bilder
 * ausdrücklich „data:" und NICHT „blob:"
 * (typo3/sysext/backend/Configuration/ContentSecurityPolicies.php:31).
 * Ein Umweg über URL.createObjectURL() würde vom Browser stumm blockiert.
 * Nachgesehen, nicht angenommen.
 */

const svg = document.querySelector('[data-ca-qr]');
const pngButton = document.querySelector('[data-ca-qr-png]');
const printButton = document.querySelector('[data-ca-qr-print]');
const status = document.querySelector('[data-ca-qr-status]');

/**
 * Sagt etwas im Meldebereich an. Der Bereich steht leer im ausgelieferten
 * HTML (siehe Qr.html); hier wird nur Text hineingeschrieben.
 *
 * @param {string} text
 * @returns {void}
 */
function say(text) {
	if (status !== null) {
		status.textContent = text;
	}
}

/**
 * Das SVG aus dem Dokument als „data:"-Adresse.
 *
 * btoa() kann nur Zeichen bis 255. Der Name einer Person darf laut
 * CONCEPT.md D.3.2 beliebige Zeichen enthalten und steht im <title> des SVG —
 * ein „ä" oder ein Emoji würde btoa() sonst zum Absturz bringen. Der Umweg
 * über TextEncoder macht daraus zuerst UTF-8-Bytes.
 *
 * @returns {string}
 */
function svgDataUrl() {
	const quelle = new XMLSerializer().serializeToString(svg);
	const bytes = new TextEncoder().encode(quelle);
	let binaer = '';
	for (const byte of bytes) {
		binaer += String.fromCharCode(byte);
	}
	return 'data:image/svg+xml;base64,' + btoa(binaer);
}

/**
 * Legt das SVG auf eine Zeichenfläche und lädt das Ergebnis als PNG herunter.
 *
 * @returns {void}
 */
function downloadPng() {
	if (svg === null || pngButton === null) {
		return;
	}
	const breite = Number(svg.getAttribute('width'));
	const hoehe = Number(svg.getAttribute('height'));
	if (!Number.isFinite(breite) || breite <= 0) {
		say(pngButton.dataset.caQrFailed ?? '');
		return;
	}

	const bild = new Image();
	bild.addEventListener('load', () => {
		const flaeche = document.createElement('canvas');
		flaeche.width = breite;
		flaeche.height = hoehe;
		const stift = flaeche.getContext('2d');
		if (stift === null) {
			say(pngButton.dataset.caQrFailed ?? '');
			return;
		}
		stift.drawImage(bild, 0, 0, breite, hoehe);

		let datenAdresse;
		try {
			datenAdresse = flaeche.toDataURL('image/png');
		} catch {
			// Manche Browser verweigern das Auslesen einer Zeichenfläche,
			// auf der ein SVG lag. Dann bleibt der SVG-Weg — und das wird
			// gesagt, nicht verschwiegen.
			say(pngButton.dataset.caQrFailed ?? '');
			return;
		}

		const verweis = document.createElement('a');
		verweis.href = datenAdresse;
		verweis.download = (pngButton.dataset.caQrName ?? 'qr-code') + '.png';
		verweis.click();
		say(pngButton.dataset.caQrReady ?? '');
	});
	bild.addEventListener('error', () => {
		say(pngButton.dataset.caQrFailed ?? '');
	});
	bild.src = svgDataUrl();
}

if (pngButton !== null && svg !== null) {
	pngButton.addEventListener('click', downloadPng);
}

if (printButton !== null) {
	printButton.addEventListener('click', () => {
		window.print();
	});
}
