# Coin Pusher

## Zweck

Münzschieber klassischer westlicher Bauart, dritter Automat des Spaß-Casinos
**Casino Kunterbunt**: ein Feld voller Münzen, eine Schubplatte, die
gleichmäßig vor und zurück fährt, eine Abwurfkante vorn und zwei seitliche
Verlustschächte.

## Eckdaten

| | |
|---|---|
| Extension-Key | `coin_pusher` |
| Composer-Name | `phomo17/coin-pusher` |
| Namespace | `Phomo17\CoinPusher\` |
| CSS-Präfix | `cp-` |
| Import-Präfix | `@phomo17/coin-pusher/` |
| TYPO3-Version | 13.4 (klassische, nicht Composer-basierte Installation) |
| Version | 0.2.0 (alpha) |
| Lizenz | AGPL-3.0-or-later |

## Stand

Phase 8 ist mit beiden Läufen vollständig eingearbeitet: die
Extension-Metadaten (`composer.json`, `ext_emconf.php`, `LICENSE`), der
vollständige Physikkern (`rng.js`, `field.js`, `storage.js`) und alle vier
Nachweisskripte (`verify-physics.mjs`, `tune-chute.mjs`, `verify-payout.mjs`,
`measure-frames.mjs`). Die Auszahlungsquote ist eingestellt und über 100.000
Münzen je Wert nachgewiesen (Abschnitt „Quote" unten).

**Gegenüber der ursprünglichen Planung dieser Phase gab es drei
Berichtigungen** – im Einzelnen in `DECISIONS.md` festgehalten:

1. Ein Kapazitätsfehler in `field.js` (Feldgröße genau `COIN_CAP_MAX` statt
   `COIN_CAP_MAX + 1`) konnte Münzen unbemerkt beschädigen, sobald das Feld
   die Obergrenze erreichte – behoben.
2. Die Maßordnung wurde zweimal neu ausgelegt: von einem zu tiefen Feld
   (Berührungskette riss) über ein Feld ohne Seitenwand (Verlust sättigte
   unabhängig von der Schachtbreite) zur jetzigen Fassung mit fester Wand
   hinter einem echten, nur vorn liegenden Verlustschacht.
3. Die Prüfung `F-8` fragte ursprünglich nach dem Bestand, der sich für
   einen einzelnen Münzwert im Dauerbetrieb einpendelt – B.9.3 verlangt das
   aber nicht; sie fragt nach der **eingestellten** Obergrenze. Korrigiert.

**Die Bildratenmessung ist NICHT gelaufen** – im DDEV-Container fehlen die
Playwright-Browser-Binärdateien (`~/.cache/ms-playwright` existiert nicht).
`measure-frames.mjs` ist fertig geschrieben, installiert aber nichts von
sich aus und bricht mit einer klaren Meldung ab. Offener Punkt, siehe
Abschnitt „Bildrate".

**Phase 9, Lauf 1 ist eingearbeitet:** die Registrierung bei der
Automaten-Registry (`Classes/CoinPusher.php`, `ext_localconf.php`), das
eigene Inhaltselement (`Configuration/TCA/Overrides/tt_content.php`,
`Configuration/Icons.php`, beide Icons), das Gehäuse (Fluid-Partials,
`machine.css`), die Zeichenfläche mit bis zu 200 laufenden Münzen
(`view.js`, `pusher.js`), der dauerhafte Spielstand samt Grundhaufen beim
ersten Besuch (`store.js`, `seed.js`), die Lichtdrossel der Auswurfschale
(`lamp.js`), das Einstiegsmodul (`coin-pusher.js`), die Aktivierung, die
Seite `/coin-pusher` und die Kachel im Saal
(`build-coin-pusher-structure.php`, Wegwerfskript im Projektstamm). Beide
Nachweisskripte dieses Laufs (`verify-cabinet.mjs`, `verify-view.mjs`)
bestehen vollständig, ebenso `verify-physics.mjs` als Regressionsprüfung des
unangetasteten Physikkerns.

**Phase 9, Lauf 2 ist eingearbeitet — das Gerät ist vollständig bedienbar.**
Acht neue JavaScript-Module verdrahten Bedienung, Verrechnung, Anzeigen und
Klang, ohne dass Lauf 1 dafür ein einziges Zeichen an Fluid, CSS oder XLIFF
ändern musste:

- `press.js` — der gemeinsame Tastenhelfer für Zeiger und Tastatur.
- `message.js` — das Meldungsschild über dem Feld.
- `nixie.js` — der Treiber der elf Röhren (GUTHABEN wird **gesetzt**, nicht
  gefahren — es gibt kein `counter.js` in dieser Extension, siehe Abschnitt
  „Der Klang").
- `wallet.js` — der Gerätekredit: legt ihn an, bucht Münzeinwürfe ab,
  schreibt gefallene Münzen gut, schließt ihn beim Verlassen der Seite.
- `bank.js` — das Kassenfenster im Sockel und die Taste CASH OUT.
- `moneyslot.js` — der Geldeinwurf am Sockel (Kasse → Gerätekredit).
- `coinslot.js` — die Münzwertwahl und der Münzeinwurf über dem Feld
  (Gerätekredit → Spielmaterial).
- `sound.js` — das Klangpult dieses Geräts.

`coin-pusher.js` wurde dafür **erweitert, nicht umgebaut**: neue Importe,
neue Mengen für das Aufräumen, eine erweiterte Bau- und Abräumreihenfolge.
Die einzige Notlösung aus Lauf 1 — der Zweig „keine sichere Zufallsquelle"
setzte Klasse und Text des Meldungsschilds von Hand — ist durch
`MessageBoard.show('norng')` ersetzt.

Beide neuen Nachweisskripte (`verify-credit.mjs`, `verify-sound.mjs`)
bestehen vollständig, ebenso die drei Nachweise aus Lauf 1 und Phase 8
(`verify-cabinet.mjs`, `verify-view.mjs`, `verify-physics.mjs`).

**Der Geldfluss dieses Geräts — drei Töpfe statt zwei.** CONCEPT.md B.5.4
macht aus einer eingeworfenen Münze **Spielmaterial**, keinen Kredit mehr:

```
   KASSE                 GERÄTEKREDIT                 FELD
   (allen Geräten        (nur dieses Gerät,           (Spielmaterial,
    gemeinsam)            beim Betreten 0)             KEIN Geld)
      │                        │                         │
      │  Geldeinwurf           │   Münzeinwurf über      │
      │  am Sockel             │   dem Feld              │
      ├──── moneyslot.js ─────►│──── coinslot.js ───────►│
      │                        │                         │
      │  CASH OUT              │   Münze fällt vorn      │
      │◄──── bank.js ──────────│◄──── wallet.js ─────────┤
      │                        │                         │
      │  Verlassen der Seite   │   seitlich / Ventil     │
      │◄──── wallet.js close ──│                    ─────┴──► weg
```

Vier Zusagen, jede über `verify-credit.mjs` nachgewiesen: (1) beim Verlassen
der Seite wandert nur der **Gerätekredit** zurück, das Feld bleibt liegen
(C-9); (2) es gibt **keine Taste**, die das Feld leert und auszahlt — weder
im Markup noch im Code (C-10); (3) eine Münze wird erst zu Kredit, wenn sie
vorn herunterfällt (C-7); (4) was seitlich verloren geht oder das Ventil
schluckt, ist weg — still und ohne Gutschrift (C-8).

Eine Auslegungsfrage war zu entscheiden: B.9.1 sagt, herunterfallende Münzen
wandern „in die Kasse"; B.5.2 sagt, gespielt wird ausschließlich vom
Gerätekredit. Entschieden: Gewinne gehen auf den **Gerätekredit** und
wandern von dort mit CASH OUT oder beim Verlassen der Seite in die Kasse —
B.9.1 sinngemäß, B.5.2 und B.5.4 wörtlich erfüllt. Begründung und die
verworfenen Alternativen stehen in `DECISIONS.md`.

**CASH OUT ist erlaubt und ist nicht die von B.5.4 verbotene Taste.** Sie
bucht ausschließlich den noch **nicht** eingeworfenen Gerätekredit zurück
und rührt das Feld nicht an.

**Zwei Abweichungen von den Walzengeräten dieses Hauses, beide begründet
und in `DECISIONS.md` festgehalten:**

1. **Kein Zählklang, kein `counter.js`.** Am Münzschieber gibt es keinen
   Gewinn, der in einem Stück ausgezahlt würde — es fallen einzelne Münzen,
   jede mit ihrem eigenen Klang. Eine Zählfahrt wäre eine erfundene
   Spannung (B.7 verbietet akustische Spannungstricks ausdrücklich).
2. **Der Leerlauf tritt nie zurück.** Ein Münzschieber arbeitet immer — die
   Schubplatte fährt ununterbrochen. `idle.setBusy()` wird deshalb nie auf
   `true` gesetzt; die Abstände zwischen Relaisklick und Ticken sind
   länger gewählt (4 bis 14 s statt 2,2 bis 9 s), damit sie neben dem Schub
   nicht zur Uhr werden.

Der Geldeinwurf am Sockel heißt an diesem Gerät `moneyslot.js` und nicht
`coinslot.js`: der Name „coinslot" gehört hier dem Bedienteil, das wirklich
**Münzen** einwirft (`coinslot.js`, über dem Feld). Abweichung von der
Vorlage des Video Slot, begründet in `DECISIONS.md`.

**Der Grundhaufen umfasst 112 Münzen** (8 Reihen × 14 Spalten,
`seed.js`) statt der ursprünglich geplanten 78 (6 × 13) – auf Anweisung des
Auftraggebers verdichtet, damit das Feld beim ersten Besuch sichtbar gut
bedeckt wirkt und nicht halbleer. Sicher unter `COIN_CAP_MIN` (150): das
Ventil zieht beim Start weiterhin nie. Die genaue Rechnung, warum Schritt
und Streuung dabei ebenfalls angepasst werden mussten (die höchste
Radiensumme benachbarter, unterschiedlicher Münzwerte im Muster ist
maßgeblich, nicht nur die zweier gleicher), steht im Kopf von `seed.js` und
in `DECISIONS.md`.

**Die Extension ist jetzt in `PackageStates.php` aktiviert.** `Classes/`,
die Registrierung bei der Automaten-Registry und die Aktivierung sind
eingearbeitet.

## Das Spielfeld

```
      x = -CHUTE_WIDTH  x = 0                          x = FIELD_WIDTH  x = FIELD_WIDTH + CHUTE_WIDTH
               │          │                                    │            │
   y = FIELD_DEPTH  ┌─────┼────────────────────────────────────┼─────┐   Schubplatte in
               │    │ ▓▓▓ │████████ Schubplatte ████████████████│ ▓▓▓ │   hinterster Lage
               │    │ ▓▓▓ ├────────────────────────────────────┤ ▓▓▓ │
               │    │ ▓▓▓ │            Feldboden               │ ▓▓▓ │   ▓ = Verlustschacht
               │    │ ▓▓▓ │            (Spielfeld)              │ ▓▓▓ │       (Spalt), NUR im
   y = FRONT_ZONE_DEPTH ─ ┤                                    ├─ ▓▓▓ ┤       vorderen Bereich
               │    ║     │                                    │     ║   – überall sonst
         y = 0 │    ║     └──────────── Abwurfkante ───────────┘     ║   steht eine feste Wand
                    feste Wand                                    feste Wand
```

`x` läuft von links (0) nach rechts (`FIELD_WIDTH`), `y` von der
**Abwurfkante** (0) nach **hinten** (`FIELD_DEPTH`). Eine Münze, deren
Mittelpunkt `y <= 0` erreicht, ist gewonnen. Der Feldboden trägt bis zu
seiner Kante (`x = 0` bzw. `x = FIELD_WIDTH`); dahinter steht **überall**
eine feste Wand – außer im **vorderen Bereich** (`y < FRONT_ZONE_DEPTH`,
neben der Abwurfkante, wie an einem echten Münzschieber dieser Bauart), wo
die Wand um `CHUTE_WIDTH` zurückweicht. Das ist der eigentliche Verlustschacht: eine
Münze fällt nur dort und nur, wenn der Spalt breit genug ist, dass ihr
Mittelpunkt über die Bodenkante hinauskommt, ehe die Wand sie stoppt. Die
Schubplatte ist die Rückwand: eine bewegliche Wand quer über die volle
Breite, die nur schiebt, nie zieht.

Die Maßordnung, jede Zahl mit ihrer Begründung:

| Konstante | Wert | Warum |
|---|---|---|
| `FIELD_WIDTH` | 128 | Breite des Feldbodens – aus dem Richtwert-Bestand 200 hergeleitet, dann so verkleinert, dass der leichteste Münzwert (Einser) mit ausreichendem Abstand unter `COIN_CAP_MAX` bleibt |
| `FIELD_DEPTH` | 73 | Tiefe von der Abwurfkante bis zur hintersten Lage der Schubplatte – klein genug, dass die Berührungskette des Haufens bis zur Abwurfkante durchträgt |
| `CHUTE_WIDTH` | 4,5 | die Stellschraube der Quote – siehe eigener Abschnitt unten |
| `FRONT_ZONE_DEPTH` | 6 | Tiefe des vorderen Bereichs, in dem der Verlustschacht überhaupt existiert – Bauart, keine zweite Stellschraube, siehe eigener Abschnitt unten |
| `PLATE_STROKE` | 20 | Hub der Schubplatte je Halbwelle |
| `PLATE_PERIOD_STEPS` | 960 | ein voller Hin-und-zurück-Umlauf, ganzzahlig (960 Schritte = 4,0 s), damit die Phase ohne Rundung gespeichert werden kann |
| `FRAME_HZ` / `SUBSTEPS` | 60 / 4 | Bildrate, für die die Zeitschrittweite ausgelegt ist, mit vier Unterschritten je Bild |
| `DT` | 1/240 s | eine mit 12 Einheiten/s eingeworfene Münze legt je Schritt nur 0,05 Einheiten zurück – weniger als ein Sechzigstel ihres Halbmessers, damit keine Münze durch eine andere hindurchspringen kann |
| `COIN_VALUES` | 1, 2, 5, 10 | die vier Münzwerte |
| `COIN_RADIUS` | 3,4 / 3,7 / 4,0 / 4,4 | der Zehner ist im Durchmesser 29 % größer als der Einser – deutlich unterscheidbar, ohne dass die Flächen um mehr als Faktor 1,7 auseinanderlaufen |
| `CELL_SIZE` | 9,0 | mindestens zwei größte Halbmesser, legt die Gitterzellen für die Stoßauflösung fest |
| `COIN_CAP_MIN` | 150 | unterhalb wird nie etwas entfernt (B.9.3: 150 bis 250) |
| `COIN_CAP_MAX` | 200 | die EINGESTELLTE Obergrenze – fest auf dem Richtwert aus B.9.3 / Anhang E, siehe eigener Abschnitt unten |
| `FILL_TARGET` | 0,70 | angestrebter Flächenanteil des bespielbaren Felds – unter rund 65 % reißen die Berührungsketten, über rund 82 % verkeilt der Haufen |
| `BACK_ZONE` | 28 | Tiefe des Rückwandstreifens, aus dem das Ventil die älteste Münze entfernt – etwas mehr als `PLATE_STROKE`, damit eine frisch eingeworfene Münze nicht sofort zur ältesten in der Zone wird |
| `PIN_ROWS` / `PIN_STEP` | 9 / 3,0 | der Stift-Slalom hinter dem Einwurfschlitz, als Galtonbrett gerechnet |

Die Einheit ist frei; Phase 9 rechnet sie beim Zeichnen in Bildpunkte um.
Kein Wert dieser Datei ist eine Farbe, ein Bildpunkt oder eine
Gestaltungsentscheidung.

## Die Verlustschächte sind die Stellschraube

CONCEPT.md B.9.4 legt fest: die Auszahlungsquote wird **nicht** aus der
Physik vorausberechnet, sondern **gemessen** – und die einzige Stellschraube,
mit der sie eingestellt werden darf, ist die Breite der beiden
Verlustschächte. Dieser Wert steht an **genau einer Stelle** im Code:

```
typo3conf/ext/coin_pusher/Resources/Public/JavaScript/field.js
export const CHUTE_WIDTH = 4.5;
```

`F-3` in `verify-physics.mjs` weist das nach: die Zeile
`export const CHUTE_WIDTH =` kommt in `field.js` genau einmal vor, und
`CHUTE_WIDTH` kommt in `rng.js` und `storage.js` überhaupt nicht vor.

**Bauart – wie an einem echten Gerät.** Der Verlustschacht ist kein Loch
über die ganze Feldtiefe, sondern ein Spalt zwischen der Bodenkante und
einer festen Wand, und dieser Spalt existiert **nur im vorderen Bereich**
(`y < FRONT_ZONE_DEPTH = 6`), neben der Abwurfkante – wie an einem echten
Münzschieber, bei dem der Verlustschacht neben der Auszahllippe sitzt und
nicht über die volle Länge der Wanne läuft. Überall sonst hält die Wand jede
Münze im Feld. Eine Münze fällt deshalb nur, wenn zwei Dinge zusammenkommen:
sie befindet sich im vorderen Bereich, UND `CHUTE_WIDTH` ist größer als ihr
Halbmesser (dann kommt ihr Mittelpunkt über die Bodenkante hinaus, ehe die
Wand sie stoppt). `FRONT_ZONE_DEPTH` ist dabei Bauart, keine zweite
Stellschraube – Anhang E nennt nur die Breite des Schachts als benannten,
dokumentierten Wert; die Tiefe des vorderen Bereichs ist wie `FIELD_DEPTH`
oder `PLATE_STROKE` einmal gemessen und danach eingefroren.

Zwei frühere Bauarten wurden verworfen (Einzelheiten mit Suchlauftabellen
in `DECISIONS.md`):

- **Offenes Feld ganz ohne Wand:** eine Münze, die seitlich abdriftet, ist
  sofort verloren, unabhängig von `CHUTE_WIDTH`. Der Verlust sättigt bei
  rund 24 % über die gesamte, lange Verweildauer einer Münze im Feld – die
  Stellschraube biss nicht.
- **Wand mit Öffnung über die GANZE Feldtiefe:** ob eine Münze überhaupt
  fallen kann, hing dann nur noch von ihrem Halbmesser ab (`CHUTE_WIDTH`
  größer oder kleiner als der Radius) – ein Schalter je Münzgröße, keine
  stetig wirkende Stellschraube. Die Quote sprang zwischen 100 % (voll
  geschützt) und rund 85–92 % (voll ausgesetzt), mit einer Lücke genau über
  dem Zielband 95–99 %.

**Suchlauf und Ergebnis:** `tune-chute.mjs` durchsucht die Breiten 3,0 bis
10,0 in Schritten von 0,5 (8.000 gezählte Münzen je Wert und Breite). Die
Breiten 4,5 bis 5,5 liefern identisch die größte Sicherheitsreserve zum
Bandrand (1,83 Prozentpunkte); gewählt wurde die niedrigste dieser
gleichwertigen Breiten, `4,5`. Nachgewiesen mit `verify-payout.mjs` über
100.000 Münzen je Wert – Ergebnis in Abschnitt „Quote" unten.

## Die Obergrenze und das Ventil

CONCEPT.md B.9.3 verlangt eine Obergrenze von 150 bis 250 Münzen im Feld
(Richtwert 200) – **das ist eine Aussage über die eingestellte Obergrenze,
nicht über den Bestand, der sich im Betrieb darunter einpendelt**; ihr
Zweck ist ausdrücklich die Bildrate auf einem Telefon, also eine Deckelung
nach oben. `COIN_CAP_MAX` steht deshalb fest auf dem Richtwert selbst,
**200**, und `F-8` in `verify-physics.mjs` prüft genau das: dass diese
Konstante im Band 150–250 liegt, und dass der Ventilanteil im Dauerbetrieb
verschwindend klein bleibt (< 2 %, gemessen: 0,00 % für die Münzwerte 2, 5
und 10, 0,56–1,00 % für den Einser). Wo sich das Feld unterhalb von 200
einpendelt, ist für jeden Münzwert unterschiedlich (94 bis 165 Stück je
nach Münzgröße, siehe `Q-8` in `verify-payout.mjs`) und **kein Befund** –
B.9.3 legt dafür keine Untergrenze fest.

Eine feste Stückzahl könnte das nicht leisten: ein Zehner bedeckt 1,7-mal so
viel Fläche wie ein Einser. Die Obergrenze ist deshalb **flächenbezogen**:
unterhalb von `COIN_CAP_MIN` (150) wird nie etwas entfernt; oberhalb von
`COIN_CAP_MAX` (200) immer; dazwischen entscheidet die belegte Fläche gegen
den Zielwert aus `FILL_TARGET`.

Wird das Feld voll, verschwinden die **ältesten** Münzen im
Rückwandstreifen (`BACK_ZONE`) – **still und ohne Gutschrift**. Ist der
Streifen ausnahmsweise leer, wird stattdessen die **hinterste** Münze
genommen, damit das Feld auch dann wieder Platz schafft. Diese Regel ist in
`Field#relieve()` in `field.js` umgesetzt und in `verify-physics.mjs`
(`F-9`) mit einem eigens dafür aufgebauten Feld nachgewiesen, in dem das
Alter jeder Münze bekannt ist.

## Der Kapazitätsfehler (behoben)

`Field`s interne Felder waren exakt `COIN_CAP_MAX` groß. `throwCoin()`
schreibt die neue Münze aber zuerst an den Index `this.count` und räumt
erst danach über `relieve()` auf – stand das Feld schon bei genau
`COIN_CAP_MAX` Münzen, zeigte dieser Schreibindex über das Ende der
Felder hinaus. JavaScripts typisierte Felder quittieren das nicht mit
einem Fehler, sondern liefern dort stillschweigend `undefined`; `remove()`
kopierte diesen Wert dann in eine echte Münze hinein, aus einer Zahl wurde
`NaN` bzw. `0` – eine Münze, die fortan bei jedem Vergleich durchfiel und
jede Münze, mit der sie zusammenstieß, ebenfalls verdarb. Bei einer
Belegung, die regelmäßig die Obergrenze erreichte, fror das Feld auf diese
Weise innerhalb weniger tausend Würfe vollständig ein – ein über 28.000
Würfe hinweg exakt unveränderter Zählerstand hat das nachgewiesen. Behoben
mit `CAPACITY = COIN_CAP_MAX + 1`.

## Der Spielstand

Der Schlüssel `casinoKunterbunt.coinPusher.field` (CONCEPT.md B.5.3, Anhang
E). Gespeichert wird die vollständige Feldbelegung plus die **Phase** der
Schubplatte – ausdrücklich nicht die Uhrzeit, sonst würde die Platte beim
Fortsetzen springen. Das Format:

```
cp1|<prüfsumme>|<phase>|<spawnCount>|<wert,alter,x,y,vx,vy>;<…>
```

Beim Laden wird geprüft: die Kennung `cp1`, eine FNV-1a-Prüfsumme über die
Nutzlast, die Phase als ganze Zahl im gültigen Bereich, je Münze sechs
endliche Zahlen, ein bekannter Münzwert, eine Lage im Feld und eine
Geschwindigkeit unter 1000. Ist der Stand beschädigt, liefert
`Field.restore()` **`null`**, ohne Fehler und ohne Konsolenausgabe – der
Aufrufer beginnt dann mit einem leeren Feld.

**`storage.js` ist die eine benannte Stelle, an der der Spielstand
herkommt** (CONCEPT.md B.11 Nr. 2). Sie kennt keine Münzen, keine Platte,
keine Schächte – sie reicht Text durch. Alle drei Funktionen
(`read`/`write`/`clear`) bekommen das Speicherobjekt als Argument
übergeben, statt sich selbst um `localStorage` zu kümmern; dadurch lässt
sich das Modul mit einem nachgebauten Regal prüfen, auch außerhalb des
Browsers.

CONCEPT.md B.5.4: eine eingeworfene Münze ist kein Kredit mehr, sondern
Spielmaterial. Es gibt deshalb bewusst **keine Taste, die das Feld leert** –
`storage.clear()` existiert nur für den Fall eines unlesbaren, Platz
belegenden Stands.

## Wiederholbarkeit

In `field.js` kommen ausschließlich `+`, `-`, `*`, `/`, `Math.sqrt`,
`Math.abs`, `Math.min`, `Math.max`, `Math.floor`, `Math.ceil`, `Math.imul`
und `Math.PI` vor. Keine Winkelfunktion, keine Potenzfunktion, keine Uhr und
keine Systemzeitmessung – nur diese Rechenarten sind in der ECMAScript-Norm
bitgenau festgelegt und liefern auf jeder Maschine dasselbe letzte Bit
(`F-2` weist das textuell nach).

Der Zufallsgeber wird **eingespeist statt importiert**
(`new Field({ random })`): im Spiel `drawUint32()` aus `rng.js`
(`crypto.getRandomValues`, nicht wiederholbar – im Spiel erwünscht), im
Nachweis `createSeeded(startwert)` (sfc32, gesetzt – gleicher Startwert
ergibt exakt dieselbe Folge). `field.js` kennt weder `crypto` noch
Startwerte; derselbe Code läuft im Browser und im Nachweisskript.

`F-4` weist den Determinismus so nach: zwei Läufe mit demselben Startwert
über je 240.000 Zeitschritte (Einwurf alle 48 Schritte, Werte reihum)
liefern einen **zeichengleichen** Speicherstand und identische Bilanzzähler.
`F-5` bestätigt, dass ein anderer Startwert einen anderen Speicherstand
liefert – sonst könnte `F-4` auch dann bestehen, wenn der Zufallsgeber gar
nicht benutzt wird. `Q-7` in `verify-payout.mjs` wiederholt den Nachweis
auf voller Strecke: derselbe Startwert liefert nach 10.000 Münzen einen
zeichengleichen Speicherstand und identische Bilanzzähler wie ein
unabhängiger, frischer Lauf.

## Quote

Nachgewiesen mit `verify-payout.mjs` am 2026-09-03, über je 100.000 Münzen
je Münzwert (Laufzeit 21,0 min), Schachtbreite `CHUTE_WIDTH = 4,5`,
Flächenanteil `FILL_TARGET = 0,70`, Einwurfabstand 48 Zeitschritte (0,2 s):

| Münzwert | Münzen | Quote | Standardabweichung je 5.000 | kleinster / größter Abschnitt |
|---|---|---|---|---|
| 1 | 100.000 | 96,851 % | 0,139 Pkt | 96,561 % / 97,101 % |
| 2 | 100.000 | 96,885 % | 0,108 Pkt | 96,680 % / 97,079 % |
| 5 | 100.000 | 96,866 % | 0,126 Pkt | 96,657 % / 97,099 % |
| 10 | 100.000 | 97,046 % | 0,163 Pkt | 96,677 % / 97,299 % |
| gemischt | 100.000 | 97,496 % | – | – |

Startwerte: 1 → 20260901, 2 → 20260902, 5 → 20260905, 10 → 20260910,
gemischt → 20260908 (Wert je Einwurf gleichverteilt aus demselben
Zufallsgeber gezogen, Verwerfungsverfahren aus `rng.js`).

Jeder einzelne der 20 Abschnitte à 5.000 Münzen liegt für jeden Münzwert im
Band 95–99 % (`Q-5`) – die Quote ist kein Mittelwert aus schwankenden
Ausreißern, sondern ein ruhig laufendes Ergebnis. Die Bilanz geht für jeden
Lauf exakt und ganzzahlig auf (`Q-3`).

Von jeder eingeworfenen Münze geht der Rest über die seitlichen
Verlustschächte verloren: **3,03 %** über alle vier Einzelläufe. Das
Ventil hat **nichts** geschluckt (0,00 %) – wie es sein soll, denn es ist
als Notbremse für die Bildrate gedacht, nicht als Regelweg zur Quote.

Die Quote wird gemessen, nicht gerechnet, und nichts hilft ihr nach.

## Das Gehäuse und seine Maßordnung

Der `viewBox` der Zeichnung ist `0 0 100 160` — dasselbe Seitenverhältnis
1 : 1,6 wie bei den beiden Walzengeräten. `.cp-cabinet` ist ein
Container-Query-Container mit genau diesem Seitenverhältnis, deshalb gilt in
allen Kindern `1cqi = 1 viewBox-Einheit` in beiden Achsen. Die vollständige
Koordinatentabelle (Chromhaube, Korpus, Fensterrahmen, Nixie-Chromplatte,
Bedienleiste, Geldreihe, Auswurfschale, Podest) steht im Kopf von
`machine.css`.

Das Sichtfeld misst 84 × 48,6 Einheiten, also **140 : 81** — nicht einfach
die Feldboden-Maße aus `field.js` (128 × 73): die Zeichenfläche bildet
zusätzlich die beiden Verlustschächte links und rechts und einen Streifen
über der hintersten Lage der Schubplatte ab, in dem der Stift-Slalom sitzt:
`(128 + 2·6) × (73 + 8) = 140 × 81`, auf 84 Rastereinheiten Breite skaliert
ergibt das `84 · 81 / 140 = 48,6` Höhe. `A-10` in `verify-cabinet.mjs`
gleicht dieses Verhältnis gegen `view.js` ab.

Der Münzschieber unterscheidet sich absichtlich von den Walzengeräten
(CONCEPT.md B.3 Regel 7): breiter, gedrungener Korpus über die volle
Rasterbreite, eine flache Chromhaube statt gerundeter Schulter oder Kuppel,
ein querliegendes großes Fenster statt eines hochstehenden Walzenfensters —
und, anders als bei beiden Walzengeräten, **kein** Bedienteil im Sockel: die
Münzwertwahl, der Geldeinwurf und das Kassenfenster sitzen eine Etage höher,
im Korpus.

## Die vier Münzen

Vier Werte, unterscheidbar über Größe **und** Farbe (CONCEPT.md B.9.2):

| Wert | Halbmesser | Fläche | Rand | Besonderheit |
|---|---|---|---|---|
| 1 | 3,4 | `--ck-copper-200` (Kupfer) | `--ck-copper-400` | einfarbig |
| 2 | 3,7 | `--ck-chrome-300` (Nickel) | `--ck-chrome-500` | einfarbig |
| 5 | 4,0 | `--ck-brass-200` (Messing) | `--ck-brass-400` | einfarbig |
| 10 | 4,4 | `--ck-chrome-300` (Nickel) | `--ck-chrome-500` | **Kern** `--ck-brass-200` bei 0,55 × Halbmesser |

`--ck-copper-200` / `--ck-copper-400` sind die einzige Ergänzung am Site
Package, das dafür sonst unverändert bleibt (CONCEPT.md Abschnitt 5,
Grundsatz 2: `casino_startpage` kennt kein Gerät). Die Münzen tragen **keine
Prägung** — keine Ziffer, kein Bild, keine Randriffelung; der Wert steht
ausschließlich auf der Tastenkappe. Das ist zugleich das Ergebnis der
Copyright-Prüfung vom 2026-09-03 (Abschnitt 5 dort): unbedenklich, solange
die Scheiben leer bleiben.

## Geld am Münzschieber

Der Geldfluss dieses Geräts — drei Töpfe, die Zusagen dazu und die
Abgrenzung von CASH OUT zur nach B.5.4 verbotenen Rückstell-Taste — steht im
Ganzen im Abschnitt „Stand" oben, wo Lauf 2 eingeführt wird. Hierher gehört
nur der Verweis, damit die Extension-Übersicht (`ls Resources/…`) und die
Abschnittsüberschriften dieser README zueinander passen.

## Warum das Feld nicht flackert

CONCEPT.md B.9.3/B.6.1 verlangt, dass keine Lichtquelle öfter als dreimal je
Sekunde hell wird. `lamp.js` (Lauf 1) erzwingt dafür `LAMP_MIN_ON_MS = 400`
und `LAMP_MIN_OFF_MS = 200` **in der Lampe selbst**, unabhängig davon, wie
oft `coin-pusher.js` `trigger()` ruft: ein Aufleuchten während der Sperrzeit
wird nicht gemerkt und nicht nachgeholt. Der rechnerische Höchstwert ist
damit `1000 / (400 + 200) ≈ 1,67` Wechsel je Sekunde — deutlich unter der
Grenze von drei. Nachgewiesen in `verify-view.mjs`, Prüfung V-3: ein dichter
Münzregen erzeugt genau EIN ruhiges Dauerlicht statt Flackerns; bei
gelegentlichen Pausen blieb der kürzeste gemessene Abstand zweier
Einschaltzeitpunkte bei 714 ms, über der 600-ms-Grenze aus
`LAMP_MIN_ON_MS + LAMP_MIN_OFF_MS`. Begründung, warum die Drossel in der
Lampe steckt und nicht bei ihrem Aufrufer: `DECISIONS.md`,
2026-09-03 13:23 CEST.

## Der Klang

Drei Ebenen: `casino_startpage/sound.js` (WIE ein Klang entsteht),
`casino_startpage/sound-kit.js` (WIE eine Münze klingt), `sound.js` dieser
Extension (WANN etwas klingt — kennt beides, wird von keiner der beiden
gekannt).

| Ereignis | Klang |
|---|---|
| Münze in den Schlitz (`cp:throw`) | eine Münze, je Wert an einer anderen Tonhöhe |
| eine Münze fällt vorn (`cp:won`, eine) | die Schale, dann eine einzelne Münze |
| mehrere Münzen fallen vorn (`cp:won`, zwei oder mehr) | die Schale, dann eine Münzkaskade |
| seitlich weggerutscht (`cp:lost`) | dumpfer und leiser als die Schale |
| Ventil an der Rückwand (`cp:valve`) | nichts — B.9.3: „still und ohne Gutschrift" |
| Schub nach vorn (`cp:plate`, vorwärts) | ein Rutschen, am Umschlagpunkt ein Metallschlag |
| Rücklauf (`cp:plate`, rückwärts) | ein Rutschen, dazu eine Klinke |
| Geldeinwurf (`cp:coin`, angenommen) | eine Münze |
| Geldeinwurf (`cp:coin`, abgelehnt) | zwei dumpfe, geräteeigene Anschläge, kein Metall |
| Auszahlung (`cp:cashout`) | die Klappe der Schale, dann eine Münzkaskade |
| Ton-Schalter | ein kurzer, geräteeigener Klick |
| Leerlauf | ein durchgehendes Brummen, das nie zurücktritt |

Zwei Abweichungen von den Walzengeräten dieses Hauses — kein Zählklang und
ein Leerlauf, der nie zurücktritt — stehen mit ihrer Begründung im Abschnitt
„Stand" oben und in `DECISIONS.md`. Nachgewiesen mit `verify-sound.mjs`
(Abschnitt „Prüfskripte" unten).

## Bildrate

**Noch nicht gemessen.** `measure-frames.mjs` ist fertig geschrieben und
lauffähig, bricht aber beim Start selbst ab: im DDEV-Container fehlen die
Playwright-Browser-Binärdateien (`~/.cache/ms-playwright` existiert nicht;
Playwright selbst, Version 1.62.1, ist vorhanden). Das Skript installiert
nichts von sich aus – dafür ist im Container `npx playwright install`
auszuführen. Offener Punkt dieser Phase.

Gemessen wird, sobald möglich, der Physikkern mit einer wegwerfbaren
Zeichenfläche des Messskripts, nicht das fertige Gerät – das gibt es noch
nicht. Phase 9 misst am gebauten Automaten erneut.

## Prüfskripte

Acht voneinander unabhängige Nachweisskripte, alle nur lesend:

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-physics.mjs
```

Lädt `field.js`, `rng.js` und `storage.js` über ihre Dateiadresse –
dieselben Dateien, mit denen später der Browser spielt – und weist F-1 bis
F-17 nach: die Maßordnung, die erlaubten Rechenarten, `CHUTE_WIDTH` an
genau einer Stelle, Determinismus, keine Überlappung, keine durchrutschenden
Münzen, die eingestellte Obergrenze und einen verschwindend kleinen
Ventilanteil, Werterhaltung, verlustfreies Speichern und Fortsetzen,
kompakter Speicherstand, robustes Verhalten bei beschädigten
Speicherständen, Kapselung des Browserspeichers, dass die Physik nur beim
Einwurf würfelt, und dass die Schubplatte rund läuft. Rückgabewert 0, wenn
alles stimmt, sonst 1. **Ergebnis in diesem Stand: alle Prüfungen
bestehen.**

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/tune-chute.mjs
```

Das Werkzeug, mit dem `CHUTE_WIDTH` eingestellt wurde: durchsucht eine
Liste von Schachtbreiten (Schalter `--widths=…` für einen Nachlauf auf
engerem Bereich), misst je Breite und Münzwert die Quote über 8.000
gezählte Münzen, und empfiehlt die Breite mit der größten Sicherheitsreserve
zum Bandrand. Ändert keine Datei – der gewählte Wert wird von Hand in
`field.js` eingetragen. Rückgabewert 0, wenn eine Breite alle vier
Münzwerte ins Band bringt, sonst 1.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-payout.mjs
```

Der Quotennachweis nach B.9.4 und Anhang E: mit fester Zufallsfolge über
mindestens 100.000 Münzen je Münzwert (Q-1 bis Q-8, siehe Abschnitt „Quote"
oben für das Ergebnis). Schalter `--coins=<n>` für einen Eichlauf zur
Laufzeitschätzung – ein damit verkürzter Lauf ist ausdrücklich **kein
Nachweis** und wird auch so beschriftet. Rückgabewert 0, wenn alles stimmt,
sonst 1.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/measure-frames.mjs
```

Die Bildratenmessung – lädt `field.js` und `rng.js` in einem echten,
über Playwright ferngesteuerten Chromium, füllt ein Feld bis zur Obergrenze
und misst 900 Bilder, ungedrosselt und mit vierfacher CPU-Drosselung.
Prüft zuerst, ob Chromium überhaupt zur Verfügung steht, und installiert
nichts nach – fehlt es (wie in diesem Stand), bricht das Skript mit
Rückgabewert 2 und einer klaren Meldung ab, statt selbst etwas
nachzuladen. Rückgabewert 0, wenn beide Durchgänge über den Schwellen
(55 Bilder/s ungedrosselt, 25 gedrosselt) liegen, 1 sonst.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-cabinet.mjs
```

Nachweis A-1 bis A-11 aus Lauf 1 (Gehäuse, Design-Tokens, Trennung von
`casino_startpage`, Barrierefreiheit der Bedienteile, Haken-Katalog,
Konsolenstille) — zusätzlich mit einer Adresse auch B-1 bis B-3 gegen das
ausgelieferte HTML. Prüfung A-5 (kein fremder Name) erfasst seit der
Behebung von Befund Ä-1 der Copyright-Prüfung vom 2026-09-03 **jede**
ausgelieferte Datei ohne Ausnahme, README und Physikkern eingeschlossen.
Rückgabewert 0, wenn alles stimmt, sonst 1.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-view.mjs
```

Nachweis V-1 bis V-9 aus Lauf 1: Fortsetzen ohne Sprung, die Lichtdrossel
der Auswurfschale, die Zeichnungsroutine, der Grundhaufen, und dass
`field.js`/`rng.js`/`storage.js` seit Phase 8 unverändert sind (Prüfsumme).
Rückgabewert 0, wenn alles stimmt, sonst 1.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-credit.mjs
```

Nachweis C-1 bis C-13 aus Lauf 2: der Gerätekredit startet bei 0, Geldeinwurf
und Münzeinwurf verschieben nur, ohne Deckung fällt keine Münze, zwischen
Tastendruck und Wurf liegt kein Zeitschritt der Physik, eine vorn gefallene
Münze schreibt genau ihren Wert gut, seitlicher Verlust und Ventil schreiben
nichts gut, CASH OUT bucht nur den Gerätekredit, beim Verlassen der Seite
wandert nur der Gerätekredit zurück, es gibt keine Rückstell-Taste, jedes
`data-cp-*`-Attribut hat genau einen Schreiber, und zwei gleichzeitige
Drücke auf den Münzeinwurf erzeugen genau eine Münze. Rückgabewert 0, wenn
alles stimmt, sonst 1.

```
ddev exec node typo3conf/ext/coin_pusher/Resources/Private/Scripts/verify-sound.mjs
```

Nachweis S-1 bis S-11 aus Lauf 2: vor der ersten echten Nutzergeste bleibt
alles still (auch der Tastaturweg schaltet frei), der Münzeinwurf klingt je
Wert unterscheidbar, eine gefallene Münze klingt anders als eine Kaskade,
der Verlust klingt leiser und dumpfer, das Ventil bleibt stumm, der Schub
klingt genau zweimal je Umlauf, der Leerlauf tritt an diesem Gerät nie
zurück, zwei Gehäuse stören einander nicht, ein Dauerlauf über 660
Ereignisse verwirft keine Stimme und gibt keine Konsolenausgabe, der
ausgerechnete Ausschlag bleibt unter 1,0, und `aria-pressed` folgt dem
Ton-Schalter auch aus der Ferne. Rückgabewert 0, wenn alles stimmt, sonst 1.

## Nicht enthalten

Mit Lauf 2 ist Phase 9 vollständig eingearbeitet. Es fehlt nichts mehr, was
der Plan für diese Phase vorsah. Bewusst **nicht** vorhanden, keine Lücke:

- **Keine Rückstell-Taste.** CONCEPT.md B.5.4 verbietet eine Taste, die das
  Feld leert und auszahlt, ausdrücklich — weder im Markup noch im Code gibt
  es sie, und `verify-credit.mjs` (C-10) weist das textuell nach.
- **Keine zweite Ansicht.** Das Spielfeld hat genau eine Zeichenfläche; ein
  zweiter Blickwinkel oder eine Zoomstufe war nie Teil der Aufgabe.
- **Kein Zählklang.** Es gibt keinen Gewinn, der in einem Stück ausgezahlt
  würde — Begründung im Abschnitt „Stand" und in `DECISIONS.md`.

**Bewusst dauerhaft nicht vorhanden, nicht nur bis zu einem späteren Lauf
verschoben:** `Configuration/Services.yaml` – die Extension registriert
keinen einzigen Dienst (kein DataProcessor, kein Event-Listener, kein
Kommando); eine leere Datei wäre eine Datei, die nichts tut (Begründung in
`DECISIONS.md`).

Offener Punkt, unverändert seit Phase 8: die Bildratenmessung am
**gebauten** Gerät steht weiterhin aus, solange die Chromium-Binärdateien im
DDEV-Container fehlen (Abschnitt „Bildrate" oben). Der Befehl, den der
Auftraggeber dafür ausführen müsste: `ddev exec npx playwright install
chromium`. Der Plan sieht für diesen Lauf ausdrücklich keine Installation
vor.
