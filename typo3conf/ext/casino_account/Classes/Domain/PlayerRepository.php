<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Domain;

use Doctrine\DBAL\ArrayParameterType;
use Phomo17\CasinoAccount\Service\PlayerTokenGenerator;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\QueryBuilder;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;

/**
 * Die einzige Stelle, die tx_casinoaccount_player LIEST.
 *
 * Geschrieben wird ausschließlich über den DataHandler (Umsetzungsstück Dc:
 * ShadowUserService, BackendUserMirror). Diese Klasse schreibt nie.
 *
 * Gearbeitet wird durchgehend mit dem QueryBuilder und gebundenen
 * Parametern; eine zusammengesetzte SQL-Zeichenkette kommt hier nicht vor.
 * Das ist keine Förmlichkeit: eine Kennung oder ein Name, der in eine
 * Abfrage geklebt würde, wäre eine offene Tür.
 */
final readonly class PlayerRepository
{
    public const TABLE = 'tx_casinoaccount_player';

    public function __construct(private ConnectionPool $connectionPool) {}

    /**
     * Alle Spielenden eines Ordners, nach Namen sortiert.
     *
     * Stillgelegte („hidden") werden MITGELIEFERT — das Modul zeigt sie mit
     * einem Vermerk. Ein stillgelegter Spielender, der aus der Liste
     * verschwindet, wäre für den Bearbeiter unauffindbar.
     *
     * @return list<Player>
     */
    public function findAllForList(int $storagePid): array
    {
        $queryBuilder = $this->queryBuilder();
        $rows = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'pid',
                    $queryBuilder->createNamedParameter($storagePid, Connection::PARAM_INT)
                )
            )
            ->orderBy('name', 'ASC')
            ->addOrderBy('uid', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(Player::fromRow(...), $rows);
    }

    public function findByUid(int $uid): ?Player
    {
        if ($uid <= 0) {
            return null;
        }
        $queryBuilder = $this->queryBuilder();
        $row = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'uid',
                    $queryBuilder->createNamedParameter($uid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        return $row === false ? null : Player::fromRow($row);
    }

    /**
     * Gibt es diese Kennung schon?
     *
     * Gefragt wird ohne jede Einschränkung — auch gelöschte Datensätze zählen.
     * Eine Kennung, die einmal vergeben war, darf nie ein zweites Mal
     * entstehen; sonst führte ein alter Ausdruck zu einem fremden Konto.
     */
    public function tokenExists(string $token): bool
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll();
        return (bool)$queryBuilder
            ->count('uid')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'token',
                    $queryBuilder->createNamedParameter($token)
                )
            )
            ->executeQuery()
            ->fetchOne();
    }

    /** Die uid des Spielenden, der zu diesem Backend-Benutzer gehört, oder 0. */
    public function findUidByBackendUser(int $beUserUid): int
    {
        $queryBuilder = $this->queryBuilder();
        $uid = $queryBuilder
            ->select('uid')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'be_user',
                    $queryBuilder->createNamedParameter($beUserUid, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchOne();
        return (int)$uid;
    }

    /**
     * Die Spielenden zu einer Liste von Schattendatensätzen.
     *
     * Gebraucht von PlayerSessionService: aus fe_sessions kommen Nummern von
     * fe_users, angezeigt werden aber Spielende.
     *
     * @param list<int> $feUserUids
     * @return array<int, Player> Schlüssel ist die Nummer des Spielenden
     */
    public function findByFeUsers(array $feUserUids): array
    {
        if ($feUserUids === []) {
            return [];
        }
        $queryBuilder = $this->queryBuilder();
        $rows = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->in(
                    'fe_user',
                    $queryBuilder->createNamedParameter($feUserUids, ArrayParameterType::INTEGER)
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();

        $players = [];
        foreach ($rows as $row) {
            $player = Player::fromRow($row);
            $players[$player->uid] = $player;
        }
        return $players;
    }

    /**
     * Alle Spielenden, bei denen noch Geld in einem Gerät oder auf der
     * Risiko-Leiter steht (für PlayerSessionService::reconcile()).
     *
     * @return list<Player>
     */
    public function findWithOpenDeviceMoney(): array
    {
        $queryBuilder = $this->queryBuilder();
        $rows = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->or(
                    $queryBuilder->expr()->gt(
                        'balance_machine',
                        $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                    ),
                    $queryBuilder->expr()->gt(
                        'balance_win',
                        $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                    )
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(Player::fromRow(...), $rows);
    }

    /**
     * Der Spielende zu einer Kennung — oder null.
     *
     * ZWEI VERGLEICHE, MIT ABSICHT. Die Abfrage sucht mit einem gebundenen
     * Parameter (keine zusammengesetzte SQL-Zeichenkette, und der eindeutige
     * Schlüssel auf `token` macht sie zu einem einzigen Indexzugriff).
     * Entschieden wird danach aber NOCH EINMAL in PHP, mit hash_equals() —
     * so verlangt es CONCEPT.md D.4.2 wörtlich („Verglichen wird serverseitig
     * mit hash_equals(), nie mit =="). Der Datenbankvergleich ist bequem, aber
     * er ist keine Zusage über die Vergleichsdauer; hash_equals() ist genau
     * das. Der doppelte Vergleich kostet Mikrosekunden und macht die Zusage
     * unabhängig davon, wie MariaDB intern vergleicht.
     *
     * STILLGELEGTE („hidden") SPIELENDE KOMMEN NICHT DURCH. Die Abfrage
     * schließt sie aus. Damit bekommt der Haken „Stillgelegt" eine klare
     * Bedeutung: gesperrt. Das ist das einzige Mittel, das ein Bearbeiter hat,
     * um einen ausgedruckten Code ungültig zu machen, ohne die Person zu
     * löschen.
     */
    public function findByToken(string $token): ?Player
    {
        if (!PlayerTokenGenerator::looksValid($token)) {
            return null;   // offensichtlicher Unsinn, ohne die Datenbank zu fragen
        }

        $queryBuilder = $this->queryBuilder();
        $row = $queryBuilder
            ->select('*')
            ->from(self::TABLE)
            ->where(
                $queryBuilder->expr()->eq(
                    'token',
                    $queryBuilder->createNamedParameter($token)
                ),
                $queryBuilder->expr()->eq(
                    'hidden',
                    $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAssociative();

        if ($row === false) {
            return null;
        }
        if (!hash_equals((string)$row['token'], $token)) {
            return null;
        }

        return Player::fromRow($row);
    }

    /**
     * Der QueryBuilder mit genau einer Einschränkung: gelöschte Datensätze
     * bleiben draußen.
     *
     * Die Voreinstellung des Kerns würde zusätzlich „hidden" ausblenden. Das
     * ist im Frontend richtig und hier falsch — siehe findAllForList().
     */
    private function queryBuilder(): QueryBuilder
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()
            ->removeAll()
            ->add(new DeletedRestriction());
        return $queryBuilder;
    }
}
