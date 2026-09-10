<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Domain;

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
