<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Qr;

/**
 * Zeichnet ein QR-Muster als SVG (CONCEPT.md D.4.3).
 *
 * DIE EINZIGE STELLE IM PROJEKT MIT EINEM AUSGESCHRIEBENEN FARBWERT AUSSERHALB
 * VON tokens.css — und zwar mit genau zweien: #000000 und #ffffff.
 *
 * Warum das keine Nachlässigkeit ist, sondern eine Anforderung:
 *   1. Ein QR-Code wird von einer Kamera gelesen. Er braucht den größtmöglichen
 *      Unterschied zwischen hell und dunkel. Ein Messington aus den
 *      Design-Tokens wäre je nach Licht nicht mehr sicher zu unterscheiden —
 *      der Code wäre schön und unlesbar.
 *   2. Das SVG wird im Browser auf eine Zeichenfläche gelegt, um daraus ein
 *      PNG zu machen (qr-tools.js). Dabei steht es als eigenständiges Bild da
 *      und erbt NICHTS von der Seite. Ein „currentColor" oder eine
 *      CSS-Eigenschaft wäre dort schlicht schwarz-auf-durchsichtig — oder gar
 *      nichts.
 *   3. Der Ausdruck (D.3.4) soll auf jedem Drucker gleich aussehen.
 *
 * Der Prüfstand kennt diese Ausnahme und hält sie eng: er prüft, dass in
 * dieser Datei GENAU diese zwei Werte stehen und kein dritter (Prüfung Q-14).
 */
final readonly class QrSvgRenderer
{
    /**
     * Ruhezone in Modulen. Der Standard verlangt mindestens 4 — ein
     * QR-Code ohne freien Rand ist für viele Lesegeräte unauffindbar, weil
     * sie die äußere Kante nicht mehr finden.
     */
    public const QUIET_ZONE = 4;

    /** Kantenlänge eines Moduls im ausgegebenen Bild, in Bildpunkten. */
    public const MODULE_SIZE = 8;

    private const DARK = '#000000';
    private const LIGHT = '#ffffff';

    /**
     * @param string $label der zugängliche Name — was ein Vorleseprogramm
     *                      sagt, wenn es an das Bild kommt. Ohne ihn wäre der
     *                      Code für einen blinden Bearbeiter ein namenloses
     *                      Etwas.
     */
    public function render(QrMatrix $matrix, string $label): string
    {
        $span = $matrix->size + 2 * self::QUIET_ZONE;
        $pixel = $span * self::MODULE_SIZE;
        $titleId = 'ca-qr-title';

        // Alle dunklen Module in EINEM Pfad. Ein Pfad mit 700 kurzen Befehlen
        // ist kleiner und schneller als 700 einzelne Rechtecke — und beim
        // Drucken entsteht keine hauchdünne helle Linie zwischen benachbarten
        // Rechtecken.
        $path = [];
        for ($y = 0; $y < $matrix->size; $y++) {
            for ($x = 0; $x < $matrix->size; $x++) {
                if ($matrix->isDark($x, $y)) {
                    $path[] = 'M' . ($x + self::QUIET_ZONE) . ' ' . ($y + self::QUIET_ZONE) . 'h1v1h-1z';
                }
            }
        }

        return '<svg xmlns="http://www.w3.org/2000/svg"'
            . ' class="ca-qr__image"'
            . ' data-ca-qr'
            . ' width="' . $pixel . '" height="' . $pixel . '"'
            . ' viewBox="0 0 ' . $span . ' ' . $span . '"'
            . ' role="img" aria-labelledby="' . $titleId . '"'
            . ' shape-rendering="crispEdges">'
            . '<title id="' . $titleId . '">' . htmlspecialchars($label, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '</title>'
            . '<rect width="' . $span . '" height="' . $span . '" fill="' . self::LIGHT . '"/>'
            . '<path d="' . implode('', $path) . '" fill="' . self::DARK . '"/>'
            . '</svg>';
    }
}
