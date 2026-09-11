#
# Tabelle für einen Spielenden (CONCEPT.md D.13, Anhang I)
#
# uid, pid, tstamp, crdate, deleted und hidden stehen bewusst NICHT hier:
# TYPO3 ergänzt sie aus der TCA (DefaultTcaSchema::enrich). Zwei Quellen für
# dieselbe Spalte wären eine Fehlerquelle.
#
# Das Gesamtvermögen ist KEINE Spalte. Es ist immer
# balance_cash + balance_machine + balance_win und kann so nicht auseinander-
# laufen (CONCEPT.md D.13).
#
CREATE TABLE tx_casinoaccount_player (
	name varchar(255) DEFAULT '' NOT NULL,
	token varchar(64) DEFAULT '' NOT NULL,
	balance_cash int(11) unsigned DEFAULT '0' NOT NULL,
	balance_machine int(11) unsigned DEFAULT '0' NOT NULL,
	balance_win int(11) unsigned DEFAULT '0' NOT NULL,
	role int(11) unsigned DEFAULT '0' NOT NULL,
	fe_user int(11) unsigned DEFAULT '0' NOT NULL,
	be_user int(11) unsigned DEFAULT '0' NOT NULL,
	is_admin smallint(5) unsigned DEFAULT '0' NOT NULL,
	booking_seq int(11) unsigned DEFAULT '0' NOT NULL,
	booking_client varchar(32) DEFAULT '' NOT NULL,
	last_seen int(11) unsigned DEFAULT '0' NOT NULL,

	UNIQUE KEY token (token),
	KEY be_user (be_user),
	KEY fe_user (fe_user)
);

#
# Rückverweis vom Schattendatensatz auf den Spielenden.
#
# fe_users ist eine Tabelle des TYPO3-Kerns. Eine Spalte anzuhängen ist der
# dokumentierte, zerstörungsfreie Weg, eine Kerntabelle zu erweitern: TYPO3
# fügt die Spalte hinzu und lässt alles Vorhandene unberührt. Beim Entfernen
# der Extension bleibt sie stehen — siehe README, Abschnitt „Was beim
# Entfernen der Extension zurückbleibt".
#
# Warum es diese Spalte gibt: ohne sie wäre ein Schattendatensatz nach dem
# Entfernen der Extension nicht mehr als solcher erkennbar. Der Verweis in
# der Gegenrichtung (tx_casinoaccount_player.fe_user) genügt dafür nicht,
# weil dessen Tabelle beim Entfernen mit weggeworfen werden kann.
#
CREATE TABLE fe_users (
	tx_casinoaccount_player int(11) unsigned DEFAULT '0' NOT NULL,

	KEY tx_casinoaccount_player (tx_casinoaccount_player)
);

#
# Der Gerätespeicher einer Person (CONCEPT.md D.13, Anhang I).
#
# D.13 nennt die Tabelle nach ihrem heute einzigen Nutzer: dem Feld des Coin
# Pushers, das ab Teil D nicht mehr dem Browser gehört, sondern der Person
# (D.8). Die SPALTEN sind trotzdem gerätefrei gehalten — `store_key` nimmt den
# Speicherschlüssel auf, den das Gerät ohnehin schon führt. Grund: der
# Adapter, der diese Tabelle im Browser vertritt, liegt in casino_startpage,
# und dort darf laut CONCEPT.md Abschnitt 5, Grundsatz 2 kein Automat bekannt
# sein. Stünde hier eine Spalte „coin_field", müsste der geteilte Baustein
# den Coin Pusher kennen.
#
# uid/pid/tstamp/crdate ergänzt TYPO3 aus der TCA (DefaultTcaSchema::enrich),
# genau wie bei tx_casinoaccount_player.
#
# Kein Geld: diese Tabelle geht in kein Gesamtvermögen ein und hat keine
# Buchungsnummer.
#
CREATE TABLE tx_casinoaccount_coinfield (
	player int(11) unsigned DEFAULT '0' NOT NULL,
	store_key varchar(191) DEFAULT '' NOT NULL,
	payload mediumtext,

	UNIQUE KEY player_key (player, store_key)
);
