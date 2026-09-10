<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Qr;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;

/**
 * Erzeugt das QR-Muster mit der Bibliothek, die der TYPO3-Kern ohnehin
 * mitbringt (CONCEPT.md D.4.3, Abweichung begründet in DECISIONS.md).
 *
 *   „bacon/bacon-qr-code": "^3.0"
 *   typo3_src/typo3/sysext/core/composer.json:34 — harte Abhängigkeit von
 *   typo3/cms-core, benutzt vom Kern selbst für den QR-Code der
 *   Zwei-Faktor-Anmeldung (TotpProvider::getSvgQrCode()).
 *
 * Es wird NICHTS nachgeladen und NICHTS installiert. Die composer.json und
 * die ext_emconf.php dieser Extension nennen die Bibliothek nicht — sie ist
 * schon da, weil TYPO3 da ist.
 *
 * FEHLERKORREKTURSTUFE Q, BYTE-MODUS, VERSION AUTOMATISCH.
 * Q verlangt CONCEPT.md D.4.3. Den Byte-Modus wählt die Bibliothek von
 * selbst, weil eine Adresse Buchstaben, Ziffern und Sonderzeichen mischt. Die
 * Version — also die Größe — wählt sie nach der Länge; das Konzept schätzt
 * „Version 5 bis 6", tatsächlich sind es bei der Adresse dieses Hauses
 * 92 Zeichen und damit Version 8 (49 × 49 Module). Die Schätzung im Konzept
 * ist damit überholt, das Ergebnis aber genau das gewünschte: ein Code, der
 * so klein ist, wie er sein kann.
 *
 * ISO-8859-1 ALS ZEICHENSATZ. Das ist die Voreinstellung der Bibliothek und
 * die richtige Wahl: die Adresse besteht ausschließlich aus Zeichen, die in
 * jedem Zeichensatz gleich sind. Bei einer anderen Angabe stellte die
 * Bibliothek dem Code eine zusätzliche Zeichensatz-Kennung voran, die
 * manche Lesegeräte nicht verstehen — der Kommentar in der Bibliothek sagt
 * das selbst (Encoder.php:55).
 */
final readonly class BaconQrCodeFactory implements QrCodeFactory
{
    public function create(string $content): QrMatrix
    {
        // Zwei laute Riegel statt eines stillen Fehlschlags. Beide können nur
        // greifen, wenn sich die Umgebung unter uns verändert hat — und genau
        // dann muss man es sofort und im Klartext erfahren.
        if (!class_exists(Encoder::class)) {
            throw new \RuntimeException(
                'Die Bibliothek bacon/bacon-qr-code ist nicht auffindbar. Sie ist eine harte '
                . 'Abhängigkeit von typo3/cms-core (typo3/sysext/core/composer.json) und sollte '
                . 'unter typo3_src/vendor/bacon/bacon-qr-code/ liegen. Ohne sie lässt sich kein '
                . 'QR-Code erzeugen.',
                1757000002
            );
        }
        if (!function_exists('iconv')) {
            throw new \RuntimeException(
                'Die PHP-Erweiterung „iconv" fehlt. bacon/bacon-qr-code braucht sie zum Umkodieren '
                . 'des Inhalts (Encoder.php:616). Ohne sie lässt sich kein QR-Code erzeugen.',
                1757000003
            );
        }

        $qrCode = Encoder::encode(
            $content,
            ErrorCorrectionLevel::Q(),
            Encoder::DEFAULT_BYTE_MODE_ENCODING
        );

        $byteMatrix = $qrCode->getMatrix();
        $size = $byteMatrix->getWidth();

        $modules = [];
        for ($y = 0; $y < $size; $y++) {
            $row = [];
            for ($x = 0; $x < $size; $x++) {
                $row[] = $byteMatrix->get($x, $y) === 1;
            }
            $modules[] = $row;
        }

        return new QrMatrix(
            modules: $modules,
            size: $size,
            version: $qrCode->getVersion()->getVersionNumber(),
            mask: $qrCode->getMaskPattern(),
            ecLevel: 'Q',
        );
    }
}
