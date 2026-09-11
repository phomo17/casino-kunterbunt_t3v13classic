<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use TYPO3\CMS\Core\Registry;

/**
 * Der Schalter „QR-Modus" (CONCEPT.md D.5).
 *
 * AUS heißt: alles verhält sich wie nach Teil C — Guthaben im Browserspeicher,
 * keine Anmeldung, keine Sperren. AN heißt: D.6 bis D.9 gelten.
 *
 * WARUM DIE REGISTRY UND KEINE EIGENE TABELLE: D.5 verlangt es wörtlich, und
 * es ist ein einzelner Wert. Der Namensraum ist derselbe, unter dem seit
 * Umsetzungsstück Dc bereits die Nummer des Kontenordners und der
 * Benutzergruppe liegen (AccountStorage::REGISTRY_NAMESPACE) — drei Werte
 * derselben Extension gehören unter dasselbe Dach.
 *
 * WARUM EINE EIGENE KLASSE FÜR EINEN WAHRHEITSWERT: weil ihn ab D2 fünf
 * Stellen lesen (drei Middlewares, das Modul, der Prüfstand). Stünde der
 * Schlüssel dort jeweils als Zeichenkette, wäre ein Tippfehler ein stiller
 * Ausfall des ganzen Zugriffsschutzes — die Registry antwortet auf einen
 * unbekannten Schlüssel mit dem Vorgabewert, nicht mit einem Fehler.
 *
 * KOSTEN: Registry::get() liest die Tabelle sys_registry EINMAL je Anfrage und
 * hält sie danach im Arbeitsspeicher (TYPO3\CMS\Core\Registry::loadEntriesByNamespace).
 * Der Zugriffsschutz kostet damit eine Abfrage je Seitenaufruf, nicht eine je
 * Aufruf dieser Methode.
 */
final readonly class QrMode
{
    public const NAMESPACE = AccountStorage::REGISTRY_NAMESPACE;
    public const KEY = 'qrMode';

    public function __construct(private Registry $registry) {}

    public function isOn(): bool
    {
        return (bool)$this->registry->get(self::NAMESPACE, self::KEY, false);
    }

    /**
     * Schaltet ein oder aus.
     *
     * Der Rückgabewert sagt, ob sich etwas geändert hat — das Modul meldet
     * sonst „eingeschaltet", obwohl es schon an war (zwei Fenster, zweimal
     * geklickt).
     */
    public function set(bool $on): bool
    {
        $before = $this->isOn();
        $this->registry->set(self::NAMESPACE, self::KEY, $on);
        return $before !== $on;
    }
}
