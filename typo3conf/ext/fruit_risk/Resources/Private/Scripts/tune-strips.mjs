/**
 * FruitRisk – Suchwerkzeug für die sechs Walzenbänder
 * ====================================================
 *
 * Entwicklerwerkzeug, kein Bestandteil der Website; ändert keine Datei. Die
 * 120 Symbolnamen der sechs Bänder stehen bewusst nicht im Konzept — sie
 * sind das Ergebnis dieses Werkzeugs (Phase F3, Messlauf F3-M1). Ein voller
 * Nachweislauf über alle 64.000.000 Stellungen je Kandidat wäre unbezahlbar;
 * dieses Werkzeug bewertet einen Kandidaten deshalb in Mikrosekunden bis
 * Sekunden, über die geschlossene Form aus PLAN-fruitrisk-f3-mathematik,
 * Teil 1, Abschnitt 4a.0 (Satz 1, Folgerung 1 und 2).
 *
 *
 * AUSFÜHRUNG
 * ----------
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/tune-strips.mjs
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/tune-strips.mjs --runden 20000
 *   ddev exec node typo3conf/ext/fruit_risk/Resources/Private/Scripts/tune-strips.mjs --nur-saat
 *
 * `--nur-saat` überspringt die Suche vollständig und druckt nur die eine
 * Bauvorschrift-Belegung aus Stufe 0 (siehe unten) — Sekundenbruchteile.
 * Ohne Schalter läuft die volle Suche: Stufe 1 (exakt) über den ganzen
 * Suchraum, Stufe 2 (Stichprobe) über die besten Kandidaten daraus.
 *
 * GEMESSENE LAUFZEIT (F3a, ddev-Container dieses Projekts, 1.680 Kandidaten
 * in Stufe 1, 8 Kandidaten in Stufe 2): Stufe 1 rund 3 Sekunden, Stufe 2 rund
 * 11 Sekunden je Kandidat bei der Voreinstellung 2.000.000 Runden, macht rund
 * 90 Sekunden für die volle Stufe 2 — insgesamt deutlich UNTER zwei Minuten.
 * Mit `--runden 20000` (ein Zwanzigstel) sinkt Stufe 2 auf rund 4–5 Sekunden.
 * Vor einer Fehlerbehebung während F3a (siehe DECISIONS.md und den
 * Kopfkommentar von `fillLineSymbols()`) hing dieselbe Suche dagegen
 * unbegrenzt in Stufe 1 selbst — das war ein echter Fehler im
 * Rückverfolgungs-Abstandsvergleich, keine grundsätzliche Eigenschaft des
 * Suchraums.
 *
 * ERGEBNIS
 * --------
 * Eine Rangliste der geprüften Kandidaten mit Quote, Feldverteilung und
 * (bei den besten) der Stichprobenschätzung von P(Runde=1/2/3/10), gefolgt
 * von einem fertigen PHP-Block für den besten Kandidaten:
 *
 *   ========== EINSETZEN IN Classes/Rules.php ==========
 *       public const DEFAULT_GRID = [ … ];
 *       public const STRIPS = [ … ];
 *   ====================================================
 *
 * Rückgabewert immer 0 (ein Suchwerkzeug hat kein Ergebnis, das "falsch"
 * sein kann — nur ein besseres oder schlechteres). Findet die Suche keinen
 * einzigen Kandidaten, der alle sieben Bandregeln erfüllt, bricht das
 * Werkzeug mit einer Fehlermeldung und Rückgabewert 1 ab; das wäre ein
 * Fehler in der Bauvorschrift (Stufe 0) selbst, nicht in der Feinsuche.
 *
 *
 * WAS EIN FEHLSCHLAG BEDEUTET — DIE STELLSCHRAUBEN, IN DIESER REIHENFOLGE
 * ------------------------------------------------------------------------
 * Findet die Suche keinen Kandidaten, dessen Quote im Band 95,0–99,5 %
 * liegt und dessen P(Feld=1)/P(Feld=2)/P(Feld=3) einander auf ±8 % nahe
 * kommen (etwas strenger als die verlangten ±10 %, damit die in Stufe 2
 * gemessene Restkorrektur die Grenze nicht doch noch reißt), ist NICHT die
 * Suche zu wiederholen, sondern eine Stellschraube zu verändern:
 *
 *   1. `guaranteedLayouts` erweitern — WIE VIELE zusätzliche Vorkommen die
 *      beiden Nicht-Leitfrüchte je garantierter Walze bekommen (derzeit 1
 *      oder 2 je Sorte) und WO sie relativ zu den vier Grundpositionen
 *      liegen (nah an einer Grundposition oder im Zwischenraum verteilt);
 *   2. `freeLayouts` erweitern — WIE VIELE zusätzliche Vorkommen jede der
 *      drei kleinen Früchte auf einer freien Walze bekommt (derzeit 1 oder 2
 *      je Sorte) und ob sie als zusammenhängender Block, halb zusammen-
 *      hängend oder weit gestreut liegen; die beiden freien Walzen dürfen
 *      dabei VERSCHIEDENE Bauformen tragen (siehe Hauptschleife unten);
 *   3. NICHT MEHR WIRKSAM (siehe GEMESSENER BEFUND): die reine Position
 *      einzelner Fruchtvorkommen ohne Änderung ihrer Anzahl (das war die
 *      Suche der Vorgängerausbaustufe) — deshalb entfallen
 *      `guaranteedOffsetChoices()`, `freeBlockStartChoices()` und der
 *      `cutoff`-Parameter der Liniensymbolverteilung ist auf 0 fixiert
 *      (siehe `buildLineSymbolCounts()`, immer erfüllbar bei den hier
 *      vorkommenden Fruchtzahlen, siehe DECISIONS.md);
 *   4. zuletzt die Gewinnwerte selbst in Rules.php UND paytable.js, wobei
 *      `sieben × 6 = 100` unantastbar bleibt (MAX_LINE_VALUE).
 *
 * Scheitert die Suche an der QUOTE, ist Stellschraube 4 die richtige (die
 * Quote ist linear in den Werten und in geschlossener Form berechenbar).
 * Scheitert sie an der VERTEILUNG P(Feld=1):P(Feld=2):P(Feld=3), sind es
 * Stellschrauben 1 und 2 — wohlwissend, dass jede zusätzliche Fruchtkopie
 * E[Feld] weiter ANHEBT (nie senkt), also den Linien-Anteil entsprechend
 * stärker senken muss (Stellschraube 4 wird dadurch NICHT überflüssig,
 * sondern nach JEDER Änderung an 1 oder 2 neu nachgezogen). Nicht verändert
 * werden dürfen: die Zahl der garantierten Walzen (vier ist die einzig
 * mögliche, C.14.7), die Feldtreppe, der Höchstwert 100 und die 30 Linien
 * (PLAN, Abschnitt "Messlauf F3-M1").
 *
 * GEMESSENER BEFUND aus dem Probelauf von F3a (VOR der Erweiterung dieser
 * Ausbaustufe, siehe DECISIONS.md): mit den damaligen Voreinstellungen
 * (Leitfrüchte fest, Nachbarn aus {1,2,3,4}², Blockstart aus
 * {0,4,8,12,16}, je EIN Exemplar jeder kleinen Frucht auf jeder Walze)
 * lieferte JEDER der 1.680 Kandidaten exakt dieselbe Quote von 144,5795 %
 * und exakt dieselbe Feldverteilung (P(Feld=1)=10,1442 %, P(Feld=2)=8,9180 %,
 * P(Feld=3)=17,9806 %, Ausgleich 50,4020 %) — weit über dem Quote-Band UND
 * weit außerhalb des Feldausgleichs. Die Rechnung dazu (Satz 1 und Folgerung 2
 * angewandt auf EINZELNE Fruchtvorkommen): eine Fruchtposition, die genau
 * EINMAL auf einem Band steht, liegt bei GLEICHVERTEILTER Walzenposition in
 * GENAU 5 von 20 Fenstern — UNABHÄNGIG davon, WELCHE der 20 Positionen sie
 * einnimmt (Rotationsinvarianz eines einzelnen Punkts auf einem Ring). Die
 * damalige Suche variierte ausschließlich die POSITION dieser Vorkommen
 * (Nachbar-Offsets, Blockstart), nie ihre ANZAHL — und weil sowohl die
 * Erwartung E[Feld] (Summe dreier Erwartungswerte, linear, siehe Folgerung 2)
 * als auch, empirisch bestätigt, die volle Verteilung von (Feld=1/2/3) nur
 * von dieser ANZAHL abhängen, nicht von der Position, war die gesamte
 * damalige Suche strukturell blind für die Feldverteilung. Der Kassensturz
 * in Teil 1 des Plans (E[Feld] ≈ 2,4) war ein Überschlag, der die tatsächliche
 * Bauform (vier Grundpositionen + zwei Nachbarn je garantierter Walze, macht
 * WEIT höhere Fruchtdichte als angenommen) unterschätzt hatte — die exakte
 * Rechnung ergibt E[Feld] = 4,50, und dieser Wert ist beim baulichen
 * MINIMUM (genau ein Exemplar jeder Frucht pro Walze, weniger verstieße
 * gegen Bandregel 7) bereits ERREICHT und kann durch reine Umsortierung
 * nicht mehr sinken. Die Stellschraube, die tatsächlich etwas bewirkt, ist
 * deshalb NICHT die Position, sondern (a) Stellschraube 4 — die Gewinnwerte
 * senken, um den LINIEN-Anteil der Quote zu kompensieren, denn nur er ist
 * noch frei wählbar — und (b) eine ECHTE Erweiterung des Suchraums um die
 * ANZAHL zusätzlicher Fruchtvorkommen je Walze und Sorte (siehe „DER
 * SUCHRAUM DIESER AUSBAUSTUFE" unten), weil nur eine veränderte Anzahl die
 * KORRELATION zwischen den drei Fruchtsorten je Walzenfenster verschiebt und
 * damit die FORM der Feldverteilung (nicht nur ihren Erwartungswert) ändern
 * kann — auch wenn E[Feld] dabei zwangsläufig weiter steigt, nie sinkt.
 *
 * GEMESSENER BEFUND aus Messlauf F3-M2 (voller Lauf, 64.000.000 Stellungen,
 * mit der Bauform „mehr-a"/„block"/„block" unten): P-15 blieb rot —
 * Runde=1 → 4.402.788, Runde=2 → 3.910.491, Runde=3 → 5.428.423 Stellungen,
 * relative Abweichung vom Mittel (max−min)/max = 27,85 %, über der
 * Vorgabe ±10 %. Auf gezielte Anweisung wurde daraufhin EIN ZWEITER
 * Suchdurchlauf mit zwei genauer getrennten Stellschrauben gefahren, beide
 * unten in `guaranteedLayoutChoices()`/`freeLayoutChoices()` als benannte
 * Einträge erhalten (nicht wieder entfernt, damit dieser Befund
 * nachvollziehbar bleibt):
 *
 *   (a) FEINERE Fruchtzahl-Zwischenstufen auf den garantierten Walzen
 *       zwischen „mehr-a" (4+2+1=7 Früchte) und „viel-beide" (4+3+3=10):
 *       „4-3-1" (4+3+1=8, andere Aufteilung als „mehr-beide"s 4+2+2),
 *       „4-1-3" (4+1+3=8, Rollen vertauscht), „5-2-1" und „5-1-1" (eine
 *       FÜNFTE, zusätzliche Kopie der Leitfrucht selbst). ERGEBNIS: alle
 *       vier SCHLECHTER als „mehr-a" — 61,30 % / 76,67 % / 85,72 % / 85,07 %
 *       Ausgleich (Stufe 1, exakt, mit „block"/„block" auf den freien
 *       Walzen). Eine andere Aufteilung DERSELBEN Gesamtzahl (4-3-1 versus
 *       4-2-2) ist NICHT gleichwertig — sie kann erheblich schlechter sein,
 *       weil die konkrete Sorte, die die Zusatzkopien trägt, über
 *       `SMALL_FRUITS.filter(f => f !== leitfrucht)` unterschiedlich oft in
 *       der Rolle „a" bzw. „b" über die vier Walzen verteilt auftaucht
 *       (siehe Quelltext von `buildGuaranteedReelFromLayout()`).
 *   (b) Die LAGE (nicht nur Anzahl) der drei kleinen Früchte auf einer
 *       freien Walze — „verstreut" (Ringabstände 7/7/6, KEINE zwei Früchte
 *       können je im selben Fünferfenster liegen), „verstreut-5-10"
 *       (Abstände 5/5/10) und „halb-verstreut" (Abstände 4/5/11, eine
 *       Überschneidung möglich). ERGEBNIS: ALLE drei SCHLECHTER als
 *       „block" — mit „mehr-a" auf den garantierten Walzen liefert
 *       „halb-verstreut" 65,94 %, „verstreut"/„verstreut-5-10" 73,47 %
 *       Ausgleich (Stufe 1, exakt), statt 27,78 % mit „block". Das
 *       widerlegt die naheliegende Vermutung, ein Auseinanderziehen der
 *       drei Früchte würde die Streuung der Feldsumme UND damit den
 *       Ausgleich verbessern.
 *
 * WARUM (b) IN DIE FALSCHE RICHTUNG WIRKT — nachgerechnet, nicht vermutet.
 * Ein Fruchtpunkt liegt in genau 5 der 20 Fenster (Rotationsinvarianz,
 * siehe oben), UNABHÄNGIG von der Anordnung. Was von der Anordnung ABHÄNGT,
 * ist die ÜBERLAPPUNG dieser drei Fünfer-Fenstermengen: bei „block"
 * (Positionen 0,1,2, maximale gegenseitige Nähe) überlappen sie stark, die
 * VEREINIGUNG aller Fenster mit mindestens einer Frucht hat nur 7 von 20
 * Elementen — 13 von 20 Fenstern zeigen also GAR KEINE Frucht auf dieser
 * Walze (die Rechnung: drei überlappende Fünferintervalle um einen
 * Dreierblock ergeben eine zusammenhängende Sieben-Fenster-Vereinigung).
 * Bei „verstreut" (Abstände ≥5, KEINE Überlappung) ist die Vereinigung
 * dagegen 5+5+5=15 von 20 Fenstern — nur noch 5 von 20 zeigen keine Frucht.
 * Für den Feldgewinn 1 müssen BEIDE freien Walzen GLEICHZEITIG keine Frucht
 * zeigen: mit „block" ist das (13/20)² ≈ 42 %, mit „verstreut" nur noch
 * (5/20)² ≈ 6 % — ein Einbruch um mehr als das Sechsfache. Dass „verstreut"
 * dabei NIE mehr als eine Frucht gleichzeitig zeigt (statt bis zu drei bei
 * „block"), hilft nicht: es tauscht SELTENE GROSSE Sprünge (die ohnehin
 * schon außerhalb von Feld=1/2/3 landen, siehe unten) gegen HÄUFIGE KLEINE
 * Sprünge (die die Masse von Feld=1 zu Feld=2/3 hinüberziehen) — für den
 * Ausgleich ist das eine Verschlechterung, nicht die vermutete Verbesserung.
 * Daraus folgt zugleich ein STRUKTURBEWEIS, kein Suchergebnis: „block"
 * (der voll überlappende, zusammenhängende Dreierblock) MAXIMIERT die
 * Vereinigungsmenge-Komplement — also P(Walze zeigt keine Frucht) — unter
 * allen Anordnungen von drei Pflichtvorkommen, weil drei Fünfer-Intervalle
 * ihre gemeinsame Vereinigung genau dann minimieren, wenn sie maximal
 * überlappen, und maximale Überlappung heißt: die drei Ausgangspunkte liegen
 * so dicht wie möglich beieinander (Abstand 1, nicht mehr). Eine bessere
 * Anordnung als „block" gibt es für DIESE Zielgröße also nicht — jede
 * Suche in diese Richtung ist bereits erschöpft, nicht nur unglücklich.
 *
 * SCHLUSSFOLGERUNG für Umsetzungsstück F3c (falls es eine gäbe): Innerhalb
 * der Bauform aus Entwurfsregel 2 (vier garantierte Walzen strukturell
 * gleich, EINE Leitfrucht je Walze mit vierfacher Grundbelegung, zwei
 * freie Walzen mit dem baulichen Minimum von drei kleinen Früchten) ist
 * „mehr-a"/„block"/„block" ein NACHGEWIESENES lokales Optimum: jede der elf
 * getesteten Abweichungen (fünf feinere Fruchtzahl-Stufen auf den
 * garantierten Walzen, drei Streuungs-Varianten auf den freien Walzen,
 * dazu die bereits in F3a widerlegten reinen Positionsvarianten) verschlechtert
 * den Ausgleich. Eine Verbesserung unter ±10 % würde die Bauform selbst
 * ändern müssen — z. B. eine ANDERE Verteilung der Leitfrüchte auf die vier
 * Walzen als K,K,Z,O, oder eine WALZENINDIVIDUELLE statt einer für alle
 * vier Walzen gleichen Struktur.
 *
 * NACHTRAG (dritter Durchgang): genau diese beiden Auflagen wurden auf
 * ausdrückliche Erweiterung des Auftrags anschließend fallengelassen — der
 * Modus `--lokale-suche` unten (simuliertes Abkühlen über einzelne,
 * regelerhaltende Züge je Walze) sucht OHNE jede Katalog-Bauform direkt
 * über die Bandbelegung. Ergebnis: eine kleine, aber echte Verbesserung auf
 * 26,08 % Ausgleich (von 27,85 %), danach eine FLACHE Umgebung ohne weitere
 * Bewegung über rund 285.000 geprüfte Züge und neun Läufe unterschiedlicher
 * Starttemperatur und Seeds. Vollständiger Suchverlauf mit Zahlen je Lauf:
 * DECISIONS.md, Eintrag „Dritter Durchgang" zu Phase F3b.
 *
 * NACHTRAG (vierter Durchgang, REVIEW-fruitrisk-f3.md [H2]): der Review hat
 * nachgewiesen, dass KEINER der drei vorherigen Durchgänge die FRUCHT-
 * GEOMETRIE der vier garantierten Walzen als Suchdimension geführt hat —
 * alle vier tragen bis heute unverändert die sieben Fruchtpositionen
 * {0,1,2,3,5,10,15} aus dem allerersten Katalog (Stufe 0), was P(Feld=1)
 * strukturell auf (13/20)^6 ≈ 7,54 % deckelt (nachgerechnet und bestätigt,
 * siehe DECISIONS.md, Eintrag zum vierten Durchgang). Der Modus
 * `--geometrie-suche` unten öffnet genau diese Dimension: WELCHE der drei
 * kleinen Früchte auf welcher der vier Grundpositionen 0/5/10/15 liegt
 * (`guaranteedGeometryCatalog()`/`buildGuaranteedReelFromGrid()`), von der
 * Größe 4 (baulichem Minimum) bis zur heutigen Größe 7, per
 * Koordinatenabstieg über alle sechs Walzen. ERGEBNIS: die Dimension wirkt
 * TATSÄCHLICH — eine einzelne garantierte Walze auf Größe 5 verbessert den
 * Ausgleich von 27,78 % auf 20,78 % —, reißt dabei aber JEDES Mal die Quote
 * unter 95,0 % (gemessen 78–91 % je nach Bauform, gegenüber 96,79 % am
 * Startpunkt). Innerhalb des Katalogs dieser Ausbaustufe UND bei
 * unveränderter PAYTABLE (Stellschraube 4 bleibt außen vor, siehe unten)
 * verbessert deshalb kein einziger geprüfter Kandidat den Ausgleich UND
 * hält gleichzeitig die Quote im Band — die heutige Bandbelegung (26,08 %
 * Ausgleich, dritter Durchgang) bleibt nach diesem vierten Durchgang die
 * beste bekannte. Die Aussage „strukturell unerreichbar" aus dem Eintrag
 * vom 2026-09-05 04:27 CEST war damit VOREILIG (der Review hat recht: die
 * Dimension war nie durchsucht) — nach ordentlicher Suche steht sie jetzt
 * aber, mit der zusätzlichen Einschränkung „bei unveränderter PAYTABLE",
 * erneut. Eine Verbesserung würde eine gleichzeitige Neuabstimmung von
 * Rules::PAYTABLE (Stellschraube 4, alle 48 Werte, mit `sieben × 6 = 100`
 * weiterhin exakt) verlangen — das ist eine eigene, deutlich größere
 * Aufgabe und ausdrücklich NICHT Teil dieses Durchgangs. Vollständiger
 * Suchverlauf: DECISIONS.md, Eintrag „Vierter Durchgang" zu Phase F3c.
 *
 *
 * WARUM DAS URTEIL DIESES WERKZEUGS AUF DEN VOLLEN LAUF ÜBERTRÄGT
 * -----------------------------------------------------------------
 * Fünf der sieben Fertig-Bedingungen sind EXAKT entschieden, bevor
 * irgendetwas läuft: die Gewinngarantie ist ein Bandbeweis über 120
 * Fenster, die sieben Bandregeln sind Aussagen über die Bänder selbst, der
 * höchste Linienwert ist eine Eigenschaft der Tabelle, die Wertgleichheit
 * von PHP und JavaScript ist ein Zeichenvergleich, und die Quote folgt in
 * GESCHLOSSENER FORM aus Satz 1 — keine Schätzung, sondern dieselbe Zahl,
 * die der volle Lauf aufsummieren muss. Von der sechsten — der
 * Gleichheit der drei kleinsten Gewinne — ist der tragende Faktor
 * P(Feld=k) ebenfalls exakt (Folgerung 2); geschätzt wird nur die
 * Restkorrektur P(keine Linie zahlt | Feld=k), die nahe 0,8 liegt und sich
 * zwischen k=1,2,3 nur um wenige Promille unterscheidet. Bei 2.000.000
 * Stellungen und einer Wahrscheinlichkeit um 0,2 liegt der
 * Stichprobenfehler bei rund 0,3 % relativ — gut dreißigmal enger als die
 * Toleranz von ±10 %. Nur der tatsächliche Rundenhöchstgewinn ist aus einer
 * Stichprobe grundsätzlich nicht sicher abzulesen; er ist deshalb keine
 * Bedingung dieses Werkzeugs, sondern eine reine Ausweisung des vollen
 * Laufs (verify-payout.mjs).
 *
 *
 * WARUM KEIN crypto.getRandomValues
 * -----------------------------------
 * Das ist die Anforderung an das SPIEL (Phase F4). Ein Prüfwerkzeug braucht
 * das Gegenteil: Wiederholbarkeit. Der Xorshift-Generator unten zieht mit
 * einem festen, im Quelltext stehenden Startwert — jeder Lauf mit
 * derselben `--runden`-Zahl liefert deshalb dieselbe Stichprobe.
 *
 *
 * STUFE 0 — DIE SAAT (Bauvorschrift statt Zufall)
 * --------------------------------------------------
 * Jede der vier garantierten Walzen (Entwurfsregel 2 des Plans) trägt ihre
 * Leitfrucht auf den vier gleichmäßig verteilten Grundpositionen 0, 5, 10,
 * 15 (Abstand = Fensterbreite 5 ⇒ jedes Fünferfenster trifft baulich genau
 * eine davon — Bandregel 4 ist damit für diese vier Walzen ohne jede
 * Rechnung erfüllt) und die beiden ANDEREN kleinen Früchte je einmal an
 * zwei benachbarten Positionen. Jede freie Walze trägt alle drei kleinen
 * Früchte als einen zusammenhängenden Dreierblock — das lässt zwingend
 * eine mindestens fünfzehn Positionen lange fruchtfreie Strecke übrig, weit
 * mehr als die geforderte eine (Bandregel 4, zweite Hälfte). Die
 * restlichen Positionen füllt eine Rückverfolgung (Backtracking) mit den
 * neun Liniensymbolen, streng nach Bandregel 2 (kein Nachbar gleich) und
 * Bandregel 3 (mindestens vier fremde Positionen zwischen zwei gleichen
 * Liniensymbolen).
 *
 * STUFE 1 — EXAKTE BEWERTUNG (Mikrosekunden je Kandidat)
 * -----------------------------------------------------------
 * Für jeden Kandidaten: alle sieben Bandregeln (Ja/Nein, siehe
 * checkBandRules()), die Quote in geschlossener Form (closedFormRtp()) und
 * die vollständige, EXAKTE Verteilung des Feldgewinns über eine Faltung
 * (fieldAmountDistribution()) — keine Näherung, nur wenige hundert
 * Zwischenzustände.
 *
 * STUFE 2 — STICHPROBE (rund eine Sekunde je Kandidat)
 * ---------------------------------------------------------
 * Für die besten Kandidaten aus Stufe 1: eine Stichprobe von `--runden`
 * gleichverteilten Stellungen, ausgewertet mit DERSELBEN evaluate() aus
 * paytable.js, mit der ab Phase F4 der Browser rechnet. Gemessen werden nur
 * die Größen, die nicht exakt zu haben sind: P(Runde=1/2/3/10) und der
 * größte in der Stichprobe gesehene Rundengewinn.
 *
 *
 * DER SUCHRAUM DIESER AUSBAUSTUFE — erweitert gegenüber F3a, aus dem
 * GEMESSENEN BEFUND oben abgeleitet
 * -----------------------------------------------------------------
 * Die Vorgängerausbaustufe (F3a) variierte nur die POSITION einzelner
 * Fruchtvorkommen (Nachbar-Offset, Blockstart) — nachweislich wirkungslos
 * für Quote UND Feldausgleich (siehe GEMESSENER BEFUND). Diese Ausbaustufe
 * öffnet stattdessen die ANZAHL zusätzlicher Fruchtvorkommen je Walze und
 * Sorte, weil nur sie die Korrelation zwischen den drei Fruchtsorten je
 * Walzenfenster — und damit die FORM der Feldverteilung — überhaupt
 * verändern kann (siehe GEMESSENER BEFUND für die Begründung über
 * Rotationsinvarianz und Linearität des Erwartungswerts).
 *
 * GARANTIERTE WALZEN (`guaranteedLayouts`, gleiche Bauform auf allen vier
 * Walzen, nur die Leitfrucht wechselt — C.14.7 verlangt keine wechselseitig
 * verschiedene innere Struktur, siehe DECISIONS.md F3a): fünf Bauformen,
 * die beiden Nicht-Leitfrüchte tragen je 1 oder 2 zusätzliche Vorkommen,
 * nah an einer Grundposition oder auf den Zwischenraum verteilt.
 *
 * FREIE WALZEN (`freeLayouts`, DIE BEIDEN FREIEN WALZEN DÜRFEN
 * VERSCHIEDENE BAUFORMEN TRAGEN — anders als bei den garantierten Walzen
 * gibt es hier keine Symmetrieauflage, und eine asymmetrische Bauform ist
 * eine zusätzliche, sonst ungenutzte Freiheit): sieben Bauformen von
 * "ein zusammenhängender Dreierblock" (verursacht das seltene, aber
 * quotenrelevante Ereignis "alle drei Sorten gleichzeitig im Fenster") über
 * "halb zusammenhängend mit Lücke" bis zu "eine zusätzliche, weit entfernte
 * Kopie einer oder aller drei Sorten". Kombiniert: 5 × 7 × 7 = 245
 * Kandidaten, jeder in Mikrosekunden bewertet (Stufe 1) — deutlich unter der
 * Sekunde für die ganze Stufe 1.
 *
 * WARUM DER BLOCKSTART / DIE ABSOLUTE POSITION NICHT MEHR ALS EIGENE
 * STELLSCHRAUBE AUFTAUCHT: aus der Rotationsinvarianz (GEMESSENER BEFUND)
 * folgt, dass eine reine Verschiebung ALLER Fruchtpositionen einer Walze um
 * denselben Betrag weder die Quote noch die Feldverteilung verändert — jede
 * Bauform unten steht deshalb stellvertretend für alle 20 Rotationen ihrer
 * selbst, ohne dass diese einzeln durchsucht werden müssten. Der `cutoff`
 * der Liniensymbolverteilung (vormals Stellschraube 3) ist aus demselben
 * Grund auf 0 fixiert: `buildLineSymbolCounts()` ist bei den hier
 * vorkommenden Fruchtzahlen (6–8 je garantierter, 3–6 je freier Walze)
 * für JEDEN Schnittpunkt erfüllbar, und die Vorgängerausbaustufe hat bereits
 * gezeigt, dass der Schnittpunkt selbst keinen messbaren Unterschied macht.
 */

import {
	LAP, LINES, LINE_SYMBOLS, MAX_LINE_VALUE, MIN_CHAIN, PAYTABLE, REELS, ROWS,
	SMALL_FRUITS, STAKE, SYMBOLS, evaluate,
} from '../../Public/JavaScript/paytable.js';

/*
 * Dieses Werkzeug LIEST Classes/Rules.php nicht — das ist verify-payout.mjs's
 * Aufgabe (es prüft eine bestehende Datei). tune-strips.mjs ERZEUGT nur den
 * fertigen Block für sie, deshalb kommt hier kein Dateizugriff auf Rules.php
 * vor.
 */

const TOTAL = LAP ** REELS;
const QUOTE_BAND_MIN = 0.950;
const QUOTE_BAND_MAX = 0.995;
const QUOTE_TARGET = 0.98;
const FIELD_BALANCE_TOLERANCE = 0.08; // etwas strenger als die verlangten ±10 %

const GUARANTEED_REELS = [0, 1, 2, 3];
const FREE_REELS = [4, 5];
const LEITFRUCHT_BY_REEL = { 0: 'kirsche', 1: 'kirsche', 2: 'zitrone', 3: 'orange' };
const FIELD_LADDER = { 2: 1, 3: 2, 4: 3, 5: 4 };
const FIELD_CAP_AT = 6;
const FIELD_CAP_VALUE = 5;

const DEFAULT_ROUNDS = 2_000_000;
const FIXED_SEED = 0x46525549; // "FRUI" als Zahl gelesen — fest, damit jeder Lauf reproduzierbar ist.
const TOP_CANDIDATES_FOR_STAGE_2 = 8;

/**
 * Bauformen für die beiden Nicht-Leitfrüchte einer garantierten Walze
 * (Stellschraube 1). `a` und `b` sind Positionslisten relativ zur
 * Grundposition 0 — `a` bekommt die erste, `b` die zweite der beiden
 * Sorten aus `SMALL_FRUITS.filter(f => f !== leitfrucht)` (in dieser
 * Reihenfolge, siehe `buildGuaranteedReelFromLayout()`). Mehr als ein Wert
 * je Liste bedeutet: diese Sorte bekommt eine ZUSÄTZLICHE Kopie — die
 * einzige Stellgröße, die laut GEMESSENEM BEFUND überhaupt etwas bewirkt.
 *
 * @returns {{name: string, a: number[], b: number[]}[]}
 */
function guaranteedLayoutChoices() {
	return [
		{ name: 'nah',        a: [1],    b: [2]    },
		{ name: 'fern',       a: [1],    b: [4]    },
		{ name: 'mehr-a',     a: [1, 3], b: [2]    },
		{ name: 'mehr-b',     a: [1],    b: [2, 4] },
		{ name: 'mehr-beide', a: [1, 3], b: [2, 4] },
		{ name: 'viel-beide', a: [1, 3, 6], b: [2, 4, 7] },
		// Feinere Zwischenstufen zwischen „mehr-a" (4+2+1=7) und
		// „viel-beide" (4+3+3=10), auf gezielte Anweisung nach Messlauf F3-M2:
		{ name: '4-3-1',       a: [1, 3, 6], b: [2] },
		{ name: '4-1-3',       a: [1],       b: [2, 4, 7] },
		{ name: '5-2-1',       leit: [8], a: [1, 3], b: [2] },
		{ name: '5-1-1',       leit: [8], a: [1],    b: [2] },
	];
}

/**
 * Bauformen für eine freie Walze (Stellschraube 2). `k`/`z`/`o` sind
 * Positionslisten relativ zu Position 0 für Kirsche/Zitrone/Orange. Die
 * beiden freien Walzen dürfen aus dieser Liste UNABHÄNGIG voneinander
 * wählen (siehe Hauptschleife) — anders als bei den garantierten Walzen
 * gibt es hier keine Symmetrieauflage aus dem Konzept.
 *
 * @returns {{name: string, k: number[], z: number[], o: number[]}[]}
 */
function freeLayoutChoices() {
	return [
		{ name: 'block',      k: [0],     z: [1],      o: [2]     },
		{ name: 'streu-nah',  k: [0],     z: [2],      o: [4]     },
		{ name: 'streu-weit', k: [0],     z: [3],      o: [6]     },
		{ name: 'mehr-k',     k: [0, 10], z: [3],      o: [6]     },
		{ name: 'mehr-z',     k: [0],     z: [3, 13],  o: [6]     },
		{ name: 'mehr-o',     k: [0],     z: [3],      o: [6, 16] },
		{ name: 'mehr-alle',  k: [0, 10], z: [3, 13],  o: [6, 16] },
		{ name: 'block-doppel', k: [0, 10], z: [1, 11], o: [2, 12] },
		// Gezielt nach Messlauf F3-M2: die LAGE (nicht nur die Anzahl) der
		// drei kleinen Früchte auf einer freien Walze. Ein zusammenhängender
		// Block erzeugt Fenster mit 0/1/2/3 Früchten (viel Streuung, treibt
		// Runde=3 und höher); drei Positionen mit Ringabstand ≥5 zueinander
		// können dagegen NIE zu zweit im selben Fünferfenster liegen — jedes
		// Fenster zeigt dann höchstens EINE der drei Früchte (keine Streuung
		// dieser Walze, kostet keine zusätzliche Frucht).
		{ name: 'verstreut',      k: [0], z: [7],  o: [14] }, // Abstände 7/7/6 — maximal gleichmäßig auf einem Ring von 20
		{ name: 'verstreut-5-10', k: [0], z: [5],  o: [10] }, // Abstände 5/5/10 — ebenfalls ohne Überschneidung, asymmetrisch
		{ name: 'halb-verstreut', k: [0], z: [4],  o: [9]  }, // Abstände 4/5/11 — EINE Überschneidungsmöglichkeit (k/z), Zwischenstufe
	];
}

/**
 * Trägt beliebig viele Fruchtpositionen je Sorte auf ein leeres Band ein
 * und füllt den Rest per Rückverfolgung mit den Liniensymbolen.
 *
 * @param {Record<string, number[]>} positionsByType
 * @param {[string, number][]} lineCounts
 * @returns {string[]|null}
 */
function buildReelFromPositions(positionsByType, lineCounts) {
	const strip = new Array(LAP).fill(null);
	for (const [type, positions] of Object.entries(positionsByType)) {
		for (const rawPosition of positions) {
			const position = ((rawPosition % LAP) + LAP) % LAP;
			if (strip[position] !== null) {
				return null; // zwei Fruchtpositionen kollidieren — kein gültiger Kandidat, kein Fehler.
			}
			strip[position] = type;
		}
	}
	return fillLineSymbols(strip, lineCounts) ? strip : null;
}

/**
 * Baut eine nicht-fallende (entlang LINE_SYMBOLS wachsende) Zähltabelle der
 * neun Liniensymbole, Summe = `total`. Verteilt zusätzliche Kopien per
 * RUNDLAUF von HINTEN (dem am wenigsten wertvollen Liniensymbol) nach vorn,
 * in VOLLEN DURCHLÄUFEN — jedes Symbol bekommt höchstens eine weitere Kopie,
 * bevor irgendein Symbol eine zweite bekommt — statt EIN Symbol bis zum
 * Deckel 4 zu sättigen, bevor das nächste beginnt.
 *
 * WARUM DAS SEIT DIESER AUSBAUSTUFE SO SEIN MUSS (gefunden beim Testlauf
 * der Erweiterung, siehe DECISIONS.md): eine Sättigung auf EIN Symbol
 * verlangt für Anzahl 4 auf einem Ring von 20 Positionen zwingend das
 * EXAKTE 5er-Raster (0/5/10/15 oder eine Verschiebung davon, siehe
 * Bandregel 3 — 4 Kopien mit Mindestabstand 5 auf einem 20er-Ring gehen nur
 * so auf). Sobald andere Fruchtpositionen (Stellschraube 1/2 dieser
 * Ausbaustufe) bereits IRGENDEINE Position in JEDER der vier
 * Restklassen mod 5 belegen — was bei den hier vorkommenden Bauformen der
 * Regelfall ist — gibt es dieses Raster nicht mehr frei, und die
 * Rückverfolgung sucht ERGEBNISLOS bis zur vollständigen Erschöpfung (exakt
 * derselbe Fehlerdruck wie der in DECISIONS.md dokumentierte
 * Pflaume-Befund aus F3a, nur diesmal durch die Verteilung statt durch die
 * Abstandsformel verursacht). Der Rundlauf verteilt dieselbe Restmenge
 * stattdessen über MEHRERE Symbole mit je höchstens 2, was ein Vielfaches
 * leichter unterzubringen ist. Weiterhin garantiert: „je wertvoller, desto
 * seltener" (Bandregel 6) für JEDE Restmenge — ein voller Durchlauf erhöht
 * nie ein wertvolleres Symbol, ohne alle weniger wertvollen zuvor erhöht zu
 * haben. `cutoff` friert die Symbole VOR diesem Index auf genau eine
 * Position ein; diese Ausbaustufe ruft die Funktion ausschließlich mit
 * `cutoff = 0` auf (siehe Kopfkommentar, Abschnitt „DER SUCHRAUM").
 *
 * @param {number} total
 * @param {number} cutoff Index in LINE_SYMBOLS, ab dem aufgefüllt wird (0…8).
 * @returns {[string, number][]} Paare [Symbol, Anzahl] in LINE_SYMBOLS-Reihenfolge.
 */
function buildLineSymbolCounts(total, cutoff) {
	const counts = LINE_SYMBOLS.map(() => 1);
	let remaining = total - LINE_SYMBOLS.length;
	if (remaining < 0) {
		throw new Error(`buildLineSymbolCounts: ${total} reicht nicht für die neun Liniensymbole (je mindestens 1).`);
	}
	while (remaining > 0) {
		let progressedThisRound = false;
		for (let i = LINE_SYMBOLS.length - 1; i >= cutoff && remaining > 0; i--) {
			if (counts[i] < 4) {
				counts[i]++;
				remaining--;
				progressedThisRound = true;
			}
		}
		if (!progressedThisRound) {
			break;
		}
	}
	if (remaining > 0) {
		throw new Error(`buildLineSymbolCounts: ${total} übersteigt selbst mit Deckel 4 die Kapazität ab Index ${cutoff}.`);
	}
	return LINE_SYMBOLS.map((symbol, i) => [symbol, counts[i]]);
}


/**
 * Füllt die noch leeren (mit null markierten) Positionen eines Bands mit
 * den neun Liniensymbolen, per Rückverfolgung: Bandregel 2 (kein direkter
 * Nachbar gleich, Rundumschluss eingeschlossen) und Bandregel 3 (mindestens
 * vier fremde Positionen zwischen zwei gleichen Liniensymbolen, geprüft als
 * zyklischer Mindestabstand 5 über ALLE Nachbarpaare inklusive Umlauf).
 *
 * ZWEI FALLSTRICKE, DIE HIER BEWUSST BEHOBEN SIND (Fund während des
 * Probelaufs von F3a, siehe DECISIONS.md):
 *
 *   1. Die freien Positionen werden NICHT in aufsteigender Index-
 *      Reihenfolge (0…LAP-1) durchlaufen, sondern in echter RING-
 *      Reihenfolge, beginnend direkt NACH einer bereits belegten (Frucht-)
 *      Position. Ohne diese Drehung zerfällt ein zusammenhängender freier
 *      Bogen, der über den Indexsprung LAP-1→0 hinweg läuft (z. B.
 *      Fruchtblock ab Position 4: der Bogen läuft real 7…19→0…3), beim
 *      aufsteigenden Durchlauf in zwei scheinbar getrennte Stücke — der
 *      linke Nachbar von Position 0 (Bandregel 2) würde dann nie gegen
 *      seinen echten Ringnachbarn (Position 19) geprüft.
 *   2. Der Mindestabstand (Bandregel 3) wird über die ECHTE, MODULARE
 *      Ringdistanz zwischen zwei rohen Positionen verglichen
 *      (`ringDistance()`), nicht über eine einfache Subtraktion und nicht
 *      über die Zählung der dazwischenliegenden LINIENSYMBOL-Schritte.
 *      Eine reine Schrittzählung sieht bei garantierten Walzen falsch aus:
 *      dort liegen Fruchtpositionen (0/5/10/15 plus zwei Nachbarn) MITTEN
 *      im freien Bogen, sodass zwei Liniensymbol-Plätze mit echtem
 *      Ringabstand 5 (z. B. Position 3 und 8, mit der Fruchtposition 5
 *      dazwischen) nur 4 Liniensymbol-Schritte auseinanderliegen — eine
 *      Schrittzählung verlangt dann fälschlich einen größeren Abstand, als
 *      Bandregel 3 überhaupt fordert, und macht dadurch die für Pflaume
 *      (vier Vorkommen bei Ringgröße 20 — rechnerisch nur als exaktes
 *      Fünferraster möglich, ohne jeden Spielraum) einzig möglichen
 *      Bandmuster unerreichbar. Beobachtet als mehrminütiger Hänger mit
 *      Millionen Rückverfolgungsschritten, obwohl eine gültige Belegung
 *      nachweislich existiert.
 *
 * @param {(string|null)[]} strip Länge LAP, kleine Früchte bereits eingetragen.
 * @param {[string, number][]} lineCounts
 * @returns {boolean} true, wenn eine gültige Platzierung gefunden wurde (strip wird dabei mutiert).
 */
function fillLineSymbols(strip, lineCounts) {
	let anchor = -1;
	for (let p = 0; p < LAP; p++) {
		if (strip[p] !== null) {
			anchor = p;
			break;
		}
	}
	if (anchor === -1) {
		throw new Error('fillLineSymbols: das Band trägt noch keine einzige belegte Position (keine kleine Frucht?).');
	}

	const freePositions = [];
	for (let step = 1; step <= LAP; step++) {
		const p = (anchor + step) % LAP;
		if (strip[p] === null) {
			freePositions.push(p);
		}
	}

	const remaining = new Map(lineCounts);
	const totalTasks = [...remaining.values()].reduce((sum, n) => sum + n, 0);
	if (totalTasks !== freePositions.length) {
		throw new Error(`fillLineSymbols: ${totalTasks} Liniensymbole für ${freePositions.length} freie Positionen.`);
	}

	// Für den Mindestabstand (Bandregel 3) zählt die ECHTE Ringdistanz
	// zwischen zwei rohen Ringpositionen — das ist genau das, was die Regel
	// meint, unabhängig davon, ob dazwischen eine belegte (Frucht-)Position
	// liegt. Zwei Fallstricke, beide durch dieselbe modulare Formel gelöst,
	// keine Sonderfälle nötig:
	//   a) bei garantierten Walzen liegen Fruchtpositionen MITTEN im freien
	//      Bogen (5, 10, 15) — eine reine Schrittzählung innerhalb der
	//      Liniensymbol-Slots würde das ÜBERSPRUNGENE Ringstück verschweigen
	//      und den nötigen Abstand künstlich verschärfen;
	//   b) bei freien Walzen kann der Bogen über die Grenze LAP-1→0 laufen
	//      (z. B. Block ab Position 4: Bogen 7…19,0…3) — eine einfache
	//      Subtraktion ergäbe dort eine negative, fälschlich abgelehnte
	//      Differenz.
	// ringDistance(a, b) liefert für a<b, a>b und a=b stets denselben,
	// korrekten "wie weit vorwärts von a nach b"-Wert.
	function ringDistance(from, to) {
		return (to - from + LAP) % LAP;
	}

	const lastPosition = new Map();
	const firstPosition = new Map();

	function candidatesFor(position, leftSymbol) {
		return [...remaining.entries()]
			.filter(([symbol, count]) => count > 0 && symbol !== leftSymbol)
			.filter(([symbol]) => {
				const last = lastPosition.get(symbol);
				return last === undefined || ringDistance(last, position) >= 5;
			})
			.sort((a, b) => b[1] - a[1])
			.map(([symbol]) => symbol);
	}

	function wraparoundOk() {
		for (const [symbol, first] of firstPosition) {
			const last = lastPosition.get(symbol);
			if (first === last) {
				continue;
			}
			if (ringDistance(last, first) < 5) {
				return false;
			}
		}
		return true;
	}

	function backtrack(index) {
		if (index === freePositions.length) {
			return wraparoundOk();
		}
		const position = freePositions[index];
		const leftSymbol = strip[(position - 1 + LAP) % LAP];

		for (const symbol of candidatesFor(position, leftSymbol)) {
			strip[position] = symbol;
			remaining.set(symbol, remaining.get(symbol) - 1);
			const hadFirst = firstPosition.has(symbol);
			const previousLast = lastPosition.get(symbol);
			if (!hadFirst) {
				firstPosition.set(symbol, position);
			}
			lastPosition.set(symbol, position);

			if (backtrack(index + 1)) {
				return true;
			}

			strip[position] = null;
			remaining.set(symbol, remaining.get(symbol) + 1);
			if (previousLast === undefined) {
				lastPosition.delete(symbol);
			} else {
				lastPosition.set(symbol, previousLast);
			}
			if (!hadFirst) {
				firstPosition.delete(symbol);
			}
		}
		return false;
	}

	return backtrack(0);
}

/**
 * Baut eine garantierte Walze: Leitfrucht auf 0/5/10/15 (vier Kopien, macht
 * Bandregel 4 für diese Walze ohne jede Rechnung wahr, siehe Satz 2), die
 * beiden anderen kleinen Früchte gemäß `layout.a`/`layout.b` (je 1 oder
 * mehr Kopien, siehe `guaranteedLayoutChoices()`), Rest per Rückverfolgung
 * mit den Liniensymbolen.
 *
 * @param {string} leitfrucht
 * @param {{a: number[], b: number[]}} layout
 * @returns {string[]|null}
 */
function buildGuaranteedReelFromLayout(leitfrucht, layout) {
	const others = SMALL_FRUITS.filter((fruit) => fruit !== leitfrucht);
	const leit = layout.leit ?? [];
	const positions = {
		[leitfrucht]: [0, 5, 10, 15, ...leit],
		[others[0]]: layout.a,
		[others[1]]: layout.b,
	};
	const totalFruit = 4 + leit.length + layout.a.length + layout.b.length;
	const lineCounts = buildLineSymbolCounts(LAP - totalFruit, 0);
	return buildReelFromPositions(positions, lineCounts);
}

/**
 * Baut eine freie Walze gemäß `layout.k`/`layout.z`/`layout.o` (je 1 oder
 * mehr Kopien, siehe `freeLayoutChoices()`), Rest per Rückverfolgung.
 *
 * @param {{k: number[], z: number[], o: number[]}} layout
 * @returns {string[]|null}
 */
function buildFreeReelFromLayout(layout) {
	const positions = { kirsche: layout.k, zitrone: layout.z, orange: layout.o };
	const totalFruit = layout.k.length + layout.z.length + layout.o.length;
	const lineCounts = buildLineSymbolCounts(LAP - totalFruit, 0);
	return buildReelFromPositions(positions, lineCounts);
}

/**
 * P-1…P-7 dieser Ausbaustufe (dieselben sieben Bandregeln, die
 * verify-payout.mjs prüft), als reine Ja/Nein-Funktion für die Suche.
 *
 * @param {string[][]} strips
 * @returns {{ok: boolean, problems: string[]}}
 */
function checkBandRules(strips) {
	const problems = [];

	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		if (strip.length !== LAP) {
			problems.push(`Walze ${reel + 1}: ${strip.length} Positionen (erwartet ${LAP})`);
		}
		for (const symbol of strip) {
			if (!SYMBOLS.includes(symbol)) {
				problems.push(`Walze ${reel + 1}: unbekanntes Symbol „${symbol}"`);
			}
		}
	}
	if (problems.length > 0) {
		return { ok: false, problems };
	}

	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		for (let p = 0; p < LAP; p++) {
			if (strip[p] === strip[(p + 1) % LAP]) {
				problems.push(`Walze ${reel + 1}: Position ${p}/${(p + 1) % LAP} zeigen beide „${strip[p]}"`);
			}
		}
	}

	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		for (const symbol of LINE_SYMBOLS) {
			const positions = [];
			for (let p = 0; p < LAP; p++) {
				if (strip[p] === symbol) {
					positions.push(p);
				}
			}
			for (let i = 0; i < positions.length; i++) {
				const next = positions[(i + 1) % positions.length];
				const gap = i + 1 < positions.length ? next - positions[i] : LAP - positions[i] + next;
				if (positions.length > 1 && gap < 5) {
					problems.push(`Walze ${reel + 1}: „${symbol}" Abstand ${gap} < 5`);
				}
			}
		}
	}

	for (const reel of GUARANTEED_REELS) {
		const strip = strips[reel];
		for (let p = 0; p < LAP; p++) {
			let hasFruit = false;
			for (let r = 0; r < ROWS; r++) {
				if (SMALL_FRUITS.includes(strip[(p + r) % LAP])) {
					hasFruit = true;
				}
			}
			if (!hasFruit) {
				problems.push(`Walze ${reel + 1} (garantiert): Fenster ab Position ${p} ohne kleine Frucht`);
			}
		}
	}
	for (const reel of FREE_REELS) {
		const strip = strips[reel];
		let hasEmptyWindow = false;
		for (let p = 0; p < LAP; p++) {
			let hasFruit = false;
			for (let r = 0; r < ROWS; r++) {
				if (SMALL_FRUITS.includes(strip[(p + r) % LAP])) {
					hasFruit = true;
				}
			}
			if (!hasFruit) {
				hasEmptyWindow = true;
			}
		}
		if (!hasEmptyWindow) {
			problems.push(`Walze ${reel + 1} (frei): kein Fenster ohne kleine Frucht`);
		}
	}

	// Bandregel 6 gilt für die neun Liniensymbole (siehe DECISIONS.md,
	// Eintrag zu Phase F3a: die drei kleinen Früchte haben eine eigene
	// Mechanik und eine eigene bauliche Vorgabe — Bandregel 4 und
	// Entwurfsregel 2 — und sind davon so ausgenommen wie schon von
	// Bandregel 3).
	for (let reel = 0; reel < REELS; reel++) {
		const strip = strips[reel];
		const counts = {};
		for (const symbol of strip) {
			counts[symbol] = (counts[symbol] ?? 0) + 1;
		}
		for (let i = 0; i < LINE_SYMBOLS.length - 1; i++) {
			const a = LINE_SYMBOLS[i];
			const b = LINE_SYMBOLS[i + 1];
			if ((counts[a] ?? 0) > (counts[b] ?? 0)) {
				problems.push(`Walze ${reel + 1}: „${a}" (${counts[a] ?? 0}) häufiger als „${b}" (${counts[b] ?? 0})`);
			}
		}
	}

	for (let reel = 0; reel < REELS; reel++) {
		const present = new Set(strips[reel]);
		for (const symbol of SYMBOLS) {
			if (!present.has(symbol)) {
				problems.push(`Walze ${reel + 1}: Symbol „${symbol}" liegt kein einziges Mal auf diesem Band`);
			}
		}
	}

	return { ok: problems.length === 0, problems };
}

/** Position 0…4 jeder Walze, von oben nach unten — die Grundstellung. */
function deriveDefaultGrid(strips) {
	const grid = [];
	for (let row = 0; row < ROWS; row++) {
		grid.push(strips.map((strip) => strip[row % LAP]));
	}
	return grid;
}

/** Symbolzahlen je Walze, für die geschlossene Form. */
function reelSymbolCounts(strip) {
	const counts = new Map();
	for (const symbol of strip) {
		counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
	}
	return counts;
}

/**
 * Folgerung 1 des Plans: der Erwartungswert EINER Linie, exakt, in
 * geschlossener Form. Alle 30 Linien haben denselben Erwartungswert (Satz
 * 1), deshalb E[Linien] = 30 × dieser Wert.
 *
 * @param {string[][]} strips
 * @returns {number}
 */
function closedFormSingleLineExpectation(strips, paytable = PAYTABLE) {
	const q = strips.map((strip) => {
		const counts = reelSymbolCounts(strip);
		const m = {};
		for (const symbol of SYMBOLS) {
			m[symbol] = (counts.get(symbol) ?? 0) / LAP;
		}
		return m;
	});

	let total = 0;
	for (const symbol of SYMBOLS) {
		let runningProduct = 1;
		for (let length = 1; length <= REELS; length++) {
			runningProduct *= q[length - 1][symbol];
			if (length < MIN_CHAIN) {
				continue;
			}
			const value = paytable[symbol]?.[length] ?? 0;
			if (value === 0) {
				continue;
			}
			if (length === REELS) {
				total += value * runningProduct;
			} else {
				const stopProbability = 1 - q[length][symbol];
				total += value * runningProduct * stopProbability;
			}
		}
	}
	return total;
}

/**
 * Folgerung 2 des Plans: die EXAKTE gemeinsame Verteilung von
 * (Kirsche-, Zitrone-, Orangenzahl) im Fenster, über eine Faltung der
 * sechs unabhängigen Walzen — je Walze nur 20 Fenster, keine Näherung.
 *
 * @param {string[][]} strips
 * @returns {Map<string, number>} Schlüssel "k,z,o" → Zahl der Stellungen (Summe = TOTAL).
 */
function convolveFieldWindowDistribution(strips) {
	let joint = new Map([['0,0,0', 1]]);
	for (const strip of strips) {
		const reelDist = new Map();
		for (let p = 0; p < LAP; p++) {
			let k = 0;
			let z = 0;
			let o = 0;
			for (let r = 0; r < ROWS; r++) {
				const symbol = strip[(p + r) % LAP];
				if (symbol === 'kirsche') k++;
				else if (symbol === 'zitrone') z++;
				else if (symbol === 'orange') o++;
			}
			const key = `${k},${z},${o}`;
			reelDist.set(key, (reelDist.get(key) ?? 0) + 1);
		}

		const next = new Map();
		for (const [key, weight] of joint) {
			const [k0, z0, o0] = key.split(',').map(Number);
			for (const [rkey, rweight] of reelDist) {
				const [dk, dz, dOrange] = rkey.split(',').map(Number);
				const nkey = `${k0 + dk},${z0 + dz},${o0 + dOrange}`;
				next.set(nkey, (next.get(nkey) ?? 0) + weight * rweight);
			}
		}
		joint = next;
	}
	return joint;
}

function fieldLadderValue(count) {
	if (count >= FIELD_CAP_AT) {
		return FIELD_CAP_VALUE;
	}
	return FIELD_LADDER[count] ?? 0;
}

/**
 * @param {string[][]} strips
 * @returns {{byAmount: Map<number, number>, expected: number}} byAmount: Feldgewinn → Zahl der Stellungen (Summe = TOTAL).
 */
function fieldAmountDistribution(strips) {
	const joint = convolveFieldWindowDistribution(strips);
	const byAmount = new Map();
	let expectedSum = 0;
	for (const [key, weight] of joint) {
		const [k, z, o] = key.split(',').map(Number);
		const amount = fieldLadderValue(k) + fieldLadderValue(z) + fieldLadderValue(o);
		byAmount.set(amount, (byAmount.get(amount) ?? 0) + weight);
		expectedSum += amount * weight;
	}
	return { byAmount, expected: expectedSum / TOTAL };
}

/**
 * Stufe 1: exakte Bewertung eines Kandidaten.
 *
 * WICHTIGE EINSCHRÄNKUNG (REVIEW-fruitrisk-f3.md [M1]): `p1`/`p2`/`p3` und
 * daraus `balance` sind P(FELD=1)/P(FELD=2)/P(FELD=3) — die REINE
 * Feldverteilung aus der geschlossenen Form (`fieldAmountDistribution()`).
 * P-15 in verify-payout.mjs misst dagegen P(RUNDE=1)/P(RUNDE=2)/P(RUNDE=3),
 * also zusätzlich UND kein Linientreffer — eine andere, nicht proportionale
 * Größe (Stellungen mit hohem Feldwert haben mehr kleine Früchte und damit
 * eine andere Trefferwahrscheinlichkeit auf den Linien). Alle Prozentwerte,
 * die dieses Werkzeug ausgibt ("Ausgleich"), sind deshalb das FELDMASS, nicht
 * das Maß, an dem P-15 tatsächlich entscheidet — das gilt für die Katalog-
 * suche, `--lokale-suche` und `--geometrie-suche` gleichermaßen. Auf
 * ausdrückliche Anweisung bleibt das FELDMASS die Zielgröße dieses
 * Werkzeugs (siehe DECISIONS.md, Einträge zu Phase F3b/F3c); der volle
 * Nachweis über `verify-payout.mjs` (ohne `--schnell`) bleibt die einzige
 * Stelle, an der das RUNDENMASS tatsächlich gemessen wird.
 *
 * @param {string[][]} strips
 * @returns {null|{quote: number, fieldExpected: number, lineExpected: number, p1: number, p2: number, p3: number, balance: number}}
 */
function scoreCandidateExactly(strips) {
	const bandRules = checkBandRules(strips);
	if (!bandRules.ok) {
		return null;
	}

	const lineExpected = LINES.length * closedFormSingleLineExpectation(strips);
	const { byAmount, expected: fieldExpected } = fieldAmountDistribution(strips);
	const quote = (lineExpected + fieldExpected) / STAKE;

	const p1 = (byAmount.get(1) ?? 0) / TOTAL;
	const p2 = (byAmount.get(2) ?? 0) / TOTAL;
	const p3 = (byAmount.get(3) ?? 0) / TOTAL;
	const trio = [p1, p2, p3];
	const maxTrio = Math.max(...trio);
	const minTrio = Math.min(...trio);
	const balance = maxTrio === 0 ? Infinity : (maxTrio - minTrio) / maxTrio;

	return { quote, fieldExpected, lineExpected, p1, p2, p3, balance };
}

// -----------------------------------------------------------------------
// GEOMETRIESUCHE (`--geometrie-suche`) — vierter Durchgang, auf Fund von
// REVIEW-fruitrisk-f3.md [H2]: alle drei vorherigen Durchgänge (Katalog,
// zweiter Katalog, lokale Suche) hielten auf den vier garantierten Walzen
// STETS alle vier Grundpositionen 0/5/10/15 an die LEITFRUCHT gebunden
// (siehe `guaranteedLayoutChoices()` oben — dort ist `leitfrucht` immer auf
// allen vier Grundplätzen, `a`/`b` sind reine ZUSATZ-Positionen). Damit
// trägt jede garantierte Walze IMMER mindestens sieben kleine Früchte, nie
// das bauliche Minimum von vier — und genau diese Untergrenze deckelt
// P(Runde=1) auf höchstens (13/20)^6 ≈ 7,54 % (siehe Kopfkommentar von
// Classes/Rules.php, Abschnitt STRIPS, und DECISIONS.md, Eintrag zum
// vierten Durchgang). Diese Ausbaustufe öffnet deshalb eine ECHTE vierte
// Stellschraube: welche der drei kleinen Früchte auf welcher der vier
// Grundpositionen liegt (`guaranteedGeometryCatalog()`/
// `buildGuaranteedReelFromGrid()`) — nicht mehr nur, WIE VIELE zusätzliche
// Kopien die beiden Nicht-Leitfrüchte bekommen.
//
// Die freien Walzen bleiben unverändert bei `freeLayoutChoices()`: der
// Review hat unabhängig nachgerechnet, dass „block" (ein zusammenhängender
// Dreierblock) unter allen Anordnungen von drei Pflichtvorkommen die
// Vereinigungsmenge der belegten Fenster MINIMIERT — also P(Walze zeigt
// keine Frucht) MAXIMIERT — und damit für die freien Walzen bereits
// strukturell optimal ist (siehe REVIEW-fruitrisk-f3.md, Abschnitt „Prüfung
// der Herleitung"). Die Geometriesuche prüft trotzdem für JEDE der beiden
// freien Walzen EINZELN den vollen `freeLayoutChoices()`-Katalog (nicht nur
// „block"), damit diese Stellschraube nicht bloß behauptet, sondern
// tatsächlich mitgeführt wird.
//
// VERFAHREN: Koordinatenabstieg (coordinate descent) statt vollständiger
// Durchmusterung — bei einem Katalog von rund 40 Bauformen je garantierter
// Walze wäre 40^4 × 13^2 (vier unabhängige garantierte Walzen, zwei
// unabhängige freie) im Bereich von hundert Millionen Kombinationen, weit
// über der in diesem Projekt vorgeschriebenen kurzen Betriebsart. Der
// Koordinatenabstieg hält fünf der sechs Walzen fest, durchmustert die
// sechste vollständig, übernimmt die beste Wahl, und wiederholt das über
// mehrere Durchläufe (Sweeps), bis kein Durchlauf mehr etwas verbessert —
// das ist keine erschöpfende Suche, aber jede der sechs Walzen wird in
// jedem Sweep GEGEN JEDEN Katalogeintrag geprüft, bei fester exakter
// Bewertung (`scoreCandidateExactly()`, keine Stichprobe), also dieselbe
// Prüfmaßstab wie die Katalogsuche und die lokale Suche oben.
// -----------------------------------------------------------------------

/**
 * Baut eine garantierte Walze aus einer VOLLSTÄNDIGEN Zuordnung der vier
 * Grundpositionen [0, 5, 10, 15] auf die drei kleinen Früchte — anders als
 * `buildGuaranteedReelFromLayout()`, die diese vier Plätze IMMER an die
 * Leitfrucht vergibt. `gridSorts` ist ein Vierertupel aus 'lead'/'a'/'b'
 * ('a'/'b' wie in `guaranteedLayoutChoices()`: die beiden Nicht-Leitfrüchte
 * in der Reihenfolge `SMALL_FRUITS.filter(f => f !== leitfrucht)`).
 * `extraLead`/`extraA`/`extraB` sind zusätzliche Positionen (relativ zu 0)
 * für die jeweilige Sorte, ÜBER die vier Grundpositionen hinaus — damit
 * lassen sich auch die Zwischenstufen der Größe 5 bis 7 bauen, die
 * REVIEW-fruitrisk-f3.md [H2] ausdrücklich verlangt.
 *
 * @param {string} leitfrucht
 * @param {{gridSorts: ('lead'|'a'|'b')[], extraLead?: number[], extraA?: number[], extraB?: number[]}} spec
 * @returns {string[]|null}
 */
function buildGuaranteedReelFromGrid(leitfrucht, spec) {
	const others = SMALL_FRUITS.filter((fruit) => fruit !== leitfrucht);
	const roleToFruit = { lead: leitfrucht, a: others[0], b: others[1] };
	const grid = [0, 5, 10, 15];
	const positions = {
		[leitfrucht]: [...(spec.extraLead ?? [])],
		[others[0]]: [...(spec.extraA ?? [])],
		[others[1]]: [...(spec.extraB ?? [])],
	};
	for (let i = 0; i < grid.length; i++) {
		positions[roleToFruit[spec.gridSorts[i]]].push(grid[i]);
	}
	const totalFruit = Object.values(positions).reduce((sum, list) => sum + list.length, 0);
	const lineCounts = buildLineSymbolCounts(LAP - totalFruit, 0);
	return buildReelFromPositions(positions, lineCounts);
}

/**
 * ALLE 36 Zuordnungen der vier Grundpositionen auf die drei kleinen Früchte,
 * bei denen GENAU eine Sorte zwei Grundplätze bekommt und die beiden
 * anderen je einen (die einzige Aufteilung, die mit vier Früchten
 * überhaupt alle drei Sorten auf dem Band unterbringt, Bandregel 7) — das
 * bauliche Minimum, das die ersten drei Durchgänge nie erreicht haben.
 * Vollständig durchnummeriert (nicht nur Beispiele), weil GENAU DIESE
 * Positionsverteilung die Korrelation zwischen den drei Sorten je Fenster
 * bestimmt (siehe H2: welche zwei Grundplätze zusammen die verdoppelte
 * Sorte tragen, ändert, in wie vielen Fenstern gleichzeitig mehr als eine
 * kleine Frucht erscheint).
 *
 * @returns {{name: string, gridSorts: ('lead'|'a'|'b')[]}[]}
 */
function guaranteedGridSizeFourChoices() {
	const roles = ['lead', 'a', 'b'];
	const slotPairs = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
	const choices = [];
	for (const doubled of roles) {
		const singles = roles.filter((r) => r !== doubled);
		for (const [i1, i2] of slotPairs) {
			const remaining = [0, 1, 2, 3].filter((i) => i !== i1 && i !== i2);
			for (const order of [[singles[0], singles[1]], [singles[1], singles[0]]]) {
				const gridSorts = new Array(4);
				gridSorts[i1] = doubled;
				gridSorts[i2] = doubled;
				gridSorts[remaining[0]] = order[0];
				gridSorts[remaining[1]] = order[1];
				choices.push({
					name: `grid4-${doubled}2-${i1}${i2}-${order[0]}${order[1]}`,
					gridSorts,
				});
			}
		}
	}
	return choices;
}

/**
 * Der volle Katalog dieser Ausbaustufe: die 36 Größe-4-Zuordnungen oben,
 * dazu ein paar handbenannte Zwischenstufen der Größe 5 und 6, PROGRAMMATISCH
 * erweitert (Behebungslauf, Anweisung DER KOORDINATION nach dem fünften
 * Durchgang: „zwischen einer Walze am Minimum und allen vier unverändert
 * liegen viele UNGLEICHE Mischungen — genau dort steht das Optimum
 * erfahrungsgemäß"). Für JEDE der 36 Größe-4-Zuordnungen werden bis zu drei
 * zusätzliche Stufen erzeugt: +1 Zusatzposition (Größe 5, an drei
 * Offsets, für Sorte „a" UND „b"), macht die Übergänge zwischen dem
 * baulichen Minimum und den bisherigen Größe-6/7-Katalogeinträgen dicht
 * abgetastet statt nur an den acht handbenannten Punkten von vorher.
 * Zuletzt die HEUTIGE Bauform („grid7-mehr-a") als Rückfallpunkt.
 *
 * @returns {{name: string, gridSorts: ('lead'|'a'|'b')[], extraLead?: number[], extraA?: number[], extraB?: number[]}[]}
 */
function guaranteedGeometryCatalog() {
	const size4 = guaranteedGridSizeFourChoices();
	const zwischenstufen = [
		{ name: 'grid5-llab-a1', gridSorts: ['lead', 'lead', 'a', 'b'], extraA: [1] },
		{ name: 'grid5-llab-b1', gridSorts: ['lead', 'lead', 'a', 'b'], extraB: [2] },
		{ name: 'grid5-lalb-a1', gridSorts: ['lead', 'a', 'lead', 'b'], extraA: [7] },
		{ name: 'grid5-albl-b1', gridSorts: ['a', 'lead', 'b', 'lead'], extraB: [12] },
		{ name: 'grid6-llab-ab', gridSorts: ['lead', 'lead', 'a', 'b'], extraA: [1], extraB: [2] },
		{ name: 'grid6-lalb-ab', gridSorts: ['lead', 'a', 'lead', 'b'], extraA: [7], extraB: [17] },
		{ name: 'grid6-llab-leit1', gridSorts: ['lead', 'lead', 'a', 'b'], extraLead: [8] },
		{ name: 'grid7-mehr-a', gridSorts: ['lead', 'lead', 'lead', 'lead'], extraA: [1, 3], extraB: [2] },
	];

	// Programmatische Größe-5- und Größe-6-Zwischenstufen: JEDE der 36
	// Größe-4-Zuordnungen bekommt +1 Zusatzposition (Größe 5) an drei
	// Offsets, je für Sorte „a" und „b", und +2 Zusatzpositionen (Größe 6)
	// an zwei Offset-Paaren — dichte, ungleiche Abtastung statt der acht
	// handbenannten Punkte von vorher.
	// STAND F3-Behebungslauf (sechster Durchgang), Fund beim Testlauf: jeder
	// Offset in {1, 6, 11, 16} liegt UNMITTELBAR NEBEN einer der vier
	// Grundpositionen [0, 5, 10, 15] (Offset = Grundposition + 1) — eine
	// Zusatzkopie der Sorte „a" dort, während `gridSorts` an genau dieser
	// Grundposition BEREITS „a" trägt, erzeugt zwei benachbarte Positionen
	// derselben Sorte (Bandregel 2 verletzt). `buildReelFromPositions()`
	// prüft das nicht (sie prüft nur exakte Positionskollisionen, keine
	// Nachbarschaft zwischen zwei VORAB gesetzten Fruchtpositionen) —
	// `checkBandRules()` fängt es zwar zuverlässig ab (kein falsches
	// Ergebnis), aber ungeprüft hätte ein großer Teil dieses Katalogs aus
	// von vornherein ungültigen, nie wählbaren Einträgen bestanden. Diese
	// Prüfung lässt den Offset für die betroffene Sorte einfach aus.
	const gridIndexNebenOffset = (offset) => (offset - 1) / 5;
	function offsetKollidiertMitGrid(gridSorts, offset, sorte) {
		const index = gridIndexNebenOffset(offset);
		return Number.isInteger(index) && gridSorts[index] === sorte;
	}

	const dichteZwischenstufen = [];
	const offsetsEinzeln = [1, 6, 11];
	const offsetPaare = [[1, 6], [6, 11]];
	for (const basis of size4) {
		for (const offset of offsetsEinzeln) {
			if (!offsetKollidiertMitGrid(basis.gridSorts, offset, 'a')) {
				dichteZwischenstufen.push({
					name: `${basis.name}-plusA${offset}`,
					gridSorts: basis.gridSorts,
					extraA: [offset],
				});
			}
			if (!offsetKollidiertMitGrid(basis.gridSorts, offset, 'b')) {
				dichteZwischenstufen.push({
					name: `${basis.name}-plusB${offset}`,
					gridSorts: basis.gridSorts,
					extraB: [offset],
				});
			}
		}
		for (const [o1, o2] of offsetPaare) {
			if (offsetKollidiertMitGrid(basis.gridSorts, o1, 'a') || offsetKollidiertMitGrid(basis.gridSorts, o2, 'b')) {
				continue;
			}
			dichteZwischenstufen.push({
				name: `${basis.name}-plusAB${o1}-${o2}`,
				gridSorts: basis.gridSorts,
				extraA: [o1],
				extraB: [o2],
			});
		}
	}

	return [...size4, ...zwischenstufen, ...dichteZwischenstufen];
}

/**
 * Katalog für die BEIDEN FREIEN WALZEN, erweitert im letzten Behebungslauf
 * (Anweisung DER KOORDINATION): der Strukturbeweis „block minimiert die
 * Vereinigung, also maximiert P(Fenster fruchtfrei)" stammt aus dem zweiten
 * Durchgang, als die garantierten Walzen noch eine feste, gemeinsame Bauform
 * hatten — er zeigt, dass „block" die VEREINIGUNG minimiert, nicht, dass es
 * den AUSGLEICH minimiert, wenn die garantierten Walzen inzwischen
 * asymmetrisch belegt sind. Dieser Katalog nimmt deshalb sowohl die LAGE
 * (Gap-Tripel zwischen den drei Pflichtvorkommen, von eng zusammenhängend
 * bis breit gestreut) als auch die ANZAHL (Größe 3 bis 6, über zusätzliche
 * Kopien je Sorte) als Suchdimension — unabhängig für jede der beiden freien
 * Walzen, wie schon bisher über die Hauptschleife des Koordinatenabstiegs.
 * Die bauliche Untergrenze bleibt automatisch erfüllt: bei GENAU drei
 * Vorkommen auf 20 Positionen ist mindestens ein Abstand ≥ 6 zwingend
 * (drei Abstände < 6 summierten sich auf höchstens 15 < 20), also existiert
 * immer ein fruchtfreies Fenster — `checkBandRules()` prüft es trotzdem
 * nach, keine Annahme ohne Nachweis.
 *
 * @returns {{name: string, k: number[], z: number[], o: number[]}[]}
 */
function freeGeometryCatalog() {
	// Gap-Tripel (g1, g2, g3), Summe 20 — von eng zusammenhängend (block)
	// bis möglichst gleichmäßig gestreut (7/7/6, das Maximum an Streuung auf
	// einem 20er-Ring mit drei Punkten).
	const gapTripel = [
		[1, 1, 18], [2, 2, 16], [3, 3, 14], [4, 4, 12], [5, 5, 10],
		[1, 2, 17], [2, 1, 17], [1, 9, 10], [9, 1, 10], [4, 5, 11],
		[5, 4, 11], [6, 6, 8], [8, 6, 6], [2, 9, 9], [9, 2, 9],
		[3, 8, 9], [6, 7, 7], [7, 6, 7], [7, 7, 6], [5, 8, 7],
	];
	const basis = gapTripel.map(([g1, g2], i) => ({
		name: `frei3-${i}`,
		k: [0],
		z: [g1 % LAP],
		o: [(g1 + g2) % LAP],
	}));

	// Größe 4–6: eine Zusatzkopie (bzw. zwei) einer der drei Sorten, auf
	// einer Teilmenge der Basisformen — genug Streubreite, ohne den
	// Katalog zu sprengen.
	const erweitert = [];
	for (const b of basis.slice(0, 10)) {
		erweitert.push({ name: `${b.name}-mehrk`, k: [...b.k, (b.k[0] + 10) % LAP], z: b.z, o: b.o });
		erweitert.push({ name: `${b.name}-mehrz`, k: b.k, z: [...b.z, (b.z[0] + 10) % LAP], o: b.o });
		erweitert.push({ name: `${b.name}-mehro`, k: b.k, z: b.z, o: [...b.o, (b.o[0] + 10) % LAP] });
	}
	for (const b of basis.slice(0, 4)) {
		erweitert.push({
			name: `${b.name}-mehralle`,
			k: [...b.k, (b.k[0] + 10) % LAP],
			z: [...b.z, (b.z[0] + 10) % LAP],
			o: [...b.o, (b.o[0] + 10) % LAP],
		});
	}

	return [...basis, ...erweitert];
}

/**
 * Kosten für den Koordinatenabstieg dieser Ausbaustufe. Anders als
 * `localSearchCost()` oben (Quote-Korridor 0,85–1,20, nur ein sanfter
 * Strafterm) ist die Quote hier ein ECHTER Nebenbedingung: JEDER Kandidat
 * IM Band 95,0–99,5 % schlägt JEDEN Kandidaten AUSSERHALB, unabhängig vom
 * Ausgleich — die Geometriesuche öffnet die Fruchtzahl auf den garantierten
 * Walzen so weit, dass die Quote (die auch am Zusatzanteil der Liniensymbole
 * hängt) sonst leicht aus dem Band wandert, ohne dass die vorherige,
 * lockere Kostenfunktion das verhindern würde (beobachtet im ersten Lauf
 * dieser Ausbaustufe: Ausgleich 20,78 % bei Quote 88,72 % — außerhalb des
 * Bands, siehe DECISIONS.md).
 *
 * @param {{balance: number, quote: number}} score
 * @returns {number}
 */
function geometrySearchCost(score) {
	const quoteOk = score.quote >= QUOTE_BAND_MIN && score.quote <= QUOTE_BAND_MAX;
	return quoteOk ? score.balance : 1 + Math.abs(score.quote - QUOTE_TARGET);
}

/**
 * Vierter Durchgang: Koordinatenabstieg über die sechs Walzen, mit dem
 * Katalog aus `guaranteedGeometryCatalog()` für die vier garantierten und
 * `freeLayoutChoices()` (unverändert) für die beiden freien. Zielgröße
 * bleibt der Feldausgleich, die Quote (95,0–99,5 %) ist Nebenbedingung —
 * auf ausdrückliche Anweisung dieselbe Zielgröße wie in `--lokale-suche`
 * oben, nicht das Rundenmaß aus P-15 (siehe REVIEW-fruitrisk-f3.md [M1] für
 * den dokumentierten Unterschied zwischen beiden Maßen) — hier aber mit
 * `geometrySearchCost()` statt `localSearchCost()`, siehe deren Kommentar.
 */
function geometrySearch() {
	const guaranteedCatalog = guaranteedGeometryCatalog();
	const freeChoices = freeLayoutChoices();

	const guaranteedCandidates = {};
	for (const reel of GUARANTEED_REELS) {
		const leitfrucht = LEITFRUCHT_BY_REEL[reel];
		const list = [];
		for (const spec of guaranteedCatalog) {
			const strip = buildGuaranteedReelFromGrid(leitfrucht, spec);
			if (strip !== null) {
				list.push({ name: spec.name, strip });
			}
		}
		guaranteedCandidates[reel] = list;
	}

	const freeCandidates = [];
	for (const layout of freeChoices) {
		const strip = buildFreeReelFromLayout(layout);
		if (strip !== null) {
			freeCandidates.push({ name: layout.name, strip });
		}
	}

	const slots = [
		{ kind: 'garantiert', reel: 0, candidates: guaranteedCandidates[0] },
		{ kind: 'garantiert', reel: 1, candidates: guaranteedCandidates[1] },
		{ kind: 'garantiert', reel: 2, candidates: guaranteedCandidates[2] },
		{ kind: 'garantiert', reel: 3, candidates: guaranteedCandidates[3] },
		{ kind: 'frei', reel: 4, candidates: freeCandidates },
		{ kind: 'frei', reel: 5, candidates: freeCandidates },
	];

	console.log(`Katalog je garantierter Walze: ${guaranteedCatalog.length} Bauformen `
		+ `(davon gültig je Walze: ${slots.slice(0, 4).map((s) => s.candidates.length).join('/')}), `
		+ `je freier Walze: ${freeChoices.length} (unverändert, davon gültig: ${freeCandidates.length}).`);

	function buildStrips(indices) {
		const strips = new Array(REELS);
		for (let s = 0; s < slots.length; s++) {
			strips[slots[s].reel] = slots[s].candidates[indices[s]].strip;
		}
		return strips;
	}

	function evaluateIndices(indices) {
		const score = scoreCandidateExactly(buildStrips(indices));
		return score === null ? { cost: Infinity, score: null } : { cost: geometrySearchCost(score), score };
	}

	// Startpunkt: die heutige Bandbelegung nachgebildet — „grid7-mehr-a" für
	// die vier garantierten Walzen (siehe Katalog-Kommentar oben), „block"
	// für die beiden freien (Rules::STRIPS[4]/[5]).
	const startIndices = slots.map((slot) => {
		const startName = slot.kind === 'garantiert' ? 'grid7-mehr-a' : 'block';
		const idx = slot.candidates.findIndex((c) => c.name === startName);
		return idx === -1 ? 0 : idx;
	});

	let bestIndices = startIndices.slice();
	let bestResult = evaluateIndices(bestIndices);
	if (bestResult.score === null) {
		throw new Error('Geometriesuche: der nachgebildete Startpunkt selbst verletzt eine Bandregel.');
	}
	console.log(`Startpunkt (heutige Bauform nachgebildet): Ausgleich ${formatPercent(bestResult.score.balance)}, `
		+ `Quote ${formatPercent(bestResult.score.quote)} (P1=${formatPercent(bestResult.score.p1)}, `
		+ `P2=${formatPercent(bestResult.score.p2)}, P3=${formatPercent(bestResult.score.p3)})`);

	let evaluatedTotal = 0;
	const MAX_SWEEPS = 5;
	for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
		let improvedThisSweep = false;
		for (let s = 0; s < slots.length; s++) {
			let localBestIdx = bestIndices[s];
			let localBestResult = bestResult;
			for (let candidateIdx = 0; candidateIdx < slots[s].candidates.length; candidateIdx++) {
				if (candidateIdx === bestIndices[s]) {
					continue;
				}
				const trial = bestIndices.slice();
				trial[s] = candidateIdx;
				const result = evaluateIndices(trial);
				evaluatedTotal++;
				if (result.cost < localBestResult.cost) {
					localBestResult = result;
					localBestIdx = candidateIdx;
				}
			}
			if (localBestIdx !== bestIndices[s]) {
				bestIndices[s] = localBestIdx;
				bestResult = localBestResult;
				improvedThisSweep = true;
				console.log(`  Sweep ${sweep + 1}, Walze ${slots[s].reel + 1} (${slots[s].kind}): `
					+ `neue Wahl „${slots[s].candidates[localBestIdx].name}" — Ausgleich `
					+ `${formatPercent(bestResult.score.balance)}, Quote ${formatPercent(bestResult.score.quote)}`);
			}
		}
		if (!improvedThisSweep) {
			console.log(`Sweep ${sweep + 1}: keine Walze verbessert sich mehr gegenüber ihrem Katalog — Abbruch.`);
			break;
		}
	}

	console.log(`\n${evaluatedTotal.toLocaleString('de-DE')} Kandidaten geprüft (Koordinatenabstieg, keine`
		+ ' erschöpfende Suche).');
	console.log(`Bestes Ergebnis: Ausgleich ${formatPercent(bestResult.score.balance)} `
		+ `(Start: ${formatPercent(evaluateIndices(startIndices).score.balance)}), `
		+ `Quote ${formatPercent(bestResult.score.quote)} (P1=${formatPercent(bestResult.score.p1)}, `
		+ `P2=${formatPercent(bestResult.score.p2)}, P3=${formatPercent(bestResult.score.p3)}).`);
	for (let s = 0; s < slots.length; s++) {
		console.log(`  Walze ${slots[s].reel + 1} (${slots[s].kind}): „${slots[s].candidates[bestIndices[s]].name}"`);
	}

	const quoteOk = bestResult.score.quote >= QUOTE_BAND_MIN && bestResult.score.quote <= QUOTE_BAND_MAX;
	console.log(quoteOk
		? 'Quote liegt im Band 95,0–99,5 %.'
		: 'ACHTUNG: Quote liegt AUSSERHALB des Bands 95,0–99,5 % — Stellschraube 4 (PAYTABLE) wäre nachzuziehen.');

	printCandidateBlock(buildStrips(bestIndices));
}

// -----------------------------------------------------------------------
// GEMEINSAME SUCHE (`--joint-suche`) — fünfter Durchgang, auf ausdrückliche
// Anweisung DER KOORDINATION nach dem vierten Durchgang: `--geometrie-suche`
// oben hatte die Quote als HARTE Nebenbedingung bei UNVERÄNDERTER PAYTABLE
// behandelt und deshalb keine Verbesserung gefunden — jede Geometrie, die
// den Ausgleich verbessert hätte, riss die Quote unter 95 %. Diese
// Einschränkung stand nicht im Auftrag: PAYTABLE ist frei wählbar, einzige
// harte Bindung ist der Höchstwert GENAU 100 (sieben × 6) und die
// Rangfolge (je Kettenlänge streng fallend entlang SYMBOLS, je Symbol
// nicht fallend mit wachsender Länge). Diese Ausbaustufe hebt die
// Gewinnwerte deshalb GEZIELT wieder an, wenn eine geringere Fruchtdichte
// die Quote drückt — per Potenzabbildung `neu = 100 · (alt/100)^p`
// (hält 100 exakt fest, p < 1 streckt, p > 1 staucht — Stellschraube 4 in
// die GEGENRICHTUNG von F3a/F3b).
//
// REIHENFOLGE DER BEWERTUNG (auf ausdrückliche Anweisung): zu JEDER
// Geometrie wird ERST das beste p gesucht (`findExponentInBand()`), DANN
// erst wird die Geometrie nach ihrem Ausgleich bewertet. Eine Geometrie mit
// Quote 85 % vor der Anpassung ist damit kein ungültiger Kandidat, sondern
// einer mit vorher unbestimmtem p. Verworfen wird eine Geometrie nur, wenn
// KEIN zulässiges p die Quote ins Band bringt, oder jede Anpassung
// innerhalb des Bands die Rangfolge bricht, zwei Werte kollidieren lässt,
// einen Wert unter 1 drückt, oder den ohnehin bindenden Mindestwert
// (kirsche × 3 > 3, Entwurfsregel 1, an anderer Stelle bereits geprüft:
// CabinetProcessor::assertPaytableIsSane(), P-9) verletzt.
// -----------------------------------------------------------------------

/**
 * Bildet EINEN Gewinnwert per Potenzabbildung ab. Hält MAX_LINE_VALUE exakt
 * fest, weil (v/MAX_LINE_VALUE)^p für v = MAX_LINE_VALUE immer 1 ergibt,
 * unabhängig von p.
 *
 * @param {number} value
 * @param {number} p
 * @returns {number} Gleitkommawert, ungerundet.
 */
function powerMapValue(value, p) {
	return MAX_LINE_VALUE * (value / MAX_LINE_VALUE) ** p;
}

/**
 * Bildet die gesamte PAYTABLE per Potenzabbildung ab (Gleitkomma — gerundet
 * und geprüft wird erst in `roundAndValidatePaytable()`).
 *
 * @param {number} p
 * @returns {Record<string, Record<number, number>>}
 */
function powerMapPaytable(p) {
	const mapped = {};
	for (const symbol of SYMBOLS) {
		mapped[symbol] = {};
		for (let length = MIN_CHAIN; length <= REELS; length++) {
			mapped[symbol][length] = powerMapValue(PAYTABLE[symbol][length], p);
		}
	}
	return mapped;
}

/**
 * Rundet eine per `powerMapPaytable()` erzeugte Gleitkomma-Tabelle auf
 * Ganzzahlen und prüft alle Bedingungen, die eine Anpassung ungültig
 * machen (siehe Kopfkommentar dieses Abschnitts).
 *
 * @param {Record<string, Record<number, number>>} floatPaytable
 * @returns {{ok: boolean, paytable: Record<string, Record<number, number>>, problems: string[]}}
 */
function roundAndValidatePaytable(floatPaytable) {
	const rounded = {};
	for (const symbol of SYMBOLS) {
		rounded[symbol] = {};
		for (let length = MIN_CHAIN; length <= REELS; length++) {
			rounded[symbol][length] = Math.round(floatPaytable[symbol][length]);
		}
	}

	const problems = [];
	for (let length = MIN_CHAIN; length <= REELS; length++) {
		for (let i = 0; i < SYMBOLS.length - 1; i++) {
			const a = rounded[SYMBOLS[i]][length];
			const b = rounded[SYMBOLS[i + 1]][length];
			if (b < 1) {
				problems.push(`${SYMBOLS[i + 1]}[${length}] = ${b} < 1`);
			}
			if (!(a > b)) {
				problems.push(`Länge ${length}: „${SYMBOLS[i]}" (${a}) nicht strikt größer als „${SYMBOLS[i + 1]}" (${b})`);
			}
		}
	}
	for (const symbol of SYMBOLS) {
		for (let length = MIN_CHAIN; length < REELS; length++) {
			if (!(rounded[symbol][length] <= rounded[symbol][length + 1])) {
				problems.push(`${symbol}: Länge ${length} (${rounded[symbol][length]}) > Länge ${length + 1}`
					+ ` (${rounded[symbol][length + 1]})`);
			}
		}
	}
	const smallestValue = Math.min(...SYMBOLS.map((s) => rounded[s][MIN_CHAIN]));
	if (smallestValue <= 3) {
		problems.push(`kleinster Wert (Länge ${MIN_CHAIN}) ist ${smallestValue}, nicht > 3 (Entwurfsregel 1,`
			+ ' bereits an anderer Stelle bindend geprüft)');
	}
	if (rounded[SYMBOLS[0]][REELS] !== MAX_LINE_VALUE) {
		problems.push(`Höchstwert ist ${rounded[SYMBOLS[0]][REELS]}, nicht genau ${MAX_LINE_VALUE}`);
	}

	return { ok: problems.length === 0, paytable: rounded, problems };
}

/**
 * Bisektion (stetig, ungerundet) auf den Exponenten `p`, der die Quote auf
 * QUOTE_TARGET bringt. Die Quote ist MONOTON FALLEND in `p` (jeder Wert
 * unter MAX_LINE_VALUE sinkt mit wachsendem p, der Ankerwert bleibt fest),
 * deshalb ist die Bisektion eindeutig.
 *
 * @param {string[][]} strips
 * @param {number} fieldExpected
 * @returns {number}
 */
function bisectExponentForTargetQuote(strips, fieldExpected) {
	const quoteAt = (p) => (LINES.length * closedFormSingleLineExpectation(strips, powerMapPaytable(p)) + fieldExpected) / STAKE;

	let lo = 0.01;
	let hi = 60;
	if (quoteAt(lo) <= QUOTE_TARGET) {
		return lo;
	}
	if (quoteAt(hi) >= QUOTE_TARGET) {
		return hi;
	}
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (quoteAt(mid) > QUOTE_TARGET) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

/**
 * Sucht zu EINER Geometrie den besten Exponenten `p`: erst stetig Richtung
 * QUOTE_TARGET, dann in kleinen Schritten (±0,01) um diesen Punkt herum,
 * bis eine GERUNDETE, GÜLTIGE Tabelle im Band 95,0–99,5 % landet oder die
 * Umgebung erschöpft ist (±0,40, 80 Versuche — die Quote reagiert auf
 * kleine Änderungen an p sehr sanft, das genügt reichlich).
 *
 * @param {string[][]} strips
 * @param {number} fieldExpected
 * @returns {{ok: boolean, p?: number, paytable?: object, quote?: number, lineExpected?: number}}
 */
function findExponentInBand(strips, fieldExpected) {
	const centerP = bisectExponentForTargetQuote(strips, fieldExpected);
	const steps = [0];
	for (let d = 1; d <= 40; d++) {
		steps.push(-d * 0.01, d * 0.01);
	}
	for (const step of steps) {
		const p = Math.max(0.01, centerP + step);
		const { ok, paytable } = roundAndValidatePaytable(powerMapPaytable(p));
		if (!ok) {
			continue;
		}
		const lineExpected = LINES.length * closedFormSingleLineExpectation(strips, paytable);
		const quote = (lineExpected + fieldExpected) / STAKE;
		if (quote >= QUOTE_BAND_MIN && quote <= QUOTE_BAND_MAX) {
			return { ok: true, p, paytable, quote, lineExpected };
		}
	}
	return { ok: false };
}

/**
 * Feld-Bewertung EINER Geometrie, unabhängig von PAYTABLE — der Ausgleich
 * hängt nur an FIELD_LADDER/den Fruchtpositionen, nie an den Linienwerten.
 * Dieselben sieben Bandregeln wie `scoreCandidateExactly()`.
 *
 * @param {string[][]} strips
 * @returns {null|{fieldExpected: number, p1: number, p2: number, p3: number, balance: number}}
 */
function scoreGeometryOnly(strips) {
	const bandRules = checkBandRules(strips);
	if (!bandRules.ok) {
		return null;
	}
	const { byAmount, expected: fieldExpected } = fieldAmountDistribution(strips);
	const p1 = (byAmount.get(1) ?? 0) / TOTAL;
	const p2 = (byAmount.get(2) ?? 0) / TOTAL;
	const p3 = (byAmount.get(3) ?? 0) / TOTAL;
	const trio = [p1, p2, p3];
	const maxTrio = Math.max(...trio);
	const minTrio = Math.min(...trio);
	const balance = maxTrio === 0 ? Infinity : (maxTrio - minTrio) / maxTrio;
	return { fieldExpected, p1, p2, p3, balance };
}

/**
 * Fünfter Durchgang: Geometrie UND Gewinntabelle gemeinsam. Koordinatenabstieg
 * über die sechs Walzen wie in `geometrySearch()`, aber die Kostenfunktion
 * ist jetzt REIN der Ausgleich — die Quote schließt eine Geometrie nur noch
 * aus, wenn `findExponentInBand()` wirklich KEIN gültiges p findet.
 */
function jointGeometryPaytableSearch() {
	const guaranteedCatalog = guaranteedGeometryCatalog();
	// STAND F3-Behebungslauf (sechster Durchgang): freie Walzen bekommen jetzt
	// ZUSÄTZLICH zum bisherigen `freeLayoutChoices()`-Katalog den neuen
	// `freeGeometryCatalog()` (Lage UND Anzahl als eigene Dimension, siehe
	// dessen Kopfkommentar) — beide zusammen, damit „block" weiterhin als
	// Kandidat mitläuft, aber nicht mehr die einzige Möglichkeit ist.
	const freeChoices = [...freeLayoutChoices(), ...freeGeometryCatalog()];

	const guaranteedCandidates = {};
	for (const reel of GUARANTEED_REELS) {
		const leitfrucht = LEITFRUCHT_BY_REEL[reel];
		const list = [];
		for (const spec of guaranteedCatalog) {
			const strip = buildGuaranteedReelFromGrid(leitfrucht, spec);
			if (strip !== null) {
				list.push({ name: spec.name, strip });
			}
		}
		guaranteedCandidates[reel] = list;
	}
	const freeCandidates = [];
	for (const layout of freeChoices) {
		const strip = buildFreeReelFromLayout(layout);
		if (strip !== null) {
			freeCandidates.push({ name: layout.name, strip });
		}
	}

	const slots = [
		{ kind: 'garantiert', reel: 0, candidates: guaranteedCandidates[0] },
		{ kind: 'garantiert', reel: 1, candidates: guaranteedCandidates[1] },
		{ kind: 'garantiert', reel: 2, candidates: guaranteedCandidates[2] },
		{ kind: 'garantiert', reel: 3, candidates: guaranteedCandidates[3] },
		{ kind: 'frei', reel: 4, candidates: freeCandidates },
		{ kind: 'frei', reel: 5, candidates: freeCandidates },
	];

	console.log(`Katalog je garantierter Walze: ${guaranteedCatalog.length} Bauformen, je freier Walze: `
		+ `${freeChoices.length}.`);

	function buildStrips(indices) {
		const strips = new Array(REELS);
		for (let s = 0; s < slots.length; s++) {
			strips[slots[s].reel] = slots[s].candidates[indices[s]].strip;
		}
		return strips;
	}

	// STAND F3-Behebungslauf (sechster Durchgang): zwei Stufen statt einer.
	// Die BILLIGE Stufe (`cheapGeometry()`) berechnet nur den Ausgleich
	// (Feldmaß, ohne Potenzabbildung) — bei einem Katalog von über 300
	// Bauformen je garantierter Walze wäre die teure Bisektion für JEDEN
	// Kandidaten zu langsam für die vorgegebene Laufzeit. Die TEURE Stufe
	// (`findExponentInBand()`) läuft nur noch für die nach Ausgleich besten
	// Kandidaten einer inneren Schleife (Top 6), nicht mehr für alle.
	const geometryCache = new Map();
	function cheapGeometry(indices) {
		const key = indices.join(',');
		const cached = geometryCache.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const geometry = scoreGeometryOnly(buildStrips(indices));
		geometryCache.set(key, geometry);
		return geometry;
	}

	const evalCache = new Map();
	function evaluateIndices(indices) {
		const key = indices.join(',');
		const cached = evalCache.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const geometry = cheapGeometry(indices);
		let result;
		if (geometry === null) {
			result = { cost: Infinity, geometry: null, exponent: { ok: false } };
		} else {
			const strips = buildStrips(indices);
			const exponent = findExponentInBand(strips, geometry.fieldExpected);
			result = { cost: exponent.ok ? geometry.balance : Infinity, geometry, exponent };
		}
		evalCache.set(key, result);
		return result;
	}

	const TOP_N_FOR_EXPENSIVE_CHECK = 6;

	/**
	 * Eine Schleife über ALLE Kandidaten eines Slots: erst billig nach
	 * Ausgleich sortieren, dann nur die besten `TOP_N_FOR_EXPENSIVE_CHECK`
	 * teuer bestätigen (p suchen). Liefert die insgesamt beste ZULÄSSIGE
	 * Wahl für diesen Slot, ausgehend von `baseIndices`.
	 *
	 * @param {number[]} baseIndices
	 * @param {number} slotIndex
	 * @returns {{idx: number, result: object}}
	 */
	function bestForSlot(baseIndices, slotIndex) {
		const candidates = slots[slotIndex].candidates;
		const ranked = [];
		for (let c = 0; c < candidates.length; c++) {
			const trial = baseIndices.slice();
			trial[slotIndex] = c;
			const geometry = cheapGeometry(trial);
			if (geometry !== null) {
				ranked.push({ idx: c, balance: geometry.balance });
			}
		}
		ranked.sort((a, b) => a.balance - b.balance);

		let bestIdx = baseIndices[slotIndex];
		let bestResultHere = evaluateIndices(baseIndices);
		for (let i = 0; i < Math.min(TOP_N_FOR_EXPENSIVE_CHECK, ranked.length); i++) {
			const trial = baseIndices.slice();
			trial[slotIndex] = ranked[i].idx;
			const result = evaluateIndices(trial);
			if (result.cost < bestResultHere.cost) {
				bestResultHere = result;
				bestIdx = ranked[i].idx;
			}
		}
		return { idx: bestIdx, result: bestResultHere };
	}

	const freeBlockIdx = freeCandidates.findIndex((c) => c.name === 'block');

	// Startpunkt: die heutige Bauform aus dem fünften Durchgang nachgebildet
	// (Walze 1 „grid5-llab-a1", Walzen 2–4 „grid7-mehr-a", freie Walzen
	// „block") — der Koordinatenabstieg startet diesmal vom BISHERIGEN
	// Ergebnis aus, nicht wieder bei null, damit er die bereits gefundene
	// Verbesserung nicht erst neu erarbeiten muss.
	const grid5Idx = guaranteedCandidates[0].findIndex((c) => c.name === 'grid5-llab-a1');
	const grid7Idx = guaranteedCandidates[0].findIndex((c) => c.name === 'grid7-mehr-a');
	const startIndices = [grid5Idx, grid7Idx, grid7Idx, grid7Idx, freeBlockIdx, freeBlockIdx];

	let bestIndices = startIndices.slice();
	let bestResult = evaluateIndices(bestIndices);
	console.log(`Startpunkt (fünfter Durchgang nachgebildet): Ausgleich ${formatPercent(bestResult.geometry.balance)}, `
		+ (bestResult.exponent.ok
			? `p=${bestResult.exponent.p.toFixed(3)}, Quote ${formatPercent(bestResult.exponent.quote)}`
			: 'KEIN gültiges p gefunden'));

	let evaluatedTotal = 0;
	const MAX_SWEEPS = 8;
	for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
		let improvedThisSweep = false;
		for (let s = 0; s < slots.length; s++) {
			evaluatedTotal += slots[s].candidates.length;
			const { idx, result } = bestForSlot(bestIndices, s);
			if (idx !== bestIndices[s] && result.cost < bestResult.cost) {
				bestIndices[s] = idx;
				bestResult = result;
				improvedThisSweep = true;
				console.log(`  Sweep ${sweep + 1}, Walze ${slots[s].reel + 1} (${slots[s].kind}): neue Wahl `
					+ `„${slots[s].candidates[idx].name}" — Ausgleich ${formatPercent(bestResult.geometry.balance)}, `
					+ `p=${bestResult.exponent.p.toFixed(3)}, Quote ${formatPercent(bestResult.exponent.quote)}`);
			}
		}
		if (!improvedThisSweep) {
			console.log(`Sweep ${sweep + 1}: keine Walze verbessert sich mehr (Koordinatenabstieg konvergiert).`);
			break;
		}
	}

	// STAND F3-Behebungslauf (sechster Durchgang): 2-opt-Nachlauf über PAARE
	// garantierter Walzen. Der Koordinatenabstieg ändert je Schritt nur EINE
	// Walze — eine Verbesserung, die zwei Walzen GLEICHZEITIG ändern
	// verlangt (z. B. eine Walze am baulichen Minimum UND eine zweite auf
	// einer Zwischenstufe, während der einfache Abstieg beide einzeln als
	// Verschlechterung sähe), findet er strukturell nicht. Auch hier billig
	// vorsortiert: für jedes der sechs Walzenpaare werden beide Kataloge
	// nach Ausgleich vorsortiert, nur die besten Kombinationen teuer
	// bestätigt (p gesucht) — sonst wäre die volle Paarsuche bei über 200
	// Katalogeinträgen je Walze zu langsam für die vorgegebene Laufzeit.
	// Als Funktion, weil dieser Behebungslauf sie zweimal braucht: einmal
	// direkt nach dem einfachen Abstieg, ein zweites Mal als Politur NACH
	// dem Mehrfachstart (siehe dort — der Mehrfachstart fand ein deutlich
	// besseres Gebiet, das der erste 2-opt-Lauf naturgemäß noch nicht kannte).
	const TOP_N_FOR_PAIR_SEARCH = 12;
	const guaranteedSlotIndices = [0, 1, 2, 3];
	function runTwoOpt(label) {
		let improved = false;
		for (let a = 0; a < guaranteedSlotIndices.length; a++) {
			for (let b = a + 1; b < guaranteedSlotIndices.length; b++) {
				const slotA = guaranteedSlotIndices[a];
				const slotB = guaranteedSlotIndices[b];

				const rankedA = [];
				for (let c = 0; c < slots[slotA].candidates.length; c++) {
					const trial = bestIndices.slice();
					trial[slotA] = c;
					const geometry = cheapGeometry(trial);
					if (geometry !== null) {
						rankedA.push({ idx: c, balance: geometry.balance });
					}
				}
				rankedA.sort((x, y) => x.balance - y.balance);

				const rankedB = [];
				for (let c = 0; c < slots[slotB].candidates.length; c++) {
					const trial = bestIndices.slice();
					trial[slotB] = c;
					const geometry = cheapGeometry(trial);
					if (geometry !== null) {
						rankedB.push({ idx: c, balance: geometry.balance });
					}
				}
				rankedB.sort((x, y) => x.balance - y.balance);

				for (let i = 0; i < Math.min(TOP_N_FOR_PAIR_SEARCH, rankedA.length); i++) {
					for (let j = 0; j < Math.min(TOP_N_FOR_PAIR_SEARCH, rankedB.length); j++) {
						const trial = bestIndices.slice();
						trial[slotA] = rankedA[i].idx;
						trial[slotB] = rankedB[j].idx;
						const result = evaluateIndices(trial);
						evaluatedTotal++;
						if (result.cost < bestResult.cost) {
							bestResult = result;
							bestIndices = trial;
							improved = true;
						}
					}
				}
			}
		}
		if (improved) {
			console.log(`\n2-opt (${label}): neue Verbesserung gefunden — Ausgleich `
				+ `${formatPercent(bestResult.geometry.balance)}, p=${bestResult.exponent.p.toFixed(3)}, `
				+ `Quote ${formatPercent(bestResult.exponent.quote)}.`);
			for (let s = 0; s < slots.length; s++) {
				console.log(`  Walze ${slots[s].reel + 1} (${slots[s].kind}): „${slots[s].candidates[bestIndices[s]].name}"`);
			}
		} else {
			console.log(`\n2-opt (${label}): keine Verbesserung.`);
		}
		return improved;
	}
	runTwoOpt('nach dem einfachen Abstieg');

	// STAND F3-Behebungslauf (sechster Durchgang): Mehrfachstart aus GANZ
	// ANDEREN Startpunkten, damit „20,78 % ist ein lokales Optimum in der
	// Nähe des bisherigen Fundes" nicht unwidersprochen bleibt. Fester
	// Startwert (kein crypto.getRandomValues, siehe Kopfkommentar dieser
	// Datei) — jeder Lauf mit derselben Zahl liefert dieselben Startpunkte.
	const restartRng = makeRng(0x5245_5354); // "REST" als Zahl gelesen
	const RESTARTS = 20;
	const SWEEPS_PER_RESTART = 6;
	for (let restart = 0; restart < RESTARTS; restart++) {
		let restartIndices = slots.map((slot) => Math.floor(restartRng() * slot.candidates.length));
		let restartResult = evaluateIndices(restartIndices);
		for (let sweep = 0; sweep < SWEEPS_PER_RESTART; sweep++) {
			let improved = false;
			for (let s = 0; s < slots.length; s++) {
				evaluatedTotal += slots[s].candidates.length;
				const { idx, result } = bestForSlot(restartIndices, s);
				if (idx !== restartIndices[s] && result.cost < restartResult.cost) {
					restartIndices = restartIndices.slice();
					restartIndices[s] = idx;
					restartResult = result;
					improved = true;
				}
			}
			if (!improved) {
				break;
			}
		}
		console.log(`Mehrfachstart ${restart + 1}/${RESTARTS}: konvergiert bei Ausgleich `
			+ `${restartResult.geometry === null ? 'n/a (Bandregel verletzt)' : formatPercent(restartResult.geometry.balance)}`
			+ (restartResult.exponent.ok ? `, p=${restartResult.exponent.p.toFixed(3)}` : ''));
		if (restartResult.cost < bestResult.cost) {
			bestResult = restartResult;
			bestIndices = restartIndices;
			console.log('  → NEUER Gesamtbester Fund aus diesem Mehrfachstart.');
		}
	}

	// Politur: vom insgesamt besten Fund aus dem Mehrfachstart noch einmal
	// ein einfacher Koordinatenabstieg (alle sechs Walzen einzeln) UND ein
	// zweiter 2-opt-Lauf — der erste 2-opt-Lauf kannte dieses Gebiet noch
	// nicht, ein einzelner Fund aus einem Mehrfachstart muss selbst noch
	// kein vollständig ausgereiztes lokales Optimum sein.
	for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
		let improvedThisSweep = false;
		for (let s = 0; s < slots.length; s++) {
			evaluatedTotal += slots[s].candidates.length;
			const { idx, result } = bestForSlot(bestIndices, s);
			if (idx !== bestIndices[s] && result.cost < bestResult.cost) {
				bestIndices[s] = idx;
				bestResult = result;
				improvedThisSweep = true;
				console.log(`  Politur, Walze ${slots[s].reel + 1} (${slots[s].kind}): neue Wahl `
					+ `„${slots[s].candidates[idx].name}" — Ausgleich ${formatPercent(bestResult.geometry.balance)}`);
			}
		}
		if (!improvedThisSweep) {
			break;
		}
	}
	runTwoOpt('nach dem Mehrfachstart');

	console.log(`\n${evaluatedTotal.toLocaleString('de-DE')} Kandidaten geprüft (Koordinatenabstieg + 2-opt +`
		+ ' Mehrfachstart + Politur, keine erschöpfende Suche).');
	console.log(`Bestes Ergebnis: Ausgleich ${formatPercent(bestResult.geometry.balance)}, `
		+ `p=${bestResult.exponent.ok ? bestResult.exponent.p.toFixed(3) : 'n/a'}, `
		+ `Quote ${bestResult.exponent.ok ? formatPercent(bestResult.exponent.quote) : 'n/a'} `
		+ `(P1=${formatPercent(bestResult.geometry.p1)}, P2=${formatPercent(bestResult.geometry.p2)}, `
		+ `P3=${formatPercent(bestResult.geometry.p3)}).`);
	for (let s = 0; s < slots.length; s++) {
		console.log(`  Walze ${slots[s].reel + 1} (${slots[s].kind}): „${slots[s].candidates[bestIndices[s]].name}"`);
	}

	if (bestResult.exponent.ok) {
		console.log('\nGerundete PAYTABLE bei bestem p:');
		for (const symbol of SYMBOLS) {
			console.log(`  ${symbol.padEnd(12)} `
				+ [3, 4, 5, 6].map((l) => bestResult.exponent.paytable[symbol][l]).join(', '));
		}
	}

	printCandidateBlock(buildStrips(bestIndices));
}

// -----------------------------------------------------------------------
// LOKALE SUCHE (`--lokale-suche`) — zweiter Durchgang nach Messlauf F3-M2,
// auf ausdrückliche Erweiterung des Auftrags (Feldausgleich ist eine harte
// Vorgabe aus C.14.8, die Quote die weiche). Anders als die Katalogsuche
// oben hält dieser Durchgang die drei SELBST GESETZTEN Symmetrieauflagen
// aus F3a NICHT mehr fest (gleiche Struktur der vier garantierten Walzen,
// Leitfrucht-Verteilung K,K,Z,O, gleiche Struktur der beiden freien
// Walzen) — jede der sechs Walzen bekommt ihre eigene, unabhängige
// Belegung. Fest bleiben NUR die Konzeptvorgaben: welche vier der sechs
// Walzen „garantiert" sind (GUARANTEED_REELS/FREE_REELS, Indizes
// unverändert), und alle sieben Bandregeln selbst (geprüft über dieselbe
// `checkBandRules()`/`scoreCandidateExactly()` wie die Katalogsuche —
// EIN Prüfmaßstab für beide Suchverfahren, keine zweite Wahrheit).
// -----------------------------------------------------------------------

/**
 * Die Bandbelegung „mehr-a"/„block"/„block", wie sie mit Umsetzungsstück
 * F3b in Classes/Rules.php eingesetzt wurde — der Startpunkt der lokalen
 * Suche. Absichtlich hier als Literal eingetragen (nicht aus Rules.php
 * gelesen): dieses Werkzeug erzeugt Vorschläge, es liest keine bestehende
 * Datei — dieselbe Arbeitsteilung wie im übrigen Skript.
 *
 * @type {string[][]}
 */
const LOCAL_SEARCH_START = [
	['kirsche', 'zitrone', 'orange', 'zitrone', 'glocke', 'zitrone', 'weintraube', 'erdbeere', 'melone', 'sieben', 'kirsche', 'pflaume', 'ananas', 'apfel', 'banane', 'kirsche', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
	['kirsche', 'zitrone', 'orange', 'kirsche', 'erdbeere', 'kirsche', 'weintraube', 'melone', 'pflaume', 'sieben', 'kirsche', 'glocke', 'erdbeere', 'apfel', 'banane', 'zitrone', 'ananas', 'weintraube', 'melone', 'pflaume'],
	['zitrone', 'kirsche', 'orange', 'zitrone', 'erdbeere', 'zitrone', 'weintraube', 'melone', 'sieben', 'pflaume', 'zitrone', 'glocke', 'ananas', 'apfel', 'banane', 'zitrone', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
	['orange', 'kirsche', 'zitrone', 'kirsche', 'erdbeere', 'orange', 'weintraube', 'melone', 'pflaume', 'sieben', 'orange', 'erdbeere', 'ananas', 'apfel', 'banane', 'orange', 'glocke', 'melone', 'weintraube', 'pflaume'],
	['kirsche', 'zitrone', 'orange', 'glocke', 'ananas', 'apfel', 'banane', 'sieben', 'weintraube', 'pflaume', 'erdbeere', 'melone', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'melone', 'pflaume'],
	['kirsche', 'zitrone', 'orange', 'glocke', 'weintraube', 'apfel', 'banane', 'erdbeere', 'ananas', 'melone', 'pflaume', 'sieben', 'glocke', 'ananas', 'apfel', 'banane', 'erdbeere', 'weintraube', 'pflaume', 'melone'],
];

/** @param {string[][]} strips @returns {string[][]} */
function cloneStrips(strips) {
	return strips.map((strip) => strip.slice());
}

/**
 * Erzeugt EINEN Zug: eine kleine, lokale Änderung an GENAU EINER Walze.
 * Zwei Zugarten, beide auf Anweisung benannt:
 *   - Tausch zweier Positionen (deckt „zwei Positionen vertauschen" und
 *     „eine kleine Frucht um eine Position verschieben" ab — Letzteres ist
 *     ein Tausch zwischen Nachbarpositionen, ein Spezialfall);
 *   - Ersetzen einer Position durch ein zufälliges Symbol aus dem vollen
 *     Zwölfer-Alphabet (deckt „ein Symbol gegen ein anderes tauschen" und
 *     „eine Sorte gegen eine andere kleine Frucht austauschen" ab — auch
 *     Letzteres ist ein Spezialfall: die Ersetzung KANN eine kleine Frucht
 *     treffen und KANN durch eine andere kleine Frucht ersetzen, das
 *     entscheidet der Zufall, nicht eine eigene dritte Zugart).
 * Der Zug wird NICHT vorab auf Regelkonformität geprüft — das übernimmt
 * `scoreCandidateExactly()` hinterher, mit derselben `checkBandRules()`
 * wie die Katalogsuche.
 *
 * @param {string[][]} strips
 * @param {() => number} rng
 * @returns {string[][]}
 */
function randomMove(strips, rng) {
	const next = cloneStrips(strips);
	const reel = Math.floor(rng() * REELS);
	if (rng() < 0.6) {
		// Tausch: ändert das Vielfachmengen einer Walze NICHT — Regel 6/7
		// bleiben automatisch erhalten, sind also keine Ursache für einen
		// verworfenen Zug dieser Art. Trotzdem KEINE Vorabprüfung: ob der
		// Tausch Regel 2/3/4 verletzt, hängt von den Nachbarpositionen ab
		// und ist billiger über scoreCandidateExactly() zu entscheiden als
		// hier vorab nachzubilden.
		const p = Math.floor(rng() * LAP);
		let q = Math.floor(rng() * LAP);
		while (q === p) {
			q = Math.floor(rng() * LAP);
		}
		const tmp = next[reel][p];
		next[reel][p] = next[reel][q];
		next[reel][q] = tmp;
	} else {
		// Ersetzen: HIER lohnt eine billige Vorabprüfung, weil die naive
		// Variante (jede Position, jedes Symbol) weit häufiger an Regel 7
		// scheitert als der Tausch — wird das letzte Vorkommen einer Sorte
		// auf dieser Walze ersetzt, ist der Zug garantiert ungültig, bevor
		// überhaupt gerechnet wird. Positionen mit einer Sorte, die auf
		// dieser Walze noch mindestens ein zweites Mal vorkommt, werden
		// bevorzugt (nicht ausschließlich, damit die Suche nicht blind für
		// den saltenen Fall wird, in dem gerade DAS die bessere Wahl ist).
		const counts = new Map();
		for (const symbol of next[reel]) {
			counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
		}
		const safePositions = [];
		for (let i = 0; i < LAP; i++) {
			if ((counts.get(next[reel][i]) ?? 0) > 1) {
				safePositions.push(i);
			}
		}
		const p = safePositions.length > 0 && rng() < 0.85
			? safePositions[Math.floor(rng() * safePositions.length)]
			: Math.floor(rng() * LAP);
		next[reel][p] = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
	}
	return next;
}

/**
 * Kosten für die simulierte Abkühlung: Zielgröße ist der Feldausgleich;
 * die Quote ist NEBENBEDINGUNG, nicht Zielgröße — sie fließt nur als
 * Strafterm ein, und auch nur, wenn sie WEIT außerhalb eines großzügigen
 * Korridors liegt (die exakte Quote wird ohnehin am Ende über die
 * Gewinnwerte nachgezogen, Stellschraube 4, siehe DECISIONS.md).
 *
 * @param {{balance: number, quote: number}} score
 * @returns {number}
 */
function localSearchCost(score) {
	const quoteSlack = score.quote < 0.85 || score.quote > 1.20 ? Math.abs(score.quote - 0.98) * 0.5 : 0;
	return score.balance + quoteSlack;
}

/**
 * Simuliertes Abkühlen (Simulated Annealing) über EINEN Lauf mit festem
 * Startwert: verbessernde Züge werden immer angenommen, verschlechternde
 * mit sinkender Wahrscheinlichkeit — das findet aus einem lokalen Tal
 * wieder heraus, ohne bei jedem Schritt bergab laufen zu müssen. Bricht
 * nach `maxMs` Millisekunden ab (Wanduhrzeit, nicht Iterationszahl), damit
 * der Aufrufer die Laufzeit zusichern kann.
 *
 * @param {{seed: number, maxMs: number, start: string[][]}} options
 * @returns {{
 *   best: string[][], bestScore: object, iterations: number,
 *   accepted: number, improved: number, rejectedInvalid: number, elapsedMs: number,
 * }}
 */
function localSearch({ seed, maxMs, start, startTemperature }) {
	const rng = makeRng(seed);
	let current = cloneStrips(start);
	let currentScore = scoreCandidateExactly(current);
	if (currentScore === null) {
		throw new Error('lokale Suche: der Startpunkt selbst verletzt eine Bandregel — Fehler in der Übernahme.');
	}
	let currentCost = localSearchCost(currentScore);
	let best = current;
	let bestScore = currentScore;
	let bestCost = currentCost;

	const T0 = startTemperature ?? 0.06;
	const T_MIN = 0.0004;
	const COOLING = 0.99993;
	let temperature = T0;

	const started = Date.now();
	let iterations = 0;
	let accepted = 0;
	let improved = 0;
	let rejectedInvalid = 0;

	while (Date.now() - started < maxMs) {
		iterations++;
		const candidate = randomMove(current, rng);
		const candidateScore = scoreCandidateExactly(candidate);
		if (candidateScore === null) {
			rejectedInvalid++;
			continue;
		}
		const candidateCost = localSearchCost(candidateScore);
		const delta = candidateCost - currentCost;
		if (delta <= 0 || rng() < Math.exp(-delta / temperature)) {
			current = candidate;
			currentScore = candidateScore;
			currentCost = candidateCost;
			accepted++;
			if (candidateCost < bestCost) {
				best = candidate;
				bestScore = candidateScore;
				bestCost = candidateCost;
				improved++;
			}
		}
		temperature = Math.max(T_MIN, temperature * COOLING);
	}

	return { best, bestScore, iterations, accepted, improved, rejectedInvalid, elapsedMs: Date.now() - started };
}

/** Xorshift32 mit festem Startwert — deterministisch, kein crypto.getRandomValues. */
function makeRng(seed) {
	let state = seed >>> 0 || 0x9e3779b9;
	return function next() {
		state ^= state << 13; state >>>= 0;
		state ^= state >>> 17;
		state ^= state << 5; state >>>= 0;
		return state / 0x100000000;
	};
}

/**
 * Stufe 2: Stichprobe mit derselben evaluate() aus paytable.js.
 *
 * @param {string[][]} strips
 * @param {number} rounds
 * @returns {{p1: number, p2: number, p3: number, p10: number, maxSeen: number, rounds: number}}
 */
function sampleCandidate(strips, rounds) {
	const rng = makeRng(FIXED_SEED);
	const grid = [new Array(REELS), new Array(REELS), new Array(REELS), new Array(REELS), new Array(REELS)];
	let count1 = 0;
	let count2 = 0;
	let count3 = 0;
	let count10 = 0;
	let maxSeen = 0;

	for (let round = 0; round < rounds; round++) {
		for (let reel = 0; reel < REELS; reel++) {
			const position = Math.floor(rng() * LAP);
			for (let row = 0; row < ROWS; row++) {
				grid[row][reel] = strips[reel][(position + row) % LAP];
			}
		}
		const result = evaluate(grid);
		if (result.amount === 1) count1++;
		else if (result.amount === 2) count2++;
		else if (result.amount === 3) count3++;
		if (result.amount === 10) count10++;
		if (result.amount > maxSeen) maxSeen = result.amount;
	}

	return {
		p1: count1 / rounds, p2: count2 / rounds, p3: count3 / rounds, p10: count10 / rounds,
		maxSeen, rounds,
	};
}

/** 95 %-Vertrauensbereich (Normalapproximation) für einen Anteil p aus n Ziehungen. */
function confidenceHalfWidth(p, n) {
	return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

function formatPercent(value) {
	return `${(value * 100).toFixed(4).replace('.', ',')} %`;
}

function formatPhpStringList(list) {
	return `[${list.map((s) => `'${s}'`).join(', ')}]`;
}

function formatStripsBlock(strips) {
	const lines = strips.map((strip, i) => `        ${i} => ${formatPhpStringList(strip)},`);
	return `    public const STRIPS = [\n${lines.join('\n')}\n    ];`;
}

function formatDefaultGridBlock(grid) {
	const lines = grid.map((row, i) => `        ${i} => ${formatPhpStringList(row)},`);
	return `    public const DEFAULT_GRID = [\n${lines.join('\n')}\n    ];`;
}

/**
 * Stufe 0: die eine Bauvorschrift-Belegung ohne jede Suche — die engste
 * Bauform aus `guaranteedLayoutChoices()`/`freeLayoutChoices()` (Layout
 * "nah"/"block", je Sorte genau eine Kopie, das bauliche Minimum).
 */
function buildSeedCandidate() {
	const strips = new Array(REELS);
	const seedGuaranteedLayout = { a: [1], b: [2] };
	const seedFreeLayout = { k: [0], z: [1], o: [2] };

	for (const reel of GUARANTEED_REELS) {
		strips[reel] = buildGuaranteedReelFromLayout(LEITFRUCHT_BY_REEL[reel], seedGuaranteedLayout);
	}
	for (const reel of FREE_REELS) {
		strips[reel] = buildFreeReelFromLayout(seedFreeLayout);
	}

	if (strips.some((strip) => strip === null)) {
		throw new Error('Stufe 0 (Saat) hat keine gültige Platzierung gefunden — das ist ein Fehler in der Bauvorschrift.');
	}
	return strips;
}

function printCandidateBlock(strips) {
	const grid = deriveDefaultGrid(strips);
	console.log('\n========== EINSETZEN IN Classes/Rules.php ==========');
	console.log(formatDefaultGridBlock(grid));
	console.log(formatStripsBlock(strips));
	console.log('====================================================');
}

const args = process.argv.slice(2);
const nurSaat = args.includes('--nur-saat');
const rundenIndex = args.indexOf('--runden');
const rounds = rundenIndex !== -1 ? Number(args[rundenIndex + 1]) : DEFAULT_ROUNDS;

if (args.includes('--geometrie-suche')) {
	console.log('Geometriesuche (vierter Durchgang) — Fruchtanzahl UND -lage je garantierter Walze als eigene'
		+ ' Stellschraube (REVIEW-fruitrisk-f3.md [H2]), Koordinatenabstieg, Zielgröße Feldausgleich.');
	geometrySearch();
	process.exit(0);
}

if (args.includes('--joint-suche')) {
	console.log('Gemeinsame Suche (fünfter Durchgang) — Geometrie UND Gewinntabelle gemeinsam, Koordinatenabstieg,'
		+ ' Zielgröße Feldausgleich, Quote per Potenzabbildung nachgezogen (auf ausdrückliche Anweisung nach'
		+ ' dem vierten Durchgang).');
	jointGeometryPaytableSearch();
	process.exit(0);
}

if (nurSaat) {
	console.log('Stufe 0 — die Saat (keine Suche, keine Bewertung)');
	const strips = buildSeedCandidate();
	const bandRules = checkBandRules(strips);
	console.log(bandRules.ok
		? 'Alle sieben Bandregeln erfüllt.'
		: `ACHTUNG — Bandregeln verletzt:\n  ${bandRules.problems.join('\n  ')}`);
	const exact = scoreCandidateExactly(strips);
	if (exact !== null) {
		console.log(`Geschlossene Form: Quote ${formatPercent(exact.quote)} `
			+ `(P(Feld=1)=${formatPercent(exact.p1)}, P(Feld=2)=${formatPercent(exact.p2)}, `
			+ `P(Feld=3)=${formatPercent(exact.p3)})`);
		console.log('Dass diese Quote schon im Band 95,0–99,5 % liegt, ist für die Saat NICHT verlangt — dafür ist die'
			+ ' Suche (ohne --nur-saat) da.');
	}
	printCandidateBlock(strips);
	process.exit(0);
}

if (args.includes('--lokale-suche')) {
	const sekundenIndex = args.indexOf('--sekunden');
	const maxMsPerRestart = (sekundenIndex !== -1 ? Number(args[sekundenIndex + 1]) : 25) * 1000;
	const restartsIndex = args.indexOf('--neustarts');
	const restarts = restartsIndex !== -1 ? Number(args[restartsIndex + 1]) : 4;
	const seedBaseIndex = args.indexOf('--seed');
	const seedBase = seedBaseIndex !== -1 ? Number(args[seedBaseIndex + 1]) : 0x4c4f4b41; // "LOKA"
	const t0Index = args.indexOf('--t0');
	const startTemperature = t0Index !== -1 ? Number(args[t0Index + 1]) : 0.06;

	console.log(`Lokale Suche (simuliertes Abkühlen), ${restarts} Neustart(e) zu je ${(maxMsPerRestart / 1000).toFixed(0)} s, `
		+ `Zielgröße Feldausgleich, Quote als Nebenbedingung (nicht als Zielgröße)`);

	const startScore = scoreCandidateExactly(LOCAL_SEARCH_START);
	console.log(`Startpunkt „mehr-a"/„block"/„block": Ausgleich ${formatPercent(startScore.balance)}, `
		+ `Quote ${formatPercent(startScore.quote)} (P1=${formatPercent(startScore.p1)}, `
		+ `P2=${formatPercent(startScore.p2)}, P3=${formatPercent(startScore.p3)})`);

	let overallBest = LOCAL_SEARCH_START;
	let overallBestScore = startScore;
	let overallBestCost = localSearchCost(startScore);
	const runSummaries = [];

	for (let run = 0; run < restarts; run++) {
		const seed = (seedBase + run * 0x9e3779b1) >>> 0;
		const startPoint = run === 0 ? LOCAL_SEARCH_START : overallBest;
		const result = localSearch({ seed, maxMs: maxMsPerRestart, start: startPoint, startTemperature });
		const cost = localSearchCost(result.bestScore);
		runSummaries.push({ run, seed, result, cost });
		console.log(`  Neustart ${run + 1}/${restarts} (Seed 0x${seed.toString(16)}, Start `
			+ `${run === 0 ? 'F3b-Belegung' : 'bisher bester Fund'}): ${result.iterations.toLocaleString('de-DE')} Züge geprüft, `
			+ `${result.accepted.toLocaleString('de-DE')} angenommen, ${result.improved} davon neue Bestwerte, `
			+ `${result.rejectedInvalid.toLocaleString('de-DE')} an einer Bandregel gescheitert, `
			+ `${(result.elapsedMs / 1000).toFixed(1)} s — bester Ausgleich hier: ${formatPercent(result.bestScore.balance)} `
			+ `(Quote ${formatPercent(result.bestScore.quote)})`);
		if (cost < overallBestCost) {
			overallBest = result.best;
			overallBestScore = result.bestScore;
			overallBestCost = cost;
		}
		if (overallBestScore.balance <= 0.10 && overallBestScore.quote >= QUOTE_BAND_MIN && overallBestScore.quote <= QUOTE_BAND_MAX) {
			console.log('\n  Ziel erreicht (Ausgleich ≤ 10 % UND Quote im Band) — weitere Neustarts übersprungen.');
			break;
		}
	}

	console.log(`\nBester Fund über alle Neustarts: Ausgleich ${formatPercent(overallBestScore.balance)} `
		+ `(Start: ${formatPercent(startScore.balance)}), Quote ${formatPercent(overallBestScore.quote)} `
		+ `(P1=${formatPercent(overallBestScore.p1)}, P2=${formatPercent(overallBestScore.p2)}, P3=${formatPercent(overallBestScore.p3)}).`);
	const totalIterations = runSummaries.reduce((sum, r) => sum + r.result.iterations, 0);
	console.log(`Insgesamt ${totalIterations.toLocaleString('de-DE')} Züge über ${runSummaries.length} Neustart(e) geprüft.`);

	printCandidateBlock(overallBest);
	process.exit(0);
}

console.log(`Suche über den erweiterten Suchraum (Stellschrauben 1–2, siehe Kopfkommentar), Ziel-Quote `
	+ `${formatPercent(QUOTE_TARGET)}, Band ${formatPercent(QUOTE_BAND_MIN)}–${formatPercent(QUOTE_BAND_MAX)}, `
	+ `Feldausgleich ±${formatPercent(FIELD_BALANCE_TOLERANCE)}`);

const guaranteedLayouts = guaranteedLayoutChoices();
const freeLayouts = freeLayoutChoices();

const guaranteedBuilds = [];
for (const layout of guaranteedLayouts) {
	const strips = {};
	let ok = true;
	for (const reel of GUARANTEED_REELS) {
		const strip = buildGuaranteedReelFromLayout(LEITFRUCHT_BY_REEL[reel], layout);
		if (strip === null) {
			ok = false;
			break;
		}
		strips[reel] = strip;
	}
	if (ok) {
		guaranteedBuilds.push({ layout, strips });
	}
}

const freeBuilds = [];
for (const layout of freeLayouts) {
	const strip = buildFreeReelFromLayout(layout);
	if (strip !== null) {
		freeBuilds.push({ layout, strip });
	}
}

console.log(`Gültige Bauformen: ${guaranteedBuilds.length}/${guaranteedLayouts.length} (garantiert), `
	+ `${freeBuilds.length}/${freeLayouts.length} (frei, je Walze unabhängig wählbar); kombiniert: `
	+ `${guaranteedBuilds.length * freeBuilds.length * freeBuilds.length}`);

const started = Date.now();
let evaluated = 0;
let bandRuleFailures = 0;
const scored = [];

for (const guaranteedBuild of guaranteedBuilds) {
	for (const freeA of freeBuilds) {
		for (const freeB of freeBuilds) {
			const strips = new Array(REELS);
			for (const reel of GUARANTEED_REELS) {
				strips[reel] = guaranteedBuild.strips[reel];
			}
			strips[FREE_REELS[0]] = freeA.strip;
			strips[FREE_REELS[1]] = freeB.strip;

			evaluated++;
			const exact = scoreCandidateExactly(strips);
			if (exact === null) {
				bandRuleFailures++;
				continue;
			}

			const quoteOk = exact.quote >= QUOTE_BAND_MIN && exact.quote <= QUOTE_BAND_MAX;
			const balanceOk = exact.balance <= FIELD_BALANCE_TOLERANCE;
			const penalty = Math.abs(exact.quote - QUOTE_TARGET) + exact.balance;
			scored.push({
				strips, quote: exact.quote, p1: exact.p1, p2: exact.p2, p3: exact.p3,
				balance: exact.balance, quoteOk, balanceOk, penalty,
				guaranteedName: guaranteedBuild.layout.name,
				freeNameA: freeA.layout.name, freeNameB: freeB.layout.name,
			});
		}
	}
}

const elapsedStage1 = ((Date.now() - started) / 1000).toFixed(2);
console.log(`Stufe 1 fertig nach ${elapsedStage1} s: ${evaluated} Kandidaten geprüft, `
	+ `${bandRuleFailures} davon an einer Bandregel gescheitert, ${scored.length} exakt bewertet.`);

if (scored.length === 0) {
	console.error('\nABBRUCH: kein einziger Kandidat erfüllt alle sieben Bandregeln. Das ist ein Fehler in der'
		+ ' Bauvorschrift (Stufe 0), nicht in der Feinsuche — siehe Kopfkommentar, Abschnitt "Stellschrauben".');
	process.exit(1);
}

scored.sort((a, b) => {
	const aPass = a.quoteOk && a.balanceOk ? 0 : 1;
	const bPass = b.quoteOk && b.balanceOk ? 0 : 1;
	if (aPass !== bPass) return aPass - bPass;
	return a.penalty - b.penalty;
});

const passing = scored.filter((c) => c.quoteOk && c.balanceOk).length;
console.log(`Davon im Band UND ausgeglichen: ${passing}.`);
if (passing === 0) {
	console.log('WARNUNG: kein Kandidat erfüllt Quote-Band und Feldausgleich gleichzeitig. Die Rangliste unten zeigt'
		+ ' die nächstbesten — siehe Kopfkommentar, Abschnitt "Was ein Fehlschlag bedeutet".');
}

const shortlist = scored.slice(0, TOP_CANDIDATES_FOR_STAGE_2);

console.log(`\nStufe 2 — Stichprobe (${rounds.toLocaleString('de-DE')} Runden, fester Startwert) über die besten `
	+ `${shortlist.length} Kandidaten:`);
console.log('  #  Quote      P(Feld=1)  P(Feld=2)  P(Feld=3)  Ausgleich  P(Runde=1)  P(Runde=2)  P(Runde=3)  '
	+ 'P(Runde=10)  höchster Gewinn (Stichprobe)  garantiert  frei-A      frei-B');

const stage2Results = [];
for (let i = 0; i < shortlist.length; i++) {
	const candidate = shortlist[i];
	const sample = sampleCandidate(candidate.strips, rounds);
	stage2Results.push({ candidate, sample });
	console.log(
		`  ${String(i + 1).padStart(2)}  ${formatPercent(candidate.quote).padStart(10)}  `
		+ `${formatPercent(candidate.p1).padStart(9)}  ${formatPercent(candidate.p2).padStart(9)}  `
		+ `${formatPercent(candidate.p3).padStart(9)}  ${formatPercent(candidate.balance).padStart(9)}  `
		+ `${formatPercent(sample.p1).padStart(10)}  ${formatPercent(sample.p2).padStart(10)}  `
		+ `${formatPercent(sample.p3).padStart(10)}  ${formatPercent(sample.p10).padStart(11)}  `
		+ `${String(sample.maxSeen).padStart(28)}  ${candidate.guaranteedName.padStart(10)}  `
		+ `${candidate.freeNameA.padStart(10)}  ${candidate.freeNameB.padStart(10)}`
	);
}

const best = stage2Results[0];
console.log(`\nBester Kandidat: garantierte Walzen Bauform „${best.candidate.guaranteedName}", `
	+ `freie Walze 1 Bauform „${best.candidate.freeNameA}", freie Walze 2 Bauform „${best.candidate.freeNameB}".`);
console.log(`Vertrauensbereich P(Runde=1) ± ${formatPercent(confidenceHalfWidth(best.sample.p1, rounds))} `
	+ `(95 %), entsprechend für P(Runde=2) und P(Runde=3).`);
console.log(`Quote (geschlossene Form, exakt): ${formatPercent(best.candidate.quote)}. `
	+ `Der volle Lauf (verify-payout.mjs ohne --schnell) zählt dieselbe Zahl über alle ${TOTAL.toLocaleString('de-DE')} `
	+ 'Stellungen nach — Nachweis, nicht Suche.');

printCandidateBlock(best.candidate.strips);

process.exit(0);
