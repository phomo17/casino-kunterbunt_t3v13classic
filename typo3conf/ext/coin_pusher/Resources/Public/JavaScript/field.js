/**
 * Coin Pusher – Spielfeld und Physik, ZWEI EBENEN
 * ==================================================
 *
 * EINE Datei, weil sie EINE Sache beschreibt: das Spielfeld mit allem, was
 * darauf gilt. Die Maßordnung steht mit im selben Modul, damit Anhang E
 * wörtlich eingehalten ist – „ihre Breite ist ein benannter, dokumentierter
 * Wert an genau einer Stelle im Code". Zwei Dateien hießen zwei Stellen, an
 * denen jemand eine Zahl ändern könnte.
 *
 * Auch diese Datei ist importfrei (dieselbe Begründung wie rng.js). Der
 * Zufallsgeber wird von außen eingespeist: new Field({ random }). Ohne
 * random wirft der Konstruktor. Damit weiß field.js nichts von crypto und
 * nichts von Startwerten – und derselbe Code läuft im Browser und im
 * Nachweisskript.
 *
 *
 * DAS GERÄT, IN EINEM ABSATZ
 * ---------------------------
 *
 * Ein Block fährt gleichmäßig vor und zurück. Seine OBERSEITE ist die obere
 * Ebene: sie fährt mit, Münzen liegen darauf und werden über Reibung
 * mitgenommen. Hinten begrenzt eine FESTE Rückwand die obere Ebene. Der
 * gesamte Spielfeldboden – beide Ebenen – ist um rund vier Grad nach vorn
 * geneigt. An der Vorderkante der oberen Ebene, das ist zugleich die
 * Vorderwand des Blocks, fallen die Münzen auf die untere Ebene herunter.
 * Die untere Ebene steht fest; die Vorderwand desselben Blocks reicht bis
 * auf sie herunter und schiebt die dort liegenden Münzen nach vorn. Sie
 * schiebt nur, sie zieht nicht. Vorn links und rechts stehen zwei schräge
 * Ablenkleisten, die alles, was ihnen zu nahe kommt, nach außen in die
 * Verlustschächte führen. Die Seitenwände laufen trichterförmig: vorn ist
 * das Feld breit, hinten enger.
 *
 *
 * WARUM DER HAUFEN NACH VORN WANDERT – DIE STELLE, AN DER DIE ERSTE
 * AUSLEGUNG FALSCH WAR
 * -------------------------------------------------------------------
 *
 * Die erste Auslegung des Umbaus setzte darauf, dass die FESTE RÜCKWAND den
 * Nettovorschub erzeugt: das Deck nimmt den Haufen hin und zurück mit, auf
 * der Rückfahrt läuft er an der Wand auf und staucht sich, also müsste er
 * netto vorwärts wandern. GEMESSEN stimmt das nicht (verify-physics.mjs,
 * F-20: 0,35 Einheiten je Umlauf, und kein einziger Ebenenwechsel auf
 * 1.000 Einwürfe). Zwei Gründe, und beide sind grundsätzlich:
 *
 *   1. Die Stauchung an der Rückwand schiebt den Haufen nur um das nach
 *      vorn, worum er LÄNGER geworden ist – und länger wird er allein durch
 *      neue Münzen. Damit wäre der Einwurf der Antrieb des Geräts. B.9.2
 *      sagt aber, der Einwurfzeitpunkt sei die einzige STEUERUNG; ein
 *      Münzschieber, der ohne Einwurf stillsteht, ist keiner.
 *   2. Die Stauchung setzt eine ununterbrochene Berührungskette von der
 *      Rückwand bis nach vorn voraus. Bei den gemessenen Flächendeckungen
 *      (29–48 %) gibt es die nicht; die meisten Münzen haben niemanden
 *      hinter sich, der sie hält, und pendeln mit dem Deck hin und zurück.
 *
 * Am echten Gerät leistet das etwas anderes, das im Modell schlicht fehlte:
 * DER SPIELFELDBODEN ist geneigt, um drei bis fünf Grad nach vorn. Die
 * Neigung zieht jede Münze mit g · sin(Neigung) nach vorn. Solange die
 * Münze auf ihrer Unterlage HAFTET, hält die Haftreibung sie fest – ein
 * ruhender Haufen rutscht nicht von selbst los, und genau das prüft F-25
 * nach. Sobald das Deck aber unter ihr wegfährt, GLEITET sie, und dann
 * wirkt die Neigung:
 *
 *   – Auf der Vorwärtsfahrt zeigen Reibung und Hangabtrieb in dieselbe
 *     Richtung. Die Münze wird mit (µ · g + g · sin) beschleunigt und hat
 *     die Deckgeschwindigkeit schnell erreicht.
 *   – Auf der Rückfahrt zeigen sie GEGENEINANDER. Die Münze wird nur mit
 *     (µ · g − g · sin) zurückgeholt und braucht länger, bis sie mit dem
 *     Deck läuft.
 *
 * Der Unterschied dieser beiden Anlaufwege ist der Nettovorschub je Umlauf.
 * Er ist ungefähr v² · sin / (µ² − sin²) mit v = Deckgeschwindigkeit,
 * hängt also quadratisch am Hub und nur schwach an der Reibung – und er
 * gilt für JEDE Münze einzeln, ganz ohne Nachbarn. Deshalb wandert auch ein
 * dünn belegtes Deck, und deshalb wandert ein dicht belegtes AUCH OHNE
 * EINWURF (F-20). Die feste Rückwand bleibt trotzdem stehen: sie hält den
 * Haufen davon ab, hinten aus dem Gerät zu laufen.
 *
 * DIE NEIGUNG IST EINE KRAFT, KEINE GEOMETRIE. Der Boden wird NICHT
 * gekippt gerechnet. Ein gekippter Boden machte z und y voneinander
 * abhängig, brächte Winkelfunktionen in jede Höhenrechnung (und die sind in
 * der Sprachnorm nicht bitgenau festgelegt) und wäre im Bild nicht von der
 * Perspektive zu unterscheiden. Statt dessen steht die Neigung als EIN
 * benannter Sinuswert da und wirkt als zusätzliche Beschleunigung nach
 * vorn. Der Unterschied zwischen sin und tan beträgt bei vier Grad 0,0001
 * und geht in keiner Rechnung dieses Modells unter.
 *
 *
 * DAS KOORDINATENSYSTEM
 * ----------------------
 *
 * Von der Seite gesehen (x läuft in die Bildebene hinein):
 *
 *   z
 *   ^                                          +--- feste Rückwand
 *   |                                          |    (y = FIELD_DEPTH)
 *   |           #############################  |
 *   |  DECK_    #  o o  o o o   obere Ebene #  |   <- Oberseite des Blocks,
 *   |  HEIGHT   #  (Oberseite des Blocks)   #  |      fährt mit
 *   |      +----#############################--+
 *   |      | ^ Vorderwand des Blocks (y = plateY())
 *   |  o o | o
 *   | o o o o o o        untere Ebene, FEST
 *   +--+---+----------------------------------------> y
 *  z=0  y=0                                   y = LOWER_DEPTH
 *       Abwurfkante                           (hinterste Lage der Vorderwand)
 *
 * Von oben gesehen (wie in der dritten Auslegung, unverändert):
 *
 *      x = 0                                   x = FIELD_WIDTH
 *        |                                             |
 *        |   +---------------------------------------+
 *        |   |              Feldboden                |  Wand steht FEST an
 *        |   |            (untere Ebene)             |  der Bodenkante
 * y = FRONT_ZONE_DEPTH - - - - - - - - - - - - - - - -
 *        |   |###|         vorderer Bereich   |###|   # = Verlustschacht,
 *  y = 0 |   +------------- Abwurfkante -----------+       Wand um CHUTE_WIDTH
 *                                                          zurück
 *
 * - x läuft von links (0) nach rechts (FIELD_WIDTH).
 * - y läuft von der Abwurfkante (0) nach hinten (FIELD_DEPTH). Eine Münze,
 *   deren Mittelpunkt y <= 0 erreicht, ist gewonnen.
 * - z ist die UNTERKANTE einer Münze über dem Boden der unteren Ebene.
 *   z = 0 heißt: liegt auf der unteren Ebene. z = DECK_HEIGHT heißt: liegt
 *   auf der oberen Ebene. z = <Unterkante der Münze darunter> +
 *   COIN_THICKNESS heißt: liegt auf einer anderen Münze.
 * - Die untere Ebene reicht von y = 0 bis y = plateY(); dahinter steht der
 *   Block. Die obere Ebene reicht von y = plateY() bis y = FIELD_DEPTH.
 *   LOWER_DEPTH ist die HINTERSTE Lage der Vorderwand, also die größte
 *   Tiefe, die die untere Ebene im Umlauf je erreicht.
 * - Die Einheit ist frei („Einheiten"); die Ansicht rechnet sie beim
 *   Zeichnen in Bildpunkte um. Kein Wert dieser Datei ist eine Farbe, ein
 *   Bildpunkt oder eine Gestaltungsentscheidung.
 *
 *
 * DAS 2,5D-MODELL – WAS ES KANN UND WAS ES AUSDRÜCKLICH NICHT KANN
 * -------------------------------------------------------------------
 *
 * Voll-3D-Starrkörper ist ausdrücklich NICHT gewollt: sie kosteten ein
 * Vielfaches an Rechenzeit, brächten Drehungen um drei Achsen mit und wären
 * auf einem Telefon nicht zu halten. Statt dessen:
 *
 *   – Eine Münze ist ein AUFRECHT STEHENDER Zylinder: Kreis in der Ebene,
 *     Halbmesser r, Dicke COIN_THICKNESS, immer flach liegend. Sie kann sich
 *     NICHT auf die Kante stellen und NICHT rollen. Das ist keine
 *     Auslassung, sondern die Bedingung dafür, dass der Ablauf wiederholbar
 *     bleibt: eine kippende Münze bräuchte Winkelfunktionen, und die sind in
 *     der Sprachnorm NICHT bitgenau festgelegt (siehe WIEDERHOLBARKEIT).
 *   – Zwei Münzen stoßen sich in der Ebene NUR ab, wenn ihre Höhenbereiche
 *     [z, z + COIN_THICKNESS) einander überlappen. Sonst liegt die eine auf
 *     der anderen. Das ist die einzige Zeile, die aus dem flachen Modell ein
 *     gestapeltes macht (resolvePair(), erste beiden Zeilen).
 *   – Eine Münze kommt nur von OBEN auf eine andere: durch den Einwurf oder
 *     durch den Absturz von der oberen auf die untere Ebene. Seitliches
 *     Zusammenschieben hebt keine Münze an. Das ist eine bewusste
 *     Vereinfachung: „Aufreiten beim Stauchen" bräuchte Kontaktnormalen im
 *     Raum, also echtes 3D. Der Haufen wird trotzdem mehrlagig, weil die
 *     obere Ebene ihre Münzen laufend auf die untere abwirft – genau wie am
 *     echten Gerät.
 *   – Die Kippkante ist der MITTELPUNKT: sobald der Mittelpunkt einer Münze
 *     vor der Vorderkante der oberen Ebene liegt, verliert sie ihr Auflager
 *     und fällt. Keine Kippsimulation, keine Überhänge.
 *
 *
 * WARUM DIESE ZAHLEN UND KEINE ANDEREN
 * --------------------------------------
 *
 * MASSORDNUNG, VIERTE AUSLEGUNG (Umbau auf zwei Ebenen).
 *
 * Die dritte Auslegung (128 x 73, CHUTE_WIDTH 4,5) war mühsam erarbeitet und
 * ist mit dem Umbau ZWANGSLÄUFIG ungültig geworden: sie beschrieb ein Feld
 * mit EINER Ebene, in dem jede Münze ihre eigene Grundfläche brauchte. Mit
 * zwei Ebenen und Stapeln ist dieselbe Stückzahl auf deutlich weniger Fläche
 * unterzubringen, die Berührungskette verläuft über zwei Etagen, und die
 * Verweildauer einer Münze im vorderen Bereich ist eine andere. Die Zahlen
 * der dritten Auslegung wurden deshalb NICHT übernommen und NICHT
 * fortgeschrieben, sondern in einem eigenen, messbaren Schritt neu
 * ermittelt: tune-layout.mjs sucht die vier Maße, tune-chute.mjs danach die
 * eine erlaubte Stellschraube. Die Tabellen beider Läufe stehen in README.md
 * und DECISIONS.md.
 *
 * Was aus der dritten Auslegung UNVERÄNDERT übernommen wurde, weil der Umbau
 * daran nichts ändert:
 *   – Die Bauart des Verlustschachts: feste Seitenwand über die ganze Tiefe,
 *     nur im vorderen Bereich (y < FRONT_ZONE_DEPTH) weicht sie um
 *     CHUTE_WIDTH zurück. Zwei frühere Bauarten sind daran gescheitert, dass
 *     CHUTE_WIDTH keine stetige Stellschraube war (Zahlen: DECISIONS.md).
 *     Der Schacht sitzt AUSSCHLIESSLICH an der unteren Ebene – siehe
 *     applyWalls().
 *   – FRONT_ZONE_DEPTH = 6 als BAUART, nicht als zweite Stellschraube.
 *   – Die vier Halbmesser 3,4 / 3,7 / 4,0 / 4,4 (der Zehner ist im
 *     Durchmesser 29 % größer als der Einser – nebeneinander deutlich
 *     sichtbar, ohne dass die Flächen um mehr als Faktor 1,7 auseinander
 *     laufen).
 *   – Zeitschritt 1/240 s, vier Unterschritte je Bild.
 *   – COIN_CAP_MAX = 200 als EINGESTELLTE Obergrenze (B.9.3 / Anhang E:
 *     „Obergrenze 150 bis 250, Richtwert 200"; ihr Zweck ist die Bildrate).
 *
 * DECK_HEIGHT ist die Höhe der oberen über der unteren Ebene. Sie muss
 * mindestens drei Münzdicken betragen, sonst schöbe die Vorderwand des
 * Blocks eine dreilagige Stelle des unteren Haufens nicht mehr, sondern
 * glitte darunter durch (F-1 prüft das). Gewählt wurde das Vierfache der
 * Münzdicke: hoch genug, dass der Absturz von oben sichtbar ein Absturz ist,
 * niedrig genug, dass die Stufe im Bild nicht die halbe Zeichenfläche
 * frisst.
 *
 * COIN_THICKNESS verhält sich zum kleinsten Halbmesser (3,4) wie die Dicke
 * einer echten Münze zu ihrem Halbmesser – rund ein Halbes zu zehn. Sie geht
 * in keine Quote ein, nur in die Stapelhöhe und in die Ansicht.
 *
 * GRAVITY ist so gewählt, dass eine Münze die Deckhöhe in rund einer
 * Viertelsekunde durchfällt: sichtbar als Fall, nicht als Sprung. Bei DT =
 * 1/240 s legt sie dabei je Schritt höchstens rund 0,17 Einheiten zurück –
 * ein Zwanzigstel ihres Halbmessers, also kein Durchrutschen (F-7).
 *
 * DIE REIBUNG IST COULOMBSCH, NICHT MEHR EINE ANGLEICHUNG. Bis zur ersten
 * Auslegung des Umbaus baute die Mitnahme einen festen ANTEIL des
 * Geschwindigkeitsunterschieds je Schritt ab (DECK_GRIP = 0,08). Das ist
 * eine mathematisch bequeme, physikalisch falsche Reibung: sie ist in
 * beiden Richtungen gleich stark, sie kennt keine Haftung, und sie kann
 * eine Münze nie festhalten. Ein Haufen, der so mitgenommen wird, pendelt
 * symmetrisch – gemessen in F-20.
 *
 * Jetzt: DECK_FRICTION und STACK_FRICTION sind Reibungszahlen (µ), keine
 * Anteile. Was die Reibung je Zeitschritt höchstens ausrichten kann, ist
 * µ · GRAVITY · DT. Reicht das, um die Münze auf die Geschwindigkeit ihrer
 * Unterlage zu bringen, HAFTET sie (und der Hangabtrieb wird im selben
 * Schritt vollständig aufgehoben – eine ruhende Münze bleibt exakt liegen,
 * F-25 prüft das auf das letzte Bit). Reicht es nicht, GLEITET sie und wird
 * um genau diesen Höchstbetrag mitgenommen. Beide Werte müssen größer sein
 * als SLOPE_SIN, sonst rutschte der ganze Haufen von selbst vorn heraus;
 * F-1 prüft die Ungleichung.
 *
 * µ = 0,20 für Metall auf dem gebürsteten Deckblech und 0,15 für Metall auf
 * Metall sind die Lehrbuchwerte dieser Werkstoffpaarung; sie sind nicht
 * geschätzt und nicht an ein gewünschtes Ergebnis angepasst. Der Suchlauf
 * misst mit ihnen, er stellt sie nicht ein – wären sie eine Stellschraube
 * an der Quote, wäre es genau der unsichtbare Regler, den B.9.4 verbietet.
 *
 * KEINE ZWEITE, UNGERICHTETE DÄMPFUNG. DAMPING (0,975 je Schritt) und
 * STOP_SPEED entfallen ersatzlos. Sie waren eine zweite Reibung ohne
 * Unterlage: sie bremsten auch eine Münze, die gerade FÄLLT (F-19 hat genau
 * das als Fehler gemeldet – die waagerechte Geschwindigkeit blieb beim
 * Absturz nicht erhalten), und sie hätten den Hangabtrieb, der um zwei
 * Größenordnungen kleiner ist, vollständig überdeckt. Was sie leisten
 * sollten – dass ein Haufen zur Ruhe kommt –, leistet die Coulomb-Reibung
 * besser: sie wirkt nur dort, wo es eine Unterlage gibt, und sie ist mit
 * µ · g rund siebenmal stärker als DAMPING es war.
 *
 * SUPPORT_REACH entscheidet, ob eine Münze auf einer anderen LIEGT oder von
 * ihr ABRUTSCHT. Streng genommen liegt sie nur, solange ihr Mittelpunkt über
 * der Scheibe darunter steht (Abstand < r der unteren, bei gleich großen
 * Münzen also 0,5 * Radiensumme). In einem Haufen trägt eine Münze aber fast
 * nie eine einzelne Münze, sondern zwei oder drei zugleich – und dieses
 * Modell merkt sich nur die HÖCHSTE einzelne. 0,62 ist der Ausgleich dafür:
 * kleiner, und der Haufen fiele auf eine Lage zusammen; größer, und Münzen
 * blieben auf Kanten stehen. Der Wert wird im Suchlauf mitgemessen, nicht
 * geschätzt (Kennzahl „mittlere Stapelhöhe").
 *
 * DIE BAUFORM DER VERLUSTSTRECKE – WAS AUS DEM BILD EINES ECHTEN
 * SPIELFELDS ÜBERNOMMEN WURDE
 * ------------------------------------------------------------------
 *
 * Drei Dinge, alle drei Mechanik und keine Gestaltung:
 *
 *   TRICHTER (WALL_TAPER). Die Seitenwände stehen nicht senkrecht zur
 *   Abwurfkante, sondern laufen nach hinten zusammen: vorn ist das Feld am
 *   breitesten. Eine Münze, die nach vorn geschoben wird, findet dort mehr
 *   Platz und wird vom Druck des Haufens nach außen verteilt. Ohne den
 *   Trichter bliebe fast alles in der Mitte, wo es eingeworfen wurde, und
 *   die Verluststrecke käme nie zum Tragen. FIELD_WIDTH ist ab jetzt die
 *   Breite AN DER ABWURFKANTE, also die größte.
 *
 *   ABLENKLEISTEN (applyRails(), CHUTE_REACH). Vorn links und rechts steht
 *   je eine schräge Leiste auf der unteren Ebene. Ihr hinteres Ende liegt
 *   CHUTE_REACH Einheiten innen im Feld, ihr vorderes Ende liegt
 *   CHUTE_WIDTH Einheiten AUSSERHALB der Bodenkante. Wer an ihr anliegt und
 *   nach vorn geschoben wird, wird an ihr entlang nach außen geführt und
 *   fällt in den Schacht; wer innen an ihr vorbeikommt, erreicht die
 *   Abwurfkante. Sie ist ein Kapselhindernis, also dieselbe Rechnung wie
 *   zwischen zwei Münzen, nur gegen eine Strecke.
 *
 *   SCHACHTBREITE (CHUTE_WIDTH) IST JETZT BAUART, NICHT STELLSCHRAUBE.
 *   Der Grund steht in der Messung: eine Münze gilt als verloren, sobald
 *   ihr Mittelpunkt die Bodenkante überschreitet; die Wand hinter dem
 *   Schacht steht CHUTE_WIDTH dahinter. Ist CHUTE_WIDTH kleiner als der
 *   Halbmesser, kann die Münze ihren Mittelpunkt gar nicht über die Kante
 *   bringen – sie lehnt an der Wand. Ist CHUTE_WIDTH größer, ändert eine
 *   weitere Verbreiterung nichts mehr. Die Schachtbreite wirkt deshalb je
 *   Münzwert wie ein Schalter und nicht wie ein Regler: im Suchlauf der
 *   Stufe A blieb der Zehner (Halbmesser 4,4) bei JEDEM geprüften Maß auf
 *   100 % Quote, während der Einser schon auf 57 % fiel. CHUTE_WIDTH steht
 *   deshalb fest auf zwei größten Halbmessern – breit genug, dass jeder der
 *   vier Werte durchfallen KANN –, und die stetige, von der Münzgröße
 *   unabhängige Stellschraube ist CHUTE_REACH. Sie ist weiterhin EIN
 *   benannter, dokumentierter Wert an genau EINER Stelle im Code
 *   (Anhang E), nur eben ein anderer. Der Nachweis, dass die Schachtbreite
 *   allein die Zielquote nicht erreicht, wird in tune-chute.mjs, Stufe 0,
 *   gemessen und nicht behauptet.
 *
 * ALLOWED_LAYERS ist die neue Bezugsgröße der flächenbezogenen Obergrenze.
 * Bei einer Ebene war „belegte Fläche gegen FILL_TARGET * Bodenfläche" die
 * richtige Frage. Bei zwei Ebenen mit Stapeln ist die Bodenfläche der beiden
 * Ebenen im MITTEL über den Umlauf zusammen genau FIELD_WIDTH * FIELD_DEPTH
 * – die untere Ebene hat im Mittel die Tiefe LOWER_DEPTH - PLATE_STROKE/2,
 * die obere den Rest bis FIELD_DEPTH, und beides addiert sich auf. Wie viele
 * Lagen darüber erlaubt sind, sagt ALLOWED_LAYERS. FILL_TARGET behält damit
 * seine alte Bedeutung (Belegung EINER Lage) und bleibt bei 0,70.
 *
 * ENTRY_Y ist der feste Einwurfschlitz über der oberen Ebene (B.9.2: „Ein
 * fester Einwurfschlitz", „gesteuert wird ALLEIN der Zeitpunkt"). Er liegt
 * hinter der hintersten Lage der Vorderwand, damit nie eine Münze
 * versehentlich unmittelbar auf die untere Ebene fällt (F-1 prüft das). Dass
 * der Schlitz fest steht und der Zeitpunkt trotzdem wirkt, liegt am Deck:
 * eine Münze, die einschlägt, während das Deck weit hinten steht, hat mehr
 * Deck vor sich als eine, die bei vorgefahrenem Deck einschlägt – sie
 * braucht mehr Umläufe bis zur Abwurfkante. Der Zeitpunkt bleibt damit die
 * einzige Steuerung, ohne dass der Schlitz wandern müsste.
 *
 *
 * WIEDERHOLBARKEIT
 * -----------------
 *
 * In dieser Datei kommen ausschließlich +, -, *, /, Math.sqrt, Math.abs,
 * Math.min, Math.max, Math.floor, Math.ceil, Math.imul und Math.PI vor.
 * Math.PI ist eine feste Zahl, keine gerechnete Funktion – sie ist auf jeder
 * Maschine bitgleich und damit unbedenklich. Keine Winkelfunktion, keine
 * Potenzfunktion, keine Uhr und keine Systemzeitmessung jedweder Art: nur
 * die aufgezählten Rechenarten sind in der Sprachnorm exakt festgelegt und
 * liefern auf jeder Maschine dasselbe letzte Bit. Genau deshalb kippt und
 * rollt in diesem Modell auch keine Münze – das bräuchte Winkelfunktionen.
 * Der Zufallsgeber wird eingespeist statt importiert (new Field({ random }))
 * – im Spiel drawUint32() aus rng.js, im Nachweis createSeeded(startwert).
 */

/**
 * Breite des FELDBODENS AN DER ABWURFKANTE, in Einheiten – das ist die
 * größte Breite, denn die Seitenwände laufen nach hinten zusammen (siehe
 * WALL_TAPER). Für beide Ebenen gleich, ohne die Verlustschächte: die
 * liegen außerhalb der Bodenkante, mit einer festen Wand um CHUTE_WIDTH
 * dahinter (siehe applyWalls()).
 * <- Ergebnis von tune-layout.mjs, Stufe A. Tabelle in README.md.
 *
 * NOCH NICHT GEMESSEN: rechnerisch hergeleiteter Startwert. Er ist
 * gegenüber der ersten Auslegung des Umbaus (120) kleiner geworden, weil
 * die Ablenkleisten je Seite CHUTE_REACH Einheiten der Breite
 * beanspruchen und die Leiste bei einem sehr breiten Feld entweder zu
 * steil stünde (die Münzen verkeilten sich davor, statt an ihr entlang zu
 * gleiten) oder tiefer reichen müsste, als vor der vordersten Lage der
 * Vorderwand Platz ist.
 */
export const FIELD_WIDTH = 96;

/**
 * Tiefe von der Abwurfkante (y = 0) bis zur FESTEN RÜCKWAND der oberen
 * Ebene. Das ist die Gesamttiefe des Geräts, nicht die einer Ebene.
 * <- Ergebnis von tune-layout.mjs, Stufe A.
 *
 * NOCH NICHT GEMESSEN, siehe FIELD_WIDTH.
 */
export const FIELD_DEPTH = 104;

/**
 * HINTERSTE Lage der Vorderwand des Blocks – und damit die größte Tiefe, die
 * die untere Ebene im Umlauf erreicht. Alles dahinter ist obere Ebene.
 * DEFLECT_DEPTH (siehe dort) wird aus LOWER_DEPTH und PLATE_STROKE
 * abgeleitet und braucht Platz vor der vordersten Lage der Vorderwand –
 * beide Werte sind gegenüber der ersten Auslegung des Umbaus deshalb
 * angepasst.
 * <- Ergebnis von tune-layout.mjs, Stufe B.
 *
 * NOCH NICHT GEMESSEN, siehe FIELD_WIDTH.
 */
export const LOWER_DEPTH = 48;

/**
 * Hub des Blocks je Halbwelle. <- Ergebnis von tune-layout.mjs, Stufe B.
 *
 * NOCH NICHT GEMESSEN, siehe FIELD_WIDTH.
 */
export const PLATE_STROKE = 16;

/** Dicke einer Münze. Begründung im Kopfkommentar. */
export const COIN_THICKNESS = 1.6;

/**
 * Höhe der oberen über der unteren Ebene, zugleich die Höhe der Vorderwand
 * des Blocks. Mindestens drei Münzdicken (F-1) – sonst glitte die Wand unter
 * einer dreilagigen Stelle des unteren Haufens durch, statt sie zu schieben.
 */
export const DECK_HEIGHT = 4 * COIN_THICKNESS;   // 6,4

/**
 * Höhe der festen Rückwand über der oberen Ebene. Sie hält nur auf; für die
 * Physik genügte jede Höhe über einer Münzdicke. Der Wert steht hier, weil
 * die Ansicht ihn zum Zeichnen braucht und es keine zweite Stelle für ein
 * Maß dieses Geräts geben soll.
 */
export const REAR_WALL_HEIGHT = 10;

/**
 * Volle Hin- und Rückbewegung des Blocks in Zeitschritten. GANZZAHLIG UND
 * GERADE, damit die Phase ohne Rundung gespeichert und ohne Sprung
 * fortgesetzt werden kann (B.9.5). 600 Schritte = 2,5 Sekunden.
 *
 * Geändert von 960 (4,0 s): die Quelle des Auftraggebers nennt für echte
 * Geräte einen Zyklus von zwei bis drei Sekunden. Der Wert wirkt zusätzlich
 * unmittelbar auf den Vorschub, denn der wächst QUADRATISCH mit der
 * Deckgeschwindigkeit (siehe Kopfkommentar) – bei gleichem Hub bringt der
 * kürzere Umlauf rund das Zweieinhalbfache. F-1 prüft, dass der Umlauf im
 * Band 2 bis 3 Sekunden bleibt.
 */
export const PLATE_PERIOD_STEPS = 600;

/** Bilder je Sekunde, für die die Zeitschrittweite ausgelegt ist. */
export const FRAME_HZ = 60;

/** Unterschritte je Bild (B.9.3: „feste Zeitschritte mit Unterschritten je Bild"). */
export const SUBSTEPS = 4;

/** Länge eines festen Zeitschritts in Sekunden: 1/240. */
export const DT = 1 / (FRAME_HZ * SUBSTEPS);

/** Die vier Münzwerte aus B.9.2. */
export const COIN_VALUES = [1, 2, 5, 10];

/** Halbmesser je Münzwert, gleiche Reihenfolge wie COIN_VALUES. */
export const COIN_RADIUS = [3.4, 3.7, 4.0, 4.4];

/** Größter vorkommender Halbmesser – legt die Zellengröße des Gitters fest. */
export const MAX_RADIUS = 4.4;

/**
 * BAUART, NICHT MEHR DIE STELLSCHRAUBE (Begründung im Kopfkommentar,
 * gemessen in tune-chute.mjs Stufe 0).
 *
 * Breite des SPALTS zwischen der Bodenkante der UNTEREN Ebene und der festen
 * Wand dahinter, links und rechts gleich – wirksam NUR im vorderen Bereich
 * (y < FRONT_ZONE_DEPTH); überall sonst steht die Wand an der Bodenkante,
 * und über der oberen Ebene gibt es überhaupt keinen Schacht.
 *
 * Der Wert ist zwei größte Halbmesser: breit genug, dass JEDER der vier
 * Münzwerte seinen Mittelpunkt über die Bodenkante bringen kann und damit
 * überhaupt verlierbar ist. F-1 prüft die Ungleichung.
 *
 * STEHT ERST NACH MAX_RADIUS: der Wert ist aus ihm abgeleitet
 * (2 * MAX_RADIUS), und in einem ES-Modul läuft die oberste Ebene der Datei
 * in Textreihenfolge – eine const, die vor der Deklaration liest, von der
 * sie abhängt, wirft ReferenceError (zeitliche Totzone). Deshalb steht
 * dieser Block hier und nicht mehr, wie in der ersten Auslegung des Umbaus,
 * bei den übrigen Geräte-Maßen weiter oben.
 */
export const CHUTE_WIDTH = 2 * MAX_RADIUS;   // 8,8

/**
 * DIE STELLSCHRAUBE DER QUOTE (CONCEPT.md B.9.4, Anhang E – dort als
 * „Breite der Verlustschächte" beschrieben; die Ablösung ist ein
 * ausdrücklich vermerkter Konzeptverstoß, siehe DECISIONS.md).
 *
 * Wie weit die schräge Ablenkleiste an ihrem hinteren Ende in das Feld
 * hineingreift. Größer = ein breiterer Streifen jeder Seite wird nach außen
 * abgeführt = niedrigere Quote. Stetig und von der Münzgröße unabhängig,
 * denn die Leiste versetzt jede Münze um denselben Weg, gleich wie groß sie
 * ist – das ist der ganze Unterschied zur Schachtbreite.
 *
 * Dieser Wert ist der EINZIGE, der zur Einstellung der Quote verändert
 * werden darf, und er steht nur hier.
 * <- Ergebnis von tune-chute.mjs. Tabelle in README.md.
 *
 * NOCH NICHT GEMESSEN.
 */
export const CHUTE_REACH = 18;

/**
 * Seitliche Verjüngung je Einheit Tiefe: bei y liegt die Bodenkante links
 * bei WALL_TAPER · y statt bei 0, rechts entsprechend. 0,10 entspricht rund
 * 5,7 Grad je Seite. BAUART, keine zweite Stellschraube – der Wert wird im
 * Suchlauf mitgemessen, aber nicht zur Einstellung der Quote benutzt.
 * F-1 prüft, dass sich der Trichter über die volle Tiefe nicht schließt.
 */
export const WALL_TAPER = 0.10;

/**
 * Tiefe der Ablenkleisten: ABGELEITET, nicht gewählt. Die Leisten stehen auf
 * der unteren Ebene und dürfen von der Vorderwand des Blocks nie erreicht
 * werden – sonst führe der Block über sie hinweg. Die vorderste Lage der
 * Vorderwand ist LOWER_DEPTH − PLATE_STROKE; davon geht ein größter
 * Halbmesser Freiraum ab (die Leiste darf eine Münze auch nach HINTEN
 * drücken) und eine Einheit Sicherheitsabstand.
 */
export const DEFLECT_DEPTH = LOWER_DEPTH - PLATE_STROKE - MAX_RADIUS - 1;   // 26,6

/** Kantenlänge einer Gitterzelle; mindestens zwei größte Halbmesser. */
export const CELL_SIZE = 9.0;

/**
 * Fallbeschleunigung in Einheiten je Sekunde im Quadrat. So gewählt, dass
 * DECK_HEIGHT in rund einer Viertelsekunde durchfallen wird:
 * h = 1/2 * g * t^2  ->  g = 2 * 6,4 / 0,25^2 ~ 205. Aufgerundet auf 208.
 */
export const GRAVITY = 208;

/**
 * Sinus des Neigungswinkels des Spielfeldbodens. 0,07 entspricht rund
 * 4,0 Grad und liegt damit in der Mitte des Bands, das die Quelle für echte
 * Geräte nennt (3 bis 5 Grad). Als feste Zahl geschrieben und nicht
 * gerechnet: die Sinusfunktion ist in der Sprachnorm NICHT bitgenau festgelegt, und
 * eine einzige nicht festgelegte Stelle machte den ganzen Quotennachweis
 * wertlos. Der Wert ist Bauart und KEINE Stellschraube an der Quote – er
 * steht in beiden Halbwellen des Umlaufs gleich da.
 */
export const SLOPE_SIN = 0.07;

/**
 * Reibungszahlen (µ), keine Anteile mehr. DECK_FRICTION gilt zwischen einer
 * Münze und einer EBENE (Deckblech oben, Feldboden unten), STACK_FRICTION
 * zwischen zwei Münzen. Begründung und Zahlenherkunft im Kopfkommentar.
 * Beide MÜSSEN größer sein als SLOPE_SIN, sonst hielte die Haftreibung den
 * ruhenden Haufen nicht gegen die Neigung (F-1, F-25).
 */
export const DECK_FRICTION = 0.20;
export const STACK_FRICTION = 0.15;

/**
 * Was Hangabtrieb und Reibung je Zeitschritt an Geschwindigkeit ausrichten
 * können. Einmal hier ausgerechnet statt 240-mal je Sekunde in der
 * Schleife – und an EINER Stelle, damit niemand zwei verschiedene
 * Umrechnungen pflegt.
 */
export const SLOPE_STEP = GRAVITY * SLOPE_SIN * DT;
export const DECK_FRICTION_STEP = GRAVITY * DECK_FRICTION * DT;
export const STACK_FRICTION_STEP = GRAVITY * STACK_FRICTION * DT;

/**
 * Wie weit der Mittelpunkt einer Münze von dem der Münze darunter entfernt
 * sein darf, gemessen als Anteil der Radiensumme, damit sie noch getragen
 * wird. Begründung im Kopfkommentar.
 */
export const SUPPORT_REACH = 0.62;

/**
 * Die EINGESTELLTE Obergrenze der Stückzahl – fest auf dem Richtwert 200 aus
 * B.9.3 / Anhang E. Unverändert gegenüber der dritten Auslegung: der Zweck
 * ist die Bildrate auf einem Telefon, und der ändert sich durch zwei Ebenen
 * nicht.
 */
export const COIN_CAP_MAX = 200;

/** Untergrenze: darunter wird nie etwas entfernt (B.9.3: 150 bis 250). */
export const COIN_CAP_MIN = 150;

/** Angestrebter Flächenanteil EINER Lage; siehe needsRelief(). */
export const FILL_TARGET = 0.70;

/**
 * Wie viele Lagen die flächenbezogene Obergrenze zulässt. Neu mit dem Umbau:
 * ohne diese Zahl bezöge sich FILL_TARGET auf eine einzige Lage, und das
 * Ventil zöge, sobald der Haufen zweilagig wird – es wäre Regelweg statt
 * Notbremse. Begründung im Kopfkommentar.
 * <- Ergebnis von tune-layout.mjs, Stufe B.
 */
export const ALLOWED_LAYERS = 2.0;

/**
 * Tiefe des Rückwandstreifens, aus dem das Ventil entfernt – gemessen von
 * der FESTEN Rückwand nach vorn, also auf der OBEREN Ebene. Etwas mehr als
 * PLATE_STROKE, damit eine frisch eingeworfene Münze nicht schon vor der
 * nächsten Vorwärtsbewegung zur ältesten in der Zone wird und das Ventil
 * Notbremse bleibt statt Regelweg zu werden.
 */
export const BACK_ZONE = 28;

/**
 * DIE BAUART DES VERLUSTSCHACHTS (dritte Auslegung, unverändert übernommen).
 * Vollständige Begründung samt der beiden verworfenen Bauarten: README.md,
 * Abschnitt „Die Verlustschächte sind die Stellschraube", und DECISIONS.md.
 * FRONT_ZONE_DEPTH ist BAUART, keine zweite Stellschraube.
 */
export const FRONT_ZONE_DEPTH = 6;

export const PIN_ROWS = 9;         // Reihen des Stift-Slaloms hinter dem Einwurfschlitz (B.9.2), unverändert
export const PIN_STEP = 3.0;       // Seitlicher Versatz je Stiftreihe, unverändert
export const SLOT_X = FIELD_WIDTH / 2;

/**
 * Tiefe des festen Einwurfschlitzes. Er liegt hinter der hintersten Lage der
 * Vorderwand (LOWER_DEPTH), damit eine eingeworfene Münze IMMER auf der
 * oberen Ebene landet – nie unmittelbar auf der unteren. F-1 prüft den
 * Abstand an beiden Enden gegen MAX_RADIUS.
 */
export const ENTRY_Y = LOWER_DEPTH + 3 * MAX_RADIUS;

/** Höhe über dem Deck, aus der eine eingeworfene Münze fällt. */
export const ENTRY_HEIGHT = 3.0;

/**
 * Anfangsgeschwindigkeiten einer eingeworfenen Münze. Kleiner als in der
 * dritten Auslegung (12 / 6): dort wurde die Münze unmittelbar VOR die
 * Plattenkante gesetzt und brauchte Schwung, um in den Haufen zu kommen.
 * Jetzt fällt sie aus ENTRY_HEIGHT auf das Deck; ein zu großer waagerechter
 * Anteil ließe sie über den Haufen schlittern, statt darauf liegen zu
 * bleiben.
 */
export const ENTRY_SPEED = 6;
export const ENTRY_SIDE = 4;

// DAMPING und STOP_SPEED sind mit der Coulomb-Reibung entfallen – Begründung im Kopfkommentar.
export const RESTITUTION = 0.12;         // Rückprall bei einem Stoß: 0 = völlig unelastisch, 1 = ideal, unverändert
export const FRICTION = 0.35;            // Reibung quer zur Stoßrichtung, unverändert
export const CORRECTION = 0.8;           // Anteil der Überlappung, der je Durchgang aufgelöst wird, unverändert
export const MAX_CORRECTION = 1.5;       // Obergrenze der Verschiebung je Durchgang, gegen Ausreißer beim Einwurf, unverändert
/**
 * Durchgänge des Stoßlösers je Zeitschritt. War in der dritten Auslegung 3
 * und sollte laut Plan unverändert bleiben — F-6 hat nach dem Umbau aber
 * einen echten Fund gemeldet: in einem 240.000-Schritte-Referenzlauf blieb
 * bei zwei dicht gepackten Münzen auf der OBEREN Ebene ein winziger
 * Restüberlapp stehen (Abstand 7,263 gegen verlangte 7,350 — rund 0,037
 * Einheiten unter drei Solver-Durchgängen). Mit zwei Ebenen kommen auf der
 * oberen Ebene mehr Münzen auf engerem Raum zusammen als je im flachen
 * Modell (die gesamte Bodenfläche beider Ebenen ist jetzt für denselben
 * Bestand aufzuteilen) — drei Durchgänge reichten dafür nicht mehr sicher.
 * Vier Durchgänge lösen denselben Referenzlauf ohne Rest (siehe
 * DECISIONS.md); die zusätzlichen Kosten sind gering, weil solveContacts()
 * nur über tatsächlich benachbarte Zellen läuft.
 */
export const SOLVER_ITERATIONS = 4;

/**
 * Kennung des Speicherformats (B.9.5). „cp3", aus zwei Gründen zugleich:
 * die Maßordnung ist eine andere (ein alter Stand beschriebe Münzen an
 * Stellen, die es nicht mehr gibt), und die Zahlen werden jetzt auf drei
 * Nachkommastellen eingerastet (siehe serialize()). Ein Stand im Format
 * cp1 oder cp2 fällt an der Kennungsprüfung durch, liefert null und wird
 * durch den Grundhaufen ersetzt – ohne Fehler und ohne Konsolenausgabe,
 * genau wie B.9.5 es für einen beschädigten Stand verlangt. F-14 prüft
 * beide alten Kennungen ausdrücklich mit.
 */
export const FORMAT_VERSION = 'cp3';

/**
 * Auflösung des Speicherstands: Zahlen werden auf 1/1000 Einheit
 * eingerastet. Begründung bei serialize().
 */
export const STORE_SCALE = 1000;

/**
 * Höchste Unterkante, die eine Münze im Speicherstand haben darf. Sie deckt
 * die obere Ebene plus zwölf Lagen ab – mehr als jeder gemessene Haufen je
 * erreicht, und eng genug, dass ein verfälschter Stand auffällt.
 */
export const MAX_STACK_Z = DECK_HEIGHT + 12 * COIN_THICKNESS;

/**
 * Größe aller Felder. EINE MEHR als COIN_CAP_MAX – Begründung unverändert
 * aus der dritten Auslegung (Kapazitätsfehler, README.md und DECISIONS.md):
 * throwCoin() schreibt die neue Münze zuerst an den Index this.count und
 * räumt erst DANACH über die relieve()-Schleife auf.
 */
const CAPACITY = COIN_CAP_MAX + 1;

/**
 * Die Maßordnung als EIN Datensatz.
 *
 * Warum: tune-layout.mjs muss vier Maße durchprobieren, ohne die Datei zu
 * verändern – dieselbe Begründung, aus der chuteWidth und fillTarget schon
 * seit der dritten Auslegung als Option hereinkommen. Ein Skript, das den
 * Quelltext umschreibt, um zu messen, könnte niemand mehr nachvollziehen
 * (B.9.4: „das Gerät soll nicht lügen").
 *
 * Im SPIEL wird makeLayout() ohne Argument gerufen und liefert genau die
 * exportierten Konstanten. Es gibt damit weiterhin nur EINE Stelle, an der
 * eine Zahl steht.
 *
 * @param {object} [overrides]
 * @returns {{fieldWidth: number, fieldDepth: number, lowerDepth: number,
 *            plateStroke: number, deckHeight: number, allowedLayers: number}}
 */
export function makeLayout(overrides = {}) {
	const lowerDepth = overrides.lowerDepth ?? LOWER_DEPTH;
	const plateStroke = overrides.plateStroke ?? PLATE_STROKE;
	return {
		fieldWidth: overrides.fieldWidth ?? FIELD_WIDTH,
		fieldDepth: overrides.fieldDepth ?? FIELD_DEPTH,
		lowerDepth,
		plateStroke,
		deckHeight: overrides.deckHeight ?? DECK_HEIGHT,
		allowedLayers: overrides.allowedLayers ?? ALLOWED_LAYERS,
		// ABGELEITET aus lowerDepth und plateStroke, damit der Suchlauf die
		// Leistentiefe nicht als eigene Achse durchprobieren muss – sie ist
		// keine freie Wahl, sondern das, was vor der Vorderwand übrig bleibt.
		deflectDepth: lowerDepth - plateStroke - MAX_RADIUS - 1,
	};
}

export class Field {
	/**
	 * @param {{random: () => number, chuteWidth?: number, chuteReach?: number,
	 *          fillTarget?: number, layout?: object}} options
	 *        random      Pflicht. Liefert je Aufruf eine ganze Zahl aus [0, 2^32).
	 *                    Im Spiel drawUint32 aus rng.js, im Nachweis createSeeded(...).
	 *        chuteWidth  nur für den Suchlauf tune-chute.mjs Stufe 0; Vorgabe CHUTE_WIDTH.
	 *        chuteReach  nur für den Suchlauf tune-chute.mjs; Vorgabe CHUTE_REACH.
	 *        fillTarget  nur für den Suchlauf; Vorgabe FILL_TARGET.
	 *        layout      nur für den Suchlauf tune-layout.mjs; siehe makeLayout().
	 */
	constructor(options) {
		if (typeof options?.random !== 'function') {
			throw new TypeError(
				'Field verlangt einen Zufallsgeber: new Field({ random }). '
				+ 'Im Spiel drawUint32() aus rng.js, im Nachweis createSeeded(startwert).'
			);
		}
		this.random = options.random;
		this.layout = makeLayout(options.layout);            // NEU
		this.chuteWidth = options.chuteWidth ?? CHUTE_WIDTH;
		this.chuteReach = options.chuteReach ?? CHUTE_REACH;
		this.fillTarget = options.fillTarget ?? FILL_TARGET;

		// NEU: Die Bodenflächen beider Ebenen addieren sich im Mittel über den
		// Umlauf zu fieldWidth * fieldDepth – die untere hat im Mittel die
		// Tiefe lowerDepth - plateStroke/2, die obere den Rest bis fieldDepth.
		// Darüber sind allowedLayers Lagen erlaubt.
		this.fillArea = this.fillTarget * this.layout.allowedLayers
			* this.layout.fieldWidth * this.layout.fieldDepth;

		/** Ort, Geschwindigkeit, Halbmesser, Wert, Geburtsnummer – je Münze eine Spalte. */
		this.x = new Float64Array(CAPACITY);
		this.y = new Float64Array(CAPACITY);
		this.z = new Float64Array(CAPACITY);      // NEU: Unterkante über der unteren Ebene
		this.vx = new Float64Array(CAPACITY);
		this.vy = new Float64Array(CAPACITY);
		this.vz = new Float64Array(CAPACITY);     // NEU
		this.r = new Float64Array(CAPACITY);
		this.value = new Int32Array(CAPACITY);
		this.born = new Int32Array(CAPACITY);

		/**
		 * NEU, beide in JEDEM Zeitschritt neu berechnet und deshalb NICHT
		 * Teil des Speicherstands:
		 *   restZ[i]    die Höhe, auf der Münze i aufliegt
		 *   support[i]  die Spalte der Münze, auf der sie liegt, oder
		 *               -1, wenn sie unmittelbar auf einer Ebene liegt
		 *
		 * Sie stehen als Spalten und nicht als Rückgabewerte da, damit
		 * settleHeights(), applySurfaces() und relieve() dieselbe Auskunft
		 * benutzen, statt sie dreimal zu rechnen. Der Ebenenwechsel wird
		 * seit dem Umbau am Auflagerwechsel selbst erkannt (siehe
		 * settleHeights()) und braucht deshalb keinen eigenen Merker mehr.
		 */
		this.restZ = new Float64Array(CAPACITY);
		this.support = new Int32Array(CAPACITY);
		// -1 heißt „liegt unmittelbar auf einer Ebene". Ein frisch angelegtes
		// Int32Array steht auf 0, und 0 ist eine gültige Spaltennummer – ohne
		// diese Zeile behauptete ein neues Feld, jede Münze läge auf Münze 0.
		this.support.fill(-1);

		/** Anzahl belegter Spalten. Die Spalten 0 … count-1 sind IMMER belegt. */
		this.count = 0;

		/** Zeitschritte seit dem Anlegen; die Plattenphase ist stepCount % PLATE_PERIOD_STEPS. */
		this.stepCount = 0;

		/** Fortlaufende Nummer des nächsten Einwurfs; sie ist das „Alter" einer Münze. */
		this.spawnCount = 0;

		/** Bilanz in Münzwert-Einheiten, ganzzahlig. */
		this.thrownValue = 0;   // eingeworfen
		this.wonValue = 0;      // vorn heruntergefallen, noch nicht abgeholt
		this.chuteValue = 0;    // seitlich verloren
		this.valveValue = 0;    // vom Ventil an der Rückwand entfernt
		this.wonByValue = new Int32Array(COIN_VALUES.length);

		/**
		 * NEU, reine STÜCKZAHLEN. Sie tragen den Nachweis „keine Münze
		 * verschwindet und keine verdoppelt sich" (F-21, Q-9): am Ende muss
		 * spawnCount === wonCount + chuteCount + valveCount + count gelten.
		 * Die Wertbilanz allein genügte dafür nicht – zwei Einser und ein
		 * Zweier haben denselben Wert.
		 */
		this.wonCount = 0;
		this.chuteCount = 0;
		this.valveCount = 0;

		/**
		 * NEU, reine Kennzahl: wie oft eine Münze die obere Ebene verlassen
		 * hat und auf die untere gefallen ist. Q-10 weist damit nach, dass
		 * jede gewonnene Münze diesen Weg genommen hat – der Beleg, dass die
		 * zwei Ebenen tragen und nicht bloß gezeichnet sind.
		 */
		this.dropCount = 0;

		/* Gitter: Zählsortierung. cellStart hat eine Zelle mehr als das Gitter,
		   damit die letzte Zelle ihr Ende kennt. */
		this.cols = Math.ceil(this.layout.fieldWidth / CELL_SIZE);
		this.rows = Math.ceil(this.layout.fieldDepth / CELL_SIZE);
		this.cellOf = new Int32Array(CAPACITY);
		this.cellStart = new Int32Array(this.cols * this.rows + 1);
		this.cellItems = new Int32Array(CAPACITY);

		/**
		 * Schreibzeiger je Zelle. EINMAL angelegt statt in jedem buildGrid():
		 * ein neues typisiertes Feld 240-mal je Sekunde war die häufigste
		 * einzelne Ursache für einen langen Frame, und mit zwei Ebenen wird
		 * das Gitter nicht kleiner.
		 */
		this.cellCursor = new Int32Array(this.cols * this.rows);
	}

	/**
	 * Belegte Fläche, FRISCH aus x/r der aktuell vorhandenen Münzen summiert
	 * – kein mitgeführter Zähler mehr (Fund beim Umbau: eine über throwCoin()/
	 * remove() mit += / -= fortgeschriebene Summe ist wegen der fehlenden
	 * Assoziativität von Fließkommaaddition NICHT bitgleich mit einer frisch
	 * über restore() aufgebauten Summe über dieselben Münzen — F-11 in
	 * verify-physics.mjs deckte das auf: ein gespeicherter und wieder
	 * geladener Stand driftete nach vielen Zeitschritten spürbar vom
	 * ununterbrochenen Lauf ab, weil needsRelief() an genau dieser
	 * Fließkomma-Randstelle unterschiedlich entschied. Die frische Summe
	 * kostet O(count) statt O(1), aber sie läuft nur bei throwCoin() –
	 * nicht im heißen Pfad je Zeitschritt – und ist dafür in jedem Fall
	 * bitgleich, ganz gleich, ob das Feld live gewachsen oder aus einem
	 * Speicherstand wiederhergestellt ist.
	 *
	 * @returns {number}
	 */
	get area() {
		let sum = 0;
		for (let i = 0; i < this.count; i++) { sum += Math.PI * this.r[i] * this.r[i]; }
		return sum;
	}

	/** @returns {boolean} muss das Ventil ziehen? */
	needsRelief() {
		if (this.count > COIN_CAP_MAX) { return true; }
		if (this.count <= COIN_CAP_MIN) { return false; }
		return this.area > this.fillArea;
	}
	// Seit dem Umbau vergleicht die Flächengrenze gegen die Bodenfläche
	// BEIDER Ebenen mal der zugelassenen Lagenzahl (siehe Konstruktor). Ohne
	// diese Erweiterung zöge das Ventil, sobald der Haufen zweilagig wird –
	// es wäre Regelweg statt Notbremse, und B.9.3 verlangt das Gegenteil.

	/**
	 * Entfernt die ÄLTESTE Münze im Rückwandstreifen, ohne Gutschrift.
	 *
	 * Der Streifen liegt jetzt auf der OBEREN Ebene, an der festen Rückwand
	 * (y >= FIELD_DEPTH - BACK_ZONE). Das ist dieselbe Stelle wie vorher:
	 * dort, wo frisch eingeworfene Münzen liegen, und dort, wo B.9.3 das
	 * Ventil ausdrücklich verortet („die ältesten Münzen an der Rückwand").
	 *
	 * NEU mit dem Umbau: unter sonst gleichen Umständen wird eine Münze
	 * bevorzugt, die KEINE andere trägt. Zöge das Ventil eine Münze unter
	 * einem Stapel weg, schwebte der Rest für einen Zeitschritt und fiele
	 * dann – sichtbar, ohne dass etwas passiert wäre. Trägt jede Münze im
	 * Streifen eine andere, gilt weiterhin allein das Alter; das Ventil muss
	 * in jedem Fall Platz schaffen können.
	 *
	 * Ist der Streifen leer, wird die HINTERSTE Münze genommen – sonst könnte
	 * das Feld in einer seltenen Lage nie wieder Platz schaffen.
	 * Gleichstand wird über die kleinere Spaltennummer aufgelöst, damit das
	 * Ergebnis unter allen Umständen wiederholbar ist.
	 *
	 * @returns {boolean} true, wenn etwas entfernt wurde
	 */
	relieve() {
		const rearLimit = this.layout.fieldDepth - BACK_ZONE;

		// Wer trägt hier wen? FRISCH gerechnet, nicht aus support[]
		// abgelesen – und das ist ein echter Fund, kein Schönheitsfehler.
		//
		// support[] entsteht in settleHeights(), also INNERHALB eines
		// Zeitschritts. relieve() läuft aber aus throwCoin() heraus, also
		// ZWISCHEN zwei Schritten, und support[] gehört nicht zum
		// Speicherstand (es ist ein abgeleiteter Wert und wird in jedem
		// Schritt neu gerechnet). Ein wiederhergestelltes Feld hat es
		// deshalb NICHT – und ein Einwurf unmittelbar nach dem
		// Wiederherstellen traf damit eine andere Auswahl als derselbe
		// Einwurf im durchlaufenden Feld. Genau das hat F-12 gemessen:
		// derselbe Stand, fortgesetzt, lief auseinander. Nach dieser
		// Änderung liest der ganze Physikkern über Schrittgrenzen hinweg nur
		// noch Zustand, der auch gespeichert wird.
		//
		// Die Regel ist dieselbe wie in restHeight(): j trägt i, wenn i
		// exakt eine Münzdicke höher liegt und nahe genug ist. Sie kostet
		// hier O(Bestand²) statt O(Bestand) – bei höchstens 200 Münzen sind
		// das 40.000 Vergleiche, und relieve() läuft nur bei einem Einwurf
		// auf ein volles Feld, nicht in jedem Zeitschritt.
		const carries = new Uint8Array(this.count);
		for (let i = 0; i < this.count; i++) {
			for (let j = 0; j < this.count; j++) {
				if (j === i) { continue; }
				if (this.z[i] !== this.z[j] + COIN_THICKNESS) { continue; }
				const dx = this.x[j] - this.x[i];
				const dy = this.y[j] - this.y[i];
				const reach = SUPPORT_REACH * (this.r[i] + this.r[j]);
				if (dx * dx + dy * dy < reach * reach) { carries[j] = 1; break; }
			}
		}

		let pick = -1;
		for (let pass = 0; pass < 2 && pick === -1; pass++) {
			for (let i = 0; i < this.count; i++) {
				if (this.y[i] < rearLimit) { continue; }
				if (pass === 0 && carries[i] === 1) { continue; }
				if (pick === -1 || this.born[i] < this.born[pick]) { pick = i; }
			}
		}
		if (pick === -1) {
			for (let i = 0; i < this.count; i++) {
				if (pick === -1 || this.y[i] > this.y[pick]
					|| (this.y[i] === this.y[pick] && this.born[i] < this.born[pick])) { pick = i; }
			}
		}
		if (pick === -1) { return false; }
		this.valveValue += this.value[pick];
		this.valveCount++;
		this.remove(pick);
		return true;
	}

	/**
	 * Nimmt Spalte i heraus, indem die letzte Spalte an ihre Stelle rückt.
	 * Das ändert die Reihenfolge – aber immer auf dieselbe Weise, und darauf
	 * kommt es an. Ein Loch im Feld zu lassen wäre langsamer und beim
	 * Speichern umständlicher.
	 */
	remove(i) {
		// area wird nicht mehr mitgeführt, siehe get area() – sie ergibt sich
		// automatisch aus der neuen Stückzahl beim nächsten Zugriff.
		const last = this.count - 1;
		if (i !== last) {
			this.x[i] = this.x[last];
			this.y[i] = this.y[last];
			this.z[i] = this.z[last];
			this.vx[i] = this.vx[last];
			this.vy[i] = this.vy[last];
			this.vz[i] = this.vz[last];
			this.r[i] = this.r[last];
			this.value[i] = this.value[last];
			this.born[i] = this.born[last];
		}
		this.count--;
		// restZ und support werden NICHT mitkopiert: beide werden im
		// nächsten settleHeights() vollständig neu berechnet. Eine
		// mitkopierte, sofort überschriebene Zahl wäre eine Einladung, sich
		// auf sie zu verlassen.
	}

	/**
	 * @returns {number} Lage der VORDERWAND des Blocks. Sie schwingt zwischen
	 *          LOWER_DEPTH (hinterste Lage – die untere Ebene ist am tiefsten)
	 *          und LOWER_DEPTH - PLATE_STROKE (vorderste Lage). Dahinter
	 *          beginnt die obere Ebene, davor liegt die untere.
	 */
	plateY() {
		const layout = this.layout;
		const t = (this.stepCount % PLATE_PERIOD_STEPS) / PLATE_PERIOD_STEPS;
		const u = t < 0.5 ? 2 * t : 2 - 2 * t;     // Dreieckswelle, 0 … 1 … 0
		return layout.lowerDepth - layout.plateStroke * u;
	}

	/** @returns {number} Geschwindigkeit des Blocks; negativ, während er vorschiebt. */
	plateVelocity() {
		const half = PLATE_PERIOD_STEPS / 2;
		const speed = (2 * this.layout.plateStroke) / (PLATE_PERIOD_STEPS * DT);
		return (this.stepCount % PLATE_PERIOD_STEPS) < half ? -speed : speed;
	}

	/**
	 * Wirft eine Münze ein. DAS IST DIE EINZIGE STELLE, an der gewürfelt wird,
	 * und die einzige, die den Zufallsgeber anfasst.
	 *
	 * Der Stift-Slalom (B.9.2) ist unverändert als Galtonbrett gerechnet: die
	 * Münze fällt durch PIN_ROWS Stiftreihen und wird in jeder Reihe um
	 * PIN_STEP/2 nach links oder rechts abgelenkt. Die neun Entscheidungen
	 * kommen aus den neun untersten Bits EINER gezogenen Zahl – ein Zug je
	 * Einwurf, nicht neun.
	 *
	 * DIE MÜNZE LANDET AUF DER OBEREN EBENE. Der Schlitz ist fest (B.9.2:
	 * „Ein fester Einwurfschlitz"); sie fällt aus ENTRY_HEIGHT über dem Deck
	 * herunter und setzt dort auf, wo settleHeights() ihr Auflager findet –
	 * auf dem Deck oder auf dem Haufen, der schon dort liegt.
	 *
	 * WARUM DER ZEITPUNKT TROTZ FESTEM SCHLITZ DIE EINZIGE STEUERUNG BLEIBT:
	 * das Deck fährt unter dem Schlitz durch. Wer einwirft, während das Deck
	 * weit hinten steht, setzt seine Münze auf ein Deck, das noch fast seinen
	 * ganzen Hub vor sich hat – sie hat mehr Deck zwischen sich und der
	 * Abwurfkante als eine Münze, die bei vorgefahrenem Deck einschlägt, und
	 * braucht entsprechend mehr Umläufe. Eine seitlich verschiebbare Rinne
	 * gehört zu einer anderen Gerätefamilie und wird nicht gebaut.
	 *
	 * @param {number} value einer der Werte aus COIN_VALUES
	 * @returns {boolean} false, wenn value unbekannt ist
	 */
	throwCoin(value) {
		const index = COIN_VALUES.indexOf(value);
		if (index === -1) { return false; }
		const radius = COIN_RADIUS[index];
		const fieldWidth = this.layout.fieldWidth;

		const bits = this.random();
		let offset = 0;
		let last = 0;
		for (let row = 0; row < PIN_ROWS; row++) {
			last = ((bits >>> row) & 1) === 1 ? 1 : -1;
			offset += last * (PIN_STEP / 2);
		}

		// Der Feldboden trägt bis zu seiner eigenen Kante, und die liegt beim
		// Einwurfschlitz wegen des Trichters weiter innen als vorn. Die
		// Schächte liegen außerhalb davon und gibt es auf der oberen Ebene
		// ohnehin nicht; eine neu geworfene Münze landet deshalb einfach auf
		// dem Deck, ohne Rücksicht auf CHUTE_WIDTH.
		const edge = WALL_TAPER * ENTRY_Y;
		const minX = edge + radius;
		const maxX = fieldWidth - edge - radius;
		let x = SLOT_X + offset;
		if (x < minX) { x = minX; }
		if (x > maxX) { x = maxX; }

		const i = this.count;
		this.x[i] = x;
		this.y[i] = ENTRY_Y;
		this.z[i] = this.layout.deckHeight + ENTRY_HEIGHT;
		this.vx[i] = last * ENTRY_SIDE;
		this.vy[i] = -ENTRY_SPEED;
		this.vz[i] = 0;
		this.r[i] = radius;
		this.value[i] = value;
		this.born[i] = this.spawnCount;
		this.count++;
		// area wird nicht mehr mitgeführt, siehe get area().
		this.spawnCount++;
		this.thrownValue += value;

		while (this.needsRelief()) {
			if (!this.relieve()) { break; }
		}
		return true;
	}

	/**
	 * EIN fester Zeitschritt von DT Sekunden.
	 *
	 * Wie viele Schritte je Bild laufen, entscheidet ausdrücklich der
	 * AUFRUFER – im Browser SUBSTEPS Schritte je Bild über einen Sammler,
	 * im Nachweisskript eine abgezählte Menge. Nur so ist der Ablauf im
	 * Browser und in Node derselbe. Stünde die Bildschleife hier drin, hinge
	 * das Ergebnis an der Uhr, und der Nachweis wäre wertlos.
	 *
	 * DIE REIHENFOLGE IST NICHT BELIEBIG:
	 *   – buildGrid() vor settleHeights(): die Auflagersuche benutzt dasselbe
	 *     Gitter wie die Stoßauflösung. settleHeights() ändert nur z, nie x
	 *     oder y – das Gitter bleibt danach gültig.
	 *   – settleHeights() VOR solveContacts(): erst danach steht fest, welche
	 *     Höhenbereiche einander überlappen und damit, welche Paare sich
	 *     überhaupt abstoßen.
	 *   – applySurfaces() NACH der Stoßauflösung: die Reibung greift an der
	 *     Geschwindigkeit an, die eine Münze nach allen Stößen dieses
	 *     Schritts wirklich hat. Andersherum bekäme ein Stoß das letzte
	 *     Wort über eine Reibung, die ihn gar nicht kennt.
	 *   – applyRails() VOR applyPlate(): die Leisten stehen immer vor der
	 *     vordersten Lage der Vorderwand (F-1 prüft das), die beiden können
	 *     einander also gar nicht in die Quere kommen. Trotzdem hat der
	 *     Block das letzte Wort – er ist das stärkere Teil.
	 *   – applyWalls() ZULETZT vor dem Abräumen: eine Wand gewinnt gegen
	 *     alles. collect() darf sich darauf verlassen, dass alles, was
	 *     danach noch außerhalb liegt, wirklich gefallen ist.
	 */
	step() {
		this.integrate();       // 1. Bewegen (x, y, z) – ohne Dämpfung
		this.buildGrid();       // 2. Gitter neu füllen (Zählsortierung)
		this.settleHeights();   // 3. Auflager, Schwerkraft, Aufsetzen, Ebenenwechsel
		for (let k = 0; k < SOLVER_ITERATIONS; k++) {
			this.solveContacts();   // 4. waagerechte Stöße, nur bei Höhenüberlappung
		}
		this.applySurfaces();   // 5. Hangabtrieb, Coulomb-Reibung, feste Rückwand
		this.applyRails();      // 6. schräge Ablenkleisten der unteren Ebene
		this.applyPlate();      // 7. Vorderwand des Blocks schiebt die untere Ebene
		this.applyWalls();      // 8. Seitenwand mit Trichter, Ausschnitt vorn
		this.collect();         // 9. Abwurfkante und Bodenkante abräumen
		this.stepCount++;       // 10. Uhr weiterstellen (ganzzahlig!)
	}

	/**
	 * 1. Ort fortschreiben. Sonst nichts.
	 *
	 * KEINE Dämpfung mehr, und das ist der halbe Umbau. Bis zur ersten
	 * Auslegung standen hier zwei Zeilen, die JEDE Münze in JEDEM Schritt um
	 * 2,5 % ihrer waagerechten Geschwindigkeit erleichterten, samt einer
	 * Schwelle, unter der sie hart auf null gesetzt wurde. Beides war eine
	 * Reibung ohne Unterlage:
	 *   – Sie bremste auch eine Münze, die gerade FÄLLT und nichts berührt.
	 *     F-19 hat genau das gemessen und gemeldet.
	 *   – Sie hätte den Hangabtrieb überdeckt, der um Größenordnungen
	 *     kleiner ist als sie.
	 *   – Sie war in beiden Fahrtrichtungen gleich und konnte deshalb den
	 *     Nettovorschub nicht erzeugen, um den es bei diesem Gerät geht.
	 * Die Reibung sitzt jetzt dort, wo sie hingehört: in applySurfaces(),
	 * gegen die Unterlage, mit Haft- und Gleitfall.
	 *
	 * vz bleibt ebenfalls ungebremst: Luftwiderstand auf sechs Einheiten
	 * Fallhöhe ist keine sichtbare Größe. Die Fallgeschwindigkeit wird in
	 * settleHeights() beim Aufsetzen hart auf null gesetzt.
	 */
	integrate() {
		for (let i = 0; i < this.count; i++) {
			this.x[i] += this.vx[i] * DT;
			this.y[i] += this.vy[i] * DT;
			this.z[i] += this.vz[i] * DT;
		}
	}

	/**
	 * 2. Zählsortierung ins Gitter (B.9.3: „ein Gitter als Vorauswahl").
	 *
	 * Erst zählen, wie viele Münzen je Zelle anfallen, daraus die Anfänge
	 * aufsummieren, dann in einem zweiten Durchgang einsortieren. Dabei
	 * landen die Münzen INNERHALB einer Zelle in aufsteigender
	 * Spaltennummer – das ist die Grundlage dafür, dass die Stoßauflösung
	 * jedes Mal dieselbe Reihenfolge sieht.
	 *
	 * Der Einsortier-Durchgang braucht je Zelle einen eigenen, mitlaufenden
	 * Schreibzeiger; dafür dient this.cellCursor mit cols * rows Ganzzahlen,
	 * also ceil(FIELD_WIDTH / CELL_SIZE) * ceil(FIELD_DEPTH / CELL_SIZE). Die
	 * beiden Zahlen leitet der Konstruktor selbst ab, und dieser Kommentar
	 * schreibt sie ausdrücklich NICHT aus: die ausgeschriebenen Zahlen an
	 * dieser Stelle waren nach der dritten Auslegung falsch stehen geblieben
	 * (Befund N4 der Prüfung vom Phase-10-Lauf), und derselbe Fehler soll
	 * nach der vierten Auslegung nicht wiederkehren. Die Spalte wird EINMAL
	 * im Konstruktor angelegt und hier nur zurückgesetzt. cellStart selbst
	 * bleibt unverändert stehen, denn genau diese Grenzen liest
	 * solveContacts() im Anschluss.
	 */
	buildGrid() {
		const cellCount = this.cols * this.rows;

		this.cellStart.fill(0);
		for (let i = 0; i < this.count; i++) {
			let col = Math.floor(this.x[i] / CELL_SIZE);
			let row = Math.floor(this.y[i] / CELL_SIZE);
			if (col < 0) { col = 0; } else if (col >= this.cols) { col = this.cols - 1; }
			if (row < 0) { row = 0; } else if (row >= this.rows) { row = this.rows - 1; }
			const cell = row * this.cols + col;
			this.cellOf[i] = cell;
			this.cellStart[cell + 1]++;
		}
		for (let c = 0; c < cellCount; c++) {
			this.cellStart[c + 1] += this.cellStart[c];
		}

		const cursor = this.cellCursor;
		for (let c = 0; c < cellCount; c++) {
			cursor[c] = this.cellStart[c];
		}
		for (let i = 0; i < this.count; i++) {
			const cell = this.cellOf[i];
			this.cellItems[cursor[cell]] = i;
			cursor[cell]++;
		}
	}

	/**
	 * 3. Die Höhen: Auflager suchen, fallen lassen, aufsetzen.
	 *
	 * ZWEI DURCHGÄNGE, UND DAS IST WESENTLICH. Erst wird für JEDE Münze das
	 * Auflager aus dem laufenden Stand bestimmt, danach werden alle Höhen
	 * fortgeschrieben. Liefe beides in EINER Schleife, hinge das Ergebnis
	 * davon ab, in welcher Reihenfolge die Spalten stehen – und die
	 * Reihenfolge ändert sich bei jedem remove() (die letzte Spalte rückt
	 * nach). Der Ablauf bliebe zwar wiederholbar, aber die Physik hinge an
	 * einer Buchhaltungsentscheidung. Zwei Durchgänge kosten einen Zeiger und
	 * lösen das vollständig.
	 *
	 * Eine Münze über ihrem Auflager fällt: vz wird um GRAVITY * DT kleiner.
	 * Erreicht oder unterschreitet sie das Auflager, setzt sie hart auf
	 * (z = Auflager, vz = 0). KEIN Rückprall in der Höhe: eine flach fallende
	 * Münze springt nicht, und ein Rückprall machte jeden Stapel unruhig.
	 *
	 * BERICHTIGUNG (gemessen, nicht nur vermutet — F-18/F-19 aus
	 * verify-physics.mjs schlugen fehl, bevor diese Fassung stand). Die
	 * ursprüngliche Fassung prüfte `this.z[i] <= rest` ein zweites Mal
	 * UNMITTELBAR NACHDEM vz verringert wurde, aber OHNE z selbst
	 * zwischenzeitlich zu verändern — dieser innere Zweig war damit toter
	 * Code, der nie auslösen konnte (z blieb identisch zum äußeren
	 * `z[i] > rest`, das ihn erst betreten hatte). Die Landung geschah
	 * dadurch immer erst einen Schritt SPÄTER über den `else`-Zweig, wenn
	 * `integrate()` z bereits unter `rest` gedrückt hatte — bis dahin war
	 * `dropCount` nie erhöht worden (F-19), UNSCHÄDLICH für sich allein.
	 * Der eigentliche Fund war schwerer: restHeight() verwirft in genau
	 * diesem einen, ÜBERSCHOSSENEN Schritt ihr eigenes Auflager wieder (die
	 * Bedingung „top > zi" schlägt an, weil zi durch den Überschuss schon
	 * knapp UNTER die Oberkante der tragenden Münze gerutscht war) und
	 * liefert dann `rest = 0` (den Boden) statt der eigentlich richtigen
	 * Stapelhöhe – die Münze fiel danach ungebremst bis zum Boden durch,
	 * statt auf der anderen liegen zu bleiben (F-18: „z=0, erwartet 1,6").
	 * Die Berichtigung besteht aus zwei Teilen, beide unten:
	 *   1. Diese Methode klemmt jetzt in GENAU EINEM Zweig (dem `else`), der
	 *      auch tatsächlich erreicht wird — der tote innere Zweig entfällt.
	 *   2. restHeight() bekommt eine Toleranz gegen genau dieses
	 *      Überschießen (siehe dort), begründet mit demselben Maß, das F-1
	 *      bereits als Obergrenze des freien Falls je Schritt nachweist.
	 * Nachgewiesen (Zahlen vom Fund): SOLVER_ITERATIONS blieb unverändert
	 * bei dieser Berichtigung unbeteiligt — der Fund betraf ausschließlich
	 * diese Methode und restHeight(), keine Stoßauflösung.
	 *
	 * ZWEITE BERICHTIGUNG, ebenfalls gemessen (Kennzahl „Ebenenwechsel je
	 * 1.000 Einwürfe": 0,0 im Referenzlauf, obwohl im Browser sichtbar
	 * Münzen herunterfielen). Der Ebenenwechsel hing an einem Merker
	 * wasAtOrAboveDeck[i], der am ENDE JEDES Schritts aus der aktuellen Höhe
	 * neu gesetzt wurde. Ein Absturz dauert bei DECK_HEIGHT = 6,4 und
	 * GRAVITY = 208 rund sechzig Zeitschritte; schon nach dem ERSTEN davon
	 * stand der Merker auf 0, und beim Aufsetzen war die Bedingung „lag
	 * vorher oben" nie mehr erfüllt. Der Zähler konnte deshalb GAR NICHT
	 * auslösen – nicht selten, sondern nie.
	 *
	 * Der Merker entfällt ersatzlos. Gezählt wird jetzt der AUFLAGERWECHSEL,
	 * und zwar in genau dem Schritt, in dem er stattfindet: eine Münze, die
	 * unmittelbar auf der oberen Ebene liegt (z ist exakt die Deckhöhe),
	 * bekommt ein Auflager unterhalb der Deckhöhe. Das ist der Augenblick,
	 * in dem die Vorderkante unter ihr wegfährt. Es passiert je Absturz
	 * genau einmal, denn danach liegt sie tiefer.
	 *
	 * Zwei Nebenwirkungen, beide bewusst hingenommen:
	 *   – Eine Münze, die auf einem VIER Lagen hohen Stapel der UNTEREN
	 *     Ebene liegt, liegt zufällig auch genau auf Deckhöhe. Bricht der
	 *     Stapel unter ihr weg, wird das mitgezählt. Das ist eine
	 *     Überzählung, keine Unterzählung – Q-10 (dropCount >= wonCount)
	 *     bleibt dadurch eine gültige, nur etwas großzügigere Schranke.
	 *   – Der Merker war nicht Teil des Speicherstands, wurde aber über
	 *     Schrittgrenzen hinweg gelesen. Mit seinem Wegfall liest der
	 *     Zeitschritt nur noch Zustand, der auch gespeichert wird – siehe
	 *     die Begründung bei relieve() und F-12.
	 *
	 * @returns {void}
	 */
	settleHeights() {
		const plate = this.plateY();
		for (let i = 0; i < this.count; i++) {
			this.restZ[i] = this.restHeight(i, plate);
		}
		const deckHeight = this.layout.deckHeight;
		for (let i = 0; i < this.count; i++) {
			const rest = this.restZ[i];
			// Der Ebenenwechsel: die Münze lag unmittelbar auf der oberen
			// Ebene und hat ihr Auflager an die untere verloren.
			if (this.z[i] === deckHeight && rest < deckHeight) { this.dropCount++; }
			if (this.z[i] > rest) {
				this.vz[i] -= GRAVITY * DT;
			} else {
				this.z[i] = rest;
				this.vz[i] = 0;
			}
		}
	}

	/**
	 * Auf welcher Höhe liegt Münze i auf?
	 *
	 * Zwei Auflager kommen in Frage, und es gewinnt das HÖHERE:
	 *
	 *   a) Die Ebene unter ihr. Über der oberen Ebene (y >= plateY) ist das
	 *      die Oberseite des Blocks, DECK_HEIGHT; davor der feste Boden der
	 *      unteren Ebene, 0. Das ist zugleich die ganze Absturzmechanik:
	 *      sobald der MITTELPUNKT einer Münze vor die Vorderkante der oberen
	 *      Ebene gerät, sinkt ihr Auflager von DECK_HEIGHT auf 0, und sie
	 *      fällt – mit ihrer waagerechten Geschwindigkeit, denn die rührt
	 *      niemand an.
	 *
	 *   b) Die höchste Münze darunter, die sie tragen kann. Tragen kann eine
	 *      Münze j die Münze i, wenn ihre Oberkante NICHT über i liegt
	 *      (sonst stünde i in ihr drin – dann stoßen sich beide ab, siehe
	 *      resolvePair()) und wenn i ihr nahe genug ist: Abstand der
	 *      Mittelpunkte kleiner als SUPPORT_REACH mal Radiensumme. Weiter
	 *      draußen rutscht i ab, bekommt kein Auflager, fällt tiefer – und
	 *      sobald sich die Höhenbereiche dabei überlappen, drückt der
	 *      Stoßlöser die beiden auseinander. Genau so verhält sich ein
	 *      echter Münzhaufen.
	 *
	 * Die Suche läuft über ALLE NEUN Zellen der Nachbarschaft, nicht über
	 * vier wie in solveContacts(): „liegt auf" ist keine symmetrische
	 * Beziehung, jede Münze muss ihre eigene Unterlage selbst finden.
	 *
	 * ZUR GLEICHHEIT top > zi: eine Münze, die auf j liegt, hat
	 * z[i] = z[j] + COIN_THICKNESS, also exakt top === zi. Der Vergleich
	 * top > zi ist damit falsch, und die Münze bleibt getragen. Die
	 * Gleichheit ist EXAKT und nicht bloß beinahe, weil settleHeights()
	 * denselben Ausdruck zuweist, der hier verglichen wird – dieselben Bits,
	 * dieselbe Rechnung.
	 *
	 * BERICHTIGUNG, MIT MESSUNG BELEGT (F-18 aus verify-physics.mjs schlug
	 * ohne sie fehl: eine Münze, die zwölf Einheiten über ihrer künftigen
	 * Auflage losgelassen wurde, landete bei z=0 statt bei der erwarteten
	 * Münzdicke). Der ungeprüfte Vergleich top > zi verwirft sein eigenes
	 * Auflager GENAU in dem Zeitschritt, in dem eine fallende Münze es
	 * erreicht: `integrate()` hat zi in diesem Schritt bereits um bis zu
	 * `Math.abs(this.vz[i]) * DT` weiter nach unten verschoben, ehe
	 * restHeight() läuft – am Ende eines langen Falls reißt dieser eine
	 * Schritt zi leicht UNTER die Oberkante der tragenden Münze, „top > zi"
	 * schlägt an, das Auflager gilt als verloren, rest fällt auf den Boden
	 * zurück, und die Münze fällt ungebremst durch. GRENZE dieses
	 * Überschusses ist bereits ein an anderer Stelle geprüftes Maß (F-1:
	 * „selbst der freie Fall aus der größten zulässigen Höhe legt je
	 * Zeitschritt weniger als einen halben kleinsten Halbmesser zurück"),
	 * hier als `Math.abs(this.vz[i]) * DT` wiederverwendet statt neu
	 * erfunden. Das ist KEINE Toleranz gegen Einsinken zweier ruhender
	 * Münzen ineinander: eine Münze, deren vz nicht negativ ist (liegt
	 * bereits, fällt nicht), bekommt tolerance = 0 und damit exakt die
	 * ursprüngliche, strenge Prüfung zurück – die „Gegenprobe" in F-18 (zwei
	 * Münzen auf derselben Höhe stoßen sich ab) bleibt davon unberührt,
	 * weil beide dort mit vz = 0 stillstehen.
	 *
	 * @param {number} i
	 * @param {number} plate Lage der Vorderwand in diesem Schritt
	 * @returns {number}
	 */
	restHeight(i, plate) {
		let rest = this.y[i] >= plate ? this.layout.deckHeight : 0;
		this.support[i] = -1;

		const zi = this.z[i];
		const xi = this.x[i];
		const yi = this.y[i];
		const ri = this.r[i];
		// Nur für eine FALLENDE Münze (vz < 0) überhaupt von 0 verschieden –
		// Begründung oben im Methodenkommentar.
		const fallTolerance = this.vz[i] < 0 ? -this.vz[i] * DT : 0;

		let col = Math.floor(xi / CELL_SIZE);
		let row = Math.floor(yi / CELL_SIZE);
		if (col < 0) { col = 0; } else if (col >= this.cols) { col = this.cols - 1; }
		if (row < 0) { row = 0; } else if (row >= this.rows) { row = this.rows - 1; }

		for (let dr = -1; dr <= 1; dr++) {
			const nRow = row + dr;
			if (nRow < 0 || nRow >= this.rows) { continue; }
			for (let dc = -1; dc <= 1; dc++) {
				const nCol = col + dc;
				if (nCol < 0 || nCol >= this.cols) { continue; }
				const cell = nRow * this.cols + nCol;
				const end = this.cellStart[cell + 1];
				for (let a = this.cellStart[cell]; a < end; a++) {
					const j = this.cellItems[a];
					if (j === i) { continue; }
					const top = this.z[j] + COIN_THICKNESS;
					// Liegt j zu hoch, um zu tragen? Dann überlappen sich die
					// Höhenbereiche, und resolvePair() ist zuständig, nicht wir.
					if (top > zi + fallTolerance) { continue; }
					// Tiefer als das schon gefundene Auflager? Uninteressant.
					if (top <= rest) { continue; }
					const dx = this.x[j] - xi;
					const dy = this.y[j] - yi;
					const reach = SUPPORT_REACH * (ri + this.r[j]);
					if (dx * dx + dy * dy >= reach * reach) { continue; }
					rest = top;
					this.support[i] = j;
				}
			}
		}
		return rest;
	}

	/**
	 * 4. Stoßauflösung für Kreise (Anhang E: „Rückprall und Reibung").
	 *
	 * Jedes Paar genau einmal: für jede Münze die Münzen mit größerer
	 * Spaltennummer in derselben Zelle, dazu die vier Nachbarzellen
	 * rechts / unten-links / unten / unten-rechts. Die anderen vier
	 * Nachbarn haben das Paar schon von ihrer Seite aus gesehen.
	 */
	solveContacts() {
		for (let cellRow = 0; cellRow < this.rows; cellRow++) {
			for (let cellCol = 0; cellCol < this.cols; cellCol++) {
				const cell = cellRow * this.cols + cellCol;
				const start = this.cellStart[cell];
				const end = this.cellStart[cell + 1];

				for (let a = start; a < end; a++) {
					const i = this.cellItems[a];
					for (let b = a + 1; b < end; b++) {
						this.resolvePair(i, this.cellItems[b]);
					}
				}

				const neighbours = [
					[cellCol + 1, cellRow],       // rechts
					[cellCol - 1, cellRow + 1],   // unten-links
					[cellCol, cellRow + 1],       // unten
					[cellCol + 1, cellRow + 1],   // unten-rechts
				];
				for (let n = 0; n < neighbours.length; n++) {
					const nCol = neighbours[n][0];
					const nRow = neighbours[n][1];
					if (nCol < 0 || nCol >= this.cols || nRow < 0 || nRow >= this.rows) { continue; }
					const nCell = nRow * this.cols + nCol;
					const nStart = this.cellStart[nCell];
					const nEnd = this.cellStart[nCell + 1];
					for (let a = start; a < end; a++) {
						const i = this.cellItems[a];
						for (let b = nStart; b < nEnd; b++) {
							this.resolvePair(i, this.cellItems[b]);
						}
					}
				}
			}
		}
	}

	/**
	 * Löst genau EIN Münzpaar auf: trennen, Stoß, Reibung.
	 *
	 * Es kommen ausschließlich +, -, *, /, Math.sqrt, Math.abs, Math.min
	 * und Vergleiche vor. Keine Winkelfunktion, keine Potenzfunktion, keine
	 * Wurzel-aus-Quadratsumme-Funktion – nur diese Rechenarten sind in der
	 * Sprachnorm exakt festgelegt und liefern auf jeder Maschine dasselbe
	 * letzte Bit.
	 *
	 * @param {number} i
	 * @param {number} j
	 */
	resolvePair(i, j) {
		// DIE HÖHENPRÜFUNG STEHT GANZ VORN, und sie ist der ganze Unterschied
		// zwischen dem flachen Modell und diesem: zwei Münzen, deren
		// Höhenbereiche [z, z + COIN_THICKNESS) einander NICHT überlappen,
		// liegen ÜBEREINANDER statt nebeneinander. Sie stoßen sich nicht ab –
		// sonst gäbe es keinen einzigen Stapel, sondern nur ein flaches Feld
		// mit einer zusätzlichen, wirkungslosen Zahl je Münze.
		if (this.z[i] + COIN_THICKNESS <= this.z[j]) { return; }
		if (this.z[j] + COIN_THICKNESS <= this.z[i]) { return; }

		const dx = this.x[j] - this.x[i];
		const dy = this.y[j] - this.y[i];
		const d2 = dx * dx + dy * dy;
		const sum = this.r[i] + this.r[j];
		if (d2 >= sum * sum) { return; }

		let d, nx, ny;
		if (d2 === 0) {
			// Exakt deckungsgleich: FESTE Ausweichrichtung, kein Zufall,
			// sonst wäre der Lauf nicht wiederholbar.
			d = 0;
			nx = 1;
			ny = 0;
		} else {
			d = Math.sqrt(d2);
			nx = dx / d;
			ny = dy / d;
		}

		// Massen: invMass = 1/(r*r). Eine Scheibe gleicher Dicke wiegt nach
		// Fläche; der gemeinsame Faktor Pi kürzt sich in jeder Formel heraus
		// und wird deshalb weggelassen.
		const invI = 1 / (this.r[i] * this.r[i]);
		const invJ = 1 / (this.r[j] * this.r[j]);
		const invSum = invI + invJ;

		// a) Trennen.
		const overlap = sum - d;
		const push = Math.min(overlap * CORRECTION, MAX_CORRECTION);
		const pushI = push * (invI / invSum);
		const pushJ = push * (invJ / invSum);
		this.x[i] -= nx * pushI;
		this.y[i] -= ny * pushI;
		this.x[j] += nx * pushJ;
		this.y[j] += ny * pushJ;

		// b) Stoß – nur wenn die beiden Münzen aufeinander zulaufen.
		const rvx = this.vx[j] - this.vx[i];
		const rvy = this.vy[j] - this.vy[i];
		const vn = rvx * nx + rvy * ny;
		if (vn >= 0) { return; }

		const jn = -(1 + RESTITUTION) * vn / invSum;
		this.vx[i] -= nx * jn * invI;
		this.vy[i] -= ny * jn * invI;
		this.vx[j] += nx * jn * invJ;
		this.vy[j] += ny * jn * invJ;

		// c) Reibung quer zur Stoßrichtung, auf FRICTION * |jn| begrenzt.
		const tx = -ny;
		const ty = nx;
		const rtx = this.vx[j] - this.vx[i];
		const rty = this.vy[j] - this.vy[i];
		const vt = rtx * tx + rty * ty;
		let jt = -vt / invSum;
		const maxJt = FRICTION * Math.abs(jn);
		if (jt > maxJt) { jt = maxJt; }
		if (jt < -maxJt) { jt = -maxJt; }
		this.vx[i] -= tx * jt * invI;
		this.vy[i] -= ty * jt * invI;
		this.vx[j] += tx * jt * invJ;
		this.vy[j] += ty * jt * invJ;
	}

	/**
	 * 5. Die Unterlagen: Hangabtrieb, Coulomb-Reibung, feste Rückwand.
	 *
	 * DAS IST DIE METHODE, IN DER DER MÜNZSCHIEBER SCHIEBT. Sie ist die
	 * Antwort auf den Befund, dass der Haufen nur pendelte; die ausführliche
	 * Herleitung steht im Kopfkommentar unter „WARUM DER HAUFEN NACH VORN
	 * WANDERT".
	 *
	 * Drei Schritte je Münze, und die Reihenfolge ist nicht beliebig:
	 *
	 *   a) NUR WER AUFLIEGT. Eine Münze in der Luft hat keine Unterlage,
	 *      bekommt also weder Reibung noch Hangabtrieb – sie fällt frei, und
	 *      ihre waagerechte Geschwindigkeit bleibt unangetastet (F-19).
	 *      z === restZ ist dabei EXAKT und braucht keine Toleranz, weil
	 *      settleHeights() denselben Wert zugewiesen hat, der hier
	 *      verglichen wird.
	 *
	 *   b) HANGABTRIEB ZUERST, REIBUNG DANACH. Der Boden ist nach vorn
	 *      geneigt; die Neigung zieht mit SLOPE_STEP je Zeitschritt an jeder
	 *      aufliegenden Münze. Erst danach greift die Reibung. Diese
	 *      Reihenfolge ist der ganze Grund, warum eine RUHENDE Münze exakt
	 *      liegen bleibt: der Hangabtrieb macht sie um SLOPE_STEP schneller,
	 *      die Reibung darf bis zu ihrem Höchstbetrag angleichen, und weil
	 *      dieser Höchstbetrag größer ist als SLOPE_STEP (F-1 prüft die
	 *      Ungleichung µ > sin), hebt sie ihn vollständig auf – auf das
	 *      letzte Bit, denn (v − s) + s ist bei gleichem s exakt v.
	 *      Andersherum gerechnet bliebe je Schritt ein Rest stehen, und der
	 *      ganze Haufen kröche von selbst aus dem Gerät. F-25 misst das.
	 *
	 *   c) DIE REIBUNG IST EIN VEKTOR, KEINE ZWEI ZAHLEN. Coulomb-Reibung
	 *      wirkt entgegen der Relativbewegung, gleich in welche Richtung sie
	 *      zeigt; ihr Betrag ist begrenzt, nicht ihre einzelnen Anteile.
	 *      Würde man die Grenze je Achse einzeln anlegen, könnte eine schräg
	 *      gleitende Münze das 1,41-fache der zulässigen Reibung bekommen –
	 *      und der Betrag hinge davon ab, wie das Feld gedreht im Raum
	 *      liegt. Deshalb: Wunschänderung ausrechnen, ihren Betrag messen,
	 *      und nur wenn er die Grenze übersteigt, auf sie kürzen.
	 *
	 * WORAUF EINE MÜNZE LIEGT, entscheidet support[i] aus settleHeights():
	 * −1 heißt „unmittelbar auf einer Ebene" – auf dem fahrenden Deck, wenn
	 * sie hinter der Vorderwand liegt, sonst auf dem festen Feldboden. Sonst
	 * liegt sie auf der Münze mit dieser Spaltennummer und folgt DEREN
	 * Geschwindigkeit, mit der kleineren Reibungszahl für Metall auf Metall.
	 *
	 * DIE FESTE RÜCKWAND steht bei y = FIELD_DEPTH und bewegt sich nie. Sie
	 * hält nur auf, sie schiebt nicht. Sie ist nach dem Umbau NICHT mehr die
	 * Quelle des Vorschubs, sondern nur noch das, was den Haufen davon
	 * abhält, hinten aus dem Gerät zu laufen.
	 *
	 * @returns {void}
	 */
	applySurfaces() {
		const fieldDepth = this.layout.fieldDepth;
		const plate = this.plateY();
		const pv = this.plateVelocity();

		for (let i = 0; i < this.count; i++) {
			const onTop = this.y[i] >= plate;

			if (this.z[i] === this.restZ[i]) {
				// b) Hangabtrieb: immer nach vorn, also zu kleinerem y.
				this.vy[i] -= SLOPE_STEP;

				// Wessen Geschwindigkeit soll die Münze annehmen, und was
				// kann die Reibung dafür höchstens aufbringen?
				const s = this.support[i];
				let baseX = 0;
				let baseY = 0;
				let budget = DECK_FRICTION_STEP;
				if (s !== -1) {
					baseX = this.vx[s];
					baseY = this.vy[s];
					budget = STACK_FRICTION_STEP;
				} else if (onTop) {
					baseY = pv;          // das Deck fährt; baseX bleibt 0
				}
				// Sonst: der feste Feldboden der unteren Ebene, beide 0.

				// c) Coulomb-Reibung, auf den Betrag begrenzt.
				let dx = baseX - this.vx[i];
				let dy = baseY - this.vy[i];
				const d2 = dx * dx + dy * dy;
				if (d2 > budget * budget) {
					const scale = budget / Math.sqrt(d2);
					dx *= scale;
					dy *= scale;
				}
				this.vx[i] += dx;
				this.vy[i] += dy;
			}

			// Die feste Rückwand.
			if (onTop) {
				const limit = fieldDepth - this.r[i];
				if (this.y[i] > limit) {
					this.y[i] = limit;
					if (this.vy[i] > 0) { this.vy[i] = 0; }
				}
			}
		}
	}

	// Zur Zeile `if (d2 > budget * budget)`: kein Math.sqrt, solange nicht
	// gekürzt werden muss — das ist der häufige Fall (jede haftende Münze)
	// und spart die teuerste Rechenart in der heißesten Schleife des Geräts.

	/**
	 * 6. Die beiden schrägen Ablenkleisten der UNTEREN Ebene.
	 *
	 * WAS SIE SIND. Je Seite eine Leiste, die auf dem Feldboden steht. Ihr
	 * hinteres Ende liegt CHUTE_REACH Einheiten innen im Feld, bei der Tiefe
	 * DEFLECT_DEPTH; ihr vorderes Ende liegt an der Abwurfkante und
	 * CHUTE_WIDTH Einheiten AUSSERHALB der Bodenkante, also mitten im
	 * Verlustschacht. Wer außen an ihr anliegt und nach vorn geschoben wird,
	 * wird an ihr entlang nach außen geführt, bis sein Mittelpunkt die
	 * Bodenkante überschreitet – dann ist er verloren. Wer innen an ihr
	 * vorbeikommt, erreicht die Abwurfkante und ist gewonnen.
	 *
	 * WARUM ÜBERHAUPT. Ohne sie hinge der Verlust allein daran, ob eine
	 * Münze ihren Mittelpunkt über die Bodenkante bringt, und das entscheidet
	 * ihr Halbmesser gegen CHUTE_WIDTH – ein Schalter je Münzwert, kein
	 * Regler (Kopfkommentar, gemessen in tune-chute.mjs Stufe 0). Die Leiste
	 * versetzt dagegen jede Münze um denselben Weg, gleich wie groß sie ist.
	 *
	 * NUR AUF DER UNTEREN EBENE, und nur vor der vordersten Lage der
	 * Vorderwand (DEFLECT_DEPTH ist genau daraus abgeleitet, F-1 prüft es).
	 * Auf der oberen Ebene gibt es weder Schacht noch Leiste – dieselbe
	 * Begründung, aus der es dort auch keinen Verlustschacht gibt
	 * (applyWalls()).
	 *
	 * SIE IST EIN KAPSELHINDERNIS: eine Strecke mit der Dicke null, um die
	 * herum kein Münzmittelpunkt näher als seinen Halbmesser kommen darf.
	 * Das ist dieselbe Rechnung wie zwischen zwei Münzen, nur gegen eine
	 * Strecke statt gegen einen Punkt – deshalb steht sie auch hier und
	 * nicht in einer eigenen Datei. Am hinteren Ende der Leiste läuft sie
	 * von selbst rund aus, weil dort der nächste Punkt der Strecke ihr
	 * Endpunkt ist; eine Münze, die hinter der Leiste vorbeikommt, wird
	 * nicht gestoßen, sondern umrundet sie.
	 *
	 * @returns {void}
	 */
	applyRails() {
		const deckHeight = this.layout.deckHeight;
		const ay = this.layout.deflectDepth;      // hinteres Ende, innen
		const ax = this.chuteReach;
		const bx = -this.chuteWidth;              // vorderes Ende, außen
		const ex = ax - bx;                       // Richtung der Leiste, x
		const eLen2 = ex * ex + ay * ay;
		for (let i = 0; i < this.count; i++) {
			if (this.z[i] >= deckHeight) { continue; }
			if (this.y[i] > ay + this.r[i]) { continue; }
			this.pressRail(i, bx, ex, ay, eLen2, true);
			this.pressRail(i, bx, ex, ay, eLen2, false);
		}
	}

	/**
	 * Eine Leiste gegen eine Münze. Die rechte Leiste wird auf die linke
	 * GESPIEGELT gerechnet (u = fieldWidth − x) statt ein zweites Mal
	 * ausgeschrieben: zwei Ausschreibungen wären zwei Stellen, an denen
	 * jemand die Geometrie ändern könnte, und die Spiegelung ist exakt.
	 *
	 * @param {number} i
	 * @param {number} bx  x des vorderen Endes (negativ, außerhalb des Bodens)
	 * @param {number} ex  waagerechte Länge der Leiste
	 * @param {number} ay  Tiefe des hinteren Endes
	 * @param {number} eLen2 Quadrat der Leistenlänge
	 * @param {boolean} left  true = linke Leiste, false = rechte (gespiegelt)
	 * @returns {void}
	 */
	pressRail(i, bx, ex, ay, eLen2, left) {
		const fieldWidth = this.layout.fieldWidth;
		const u = left ? this.x[i] : fieldWidth - this.x[i];
		const vu = left ? this.vx[i] : -this.vx[i];
		const y = this.y[i];

		// Nächster Punkt auf der Strecke, in Anteilen ihrer Länge.
		let t = ((u - bx) * ex + y * ay) / eLen2;
		if (t < 0) { t = 0; } else if (t > 1) { t = 1; }
		const du = u - (bx + ex * t);
		const dy = y - ay * t;
		const d2 = du * du + dy * dy;
		const r = this.r[i];
		if (d2 >= r * r) { return; }

		let nu, ny, d;
		if (d2 === 0) {
			// Exakt auf der Leiste: FESTE Ausweichrichtung nach außen, kein
			// Zufall – sonst wäre der Lauf nicht wiederholbar.
			nu = -1; ny = 0; d = 0;
		} else {
			d = Math.sqrt(d2);
			nu = du / d;
			ny = dy / d;
		}

		const push = r - d;
		const newU = u + nu * push;
		this.y[i] = y + ny * push;

		// Die Geschwindigkeit IN die Leiste hinein wird abgebaut; die
		// entlang der Leiste bleibt – genau das macht aus dem Hindernis eine
		// Führung.
		let newVu = vu;
		const vn = vu * nu + this.vy[i] * ny;
		if (vn < 0) {
			newVu = vu - vn * nu;
			this.vy[i] = this.vy[i] - vn * ny;
		}

		this.x[i] = left ? newU : fieldWidth - newU;
		this.vx[i] = left ? newVu : -newVu;
	}

	/**
	 * 7. Die VORDERWAND des Blocks: sie schiebt die UNTERE Ebene, sie zieht
	 * nicht.
	 *
	 * Sie reicht vom Boden der unteren Ebene bis zur Deckhöhe. Eine Münze,
	 * die hinter sie geraten ist, wird davorgesetzt; schiebt der Block gerade
	 * vor, übernimmt die Münze seine Geschwindigkeit, wenn sie langsamer ist.
	 * Fährt er zurück, passiert nichts – die Münze bleibt liegen. Das ist
	 * genau das Verhalten eines echten Schiebers: der Teller fährt unter dem
	 * Haufen zurück.
	 *
	 * Wen sie NICHT anfasst: alles, was auf oder über der Deckhöhe liegt.
	 * Eine Münze auf der oberen Ebene liegt bei z = DECK_HEIGHT und wird von
	 * der Oberseite mitgenommen, nicht von der Vorderwand (applySurfaces()).
	 * Türmt sich der untere Haufen an einer Stelle über die Deckhöhe, gleitet
	 * die Wand darunter durch, statt den Turm zu schieben – dieselbe
	 * Vereinfachung wie überall in diesem Modell (kein Aufreiten beim
	 * Stauchen), und der Grund, warum DECK_HEIGHT mindestens drei Münzdicken
	 * beträgt: bis dahin schiebt die Wand.
	 *
	 * Die Vorderwand erreicht die Ablenkleisten nie – DEFLECT_DEPTH ist genau
	 * daraus abgeleitet.
	 *
	 * @returns {void}
	 */
	applyPlate() {
		const deckHeight = this.layout.deckHeight;
		const py = this.plateY();
		const pv = this.plateVelocity();
		for (let i = 0; i < this.count; i++) {
			if (this.z[i] >= deckHeight) { continue; }
			const limit = py - this.r[i];
			if (this.y[i] <= limit) { continue; }
			this.y[i] = limit;
			if (pv < 0 && this.vy[i] > pv) { this.vy[i] = pv; }
		}
	}

	/**
	 * 8. Die Seitenwand (B.9.4, Berichtigung: Wand hinten, Ausschnitt vorn).
	 * Sie schiebt nicht, sie hält nur auf – anders als die Vorderwand des
	 * Blocks.
	 *
	 * DER SCHACHT SITZT NUR AN DER UNTEREN EBENE. Auf der oberen gibt es
	 * keinen: dort steht die Seitenwand über die ganze Tiefe fest. Zwei
	 * Gründe, und beide sind zwingend.
	 *   1. Anhang E verlangt, dass die BREITE des Schachts ein einziger
	 *      benannter Wert an einer einzigen Stelle ist. Ein zweiter Schacht
	 *      auf der oberen Ebene bräuchte entweder eine zweite Breite – das
	 *      verbietet Anhang E – oder dieselbe Breite in einer völlig anderen
	 *      Geometrie, und dann wirkte eine Änderung an dieser einen Zahl an
	 *      zwei Stellen mit unterschiedlicher Stärke. Die Stellschraube wäre
	 *      unbrauchbar.
	 *   2. Genau daran sind die ersten beiden Bauarten gescheitert (Zahlen in
	 *      DECISIONS.md): CHUTE_WIDTH wirkt nur dann stetig, wenn eine Münze
	 *      dem Schacht kurz und an einer einzigen Stelle ausgesetzt ist. Zwei
	 *      Stellen brächten die Alles-oder-nichts-Stufe zurück.
	 * Am echten Gerät sitzt der Verlustschacht ohnehin neben der Auszahllippe
	 * der unteren Ebene, nicht neben der oberen.
	 *
	 * Der Schacht wirkt auf JEDE Münze im vorderen Bereich, auch auf eine,
	 * die dort auf einer anderen liegt: der Schacht ist ein Schlitz im Boden
	 * neben dem Feld, und eine Münze, die mit ihrem Mittelpunkt darüber
	 * gerät, verliert im selben Schritt ihr Auflager. Eine Sonderregel für
	 * gestapelte Münzen gäbe es am echten Gerät nicht.
	 *
	 * Über die ganze Tiefe steht die Wand grundsätzlich AN der Bodenkante
	 * (Spalt 0): eine Münze wird auf den Mittelpunkt geklemmt, den ihr
	 * Halbmesser erlaubt – r[i] links, fieldWidth - r[i] rechts –, bleibt
	 * also immer im Feld. NUR im vorderen Bereich (y < FRONT_ZONE_DEPTH)
	 * weicht die Wand um CHUTE_WIDTH zurück: r[i] - CHUTE_WIDTH links,
	 * fieldWidth + CHUTE_WIDTH - r[i] rechts. Ist CHUTE_WIDTH größer als
	 * der Halbmesser, liegt dieser zurückgewichene Mittelpunkt schon HINTER
	 * der Bodenkante – die Münze hat sie mit ihrem Mittelpunkt passiert und
	 * ist verloren; collect() liest das im nächsten Schritt an x < 0 bzw.
	 * x > fieldWidth ab.
	 *
	 * DER TRICHTER. Die Bodenkante liegt bei der Tiefe y nicht bei 0, sondern
	 * bei WALL_TAPER · y (rechts entsprechend spiegelbildlich). Vorn ist das
	 * Feld also am breitesten. Das ist Bauart aus dem Bild eines echten
	 * Spielfelds und hat einen mechanischen Zweck: eine Münze, die nach vorn
	 * geschoben wird, findet dort mehr Platz, und der Druck des Haufens
	 * verteilt sie nach außen – ohne den Trichter bliebe fast alles in der
	 * Mitte, wo es eingeworfen wurde.
	 *
	 * Geklemmt wird NUR in x, obwohl die Wand schräg steht. Bei 5,7 Grad hat
	 * die Wandnormale einen Tiefenanteil von einem Zehntel des seitlichen;
	 * ihn wegzulassen heißt, der Münze einen kleinen Rückstoß zu ersparen,
	 * den sie beim Anliegen bekäme. Das ist die VORSICHTIGE Richtung: es
	 * bremst den Vorschub nicht und lässt die Quote eher höher als tiefer
	 * ausfallen. Wo die Schräge wirklich steil ist – an den Ablenkleisten –
	 * wird dagegen sauber senkrecht zur Fläche geschoben (applyRails()).
	 *
	 * NEU ist außerdem, dass die Geschwindigkeit IN die Wand hinein auf null
	 * gesetzt wird. Vorher behielt eine anliegende Münze ihren seitlichen
	 * Drang und wurde in jedem Schritt erneut zurückgeklemmt; sie stand zwar
	 * still, drückte aber weiter. Mit der Coulomb-Reibung fällt das auf,
	 * weil eine solche Münze nie zur Ruhe käme.
	 */
	applyWalls() {
		const fieldWidth = this.layout.fieldWidth;
		for (let i = 0; i < this.count; i++) {
			const y = this.y[i];
			// Der Trichter: die Bodenkante rückt mit der Tiefe nach innen.
			// Vor der Abwurfkante (y < 0, eine gewonnene Münze im selben
			// Schritt) gilt die vorderste, breiteste Lage.
			const edge = y > 0 ? WALL_TAPER * y : 0;
			const gap = y < FRONT_ZONE_DEPTH ? this.chuteWidth : 0;
			const minX = edge - gap + this.r[i];
			if (this.x[i] < minX) {
				this.x[i] = minX;
				if (this.vx[i] < 0) { this.vx[i] = 0; }
				continue;
			}
			const maxX = fieldWidth - edge + gap - this.r[i];
			if (this.x[i] > maxX) {
				this.x[i] = maxX;
				if (this.vx[i] > 0) { this.vx[i] = 0; }
			}
		}
	}

	/**
	 * 9. Abräumen. Von hinten nach vorn durch die Spalten, damit das
	 * Nachrücken beim Entfernen keine Spalte überspringt.
	 *
	 * Reihenfolge der Prüfung: erst die Bodenkante (Verlustschacht), dann
	 * die Abwurfkante. Eine Münze, die genau in der Ecke beides erfüllt, ist
	 * damit ausdrücklich VERLOREN – diese Festlegung muss eindeutig sein,
	 * weil sie in die Quote eingeht. Die Wand (applyWalls(), gerade
	 * gelaufen) hat jede Münze, die der Schacht nicht durchlässt – oder die
	 * sich außerhalb des vorderen Bereichs befindet, wo es gar keinen Schacht
	 * gibt –, bereits auf die verjüngte Bodenkante zurückgesetzt; was hier
	 * noch außerhalb liegt, ist echt gefallen.
	 *
	 * Eine Münze der OBEREN Ebene kann die Abwurfkante nie erreichen: die
	 * vorderste Lage der Vorderwand liegt bei LOWER_DEPTH - PLATE_STROKE und
	 * damit immer hinter dem vorderen Bereich (F-1 prüft das). Wer vorn
	 * herunterfällt, war vorher unten – und war vorher oben (Q-10).
	 *
	 * Seit dem Trichter ist die Bodenkante keine Gerade mehr, sondern hängt
	 * von der Tiefe ab; sie wird deshalb an derselben Stelle und mit
	 * derselben Formel gerechnet wie in applyWalls().
	 */
	collect() {
		const fieldWidth = this.layout.fieldWidth;
		for (let i = this.count - 1; i >= 0; i--) {
			// Die Bodenkante liegt mit dem Trichter bei WALL_TAPER · y –
			// dieselbe Kante, gegen die applyWalls() im selben Schritt
			// geklemmt hat. Zwei verschiedene Kanten wären zwei Wahrheiten.
			const edge = this.y[i] > 0 ? WALL_TAPER * this.y[i] : 0;
			if (this.x[i] < edge || this.x[i] > fieldWidth - edge) {
				this.chuteValue += this.value[i];
				this.chuteCount++;
				this.remove(i);
				continue;
			}
			if (this.y[i] <= 0) {
				this.wonValue += this.value[i];
				this.wonCount++;
				this.wonByValue[COIN_VALUES.indexOf(this.value[i])] += 1;
				this.remove(i);
			}
		}
	}

	/**
	 * Holt den aufgelaufenen Gewinn ab und setzt ihn zurück.
	 *
	 * DAS IST DIE EINZIGE STELLE, an der Geld aus der Physik herauskommt.
	 * field.js kennt die Kasse nicht und wird sie nie kennen (CONCEPT.md
	 * B.5.3: kein Automat greift selbst auf den Speicher zu; B.11 Nr. 1: die
	 * Kasse bleibt die Bruchstelle). Phase 9 ruft das hier und reicht den
	 * Betrag an den geteilten Baustein weiter; wird das Guthaben in
	 * Ausbaustufe 3 serverseitig geführt, ändert sich an dieser Datei nichts.
	 *
	 * @returns {{total: number, byValue: number[]}}
	 */
	takeWon() {
		const total = this.wonValue;
		const byValue = Array.from(this.wonByValue);
		this.wonValue = 0;
		this.wonByValue.fill(0);
		return { total, byValue };
	}

	/**
	 * Schreibt den vollständigen Zustand in eine Zeile.
	 *
	 * Format:  cp3|<prüfsumme>|<phase>|<spawnCount>|<w,b,x,y,z,vx,vy,vz>;<…>
	 *
	 * Gegenüber cp1 sind zwei Zahlen je Münze dazugekommen: z (die Unterkante
	 * über der unteren Ebene) und vz. Ohne sie ließe sich ein Stapel nicht
	 * fortsetzen; er fiele beim Laden zu einer Lage zusammen.
	 *
	 * NICHT gespeichert werden restZ und support: beide werden in jedem
	 * Zeitschritt vollständig neu berechnet. Sie zu speichern hieße, einen
	 * abgeleiteten Wert zu einer Wahrheit zu machen, die mit dem Rest des
	 * Stands auseinanderlaufen kann.
	 *
	 * Gespeichert wird die PHASE der Schubplatte, nicht die Uhrzeit – wörtlich
	 * nach B.9.5. Eine Uhrzeit hieße: beim Fortsetzen steht die Platte
	 * irgendwo, und das Bild springt.
	 *
	 * WARUM EINGERASTET WIRD. Ohne Einrasten schreibt JavaScript je Zahl die
	 * kürzeste Ziffernfolge, die beim Zurücklesen wieder exakt dieselbe
	 * 64-Bit-Zahl ergibt – bei einem gewachsenen Haufen sind das siebzehn
	 * Stellen je Ort. GEMESSEN: 16.068 Zeichen bei 200 Münzen, gegen eine
	 * Zusage von 14.000 (F-13). Die siebzehnte Stelle einer Ortsangabe ist
	 * ein Zehnbillionstel einer Münzbreite; sie steht für nichts.
	 * Eingerastet auf ein Tausendstel bleiben rund 40 Zeichen je Münze.
	 *
	 * WARUM ZURÜCKGESCHRIEBEN WIRD. Würde nur die AUSGABE eingerastet,
	 * beschriebe der Speicherstand einen anderen Zustand als den, der im
	 * Gerät weiterläuft – und ein fortgesetzter Lauf liefe von Anfang an
	 * anders als der, aus dem er stammt. Mit dem Zurückschreiben sind beide
	 * derselbe Zustand, und F-11/F-12 können ihre Gleichheit auf das letzte
	 * Bit prüfen, statt eine Toleranz zu erfinden.
	 *
	 * WAS DAS KOSTET. Eine Sicherung verschiebt jede Münze um höchstens ein
	 * Zweitausendstel einer Einheit – unsichtbar, und in beiden Läufen
	 * dieselbe Verschiebung. Der Preis ist ehrlich zu benennen: der Verlauf
	 * einer Browsersitzung hängt damit auch daran, WANN gesichert wurde
	 * (store.js sichert alle fünf Sekunden). Die Wiederholbarkeit, die
	 * Anhang E verlangt – gleicher Startzustand plus gleiche Zufallsfolge
	 * ergibt denselben Verlauf –, bleibt davon unberührt: sie bezieht sich
	 * auf den Startzustand, und der ist nach einem Neuladen genau der
	 * eingerastete. F-4 prüft sie unverändert an einem Lauf ohne Sicherung.
	 *
	 * @returns {string}
	 */
	serialize() {
		const phase = this.stepCount % PLATE_PERIOD_STEPS;
		const coins = [];
		for (let i = 0; i < this.count; i++) {
			// EINRASTEN – UND ZURÜCKSCHREIBEN. Beides gehört zusammen.
			this.x[i] = snapNumber(this.x[i]);
			this.y[i] = snapNumber(this.y[i]);
			this.z[i] = snapNumber(this.z[i]);
			this.vx[i] = snapNumber(this.vx[i]);
			this.vy[i] = snapNumber(this.vy[i]);
			this.vz[i] = snapNumber(this.vz[i]);
			coins.push(`${this.value[i]},${this.born[i]},${this.x[i]},${this.y[i]},`
				+ `${this.z[i]},${this.vx[i]},${this.vy[i]},${this.vz[i]}`);
		}
		const payload = `${phase}|${this.spawnCount}|${coins.join(';')}`;
		return `${FORMAT_VERSION}|${checksum(payload)}|${payload}`;
	}

	/**
	 * Liest einen Speicherstand. Bei jedem Zweifel: null.
	 *
	 * Geprüft werden (B.9.5: „beim Laden geprüft; ist er beschädigt, beginnt
	 * das Feld leer statt mit einem Fehler"):
	 *   – Kennung cp3
	 *   – Prüfsumme über die Nutzlast (fängt Abschneiden und Verändern)
	 *   – Phase ganzzahlig aus [0, PLATE_PERIOD_STEPS)
	 *   – je Münze ACHT Zahlen, alle endlich
	 *   – Höhe im Bereich [0, MAX_STACK_Z]
	 *   – Wert aus COIN_VALUES
	 *   – Ort im trichterförmigen Feld (siehe WALL_TAPER), Geschwindigkeit
	 *     dem Betrag nach unter 1000
	 *   – Stückzahl höchstens COIN_CAP_MAX
	 * Fällt eine Prüfung durch, gibt es KEINEN Fehler und KEINE
	 * Konsolenausgabe (B.10 Phase 9 verbietet Konsolenausgabe; hier wird die
	 * Regel von vornherein eingehalten), sondern schlicht null. Der Aufrufer
	 * beginnt dann mit leerem Feld. Ein Stand im alten Format cp1 oder cp2
	 * fällt bereits an der Kennungsprüfung durch – siehe FORMAT_VERSION.
	 *
	 * @param {string} text
	 * @param {{random: () => number, chuteWidth?: number, chuteReach?: number,
	 *          fillTarget?: number, layout?: object}} options
	 * @returns {Field|null}
	 */
	static restore(text, options) {
		if (typeof text !== 'string' || text.length === 0) { return null; }

		const parts = text.split('|');
		if (parts.length !== 5) { return null; }
		const [magic, sumText, phaseText, spawnText, coinListText] = parts;
		if (magic !== FORMAT_VERSION) { return null; }

		const payload = `${phaseText}|${spawnText}|${coinListText}`;
		const sum = Number(sumText);
		if (!Number.isInteger(sum) || sum < 0 || checksum(payload) !== sum) { return null; }

		const phase = Number(phaseText);
		if (!Number.isInteger(phase) || phase < 0 || phase >= PLATE_PERIOD_STEPS) { return null; }

		const spawnCount = Number(spawnText);
		if (!Number.isInteger(spawnCount) || spawnCount < 0) { return null; }

		const coinTexts = coinListText.length === 0 ? [] : coinListText.split(';');
		if (coinTexts.length > COIN_CAP_MAX) { return null; }

		let field;
		try {
			field = new Field(options);
		} catch {
			return null;
		}

		for (let c = 0; c < coinTexts.length; c++) {
			const numbers = coinTexts[c].split(',');
			if (numbers.length !== 8) { return null; }

			const value = Number(numbers[0]);
			const born = Number(numbers[1]);
			const x = Number(numbers[2]);
			const y = Number(numbers[3]);
			const z = Number(numbers[4]);
			const vx = Number(numbers[5]);
			const vy = Number(numbers[6]);
			const vz = Number(numbers[7]);

			if (!COIN_VALUES.includes(value)) { return null; }
			if (!Number.isInteger(born) || born < 0) { return null; }
			if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)
				|| !Number.isFinite(vx) || !Number.isFinite(vy) || !Number.isFinite(vz)) {
				return null;
			}
			// Der Trichter macht die zulässige Breite tiefenabhängig. Ein
			// halber Halbmesser Nachsicht, weil eine gerade abgelenkte Münze
			// im Augenblick der Sicherung an der Leiste anliegen darf.
			const edge = y > 0 ? WALL_TAPER * y : 0;
			if (x < edge - CHUTE_WIDTH || x > field.layout.fieldWidth - edge + CHUTE_WIDTH) { return null; }
			if (y < -MAX_RADIUS || y > field.layout.fieldDepth) { return null; }
			if (z < 0 || z > MAX_STACK_Z) { return null; }
			if (Math.abs(vx) >= 1000 || Math.abs(vy) >= 1000 || Math.abs(vz) >= 1000) { return null; }

			const index = COIN_VALUES.indexOf(value);
			const i = field.count;
			field.x[i] = x;
			field.y[i] = y;
			field.z[i] = z;
			field.vx[i] = vx;
			field.vy[i] = vy;
			field.vz[i] = vz;
			field.r[i] = COIN_RADIUS[index];
			field.value[i] = value;
			field.born[i] = born;
			field.count++;
			// area wird nicht mehr mitgeführt, siehe get area().
		}

		field.stepCount = phase;
		field.spawnCount = spawnCount;
		return field;
	}
}

/**
 * FNV-1a über 32 Bit: eine sehr kurze Prüfsumme, die aus reinen
 * Ganzzahl-Rechenarten besteht und deshalb überall dasselbe liefert. Sie
 * schützt nicht gegen Böswilligkeit – das muss sie nicht, es ist der eigene
 * Browserspeicher – sondern gegen abgeschnittene und halb geschriebene
 * Stände.
 *
 * @param {string} text
 * @returns {number} ganze Zahl aus [0, 2^32)
 */
export function checksum(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Rastet eine Zahl auf die Auflösung des Speicherstands ein: 1/STORE_SCALE
 * Einheit.
 *
 * Math.floor(v · s + 0,5) / s statt einer Rundungsfunktion, weil nur die im
 * Kopfkommentar aufgezählten Rechenarten in der Sprachnorm bitgenau
 * festgelegt sind. Der Ausdruck rundet auch für negative Zahlen
 * (Geschwindigkeiten) eindeutig – immer zur nächstgrößeren Zahl bei genau
 * einer halben Einheit – und liefert damit auf jeder Maschine dasselbe
 * Ergebnis.
 *
 * @param {number} v
 * @returns {number}
 */
export function snapNumber(v) {
	return Math.floor(v * STORE_SCALE + 0.5) / STORE_SCALE;
}

/** Bequemer Weg für Phase 9: createField({ random: drawUint32 }). */
export function createField(options) { return new Field(options); }
export default createField;
