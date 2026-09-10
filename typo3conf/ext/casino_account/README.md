# Casino Kunterbunt – Konten und QR-Codes

## Zweck

Neunte Extension des Spaß-Casinos **Casino Kunterbunt**: die Konten der
Spielenden. Jede Person, die im Haus spielt, bekommt einen eigenen
Datensatz — mit Namen, Guthaben und einer einmaligen Kennung — und einen
persönlichen QR-Code, mit dem sie sich (ab Phase D2) anmelden kann. Diese
Extension bringt dafür einen eigenen Backend-Reiter **„Casino"** mit, in dem
das Modul **„Spielende"** liegt.

Diese Extension enthält alles, was diesen Teil des Hauses ausmacht. Sie
lässt sich installieren und entfernen, ohne dass an `casino_startpage` oder
an einer anderen Extension etwas geändert werden muss — Phase D1 ist rein
additiv.

## Eckdaten

| | |
|---|---|
| Extension-Key | `casino_account` |
| Composer-Name | `phomo17/casino-account` |
| Namespace | `Phomo17\CasinoAccount\` |
| Tabelle | `tx_casinoaccount_player` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.4.0 |
| Lizenz | AGPL-3.0-or-later |
| Zustand | 0.4.0 / alpha |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_account
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 extension:setup
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Der Schritt `extension:setup` ist neu gegenüber den acht Geräte-Extensions:
er legt die Datenbanktabelle an. Ohne ihn gibt es die Tabelle nicht und das
Modul zeigt einen Datenbankfehler.

## Der Backend-Reiter „Casino"

Direkt unter „Web" im linken Menü des TYPO3-Backends steht eine eigene,
oberste Modulgruppe **„Casino"** mit eigenem Symbol (ein selbst gezeichneter
Spielchip). Sie entsteht als ein Eintrag **ohne** `parent` und **ohne**
`path` in `Configuration/Backend/Modules.php` — genau so, wie der Kern selbst
seine eigenen obersten Gruppen „Web", „Datei", „Site Management" und „Admin
Tools" anlegt. Sie bekommt bewusst **keinen** Seitenbaum an die linke Seite
(`navigationComponent` fehlt): die Konten hängen an keiner Seite des
Frontends, ein Seitenbaum ohne etwas Anklickbares wäre für den Bearbeiter
eine Falle.

In der Gruppe liegt zurzeit ein Modul: **„Spielende"**. Eine zweite Zeile
(„QR-Modus") kommt in Phase D2 hinzu — rein anhängend, kein Umbau dieser
Datei.

## Das Modul „Spielende"

Zeigt eine Liste aller Spielenden mit Gesamtvermögen, Rolle, Anmeldezustand
und zwei Schaltflächen je Zeile: **Bearbeiten** und **QR-Code anzeigen**.
„Neuen Spielenden anlegen" sowie „Bearbeiten" führen auf die Bearbeitungsroute
des Kerns (`record_edit`) — diese Extension bringt **keine eigene
Formularmaschine** mit. Das ist eine ausdrückliche Vorgabe des Konzepts
(D.3.5) und zugleich der Grund, warum sich das Formular vollständig über die
Tastatur bedienen lässt: es ist dasselbe Formular, das TYPO3 überall im
Backend benutzt.

Beim Öffnen des Moduls geschieht zweierlei von selbst:

1. Fehlt der Ordner für die Konten, wird er angelegt (siehe „Abgleich der
   Backend-Benutzer" unten für die Voraussetzung dazu).
2. Jeder Backend-Benutzer, der noch keinen Spielenden-Eintrag hat, bekommt
   einen — mit 1.000.000 in der Kasse.

### Die Felder

| Feld | Bedeutung |
|---|---|
| Name | Pflichtfeld, beliebige Zeichen erlaubt. Zwei Personen dürfen gleich heißen — unterschieden wird über die Kennung, nicht über den Namen. |
| Guthaben | Editierbares Eingabefeld (siehe unten). |
| Rolle | Aufklappbar, zurzeit ohne Einträge — kommt in einem späteren Bauteil des Hauses (Teil E). |
| Kasse, Gerätekredit, Gewinnspeicher | Nur lesbar. Die drei Einzelbeträge, aus denen sich das Gesamtvermögen zusammensetzt. |
| Darf sein Guthaben selbst setzen | Nur lesbar, wird automatisch gesetzt, sobald der Datensatz zu einem Backend-Benutzer gehört. |

Die Kennung selbst steht **nicht** im Formular — sie ist ein reiner
Verwaltungswert und wird ausschließlich in der QR-Ansicht angezeigt (siehe
unten).

### Was beim Speichern von „Guthaben" passiert

Das eingebbare Feld „Guthaben" ist **kein eigenes, viertes Geldfeld** — es
ist die Spalte `balance_cash` (die Kasse) selbst, unter dem Namen „Guthaben"
beschriftet. Es gibt bewusst keine vierte Spalte, die zusätzlich zu den drei
echten Beträgen gepflegt werden müsste: das Konzept (D.13) verlangt
ausdrücklich, dass das Gesamtvermögen **immer** die Summe der drei
Einzelbeträge ist und nie eine eigene, davon abweichende Zahl sein kann.

Beim Speichern setzt ein DataHandler-Hook (`PlayerDataHandlerHook`)
Gerätekredit und Gewinnspeicher automatisch auf 0 — der ganze eingetragene
Betrag landet vollständig in der Kasse. Damit ist die Vorgabe des Konzepts
(„das eingegebene Guthaben ersetzt vollständig alle drei Beträge") wörtlich
erfüllt, ohne eine vierte Geldspalte einzuführen.

**Der bekannte Schönheitsfehler:** Öffnet man einen Datensatz mitten im
Spiel, zeigt das Feld „Guthaben" nur die Kasse, nicht das tatsächliche
Gesamtvermögen der Person in diesem Moment. Das ist hinnehmbar, weil daneben
alle drei Einzelbeträge sowie das tatsächliche Gesamtvermögen (nur lesbar,
Feldbezeichnung „Gesamtvermögen") unverändert sichtbar bleiben — nichts ist
verborgen, nur die Bezeichnung des editierbaren Feldes kann in diesem einen
Moment in die Irre führen.

## Die Kennung

Jeder Spielende bekommt beim Anlegen automatisch eine **einmalige Kennung**:
32 zufällige Byte (`random_bytes()`, kein `rand()` oder `mt_rand()` — diese
sind vorhersagbar), Base64 in der URL-tauglichen Fassung, 43 Zeichen lang.
Ein Datenbank-Schlüssel (`UNIQUE KEY`) verhindert zusätzlich, dass jemals
zwei Spielende dieselbe Kennung tragen — selbst wenn der PHP-Code einen
Fehler machte, würde die Datenbank eine doppelte Kennung verweigern.

Die Kennung wird **nie wieder geändert**, auch nicht beim Umbenennen. Sie ist
die eigentliche Identität eines Spielenden — deshalb lässt sich ein
Spielender auch **nicht kopieren**: eine Kopie trüge dieselbe Kennung, und
der eindeutige Schlüssel wiese sie mit einem rohen Datenbankfehler ab. Ein
Versuch, einen Spielenden über „Kopieren" zu vervielfältigen, wird deshalb
mit einer verständlichen Meldung verweigert.

## Der QR-Code

Über die Schaltfläche mit dem QR-Symbol öffnet sich die Ansicht mit dem
persönlichen QR-Code des Spielenden. Von dort lässt er sich als SVG oder als
PNG herunterladen und ausdrucken.

### Wie er erzeugt wird

**Abweichung vom ursprünglichen Konzept, offen benannt.** `CONCEPT.md` D.4.3
verlangt, dass der QR-Code selbst geschrieben wird, weil TYPO3 angeblich
keine QR-Codes erzeugen könne. Das trifft für TYPO3 13.4 **nicht zu**: der
Kern verlangt `bacon/bacon-qr-code` als **harte Abhängigkeit** von
`typo3/cms-core` und benutzt sie selbst, serverseitig, für den QR-Code der
Zwei-Faktor-Anmeldung im Backend (`TotpProvider::getSvgQrCode()`). Diese
Bibliothek war also bereits installiert, bevor diese Extension eine einzige
Zeile schrieb.

`casino_account` benutzt deshalb genau diese vorhandene Bibliothek hinter
einer eigenen, schmalen Schnittstelle (`QrCodeFactory`) — **ohne eine
einzige neue Abhängigkeit**: weder `composer.json` noch `ext_emconf.php`
dieser Extension nennen `bacon/bacon-qr-code`. Das ist core-first im
wörtlichen Sinn: eine bereits vorhandene Kern-Abhängigkeit statt rund 800
Zeilen selbst geschriebener Galois-Feld- und Reed-Solomon-Arithmetik — der
riskanteste Code, den dieses Projekt hätte schreiben können.

Der geforderte Nachweis „Prüfung gegen bekannte Vergleichswerte" ist dabei
**stärker** ausgefallen als ursprünglich verlangt: `verify-qr.mjs` enthält
einen selbst geschriebenen Rückweg, der das fertige Muster wieder einliest
und die eingespeiste Adresse zeichengleich zurückgewinnt — geprüft sowohl
gegen die echte Adresse dieses Hauses als auch gegen das offizielle
ISO/IEC-18004-Beispiel „01234567".

Das SVG selbst wird **nicht** von der Bibliothek gezeichnet, sondern von
einer eigenen, vierzig Zeilen kurzen Klasse (`QrSvgRenderer`) — damit
bestimmt diese Extension selbst den zugänglichen Namen, die eigenen
Klassennamen und die für den Ausdruck nötigen festen Maße. Das PNG entsteht
**im Browser** über eine Zeichenfläche (Canvas), nicht auf dem Server — so
verlangt es das Konzept, und es erspart dem Server jede Bildbibliothek.

### Was darauf steht — und was ausdrücklich nicht

Auf dem QR-Code steht **ausschließlich** eine Adresse der Form

```
https://<Adresse dieses Hauses>/?casinoToken=<Kennung>
```

Die Grundadresse kommt zur Laufzeit aus der Site-Verwaltung des Kerns, nicht
aus einer fest eingetragenen Zeichenkette — zieht das Haus auf eine andere
Adresse um, genügt eine Zeile in der Site-Konfiguration. Unter dem Code steht
zusätzlich die Kennung im Klartext, damit sie sich auch abtippen lässt, wenn
sich der Code nicht scannen lässt.

**Ausdrücklich nicht** auf dem Code: der Name der Person, ihr Guthaben oder
irgendein anderes personenbezogenes Datum. Die Kennung allein ist bedeutungs­
los, solange sie niemand kennt.

## Schattendatensätze in `fe_users`

TYPO3 verlangt für eine Frontend-Sitzung einen Datensatz in der Tabelle der
Frontend-Benutzer (`fe_users`). Jeder Spielende bekommt deshalb automatisch
einen sogenannten **Schattendatensatz** — einen `fe_users`-Eintrag, der nur
deshalb existiert, weil der Kern ihn technisch verlangt:

* Er hat **kein brauchbares Passwort**: es entsteht aus `random_bytes()`,
  geht einmal an den DataHandler, wird dort verschlüsselt gespeichert und ist
  danach verloren — auch für diese Extension selbst. Eine Anmeldung über ein
  gewöhnliches Anmeldeformular ist damit ausgeschlossen.
* Sein Benutzername beginnt immer mit `casino-` (z. B. `casino-42`).
* Er wird zusammen mit dem Spielenden angelegt und gelöscht, und sein
  angezeigter Name (`fe_users.name`) folgt dem Namen des Spielenden.

### Zwei offen gelegte Grenzen

**Der Schattendatensatz ist nicht wirklich unsichtbar.** Ein Administrator,
der unter *Web › Liste* den Kontenordner „Casino Kunterbunt — Konten" öffnet,
sieht ihn wie jeden anderen `fe_users`-Datensatz. Im Modul „Spielende" kommt
er nicht vor, und es gibt für den normalen Betrieb keinen Grund, den Ordner
zu öffnen — die Tabelle `fe_users` global vor Administratoren zu verstecken
wäre der einzige Weg zur wörtlichen Erfüllung und ein zu tiefer Eingriff in
die ganze Installation, nicht nur in diese Extension. Diese Abweichung ist
bewusst offen benannt statt versteckt.

**Der `username` eines Schattendatensatzes ändert sich beim Umbenennen
nicht** — nur sein `name`. Der Grund: `username` muss innerhalb der Seite
eindeutig sein (`uniqueInPid` in der TCA des Kerns) und darf nicht jedes
Zeichen tragen; der Name eines Spielenden darf laut Konzept aber beliebige
Zeichen enthalten. Zwei Personen namens „Anna" hätten sonst denselben
`username` gewollt. Der `username` bleibt deshalb dauerhaft die technische
Form `casino-<Nummer>`, während `name` dem sichtbaren Namen des Spielenden
folgt.

### Was beim Entfernen der Extension zurückbleibt

TYPO3 wirft beim Abschalten einer Extension **nichts** von selbst weg. Wer
`casino_account` deaktiviert, hat danach folgenden Bestand:

* **Die Tabelle `tx_casinoaccount_player` bleibt stehen**, mit allen Konten
  und allen Kennungen darin. Sie ist ohne die Extension nicht mehr
  erreichbar, aber sie ist da. Wer sie wirklich loswerden will, tut das im
  Install-Tool unter „Analyze Database" — dort wird sie als überflüssig
  angeboten. **Das ist unwiderruflich.**
* **Die Spalte `fe_users.tx_casinoaccount_player` bleibt stehen.** Sie stört
  nichts: sie steht in keinem Formular, wird von nichts gelesen und kostet
  vier Byte je Frontend-Benutzer. Auch sie wird im Install-Tool als
  überflüssig angeboten.
* **Alle Schattendatensätze in `fe_users` bleiben stehen** — als gewöhnliche
  Frontend-Benutzer im Ordner „Casino Kunterbunt — Konten". Sie sind daran
  erkennbar, dass ihr Benutzername mit `casino-` beginnt. Anmelden kann sich
  mit ihnen niemand: ihr Passwort ist eine Zufallsfolge, die nirgends
  aufbewahrt wurde — auch nicht von dieser Extension. Wer sie loswerden will,
  löscht sie unter *Web › Liste* im Kontenordner von Hand.
* **Der Systemordner „Casino Kunterbunt — Konten" (Seitentyp Systemordner)
  bleibt stehen.** Er erscheint in keinem Menü und keiner Sitemap, ist aber
  eine gewöhnliche Seite im Seitenbaum und wird nicht automatisch entfernt.
* **Die Benutzergruppe „Casino Kunterbunt — Spielende" (`fe_groups`) bleibt
  stehen.**
* **Die beiden `sys_registry`-Einträge bleiben stehen** — im Namensraum
  `tx_casinoaccount`, die Schlüssel `storagePid` (Nummer des Kontenordners)
  und `feGroupUid` (Nummer der Benutzergruppe). Sie lassen sich nur über das
  Install-Tool oder von Hand in der Datenbank entfernen.

Alle diese Reste bleiben bestehen, **bis sie von Hand entfernt werden**.

## Abgleich der Backend-Benutzer

Jeder Backend-Benutzer bekommt automatisch einen Spielenden-Eintrag mit
1.000.000 in der Kasse — die Idee dahinter: wer das Haus betreibt, soll ohne
Umweg auch selbst als Spielender auftreten können. Der Abgleich läuft an
**drei** Stellen, damit die Zusage „alle vorhandenen Backend-Benutzer stehen
in der Liste" auch dann noch gilt, wenn die Aktivierung der Extension längst
zurückliegt oder ein Benutzer auf einem Weg entstanden ist, der kein Ereignis
auslöst:

1. **Beim Aktivieren der Extension** (einmalig, über ein PSR-14-Ereignis).
2. **Bei jedem neuen Backend-Benutzer** (über denselben DataHandler-Hook, der
   auch die Kennung vergibt).
3. **Bei jedem Aufruf des Moduls „Spielende"** — das eigentliche
   Sicherheitsnetz, das die Zusage tatsächlich hält, auch wenn 1. und 2.
   ausbleiben.

Der Abgleich ist **wiederholbar**: er legt nur an, wozu es noch keinen
Eintrag gibt, und läuft ohne Datenbankabfrage je Benutzer. Er ist eine
**Einbahnstraße**: wird ein Backend-Benutzer später umbenannt oder gelöscht,
bleibt sein Spielenden-Eintrag unverändert bestehen — sein Guthaben ist
inzwischen erspieltes Vermögen, kein technischer Spiegel mehr.

## Der Prüfstand

Fünf Prüfskripte, alle unter `Resources/Private/Scripts/`, reines Node ab
Fassung 18, ohne jede Abhängigkeit, rein lesend:

| Skript | Prüft |
|---|---|
| `verify-cabinet.mjs` | Die Hausprüfung: keine eigene Farbe (außer dem QR-Code), keine fremde Datei, Trennung von `casino_startpage`, keine fremde Marke (Negativliste), widerspruchsfreie Lizenzangaben, Ableitbarkeit von Schlüssel/Composer-Name/Namensraum/Tabellenpräfix, PSR-4, das Kürzel-Präfix `ca-`, der Icon-Vertrag, keine Datei außerhalb der Extension, kein echtes `disabled`, jede Beschriftung aus der XLIFF-Datei. |
| `verify-schema.mjs` | Das Datenmodell (`ext_tables.sql`, TCA) gegen `CONCEPT.md` Anhang I. |
| `verify-module.mjs` | Die Modulgruppe, das Modul und die Ansicht der Liste. |
| `verify-account.mjs` | Kennung, Schattendatensätze und der Abgleich der Backend-Benutzer. |
| `verify-qr.mjs` | Den QR-Code — einschließlich des selbst geschriebenen Rückwegs, der das Muster wieder in die eingespeiste Adresse zurückübersetzt. |

Aufruf, jeweils von `/home/momo/Projects/casino-kunterbunt` aus:

```
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-cabinet.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-schema.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-module.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-account.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-qr.mjs
```

Jedes der fünf Skripte trägt einen **Wächterblock**: fehlt eine Pflichtdatei
oder enthält sie ein NUL-Byte, bricht das Skript laut ab statt einen Block
still zu überspringen; und jedes Skript zählt seine eigenen Zusagen und hält
sie gegen eine fest eingetragene Zahl (`ERWARTETE_ZUSAGEN`) — sinkt die Zahl
der tatsächlich ausgegebenen Zusagen, weil ein Prüfblock übersprungen wurde,
schlägt der Wächter selbst dann Alarm, wenn keine einzige Prüfung als
fehlgeschlagen gemeldet würde.

## Grenzen, offen gelegt

* **Ein QR-Code trägt eine Kennung im Klartext.** Wer ihn abfotografiert,
  kann sich (ab Phase D2) als diese Person anmelden. Der Schutz, den diese
  Extension bietet, richtet sich gegen Versehen und Neugier — jemand, der
  zufällig den Bildschirm oder Ausdruck einer anderen Person sieht —, nicht
  gegen einen gezielten Angriff. Das ist eine bewusste Vorgabe des Konzepts
  für ein Spaß-Casino ohne echtes Geld, keine Nachlässigkeit dieser
  Extension.
* **Der Schattendatensatz ist im Backend nicht wirklich unsichtbar** — siehe
  „Schattendatensätze in `fe_users`" oben.
* **Der `username` eines Schattendatensatzes ändert sich beim Umbenennen
  nicht**, nur sein `name` — ebenfalls oben erklärt.
* **Beim Speichern von „Guthaben" mitten im Spiel** wird das Feld nur beim
  erneuten Öffnen mit der Kasse statt dem tatsächlichen Gesamtvermögen
  vorbelegt — siehe „Was beim Speichern von „Guthaben" passiert" oben.
* **Was diese Phase (D1) ausdrücklich nicht ist:** kein QR-Modus-Schalter,
  keine Frontend-Anmeldung, kein Zugriffsschutz, kein serverseitiges
  Guthaben, keine Lobby. Das folgt in den Phasen D2 und D3.

## Stand

**Phase D1 ist vollständig umgesetzt.** Die Extension bringt die
Modulgruppe „Casino" mit dem Modul „Spielende" (Liste, Anlegen, Bearbeiten
über die Formularmaschine des Kerns), die automatische Kennung, den
Schattendatensatz in `fe_users`, den Abgleich der Backend-Benutzer mit
1.000.000 Startguthaben sowie den persönlichen QR-Code mit Ansicht,
Herunterladen (SVG und PNG) und Drucken. Alle fünf Prüfskripte dieser
Extension sind grün.

Was diese Phase bewusst **nicht** enthält: einen QR-Modus-Schalter, eine
Frontend-Anmeldung, einen Zugriffsschutz, ein serverseitiges Guthaben für
die Geräte-Extensions und eine Lobby. Das ist Aufgabe der Phasen D2 und D3.
