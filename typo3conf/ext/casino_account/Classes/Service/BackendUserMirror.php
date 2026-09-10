<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Spiegelt Backend-Benutzer als Spielende (CONCEPT.md D.7.3).
 *
 * „Alle vorhandenen und alle künftigen Backend-Benutzer bekommen automatisch
 * einen Spielenden-Eintrag: Name = Benutzername, Gesamtvermögen = 1.000.000."
 *
 * DREI AUSLÖSER, EINE METHODE:
 *   1. beim Aktivieren der Extension    (ActivateExtension, PSR-14)
 *   2. bei jedem neuen Backend-Benutzer (PlayerDataHandlerHook)
 *   3. bei jedem Aufruf des Moduls      (PlayerModuleController) — das
 *      Sicherheitsnetz. Punkt 1 kann längst vorbei sein, Punkt 2 greift nicht
 *      bei einem Benutzer, den jemand mit einem Datenbankwerkzeug angelegt
 *      hat. Das Abnahmekriterium lautet aber „ALLE vorhandenen Backend-
 *      Benutzer stehen mit 1.000.000 in der Liste" — und dieses Netz ist die
 *      einzige Zusage, die das auch dann hält.
 *
 * WIEDERHOLBAR: gespiegelt wird nur, wozu es noch keinen Eintrag gibt. Der
 * zweite Aufruf legt nichts an und gibt 0 zurück.
 *
 * EINBAHNSTRASSE: der Spiegel legt an, er gleicht nicht ab. Wird ein
 * Backend-Benutzer später umbenannt oder gelöscht, bleibt sein Spielenden-
 * Eintrag, wie er ist. Begründung: sein Guthaben ist inzwischen erspielt, und
 * ein Konto, das mit einem Benutzerkonto verschwindet, wäre eine
 * Überraschung. Das steht so in der README.
 */
final readonly class BackendUserMirror
{
    /** CONCEPT.md D.7.3, ausdrückliche Vorgabe. */
    public const START_BALANCE = 1000000;

    public function __construct(
        private ConnectionPool $connectionPool,
        private PlayerRepository $players,
        private AccountStorage $storage,
    ) {}

    /**
     * Spiegelt alle Backend-Benutzer, die noch keinen Eintrag haben.
     *
     * @return int wie viele neu angelegt wurden
     */
    public function syncAll(int $storagePid): int
    {
        if ($storagePid <= 0) {
            return 0;
        }
        $created = 0;
        foreach ($this->unmirroredBackendUsers() as $row) {
            if ($this->create((int)$row['uid'], (string)$row['username'], $storagePid) > 0) {
                $created++;
            }
        }
        return $created;
    }

    /** Spiegelt genau einen Backend-Benutzer, falls er noch keinen Eintrag hat. */
    public function mirrorOne(int $beUserUid): int
    {
        if ($beUserUid <= 0 || $this->players->findUidByBackendUser($beUserUid) > 0) {
            return 0;
        }
        $storagePid = $this->storage->ensure();
        if ($storagePid <= 0) {
            return 0;
        }
        $username = $this->usernameOf($beUserUid);
        if ($username === '') {
            return 0;
        }
        return $this->create($beUserUid, $username, $storagePid);
    }

    /**
     * Legt den Eintrag an — über den DataHandler und über das editierbare
     * Feld „balance_cash" (Umsetzungsstück Dc, siehe DECISIONS.md
     * 2026-09-09: die ursprünglich geplante Übersetzung über ein virtuelles
     * Feld „balance" entfällt, weil dieses Feld seit Db keinen Wert mehr
     * entgegennimmt — type => 'none' hat kein 'name'-Attribut).
     *
     * Warum trotzdem "balance_cash" und nicht direkt in die Datenbank
     * schreiben: so läuft der Spiegel durch genau denselben Weg wie ein
     * Bearbeiter, der das Guthaben von Hand einträgt (PlayerDataHandlerHook
     * setzt balance_machine/balance_win dabei explizit auf 0). Zwei Wege zum
     * selben Ziel wären zwei Stellen, an denen sich ein Fehler einnisten
     * kann.
     *
     * „token" wird NICHT mitgegeben: die Kennung erzeugt der Hook. „is_admin"
     * ebenso wenig — der Hook leitet sie aus „be_user" ab.
     */
    private function create(int $beUserUid, string $username, int $storagePid): int
    {
        $newId = 'NEW' . substr(md5('casino_account_mirror_' . $beUserUid), 0, 10);

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([
            PlayerRepository::TABLE => [
                $newId => [
                    'pid' => $storagePid,
                    'name' => $username,
                    'balance_cash' => self::START_BALANCE,
                    'be_user' => $beUserUid,
                    'role' => 0,
                    'hidden' => 0,
                ],
            ],
        ], []);
        $dataHandler->process_datamap();

        return (int)($dataHandler->substNEWwithIDs[$newId] ?? 0);
    }

    /**
     * Alle nicht gelöschten Backend-Benutzer, zu denen es noch keinen
     * Spielenden gibt.
     *
     * Eine einzige Abfrage mit einem linken Verbund statt einer Schleife über
     * alle Benutzer mit je einer Nachfrage. Bei drei Benutzern ist das egal;
     * bei dreißig ist es der Unterschied zwischen einer und einunddreißig
     * Abfragen bei JEDEM Aufruf des Moduls.
     *
     * @return list<array{uid: int, username: string}>
     */
    private function unmirroredBackendUsers(): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        $queryBuilder->getRestrictions()->removeAll();

        return $queryBuilder
            ->select('be.uid', 'be.username')
            ->from('be_users', 'be')
            ->leftJoin(
                'be',
                PlayerRepository::TABLE,
                'p',
                (string)$queryBuilder->expr()->and(
                    $queryBuilder->expr()->eq('p.be_user', $queryBuilder->quoteIdentifier('be.uid')),
                    $queryBuilder->expr()->eq('p.deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT))
                )
            )
            ->where(
                $queryBuilder->expr()->eq('be.deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)),
                $queryBuilder->expr()->isNull('p.uid')
            )
            ->orderBy('be.uid', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();
    }

    private function usernameOf(int $beUserUid): string
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        $queryBuilder->getRestrictions()->removeAll();
        return (string)$queryBuilder
            ->select('username')
            ->from('be_users')
            ->where(
                $queryBuilder->expr()->eq('uid', $queryBuilder->createNamedParameter($beUserUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT))
            )
            ->executeQuery()
            ->fetchOne();
    }
}
