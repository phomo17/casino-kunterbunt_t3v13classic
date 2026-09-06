<?php

declare(strict_types=1);

namespace Phomo17\CasinoStartpage\Automat;

/**
 * Die Gattung eines Geräts im Saal (CONCEPT.md C.1 Nr. 1, C.3).
 *
 * Bis Ausbaustufe 2 gab es nur eine Gattung, und deshalb gab es das Wort nicht:
 * jedes Gerät war ein Automat. Ab Teil C beherbergt der Saal zwei Gattungen und
 * zeigt sie gleichrangig — Automaten (die drei bestehenden Geräte-Extensions,
 * darunter der Münzschieber) und Tische (Roulette, Blackjack, Craps).
 *
 * WARUM EIN MERKMAL UND KEINE ZWEITE REGISTRY
 * ===========================================
 * CONCEPT.md C.1 Nr. 1 gibt das wörtlich vor. Eine zweite Registry hätte alles
 * verdoppelt, was heute genau einmal existiert: das Inhaltselement, den
 * DataProcessor, die Backend-Vorschau, die Auswahlliste, das Saal-Raster. Der
 * Unterschied zwischen einem Automaten und einem Tisch ist am Ende genau
 * einer — wie seine Bühne aussieht.
 *
 * WARUM DER WERT EINE ZEICHENKETTE IST
 * ====================================
 * Der Wert wandert unverändert in eine CSS-Klasse (ck-slot--tisch), in ein
 * data-Attribut und in den Gruppenschlüssel der TCA-Auswahlliste. Ein
 * ganzzahliger Enum bräuchte dafür an drei Stellen eine Übersetzungstabelle.
 *
 * WARUM KEIN NEUER NAME FÜR "Automat"
 * ===================================
 * Die Klasse {@see Automat} heißt weiterhin Automat, obwohl sie ab jetzt auch
 * einen Tisch beschreibt. Sie umzubenennen hieße, die ext_localconf.php aller
 * drei vorhandenen Geräte-Extensions anzufassen — darunter die des
 * eingefrorenen Münzschiebers, dessen Entwicklung der Auftraggeber am
 * 2026-09-04 mitten im Umbau eingefroren hat. Ein Rechtschreibgewinn ist
 * keinen Eingriff in eingefrorenen Code wert. Lies "Automat" ab hier als
 * "ein Gerät im Saal".
 */
enum Gattung: string
{
    /** Ein stehendes Gerät: Walzen, Bildschirm, Münzschieber. */
    case Automat = 'automat';

    /** Ein Spieltisch, von oben gesehen: Tuch, Setzfläche, Chips. */
    case Tisch = 'tisch';

    /**
     * Beschriftung der Gattung für das Backend (XLIFF-Verweis).
     *
     * Benannt nach dem Muster getX(), damit Fluid sie über {automat.gattung.label}
     * erreichen kann: der ObjectAccess von Fluid probiert getLabel(), isLabel()
     * und hasLabel(), aber keinen frei benannten Methodennamen.
     */
    public function getLabel(): string
    {
        return 'LLL:EXT:casino_startpage/Resources/Private/Language/locallang_be.xlf:gattung.'
            . $this->value;
    }

    /**
     * Der in Configuration/Icons.php angemeldete Icon-Bezeichner dieser Gattung.
     * Er erscheint in der Auswahlliste des Inhaltselements und im Seitenmodul.
     */
    public function getIcon(): string
    {
        return match ($this) {
            self::Automat => 'content-casino-automat',
            self::Tisch => 'content-casino-tisch',
        };
    }
}
