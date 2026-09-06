<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Automat;

/**
 * Ein bei der Registry angemeldetes Gerät des Saals — ein Automat oder ein Tisch.
 *
 * Der Klassenname stammt aus Teil A, als es nur Automaten gab. Er bleibt, weil
 * eine Umbenennung die ext_localconf.php aller Geräte-Extensions anfassen
 * müsste, darunter die des eingefrorenen Münzschiebers. Siehe {@see Gattung}.
 *
 * Unveränderliches Datenobjekt. Eine Automaten-Extension erzeugt genau eine
 * Instanz davon in ihrer ext_localconf.php und übergibt sie an
 * {@see AutomatRegistry::register()}.
 *
 * Felder:
 *
 * - identifier     Stabiler Schlüssel, der im Backend-Datensatz gespeichert wird.
 *                  Nur Kleinbuchstaben, Ziffern und Unterstriche, höchstens 64
 *                  Zeichen (Breite der Spalte tt_content.tx_casinostartpage_automat).
 *                  Darf sich nach der Veröffentlichung nie mehr ändern, sonst
 *                  zeigen bestehende Inhaltselemente ins Leere.
 * - title          Name des Automaten. Entweder Klartext oder eine LLL-Referenz
 *                  auf eine XLIFF-Datei der Automaten-Extension.
 * - description    Kurzbeschreibung für die Backend-Auswahlliste. Darf leer sein.
 * - extensionKey   Extension-Key des Automaten. Daraus leitet die Registry das
 *                  Partial-Verzeichnis ab, siehe cabinetPartialRootPath().
 * - cabinetPartial Name des Fluid-Partials, das das Gehäuse im Saal zeichnet,
 *                  relativ zu cabinetPartialRootPath() und ohne Dateiendung.
 *                  Der Name muss extensionsweit eindeutig sein — deshalb immer
 *                  in einen eigenen Unterordner legen, z. B.
 *                  "Automat/MeinAutomat/Cabinet".
 * - gattung        Automat oder Tisch (CONCEPT.md C.1 Nr. 1). Freiwillig; ohne
 *                  Angabe ein Automat, damit die vor Teil C angemeldeten Geräte
 *                  unverändert weiterlaufen. Die Gattung entscheidet allein
 *                  darüber, wie der Saal die Bühne des Geräts baut und in
 *                  welcher Gruppe es in der Backend-Auswahlliste steht.
 *
 * Das Partial bekommt beim Rendern zwei Variablen:
 * {automat} — diese Instanz, {data} — der tt_content-Datensatz als Array.
 */
final readonly class Automat
{
    public function __construct(
        public string $identifier,
        public string $title,
        public string $description,
        public string $extensionKey,
        public string $cabinetPartial,
        public Gattung $gattung = Gattung::Automat,
    ) {
        if (preg_match('/^[a-z0-9_]{1,64}$/', $identifier) !== 1) {
            throw new \InvalidArgumentException(
                'Der Automaten-Schlüssel "' . $identifier . '" ist ungültig. '
                . 'Erlaubt sind nur Kleinbuchstaben, Ziffern und Unterstriche, '
                . 'höchstens 64 Zeichen (Breite der Spalte '
                . 'tt_content.tx_casinostartpage_automat).',
                1788220801
            );
        }
        if (preg_match('/^[a-z0-9_]+$/', $extensionKey) !== 1) {
            throw new \InvalidArgumentException(
                'Der Extension-Key "' . $extensionKey . '" des Automaten "' . $identifier . '" ist ungültig.',
                1788220802
            );
        }
        if (trim($title) === '') {
            throw new \InvalidArgumentException(
                'Der Automat "' . $identifier . '" braucht einen Namen.',
                1788220803
            );
        }
        if (trim($cabinetPartial) === '') {
            throw new \InvalidArgumentException(
                'Der Automat "' . $identifier . '" braucht ein Partial für die Saal-Ansicht.',
                1788220804
            );
        }
    }

    /**
     * Verzeichnis, in dem der Saal das Gehäuse-Partial dieses Automaten sucht.
     * Feste Konvention, damit sich eine Automaten-Extension mit einem einzigen
     * Aufruf anmelden kann.
     */
    public function cabinetPartialRootPath(): string
    {
        return 'EXT:' . $this->extensionKey . '/Resources/Private/Partials/';
    }
}
