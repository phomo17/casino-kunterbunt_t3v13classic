<?php

declare(strict_types=1);

namespace Phomo17\CasinoLobby\Service;

use Phomo17\CasinoLobby\Domain\LobbyRepository;
use Phomo17\CasinoLobby\Domain\Seat;
use Phomo17\CasinoLobby\Lobby\LobbyGames;
use Phomo17\CasinoLobby\Middleware\LobbyEndpoint;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Site\Entity\Site;

/**
 * Baut den Zustandsblock (CONCEPT.md D.7.2 „Server ist die alleinige
 * Wahrheit", B.5.3 „Lesen synchron"), unmittelbar hinter dem öffnenden
 * <head> in die fertige Antwort eingespeist (siehe LobbyTable) beziehungsweise
 * in den Kopf der Übersichtsseite gerendert (siehe LobbyOverviewPage).
 *
 * Eine eigene Klasse, weil sie von BEIDEN gebraucht wird und in einer
 * Middleware nichts verloren hat — dieselbe Aufteilung wie AccountState in
 * casino_account.
 */
final readonly class LobbyState
{
    /** Takt am Tisch: eine Abfrage je Sekunde (D.10.5, Entscheidung 4.0.2). */
    public const TAKT_MS = 1000;

    /** Takt in der Übersicht: eine Abfrage alle drei Sekunden. */
    public const TAKT_UEBERSICHT_MS = 3000;

    public function __construct(private LobbyRepository $lobbies) {}

    /**
     * KEIN NAME, KEINE KENNUNG, KEINE ROLLE (D.9) — dieselbe Regel wie
     * AccountState::forPlayer(). Die Namen der Mitspieler stehen sichtbar in
     * der Platzleiste (D4c), nicht zusätzlich hier.
     *
     * @return array{endpunkte: array{stand:string, uebersicht:string, handlung:string},
     *               spiel:string, lobby:int, platz:int, max:int, melder:bool,
     *               takt:int, taktUebersicht:int, frist:int}
     */
    public function forSeat(string $spiel, ?Seat $platz, ServerRequestInterface $request): array
    {
        $site = $request->getAttribute('site');
        $basis = $site instanceof Site ? rtrim((string)$site->getBase(), '/') : '';

        $melder = false;
        if ($platz !== null) {
            $sitzende = $this->lobbies->seatsOf($platz->lobby);
            $nummern = array_map(static fn (Seat $s) => $s->seatNo, $sitzende);
            $melder = $nummern !== [] && $platz->seatNo === min($nummern);
        }

        return [
            'endpunkte' => [
                'stand' => $basis . LobbyEndpoint::PFAD_STAND,
                'uebersicht' => $basis . LobbyEndpoint::PFAD_UEBERSICHT,
                'handlung' => $basis . LobbyEndpoint::PFAD_HANDLUNG,
            ],
            'spiel' => $spiel,
            'lobby' => $platz?->lobby ?? 0,
            'platz' => $platz?->seatNo ?? 0,
            'max' => LobbyGames::plaetze($spiel),
            'melder' => $melder,
            'takt' => self::TAKT_MS,
            'taktUebersicht' => self::TAKT_UEBERSICHT_MS,
            'frist' => RoundClock::FRIST,
        ];
    }
}
