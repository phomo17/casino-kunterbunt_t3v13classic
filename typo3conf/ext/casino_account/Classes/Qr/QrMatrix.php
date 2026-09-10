<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Qr;

/**
 * Ein fertiger QR-Code als reines Muster aus hellen und dunklen Feldern.
 *
 * Ein QR-Code ist im Kern nichts als ein Quadrat aus kleinen Quadraten. Ein
 * einzelnes davon heißt „Modul". Diese Klasse hält genau das — und weiß
 * nichts davon, wie daraus ein Bild wird. Das ist Absicht: der Erzeuger
 * (BaconQrCodeFactory) und der Zeichner (QrSvgRenderer) haben dadurch nichts
 * miteinander zu tun und lassen sich einzeln austauschen und einzeln prüfen.
 *
 *   $size     Kantenlänge in Modulen. Immer 4 × Version + 17.
 *             Version 8 → 49 × 49.
 *   $version  1 bis 40. Je höher, desto mehr passt hinein.
 *   $mask     0 bis 7. Welches der acht Störmuster über die Daten gelegt
 *             wurde, damit keine großen einfarbigen Flächen entstehen, an
 *             denen ein Lesegerät sich verschluckt.
 *   $ecLevel  Fehlerkorrekturstufe. „Q" heißt: rund ein Viertel des Codes
 *             darf zerkratzt sein, er ist immer noch lesbar (CONCEPT.md
 *             D.4.3).
 */
final readonly class QrMatrix
{
    /**
     * @param list<list<bool>> $modules Zeile für Zeile, true = dunkel
     */
    public function __construct(
        public array $modules,
        public int $size,
        public int $version,
        public int $mask,
        public string $ecLevel,
    ) {}

    public function isDark(int $x, int $y): bool
    {
        return $this->modules[$y][$x] ?? false;
    }

    /**
     * Das Muster als Zeilen aus „0" und „1" — die Form, in der es das
     * Prüfskript einliest.
     *
     * @return list<string>
     */
    public function toRows(): array
    {
        return array_map(
            static fn(array $row): string => implode('', array_map(
                static fn(bool $dark): string => $dark ? '1' : '0',
                $row
            )),
            $this->modules
        );
    }
}
