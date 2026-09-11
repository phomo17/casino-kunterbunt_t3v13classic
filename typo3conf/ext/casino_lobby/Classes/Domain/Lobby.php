<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Domain;

/**
 * Eine Lobby, so wie sie aus der Datenbank kommt (CONCEPT.md D.10, D.13).
 *
 * Ein unveränderliches Datenobjekt — dieselbe Bauart wie Player in
 * casino_account; ein array würde überall Tippfehler in Spaltennamen
 * erlauben. Geschrieben wird sie ausschließlich über LobbyRepository.
 */
final readonly class Lobby
{
    public function __construct(
        public int $uid,
        public string $game,
        public int $seatsMax,
        public string $state,
        public int $stateUntil,
        public int $revision,
        public int $roundNo,
        public string $seed,
        public string $result,
        public int $owner,
        public int $turnSeat,
        public string $moves,
    ) {}

    /**
     * Baut das Objekt aus einer Datenbankzeile.
     *
     * @param array<string, mixed> $zeile
     */
    public static function fromRow(array $zeile): self
    {
        return new self(
            uid: (int)$zeile['uid'],
            game: (string)$zeile['game'],
            seatsMax: (int)$zeile['seats_max'],
            state: (string)$zeile['state'],
            stateUntil: (int)$zeile['state_until'],
            revision: (int)$zeile['revision'],
            roundNo: (int)$zeile['round_no'],
            seed: (string)$zeile['seed'],
            result: (string)$zeile['result'],
            owner: (int)$zeile['owner'],
            turnSeat: (int)($zeile['turn_seat'] ?? 0),
            moves: (string)($zeile['moves'] ?? ''),
        );
    }

    /**
     * Verbleibende Millisekunden bis zum Zustandsende; 0 = keine Uhr.
     *
     * MILLISEKUNDEN UND NICHT DER ZEITSTEMPEL SELBST: die Antwort des
     * Abfrageendpunkts (D4b) darf sich nicht auf die Uhr des Browsers
     * verlassen — eine Restdauer ist unabhängig davon, eine absolute Zeit
     * nicht (siehe Plan, Abschnitt 9: „Absoluter Zeitstempel … verworfen").
     */
    public function restMs(int $jetzt): int
    {
        return $this->stateUntil > 0 ? max(0, ($this->stateUntil - $jetzt) * 1000) : 0;
    }

    /**
     * Die Rundennummer, zu der das festgeschriebene Ergebnis gehört, und die
     * Nutzlast ohne diese Nummer.
     *
     * SEIT D5 IST `result` RUNDENMARKIERT: "<runde>-<nutzlast>", zum Beispiel
     * "17-4_3_so_0". Grund: das Ergebnis wird NICHT MEHR zu Rundenbeginn
     * geleert, weil ein Browser, der mitten in einer Craps-Serie dazukommt
     * oder eine Runde verpasst hat (Registerkarte im Hintergrund), sonst den
     * geltenden Point nicht erfahren könnte — und mit einem falschen Point
     * seine eigenen Place-Einsätze falsch abrechnete. Das ist ein GELDFEHLER
     * der stummen Sorte, deshalb steht die Nummer davor: ohne sie wüsste
     * niemand, ob das gespeicherte Ergebnis zur laufenden oder zur vorigen
     * Runde gehört.
     *
     * @return array{runde: int, wert: string}
     */
    public function ergebnis(): array
    {
        if ($this->result === '') {
            return ['runde' => 0, 'wert' => ''];
        }
        $teile = explode('-', $this->result, 2);
        return ['runde' => (int)$teile[0], 'wert' => $teile[1] ?? ''];
    }
}
