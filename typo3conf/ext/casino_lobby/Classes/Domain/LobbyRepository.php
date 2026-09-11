<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Domain;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\QueryBuilder;

/**
 * Die einzige Stelle, die die drei Lobby-Tabellen liest oder schreibt
 * (CONCEPT.md D.10, D.13).
 *
 * Dieselbe Regel wie bei PlayerRepository und CoinFieldRepository in
 * casino_account: wer SQL sucht, findet es an einem Ort. LobbyService ruft
 * ausschließlich diese Klasse auf und formuliert selbst keine Abfrage.
 *
 * Gearbeitet wird durchgehend mit dem QueryBuilder und gebundenen
 * Parametern; eine zusammengesetzte SQL-Zeichenkette kommt hier nicht vor —
 * die einzige Ausnahme ist lockByUid(), die als vorbereitete Anweisung mit
 * Platzhaltern geschrieben ist (`FOR UPDATE`, dieselbe Technik wie
 * BookingService::buchen(), weil der QueryBuilder von 13.4 kein
 * `FOR UPDATE` kennt).
 */
final readonly class LobbyRepository
{
    public const TABLE_LOBBY = 'tx_casinolobby_lobby';
    public const TABLE_SEAT = 'tx_casinolobby_seat';
    public const TABLE_BET = 'tx_casinolobby_bet';

    /** Die Tabelle mit dem Anzeigenamen — aus casino_account, siehe seatsOf(). */
    private const TABLE_PLAYER = 'tx_casinoaccount_player';

    public function __construct(private ConnectionPool $connectionPool) {}

    /**
     * Alle Lobbys eines Spiels, älteste zuerst.
     *
     * @return list<Lobby>
     */
    public function findByGame(string $spiel): array
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_LOBBY);
        $rows = $queryBuilder
            ->select('*')
            ->from(self::TABLE_LOBBY)
            ->where(
                $queryBuilder->expr()->eq(
                    'game',
                    $queryBuilder->createNamedParameter($spiel)
                )
            )
            ->orderBy('crdate', 'ASC')
            ->addOrderBy('uid', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(Lobby::fromRow(...), $rows);
    }

    /** Eine Lobby, oder null. */
    public function findByUid(int $uid): ?Lobby
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_LOBBY);
        $row = $queryBuilder
            ->select('*')
            ->from(self::TABLE_LOBBY)
            ->where(
                $queryBuilder->expr()->eq(
                    'uid',
                    $queryBuilder->createNamedParameter($uid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        return $row === false ? null : Lobby::fromRow($row);
    }

    /**
     * Eine Lobby MIT ZEILENSPERRE, innerhalb einer laufenden Transaktion.
     *
     * SELECT … FOR UPDATE — dieselbe Technik und derselbe Grund wie in
     * BookingService::buchen(): zwischen Lesen und Schreiben darf sich
     * niemand dazwischenschieben. Ohne die Sperre könnten zwei gleichzeitige
     * Beitritte denselben Platz bekommen.
     */
    public function lockByUid(Connection $connection, int $uid): ?Lobby
    {
        $row = $connection->executeQuery(
            'SELECT * FROM ' . self::TABLE_LOBBY . ' WHERE uid = ? FOR UPDATE',
            [$uid],
            [Connection::PARAM_INT]
        )->fetchAssociative();

        return $row === false ? null : Lobby::fromRow($row);
    }

    /**
     * Die Plätze einer Lobby, mit dem Namen aus tx_casinoaccount_player,
     * nach Platznummer sortiert.
     *
     * @return list<Seat>
     */
    public function seatsOf(int $lobbyUid): array
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_SEAT);
        $rows = $queryBuilder
            ->select('s.*')
            ->addSelectLiteral('p.name AS player_name')
            ->from(self::TABLE_SEAT, 's')
            ->join(
                's',
                self::TABLE_PLAYER,
                'p',
                (string)$queryBuilder->expr()->eq('p.uid', $queryBuilder->quoteIdentifier('s.player'))
            )
            ->where(
                $queryBuilder->expr()->eq(
                    's.lobby',
                    $queryBuilder->createNamedParameter($lobbyUid, Connection::PARAM_INT)
                )
            )
            ->orderBy('s.seat_no', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(Seat::fromRow(...), $rows);
    }

    /** Der Platz dieser Person — höchstens einer im ganzen Haus (UNIQUE KEY player). */
    public function seatOfPlayer(int $playerUid): ?Seat
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_SEAT);
        $row = $queryBuilder
            ->select('s.*')
            ->addSelectLiteral('p.name AS player_name')
            ->from(self::TABLE_SEAT, 's')
            ->join(
                's',
                self::TABLE_PLAYER,
                'p',
                (string)$queryBuilder->expr()->eq('p.uid', $queryBuilder->quoteIdentifier('s.player'))
            )
            ->where(
                $queryBuilder->expr()->eq(
                    's.player',
                    $queryBuilder->createNamedParameter($playerUid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        return $row === false ? null : Seat::fromRow($row);
    }

    /**
     * Belegung je Lobby eines Spiels, ohne die Plätze selbst zu laden —
     * für die Übersichtsseite (D4b).
     *
     * @return array<int, int> Schlüssel ist die uid der Lobby
     */
    public function occupancyByGame(string $spiel): array
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_LOBBY);
        $rows = $queryBuilder
            ->select('l.uid')
            ->addSelectLiteral('COUNT(s.uid) AS belegt')
            ->from(self::TABLE_LOBBY, 'l')
            ->leftJoin(
                'l',
                self::TABLE_SEAT,
                's',
                (string)$queryBuilder->expr()->eq('s.lobby', $queryBuilder->quoteIdentifier('l.uid'))
            )
            ->where(
                $queryBuilder->expr()->eq(
                    'l.game',
                    $queryBuilder->createNamedParameter($spiel)
                )
            )
            ->groupBy('l.uid')
            ->executeQuery()
            ->fetchAllAssociative();

        $belegung = [];
        foreach ($rows as $row) {
            $belegung[(int)$row['uid']] = (int)$row['belegt'];
        }
        return $belegung;
    }

    /**
     * Die Vergleichsgröße der Übersicht (siehe LobbyEndpoint, D4b): Anzahl
     * der Lobbys dieses Spiels und die Summe ihrer Stand-Nummern. Ändert
     * sich, sobald eine Lobby entsteht, verschwindet oder ihre eigene
     * Stand-Nummer steigt — genau die drei Änderungen, die die
     * Übersichtsseite interessieren.
     */
    public function overviewRevision(string $spiel): string
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_LOBBY);
        $row = $queryBuilder
            ->selectLiteral('COUNT(*) AS anzahl', 'COALESCE(SUM(revision), 0) AS summe')
            ->from(self::TABLE_LOBBY)
            ->where(
                $queryBuilder->expr()->eq(
                    'game',
                    $queryBuilder->createNamedParameter($spiel)
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        if ($row === false) {
            return '0:0';
        }
        return $row['anzahl'] . ':' . $row['summe'];
    }

    /**
     * 'state' wird bewusst NICHT mitgegeben: ext_tables.sql setzt
     * `DEFAULT 'setzen'` — eine neu eröffnete Lobby beginnt immer im
     * Setzzustand, und diese eine Wahrheit soll an genau einer Stelle
     * stehen (der Tabellendefinition), nicht zusätzlich hier noch einmal.
     */
    public function insertLobby(string $spiel, int $plaetze, int $ownerUid, int $jetzt): int
    {
        $connection = $this->connectionPool->getConnectionForTable(self::TABLE_LOBBY);
        $connection->insert(
            self::TABLE_LOBBY,
            [
                'pid' => 0,
                'game' => $spiel,
                'seats_max' => $plaetze,
                'state_until' => 0,
                'revision' => 1,
                'round_no' => 0,
                'seed' => '',
                'result' => '',
                'owner' => $ownerUid,
                'tstamp' => $jetzt,
                'crdate' => $jetzt,
            ],
            [
                Connection::PARAM_INT, Connection::PARAM_STR, Connection::PARAM_INT,
                Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_STR,
                Connection::PARAM_STR, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT,
            ]
        );

        return (int)$connection->lastInsertId();
    }

    public function insertSeat(int $lobbyUid, int $playerUid, int $seatNo, int $runde, int $jetzt): void
    {
        $connection = $this->connectionPool->getConnectionForTable(self::TABLE_SEAT);
        $connection->insert(
            self::TABLE_SEAT,
            [
                'pid' => 0,
                'lobby' => $lobbyUid,
                'player' => $playerUid,
                'seat_no' => $seatNo,
                'last_seen' => $jetzt,
                'joined_round' => $runde,
                'shooter_no' => 0,
                'tstamp' => $jetzt,
                'crdate' => $jetzt,
            ],
            [
                Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT,
                Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT,
                Connection::PARAM_INT,
            ]
        );
    }

    public function deleteSeat(int $seatUid): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_SEAT)
            ->delete(self::TABLE_SEAT, ['uid' => $seatUid], [Connection::PARAM_INT]);
    }

    public function deleteSeatsOfPlayer(int $playerUid): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_SEAT)
            ->delete(self::TABLE_SEAT, ['player' => $playerUid], [Connection::PARAM_INT]);
    }

    /** Löscht die Lobby SAMT ihrer Plätze und Einsätze (D.10.3). */
    public function deleteLobby(int $lobbyUid): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_SEAT)
            ->delete(self::TABLE_SEAT, ['lobby' => $lobbyUid], [Connection::PARAM_INT]);

        $this->connectionPool->getConnectionForTable(self::TABLE_BET)
            ->delete(self::TABLE_BET, ['lobby' => $lobbyUid], [Connection::PARAM_INT]);

        $this->connectionPool->getConnectionForTable(self::TABLE_LOBBY)
            ->delete(self::TABLE_LOBBY, ['uid' => $lobbyUid], [Connection::PARAM_INT]);
    }

    public function touchSeat(int $seatUid, int $jetzt): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_SEAT)
            ->update(
                self::TABLE_SEAT,
                ['last_seen' => $jetzt],
                ['uid' => $seatUid],
                [Connection::PARAM_INT, Connection::PARAM_INT]
            );
    }

    /** @param array<string, int|string> $werte */
    public function updateLobby(int $lobbyUid, array $werte): void
    {
        $typen = [];
        foreach ($werte as $wert) {
            $typen[] = is_int($wert) ? Connection::PARAM_INT : Connection::PARAM_STR;
        }
        $typen[] = Connection::PARAM_INT; // fuer die uid in der WHERE-Bedingung

        $this->connectionPool->getConnectionForTable(self::TABLE_LOBBY)
            ->update(self::TABLE_LOBBY, $werte, ['uid' => $lobbyUid], $typen);
    }

    /**
     * Abgelaufene Plätze einer Lobby: deren letztes Lebenszeichen älter ist
     * als $aelterAls (D.10.5, „30 Sekunden ohne Lebenszeichen").
     *
     * @return list<Seat>
     */
    public function staleSeats(int $lobbyUid, int $aelterAls): array
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_SEAT);
        $rows = $queryBuilder
            ->select('s.*')
            ->addSelectLiteral('p.name AS player_name')
            ->from(self::TABLE_SEAT, 's')
            ->join(
                's',
                self::TABLE_PLAYER,
                'p',
                (string)$queryBuilder->expr()->eq('p.uid', $queryBuilder->quoteIdentifier('s.player'))
            )
            ->where(
                $queryBuilder->expr()->eq(
                    's.lobby',
                    $queryBuilder->createNamedParameter($lobbyUid, Connection::PARAM_INT)
                ),
                $queryBuilder->expr()->lt(
                    's.last_seen',
                    $queryBuilder->createNamedParameter($aelterAls, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(Seat::fromRow(...), $rows);
    }

    /**
     * Die Einsätze einer Runde, nach Platznummer gruppiert.
     *
     * JOIN auf die Platztabelle, weil die Einsatztabelle den SPIELENDEN
     * führt, die Platzleiste aber den PLATZ zeigt. Ein zweiter Weg
     * (erst Plätze, dann je Platz die Einsätze) wäre eine Abfrage je Platz.
     *
     * @return array<int, list<array{feld: string, betrag: int, ausgang: int}>>
     *         Schlüssel ist die Platznummer
     */
    public function betsOfRound(int $lobbyUid, int $runde): array
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_BET);
        $rows = $queryBuilder
            ->select('b.field', 'b.amount', 'b.outcome')
            ->addSelectLiteral('s.seat_no AS seat_no')
            ->from(self::TABLE_BET, 'b')
            ->join(
                'b',
                self::TABLE_SEAT,
                's',
                (string)$queryBuilder->expr()->and(
                    $queryBuilder->expr()->eq('s.player', $queryBuilder->quoteIdentifier('b.player')),
                    $queryBuilder->expr()->eq('s.lobby', $queryBuilder->quoteIdentifier('b.lobby'))
                )
            )
            ->where(
                $queryBuilder->expr()->eq('b.lobby', $queryBuilder->createNamedParameter($lobbyUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('b.round_no', $queryBuilder->createNamedParameter($runde, Connection::PARAM_INT))
            )
            ->orderBy('s.seat_no', 'ASC')
            ->addOrderBy('b.uid', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();

        $jePlatz = [];
        foreach ($rows as $row) {
            $jePlatz[(int)$row['seat_no']][] = [
                'feld' => (string)$row['field'],
                'betrag' => (int)$row['amount'],
                'ausgang' => (int)$row['outcome'],
            ];
        }
        return $jePlatz;
    }

    /**
     * Ersetzt die Einsätze EINER Person für EINE Runde in einem Zug.
     *
     * LÖSCHEN UND NEU SCHREIBEN, nicht abgleichen: der Browser meldet immer
     * den vollständigen Stand seines Tuchs, nie eine Änderung. Ein Abgleich
     * müsste raten, ob ein fehlendes Feld zurückgenommen wurde oder die
     * Meldung unvollständig ist — und läge damit genau bei jenen Beträgen
     * falsch, die niemand nachzählt.
     *
     * @param list<array{feld: string, betrag: int}> $felder
     */
    public function replaceBets(int $lobbyUid, int $playerUid, int $runde, array $felder): void
    {
        $connection = $this->connectionPool->getConnectionForTable(self::TABLE_BET);
        $connection->delete(
            self::TABLE_BET,
            ['lobby' => $lobbyUid, 'player' => $playerUid, 'round_no' => $runde],
            [Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT]
        );
        foreach ($felder as $eintrag) {
            $connection->insert(
                self::TABLE_BET,
                [
                    'pid' => 0,
                    'lobby' => $lobbyUid,
                    'player' => $playerUid,
                    'round_no' => $runde,
                    'field' => $eintrag['feld'],
                    'amount' => $eintrag['betrag'],
                    'outcome' => 0,
                ],
                [
                    Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT,
                    Connection::PARAM_INT, Connection::PARAM_STR, Connection::PARAM_INT,
                    Connection::PARAM_INT,
                ]
            );
        }
    }

    /**
     * Trägt den Ausgang je Feld nach, nachdem der eigene Browser abgerechnet
     * hat. NUR die eigene Person, NUR die eigene Runde.
     *
     * @param array<string, int> $ausgaenge Feldname => Ausgang (darf negativ sein)
     */
    public function settleBets(int $lobbyUid, int $playerUid, int $runde, array $ausgaenge): void
    {
        $connection = $this->connectionPool->getConnectionForTable(self::TABLE_BET);
        foreach ($ausgaenge as $feld => $ausgang) {
            $connection->update(
                self::TABLE_BET,
                ['outcome' => $ausgang],
                ['lobby' => $lobbyUid, 'player' => $playerUid, 'round_no' => $runde, 'field' => $feld],
                [Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_INT, Connection::PARAM_STR]
            );
        }
    }

    /** Löscht die Einsätze einer Runde, wenn sie abgelaufen ist (Aufräumen). */
    public function deleteBetsBefore(int $lobbyUid, int $runde): void
    {
        $queryBuilder = $this->queryBuilder(self::TABLE_BET);
        $queryBuilder
            ->delete(self::TABLE_BET)
            ->where(
                $queryBuilder->expr()->eq('lobby', $queryBuilder->createNamedParameter($lobbyUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->lt('round_no', $queryBuilder->createNamedParameter($runde, Connection::PARAM_INT))
            )
            ->executeStatement();
    }

    /** Alle Einsätze einer Person in dieser Lobby — beim Verlassen (D.10.3). */
    public function deleteBetsOfPlayer(int $lobbyUid, int $playerUid): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_BET)
            ->delete(
                self::TABLE_BET,
                ['lobby' => $lobbyUid, 'player' => $playerUid],
                [Connection::PARAM_INT, Connection::PARAM_INT]
            );
    }

    /** Setzt den Wartelistenplatz eines Platzes (Shooter, D.10.6). */
    public function setShooterNo(int $seatUid, int $nummer): void
    {
        $this->connectionPool->getConnectionForTable(self::TABLE_SEAT)
            ->update(
                self::TABLE_SEAT,
                ['shooter_no' => $nummer],
                ['uid' => $seatUid],
                [Connection::PARAM_INT, Connection::PARAM_INT]
            );
    }

    /**
     * Der QueryBuilder mit ENTFERNTEN Einschränkungen.
     *
     * Die drei Tabellen dieser Extension führen weder 'deleted' noch
     * 'hidden' (Begründung in ext_tables.sql). TYPO3s Standard-
     * Einschränkungen suchen trotzdem danach und erzeugten sonst SQL-Fehler
     * über nicht vorhandene Spalten — dieselbe Zeile aus demselben Grund wie
     * in CoinFieldRepository::allForPlayer().
     */
    private function queryBuilder(string $table): QueryBuilder
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable($table);
        $queryBuilder->getRestrictions()->removeAll();
        return $queryBuilder;
    }
}
