# Casino Kunterbunt – Startseite

## Zweck

Site Package für das Spaß-Casino Casino Kunterbunt. Diese Extension liefert
den Vegas-Saal als Startseite, die gemeinsamen Design-Tokens (Farben,
Schriften, Abstände) und die Grundlage, auf der alle späteren
Automaten-Extensions aufbauen.

## Eckdaten

| | |
|---|---|
| Extension-Key | `casino_startpage` |
| Composer-Name | `phomo17/casino-startpage` |
| Namespace | `Phomo17\CasinoStartpage\` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Lizenz | AGPL-3.0-or-later |
| Quelltext | https://github.com/phomo17/casino-kunterbunt_t3v13classic |

## Installation

```
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_startpage
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

## Site-Set-Dateien

Das Site Set `phomo17/casino-kunterbunt` liegt unter
`Configuration/Sets/CasinoKunterbunt/`:

| Datei | Zweck |
|---|---|
| `config.yaml` | Name und Abhängigkeiten des Sets (`typo3/fluid-styled-content`) |
| `labels.xlf` | Deutsche Bezeichnungen für Set-Label, Kategorien und Einstellungen |
| `settings.definitions.yaml` | Typisierte Site-Einstellungen, z. B. der Leuchtreklame-Titel |
| `constants.typoscript` | Technische TypoScript-Konstanten (z. B. der PAGEVIEW-Template-Pfad) |
| `setup.typoscript` | Seitenrendering: `page = PAGE`, PAGEVIEW, CSS-Einbindung |
| `page.tsconfig` | Backend-Layout „Startseite (Spielsaal)“ mit der Inhaltsspalte „main“ |

## Template-Auflösung über das Backend-Layout

Die Ausgabe erfolgt über `PAGEVIEW`. Welche Fluid-Datei für eine Seite
gerendert wird, entscheidet allein das Backend-Layout der Seite: das Layout
`startseite` führt zu `Resources/Private/PageView/Pages/Startseite.html`,
eine Seite ohne eigenes Backend-Layout fällt auf
`Resources/Private/PageView/Pages/Default.html` zurück. Beide Seiten-Templates
nutzen `Resources/Private/PageView/Layouts/Default.html` als gemeinsames
Layout und binden ihre Inhalte über Partials aus `Partials/Hall/` und
`Partials/Content/` ein.

## Design-Token-Namensschema

Alle Farben, Schriften, Abstände und Zeitverhalten sind als CSS Custom
Properties in `Resources/Public/Css/tokens.css` definiert, nach dem Schema
`--ck-<material>-<abstufung|rolle>` (z. B. `--ck-neon-pink`,
`--ck-chrome-300`). Automaten-Extensions definieren **keine eigenen Farben**,
sondern greifen ausschließlich über diese Token-Namen auf die gemeinsame
Design-Grundlage zu.

**Wenn ein Token fehlt:** Braucht ein Automat einen Werkstoff, den es noch
nicht gibt (Filz, Acryl, Emaille …), gehört der neue Token nach
`tokens.css` — nicht in die Automaten-Extension. Das ist die eine erlaubte
Änderung am Site Package beim Anschließen eines Automaten, und sie ist
gestalterisch beabsichtigt: Saal und Geräte sollen aus demselben Farbvorrat
leben. Regeln dafür:

- Der Tokenname nennt den **Werkstoff**, nie das Gerät
  (`--ck-felt-green`, nicht `--ck-roulette-green`).
- Farbwerte stehen ausschließlich in `tokens.css`. Keine ausgeschriebene
  Farbe in einer Automaten-Datei.
- Die Minor-Version des Site Packages steigt, und die Automaten-Extension
  hebt ihre Untergrenze in `ext_emconf.php` und `composer.json` mit an.

## JavaScript-Konvention

JavaScript wird als ES-Modul über eine Import-Map eingebunden, nicht über
`page.includeJSModule` (existiert in TYPO3 13.4 nicht). Diese Extension
registriert das Präfix `@phomo17/casino-startpage/` für alle Module unter
`Resources/Public/JavaScript/`. Eingebunden wird ausschließlich über
`<f:asset.module identifier="@phomo17/casino-startpage/xyz.js" />`.
Automaten-Extensions importieren gemeinsame Module immer über diesen
Import-Map-Namen, nie über einen relativen Pfad zwischen Extensions. Es gibt
keinen Build-Schritt.

## Automaten-Registry

Die Registry ist die einzige Verbindung zwischen diesem Site Package und einer
Automaten-Extension. `casino_startpage` kennt keinen einzelnen Automaten.

Klasse: `Phomo17\CasinoStartpage\Automat\AutomatRegistry`

| Methode | Zweck |
|---|---|
| `register(Automat $automat): void` | Automaten anmelden. Nur aus der `ext_localconf.php` der Automaten-Extension aufrufen. |
| `all(): array<string, Automat>` | Alle angemeldeten Automaten, Schlüssel => Objekt. |
| `get(string $identifier): ?Automat` | Ein Automat oder `null`. Wirft nie. |
| `has(string $identifier): bool` | Ist dieser Schlüssel angemeldet? |

Ein unbekannter oder nachträglich entfernter Schlüssel führt nie zu einem
Fehler: `get()` liefert `null`, der DataProcessor legt `null` ins Template, das
Inhaltselement gibt nichts aus.

### So meldet sich eine Automaten-Extension an

In der `ext_localconf.php` der Automaten-Extension, ein einziger Aufruf:

```php
<?php

declare(strict_types=1);

use Phomo17\CasinoStartpage\Automat\Automat;
use Phomo17\CasinoStartpage\Automat\AutomatRegistry;

defined('TYPO3') or die();

AutomatRegistry::register(new Automat(
    identifier: 'mein_automat',
    title: 'LLL:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.title',
    description: 'LLL:EXT:mein_automat/Resources/Private/Language/locallang.xlf:automat.description',
    extensionKey: 'mein_automat',
    cabinetPartial: 'Automat/MeinAutomat/Cabinet',
));
```

#### Was eine Automaten-Extension außerdem mitbringen muss

| Datei | Was hinein muss | Warum |
|---|---|---|
| `ext_emconf.php` | `'casino_startpage' => '0.6.0-0.99.99'` unter `constraints.depends` | bestimmt in der klassischen Installation die Ladereihenfolge der `ext_localconf.php`; ohne sie kann die Registry-Anmeldung vor dem Site Package laufen |
| `Configuration/JavaScriptModules.php` | `'dependencies' => ['casino_startpage']` **und** das eigene Präfix unter `imports` | ohne den `dependencies`-Eintrag liefert der Kern das Präfix `@phomo17/casino-startpage/` nicht mit aus, und der Browser bricht mit „Failed to resolve module specifier" ab, sobald ein Modul `credit.js` oder `sound.js` importiert |
| `Configuration/TCA/Overrides/tt_content.php` | eigener `CType` über `ExtensionManagementUtility::addRecordType()`, Gruppe `AutomatContentElement::CTYPE_GROUP` | damit der Automat auf seiner eigenen Seite platziert werden kann |
| `ext_localconf.php` | zusätzlich zur Registry-Anmeldung ein `addTypoScriptSetup()` mit der Rendering-Definition des eigenen `CType` | ein eigenes Site Set würde die Site-Konfiguration ändern und damit den Grundsatz „ohne Änderung an anderen Stellen installierbar" brechen |

Nach dem Anlegen einmalig:

    ddev exec php typo3/sysext/core/bin/typo3 extension:activate <key>
    ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
    ddev exec php typo3/sysext/core/bin/typo3 cache:flush

Die bereits installierte Automaten-Extension ist das vollständige, lauffähige
Beispiel für alle vier Zeilen.

Dazu gehört die Datei

```
EXT:mein_automat/Resources/Private/Partials/Automat/MeinAutomat/Cabinet.html
```

Sie zeichnet das Gehäuse im Saal und bekommt zwei Variablen: `{automat}` (das
`Automat`-Objekt) und `{data}` (der `tt_content`-Datensatz). Fehlt die Datei,
zeigt der Saal sein Platzhalter-Gehäuse — ohne Fehler.

#### Vertrag für das Gehäuse-Partial

Das Partial liefert **genau ein** Element mit der Klasse `ck-cabinet` und
darin **genau ein** `<svg class="ck-cabinet__drawing">` mit einer `viewBox` im
Seitenverhältnis 100 : 160 (DESIGNBRIEF.md Abschnitt 1). Breite, Podest,
Schattenwurf und das Licht von oben setzt der Saal; das Gehäuse zeichnet nur
sich selbst. Farben ausschließlich über die `--ck-*`-Tokens.

Das `<svg>` trägt `aria-hidden="true"` und **kein** `<title>`: den erreichbaren Namen
der Kachel liefert der Saal über das sichtbare Namensschild. Ein Titel im SVG böte
Hilfsmitteln denselben Namen ein zweites Mal an.

`register()` hängt das Verzeichnis `Resources/Private/Partials/` der
Automaten-Extension automatisch an die `partialRootPaths` des Inhaltselements
an. Der Partial-Name muss deshalb eindeutig sein: immer in einen eigenen
Unterordner legen.

Nach dem Installieren oder Entfernen eines Automaten ist ein `cache:flush`
nötig, damit sein Gehäuse im Saal erscheint bzw. verschwindet.

Weitere Anmeldungen in TypoScript oder in der Site-Konfiguration sind für die
Saal-Ansicht **nicht** nötig.

#### Vertrag für ein bildschirmfüllendes Gerät

Ein Inhaltselement, das die volle Bildschirmhöhe braucht — ein Gerät auf
seiner eigenen Seite, das vollständig sichtbar sein muss und an dem nicht
gescrollt werden darf — setzt die Klasse **`ck-room-fill`** auf sein
äußerstes Element:

```html
<div class="mein-automat ck-room-fill"> … </div>
```

Der Saal ordnet sich daraufhin als Spalte von genau einer Bildschirmhöhe an:
Wandband oben in seiner Höhe, Boden darunter mit dem ganzen Rest. Das Element
bekommt damit einen Kasten mit **fester, bekannter Höhe**. Es darf und soll
nicht selbst mit den Maßen des Saals rechnen — diese können sich ändern.

Wer sich in diesen Kasten unter Beibehaltung eines Seitenverhältnisses
einpassen will, macht das Element zum Container und rechnet:

```css
.mein-automat        { container-type: size; display: flex;
                       align-items: center; justify-content: center; }
.mein-automat__body  { inline-size: min(100cqi, calc(100cqb / 1.6));
                       aspect-ratio: 100 / 160; }
```

Ohne die Klasse ändert sich nichts. Auf der Startseite wird sie nicht gesetzt.

## Guthaben-Schnittstelle

Das Guthaben ist eine reine Spielwährung in ganzen „Krediten" und seit
Ausbaustufe 2 **zweistufig** (CONCEPT.md B.5):

| | wo | wem | wofür |
|---|---|---|---|
| **Kasse** | `credit.js`, Schlüssel `casinoKunterbunt.credits` | allen Geräten gemeinsam | der Gesamtbestand |
| **Gerätekredit** | `machine-credit.js`, Schlüssel `casinoKunterbunt.machine.<schlüssel>` | genau einem Gerät auf genau einer Seite | damit wird gespielt |

Der Spieler entscheidet bewusst, wie viel er einem Gerät aussetzt: er wirft
aus der Kasse in das Gerät ein und holt es mit `CASH OUT` wieder heraus.
**Gespielt wird ausschließlich vom Gerätekredit.**

**Kein Automat greift selbst auf den Speicher zu** — ausschließlich über diese
beiden Module (CONCEPT.md B.5.3). Nach Ausbaustufe 2 liegen genau diese
Schlüssel im Browserspeicher:

| Schlüssel | Inhalt |
|---|---|
| `casinoKunterbunt.credits` | die Kasse |
| `casinoKunterbunt.sound` | Ton an/aus |
| `casinoKunterbunt.machine.<schlüssel>` | Spiegel eines Gerätekredits, nur zur Absturzsicherung; verschwindet bei 0 |

```js
import { credit } from '@phomo17/casino-startpage/credit.js';
```

### Eckdaten

| | |
|---|---|
| Modul | `@phomo17/casino-startpage/credit.js` |
| Speicherschlüssel | `casinoKunterbunt.credits` |
| Startguthaben (erster Besuch) | `100` |
| Kleinster Stand | `0` — ein Minusstand kann nicht entstehen |
| Größter Stand | `999999999` |
| Einheit | ganze Zahlen, keine Nachkommastellen |

### Lesen — synchron

| Aufruf | Ergebnis |
|---|---|
| `credit.balance` | aktueller Stand als Zahl. Immer aktuell, gefahrlos in einer Zeichenschleife abfragbar. |
| `credit.canAfford(betrag)` | `true`/`false`, ohne etwas zu verändern |
| `credit.format(wert?)` | deutsche Schreibweise, z. B. `1.234`. Ohne Argument der aktuelle Stand. |
| `credit.MAX_CREDITS`, `credit.MIN_CREDITS`, `credit.START_BALANCE`, `credit.STORAGE_KEY` | die Konstanten oben |

### Ändern — asynchron, immer mit `await`

| Aufruf | Ergebnis |
|---|---|
| `await credit.add(betrag)` | `{ ok: true, balance, credited, capped }` — `credited` ist der tatsächlich gutgeschriebene Betrag, `capped` ist `true`, wenn am Höchststand etwas abgeschnitten wurde |
| `await credit.subtract(betrag)` | bei genug Guthaben `{ ok: true, balance, debited }`, sonst `{ ok: false, reason: 'insufficient', balance, missing }` — im Absagefall wird **nichts** abgebucht |
| `await credit.set(betrag)` | `{ ok: true, balance }`. Nur für Verwaltung und Rücksetzen, nicht für den Spielablauf. |
| `await credit.reload()` | liest den Speicher neu ein und liefert den Stand |

`add()` und `subtract()` werfen einen `RangeError`, wenn der Betrag keine
ganze Zahl von 1 bis `MAX_CREDITS` ist. Das ist ein Programmierfehler und
soll laut sein. „Zu wenig Guthaben" ist dagegen ein normaler Spielzustand und
kommt als Rückgabewert, nicht als Ausnahme.

### Auf Änderungen hören

```js
const abmelden = credit.subscribe(({ balance, previous, reason }) => {
    meinAnzeigefeld.textContent = credit.format(balance);
});

// später, z. B. beim Verlassen der Seite:
abmelden();
```

`subscribe()` ruft den Zuhörer **sofort einmal** mit dem aktuellen Stand auf
(`reason: 'subscribe'`), damit eine frisch angebundene Anzeige nicht leer
bleibt. `reason` ist danach `'add'`, `'subtract'`, `'set'`, `'reload'` oder
`'remote'`. `'remote'` bedeutet: eine **andere Registerkarte** desselben
Browsers hat das Guthaben geändert. Diese Karten werden über das
`storage`-Ereignis mitgeführt, damit zwei geöffnete Karten nicht auseinander
laufen.

### Ein fertiges Leuchtschild statt eigener Verdrahtung

Wer keine eigene Anzeige zeichnen will, benutzt das zweite Modul und die
`data-`Attribute aus `Partials/Hall/Credit.html`:

```html
<f:asset.module identifier="@phomo17/casino-startpage/credit-display.js" />
```

Es sucht `[data-ck-credit]`, `[data-ck-credit-display]`,
`[data-ck-credit-add="…"]`, `[data-ck-credit-form]`, `[data-ck-credit-input]`
und `[data-ck-credit-status]` und verdrahtet sie. Findet es nichts, tut es
nichts — kein Fehler, keine Anmeldung.

Ein **dritter** Bedienteil liegt daneben und ist absichtlich getrennt:
`credit-set.js` mit `Partials/Hall/CreditSet.html` stellt den Kassenstand frei
ein (CONCEPT.md B.5.1, ganze Zahlen von 0 bis 999.999.999, auch nach unten).
Er benutzt `credit.set()`. **In Stufe 3 kommt der Wert vom Benutzerkonto und
dieser Bedienteil verschwindet ersatzlos** — dafür werden genau die beiden
Dateien und die eine `<f:render>`-Zeile in `Credit.html` gelöscht.

### Beschädigter oder fehlender Speicher

| Vorgefundener Wert | Ergebnis |
|---|---|
| nichts gespeichert (erster Besuch) | `100`, wird sofort geschrieben |
| Text, Komma, leer, unsinnig lang | `0`, wird zurückgeschrieben |
| negativ | `0` |
| größer als der Höchststand | auf `999999999` gekappt |
| `localStorage` gar nicht beschreibbar (privater Modus) | das Guthaben lebt nur bis zum nächsten Seitenwechsel; das Spiel läuft |

### Der Gerätekredit

```js
import { openMachineCredit } from '@phomo17/casino-startpage/machine-credit.js';

const machineCredit = openMachineCredit('mein_geraet');
```

Der Schlüssel kommt **vom Gerät**. Das Site Package führt keine Liste der
Automaten; es setzt den Namen nur hinter die feste Vorsilbe. Erlaubt sind
Buchstaben, Ziffern, Strich und Unterstrich.

**Je Schlüssel und Seite genau einer.** Ein zweiter `openMachineCredit()` mit
demselben Schlüssel wirft — zwei Stellen, die denselben Kredit getrennt
führen, wären zwei Wahrheiten über denselben Betrag. Wer ihn an einer zweiten
Stelle braucht, reicht das Objekt weiter.

#### Lesen — synchron

| Aufruf | Ergebnis |
|---|---|
| `machineCredit.amount` | der Gerätekredit als Zahl |
| `machineCredit.canAfford(betrag)` | `true`/`false`, ohne etwas zu verändern |
| `machineCredit.MAX`, `.MIN` | `999999999` und `0` |
| `machineCredit.key`, `.storageKey`, `.token` | Schlüssel, Speicherschlüssel, Kennung dieses Seitenaufrufs |
| `machineCredit.mirror` | der rohe Spiegelwert, oder `''`. **Nur zum Nachmessen** — der Ersatz für den verbotenen eigenen Speicherzugriff |

#### Ändern — asynchron, immer mit `await`

| Aufruf | Ergebnis |
|---|---|
| `await machineCredit.insert(betrag)` | Kasse → Gerät. `{ ok: true, amount, moved }` oder `{ ok: false, reason: 'nocash' \| 'full' \| 'closed', amount, moved: 0, missing? }`. **Alles oder nichts.** |
| `await machineCredit.cashOut()` | Gerät → Kasse, vollständig. `{ ok: true, moved, amount, capped }`. Ist die Kasse voll, bleibt der Rest im Gerät und `capped` ist `true` |
| `await machineCredit.stake(betrag)` | Einsatz abbuchen. `{ ok: true, amount, debited }` oder `{ ok: false, reason: 'insufficient' \| 'closed', amount, missing }`. Die Kasse wird **nicht** angefasst |
| `await machineCredit.award(betrag)` | Gewinn gutschreiben. `{ ok: true, amount, credited, capped }` |
| `await machineCredit.close()` | alles zurück in die Kasse, Spiegel weg, Zuhörer ab |

`insert()`, `stake()` und `award()` werfen einen `RangeError`, wenn der Betrag
keine ganze Zahl von 1 bis `MAX` ist — ein Programmierfehler soll laut sein.
„Kasse zu gering" und „Gerätekredit zu gering" sind dagegen normale
Spielzustände und kommen als Rückgabewert.

#### Auf Änderungen hören

```js
const abmelden = machineCredit.subscribe(({ amount, previous, reason }) => {
    meineAnzeige.textContent = credit.format(amount);
});
```

`reason` ist beim ersten, sofortigen Aufruf `'subscribe'`, danach `'insert'`,
`'stake'`, `'award'`, `'cashout'`, `'claimed'`, `'surrendered'` oder
`'closed'`.

#### Das Gerät ruft `close()`, nicht umgekehrt

Dieses Modul meldet sich **nicht** für `pagehide` an. Das Gerät ruft `close()`
aus seinem eigenen Abräumweg. Der Grund steht in CONCEPT.md B.5.4: bei einem
Münzschieber ist eine eingeworfene Münze Spielmaterial und kein Kredit mehr;
zurück in die Kasse wandert dort nur der **nicht eingeworfene** Gerätekredit.
Ein geteilter Baustein, der beim Verlassen von sich aus alles zurückbucht,
zwänge diesem Gerät eine falsche Regel auf. So bestimmt das Gerät den Umfang:
was es über `stake()` herausgenommen hat, ist beim Abräumen nicht mehr da.

#### Absturzsicherung und zwei Registerkarten

Solange ein Gerätekredit größer als 0 ist, steht er zusätzlich im Speicher als
`"<kennung>|<betrag>"`. Bei 0 wird der Schlüssel gelöscht.

| Lage | Verhalten |
|---|---|
| beim Anlegen steht dort ein Rest | wird sofort in die Kasse gebucht, der Schlüssel gelöscht, das Gerät beginnt bei 0 |
| eine andere Karte löscht meinen Eintrag | sie hat meinen Betrag gebucht → ich gehe auf 0 und buche **nichts** nach |
| eine andere Karte schreibt ihren Betrag darüber | ich buche **meinen** Betrag in die Kasse zurück und gehe auf 0 |
| die Kasse steht am Höchststand | es wird gebucht, was hineinpasst; der Rest bleibt im Gerät. Nichts verschwindet |
| kein `localStorage` (privater Modus) | keine Absturzsicherung, sonst alles wie gehabt |

Die Kennung ist der Grund, warum sich „meine Karte" und „eine andere Karte"
unterscheiden lassen. Ohne sie wäre der Fall zweier Registerkarten desselben
Geräts nicht ohne Doppelbuchung aufzulösen.

#### Nachweis

```
ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-machine-credit.mjs
```

Nur lesend, ändert keine Datei. Rückgabewert 0 bei Erfolg. Rechnet mit
`credit.js` und `machine-credit.js` **selbst** und weist nach: über eine
Spielfolge von 400 Zügen wird nach **jedem einzelnen Schritt** geprüft, dass
kein Kredit unerkannt entsteht oder verschwindet — Einsatz und Gewinn
verschieben die Summe um genau den gemeldeten Betrag, Einwurf und Auszahlung
gar nicht. Weiter: ein vorgefundener Restbetrag wird zurückgebucht und der
Spiegel gelöscht, zwei Registerkarten laufen nicht auseinander, ohne Deckung
wird nichts abgebucht, die Kappung lässt nichts verschwinden, und im
Ruhezustand liegt genau der Kassenschlüssel im Speicher.

### Was beim Umstieg auf ein serverseitiges Konto passiert

Diese Schnittstelle ist die Bruchstelle aus CONCEPT.md Abschnitt 8. Deshalb
sind die ändernden Methoden **schon heute asynchron**, obwohl der
`localStorage` synchron arbeitet.

**Bleibt unverändert:** `credit.balance`, `credit.canAfford()`,
`credit.format()`, `credit.subscribe()`, die Konstanten, die Gestalt der
Rückgabewerte, das gesamte Anzeige-Modul — und damit jede Zeile Code in jeder
Automaten-Extension.

**Ändert sich nur innerhalb von `credit.js`:** `writeStore()`/`readStore()`
werden zu `fetch()`-Aufrufen, `reload()` bekommt eine echte Netzanfrage, der
`storage`-Zuhörer weicht einer Abfrage in Abständen oder einem Server-Ereignis.
Die Entscheidung „genug Guthaben?" wandert in `subtract()` vom Browser zum
Server; weil `subtract()` bereits asynchron ist und bereits
`{ ok: false, reason: 'insufficient' }` liefern kann, merkt kein Aufrufer
davon etwas.

**Wäre die Schnittstelle heute synchron**, müsste beim Umstieg jeder Aufruf in
jeder Automaten-Extension angefasst werden. Genau das ist der Grund für die
`async`-Methoden.

## Klang-Schnittstelle

Modul: `@phomo17/casino-startpage/sound.js`. Es erzeugt Töne per Web Audio API
aus Frequenzen — **keine Audiodateien, kein Netzzugriff** (CONCEPT.md
Abschnitt 2, harte Regel 1). Es kennt kein einziges Gerät: welcher Klang zu
welchem Ereignis gehört, entscheidet die jeweilige Extension und übergibt jede
Klangbeschreibung als schlichtes Datenobjekt.

```js
import { sound } from '@phomo17/casino-startpage/sound.js';
```

### Eckdaten

| | |
|---|---|
| Speicherschlüssel | `casinoKunterbunt.sound`, Werte `'1'` und `'0'` |
| Voreinstellung | eingeschaltet (CONCEPT.md Abschnitt 3.7) |
| Geschrieben wird | erst beim ersten Umschalten durch den Spieler |
| Andere Registerkarten | über das `storage`-Ereignis mitgeführt, wie beim Guthaben |
| Gesamtlautstärke | 0,45, danach ein `DynamicsCompressorNode` |
| Stimmenobergrenze | 48 gleichzeitig geplante Quellen (bis zum Klangausbau 24) |
| Dauerklänge | höchstens 4 gleichzeitig, GETRENNT gezählt |

### Schalter

| Aufruf | Wirkung |
|---|---|
| `sound.enabled` | `true`/`false`, synchron |
| `sound.enable()` / `disable()` / `toggle()` / `setEnabled(flag)` | schaltet, speichert, meldet an alle Zuhörer; beim Ausschalten werden laufende Stimmen ausgeblendet und der Kontext angehalten |
| `sound.subscribe(fn)` | anmelden; sofortiger Erstaufruf mit `reason: 'subscribe'`, liefert die Abmeldefunktion |

**Anders als beim Guthaben sind diese Methoden synchron.** Beim Guthaben ist
das Versprechen die Bruchstelle für ein späteres serverseitiges Konto; für
einen Ton-Schalter gibt es diese Zukunft nicht.

### Klang erzeugen

| Aufruf | Wofür |
|---|---|
| `sound.tone(spec)` | ein Ton: `type`, `freq`, `freqEnd`, `duration`, `attack`, `gain`, `detune`, `filter`, `at` |
| `sound.noise(spec)` | ein Rauschstoß aus dem selbst gefüllten Puffer: `duration`, `attack`, `gain`, `rate`, `filter`, `at` |
| `sound.sequence({tones, noises})` | eine kurze Tonfolge, gemeinsam gedrosselt |
| `sound.sustain(spec)` | ein DAUERKLANG, der läuft, bis jemand ihn anhält. Liefert einen **Griff** mit `running`, `setLevel(wert, sek)` und `stop(sek)` — oder `null`, wenn der Ton aus ist, die Geste fehlt oder die Grenze erreicht wäre |
| `sound.setVolume(v)` | Gesamtlautstärke 0 bis 1 |
| `sound.stopAll()` | alles abbrechen, ausgeblendet statt abgeschnitten |

Jeder Aufruf liefert die Kontextzeit zurück, zu der der Klang endet — `0`, wenn
nichts gespielt wurde. Damit lässt sich ein Klang hinter einen anderen legen,
statt ihn darüberzulegen.

Alle drei nehmen zusätzlich `key` und `minGap` (Sekunden): derselbe Klang kann
sich damit nicht stapeln, auch nicht bei einem Ereignishagel.

`sound.sustain()` ist die Ausnahme in zweierlei Hinsicht: es wird **nicht**
gedrosselt (ein Dauerklang kann sich nicht stapeln, weil ihn jemand
ausdrücklich hält) und es wird **nicht** gegen die Stimmenobergrenze gerechnet,
sondern gegen eine eigene. Wer den Griff wegwirft, hat ein Leck gebaut: der
Klang läuft dann bis zum Verlassen der Seite weiter.

### Die Autoplay-Sperre

Browser lassen Ton erst nach der ersten Nutzerhandlung zu. Deshalb wird der
`AudioContext` **erst beim ersten `sound.unlock()` angelegt**, und auch dann
nur, wenn der Ton eingeschaltet ist und das Dokument eine Nutzeraktivierung
hat. `unlock()` gehört in einen Zuhörer für ein **echtes** Ereignis
(`event.isTrusted === true`); ein nachgemachtes Ereignis darf keine Aktivierung
vortäuschen, sonst erscheint doch eine Warnung in der Konsole. Fehlt die Geste,
liefert jeder Klangaufruf still `0`.

Wer das Modul nur importiert und nie `unlock()` ruft, bekommt keinen Kontext —
eine Seite ohne Gerät liest damit ausschließlich den Schalterzustand.

### Nachprüfen

`sound.stats()` liefert `enabled`, `contextState` (`none`/`running`/
`suspended`/`closed`), `volume`, `activeVoices`, `peakVoices`,
`startedVoices`, `droppedVoices`, `gapDrops`, `peakLevel`, `byKey` und —
getrennt davon, weil sie einer anderen Grenze unterliegen —
`sustainedVoices`, `startedSustained` und `droppedSustained`. Ein
Aufrufer schreibt diese Werte in `data`-Attribute, ein Prüfskript liest sie
dort ab: ein Klang lässt sich nicht ansehen, also wird er ablesbar gemacht.
`peakLevel` ist der größte je gemessene Ausschlag am Ausgang — 1,0 wäre
Übersteuern.

`peakLevel` ist eine **Messung** und braucht deshalb echten Ton. Wer den
Ausschlag ohne Browser nachweisen will, rechnet ihn stattdessen aus: Summe
aller Hüllkurven über die Zeit, multipliziert mit der Gesamtlautstärke. Das
Ergebnis ist eine obere Schranke, die keine Messung unterlaufen kann. Das
Prüfskript einer Automaten-Extension tut genau das.

### Beim Verlassen der Seite

`sound.shutdown()` bricht alles ab und schließt den Kontext. **Einmal je Seite,
nicht je Gerät:** alle Geräte einer Seite teilen sich einen `AudioContext`,
weil Browser deren Zahl begrenzen, jeder einen eigenen Audio-Thread kostet und
nur ein gemeinsamer Begrenzer die Summe aller Klänge sehen kann.

### Der Klangbaukasten

Modul: `@phomo17/casino-startpage/sound-kit.js`. Es steht **zwischen** der
Klangerzeugung und dem Gerät: `sound.js` weiß, *wie* ein Klang entsteht, der
Baukasten weiß, *wie eine Münze klingt*, und erst das Gerät weiß, *wann* sie
klingt. Ohne diese mittlere Ebene stünde die Frage „wie klingt eine Münze?" in
jedem Gerät noch einmal — und ein Haus, in dem jeder Automat eine andere Münze
hat, klingt nicht nach einem Haus.

```js
import { coin, coinCascade } from '@phomo17/casino-startpage/sound-kit.js';
```

| Aufruf | Klang |
|---|---|
| `coin({pitch, body, roll})` | eine Münze: Aufkommen, Klimpern, wahlweise Ausrollen |
| `coinCascade({count, spread, pitch})` | viele Münzen mit Streuung, ein gemeinsames Rauschbett statt einzelner Aufkommen |
| `metal({pitch})` | Metall auf Metall, unharmonischer zweiter Teilton |
| `sheet({duration, from, to})` | Blechrutschen: ein Rauschstoß mit wandernder Filterfrequenz |
| `ratchet({count, step, tighten})` | Klinke: kurze Klicks in enger werdendem Abstand |
| `cashRegister({size})` | Registrierkasse: Glocke, dann die aufgezogene Schublade |
| `countStep({index, steps, base})` | **ein** Schritt einer aufsteigenden, pentatonischen Zählleiter |

Jede Funktion nimmt denselben Umschlag: `at` (Versatz in Sekunden, um einen
Klang **hinter** einen anderen zu legen), `gain` (Lautstärkefaktor, 1 ist die
vorgesehene Lautstärke), `key` und `minGap` (der Mindestabstand aus `sound.js`).
Rückgabewert ist immer die Kontextzeit des Endes, `0` wenn nichts gespielt
wurde.

`countStep()` wird **einmal je sichtbarem Zählschritt** gerufen, nicht einmal
je Fahrt: eine vorausgeplante Tonfolge belegte ihre Stimmenplätze sofort alle
auf einmal und ginge falsch, sobald die Fahrt unterwegs ein neues Ziel bekommt.
Die Leiter ist pentatonisch, weil sie dadurch in **jeder** Länge und an **jeder**
Abbruchstelle richtig klingt.

Der Baukasten kennt kein Gerät: kein Element, kein Selektor, kein Ereignisname,
kein Attribut. Er *kann* keines erreichen, weil ihm nichts übergeben wird,
womit er eines erreichen könnte.

### Leerlaufgeräusche

Modul: `@phomo17/casino-startpage/idle-noise.js`. Ein leises Brummen bei 50,
100 und 150 Hz (Netzfrequenz und ihre ersten beiden Vielfachen — so brummt ein
Transformator), dazu Relaisklicken und Ticken in **zufälligen** Abständen von
2,2 bis 9 Sekunden. Ein Geräusch in festem Takt wird nach einer Minute
unerträglich, weil man anfängt, darauf zu warten.

```js
import { IdleNoise } from '@phomo17/casino-startpage/idle-noise.js';

const idle = new IdleNoise();   // ohne Argumente: es klingt wie dieses Haus
idle.start();                   // nach jeder echten Nutzergeste, beliebig oft
idle.setBusy(true);             // solange das Gerät arbeitet
idle.stop();                    // versteckter Tab, Ton aus
idle.destroy();                 // beim Abräumen des Geräts
```

**Eine Instanz JE GERÄT.** Stehen zwei Automaten auf einer Seite, brummt jeder
für sich — und wird einer abgeräumt, muss sein Brummen gehen und das des
anderen bleiben. Das ist die eine Stelle im Projekt, an der ein Abräumen
ausdrücklich einen Klang abbricht: der Kontext gehört der Seite, dieser
Dauerklang aber gehört diesem Gerät.

`start()` ist **beliebig oft aufrufbar**. Vor der ersten Geste bewirkt es
nichts (es gibt keinen Kontext und darf keinen geben), nach einem Abbruch legt
es den Klang neu an. Ein Gerät ruft es deshalb einfach bei jeder Nutzergeste
erneut, statt mitzuzählen.

`setBusy(true)` lässt Klick und Ticken vollständig schweigen und nimmt das
Brummen auf 55 % zurück — nicht auf null: ein Gerät, dessen Brummen beim
Hebelzug verstummt, klingt, als ginge es aus.

## Risiko-Leiter

Modul: `@phomo17/casino-startpage/risk-ladder.js`, dazu die Kurve in
`@phomo17/casino-startpage/risk-timing.js`. Seit Ausbaustufe 2, Phase 2
geteilter Baustein (CONCEPT.md B.6.2): mehrere Geräte brauchen sie, und die
200-ms-Sicherheitsgrenze soll genau einmal bewiesen werden.

**Hier liegt das Werk, im Gerät liegt das Aussehen.** Der Baustein kennt kein
Gehäuse, keinen Selektor, keine CSS-Klasse und keinen Ereignisnamen — er
bekommt drei Funktionen und sonst nichts. Er *kann* deshalb keinen Automaten
kennen.

```js
import { RiskLadder } from '@phomo17/casino-startpage/risk-ladder.js';

const ladder = new RiskLadder({
    draw:   () => drawIndex(2),               // Pflicht: 0 oder 1
    paint:  (view) => myPanel.render(view),   // Pflicht, muss synchron malen
    notify: (msg) => myPanel.report(msg),     // freiwillig
});
```

### Die drei angemeldeten Funktionen

| Funktion | Bedeutung |
|---|---|
| `draw()` | liefert 0 oder 1 — die Seite, mit der die nächste Stufe beginnt. Das Gerät bringt seine eigene Zufallsquelle mit; hier wird keine zweite gebaut und **nie** auf `Math.random()` zurückgefallen. Etwas anderes als 0 oder 1 wirft. |
| `paint(view)` | der einzige Weg an die Anzeige. **Muss synchron malen** — die Wertung eines Tastendrucks vergleicht gegen genau den Wert, der zuletzt übergeben wurde. |
| `notify(msg)` | freiwillig, fachliche Meldungen. Das Gerät macht daraus seine eigenen DOM-Ereignisse. |

### Bedient wird über Methoden, nicht über Ereignisse

| Methode | Ergebnis |
|---|---|
| `offer(anspruch)` | `true`, wenn übernommen; bei `false` zahlt das Gerät wie immer selbst aus |
| `start()` | Leiter läuft an, Stufe 1; `false`, wenn kein Angebot vorliegt |
| `guess('left' \| 'right')` | `'hit'`, `'miss'` oder `null` |
| `collect()` | aussteigen und gutschreiben, wirkt im Angebot wie in der Leiter, im Grundzustand gar nicht |
| `destroy()` | abräumen; ein offener Gewinn wird dabei **gutgeschrieben**, nicht verworfen |
| `ladder.phase` | `'off'` \| `'offer'` \| `'ladder'` |
| `ladder.view(reason)` | eine Momentaufnahme abholen, etwa um den Grundzustand einmal zu malen |

Welche Taste welche Methode ruft, entscheidet allein das Gerät. Genau deshalb
passt dieselbe Leiter an einen Automaten mit Hebel und an einen ohne.

### Die Momentaufnahme

`{ reason, phase, level, win, lit, sideMs, onMs, darkMs }` — `lit` ist
`'left'`, `'right'` oder `'none'`.

| `reason` | wann | was das Gerät sinnvollerweise malt |
|---|---|---|
| `init` | einmal, wenn es will | den Grundzustand |
| `offer` | ein Gewinn liegt vor | Angebotsoptik, Stufe aus. Die Gewinn-Anzeige nicht anfassen — die gehört zu diesem Zeitpunkt noch dem Spielkern des Geräts. |
| `level` | jede neue Stufe | Stufe, offener Gewinn, Lichtfeld |
| `lit` | Lichtwechsel in der Stufe | nur das Lichtfeld |
| `settled` | Fehlgriff oder Ausstieg | nur den Gewinnbetrag: 0 nach einem Fehlgriff, der gutgeschriebene Betrag nach einem Ausstieg |
| `end` | zurück im Grundzustand | alles aus; Gewinn-Anzeige nicht anfassen |

### Die Meldungen

`{ type, level, win }` mit `type` = `start`, `hit`, `miss` (zusätzlich
`lost`), `collect`, `end` — dazu `{ type: 'tick', level, lit, on }` bei jedem
Lichtwechsel.

Das Angebot wird bewusst nicht gemeldet: Ob es überhaupt zustande kommt, ist
eine Frage des Geräts — an einem Automaten mit Auto-Modus entfällt die Leiter
(CONCEPT.md 3.5). Eine abbrechbare Rückfrage in den geteilten Baustein zu
legen, hieße, ihm eine Vorstellung davon zu geben, was ein Auto-Modus ist.

### Der Anspruch

Der offene Gewinn wird als „Anspruch" übergeben: ein Betrag, der erspielt,
aber noch nicht gutgeschrieben ist.

| Feld | Bedeutung |
|---|---|
| `amount` | Zahl. Die Leiter schreibt hier hinein (verdoppeln). |
| `collect()` | schreibt gut. Rückgabewert wird nicht abgewartet. |
| `discard()` | verwirft, ohne gutzuschreiben. |

Verdoppelt werden darf laut CONCEPT.md 3.4 unbegrenzt — „kein Limit" betrifft
das Spielrecht, nicht die Rechengenauigkeit. Die **Stufe** zählt deshalb ohne
Grenze weiter. Der **Betrag** dagegen sättigt bei 2^53−1, weil JavaScript
oberhalb davon nicht mehr exakt mit ganzen Zahlen rechnet. Die Kappung auf
den auszahlbaren Höchstbetrag ist Sache des Anspruchs, nicht der Leiter.

### Die Kurve und ihre Sicherheitsgrenze

`risk-timing.js` ist reine Arithmetik und bekommt **niemals** einen Import;
eine `package.json` mit `{"type": "module"}` liegt im selben Verzeichnis, der
Kern nimmt nur `.js`-Dateien in die Import-Map auf.

```
periode(n) = 200                                  — konstant, auf JEDER Stufe
fenster(n) = max(40, round(200 × 0,85^(n+4)))
dunkel(n)  = 200 − fenster(n)
```

| Stufe | Periode je Seite | Trefferfenster | Dunkelzeit |
|---|---|---|---|
| 1 | 200 ms | 89 ms | 111 ms |
| 2 | 200 ms | 75 ms | 125 ms |
| 3 | 200 ms | 64 ms | 136 ms |
| 4 | 200 ms | 54 ms | 146 ms |
| 5 | 200 ms | 46 ms | 154 ms |
| ab 6 | 200 ms | 40 ms | 160 ms |

Bei 200 ms je Seite blitzt ein einzelnes Lichtfeld 2,5-mal je Sekunde — unter
der Grenze von drei Lichtwechseln je Sekunde, ab der Blinken bei
lichtempfindlichen Menschen Anfälle auslösen kann. Diese Grenze ist nicht
verhandelbar.

### Nachweis

```
ddev exec node typo3conf/ext/casino_startpage/Resources/Private/Scripts/verify-risk-timing.mjs
```

Nur lesend, ändert nichts. Rückgabewert 0 bei Erfolg. Rechnet mit
`risk-timing.js` **selbst**, nicht mit einer Nachbildung, und weist nach:
Periode auf jeder Stufe genau 200 ms, die Trefferfenster aus Anhang B auf die
Millisekunde, nie unter 40 ms, streng monoton fallend bis Stufe 6, ab Stufe 6
konstant. Verglichen wird ganzzahlig.

## Inhaltselement „Casino-Automat"

| | |
|---|---|
| `CType` | `casino_automat` |
| Felder | `tx_casinostartpage_automat` (Registry-Schlüssel), `tx_casinostartpage_target` (Zielseite als TypoLink) |
| Datenbank | keine `ext_tables.sql` — TYPO3 13 leitet beide Spalten aus der TCA ab |
| Rendering | `tt_content.casino_automat` (FLUIDTEMPLATE) im Site Set |
| Template | `Resources/Private/ContentElements/CasinoAutomat.html` |
| Backend-Vorschau | `Phomo17\CasinoStartpage\Backend\Preview\AutomatPreviewRenderer` |

## Stand

Version 0.1.0 (alpha). Teil A ist vollständig abgeschlossen; aus Teil B sind Phase 2,
Phase 3, Phase 4 und der Tokenbedarf von Phase 5 eingearbeitet. Die Extension liefert: den Vegas-Saal mit
Leuchtreklame, Automatenreihen und Guthaben-Schild samt freier Einstellung des
Kassenstands, die Automaten-Registry samt Inhaltselement „Casino-Automat", die
gemeinsamen Design-Tokens und **sechs** geteilte Browser-Bausteine — Kasse,
Gerätekredit, Klangerzeugung, Klangbaukasten, Leerlaufgeräusche und
Risiko-Leiter. Sie kennt keinen einzelnen Automaten und muss zum Anschließen
eines weiteren nicht geändert werden — bis auf einen fehlenden Design-Token,
siehe oben.

Mit dieser Fassung sind vier Druckfarben dazugekommen — `--ck-fruit-plum`,
`--ck-fruit-plum-shade`, `--ck-fruit-grape` und `--ck-fruit-grape-shade`. Sie
gehören zum Satz der Druckfarben für bedruckte Walzenbänder und Gewinnpläne
und heißen deshalb nach ihrem Werkstoff, nicht nach einem Gerät. Eine
Automaten-Extension, die sie braucht, verlangt in `ext_emconf.php`
`'casino_startpage' => '0.1.0-0.99.99'`.
