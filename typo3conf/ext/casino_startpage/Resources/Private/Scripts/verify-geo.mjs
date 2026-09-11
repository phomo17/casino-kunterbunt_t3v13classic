/**
 * Casino Kunterbunt – Nachweis der KI-Auffindbarkeit (GEO)
 * =========================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Node ab Version 18
 * (globales fetch()), keine Abhängigkeit.
 *
 * ANDERS ALS JEDES ANDERE verify-*.mjs DIESES PROJEKTS BRAUCHT DIESES SKRIPT
 * DAS NETZ. Alle bisherigen Prüfungen (verify-gattung.mjs, verify-risk-timing.mjs)
 * lesen ausschließlich Quelldateien und beweisen etwas über den QUELLTEXT.
 * Eine <meta name="description">, ein <script type="application/ld+json">
 * und der Inhalt von llms.txt entstehen aber erst zur LAUFZEIT — teils aus
 * TypoScript, teils aus einer Seitenkonfiguration, teils (bei llms.txt) aus
 * einer von Hand gepflegten Liste. Nur die tatsächlich ausgelieferte Antwort
 * kann deshalb beweisen, dass sie stimmt. Die DDEV-Instanz muss also laufen.
 *
 * Aufruf:
 *
 *   node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-geo.mjs
 *
 * Löst der Host die DDEV-Adresse selbst auf (üblich mit mkcert/ddev-hostname),
 * genügt der Aufruf direkt. Sonst:
 *
 *   ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-geo.mjs
 *
 * Eine andere Basisadresse (z. B. gegen eine spätere echte Domain) lässt sich
 * per Umgebungsvariable setzen:
 *
 *   CASINO_BASE_URL=https://casino-kunterbunt.example node .../verify-geo.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt.
 *
 *
 * WAS HIER BEWIESEN WIRD (Auditbericht 2026-09-05, Abschnitt „KI-Auffindbarkeit")
 * --------------------------------------------------------------------------
 *   G-01  Jede über die XML-Sitemap geführte Seite liefert mindestens ein
 *         gültiges application/ld+json aus.
 *   G-02  Jede Seite liefert GENAU EINE <meta name="description"> mit
 *         sinnvollem Inhalt (weder leer noch unplausibel kurz/lang).
 *   G-03  llms.txt nennt JEDE Seite, die auch die XML-Sitemap führt — die
 *         eigentliche Ursache des Befundes vom 2026-09-04 und 2026-09-05
 *         war eine Liste, die beim Wachsen des Saals nicht mitgewachsen ist.
 *   G-04  Der Seitentitel wiederholt sich nicht ("X: X").
 *
 * G-05 (Cache-Control) und G-06 (zweite Gliederungsebene) prüft dieses
 * Skript ABSICHTLICH NICHT: G-05 ist eine bewusste, dokumentierte
 * TypoScript-Entscheidung (DECISIONS.md), kein Zustand, den ein Regressions-
 * netz je Seite einzeln bewachen müsste; G-06 hat auf den meisten Seiten
 * gar keinen echten zweiten Abschnitt (siehe DECISIONS.md) — eine Prüfung
 * dafür würde entweder eine erfundene Überschrift verlangen oder ins Leere
 * laufen.
 *
 *
 * WARUM DIE SITEMAP DIE MASSGEBLICHE SEITENLISTE IST, NICHT EINE EINGETRAGENE
 * ----------------------------------------------------------------------------
 * Dieselbe Überlegung wie in verify-gattung.mjs bei den Geräte-Extensions:
 * eine eingetragene Liste veraltet, eine ERMITTELTE nicht. Die XML-Sitemap
 * kommt aus EXT:seo und liest den echten Seitenbaum — kein Gerät, keine
 * Extension dieses Projekts trägt dort von Hand etwas ein. Eine neue Seite
 * erscheint in der Sitemap von selbst; dieses Skript prüft dagegen NUR, ob
 * llms.txt und jede einzelne Seite mitgezogen sind.
 */

// @pruefstand modus=aus laufzeit=kurz
// (bei eingeschaltetem Modus ersetzt die Torseite auch /sitemap.xml — das
//  Skript meldet das selbst als „übersprungen" und bewiese dann nichts;
//  deshalb in diesem Zustand gar nicht erst fahren.)

import { execFileSync } from 'node:child_process';

const BASE_URL = (process.env.CASINO_BASE_URL ?? 'https://casino-kunterbunt.ddev.site').replace(/\/$/, '');

let fehler = 0;

function check(ok, text, ...zeilen) {
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

/* ----------------------------------------------------- reine Hilfsfunktionen
 * Bewusst als reine Funktionen (Text hinein, Ergebnis heraus) getrennt vom
 * Netzverkehr — nur so lässt sich weiter unten eine Gegenprobe mit
 * erfundenem, garantiert falschem Text fahren, ohne die laufende Seite
 * anzufassen.
 */

/** Alle <meta name="description" content="…"> eines HTML-Dokuments. */
function findeBeschreibungen(html) {
	const treffer = [];
	const re = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']\s*\/?>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		treffer.push(decodeHtml(m[1]));
	}
	return treffer;
}

/** Alle <script type="application/ld+json">…</script>-Blöcke, geparst. */
function findeJsonLd(html) {
	const bloecke = [];
	const re = /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		bloecke.push(m[1]);
	}
	return bloecke;
}

/** Inhalt des <title>-Elements. */
function findeTitel(html) {
	const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
	return m ? decodeHtml(m[1]).trim() : null;
}

/** Ist ein Titel der Form "X: X" oder "X: X " (Seitentitel = Site-Titel)? */
function titelIstDoppelt(titel) {
	if (!titel || !titel.includes(':')) {
		return false;
	}
	const [links, ...rest] = titel.split(':');
	const rechts = rest.join(':').trim();
	return links.trim() !== '' && links.trim() === rechts;
}

/** Markdown-Verweise "- [Text](URL): …" aus llms.txt. */
function findeLlmsLinks(text) {
	const treffer = [];
	const re = /^-\s*\[[^\]]*\]\(([^)]+)\)/gm;
	let m;
	while ((m = re.exec(text)) !== null) {
		treffer.push(normalisiereUrl(m[1]));
	}
	return treffer;
}

function normalisiereUrl(url) {
	return url.trim().replace(/\/$/, '') || '/';
}

function decodeHtml(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'");
}

/* --------------------------------------------------------------- Gegenprobe
 * Beweist an ERFUNDENEM, garantiert falschem HTML/Text, dass jede der oben
 * stehenden Funktionen einen echten Fehler auch tatsächlich meldet — bevor
 * unten dieselben Funktionen gegen die laufende Seite geprüft werden. Ohne
 * das könnte eine zu lasch geschriebene Prüfung immer "ok" melden, ohne dass
 * es auffiele.
 */

console.log('Gegenprobe (erfundenes, garantiert falsches Material) ---------------\n');

check(findeBeschreibungen('<head><title>x</title></head>').length === 0,
	'findeBeschreibungen(): Seite ganz ohne <meta name="description"> ergibt null Treffer');
check(findeBeschreibungen('<meta name="description" content="Text">').length === 1,
	'findeBeschreibungen(): eine vorhandene <meta name="description"> wird gefunden');
check(findeJsonLd('<head></head>').length === 0,
	'findeJsonLd(): Seite ganz ohne application/ld+json ergibt null Treffer');
check((() => {
	try {
		JSON.parse(findeJsonLd('<script type="application/ld+json">{kaputt</script>')[0]);
		return false;
	} catch {
		return true;
	}
})(), 'findeJsonLd() + JSON.parse(): kaputtes JSON-LD wird als kaputt erkannt, nicht stillschweigend akzeptiert');
check(titelIstDoppelt('Casino Kunterbunt: Casino Kunterbunt') === true,
	'titelIstDoppelt(): "X: X" wird erkannt (das genaue Muster von Befund G-04/A-13)');
check(titelIstDoppelt('Casino Kunterbunt: Beispielseite') === false,
	'titelIstDoppelt(): ein echter Seitentitel gilt nicht fälschlich als doppelt');
check((() => {
	// Erfundene Seiten "/alpha"/"/beta", damit diese Gegenprobe kein
	// wirkliches Gerät nennen muss (G-9).
	const canonical = ['/', '/alpha', '/beta'];
	const llms = findeLlmsLinks('- [Saal](https://x/): a\n- [Alpha](https://x/alpha): b\n');
	return canonical.some((u) => !llms.map((l) => l.replace(/^https?:\/\/[^/]+/, '') || '/').includes(u));
})(), 'findeLlmsLinks(): eine llms.txt, der eine Seite fehlt (hier /beta), wird als unvollständig erkannt — genau Befund G-03');

console.log('');

/* ------------------------------------------------------------- Netzverkehr */

async function holen(pfad) {
	const antwort = await fetch(BASE_URL + pfad, { redirect: 'follow' });
	return { status: antwort.status, text: await antwort.text() };
}

async function main() {
	console.log(`Lebende Prüfung gegen ${BASE_URL} ------------------------------\n`);

	// DER QR-MODUS STEHT ÜBER DIESER PRÜFUNG (Teil D, Phase D2).
	// Ist er AN, ersetzt die Torseite JEDE Frontend-Adresse — auch /sitemap.xml
	// und /llms.txt. Das ist Absicht: ein geschlossenes Haus hat für einen
	// KI-Crawler nichts auszuliefern. Ohne diese Abfrage ginge dieses Skript
	// allein deshalb rot und sähe aus wie ein Rückschritt, obwohl nur ein
	// Schalter anders steht. Dieselbe Bauform wie in verify-account-ui.mjs,
	// verify-gate.mjs und verify-lobby-endpoint.mjs.
	let registryZeile = '';
	try {
		const ausgabe = execFileSync('mysql', ['-e',
			"SELECT entry_value FROM sys_registry WHERE entry_namespace='tx_casinoaccount' AND entry_key='qrMode';"],
		{ encoding: 'utf8' });
		registryZeile = (ausgabe.split('\n')[1] ?? '').trim();
	} catch (fehlerObjekt) {
		check(false, 'der Schalterstand des QR-Modus ist abfragbar', `Fehler: ${fehlerObjekt.message}`);
		druckeErgebnisUndBeende();
	}
	console.log(`(gemessener Schalterstand des QR-Modus: ${registryZeile === 'b:1;' ? 'AN' : 'AUS'}${registryZeile === '' ? ' — noch nie geschaltet' : ''})\n`);
	if (registryZeile === 'b:1;') {
		console.log('Der QR-Modus ist AN — die Torseite ersetzt jede Frontend-Adresse.');
		console.log('Die lebenden GEO-Prüfungen sind in diesem Zustand gegenstandslos und');
		console.log('werden übersprungen. Für den Nachweis den Schalter auf AUS stellen');
		console.log('(Auslieferungszustand) und dieses Skript erneut laufen lassen.');
		console.log('\nERGEBNIS: übersprungen — in diesem Schalterstand wird NICHTS nachgewiesen.');
		process.exit(0);
	}

	let sitemapIndex;
	try {
		sitemapIndex = await holen('/sitemap.xml');
	} catch (e) {
		check(false, `/sitemap.xml erreichbar`, `Netzfehler: ${e.message}`,
			`Läuft die DDEV-Instanz? "ddev status", ggf. "ddev start".`);
		druckeErgebnisUndBeende();
		return;
	}
	check(sitemapIndex.status === 200, '/sitemap.xml antwortet mit 200', `Status: ${sitemapIndex.status}`);

	const nestedMatch = /<loc>([^<]+)<\/loc>/.exec(sitemapIndex.text);
	check(nestedMatch !== null, '/sitemap.xml nennt eine eingebettete Seiten-Sitemap');
	if (!nestedMatch) {
		druckeErgebnisUndBeende();
		return;
	}
	const nestedUrl = decodeHtml(nestedMatch[1]);
	const nestedPath = nestedUrl.replace(BASE_URL, '');
	const seitenSitemap = await holen(nestedPath);
	check(seitenSitemap.status === 200, 'die eingebettete Seiten-Sitemap antwortet mit 200',
		`Status: ${seitenSitemap.status}`);

	const canonicalUrls = [...seitenSitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)]
		.map((m) => decodeHtml(m[1]));
	check(canonicalUrls.length >= 1, 'die Seiten-Sitemap führt mindestens eine Seite',
		`Gefunden: ${canonicalUrls.length}`);

	const canonicalPaths = canonicalUrls.map((u) => normalisiereUrl(u.replace(/^https?:\/\/[^/]+/, '')));

	// -------------------------------------------------------------- G-03
	const llms = await holen('/llms.txt');
	check(llms.status === 200, '/llms.txt antwortet mit 200', `Status: ${llms.status}`);
	const llmsLinks = findeLlmsLinks(llms.text)
		.map((u) => normalisiereUrl(u.replace(/^https?:\/\/[^/]+/, '')));
	const fehlendeSeiten = canonicalPaths.filter((p) => !llmsLinks.includes(p));
	check(fehlendeSeiten.length === 0,
		`llms.txt nennt alle ${canonicalPaths.length} Seiten der Sitemap (Befund G-03)`,
		...fehlendeSeiten.map((p) => `fehlt in llms.txt: ${p}`));

	// -------------------------------------------------------- G-01/G-02/G-04
	for (const url of canonicalUrls) {
		const pfad = url.replace(BASE_URL, '') || '/';
		let seite;
		try {
			seite = await holen(pfad);
		} catch (e) {
			check(false, `${pfad} erreichbar`, `Netzfehler: ${e.message}`);
			continue;
		}
		check(seite.status === 200, `${pfad} antwortet mit 200`, `Status: ${seite.status}`);

		const beschreibungen = findeBeschreibungen(seite.text);
		check(beschreibungen.length === 1,
			`${pfad}: genau eine <meta name="description">`,
			`Gefunden: ${beschreibungen.length}`);
		if (beschreibungen.length >= 1) {
			const laenge = beschreibungen[0].length;
			check(laenge >= 20 && laenge <= 300,
				`${pfad}: die Beschreibung hat eine plausible Länge (20–300 Zeichen)`,
				`Länge: ${laenge} — "${beschreibungen[0]}"`);
		}

		const jsonLdBloecke = findeJsonLd(seite.text);
		check(jsonLdBloecke.length >= 1,
			`${pfad}: mindestens ein application/ld+json (Befund G-01)`,
			`Gefunden: ${jsonLdBloecke.length}`);
		jsonLdBloecke.forEach((block, i) => {
			try {
				const parsed = JSON.parse(block);
				check(typeof parsed === 'object' && parsed !== null && '@type' in parsed,
					`${pfad}: JSON-LD Block ${i + 1} ist ein Objekt mit @type`);
			} catch (e) {
				check(false, `${pfad}: JSON-LD Block ${i + 1} ist gültiges JSON`, e.message);
			}
		});

		const titel = findeTitel(seite.text);
		check(titel !== null && titel.trim() !== '', `${pfad}: hat einen <title>`);
		check(!titelIstDoppelt(titel ?? ''), `${pfad}: Titel wiederholt sich nicht (Befund G-04)`,
			`Titel: "${titel}"`);
	}

	druckeErgebnisUndBeende();
}

function druckeErgebnisUndBeende() {
	console.log(fehler === 0
		? '\nERGEBNIS: alle Prüfungen bestanden. Jede Seite der Sitemap liefert eine'
		+ '\nBeschreibung und strukturierte Daten aus, llms.txt ist vollständig, kein'
		+ '\nSeitentitel wiederholt sich.'
		: `\nERGEBNIS: ${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`);
	process.exit(fehler === 0 ? 0 : 1);
}

await main();
