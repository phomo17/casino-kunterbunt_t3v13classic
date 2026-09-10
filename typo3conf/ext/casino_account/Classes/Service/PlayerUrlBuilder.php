<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use TYPO3\CMS\Core\Site\Entity\Site;
use TYPO3\CMS\Core\Site\SiteFinder;

/**
 * Baut die Adresse, die auf dem QR-Code steht (CONCEPT.md D.4.2):
 *
 *     https://<host>/?casinoToken=<Kennung>
 *
 * Die Grundadresse kommt aus der Site-Verwaltung des Kerns, NICHT aus einer
 * fest eingetragenen Zeichenkette. Zieht das Haus eines Tages auf einen
 * richtigen Server um, ändert der Auftraggeber eine Zeile in
 * typo3conf/sites/casino-kunterbunt/config.yaml — und jeder neu erzeugte
 * Code zeigt auf die neue Adresse, ohne dass hier etwas anzufassen wäre.
 *
 * WARUM DIE KENNUNG NICHT UMSCHRIEBEN WIRD: sie besteht ausschließlich aus
 * A–Z, a–z, 0–9, „-" und „_" (PlayerTokenGenerator). Diese Zeichen haben in
 * einer Internetadresse keine Sonderbedeutung. Ein urlencode() wäre wirkungslos
 * und würde nur verschleiern, dass hier nichts zu tun ist. Der Prüfstand hält
 * das ausdrücklich fest (Q-13).
 *
 * DER PARAMETERNAME „casinoToken" IST FEST. D2 liest ihn wieder aus; er steht
 * deshalb als Konstante hier und nicht als Text an zwei Stellen.
 */
final readonly class PlayerUrlBuilder
{
    public const PARAMETER = 'casinoToken';

    public function __construct(private SiteFinder $siteFinder) {}

    public function forToken(string $token): string
    {
        return $this->baseUrl() . '/?' . self::PARAMETER . '=' . $token;
    }

    /**
     * Die Grundadresse ohne Schrägstrich am Ende.
     *
     * Gibt es mehrere Sites, gewinnt die mit der kleinsten Wurzelseite —
     * dieselbe Regel wie in AccountStorage, damit Ordner und Adresse nie
     * auseinanderlaufen. Dieses Haus hat genau eine Site.
     */
    private function baseUrl(): string
    {
        $sites = $this->siteFinder->getAllSites();
        if ($sites === []) {
            throw new \RuntimeException(
                'Es ist keine Site eingerichtet. Ohne Site gibt es keine Adresse, auf die ein '
                . 'QR-Code zeigen könnte.',
                1757000004
            );
        }
        usort($sites, static fn(Site $a, Site $b): int => $a->getRootPageId() <=> $b->getRootPageId());
        return rtrim((string)$sites[0]->getBase(), '/');
    }
}
