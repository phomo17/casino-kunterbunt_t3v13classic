#
# Eine Lobby (CONCEPT.md D.13, Anhang I).
#
# uid, pid, tstamp und crdate stehen bewusst NICHT hier: TYPO3 ergänzt sie
# aus der TCA (DefaultTcaSchema::enrich). Zwei Quellen für dieselbe Spalte
# wären eine Fehlerquelle — dieselbe Aufteilung wie in casino_account.
#
# KEINE Spalten `deleted` und `hidden`: eine Lobby ist Maschinenzustand mit
# einer Lebensdauer von Minuten, kein redaktionelles Gut. Eine leere Lobby
# wird gelöscht, nicht als gelöscht markiert (D.10.3: „Eine Lobby, die leer
# wird, schließt sich von selbst."). Eine „versteckte" Lobby hätte keine
# Bedeutung. Deshalb führt auch die TCA weder 'delete' noch 'enablecolumns'.
#
CREATE TABLE tx_casinolobby_lobby (
	game varchar(32) DEFAULT '' NOT NULL,
	seats_max smallint(5) unsigned DEFAULT '0' NOT NULL,
	state varchar(16) DEFAULT 'setzen' NOT NULL,
	state_until int(11) unsigned DEFAULT '0' NOT NULL,
	revision int(11) unsigned DEFAULT '0' NOT NULL,
	round_no int(11) unsigned DEFAULT '0' NOT NULL,
	seed varchar(32) DEFAULT '' NOT NULL,
	result varchar(64) DEFAULT '' NOT NULL,
	owner int(11) unsigned DEFAULT '0' NOT NULL,

	#
	# NUR BLACKJACK (D.10.6). 0 = niemand ist gefragt.
	#
	# Die Platznummer, deren Entscheidung die Runde gerade abwartet. Sie
	# steht hier und nicht im Browser, weil die Reihenfolge der
	# Entscheidungen sonst von der Uhr des schnellsten Geräts abhinge.
	# state_until trägt in dieser Zeit die 20-Sekunden-Frist DIESES Platzes
	# (RoundClock::ZUGZEIT) — dieselbe Spalte, dieselbe Bedeutung
	# ("wann endet der laufende Zustand"), nur feiner aufgelöst.
	#
	turn_seat smallint(5) unsigned DEFAULT '0' NOT NULL,

	#
	# NUR BLACKJACK. Das Zugprotokoll der LAUFENDEN Runde, kompakt als
	# Paare aus Platznummer und einem Buchstaben: "1h1s2n2h2s3s".
	#
	# WARUM ES DIESE SPALTE BRAUCHT: beim Blackjack ziehen alle Plätze aus
	# EINEM Schlitten. Wer eine Karte nimmt, verschiebt die Karten aller
	# nach ihm. Nur wenn jeder Browser dieselbe Zugfolge kennt, zieht er
	# dieselben Karten aus derselben Saat. Das ist die einzige Stelle in
	# D.10, an der eine Saat allein NICHT reicht.
	#
	# WARUM KEINE EIGENE TABELLE: das Protokoll lebt genau eine Runde und
	# wird nie einzeln abgefragt, sortiert oder verknüpft — es wird immer
	# als Ganzes gelesen und hinten angehängt. Eine Tabelle mit einer Zeile
	# je Zug wäre drei Abfragen, wo eine Zeichenkette genügt. 255 Zeichen
	# fassen 5 Plätze mit je 25 Entscheidungen; mehr ist regelwidrig
	# (LobbyService::zug() weist darüber hinaus ab).
	#
	moves varchar(255) DEFAULT '' NOT NULL,

	KEY game_state (game, state),
	KEY owner (owner)
);

#
# Ein Platz an einer Lobby (CONCEPT.md D.13, Anhang I).
#
# UNIQUE KEY player: eine Person hat im ganzen Haus HÖCHSTENS EINEN Platz.
# Dieselbe Zusage wie beim Geld — „das Konto hat immer nur einen
# Gerätekredit, weil man immer nur an einem Gerät steht" (D.7.2). Ohne diesen
# Schlüssel könnte dieselbe Person an drei Tischen gleichzeitig sitzen und
# dreimal aus demselben Buy-in setzen.
#
# UNIQUE KEY lobby_seat: ein Platz ist einmal da. Die Datenbank hält das fest,
# nicht nur der Code — bei zwei gleichzeitigen Beitritten entscheidet sonst
# der Zufall.
#
CREATE TABLE tx_casinolobby_seat (
	lobby int(11) unsigned DEFAULT '0' NOT NULL,
	player int(11) unsigned DEFAULT '0' NOT NULL,
	seat_no smallint(5) unsigned DEFAULT '0' NOT NULL,
	last_seen int(11) unsigned DEFAULT '0' NOT NULL,
	joined_round int(11) unsigned DEFAULT '0' NOT NULL,
	shooter_no int(11) unsigned DEFAULT '0' NOT NULL,

	UNIQUE KEY lobby_seat (lobby, seat_no),
	UNIQUE KEY player (player),
	KEY lobby_seen (lobby, last_seen)
);

#
# Ein Einsatz einer Runde (CONCEPT.md D.13, Anhang I).
#
# In D4 wird diese Tabelle ANGELEGT und von nichts gelesen oder geschrieben.
# D.11 verlangt für D4a ausdrücklich „Tabellen nach Anhang I"; gefüllt wird
# sie in D5, wenn die drei Tische in der Lobby setzen. Sie steht hier, damit
# D5 keine Datenbankänderung mehr braucht.
#
# `outcome` ist als EINZIGE Spalte dieser Extension vorzeichenbehaftet: das
# Ergebnis einer Auswertung kann negativ sein (verlorener Einsatz).
#
CREATE TABLE tx_casinolobby_bet (
	lobby int(11) unsigned DEFAULT '0' NOT NULL,
	player int(11) unsigned DEFAULT '0' NOT NULL,
	round_no int(11) unsigned DEFAULT '0' NOT NULL,
	field varchar(64) DEFAULT '' NOT NULL,
	amount int(11) unsigned DEFAULT '0' NOT NULL,
	outcome int(11) DEFAULT '0' NOT NULL,

	KEY lobby_round (lobby, round_no),
	KEY player (player)
);
