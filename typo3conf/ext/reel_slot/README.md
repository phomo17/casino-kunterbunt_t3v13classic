# Reel Slot

## Zweck

Erster Spielautomat des Spaß-Casinos **Casino Kunterbunt**: ein klassischer
Drei-Walzen-Automat im Chrom-und-Holz-Gehäuse der 1950er Jahre. Diese
Extension enthält alles, was dieses Spiel ausmacht — Gehäuse, Grafik, später
Regeln und Klänge. Sie lässt sich installieren und entfernen, ohne dass an
`casino_startpage` oder an einer anderen Extension etwas geändert werden muss.

## Eckdaten

| | |
|---|---|
| Extension-Key | `reel_slot` |
| Composer-Name | `phomo17/reel-slot` |
| Namespace | `Phomo17\ReelSlot\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Abhängigkeit | `casino_startpage` >= 0.4.0 (Risiko-Leiter, Gerätekredit, Klangbaukasten und Leerlaufgeräusche liegen dort) |
| Lizenz | AGPL-3.0-or-later |
| Quelltext | https://github.com/phomo17/casino-kunterbunt_t3v13classic |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate reel_slot
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Danach im Backend:

1. Unterhalb der Startseite eine Seite anlegen (kein eigenes Backend-Layout).
2. Auf diese Seite ein Inhaltselement **„Reel Slot"** legen.
   Es hat keine Einstellungen.
3. Auf der Startseite ein Inhaltselement **„Casino-Automat"** anlegen, dort
   diesen Automaten wählen und als Zielseite die Seite aus Schritt 1 angeben.

## Anmeldung bei der Registry

Ein einziger Aufruf in `ext_localconf.php`:

```php
AutomatRegistry::register(new Automat(
    identifier: ReelSlot::IDENTIFIER,
    title: ReelSlot::LANG_FRONTEND . 'automat.title',
    description: ReelSlot::LANG_FRONTEND . 'automat.description',
    extensionKey: ReelSlot::EXTENSION_KEY,
    cabinetPartial: ReelSlot::CABINET_PARTIAL,
));
```

`register()` hängt `Resources/Private/Partials/` automatisch an die
`partialRootPaths` des Inhaltselements „Casino-Automat" an. Eine weitere
Anmeldung für die Saal-Ansicht gibt es nicht.

## Inhaltselement „Reel Slot"

| | |
|---|---|
| `CType` | `reel_slot` |
| Felder | keine – das Element hat keine Einstellungen |
| Datenbank | keine eigene Spalte, keine `ext_tables.sql` |
| Rendering | `tt_content.reel_slot` (FLUIDTEMPLATE), angemeldet in `ext_localconf.php` über `addTypoScriptSetup()` |
| Template | `Resources/Private/ContentElements/Machine.html` |
| Stylesheet | `Resources/Public/Css/machine.css`, eingebunden per `<f:asset.css>` und damit nur auf Seiten geladen, auf denen das Element steht |

Bewusst **kein** Extbase-Plugin: das Element hat keine Datensätze, keine
Formulare und keine serverseitige Logik. Die Spiellogik entsteht ab Phase 6
vollständig im Browser.

## Gehäuse

`Resources/Private/Partials/Automat/ReelSlot/Cabinet.html`
zeichnet das Gehäuse als SVG und hält den Vertrag aus
`casino_startpage/README.md` ein: genau ein `.ck-cabinet`, darin genau ein
`<svg class="ck-cabinet__drawing">` mit `viewBox`-Verhältnis 100 : 160, Farben
ausschließlich über `--ck-*`-Tokens. Dieselbe Datei wird im Saal klein und auf
der Automatenseite groß dargestellt.

Diese Extension definiert **keine eigenen Farben**. Was ihr fehlte, wurde als
Token in `casino_startpage/Resources/Public/Css/tokens.css` ergänzt:
`--ck-paper-100`, `--ck-paper-200`, `--ck-print-ink`, `--ck-print-red`,
`--ck-bakelite-red`, `--ck-bakelite-red-light`.

Eigene CSS-Klassen tragen den Präfix `rs-`. Geteilt werden nur die
Vertragsklassen `ck-cabinet` und `ck-cabinet__drawing`.

## Spielkern (JavaScript)

Die Spiellogik liegt vollständig im Browser (CONCEPT.md Abschnitt 4). Sechzehn
ES-Module unter `Resources/Public/JavaScript/`, veröffentlicht über die
Import-Map in `Configuration/JavaScriptModules.php` unter dem Präfix
`@phomo17/reel-slot/`. Eingebunden wird ausschließlich
`reel-slot.js`, und zwar per `<f:asset.module>` im Inhaltselement-Template.

| Modul | Zuständig für | Importiert |
|---|---|---|
| `rng.js` | Ziehung über `crypto.getRandomValues`, ohne Modulo-Bias | – |
| `paytable.js` | Gewinntabelle und Auswertung – **die einzige Regelquelle** | – |
| `reel.js` | eine Walze: Bewegung, Rundumschluss, punktgenaue Landung | – |
| `nixie.js` | eine Röhrengruppe ansteuern (`--rs-digit`) | – |
| `lever.js` | Hebel mit Maus und Finger, federndes Zurückschnellen | – |
| `machine.js` | Zustandsmaschine, Rundenablauf, STOP, Auswertung, Anzeige | alle oben |
| `reel-slot.js` | Einstieg, Verdrahtung, Aufräumen beim Verlassen der Seite | `rng`, `machine`, `wallet`, `bank`, `risk`, `auto`, `sound` |
| `counter.js` | eine Röhrengruppe sichtbar hochzählen, Überlaufblinken; meldet jeden sichtbaren Schritt als `rs:count` | – (und bekommt keinen: ein Prüfskript lädt sie unter Node) |
| `message.js` | Meldungsschild, Texte aus `data-rs-text-*` | – |
| `payout.js` | `WinClaim` — offener Gewinn, Naht zur Risiko-Leiter | – (bekommt den Gerätekredit als Konstruktorargument von `wallet.js`) |
| `coinslot.js` | Geldeinwurf, vier Wege, Münzanimation | – |
| `wallet.js` | Verrechnung, Einsatzwahl, Sperre, GUTHABEN und EINSATZ | `machine-credit`, `nixie`, `counter`, `message`, `payout`, `coinslot` |
| `bank.js` | Kassenfenster im Sockel und die Taste CASH OUT — die einzige Datei des Automaten, die noch die Kasse liest; meldet die Auszahlung als `rs:cashout` | `credit` |
| `risk.js` | `RiskPanel` — das **Aussehen** der Risiko-Leiter: Tasten, Lichtfelder, STUFE und GEWINN. Das Werk liegt im Site Package | `rng`, `nixie`, `risk-ladder` |
| `auto.js` | Auto-Modus: Umschalter, Pause, Selbstabschaltung | – |
| `sound.js` | Zuordnung Klang ↔ Ereignis, Klappern, Ton-Schalter, Leerlaufgeräusche | `sound`, `sound-kit`, `idle-noise` |

`credit` steht für `@phomo17/casino-startpage/credit.js`, `machine-credit` für
`@phomo17/casino-startpage/machine-credit.js`, `risk-ladder` für
`@phomo17/casino-startpage/risk-ladder.js`. `sound-kit` steht für
`@phomo17/casino-startpage/sound-kit.js`, `idle-noise` für
`@phomo17/casino-startpage/idle-noise.js`.

`paytable.js` darf **niemals** einen Import bekommen: die Datei wird auch von
einem Prüfskript unter Node geladen, das die Import-Map von TYPO3 nicht kennt.
Dieselbe Regel gilt für `risk-timing.js`, das seit Ausbaustufe 2, Phase 2 in
`casino_startpage` liegt, und seit Phase 4 für `counter.js`.

Ein Automat meldet vier Ereignisse an seinem `.rs-machine`, an denen spätere
Phasen andocken, ohne `machine.js` anzufassen: `rs:round` (abbrechbar),
`rs:reelrest`, `rs:result`, `rs:state`. Er nimmt genau ein Ereignis
entgegen: `rs:spin` — „zieh jetzt den Hebel", nicht abbrechbar, mit genau der
Wirkung eines Hebelzugs samt aller Sperren.

## Kasse, Gerätekredit, Einwurf und Auszahlung

Der Automat greift **nie** selbst auf den Browserspeicher zu. Alles läuft über
die dokumentierte Schnittstelle in `casino_startpage` (CONCEPT.md B.5.3).
Deshalb nennt `Configuration/JavaScriptModules.php`
`'dependencies' => ['casino_startpage']` — ohne diesen Eintrag könnte der
Browser die Modulnamen nicht auflösen.

Seit Ausbaustufe 2, Phase 3 gibt es **zwei Töpfe** (CONCEPT.md B.5):

| | Modul | Anzeige am Gehäuse | Schlüssel im Speicher |
|---|---|---|---|
| **Kasse** — der Gesamtbestand aller Geräte | `credit.js` | Kassenfenster im Sockel | `casinoKunterbunt.credits` |
| **Gerätekredit** — was in *diesem* Gerät liegt | `machine-credit.js` | Nixie-Gruppe `GUTHABEN` | `casinoKunterbunt.machine.reel_slot` (nur als Spiegel) |

Der Gerätekredit ist beim Betreten der Seite **immer 0**. Gespielt wird
ausschließlich von ihm.

| Vorgang | Wann | Wie |
|---|---|---|
| Einwerfen | Münzschlitz, drei Messingknöpfe, freies Feld, Eingabetaste | `machineCredit.insert()` — **alles oder nichts**; reicht die Kasse nicht, `KASSE ZU GERING` |
| Einsatz abbuchen | beim Hebelzug, im Zuhörer von `rs:round` | synchrones `canAfford()` entscheidet über das Veto, `stake()` wird im selben Takt angestoßen |
| Zu wenig Gerätekredit | ebenda | `preventDefault()`, Meldungsschild `GUTHABEN ZU GERING`, **keine Abbuchung**; nachwerfen ist jederzeit möglich |
| Gewinn gutschreiben | nach `rs:result` | abbrechbares `rs:payout` mit einem `WinClaim`; sagt niemand etwas, wird sofort dem **Gerätekredit** gutgeschrieben |
| Auszahlen | Taste `CASH OUT` auf der Auswurfschale | `machineCredit.cashOut()`; dunkel und gesperrt, wenn nichts drin ist |
| Seite verlassen | `pagehide` → `Wallet.destroy()` | `machineCredit.close()` bucht alles zurück und löscht den Spiegel. Neuladen zählt als Verlassen |
| Absturz | beim nächsten Öffnen dieser Seite | ein vorgefundener Restbetrag wandert sofort in die Kasse, der Spiegel wird gelöscht |
| Einsatzwahl sperren | bei `rs:state` | offen nur in `idle` und `result`, sonst `.rs-bets--locked` |

Warum die Abbuchung trotz asynchroner Schnittstelle sicher ist und was
passiert, wenn sie später einmal scheitert: ausführlich im Kopf von
`wallet.js`. Wie sich zwei geöffnete Registerkarten desselben Geräts
auflösen: im Kopf von `machine-credit.js` und in `casino_startpage/README.md`.

**Der Auto-Modus** hat für diese Phase **keine Zeile** gebraucht. Er prüft das
Geld nicht selbst, sondern liest das Ergebnis des Vetos ab (`auto.js`) — und
das Veto steht seit B.5 auf dem Gerätekredit. Er schaltet sich also von allein
ab, wenn der Gerätekredit nicht mehr reicht, und wirft nicht selbst nach.

**Anzeigen — je eine Stelle, nie zwei:**

| Anzeige | Eigentümer |
|---|---|
| `GUTHABEN` (Gerätekredit, zählt sichtbar hoch) | `wallet.js` |
| `EINSATZ` (springt: Schalterstellung, kein Zählerstand) | `wallet.js` |
| `STUFE` | `risk.js` |
| `GEWINN` | `machine.js` → `risk.js` → `machine.js`, wechselnd |
| Kassenfenster, `CASH OUT` | `bank.js` |

Läuft eine Röhrengruppe über, zeigt sie lauter Neunen und blinkt.

**Kasse im Saal und am Gerät:** dafür gibt es keinen eigenen Code. `credit.js`
schreibt in einen gemeinsamen Speicherschlüssel und führt andere
Registerkarten über das `storage`-Ereignis mit; beides landet über die
Anmeldung in `bank.js` im Kassenfenster.

**Von außen ablesbar** (am `.rs-machine`, für Prüfungen): `data-rs-machine-credit`
und `data-rs-mirror` (von `wallet.js`), `data-rs-bank`, `data-rs-total` (die
Bilanz als eine Zahl) und `data-rs-cashout` (von `bank.js`). Je Attribut genau
ein Schreiber.

### Fünf weitere Ereignisse am `.rs-machine`

| Ereignis | abbrechbar | `detail` |
|---|---|---|
| `rs:coin` | nein | `{ amount, moved, reason, machineCredit }` — `reason` ist `'ok'`, `'nocash'` oder `'full'` |
| `rs:payout` | **ja** | `{ win, bet, claim }` — `preventDefault()` behält den Gewinn zurück |
| `rs:collect` | nein | `{ amount, credited, capped, machineCredit }` |
| `rs:count` | nein | `{ display, value, index, steps, direction }` — **ein Ereignis je sichtbarem Zählschritt**, ausgelöst am Element der Röhrengruppe. `snap()` löst keines aus: das ist ein Setzen, kein Zählen |
| `rs:cashout` | nein | `{ moved, capped, machineCredit }` — **nur** von der Taste `CASH OUT`, nach der Buchung. Die Rückbuchung beim Verlassen der Seite läuft nicht durch diese Stelle und bleibt deshalb baulich stumm |

## Risiko-Leiter und Auto-Modus

Die Leiter ist ein eigener Zustandsautomat (`off` / `offer` / `ladder`).
**Seit Ausbaustufe 2, Phase 2 liegt ihr Werk nicht mehr hier**, sondern als
geteilter Baustein in `@phomo17/casino-startpage/risk-ladder.js`
(CONCEPT.md B.6.2): Blinken, Wertung und die Verwaltung des offenen Gewinns
samt Kappung. `risk.js` ist nur noch das **Bedienfeld** (`RiskPanel`) — es
sucht die Tasten, Lichtfelder und Röhrengruppen dieses Gehäuses, meldet drei
Funktionen an (`draw`, `paint`, `notify`) und übersetzt zwischen den
`rs:`-Ereignissen und den Methoden der Leiter. Anleitung:
`casino_startpage/README.md`, Abschnitt „Risiko-Leiter".

Die **Schwierigkeitskurve** ist neu (CONCEPT.md Anhang B): die Periode
beträgt auf jeder Stufe konstant 200 ms, schwerer wird die Leiter
ausschließlich über das Trefferfenster — 89 / 75 / 64 / 54 / 46 ms, ab
Stufe 6 konstant 40 ms. Die 200 ms sind die unverhandelbare
Sicherheitsgrenze; nachgewiesen wird sie vom Prüfskript im Site Package
(`ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-risk-timing.mjs`).

`machine.js` hat für die Leiter **keinen** Zustand bekommen und bleibt
währenddessen in `result`. Der Auto-Modus ist ein zweiter, sehr kleiner
Zustandsautomat in `auto.js`. Beide fassen den Spielkern nicht an; verständigt
wird sich ausschließlich über Ereignisse am `.rs-machine`. Die Ereignisse und
ihre `detail`-Felder sind gegenüber Teil A unverändert geblieben — deshalb
musste für den Umzug in `auto.js` und `sound.js` keine Zeile geändert werden.

| Ereignis | abbrechbar | `detail` | Sender |
|---|---|---|---|
| `rs:risk` | nur bei `phase: 'offer'` | `{ phase, level, win }` – `phase` ist `offer`, `start`, `hit`, `miss`, `collect` oder `end` | `risk.js` |
| `rs:risktick` | nein | `{ level, lit, on }` | `risk.js` |
| `rs:riskcollect` | nein | – | von außen; steigt aus und schreibt gut |
| `rs:spin` | nein | – | von außen; löst eine Runde aus |
| `rs:auto` | nein | `{ on, reason, rounds }` | `auto.js` |

Der Auto-Modus in vier Sätzen: `AUTO MODE` leuchtet, wenn er an ist. Nach jeder
Auswertung wartet er rund eine Sekunde und sendet dann `rs:spin`. Das Angebot
der Risiko-Leiter bricht er ab, deshalb wird jeder Gewinn sofort gutgeschrieben.
Kommt eine Runde nicht zustande — weil der Gerätekredit `rs:round` wegen zu
geringen Guthabens abbricht —, schaltet er sich ab; von selbst wieder ein
schaltet er nie.

## Klang

Alle Klänge entstehen im Browser aus Frequenzen — keine Audiodatei, kein
Netzzugriff (CONCEPT.md Abschnitt 3.7). Die Erzeugung liegt in
`@phomo17/casino-startpage/sound.js` und kennt kein Gerät; **welcher** Klang zu
**welchem** Ereignis gehört, steht ausschließlich in `sound.js` dieser
Extension. Diese Datei hört nur zu: sie ändert keinen Zustand des Spiels,
bricht kein Ereignis ab und importiert weder `machine.js` noch `wallet.js`,
`risk.js` oder `auto.js`.

| Ereignis | Klang |
|---|---|
| `rs:state` → `spinning` | Klack der Klinke plus anlaufendes Werk; danach beginnt das Klappern |
| Zeitgeber alle 85 ms während `spinning`/`stopping` | Klappern des Walzenlaufs, rund 12 Rasten je Sekunde |
| `rs:state` → `evaluating` | Klappern endet |
| `rs:state` in `spinning`/`stopping`/`evaluating` | die Leerlaufgeräusche treten zurück |
| `rs:reelrest` | Walzenstopp, je Walze eine Stufe tiefer |
| `rs:result` | Gewinn-Jingle, vier Stufen nach `detail.factor` |
| `rs:collect` | Registrierkasse und Münzkaskade, gestaffelt nach `detail.credited` — bei 0 bleibt es still |
| `rs:count` | ein Schritt der pentatonischen Zählleiter, **nur** für `GUTHABEN` und **nur** aufwärts |
| `rs:coin` mit `reason: 'ok'` | Münzeinwurf |
| `rs:coin` mit `reason ≠ 'ok'` | **Absage 1:** zwei dumpfe Anschläge, kein Metall |
| `rs:cashout` mit `moved > 0` | Klappe der Auswurfschale, danach die Münzen |
| `rs:round` am Dokument mit `defaultPrevented` | **Absage 2:** ein einzelner tiefer Anschlag |
| `rs:risk` `phase: 'hit'` / `'miss'` | Aufwärts-Zweiklang / absackender Sägezahn |
| `rs:risk` `phase: 'start'` … `'end'` | die Leerlaufgeräusche treten zurück |
| `rs:risktick` mit `detail.on === true` | metallischer Pip, links 1175 Hz, rechts 1397 Hz |
| `rs:auto` | Relaisklack, an höher als aus |

**Drei Ebenen, nicht zwei.** `sound.js` im Site Package weiß, *wie* ein Klang
entsteht; `sound-kit.js` weiß, *wie eine Münze klingt*; diese Extension weiß,
*wann* sie klingt. Deshalb steht seit dem Klangausbau in `sound.js` dieser
Extension keine Frequenz mehr für Münze, Kasse, Metall, Blech und Zählschritt.
Die Frequenzen der geräteeigenen Klänge — Hebel, Walzenstopp, Klappern,
Jingle, Risiko, AUTO, Ton-Schalter — bleiben hier: sie sind die Klangsprache
genau dieses Automaten.

**Die Leerlaufgeräusche** (Brummen, Relaisklick, Ticken) gehören diesem
Gehäuse, nicht der Seite: eine `IdleNoise` je Automat. Sie schweigen
vollständig, solange das Gerät arbeitet — und das kommt aus **zwei** Quellen,
dem Rundenzustand und der laufenden Risiko-Leiter. Beide zusammen: eine Leiter
läuft im Zustand `result` weiter, in dem der Spielkern längst ruht, und ein
Relaisklick zwischen zwei Blinkschritten klänge wie ein Defekt.

**Zwei Absagen, und eine dritte, die stumm bleibt.** Eine abgelehnte Münze
klingt anders als ein abgelehnter Hebelzug — die eine fällt durch, beim anderen
passiert einfach nichts. Der Hebelzug **in der Risiko-Leiter** bleibt
absichtlich still: `risk.js` fängt `rs:round` in der Erfassungsphase am
Dokument ab, das Ereignis erreicht die Blasenphase nie, und währenddessen
blinkt und piept es ohnehin zehnmal je Sekunde. Beide hörbaren Absagen haben
eine **sichtbare** Entsprechung am Meldungsschild; der Klang ist Zugabe, nie
die einzige Auskunft.

**Die vier Stufen des Jingles** richten sich nach dem Faktor, nicht nach dem
Betrag — derselbe Walzenbefund muss immer gleich klingen:

| Stufe | Faktoren | Zeilen | Anteil aller Züge | Länge |
|---|---|---|---|---|
| klein | 1, 3 | Kirschen-Sonderzeilen | 35,5 % | 530 ms |
| mittel | 5 – 14 | Dreiertreffer der Früchte | 5,2 % | 420 ms |
| groß | 20, 50 | Glocke, BAR | 0,125 % | 790 ms |
| Jackpot | 100 | Sieben ×3, 1 zu 4000 | 0,025 % | 1530 ms |

**Der Ton-Schalter** in der Sockelreihe schaltet um, die Einstellung überlebt
das Neuladen und gleicht sich über mehrere Registerkarten ab. Der Automat
fasst den Browserspeicher dafür **nicht** an; der Wert gehört dem Site Package,
genau wie das Guthaben.

**Die Autoplay-Sperre** ist so abgefangen: beim Laden entsteht kein
`AudioContext`. Er wird beim ersten **echten** Zeigerdruck auf dem Gehäuse
angelegt und startet dadurch sofort im Zustand `running` — keine Warnung in der
Konsole. Ein nachgemachtes Ereignis (`isTrusted === false`) gilt ausdrücklich
nicht als Geste; ein Prüfskript muss echte Eingaben benutzen.

**Nachprüfbar am `.rs-machine`:** `data-rs-sound-state`,
`-context`, `-played`, `-peak-voices`, `-dropped`, `-gap`, `-level`, `-keys`,
`-sustained` und `-sustain-dropped`. `-level` ist der größte **gemessene**
Ausschlag am Ausgang; 1,000 wäre Übersteuern. `-sustained` zählt die laufenden
Dauerklänge und ist zugleich die Leckprüfung: nach dem Abräumen des letzten
Geräts muss dort 0 stehen. Die Zahlen gelten für die **Seite**, nicht für das
einzelne Gehäuse — alle Geräte teilen sich einen `AudioContext`.

### Nachweis des Klangs

```
ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-sound.mjs
```

Nur lesend. Rückgabewert 0, wenn alles stimmt, sonst 1.

Das Skript lädt **fünf echte Module über zwei Extensions** — dieselben
Dateien, mit denen der Browser klingt —, stellt Web Audio als reine
Buchführung nach, spielt 25 Runden und prüft acht Punkte:

1. Vor der ersten **echten** Geste entsteht kein Kontext und klingt nichts.
2. Der Zählklang hängt an der Fahrt: ein Ton je sichtbarem Schritt, keiner
   beim Setzen, keiner abwärts, keiner für eine fremde Anzeige.
3. Zwei hörbar verschiedene Absagen — und eine dritte, die stumm bleibt.
4. `CASH OUT` klingt nur, wenn wirklich Geld geflossen ist.
5. Genau ein Brummen je Gehäuse, es hängt wirklich am Ausgang, es schweigt bei
   Arbeit, und Ton-Schalter wie Registerkartenwechsel nehmen es mit.
6. Zwei Gehäuse stören einander nicht.
7. 25 Runden ohne eine einzige verworfene Stimme und ohne Konsolenausgabe;
   nach dem Abräumen bleibt kein Dauerklang zurück.
8. Der **ausgerechnete** Ausschlag über den ganzen Lauf bleibt unter 1,0.

Ausgerechnet und nicht gemessen: gemessen würde unter Node überall 0 stehen,
weil dort nichts klingt. Stattdessen wird die Summe aller Hüllkurven über die
Zeit mit der Gesamtlautstärke multipliziert — eine **obere Schranke**, die
keine Messung unterlaufen kann.

## Walzenbänder und Nachweis der Auszahlungsquote

CONCEPT.md, Teil B, Abschnitt **B.13 (Anhang C)** verlangt den rechnerischen
Nachweis über alle 20 × 20 × 20 = 8000 Kombinationen für die seit Ausbaustufe 2
gültige Zielquote von **exakt 98,000 %**. Anhang A aus Teil A ist damit
überholt. Das Prüfskript benutzt dafür **dieselbe** Auswertung wie das Spiel
(`paytable.js`) und dieselben Walzenbänder wie das Markup
(`Classes/Rules.php`).

### Symbolzahlen je Walze (Anhang C)

| Symbol | Walze 1 | Walze 2 | Walze 3 |
|---|---|---|---|
| Kirsche | 8 | 9 | 5 |
| Zitrone | 3 | 3 | 4 |
| Orange | 2 | 3 | 2 |
| Melone | 2 | 2 | 2 |
| Glocke | 2 | 1 | 3 |
| BAR | 2 | 1 | 2 |
| Sieben | 1 | 1 | 2 |
| **Summe** | **20** | **20** | **20** |

### Walzenfolgen (Position 1 bis 20, Position 20 grenzt an Position 1)

**Walze 1**
`Kirsche · Zitrone · Orange · Kirsche · Melone · Kirsche · Glocke · BAR ·
Kirsche · Zitrone · Kirsche · Sieben · Orange · Kirsche · Zitrone · Kirsche ·
Melone · Glocke · Kirsche · BAR`

**Walze 2**
`Kirsche · Zitrone · Kirsche · Orange · Kirsche · Melone · Glocke · Kirsche ·
Zitrone · Kirsche · Orange · Kirsche · BAR · Kirsche · Zitrone · Orange ·
Kirsche · Melone · Kirsche · Sieben`

**Walze 3**
`Kirsche · Zitrone · Glocke · Orange · Kirsche · Melone · Zitrone · BAR ·
Kirsche · Glocke · Sieben · Zitrone · Kirsche · Orange · Melone · Glocke ·
Kirsche · Zitrone · BAR · Sieben`

Auf keiner Walze stehen zwei gleiche Symbole nebeneinander — auch nicht über
den Übergang von Position 20 zu Position 1.

### Aufruf

```
ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-payout.mjs
```

Nur lesend. Rückgabewert 0, wenn alles stimmt, sonst 1.

Ergebnis (nachgewiesen, Stand Ausbaustufe 2, Phase 2):

| Zeile | Kombinationen | Wahrscheinlichkeit | Beitrag zur Quote |
|---|---|---|---|
| Sieben × 3 (100) | 2 | 0,00025 | 0,02500 |
| BAR × 3 (50) | 4 | 0,00050 | 0,02500 |
| Glocke × 3 (20) | 6 | 0,00075 | 0,01500 |
| Melone × 3 (14) | 8 | 0,00100 | 0,01400 |
| Orange × 3 (10) | 12 | 0,00150 | 0,01500 |
| Zitrone × 3 (8) | 36 | 0,00450 | 0,03600 |
| Kirsche × 3 (5) | 360 | 0,04500 | 0,22500 |
| Kirsche auf 1 und 2 (3) | 1080 | 0,13500 | 0,40500 |
| Kirsche nur auf 1 (1) | 1760 | 0,22000 | 0,22000 |
| kein Gewinn | 4732 | 0,59150 | 0,00000 |
| **Summe** | **8000** | **1,00000** | **0,98000** |

Trefferhäufigkeit 3268 / 8000 = **0,40850** — auf die fünfte Nachkommastelle
identisch mit dem bisherigen Gerät. Jackpot 1 zu 4000, damit genau auf dem in
Anhang C erlaubten Rand (Band 1:1000 bis 1:4000).

Zusätzlich weist das Skript nach, dass die Dreierkombinationen **streng
fallend** nach Gewinnwert seltener werden: Zitrone (36) > Orange (12) >
Melone (8) > Glocke (6) > BAR (4) > Sieben (2) — die in Phase 2 zusätzlich
verlangte Bedingung.

Verglichen wird ganzzahlig: die Quote 0,98000 ist gleichbedeutend mit einer
Auszahlungssumme von **7840** Einsatz-Einheiten bei 8000 Kombinationen. Im
Skript steht kein Vergleich zweier Kommazahlen.

Die Auswahl dieser Walzenfolgen aus 3521 gleichermaßen gültigen Verteilungen
sowie die geprüften und verworfenen Alternativen stehen in `DECISIONS.md`
unter „Ausbaustufe 2, Phase 2 (Teil a: Walzenbänder)".

### Nachweis der Negativliste

```
ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-cabinet.mjs
```

Nur lesend, ohne jede Abhängigkeit. Rückgabewert 0, wenn alles stimmt,
sonst 1. Geprüft wird (Kennung A-1): kein fremder Hersteller-, Modell- oder
Spieltitel in dieser Extension — gegen dieselbe Negativliste wie in
`coin_pusher`/`roulette`/`fruit_risk` `verify-cabinet.mjs` (dort A-5) und in
`video_slot` `verify-cabinet.mjs` (dort A-13). Neu seit dem Behebungslauf
2026-09-06: bis dahin deckte keine Negativlisten-Prüfung des Projekts diese
Extension ab.

## Barrierefreiheit

Behebungslauf 2026-09-05/06 (AUDITREPORT-2026-09-05.md). Behoben:

- **A-05 · Walzenbänder ohne Namen.** Die drei `svg.rs-reel__strip`
  (`Machine/Reel.html`) tragen jetzt `aria-hidden="true"`: das Band ist
  Zeichnung, kein Inhalt, und für ein Hilfsmittel war es sonst ein
  namenloses Bild (WCAG 1.1.1). Video Slot und FruitRisk machen es an
  derselben Stelle bereits so.
- **A-06 · CASH OUT am Münzschieber** betraf dieses Gerät nicht mehr — es
  behebt seit dem Vorlauf bereits `aria-disabled` statt `disabled`.
- **A-08 · Tastenbeschriftungen knapp unter dem Sollwert.** STOP, AUTO MODE
  und RISK erreichten bei 7,5 px nur 4,22–4,36:1 statt 4,5:1 (SC 1.4.3), weil
  `.rs-btn__label` direkt auf der gezeichneten Bedienleiste liegt, ohne
  eigenen Untergrund. `.rs-btn__label:not(:empty)` legt jetzt ein
  blickdichtes Namensschild (`--ck-chrome-100`) dahinter — übernommenes
  Muster aus `fruit_risk/machine.css` (dort N-01/A-30). Nachgemessen (1440 px,
  `rgb(61, 69, 76)` auf `rgb(246, 249, 251)`): **9,22:1**. `:not(:empty)`
  lässt die beiden unbeschrifteten Risiko-Tasten (risk-left/risk-right)
  ausdrücklich aus — ein Schild ohne Schrift wäre ein sichtbarer Fleck.
- **N-04 · Drei Live-Bereiche füllten sich innerhalb von 300 ms nach dem
  Laden**, bevor irgendjemand etwas bedient hatte: „Guthaben: 0",
  „Einsatz: 1", „Kasse: 100". Ursache war dieselbe Falle wie beim FruitRisk
  vor dessen Fertigstellung: `NixieGroup.announce()` (`nixie.js`) sagt die
  ALLERERSTE Ansage ohne Wartezeit an, und `Bank.paint()` (`bank.js`) sagte
  bei jedem Aufruf an — auch beim synchronen Erstaufruf aus `subscribe()`,
  der nur den Anfangszustand herstellt. `show()`/`clear()` (`nixie.js`) und
  `snap()`/`paint()` (`counter.js`) nehmen jetzt ein zweites Argument
  `announce` (Vorgabe `true`); `wallet.js` ruft den allerersten Anfangsstand
  damit `false` auf. `bank.js` reicht den `reason` aus `subscribe()` durch
  `paint(reason)` und sagt bei `reason === 'subscribe'` nichts an. Die
  sichtbaren Röhren und das Kassenfenster zeigen ihren Anfangsstand
  weiterhin sofort — nur die Ansage bleibt beim bloßen Laden aus.

**Eine Grenze, ehrlich benannt statt behoben — A-07, Zielgröße der
Münztasten:** `+10`/`+50`/`+100` (`.rs-coinslot__button`) erreichen 24×24 px
(SC 2.5.8) erst **ab 480 px Fensterbreite**. Gemessen:

| Fensterbreite | `+10` | `+50` | `+100` |
|---|---|---|---|
| 360 px | 18,7 × 19,0 | 18,7 × 19,0 | 21,6 × 19,0 |
| 480 px | 25,3 × 25,7 | 25,3 × 25,7 | 29,1 × 25,7 |
| 768 px | 25,3 × 25,7 | 25,3 × 25,7 | 29,1 × 25,7 |

Geprüft, ob eine Vergrößerung innerhalb der Maßordnung des Gehäuses möglich
ist (`machine.css`, Abschnitt 4, Koordinatentabelle): die drei Knöpfe liegen
in einem 20 Einheiten breiten Block (x 8–28), unmittelbar gefolgt vom
gezeichneten Münzschlitz (x 30–37, nur 2 Einheiten Abstand). Um bei 360 px
auf 24 px Breite zu kommen, müsste der Block auf rund 25 Einheiten wachsen —
er schöbe sich damit in den gezeichneten Schlitz hinein. Das ist dieselbe
Rechnung, die `video_slot/machine.css` (Audit V-04) für den
Mittelpunktsabstand derselben drei Knöpfe bereits aufgestellt und verworfen
hat: „Behebbar nur durch eine Neuaufteilung der Sockelreihe an BEIDEN
Geräten." Eine Vergrößerung, die den Münzschlitz verschiebt oder das Gehäuse
sonst verzieht, wurde deshalb nicht vorgenommen — anders als beim Vorbild
FruitRisk (dort war für die Geldbedienteile ungezeichneter Freiraum bis zur
nächsten festen Zone vorhanden, hier nicht).

## Stand

Version 0.4.0 (alpha). Teil A ist vollständig abgeschlossen (Phasen 4 bis 11): Gerüst
und Registry-Anmeldung, das vollständige Gehäuse, der Spielkern samt
nachgewiesener Quote, die Verrechnung, die Risiko-Leiter, der Auto-Modus und
der Klang.

Aus Teil B sind eingearbeitet: Phase 1 (Umbenennung auf Reel Slot), Phase 2
(neue Walzenbänder mit der Quote 98,000 %, neue Schwierigkeitskurve, Umzug der
Risiko-Leiter), Phase 3 (Kasse und Einwurf nach B.5) und Phase 4 (Klangausbau
nach B.7: Klangbaukasten, Leerlaufgeräusche, Zählklang, Münzkaskade, zwei
Absagen, `rs:count` und `rs:cashout`, Nachweisskript).

Als Nächstes: Phase 5 (Video Slot: Gerüst, Registrierung, Gehäuse).
