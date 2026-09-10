<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Backend\FormEngine;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use TYPO3\CMS\Backend\Form\FormDataProviderInterface;

/**
 * Füllt das virtuelle Feld „Gesamtvermögen" (Spaltenname weiterhin „balance",
 * siehe Configuration/TCA/tx_casinoaccount_player.php) mit der Summe der drei
 * Beträge, bevor das Formular gezeichnet wird (CONCEPT.md D.3.2, D.13).
 *
 * Ein „FormDataProvider" ist ein Zulieferer der Formularmaschine: eine kleine
 * Klasse, die das Datenpaket auf dem Weg zum Formular ergänzt. Es ist der
 * dokumentierte Weg, ein Feld zu befüllen, das aus der Datenbank nicht kommen
 * kann — und er ist ausdrücklich KEINE eigene Formularmaschine im Sinn von
 * D.3.5: gezeichnet, geprüft und gespeichert wird weiterhin ausschließlich
 * vom Kern.
 *
 * Bei einem NEUEN Datensatz bleibt es beim Vorgabewert 0 — es gibt noch
 * nichts zu summieren.
 */
final readonly class CurrentBalanceProvider implements FormDataProviderInterface
{
    public function __construct(private PlayerRepository $players) {}

    public function addData(array $result): array
    {
        if (($result['tableName'] ?? '') !== PlayerRepository::TABLE) {
            return $result;
        }
        if (($result['command'] ?? '') !== 'edit') {
            return $result;
        }

        $row = $result['databaseRow'];
        $result['databaseRow']['balance'] =
            (int)($row['balance_cash'] ?? 0)
            + (int)($row['balance_machine'] ?? 0)
            + (int)($row['balance_win'] ?? 0);

        return $result;
    }
}
