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
