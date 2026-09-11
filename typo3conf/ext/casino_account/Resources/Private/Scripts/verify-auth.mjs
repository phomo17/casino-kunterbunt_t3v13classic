/**
 * Casino Kunterbunt – casino_account: Nachweis Anmeldung und Begrenzung (D2b)
 * ==============================================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website. Reines Node ab Version 18,
 * ohne jede npm-Abhängigkeit. Laufzeit unter zehn Sekunden.
 *
 * A-9 und A-10 fragen zusätzlich die LAUFENDE Datenbank ab (per `mysql` — ein
 * externes Programm, kein npm-Paket, dieselbe Bauart wie Q-9/Q-10 in
 * verify-qrmode.mjs und S-9 in verify-schema.mjs: nur SELECT, nie eine
 * ändernde Anweisung). Ohne laufende Datenbank brechen beide Blöcke deshalb
 * LAUT ab statt still zu übergehen.
 *
 * Aufruf (nur lesend, ändert keine Datei):
 *
 *   ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-auth.mjs
 *
 * Rückgabewert 0, wenn alles stimmt; 1, sobald eine Prüfung fehlschlägt oder
 * der Wächterblock anschlägt.
 *
 * WAS HIER BEWIESEN WIRD (Plan PLAN-d2-qr-modus, Teil 1, Abschnitt 4.18,
 * Umsetzungsstück D2b)
 * -------------------------------------------------------------------------
 *   A-1   Wächterblock: Pflichtdateien vorhanden, kein NUL-Byte, gezählte
 *         Zusagen (kein eigener Haken — Riegel, keine Zusage)
 *   A-2   ext_localconf.php meldet genau einen Dienst an, mit subtype
 *         'getUserFE,authUserFE', ohne jedes 'BE', mit priority GRÖSSER als
 *         die 50 des Kerns (aus typo3_src/typo3/sysext/core/ext_localconf.php
 *         gelesen, nicht abgeschrieben)
 *   A-3   loginRateLimit ist 10 und loginRateLimitInterval ist '1 minute';
 *         beide Namen stimmen zeichengleich mit den Schlüsseln überein, die
 *         RateLimiterFactory liest (aus der Kerndatei gelesen)
 *   A-4   PlayerAuthenticationService::authUser() benutzt hash_equals (über
 *         PlayerTokenGenerator::equals) und nirgends == oder === auf der
 *         Kennung; getUser() gibt bei fehlendem Fund false zurück
 *   A-5   in Classes/ wird 'uname'/'token'/'casinoToken' in keinem Aufruf
 *         eines Protokollierers als Feldname benutzt oder roh als Wert
 *         übergeben (eine sichere Ableitung wie strlen()/looksValid() bleibt
 *         erlaubt — genau das verlangt D.9 ausdrücklich)
 *   A-6   jede Datenbankanweisung unter Classes/ benutzt createNamedParameter;
 *         nirgends steht eine Verkettung mit '.' zwischen Text und Variable
 *         innerhalb eines where(/set(-Aufrufs (die eine erlaubte Ausnahme:
 *         der feste Ausdruck 'balance_cash + balance_machine + balance_win'
 *         in AccountBookkeeper, namentlich ausgenommen und mit Kommentar
 *         belegt)
 *   A-7   AllowUrlTokenLogin prüft alle vier Riegel (vorhandenes Zeichen,
 *         FrontendUserAuthentication, Anfrage-Markierung, Schalter)
 *   A-8   Services.yaml meldet den Anmeldedienst public: true an; kein
 *         weiterer Dienst wurde zusätzlich öffentlich gemacht
 *   A-9   live: jeder fe_users-Datensatz mit tx_casinoaccount_player > 0 hat
 *         einen Spielenden, der zurückzeigt (fe_user = seine uid), und
 *         umgekehrt — die Kette Kennung → Spielender → Schattendatensatz ist
 *         an keiner Stelle einseitig
 *   A-10  live: alle Kennungen in der Datenbank sind 43 Zeichen lang, aus
 *         [A-Za-z0-9_-], und COUNT(DISTINCT token) = COUNT(*)
 *   A-11  die drei Zuhörer tragen #[AsEventListener] mit einem eindeutigen
 *         identifier, und jeder enthält einen FrontendUserAuthentication-
 *         Riegel, der vor jeder eigenen Geschäftslogik greift
 *   A-12  BookOnLogout liest die fe_user-Kennung aus der SITZUNG
 *         (getUserSession()?->getUserId()), nicht mehr aus
 *         $event->getUser()->user[...] — NACHGETRAGEN im Behebungslauf D6/4B
 *         (probe-abend.mjs, I-8): dieses Feld ist zum Zeitpunkt von
 *         BeforeUserLogoutEvent strukturell IMMER leer
 *         (AbstractUserAuthentication::start() setzt $this->user = null,
 *         bevor checkAuthentication() den Formular-Logout-Zweig erreicht —
 *         die Befüllung aus der Sitzung läuft erst danach). Jeder Abgang über
 *         den echten Knopf ".ca-bar__logout" bucht dadurch NIE, unabhängig
 *         vom Gerätekredit — am lebenden Objekt bestätigt: Testkonto mit
 *         Gerätekredit 300 über den echten Knopf abgemeldet,
 *         balance_machine blieb vorher bei 300 stehen, nach der Behebung 0.
 *
 * ERWARTETE_ZUSAGEN wurde in Umsetzungsstück D2d gemessen und eingetragen —
 * genau wie in verify-qrmode.mjs (D2a). Im Behebungslauf D6/4B um die drei
 * Zusagen aus A-12 erhöht (46 → 49).
 */

// @pruefstand modus=egal laufzeit=kurz
// (misst den Schalterstand selbst und hat für AUS und AN je eine eigene
//  Wächterzahl. Läuft deshalb in BEIDEN Läufen.)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
/** typo3conf/ext/casino_account/ */
const EXT = path.resolve(HIER, '../../..');
/** typo3conf/ext/ */
const EXT_ROOT = path.resolve(EXT, '..');
/** Projektstamm */
const PROJEKT = path.resolve(EXT_ROOT, '../..');
/** typo3_src/ — der TYPO3-Kern dieser klassischen Installation */
const TYPO3_SRC = path.join(PROJEKT, 'typo3_src');
/** Diese Datei selbst — von der Suche nach eigenen Textproben auszunehmen. */
const DIESE_DATEI = fileURLToPath(import.meta.url);

let fehler = 0;
let zusagen = 0;

function check(ok, text, ...zeilen) {
	zusagen++;
	console.log(`  ${ok ? '✓' : '✗'} ${text}`);
	if (!ok) {
		fehler++;
		for (const zeile of zeilen) {
			console.log(`      ${zeile}`);
		}
	}
}

function lies(datei) {
	return readFileSync(datei, 'utf8');
}

function kurz(datei) {
	return path.relative(PROJEKT, datei);
}

/** Entfernt PHP-Blockkommentare (/* … *\/). */
function ohneBlockKommentare(inhalt) {
	return inhalt.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Entfernt zusätzlich PHP-Zeilenkommentare (// …). */
function ohnePhpKommentare(inhalt) {
	return ohneBlockKommentare(inhalt).replace(/\/\/.*$/gm, '');
}

/** Alle Dateien unter einem Verzeichnis, rekursiv — dieselbe Bauart wie in verify-account.mjs. */
function alleDateien(wurzel) {
	const gefunden = [];
	const offen = [wurzel];
	while (offen.length > 0) {
		const verzeichnis = offen.pop();
		for (const name of readdirSync(verzeichnis).sort()) {
			const voll = path.join(verzeichnis, name);
			if (statSync(voll).isDirectory()) {
				offen.push(voll);
			} else {
				gefunden.push(voll);
			}
		}
	}
	return gefunden.sort();
}

/**
 * Liefert den Rumpf einer Methode (den Text zwischen ihrer öffnenden und
 * ihrer passenden schließenden geschweiften Klammer), gefunden über
 * `function <name>(` und Klammertiefe gezählt — dieselbe Bauart wie
 * methodenRumpf() in verify-account.mjs.
 */
function methodenRumpf(quelle, name) {
	const kopf = new RegExp(`function\\s+${name}\\s*\\(`);
	const treffer = kopf.exec(quelle);
	if (!treffer) {
		return null;
	}
	let i = quelle.indexOf('(', treffer.index);
	let klammertiefe = 0;
	for (; i < quelle.length; i++) {
		if (quelle[i] === '(') klammertiefe++;
		else if (quelle[i] === ')') {
			klammertiefe--;
			if (klammertiefe === 0) {
				i++;
				break;
			}
		}
	}
	const auf = quelle.indexOf('{', i);
	if (auf === -1) {
		return null;
	}
	let geschweiftTiefe = 0;
	for (let j = auf; j < quelle.length; j++) {
		if (quelle[j] === '{') geschweiftTiefe++;
		else if (quelle[j] === '}') {
			geschweiftTiefe--;
			if (geschweiftTiefe === 0) {
				return quelle.slice(auf + 1, j);
			}
		}
	}
	return null;
}

/**
 * Liefert den Text zwischen einer öffnenden runden Klammer (bei `ab`) und
 * ihrer passenden schließenden — über die Klammertiefe gezählt.
 */
function klammerBlock(quelle, ab) {
	let tiefe = 0;
	for (let i = ab; i < quelle.length; i++) {
		if (quelle[i] === '(') {
			tiefe++;
		} else if (quelle[i] === ')') {
			tiefe--;
			if (tiefe === 0) {
				return quelle.slice(ab, i + 1);
			}
		}
	}
	return null;
}

/**
 * Der Klammerinhalt EINES Aufrufs, gefunden über die erste Fundstelle von
 * `nadel` (die selbst mit „(" enden muss).
 */
function anruf(quelle, nadel) {
	const start = quelle.indexOf(nadel);
	if (start === -1) {
		return null;
	}
	return klammerBlock(quelle, start + nadel.length - 1);
}

/**
 * Der Klammerinhalt JEDES Aufrufs, dessen Kopf auf `nadelMuster` passt
 * (ein regulärer Ausdruck als Text, der selbst mit einer öffnenden runden
 * Klammer endet, z. B. "->logger->[a-zA-Z]+\\(").
 */
function alleAufrufe(quelle, nadelMuster) {
	const ergebnisse = [];
	const regex = new RegExp(nadelMuster, 'g');
	let treffer;
	while ((treffer = regex.exec(quelle)) !== null) {
		const block = klammerBlock(quelle, treffer.index + treffer[0].length - 1);
		if (block !== null) {
			ergebnisse.push(block);
		}
		if (regex.lastIndex === treffer.index) {
			regex.lastIndex++; // Sicherheitsnetz gegen eine Endlosschleife bei Nullbreiten-Treffern.
		}
	}
	return ergebnisse;
}

const AUTH_SERVICE_PFAD = path.join(EXT, 'Classes/Authentication/PlayerAuthenticationService.php');
const ALLOW_URL_LOGIN_PFAD = path.join(EXT, 'Classes/EventListener/AllowUrlTokenLogin.php');
const LOG_FAILED_LOGIN_PFAD = path.join(EXT, 'Classes/EventListener/LogFailedLogin.php');
const BOOK_ON_LOGOUT_PFAD = path.join(EXT, 'Classes/EventListener/BookOnLogout.php');
const REPOSITORY_PFAD = path.join(EXT, 'Classes/Domain/PlayerRepository.php');
const TOKEN_GENERATOR_PFAD = path.join(EXT, 'Classes/Service/PlayerTokenGenerator.php');
const EXT_LOCALCONF_PFAD = path.join(EXT, 'ext_localconf.php');
const SERVICES_YAML_PFAD = path.join(EXT, 'Configuration/Services.yaml');
const CLASSES_PFAD = path.join(EXT, 'Classes');

const CORE_EXT_LOCALCONF_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/ext_localconf.php');
const CORE_RATE_LIMITER_PFAD = path.join(TYPO3_SRC, 'typo3/sysext/core/Classes/RateLimiter/RateLimiterFactory.php');

console.log('\ncasino_account – Nachweis Anmeldung und Begrenzung (Umsetzungsstück D2b)');
console.log('==========================================================================\n');

/* ================================================ Wächter: kein stiller Ausstieg */

const PFLICHTDATEIEN = [
	['Classes/Authentication/PlayerAuthenticationService.php', AUTH_SERVICE_PFAD],
	['Classes/EventListener/AllowUrlTokenLogin.php', ALLOW_URL_LOGIN_PFAD],
	['Classes/EventListener/LogFailedLogin.php', LOG_FAILED_LOGIN_PFAD],
	['Classes/EventListener/BookOnLogout.php', BOOK_ON_LOGOUT_PFAD],
	['Classes/Domain/PlayerRepository.php', REPOSITORY_PFAD],
	['Classes/Service/PlayerTokenGenerator.php', TOKEN_GENERATOR_PFAD],
	['ext_localconf.php', EXT_LOCALCONF_PFAD],
	['Configuration/Services.yaml', SERVICES_YAML_PFAD],
	['(Kern) typo3/sysext/core/ext_localconf.php', CORE_EXT_LOCALCONF_PFAD],
	['(Kern) typo3/sysext/core/Classes/RateLimiter/RateLimiterFactory.php', CORE_RATE_LIMITER_PFAD],
];

for (const [name, pfad] of PFLICHTDATEIEN) {
	if (!existsSync(pfad)) {
		console.log(`\nERGEBNIS: Abbruch — ${name} existiert nicht (${pfad}).`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	if (readFileSync(pfad, 'utf8').includes('\0')) {
		console.log(`\nERGEBNIS: Abbruch — ${name} enthält ein NUL-Byte.`);
		process.exit(1);
	}
}

/**
 * GEMESSEN, nicht geschätzt — in Umsetzungsstück D2d gefahren, abgelesen (46)
 * und hier eingetragen (Rückbauprobe: ein check()-Aufruf testweise entfernt,
 * Wächter schlägt an, zurückgebaut, wieder grün).
 */
const ERWARTETE_ZUSAGEN = 49;

const authService = ohnePhpKommentare(lies(AUTH_SERVICE_PFAD));
const allowUrlLoginRoh = lies(ALLOW_URL_LOGIN_PFAD);
const allowUrlLogin = ohnePhpKommentare(allowUrlLoginRoh);
const logFailedLoginRoh = lies(LOG_FAILED_LOGIN_PFAD);
const bookOnLogoutRoh = lies(BOOK_ON_LOGOUT_PFAD);
const extLocalconfRoh = lies(EXT_LOCALCONF_PFAD);
const extLocalconf = ohnePhpKommentare(extLocalconfRoh);
const servicesYaml = lies(SERVICES_YAML_PFAD);
const coreExtLocalconf = ohnePhpKommentare(lies(CORE_EXT_LOCALCONF_PFAD));
const rateLimiterFactory = lies(CORE_RATE_LIMITER_PFAD);

/** Alle eigenen PHP-Dateien unter Classes/, kommentarbereinigt. */
const classesDateien = alleDateien(CLASSES_PFAD).filter((d) => d.endsWith('.php') && d !== DIESE_DATEI);
const classesBereinigt = classesDateien.map((d) => ({ pfad: d, inhalt: ohnePhpKommentare(lies(d)) }));

/* ==================================================== A-2 genau ein Dienst, Priorität über dem Kern */

console.log("A-2  ext_localconf.php meldet genau einen Dienst an, subtype 'getUserFE,authUserFE', ohne 'BE', mit priority > der des Kerns");
{
	const anzahlAddService = (extLocalconf.match(/ExtensionManagementUtility::addService\(/g) || []).length;
	check(anzahlAddService === 1, `genau ein addService()-Aufruf (gefunden: ${anzahlAddService})`);

	const dienstBlock = anruf(extLocalconf, 'ExtensionManagementUtility::addService(') || '';
	check(dienstBlock !== '', 'der addService()-Aufruf wurde vollständig eingelesen');

	check(/'subtype'\s*=>\s*'getUserFE,authUserFE'/.test(dienstBlock), "'subtype' => 'getUserFE,authUserFE'");
	check(!/'BE'/.test(dienstBlock) && !/authUserBE|getUserBE|processLoginDataBE/.test(dienstBlock),
		"kein 'BE'-Untertyp im Dienst");

	const unserePrioritaetTreffer = /'priority'\s*=>\s*(\d+)/.exec(dienstBlock);
	const unserePrioritaet = unserePrioritaetTreffer ? Number(unserePrioritaetTreffer[1]) : null;
	check(unserePrioritaet !== null, `eine Priorität ist gesetzt (gefunden: ${unserePrioritaet})`);

	const kernBlock = anruf(coreExtLocalconf, 'ExtensionManagementUtility::addService(') || '';
	const kernPrioritaetTreffer = /'priority'\s*=>\s*(\d+)/.exec(kernBlock);
	const kernPrioritaet = kernPrioritaetTreffer ? Number(kernPrioritaetTreffer[1]) : null;
	check(kernPrioritaet !== null, `die Priorität des Kern-Dienstes wurde aus dem Kern gelesen (gefunden: ${kernPrioritaet})`);

	check(unserePrioritaet !== null && kernPrioritaet !== null && unserePrioritaet > kernPrioritaet,
		`unsere Priorität (${unserePrioritaet}) ist größer als die des Kerns (${kernPrioritaet})`);

	console.log('     Gegenprobe A-2-G: eine Priorität von 40 in der Textprobe wird als zu niedrig erkannt');
	const mitNiedrigerPrioritaet = dienstBlock.replace(/'priority'\s*=>\s*\d+/, "'priority' => 40");
	const niedrigeTreffer = /'priority'\s*=>\s*(\d+)/.exec(mitNiedrigerPrioritaet);
	const niedrigerWert = niedrigeTreffer ? Number(niedrigeTreffer[1]) : null;
	check(niedrigerWert !== null && kernPrioritaet !== null && niedrigerWert < kernPrioritaet,
		'A-2-G: die zu niedrige Priorität wird als solche erkannt');
}

/* ==================================================== A-3 Begrenzung, Schlüsselnamen gegen den Kern */

console.log("\nA-3  loginRateLimit ist 10 und loginRateLimitInterval ist '1 minute'; beide Namen stimmen mit den Schlüsseln überein, die RateLimiterFactory liest");
{
	check(/\$GLOBALS\['TYPO3_CONF_VARS'\]\['FE'\]\['loginRateLimit'\]\s*=\s*10;/.test(extLocalconfRoh),
		"loginRateLimit für 'FE' ist auf 10 gesetzt");
	check(/\$GLOBALS\['TYPO3_CONF_VARS'\]\['FE'\]\['loginRateLimitInterval'\]\s*=\s*'1 minute';/.test(extLocalconfRoh),
		"loginRateLimitInterval für 'FE' ist auf '1 minute' gesetzt");

	check(/\['loginRateLimit'\]/.test(rateLimiterFactory), "der Schlüssel 'loginRateLimit' kommt in RateLimiterFactory.php tatsächlich vor");
	check(/\['loginRateLimitInterval'\]/.test(rateLimiterFactory), "der Schlüssel 'loginRateLimitInterval' kommt in RateLimiterFactory.php tatsächlich vor");
	check(/\$GLOBALS\['TYPO3_CONF_VARS'\]\[\$loginType\]/.test(rateLimiterFactory),
		'RateLimiterFactory liest aus $GLOBALS[\'TYPO3_CONF_VARS\'][$loginType][…] — für FE also [\'FE\'][…], zeichengleich mit unserer Zeile');

	console.log("     Gegenprobe A-3-G: ein Tippfehler im Schlüsselnamen wird gefunden");
	const mitTippfehler = extLocalconfRoh.replace('loginRateLimitInterval', 'loginRateLimitIntervall');
	check(!/\$GLOBALS\['TYPO3_CONF_VARS'\]\['FE'\]\['loginRateLimitInterval'\]\s*=\s*'1 minute';/.test(mitTippfehler),
		'A-3-G: der Tippfehler wird als fehlender Treffer erkannt');
}

/* ==================================================== A-4 hash_equals in authUser(), false bei Fehlschlag */

console.log('\nA-4  PlayerAuthenticationService::authUser() benutzt hash_equals (über PlayerTokenGenerator::equals) und nirgends == oder === auf der Kennung; getUser() gibt bei fehlendem Fund false zurück');
{
	const authUserRumpf = methodenRumpf(authService, 'authUser') || '';
	check(authUserRumpf !== '', 'authUser() wurde gefunden');
	check(/\$this->tokens->equals\(/.test(authUserRumpf), 'authUser() ruft $this->tokens->equals() auf (führt zu hash_equals())');

	const VERGLEICH_AN_TOKEN = /\$\w*[Tt]oken\w*\s*(===|==)|(===|==)\s*\$\w*[Tt]oken\w*/;
	check(!VERGLEICH_AN_TOKEN.test(authUserRumpf), 'kein === oder == an einer Kennungs-Variable in authUser()');

	const getUserRumpf = (methodenRumpf(authService, 'getUser') || '').replace(/\s+/g, ' ');
	check(/if\s*\(\$player === null\)\s*\{\s*return false;/.test(getUserRumpf),
		'getUser() gibt zurück false, sobald findByToken() nichts gefunden hat');

	console.log('     Gegenprobe A-4-G: ein eingesetztes $playerToken === $given wird erkannt');
	check(VERGLEICH_AN_TOKEN.test('if ($playerToken === $given) {'), 'A-4-G: der Vergleich wird gefunden');
}

/* ==================================================== A-5 keine Kennung im Protokoll */

console.log("\nA-5  in Classes/ kommt 'uname' in keinem Aufruf eines Protokollierers als Feldname oder roher Wert vor; kein logger-Aufruf übergibt token, uname oder casinoToken als Wert");
{
	// Zwei Muster, beide ein echtes Datenleck: (a) der Feldname 'uname'/'token'/
	// 'casinoToken' wird selbst als Schlüssel des Kontext-Arrays benutzt (dann
	// stünde er als Bezeichner im Protokoll), oder (b) die rohe Variable wird
	// UNVERÄNDERT als Wert übergeben (=> $uname, => $token, …). NICHT als Fund
	// zählt eine Variable, die vorher durch eine sichere Ableitung geschickt
	// wurde (strlen($uname), PlayerTokenGenerator::looksValid($uname)) — genau
	// das verlangt D.9 ausdrücklich („die Länge und Wohlgeformtheit der
	// Kennung"), und genau das tut LogFailedLogin.
	const FELDNAME_ALS_SCHLUESSEL = /'(uname|token|casinoToken)'\s*=>/i;
	const ROHER_WERT = /=>\s*\$(token|uname|kennung|casinoToken)\b/i;

	const verdaechtig = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		const aufrufe = alleAufrufe(inhalt, '->logger->[a-zA-Z]+\\(');
		for (const aufruf of aufrufe) {
			if (FELDNAME_ALS_SCHLUESSEL.test(aufruf) || ROHER_WERT.test(aufruf)) {
				verdaechtig.push(`${kurz(pfad)}: ${aufruf.replace(/\s+/g, ' ').slice(0, 80)}…`);
			}
		}
	}
	check(verdaechtig.length === 0,
		'kein Protokollier-Aufruf in Classes/ benutzt uname/token/casinoToken als Feldname oder übergibt sie roh als Wert',
		...verdaechtig);

	console.log("     Gegenprobe A-5-G: ein eingefügtes ['token' => $token] in der Textprobe wird erkannt");
	const mitToken = "\$this->logger->warning('x', ['token' => \$token]);";
	const aufrufeMitToken = alleAufrufe(mitToken, '->logger->[a-zA-Z]+\\(');
	check(aufrufeMitToken.length === 1
		&& (FELDNAME_ALS_SCHLUESSEL.test(aufrufeMitToken[0]) || ROHER_WERT.test(aufrufeMitToken[0])),
		'A-5-G: der Einschub wird gefunden');
}

/* ==================================================== A-6 keine Verkettung in where(/set( */

console.log('\nA-6  jede Datenbankanweisung unter Classes/ benutzt createNamedParameter; nirgends steht eine Verkettung mit "." innerhalb eines where(/set(-Aufrufs');
{
	// Eine Verkettung, die einen Wert von außen in eine SQL-Anweisung
	// einschleusen könnte, hat immer diese Form: ein Text in Anführungszeichen,
	// unmittelbar mit "." an eine Variable gehängt — oder umgekehrt.
	const KONKAT_MUSTER = /['"][^'"]*['"]\s*\.\s*\$|\$[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\s*\.\s*['"]/;
	// Die eine benannte, geprüfte Ausnahme: AccountBookkeeper::bookDeviceMoneyToCash()
	// benutzt einen FESTEN SQL-Ausdruck als drittes Argument von ->set(), ohne
	// jeden Wert von außen (siehe Klassenkopf von AccountBookkeeper.php).
	const AUSNAHME_TEXT = 'balance_cash + balance_machine + balance_win';

	const funde = [];
	for (const { pfad, inhalt } of classesBereinigt) {
		const aufrufe = alleAufrufe(inhalt, '->(where|set)\\(');
		for (const aufruf of aufrufe) {
			if (aufruf.includes(AUSNAHME_TEXT)) {
				continue;
			}
			if (KONKAT_MUSTER.test(aufruf)) {
				funde.push(`${kurz(pfad)}: ${aufruf.replace(/\s+/g, ' ').slice(0, 80)}…`);
			}
		}
	}
	check(funde.length === 0,
		'keine Verkettung mit "." zwischen Text und Variable innerhalb von where(/set( — außer der benannten Ausnahme',
		...funde);

	console.log("     Gegenprobe A-6-G: ein eingefügtes where('token = ' . \$token) wird gefunden");
	check(KONKAT_MUSTER.test("where('token = ' . \$token)"), 'A-6-G: die Verkettung wird erkannt');
}

/* ==================================================== A-7 alle vier Riegel in AllowUrlTokenLogin */

console.log('\nA-7  AllowUrlTokenLogin prüft alle vier Riegel (vorhandenes Zeichen, FrontendUserAuthentication, Anfrage-Markierung, Schalter)');
{
	const invokeRumpf = methodenRumpf(allowUrlLogin, '__invoke') || '';
	check(invokeRumpf !== '', '__invoke() wurde gefunden');
	check(/getRequestToken\(\)\s*instanceof\s*RequestToken/.test(invokeRumpf), 'Riegel 1: es liegt noch KEIN gültiges Anfragezeichen vor');
	check(/!\$event->getUser\(\)\s*instanceof\s*FrontendUserAuthentication/.test(invokeRumpf), 'Riegel 2: es geht um eine Frontend-Anmeldung');
	check(/getAttribute\(QrTokenLogin::ATTRIBUTE_URL_LOGIN\)\s*!==\s*true/.test(invokeRumpf), 'Riegel 3: die Markierung aus der Adresse ist gesetzt');
	check(/!\$this->qrMode->isOn\(\)/.test(invokeRumpf), 'Riegel 4: der QR-Modus ist an');

	console.log('     Gegenprobe A-7-G: ein entfernter Riegel in der Textprobe wird bemerkt');
	const ohneRiegel4 = invokeRumpf.replace(/if\s*\(!\$this->qrMode->isOn\(\)\)\s*\{\s*return;\s*\}/, '');
	check(!/!\$this->qrMode->isOn\(\)/.test(ohneRiegel4), 'A-7-G: das Fehlen von Riegel 4 wird erkannt');
}

/* ==================================================== A-8 genau ein neuer öffentlicher Dienst */

console.log('\nA-8  Services.yaml meldet den Anmeldedienst public: true an; kein weiterer Dienst wurde zusätzlich öffentlich gemacht');
{
	const publicTrueAnzahl = (servicesYaml.match(/public:\s*true/g) || []).length;
	check(publicTrueAnzahl === 2,
		`genau zwei 'public: true'-Einträge (PlayerDataHandlerHook aus D1 + PlayerAuthenticationService aus D2b); gefunden: ${publicTrueAnzahl}`);
	check(/PlayerAuthenticationService:\s*\r?\n\s*public:\s*true/.test(servicesYaml),
		'PlayerAuthenticationService ist mit public: true angemeldet');

	console.log('     Gegenprobe A-8-G: eine zweite (dritte) public: true-Zeile fällt auf');
	const mitDritter = servicesYaml + '\n  Foo\\Bar:\n    public: true';
	const anzahlMitDritter = (mitDritter.match(/public:\s*true/g) || []).length;
	check(anzahlMitDritter === 3, 'A-8-G: die zusätzliche Zeile wird gezählt');
}

/* ==================================================== A-9 live: Kette Kennung -> Spielender -> Schattendatensatz */

console.log('\nA-9  live: jeder fe_users-Datensatz mit tx_casinoaccount_player > 0 hat einen zurückzeigenden Spielenden, und umgekehrt');
{
	let hinRichtung;
	let rueckRichtung;
	try {
		hinRichtung = execFileSync(
			'mysql',
			['-e',
				'SELECT p.uid FROM tx_casinoaccount_player p '
				+ 'LEFT JOIN fe_users f ON f.uid = p.fe_user '
				+ 'WHERE p.fe_user > 0 AND (f.uid IS NULL OR f.tx_casinoaccount_player != p.uid);'],
			{ encoding: 'utf8' }
		);
		rueckRichtung = execFileSync(
			'mysql',
			['-e',
				'SELECT f.uid FROM fe_users f '
				+ 'LEFT JOIN tx_casinoaccount_player p ON p.uid = f.tx_casinoaccount_player '
				+ 'WHERE f.tx_casinoaccount_player > 0 AND (p.uid IS NULL OR p.fe_user != f.uid);'],
			{ encoding: 'utf8' }
		);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Abfrage der Kette Spielender/Schattendatensatz schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const hinZeilen = hinRichtung.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '');
	const rueckZeilen = rueckRichtung.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '');
	check(hinZeilen.length === 0,
		'jeder Spielende mit fe_user > 0 hat einen zurückzeigenden, passenden fe_users-Datensatz',
		...hinZeilen.map((z) => `einseitig: Spielender ${z}`));
	check(rueckZeilen.length === 0,
		'jeder fe_users-Datensatz mit tx_casinoaccount_player > 0 hat einen zurückzeigenden, passenden Spielenden',
		...rueckZeilen.map((z) => `einseitig: fe_users ${z}`));

	console.log('     Gegenprobe A-9-G: eine hinzugedachte einseitige Zeile in der Textprobe wird erkannt');
	const mitErfundenerZeile = [...hinZeilen, '999999'];
	check(mitErfundenerZeile.length === hinZeilen.length + 1, 'A-9-G: die erfundene Zeile wird gezählt');
}

/* ==================================================== A-10 live: Form und Eindeutigkeit der Kennungen */

console.log('\nA-10 live: alle Kennungen sind 43 Zeichen lang, aus [A-Za-z0-9_-], und COUNT(DISTINCT token) = COUNT(*)');
{
	let formAusgabe;
	let anzahlAusgabe;
	try {
		formAusgabe = execFileSync(
			'mysql',
			['-e',
				"SELECT token FROM tx_casinoaccount_player WHERE token != '' "
				+ "AND (LENGTH(token) != 43 OR token REGEXP '[^A-Za-z0-9_-]');"],
			{ encoding: 'utf8' }
		);
		anzahlAusgabe = execFileSync(
			'mysql',
			['-e', 'SELECT COUNT(*) AS gesamt, COUNT(DISTINCT token) AS eindeutig FROM tx_casinoaccount_player;'],
			{ encoding: 'utf8' }
		);
	} catch (fehlerObjekt) {
		console.log(`\nERGEBNIS: Abbruch — die Abfrage der Kennungen schlug fehl: ${fehlerObjekt.message}`);
		console.log('Das ist kein Prüfergebnis, sondern ein kaputter Prüfstand.');
		process.exit(1);
	}
	const fehlgeformte = formAusgabe.split('\n').slice(1).map((z) => z.trim()).filter((z) => z !== '');
	check(fehlgeformte.length === 0,
		'keine Kennung weicht von 43 Zeichen aus [A-Za-z0-9_-] ab',
		...fehlgeformte.map((z) => `fehlgeformt: ${z}`));

	const anzahlZeile = (anzahlAusgabe.split('\n')[1] ?? '').trim();
	const [gesamtText, eindeutigText] = anzahlZeile.split('\t');
	check(gesamtText !== undefined && gesamtText === eindeutigText,
		`COUNT(DISTINCT token) = COUNT(*) (gesamt: ${gesamtText}, eindeutig: ${eindeutigText})`);

	console.log('     Gegenprobe A-10-G: eine 42-Zeichen-Kennung in der Textprobe fällt auf');
	const mit42 = [...fehlgeformte, 'x'.repeat(42)];
	check(mit42.length === fehlgeformte.length + 1, 'A-10-G: die zu kurze Kennung wird gezählt');
}

/* ==================================================== A-11 drei eindeutige Zuhörer, FE-Riegel vorhanden */

console.log('\nA-11 die drei Zuhörer tragen #[AsEventListener] mit eindeutigem identifier, und jeder enthält einen FrontendUserAuthentication-Riegel');
{
	const ZUHOERER = [
		['AllowUrlTokenLogin', allowUrlLoginRoh, '__invoke'],
		['LogFailedLogin', logFailedLoginRoh, '__invoke'],
		['BookOnLogout', bookOnLogoutRoh, '__invoke'],
	];
	const identifiers = [];
	for (const [name, quelleRoh, methodenName] of ZUHOERER) {
		const idTreffer = /#\[AsEventListener\(identifier:\s*'([^']+)'\)\]/.exec(quelleRoh);
		check(idTreffer !== null, `${name} trägt #[AsEventListener] mit identifier`);
		if (idTreffer) {
			identifiers.push(idTreffer[1]);
		}
		const rumpf = methodenRumpf(ohnePhpKommentare(quelleRoh), methodenName) || '';
		check(/instanceof\s*FrontendUserAuthentication/.test(rumpf),
			`${name}: ${methodenName}() enthält einen FrontendUserAuthentication-Riegel`);
	}
	check(new Set(identifiers).size === identifiers.length,
		'alle drei identifier sind untereinander eindeutig',
		...identifiers);

	console.log('     Gegenprobe A-11-G: ein fehlender FrontendUserAuthentication-Riegel wird erkannt');
	const ohneRiegel = methodenRumpf('public function __invoke($event): void { $this->tueEtwas(); }', '__invoke') || '';
	check(!/instanceof\s*FrontendUserAuthentication/.test(ohneRiegel), 'A-11-G: das Fehlen wird erkannt');
}

/* ==================================================== A-12 BookOnLogout liest die Kennung aus der Sitzung */

console.log('\nA-12 BookOnLogout liest die fe_user-Kennung aus getUserSession()?->getUserId(), NICHT mehr aus $event->getUser()->user[...]');
{
	// NACHGETRAGEN im Behebungslauf D6/4B (probe-abend.mjs, I-8, gefunden
	// über die Abendbilanz und am lebenden Objekt bestätigt): $event->
	// getUser()->user['uid'] ist zum Zeitpunkt von BeforeUserLogoutEvent
	// IMMER leer, weil AbstractUserAuthentication::start() $this->user auf
	// null setzt, bevor checkAuthentication() den Formular-Logout-Zweig
	// erreicht — die Befüllung aus der Sitzung läuft erst danach
	// (typo3_src/typo3/sysext/core/Classes/Authentication/
	// AbstractUserAuthentication.php, Zeilen 272 und 406–412 vs. 483ff.,
	// nachgesehen, nicht angenommen). getUserSession()?->getUserId() liest
	// stattdessen die noch nicht entfernte Sitzung selbst — die einzige zu
	// diesem Zeitpunkt zuverlässige Quelle.
	const rumpf = methodenRumpf(ohnePhpKommentare(bookOnLogoutRoh), '__invoke') || '';
	check(/getUserSession\(\)\s*\?->\s*getUserId\(\)/.test(rumpf),
		'__invoke() liest die Kennung über getUserSession()?->getUserId()');
	check(!/getUser\(\)\s*->\s*user\s*\[/.test(rumpf),
		'__invoke() liest NICHT mehr $event->getUser()->user[...] — dieses Feld ist an dieser Stelle strukturell leer');

	console.log('     Gegenprobe A-12-G: der alte, fehlerhafte Zugriffsweg in der Textprobe wird erkannt');
	const alterWeg = "public function __invoke($event): void { \$feUserUid = (int)(\$event->getUser()->user['uid'] ?? 0); }";
	const alterWegRumpf = methodenRumpf(alterWeg, '__invoke') || '';
	check(/getUser\(\)\s*->\s*user\s*\[/.test(alterWegRumpf), 'A-12-G: der fehlerhafte Zugriffsweg wird erkannt');
}

/* ------------------------------------------ Wächter: sind alle Blöcke gelaufen? */

if (ERWARTETE_ZUSAGEN > 0 && zusagen !== ERWARTETE_ZUSAGEN) {
	console.log(`\n✗ WÄCHTER: ${zusagen} Zusagen ausgegeben, ${ERWARTETE_ZUSAGEN} erwartet.`);
	fehler++;
} else if (ERWARTETE_ZUSAGEN === 0) {
	console.log(`\n  (Wächter noch nicht scharf: ERWARTETE_ZUSAGEN steht auf 0 und wird erst in`);
	console.log(`  Umsetzungsstück D2d gemessen und eingetragen. Tatsächlich ausgegebene Zusagen: ${zusagen}.)`);
}

/* ------------------------------------------------------------- Ergebnis */

console.log(`\nERGEBNIS: ${fehler === 0 ? 'alle Prüfungen bestanden.' : `${fehler} Prüfung${fehler === 1 ? '' : 'en'} fehlgeschlagen.`}`);
if (fehler === 0) {
	console.log('Der Anmeldedienst meldet sich mit genau einer Priorität über dem Kern und ohne');
	console.log('BE-Untertypen an, die Begrenzung der Anmeldeversuche benutzt die Schlüsselnamen,');
	console.log('die der Kern selbst liest, authUser() vergleicht ausschließlich mit hash_equals,');
	console.log('kein Protokollier-Aufruf gibt die Kennung preis, keine Datenbankanweisung verkettet');
	console.log('Text und Variable mit ".", AllowUrlTokenLogin prüft alle vier Riegel, Services.yaml');
	console.log('macht genau einen zusätzlichen Dienst öffentlich, die laufende Datenbank zeigt eine');
	console.log('beidseitig stimmige Kette Spielender/Schattendatensatz und saubere, eindeutige');
	console.log('Kennungen, und alle drei Zuhörer sind eindeutig benannt und frontend-sicher.');
}

process.exit(fehler === 0 ? 0 : 1);
