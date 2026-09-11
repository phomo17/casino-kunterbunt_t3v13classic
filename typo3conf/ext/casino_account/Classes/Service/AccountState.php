<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\CoinFieldRepository;
use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Middleware\BookingEndpoint;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Site\Entity\Site;

/**
 * Baut den Zustandsblock (CONCEPT.md D.7.2, „Server ist die alleinige
 * Wahrheit", B.5.3 „Lesen synchron").
 *
 * Eine eigene Klasse, weil sie von der Kontenleiste (AccountBar) UND vom
 * Endpunkt (BookingEndpoint, für /casino-konto/stand) gebraucht wird und in
 * einer Middleware nichts verloren hat.
 */
final readonly class AccountState
{
    public function __construct(
        private CoinFieldRepository $coinFields,
        private BookingService $bookings,
    ) {}

    /**
     * Der Zustandsblock, unmittelbar hinter <head> in die fertige Antwort
     * eingespeist (siehe AccountBar).
     *
     * KEIN NAME, KEINE KENNUNG, KEINE ROLLE. D.9: Kennungen erscheinen nie im
     * Seitenquelltext. Der Name steht sichtbar in der Leiste, aber nicht
     * zusätzlich hier — was doppelt dasteht, geht doppelt auseinander.
     *
     * @return array{endpunkte: array{buchung: string, stand: string, feld: string},
     *               kasse: int, geraet: int, gewinn: int, gesamt: int,
     *               admin: bool, max: int, speicher: array<string, string>}
     */
    public function forPlayer(Player $player, ServerRequestInterface $request): array
    {
        $site = $request->getAttribute('site');
        $basis = $site instanceof Site ? rtrim((string)$site->getBase(), '/') : '';

        return [
            'endpunkte' => [
                'buchung' => $basis . BookingEndpoint::PFAD_BUCHUNG,
                'stand'   => $basis . BookingEndpoint::PFAD_STAND,
                'feld'    => $basis . BookingEndpoint::PFAD_FELD,
            ],
            'kasse'  => $player->balanceCash,
            'geraet' => $player->balanceMachine,
            'gewinn' => $player->balanceWin,
            'gesamt' => $player->total(),
            'admin'  => $player->isAdmin,
            'max'    => BookingService::MAX,
            'speicher' => $this->coinFields->allForPlayer($player->uid),
        ];
    }
}
