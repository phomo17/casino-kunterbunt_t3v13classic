<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Qr;

/**
 * Erzeugt aus einem Text ein QR-Muster.
 *
 * Genau eine Methode. Das ist die Bruchstelle, an der sich die Umsetzung
 * austauschen lässt, ohne einen einzigen Aufrufer anzufassen — dieselbe
 * Bauart, mit der credit.js im Frontend die Kasse hinter einer schmalen
 * Schnittstelle hält.
 *
 * Warum das hier wichtig ist: heute erzeugt BaconQrCodeFactory das Muster,
 * die Bibliothek dahinter bringt der TYPO3-Kern mit. Sollte eine künftige
 * TYPO3-Fassung sie nicht mehr mitbringen, tritt an ihre Stelle eine zweite
 * Umsetzung dieser Schnittstelle und EINE Zeile in Services.yaml.
 */
interface QrCodeFactory
{
    /**
     * @throws \RuntimeException wenn kein Muster erzeugt werden kann. Nie
     *                           still fehlschlagen: ein leeres Bild sähe aus
     *                           wie ein Ladefehler, und niemand käme auf die
     *                           Ursache.
     */
    public function create(string $content): QrMatrix;
}
