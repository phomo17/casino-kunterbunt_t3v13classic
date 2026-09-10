<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\PlayerRepository;

/**
 * Erzeugt und vergleicht Kennungen (CONCEPT.md D.4.2).
 *
 * 32 BYTE. Das sind 256 Bit Zufall. Zum Vergleich: die Wahrscheinlichkeit,
 * dass zwei Kennungen zufällig gleich werden, ist kleiner als die
 * Wahrscheinlichkeit, dass zwei Menschen denselben Fingerabdruck haben —
 * um viele Größenordnungen. Trotzdem fragt generate() vor der Rückgabe die
 * Datenbank; Größenordnungen sind kein Beweis, und die Abfrage kostet nichts.
 *
 * random_bytes() UND NICHT rand(). random_bytes() holt den Zufall vom
 * Betriebssystem und ist für Sicherheitszwecke gebaut. rand() und mt_rand()
 * sind vorhersagbar, wenn man genug Werte gesehen hat — wer die vorhersagen
 * kann, kann sich als eine andere Person anmelden.
 *
 * BASE64 IN DER URL-TAUGLICHEN FASSUNG. Gewöhnliches Base64 benutzt „+" und
 * „/" und füllt mit „=" auf. Alle drei Zeichen haben in einer Internetadresse
 * eine eigene Bedeutung und müssten umschrieben werden. Die URL-taugliche
 * Fassung benutzt stattdessen „-" und „_" und füllt nicht auf. 32 Byte
 * ergeben damit genau 43 Zeichen aus dem Vorrat A–Z a–z 0–9 - _ , und die
 * Adresse braucht keine einzige Umschreibung.
 */
final readonly class PlayerTokenGenerator
{
    /** Zufallsbytes je Kennung. */
    public const BYTES = 32;

    /** Länge der fertigen Kennung in Zeichen. 32 Byte → 43 Zeichen. */
    public const LENGTH = 43;

    /** Sicherheitsnetz gegen eine Endlosschleife, falls je etwas klemmt. */
    private const MAX_ATTEMPTS = 8;

    public function __construct(private PlayerRepository $players) {}

    /**
     * Eine neue, noch nie vergebene Kennung.
     *
     * @throws \RuntimeException wenn nach MAX_ATTEMPTS Versuchen keine freie
     *                           Kennung entstanden ist. Das kann praktisch
     *                           nicht vorkommen; träte es doch ein, wäre der
     *                           Zufallsgenerator kaputt — und dann ist ein
     *                           lauter Abbruch das einzig Richtige.
     */
    public function generate(): string
    {
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $token = self::encode(random_bytes(self::BYTES));
            if (!$this->players->tokenExists($token)) {
                return $token;
            }
        }
        throw new \RuntimeException(
            'Nach ' . self::MAX_ATTEMPTS . ' Versuchen keine freie Kennung erzeugt. '
            . 'Das deutet auf einen kaputten Zufallsgenerator hin.',
            1757000001
        );
    }

    /**
     * Vergleicht zwei Kennungen.
     *
     * hash_equals() UND NICHT „===". Ein gewöhnlicher Vergleich hört beim
     * ersten abweichenden Zeichen auf. Wer die Zeit misst, kann daran ablesen,
     * wie viele Zeichen am Anfang gestimmt haben, und die Kennung Zeichen für
     * Zeichen erraten. hash_equals() braucht immer gleich lang.
     *
     * Gebraucht wird die Methode erst in D2. Sie steht hier, weil sie zur
     * Kennung gehört und nicht daneben — CONCEPT.md D.4.2 verlangt sie
     * ausdrücklich.
     */
    public function equals(string $known, string $given): bool
    {
        return hash_equals($known, $given);
    }

    /** Rohe Bytes → URL-taugliches Base64 ohne Auffüllzeichen. */
    public static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    /**
     * Sieht diese Zeichenfolge überhaupt wie eine Kennung aus?
     *
     * Nützlich ab D2, um offensichtlichen Unsinn abzuweisen, bevor die
     * Datenbank gefragt wird.
     */
    public static function looksValid(string $candidate): bool
    {
        return strlen($candidate) === self::LENGTH
            && preg_match('/\A[A-Za-z0-9_-]{' . self::LENGTH . '}\z/', $candidate) === 1;
    }
}
