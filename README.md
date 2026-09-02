# Casino Kunterbunt

**Version 0.1.0 — alpha.** Frühe Entwicklungsfassung, nichts ist stabil.

Quelltext: <https://github.com/phomo17/casino-kunterbunt_t3v13classic>

## Worum es geht

Casino Kunterbunt wird ein **Social Deduction Game** — ein Gesellschaftsspiel,
bei dem eine Gruppe gemeinsam herausfinden muss, wer unter ihnen heimlich zur
Gegenseite gehört. Es ist von *Blood on the Clocktower* **inspiriert**, aber
keine Nachbildung: Es wird am Ende nicht nach dem üblichen BotC- oder Werwolf-Prinzip
funktionieren. Gespielt wird außerdem nicht in einem Dorf, sondern in einem
**Casino**.

## Was heute schon da ist — und was noch fehlt

**Das Spiel selbst gibt es noch nicht.** Es existieren bisher keine ausformulierten Rollen, 
keine Regeln, kein Rundenablauf, keine Mitspielendenverwaltung. Wer das
Projekt heute startet, sieht deshalb ein Casino und kein Gesellschaftsspiel —
das ist so gewollt und nicht der Endzustand.

Gebaut ist die Welt, in der das Spiel stattfinden wird:

| | Stand |
|---|---|
| **Vegas-Saal** als Startseite mit Leuchtreklame, Automatenreihen und Kasse | fertig |
| **Reel Slot** — klassischer Drei-Walzen-Automat mit Risiko-Leiter, Auto-Modus und Klang | fertig |
| **Video Slot** — Fünf-Walzen-Automat mit fünf Gewinnlinien und Scatter | im Bau |
| Weitere Geräte, Tischspiele, Konten und Lobbys | geplant |
| Rollen, Regeln, Rundenablauf des Gesellschaftsspiels | geplant |

## Wie es gebaut ist

TYPO3 13.4 in einer klassischen (nicht Composer-basierten) Installation,
lokal in DDEV. Das Frontend hat bewusst enge Grenzen:

- **kein Bauschritt** — kein Bundler, kein Transpiler, kein Sass
- **keine Fremdbibliothek** — kein Framework, kein fremdes JavaScript
- **keine externen Dateien** — kein Bild, keine Schriftdatei, keine Einbindung
  von außen

Alles Sichtbare entsteht im Browser: die Gehäuse aus CSS und eingebettetem
SVG, die Anzeigen aus Custom Properties, die Geräusche aus der
Web-Audio-Schnittstelle. Ausgeliefert werden ES-Module direkt, über die
Import-Map von TYPO3.

## Installation

Gebraucht werden **DDEV** und **Docker**. Alles Weitere läuft im Container —
auf dem eigenen Rechner müssen weder PHP noch eine Datenbank installiert sein.

### 1. Repository holen und Container starten

```bash
git clone https://github.com/phomo17/casino-kunterbunt_t3v13classic.git casino-kunterbunt
cd casino-kunterbunt
ddev start
```

Die DDEV-Konfiguration liegt im Repository (`.ddev/config.yaml`): PHP 8.4,
nginx-fpm, MariaDB 11.8, Dokumentwurzel ist der Projektstamm.

### 2. TYPO3-Kern nachladen

Der Kern liegt bewusst **nicht** im Repository — er sind über 130 MB fremder
Code. Diese Installation ist *klassisch*, also nicht Composer-basiert: Der Kern
wird als Quellpaket entpackt und über zwei Symlinks eingehängt.

```bash
ddev exec 'curl -fSL -o typo3_src.tar.gz https://get.typo3.org/13.4.33   && tar -xzf typo3_src.tar.gz   && mv typo3_src-13.4.33 typo3_src   && rm typo3_src.tar.gz   && ln -s typo3_src/index.php index.php   && ln -s typo3_src/typo3 typo3'
```

Eine neuere 13.4er Fassung geht auch; dann beide Stellen mit der Versionsnummer
anpassen. Ein Sprung auf 14 ist **nicht** getestet.

### 3. TYPO3 einrichten

```bash
touch FIRST_INSTALL
ddev launch
```

`FIRST_INSTALL` ist eine leere Datei, die TYPO3 als Erlaubnis versteht, den
Installationsassistenten zu öffnen; er löscht sie danach selbst wieder. Im
Assistenten die Datenbankdaten von DDEV eintragen — Benutzer `db`, Passwort
`db`, Datenbank `db`, Server **`db`** (nicht `localhost`, die Datenbank läuft in
einem eigenen Container). Beim Schritt „Was möchten Sie tun?" **„Leere
Startseite"** wählen.

### 4. Die drei Extensions aktivieren

```bash
ddev exec php typo3/sysext/core/bin/typo3 extension:activate casino_startpage
ddev exec php typo3/sysext/core/bin/typo3 extension:activate reel_slot
ddev exec php typo3/sysext/core/bin/typo3 extension:activate video_slot
ddev exec php typo3/sysext/core/bin/typo3 dumpautoload
ddev exec php typo3/sysext/core/bin/typo3 cache:flush
```

Wichtig: `casino_startpage` **zuerst**, die beiden Automaten bauen darauf auf.

### 5. Seiten und Inhalte anlegen

**Das ist der Schritt, der Handarbeit verlangt.** Der Seitenbaum und die
Inhaltselemente stehen in der Datenbank, und eine Datenbank gehört nicht ins
Repository — sie enthielte Benutzerkonten und Passwort-Hashes. Nach der
Installation steht deshalb ein leeres TYPO3 da. Anzulegen im Backend:

| Seite | Inhalt |
|---|---|
| **Saal** (Wurzelseite, Backend-Layout „Startseite (Spielsaal)") | je ein Inhaltselement **„Casino-Automat"** pro Gerät, im Feld *Automat* den jeweiligen Automaten und im Feld *Ziel* seine Spielseite wählen |
| **Reel Slot** (Unterseite) | ein Inhaltselement **„Reel Slot"** |
| **Video Slot** (Unterseite) | ein Inhaltselement **„Video Slot"** |

Alle drei Elemente stehen im Backend unter der Gruppe **„Casino Kunterbunt"**.
Die Automaten-Elemente haben keine Einstellungen — alles, was ein Gerät
braucht, bringt es selbst mit.

Anschließend die mitgelieferte Site-Konfiguration
(`typo3conf/sites/casino-kunterbunt/`) im Backend unter *Site-Verwaltung*
öffnen und die Wurzelseite sowie die Basis-URL auf die eigene Installation
anpassen — hinterlegt ist `https://casino-kunterbunt.ddev.site/`.

### 6. Prüfen

Jede Automaten-Extension bringt Prüfskripte mit, die ohne Abhängigkeiten
auskommen:

```bash
ddev exec node typo3conf/ext/reel_slot/Resources/Private/Scripts/verify-payout.mjs
ddev exec node typo3conf/ext/video_slot/Resources/Private/Scripts/verify-payout.mjs
```

Sie zählen alle Walzenstellungen vollständig aus und enden nur dann mit
Rückgabewert 0, wenn die Auszahlungsquote im zugesagten Band liegt.

## Aufbau

| Extension | Aufgabe |
|---|---|
| `typo3conf/ext/casino_startpage` | Site Package: der Saal, die Design-Tokens, die geteilten Bausteine (Kasse, Gerätekredit, Klang, Risiko-Leiter) und die Registry, bei der sich jeder Automat anmeldet |
| `typo3conf/ext/reel_slot` | der Drei-Walzen-Automat |
| `typo3conf/ext/video_slot` | der Fünf-Walzen-Automat |

Ein Automat ist ein eigenständiges Inhaltselement. Das Site Package kennt
keinen einzelnen Automaten und muss nicht geändert werden, wenn einer
dazukommt.

Jede Extension hat ihre eigene `README.md` mit den Einzelheiten.

## Wie KI an diesem Projekt beteiligt ist

**Das Konzept ist meins.** Was Casino Kunterbunt werden soll, wie die Geräte sich anfühlen
müssen, welche Regeln gelten, was ausdrücklich nicht gebaut wird — jede inhaltliche
Festlegung stammt von mir.

**Der Code und die Gestaltung entstehen mit Claude** (Anthropic), über Claude Code. Das gilt
für die Extensions, die Fluid-Vorlagen, das CSS, die SVG-Zeichnungen der Gehäuse und
Symbole, die Klangerzeugung und die Prüfskripte.

**Nichts davon geht ungesehen ins Repository.** Ich sehe jede Änderung durch, bevor ich sie
committe und pushe — das Veröffentlichen mache ich von Hand, es gibt keine Automatik, die
das für mich erledigt.

**Bei der Gestaltung wird ausdrücklich auf Urheber- und Markenrecht geprüft.** Für jedes
neue Gerät läuft eine eigene Recherche, bevor daraus etwas veröffentlicht wird: Woher
stammen die Symbole, ist eine Form geschützt, kollidiert ein Name mit einer eingetragenen
Marke, steckt irgendwo fremdes Material im Code. Gegebenfalls werden die betroffenen
Stellen angepasst, sodass kein Urheber- und Markenrecht verletzt wird.

## Versionierung

Es gibt zwei Ebenen, die getrennt gezählt werden:

- **Das Projekt** — die Version oben in dieser Datei. Sie beschreibt den Stand
  des Spiels als Ganzes.
- **Die einzelnen Extensions** — je eine Version in ihrer `ext_emconf.php`.

Zurzeit stehen alle drei Extensions wie das Projekt auf **0.1.0** im Zustand
**alpha**. Solange die Spielregeln noch nicht existieren, sagt eine höhere
Zahl ohnehin nichts aus; die Zählung beginnt bewusst gemeinsam bei null.

## Nicht im Repository

Nachladbar oder erzeugt, deshalb ausgeschlossen: der TYPO3-Kern
(`typo3_src/`) samt der beiden Symlinks `index.php` und `typo3`,
`node_modules/`, `typo3temp/`, `fileadmin/` sowie die erzeugten Dateien unter
`typo3conf/` (`autoload/`, `l10n/`, `PackageStates.php`).

Ausgeschlossen ist außerdem `typo3conf/system/` — dort liegen
Zugangsdaten und der `encryptionKey` der lokalen Installation.

Von `.ddev/` kommt nur `config.yaml` mit, damit sich die Umgebung
nachbauen lässt; der Rest ist erzeugt und enthält unter anderem die
TLS-Schlüssel der lokalen Installation.

Nicht im Repository ist auch die **Datenbank** und damit der Seitenbaum —
siehe Schritt 5 der Installation.

## Rechtliches

Ein Spaßprojekt mit Spielgeld: kein Einsatz, keine Auszahlung, keine
Anmeldung, kein Glücksspielangebot. Gerätenamen, Gehäuse, Symbole und
Gewinnpläne sind eigene Entwürfe und bilden kein vorhandenes Produkt nach.

## Lizenz

Copyright (C) 2026 Phomo17

**GNU Affero General Public License, Version 3 oder später** (AGPL-3.0-or-later).
Der vollständige Text steht in [`LICENSE`](LICENSE).
Der Quelltext, den Abschnitt 13 verlangt, liegt unter <https://github.com/phomo17/casino-kunterbunt_t3v13classic>
und wird von der laufenden Anwendung selbst im Saal verlinkt.

Was das bedeutet:

- **Du darfst** dieses Projekt herunterladen, benutzen, verändern, weitergeben
  und in eigene Projekte einbauen — auch kommerziell.
- **Du musst** dabei die Urheberschaft nennen und die Lizenz mitliefern.
- **Du musst** deine Änderungen ebenfalls unter der AGPL veröffentlichen, wenn
  du sie weitergibst — **und auch dann, wenn du eine geänderte Fassung nur als
  Website betreibst.** Genau darin unterscheidet sich die AGPL von der GPL: Wer
  dieses Projekt umbaut und ins Netz stellt, muss seinen Quelltext denjenigen
  zugänglich machen, die die Seite benutzen.
