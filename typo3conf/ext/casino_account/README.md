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
| Tabellen | `tx_casinoaccount_player`, `tx_casinoaccount_coinfield` (seit Ausbaustufe 3) |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.5.0 |
| Lizenz | AGPL-3.0-or-later |
| Zustand | 0.5.0 / alpha |

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

In der Gruppe liegen zwei Module: **„Spielende"** und **„QR-Modus"** (seit
Phase D2) — rein anhängend, kein Umbau der Modulgruppe selbst.

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

## Der QR-Modus

Seit Phase D2 gibt es einen eigenen Schalter: **Casino › QR-Modus**, direkt
unter dem Modul „Spielende".

**AUS** (Auslieferungszustand) bedeutet: der Saal steht allen offen, es gibt
keine Anmeldung und keinen Zugriffsschutz — die Website verhält sich exakt so
wie nach Teil C. Das Guthaben liegt dabei im Browserspeicher des jeweiligen
Geräts, nicht serverseitig.

**AN** bedeutet: ab sofort landet jede Adresse des Hauses ohne eine gültige
Sitzung auf der Anmeldung (der „Torseite") — es gibt keinen Weg daran vorbei.
Beim Einschalten warnt das Modul deshalb ausdrücklich und verlangt einen
zweiten, ausdrücklichen Klick; Ausschalten braucht keine Warnung, weil es
nichts kaputt macht, sondern nur wieder freigibt.

Im Modul steht außerdem, **wie viele Spielende gerade angemeldet sind** (samt
„zuletzt gesehen"), und ein Knopf **„Alle abmelden"** — für das Ende eines
Spieleabends. Wird der Modus ausgeschaltet oder wird „Alle abmelden" benutzt,
bucht die Extension automatisch jedes noch in einem Gerät oder auf der
Risiko-Leiter liegende Guthaben in die Kasse zurück, damit nichts liegenbleibt
(siehe „Anmelden und Abmelden" unten).

**Das Backend bleibt immer erreichbar**, unabhängig vom Schalterstand — der
QR-Modus schützt ausschließlich das Frontend. Wer sich im Backend aussperrt,
kann es nicht: der Schalter lässt sich dort jederzeit wieder umlegen.

## Anmelden und Abmelden

Ist der QR-Modus **an**, gibt es drei Wege, sich anzumelden — der erste ist
Pflicht und immer sichtbar, die beiden anderen sind Zugabe:

1. **Von Hand.** Die 43-stellige Kennung in ein Feld eintippen. Dieser Weg
   funktioniert auf jedem Gerät und jedem Browser, auch ohne Kamera und ohne
   JavaScript.
2. **Kamera.** Der QR-Code wird vor die Gerätekamera gehalten. Nur verfügbar,
   wenn der Browser die eingebaute Erkennung (`BarcodeDetector`) mitbringt —
   diese Extension schreibt **keinen eigenen** QR-Leser. Fehlt die Erkennung,
   erscheint einfach keine Kamera-Schaltfläche; das sieht nicht wie ein Fehler
   aus, sondern wie ein Gerät, auf dem man von Hand eintippt.
3. **Bild.** Ein bereits aufgenommenes Bild des Codes auswählen — dieselbe
   eingebaute Erkennung wie bei der Kamera, nur auf einem Einzelbild.

Nach einer erfolgreichen Anmeldung leitet das Haus sofort auf eine saubere
Adresse um, damit die Kennung nicht im Verlauf, in der Adresszeile oder in
einem Lesezeichen hängenbleibt. Oben auf **jeder** Seite steht danach eine
schmale Leiste mit dem Namen und dem Gesamtvermögen der angemeldeten Person
sowie einem Knopf **„Abmelden"**.

**Beim Abmelden** — ob über diesen Knopf, über „Alle abmelden" im Modul oder
weil eine Sitzung von selbst abläuft — wird Geld, das noch in einem Gerät
steckt oder auf der Risiko-Leiter liegt, **vollständig in die Kasse
zurückgebucht**. Es kann so kein Geld in einem Gerät liegenbleiben.

**BEHOBENER GELDFEHLER (Behebungslauf D6/4B, 2026-09-11, gefunden über
`probe-abend.mjs`, I-8):** genau dieses Zurückbuchen griff beim Abmelden über
den echten Knopf ".ca-bar__logout" bisher **nie** — unabhängig vom
Gerätekredit. `BookOnLogout` (`Classes/EventListener/BookOnLogout.php`) las
die fe_user-Kennung über `$event->getUser()->user['uid']`; dieses Feld ist zu
dem Zeitpunkt, zu dem der Kern `BeforeUserLogoutEvent` auslöst, aber immer
leer — `AbstractUserAuthentication::start()` setzt `$this->user = null;`, und
der Formular-Logout-Zweig in `checkAuthentication()` läuft, BEVOR der Kern
`$this->user` aus der Sitzung befüllt. Am lebenden Objekt nachgestellt: ein
Testkonto mit 300 € Gerätekredit über den echten Knopf abgemeldet, danach
stand der Gerätekredit unverändert bei 300. Behoben durch Lesen der Kennung
über `$event->getUserSession()?->getUserId()` — die zu diesem Zeitpunkt noch
nicht entfernte Sitzung selbst, unabhängig davon, ob `$this->user` in diesem
Durchlauf schon befüllt wurde. Die Zusage steht seither zusätzlich als
eigener, dauerhafter Block A-12 in `verify-auth.mjs`.

## Der Buchungsendpunkt (Ausbaustufe 3, CONCEPT.md D.7)

Seit Ausbaustufe 3 liegt der Server nicht mehr nur auf dem Vorschein — das
Guthaben liegt bei eingeschaltetem QR-Modus **auf dem Server**, nicht mehr im
Browserspeicher des Geräts. Eine vierte Schicht,
`Phomo17\CasinoAccount\Middleware\BookingEndpoint`, beantwortet drei
Adressen selbst und reicht alles andere unverändert weiter:

| Adresse | Methode | Zweck |
|---|---|---|
| `/casino-konto/buchung` | `POST` | einen Vorgang ausführen |
| `/casino-konto/stand` | `GET` | die drei Beträge abgleichen, ohne zu buchen |
| `/casino-konto/feld` | `POST` | den Gerätespeicherstand des Coin Pushers schreiben — **kein Geld**, keine Buchungsnummer (D.8, D.13) |

Er liegt in der Schichtenkette **nach** der Anmeldung und **vor** dem Tor:
ein Aufruf ohne gültige Sitzung bekommt dadurch eine saubere JSON-Absage
(`401`) statt der Torseite als HTML, die ein JSON-Aufrufer als Serverausfall
deuten und das Gerät fälschlich sperren würde. Bei ausgeschaltetem QR-Modus
gibt es diese drei Adressen nicht — sie laufen unverändert in die
gewöhnliche Seitenauflösung des Kerns.

**Der Spielende kommt ausschließlich aus der laufenden Sitzung.** Der
Endpunkt liest an keiner einzigen Stelle eine Spieler-Kennung aus dem
Aufruf — eine mitgeschickte Kennung würde stillschweigend ignoriert (D.9,
siehe „Grenzen, offen gelegt" unten).

### Die Antwortform

Jeder Buchungsvorgang antwortet in derselben Form:

```
{ ok, grund?, kasse, geraet, gewinn, gesamt, bewegt, gekappt, doppelt }
```

`gesamt` ist immer `kasse + geraet + gewinn` und wird selbst nie
gespeichert. Eine **Ablehnung** (zu wenig Guthaben, kein Admin) kommt mit
Rückgabewert **200** und `ok: false` — sie ist kein Fehler des Endpunkts,
sondern ein normaler Spielausgang. Nur was der Browser **nicht** als
Antwort erkennt (Netzabbruch, ein 5xx, unlesbares JSON) löst die
Sperranzeige der Kontenleiste aus.

### Doppelte Buchungen

Jeder Browser zählt seine Buchungen fortlaufend durch (`nummer`) und trägt
eine eigene Kennung (`kunde`). Schickt derselbe Browser dieselbe oder eine
ältere Nummer noch einmal — etwa nach einem abgebrochenen Netzwerkaufruf,
dessen Antwort nie ankam —, bucht der Server **nicht** ein zweites Mal und
antwortet mit `doppelt: true` bei unveränderten Beträgen. Zwei
Registerkarten derselben Person zählen ihre Nummern unabhängig
(`booking_client` neben `booking_seq`, siehe „Datenmodell" unten) — die
Buchung der zweiten Karte wird deshalb nie fälschlich als „schon verarbeitet"
verworfen.

### Vorgänge nur für Admins

Drei der elf Vorgänge — `aufladen`, `abbuchen`, `setzen` — bucht der Server
ausschließlich für Spielende mit gesetztem `is_admin`. Ein Nicht-Admin
bekommt `{ ok: false, grund: 'kein_admin' }`, die Beträge bleiben
unverändert. Das ist die **serverseitige** Grenze aus D.7.3 — dass
`credit-set.js` und `credit-display.js` in `casino_startpage` den
zugehörigen Bedienteil für Nicht-Admins zusätzlich aus dem Dokument
entfernen, ist eine Bedienbarkeitszusage obendrauf, nicht der eigentliche
Schutz (siehe „Grenzen, offen gelegt" unten).

### Der Zustandsblock

Auf jeder ausgelieferten Seite steht — unmittelbar hinter dem öffnenden
`<head>`, damit er garantiert vor jedem `async` eingebundenen Modul geparst
ist — ein `<script type="application/json" data-ca-state>` mit den drei
Beträgen, ihrer Summe, den drei vollständigen Endpunkt-Adressen, ob die
angemeldete Person Admin ist, dem Höchststand je Betrag und den
Gerätespeicherständen des Coin Pushers. **Kein Name, keine Kennung, keine
Rolle** — was sichtbar in der Kontenleiste steht, steht nicht zusätzlich
hier (D.9). `account-backend.js` in `casino_startpage` liest diesen Block
synchron beim Laden und entscheidet daran, ob `credit.js`/`machine-credit.js`
den Browserspeicher oder den Server führen (siehe dessen README, Abschnitt
„Guthaben-Schnittstelle").

### Die Sperranzeige

Antwortet der Server nicht mehr, zeigt die Kontenleiste ein natives
`<dialog>` (`.ca-lock`): der Rest der Seite wird für Maus, Tastatur und
Hilfsmittel unerreichbar, der Fokus wandert hinein, Escape schließt **nicht**
— eine Sperre, die sich wegdrücken lässt, wäre keine. Der Zustand steht als
Satz da, nicht als Farbe. Nach Wiederherstellung der Verbindung geht die
liegengebliebene Buchung über „Erneut versuchen" erneut hinaus (oder wird
als doppelt erkannt — siehe oben) und die Anzeige verschwindet.

### Das Datenmodell

Seit Ausbaustufe 3 zusätzlich zu den bereits bestehenden Spalten von
`tx_casinoaccount_player`:

| Spalte | Zweck |
|---|---|
| `booking_client` | Kennung des Browsers, der zuletzt gebucht hat (siehe „Doppelte Buchungen" oben) |

Dazu eine neue, eigene Tabelle `tx_casinoaccount_coinfield` — der
Gerätespeicher einer Person (D.13): `player`, `store_key`, `payload`
(bis zu 9 kB je Feldstand). Sie ist **kein Geld**: sie geht in kein
Gesamtvermögen ein, hat keine Buchungsnummer und wird ausschließlich über
`/casino-konto/feld` beschrieben — bislang der einzige Nutzer ist der Coin
Pusher, aber die Spalten selbst nennen kein Gerät (der Adapter, der die
Tabelle im Browser vertritt, liegt in `casino_startpage`, das keinen
Automaten kennen darf). Bearbeitbar ist sie im Backend nicht (`hideTable`,
`adminOnly`) — sie enthält einen maschinellen Speicherstand, kein
redaktionelles Gut.

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
  und allen Kennungen darin — seit Ausbaustufe 3 zusätzlich mit der Spalte
  `booking_client` (siehe „Der Buchungsendpunkt" oben) und den drei
  Geldspalten `balance_cash`, `balance_machine`, `balance_win`. Sie ist ohne
  die Extension nicht mehr erreichbar, aber sie ist da. Wer sie wirklich
  loswerden will, tut das im Install-Tool unter „Analyze Database" — dort
  wird sie als überflüssig angeboten. **Das ist unwiderruflich.**
* **Die Spalte `fe_users.tx_casinoaccount_player` bleibt stehen.** Sie stört
  nichts: sie steht in keinem Formular, wird von nichts gelesen und kostet
  vier Byte je Frontend-Benutzer. Auch sie wird im Install-Tool als
  überflüssig angeboten.
* **Die Tabelle `tx_casinoaccount_coinfield` bleibt stehen** (seit
  Ausbaustufe 3, D.13) — mit jedem je gespeicherten Gerätespeicherstand.
  Auch sie ist kein Geld und enthält keine Kennung im Klartext, aber sie
  bleibt bestehen wie jede andere Tabelle dieser Extension. Ebenfalls im
  Install-Tool unter „Analyze Database" als überflüssig angebbar.
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
* **Die `sys_registry`-Einträge bleiben stehen** — im Namensraum
  `tx_casinoaccount`, die Schlüssel `storagePid` (Nummer des Kontenordners),
  `feGroupUid` (Nummer der Benutzergruppe) und seit Phase D2 zusätzlich
  `qrMode` (Stellung des Schalters). Sie lassen sich nur über das Install-Tool
  oder von Hand in der Datenbank entfernen.
* **Die Begrenzung der Anmeldeversuche verschwindet dagegen von selbst.** Die
  beiden Einstellwerte `loginRateLimit` und `loginRateLimitInterval` (Phase
  D2) stehen in `ext_localconf.php`, nicht in der Datenbank — sie sind mit der
  Extension weg, sobald sie entfernt wird, und hinterlassen nichts.

Alle diese Reste bleiben bestehen, **bis sie von Hand entfernt werden** — mit
der einen genannten Ausnahme der Anmeldebegrenzung, die keine eigene Spur
hinterlässt.

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

Neun Prüfskripte, alle unter `Resources/Private/Scripts/`, reines Node ab
Fassung 18, ohne jede npm-Abhängigkeit, rein lesend (vier davon fragen
zusätzlich — ausschließlich lesend — die laufende Datenbank und/oder die
laufende Website ab, siehe die Spalte „Prüft"):

| Skript | Prüft |
|---|---|
| `verify-cabinet.mjs` | Die Hausprüfung: keine eigene Farbe (außer dem QR-Code und der einen benannten Ausnahme im Eingabefeld der Torseite), keine fremde Datei, Trennung von `casino_startpage`, keine fremde Marke (Negativliste), widerspruchsfreie Lizenzangaben, Ableitbarkeit von Schlüssel/Composer-Name/Namensraum/Tabellenpräfix, PSR-4, das Kürzel-Präfix `ca-`, der Icon-Vertrag, keine Datei außerhalb der Extension, kein echtes `disabled`, kein ungesichertes `opacity`, jede Beschriftung aus der XLIFF-Datei. |
| `verify-schema.mjs` | Das Datenmodell (`ext_tables.sql`, TCA) gegen `CONCEPT.md` Anhang I. |
| `verify-module.mjs` | Die Modulgruppe, das Modul „Spielende" und die Ansicht der Liste. |
| `verify-account.mjs` | Kennung, Schattendatensätze und der Abgleich der Backend-Benutzer. |
| `verify-qr.mjs` | Den QR-Code — einschließlich des selbst geschriebenen Rückwegs, der das Muster wieder in die eingespeiste Adresse zurückübersetzt. |
| `verify-qrmode.mjs` | Den Schalter, das Modul „QR-Modus", die Sitzungsauskunft und den Buchhalter (live: Registry-Eintrag, keine verwaisten Sitzungen). |
| `verify-auth.mjs` | Den Anmeldedienst, die Begrenzung der Anmeldeversuche und die drei Ereignis-Zuhörer (live: die Kette Kennung/Spielender/Schattendatensatz). |
| `verify-gate.mjs` | Die vier Middlewares, die Torseite und `gate-scan.js` — statisch und live gegen die laufende Website, für beide Schalterstellungen. |
| `verify-booking.mjs` | Der Buchungsendpunkt (seit Ausbaustufe 3): die vierte Schicht, die Ablehnung fremder Spieler-Kennungen im Aufruf, jeder Vorgang aus `BookingService::ARTEN`, die Admin-Grenze, das D.7.1-Beispiel Schritt für Schritt gegen die echte Datenbank, doppelte Buchungen, Kappung, der Zustandsblock und der Feld-Endpunkt — statisch und live, räumt am Ende jede verwendete echte Buchung wieder zurück. |

Aufruf, jeweils von `/home/momo/Projects/casino-kunterbunt` aus:

```
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-cabinet.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-schema.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-module.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-account.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-qr.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-qrmode.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-auth.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-gate.mjs
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/verify-booking.mjs
```

Jedes der neun Skripte trägt einen **Wächterblock**: fehlt eine Pflichtdatei
oder enthält sie ein NUL-Byte, bricht das Skript laut ab statt einen Block
still zu überspringen; und jedes Skript zählt seine eigenen Zusagen und hält
sie gegen eine fest eingetragene Zahl (`ERWARTETE_ZUSAGEN`) — sinkt die Zahl
der tatsächlich ausgegebenen Zusagen, weil ein Prüfblock übersprungen wurde,
schlägt der Wächter selbst dann Alarm, wenn keine einzige Prüfung als
fehlgeschlagen gemeldet würde.

**`verify-gate.mjs` prüft immer nur den gerade eingestellten Schalterstand**
(rein lesend — es schaltet den QR-Modus nicht selbst um, das würde einen
laufenden Abend stören können). Bei eingeschaltetem QR-Modus liefert die
Startseite und jede andere Adresse des Hauses die Torseite statt der
gewohnten Seite — das ist kein Fehler, sondern der Beweis, dass der
Zugriffsschutz wirkt. Alle übrigen Prüfskripte dieses Projekts, die sich
Seiten über HTTP holen, schlagen dann folgerichtig fehl. Der
**Auslieferungszustand ist deshalb AUS**, und wer den Modus zum Prüfen
einschaltet, schaltet ihn danach wieder aus.

## Die Abendbilanz (`probe-abend.mjs`)

Die neun Skripte des Prüfstands oben rechnen alle mit Dateien oder mit
einzelnen, isolierten Anfragen. Keines von ihnen spielt einen ganzen Abend
durch — und genau das war die Lücke, die fünf der bisher gefundenen echten
Fehler dieses Projekts unentdeckt ließ: allesamt Geldfehler, keiner von
einem Prüfskript gesehen (gefunden hat sie stattdessen der Auftraggeber
beim Spielen, ein Live-Audit, und zweimal eine Probe mit zwei echten
Browsern).

`Resources/Private/Scripts/probe-abend.mjs` schließt diese Lücke: eine
**Live-Probe**, kein Prüfskript des Reihenlaufs — sie heißt deshalb
`probe-`, nicht `verify-`, und läuft nicht mit den neun Skripten oben mit.
Sie führt über Playwright vier echte Browser durch einen ganzen simulierten
Abend (Automaten, Tischwechsel, drei Lobby-Runden, Abmelden) und schreibt
dabei **selbst** jede Anfrage an `/casino-konto/buchung` mit — der Server
führt kein eigenes Buchungsjournal, `booking_seq`/`booking_client` halten
nur die zuletzt verarbeitete Nummer. Am Ende steht eine einzige Zahl: die
Differenz zwischen der tatsächlichen Vermögensänderung aller Spielenden und
der Summe aller mitgeschriebenen Buchungen. Nachgerechnet wird dabei nicht
mit einer Abschrift der Verrechnung, sondern mit
`BookingService::rechnen()` selbst, über ein winziges PHP-Erntewerkzeug zur
Laufzeit (Reflexion auf die unveränderte Datei, gelöscht nach dem Lauf) —
dieselbe Bauart wie `casino_lobby/verify-lobby-round.mjs`.

```
ddev exec node typo3conf/ext/casino_account/Resources/Private/Scripts/probe-abend.mjs [--kurz] [--ohne=<phase>] [--behalten]
```

Braucht QR-Modus AN und zwei Umgebungsvariablen für den Backend-Zugang
(`CASINO_BE_USER`, `CASINO_BE_PASS` — ein Admin-Konto; bewusst nicht im
Quelltext). Legt vier Prüfkonten (`ACCTEST Abend A`–`D`) über das
Backend-Modul „Spielende" an und räumt sie danach wieder ab (außer bei
`--behalten`); `_d2check_` legt sie an, sein Kassenstand wird notiert und am
Ende wiederhergestellt. Der Coin Pusher ist seit dem 2026-09-11
abgeschrieben und deaktiviert (siehe `DECISIONS.md`) und spielt deshalb
nicht mit — die dafür ursprünglich vorgesehene vierte Person spielt
stattdessen eine kurze, eigene Runde am Reel Slot.

Die Nachrechnung der Lobby-Runde gegen die echte Spielregel (nicht nur
gegen die Verrechnung) läuft in vollem Umfang nur für **Roulette**
(Wheel-Physik + Auszahlungstabelle, beides aus den echten Dateien). Für
Craps und Blackjack prüft die Probe Seitenparität der Saat plus dieselbe
scharfe Buchungsprüfung wie überall sonst — nicht aber, ob der gebuchte
Betrag selbst dem Tischregelwerk entspricht; das ist eine bewusste,
dokumentierte Lücke (Begründung im Dateikopf).

### Offener Fund, NICHT in dieser Extension behoben (Behebungslauf D6/4B, 2026-09-11)

Zwei von zehn Zusagen bleiben in JEDEM Lauf rot, reproduzierbar (bestätigt
über fünf Live-Läufe hintereinander): „C konnte nicht setzen" und „alle drei
erhalten dieselbe Saat für die Runde" in P6 (Lobby Roulette, A+B+C treten
sehr kurz hintereinander bei). Ursache, am lebenden Objekt nachgestellt:
`[data-cl-state]` (geliefert von `Phomo17\CasinoLobby\Service\LobbyState`,
Extension `casino_lobby`) meldet nach dem Eröffnen einer Lobby manchmal eine
Lobby-Nummer, die **eine niedriger** ist als die tatsächlich in
`tx_casinolobby_lobby`/`tx_casinolobby_seat` angelegte Zeile — beobachtet
z. B. gemeldet 236, tatsächlich angelegt 237. Wer als zweite oder dritte
Person danach `[data-cl-join="<gemeldete Nummer>"]` sucht, findet nichts,
bleibt auf der Tischübersicht stehen und kann nicht setzen. Reproduzierbar
sowohl mit zwei zusätzlichen Beitretenden kurz hintereinander (P6, 5/5) als
auch — seltener — mit nur einem (P8, live beobachtet). Die Ursache liegt in
`casino_lobby` (`LobbyTable.php`/`LobbyService.php`/`LobbyState.php`), nicht
in `casino_account`, und wurde deshalb hier **nicht** behoben — außerhalb des
Rahmens dieses Behebungslaufs. `probe-abend.mjs` dokumentiert den Fund direkt
an der betroffenen Stelle (P6-Abschnitt) und meldet ihn ehrlich als rot,
statt ihn zu verschlucken.

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
* **Der Server führt kein Buchungsjournal.** `booking_seq` und
  `booking_client` halten nur die zuletzt verarbeitete Nummer je Browser;
  welche Beträge heute Abend geflossen sind, lässt sich hinterher **nicht**
  aus der Datenbank rekonstruieren. Das ist eine bewusste Entscheidung
  (`CONCEPT.md` D.12: „Ein Verlauf oder eine Bestenliste" ist Nicht-Ziel,
  gespeichert werden die drei Beträge und sonst nichts). Die Folge gehört
  dazu: geht Geld verloren, sagt die Datenbank **nicht**, wo. Nachweisbar
  wäre das nur, indem man mitschreibt, während es passiert — ein solches
  Live-Messwerkzeug existiert für diese Extension noch nicht.

**Die offengelegten Grenzen des Zugriffsschutzes (D.9)** — hier gehört die
Wahrheit hin, damit niemand mehr hineinliest, als da ist:

1. **Wer den QR-Code einer anderen Person abfotografiert, kann sich als sie
   anmelden.** Der Code trägt die Kennung im Klartext; sie ist die einzige
   Voraussetzung für die Anmeldung.
2. **Eine Adresse mit fremder Kennung, die jemand anklickt, meldet ihn als
   diese fremde Person an.** Das ist die unvermeidliche Kehrseite davon, dass
   jede Kamera-App den Code öffnen kann (D.4.2) — der QR-Modus erlaubt die
   Anmeldung ausdrücklich auch über eine einfache Adresse
   (`…/?casinoToken=…`), weil das der ganze Sinn eines scanbaren Codes ist.
3. **Wer die Protokollstufe des Kerns auf `debug` stellt, findet Kennungen im
   Protokoll des Kerns.** TYPO3 selbst schreibt bei jeder Anmeldung einen
   Debug-Eintrag mit den rohen Anmeldedaten (`uname`) — das lässt sich ohne
   einen Eingriff in den Kern nicht abstellen. Unsere eigenen Protokoll­
   einträge (`LogFailedLogin`) enthalten dagegen **nie** eine Kennung, nur
   Absenderadresse, Länge und Wohlgeformtheit des Versuchs.
4. **Der Schutz richtet sich gegen Versehen und Neugier, nicht gegen
   Angriffe.** Das ist eine bewusste Vorgabe des Konzepts für ein Spaß-Casino
   ohne echtes Geld, keine Nachlässigkeit dieser Extension — dieselbe Vorgabe,
   die schon für den QR-Code selbst gilt (Punkt 1 oben).
5. **Ein manipulierter Browser kann einen Vorgang behaupten, den es am
   Gerät so nicht gab** — der Buchungsendpunkt (seit Ausbaustufe 3) vertraut
   dem `art`-Feld einer Anfrage, weil er nicht wissen kann, ob wirklich ein
   Hebel gezogen wurde. Was er **nicht** zulässt, ist eine falsche
   *Rechnung*: welche der drei Beträge sich um wie viel ändern, rechnet
   ausschließlich der Server selbst, nie der Browser (D.7.2) — ein
   manipulierter Aufruf kann also einen Vorgang vortäuschen, aber keine
   Zahl erfinden, die der Server nicht selbst errechnet hat. Ein Schutz
   gegen absichtliches Betrügen ist **ausdrücklich kein Ziel** dieser
   Extension (D.9, letzter Absatz; D.12) — dieselbe Vorgabe wie bei den
   ersten vier Punkten: ein Spaß-Casino ohne echtes Geld.

## Stand

**Die Phasen D1 bis D3 sind vollständig umgesetzt.** Die Extension bringt
die Modulgruppe „Casino" mit den Modulen „Spielende" und „QR-Modus" (Liste,
Anlegen, Bearbeiten über die Formularmaschine des Kerns), die automatische
Kennung, den Schattendatensatz in `fe_users`, den Abgleich der
Backend-Benutzer mit 1.000.000 Startguthaben sowie den persönlichen QR-Code
mit Ansicht, Herunterladen (SVG und PNG) und Drucken (Phase D1) — dazu den
QR-Modus-Schalter, die Anmeldung mit der Kennung (ohne Passwort, über den
Authentifizierungsdienst des Kerns), den Zugriffsschutz mit Torseite, die
Kontenleiste mit Name und Gesamtvermögen auf jeder Seite und das automatische
Zurückbuchen von Gerätegeld beim Abmelden (Phase D2) — und seit Ausbaustufe 3
(Phase D3) den Buchungsendpunkt mit seinen drei Adressen, den serverseitigen
Zustandsblock, die Sperranzeige bei Verbindungsabbruch, das freie Setzen und
Aufladen des Kassenstands als reines Admin-Werkzeug sowie den
Gerätespeicher-Endpunkt für den Coin Pusher (siehe „Der Buchungsendpunkt"
oben). Alle neun Prüfskripte dieser Extension sind grün. Der
Auslieferungszustand des QR-Modus ist **AUS**.

**Phase D4 und D5 (die Lobby) setzen diese Extension voraus, ändern aber
nichts an ihr.** Die Lobby (`casino_lobby` und die drei Tische) setzt den
QR-Modus und eine gültige Kennung voraus, **bucht aber nicht selbst** —
jeder Geldbetrag geht durch `BookingService`, denselben Weg wie jede andere
Buchung. Am 2026-09-11 live nachgemessen, an zwei Tischen, je zweimal:
„Keine einzige der 18 Anfragen an den Lobby-Endpunkt bucht einen
Geldbetrag."

Was diese Phasen bewusst **nicht** enthalten: eine Rolle, die irgendwo
angezeigt wird, Rechte im Sinne einer Zugriffsstufe jenseits von
„Admin"/„kein Admin", eine Lobby, eine Dauerabfrage oder einen
Ereignisstrom für einen von selbst aktualisierenden zweiten Tab, und einen
Schutz gegen absichtliches Betrügen (siehe „Grenzen, offen gelegt" oben,
Punkt 5). Das ist Aufgabe von Teil E und späteren Phasen von Teil D.
