<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Service;

use Phomo17\CasinoAccount\Domain\PlayerRepository;
use TYPO3\CMS\Core\Session\SessionManager;

/**
 * Die Antwort auf drei Fragen, die D.5 stellt: Wer ist gerade angemeldet?
 * Wie viele sind es? Wie werfe ich alle hinaus, ohne einem Backend-Benutzer
 * die Sitzung zu zerstören?
 *
 * WAS „ANGEMELDET" HEISST: die Sitzungstabelle des Kerns (fe_sessions) —
 * die TATSACHE, dass es eine nicht abgelaufene Sitzung gibt, die auf den
 * Schattendatensatz dieser Person zeigt. NICHT tx_casinoaccount_player.last_seen
 * (das ist die BEOBACHTUNG „zuletzt gesehen"). Eine Person, die ihren
 * Bildschirm zehn Minuten nicht angefasst hat, ist trotzdem angemeldet — sie
 * sitzt am Gerät. Nach last_seen wäre sie nach 30 Sekunden „weg", und „Alle
 * abmelden" hätte für sie nichts zu tun, obwohl ihre Sitzung weiterläuft.
 * last_seen bleibt und bekommt seine richtige Bedeutung: „zuletzt gesehen".
 *
 * WARUM FREMDE SITZUNGEN SICHER SIND. TYPO3 führt zwei getrennte
 * Sitzungsablagen: 'FE' (Tabelle fe_sessions) und 'BE' (be_sessions).
 * SessionManager::getSessionBackend('FE') liefert ausschließlich die erste.
 * Eine Backend-Sitzung kann diese Klasse gar nicht erreichen — nicht, weil
 * wir aufpassen, sondern weil wir die andere Ablage nie in die Hand bekommen.
 * Das Vorgehen (getAll(), dann remove($session['ses_id'])) ist zeichengleich
 * das, was der Kern in SessionManager::invalidateAllSessionsByUserId() selbst
 * tut; DatabaseSessionBackend::remove() nimmt die Kennung sowohl gehasht als
 * auch roh entgegen, deshalb passt der Wert aus getAll() unmittelbar.
 */
final readonly class PlayerSessionService
{
    public function __construct(
        private SessionManager $sessionManager,
        private ShadowUserService $shadowUsers,
        private PlayerRepository $players,
        private AccountBookkeeper $bookkeeper,
    ) {}

    /**
     * Die Nummern aller Spielenden mit einer gültigen Sitzung.
     *
     * ABGELAUFENE SITZUNGEN ZÄHLEN NICHT MIT. Der Kern räumt fe_sessions erst
     * beim Müllsammeln auf (mit Wahrscheinlichkeit, nicht immer). Eine Zeile
     * in der Tabelle ist deshalb kein Beweis. Gerechnet wird wie im Kern:
     * ses_tstamp + $GLOBALS['TYPO3_CONF_VARS']['FE']['sessionTimeout'] > jetzt.
     *
     * @return list<int> Nummern aus tx_casinoaccount_player
     */
    public function loggedInPlayerUids(): array
    {
        return array_values($this->shadowUsers->playersForUsers($this->activeFeUserUids()));
    }

    public function countLoggedIn(): int
    {
        return count($this->loggedInPlayerUids());
    }

    /**
     * „Alle abmelden" (D.5) — mit der Buchung aus D.8.
     *
     * Reihenfolge ist bindend: erst buchen, dann die Sitzung entfernen. Wer
     * zuerst die Sitzung wegwirft, verliert die Zuordnung und damit das Geld.
     *
     * @return int wie viele Sitzungen beendet wurden
     */
    public function logoutAll(): int
    {
        $backend = $this->sessionManager->getSessionBackend('FE');

        $beendet = 0;
        foreach ($this->activeSessions() as $session) {
            $feUserUid = (int)($session['ses_userid'] ?? 0);
            if ($feUserUid > 0) {
                $playerUid = $this->shadowUsers->playersForUsers([$feUserUid])[$feUserUid] ?? 0;
                if ($playerUid > 0) {
                    $this->bookkeeper->bookDeviceMoneyToCash($playerUid);
                }
            }
            $backend->remove((string)($session['ses_id'] ?? ''));
            $beendet++;
        }
        return $beendet;
    }

    /**
     * Räumt liegengebliebenes Gerätegeld auf.
     *
     * D.8 verlangt dieselbe Buchung auch dann, wenn „eine Sitzung von selbst
     * abläuft". Für diesen Fall gibt es kein Ereignis — eine abgelaufene
     * Sitzung meldet sich bei niemandem. Deshalb dieser wiederholbare
     * Aufräumgang: jeder Spielende mit balance_machine + balance_win > 0, der
     * gerade KEINE gültige Sitzung hat, wird ausgezahlt.
     *
     * Gerufen an drei Stellen, alle im Backend, keine im heißen Weg des
     * Frontends: beim Öffnen des Moduls „QR-Modus", bei „Alle abmelden" und
     * beim AUSSCHALTEN des Modus.
     *
     * In D2 ist diese Methode fast immer wirkungslos — die drei Beträge
     * werden erst in D3 bespielt, und der Backend-Hook setzt Gerätekredit und
     * Gewinnspeicher beim Speichern ohnehin auf 0. Sie wird trotzdem jetzt
     * gebaut, weil D.8 zu D2b gehört und weil sie in D3 sonst nachträglich in
     * fertigen Code eingezogen werden müsste. Sie ist wiederholbar und tut
     * nichts, wenn nichts zu tun ist.
     *
     * @return int wie viele Konten ausgezahlt wurden
     */
    public function reconcile(): int
    {
        $angemeldet = array_flip($this->activeFeUserUids());

        $ausgezahlt = 0;
        foreach ($this->players->findWithOpenDeviceMoney() as $player) {
            if (isset($angemeldet[$player->feUser])) {
                continue; // hat noch eine gültige Sitzung — nichts anzufassen
            }
            if ($this->bookkeeper->bookDeviceMoneyToCash($player->uid)) {
                $ausgezahlt++;
            }
        }
        return $ausgezahlt;
    }

    /**
     * Alle Sitzungen aus fe_sessions, die gerade noch gültig sind.
     *
     * @return list<array<string, mixed>>
     */
    private function activeSessions(): array
    {
        $now = (int)($GLOBALS['EXEC_TIME'] ?? time());
        $timeout = (int)($GLOBALS['TYPO3_CONF_VARS']['FE']['sessionTimeout'] ?? 0);

        $sessions = [];
        foreach ($this->sessionManager->getSessionBackend('FE')->getAll() as $session) {
            $tstamp = (int)($session['ses_tstamp'] ?? 0);
            if ($tstamp + $timeout > $now) {
                $sessions[] = $session;
            }
        }
        return $sessions;
    }

    /**
     * Die fe_users-Nummern hinter allen gültigen Sitzungen, ohne Wiederholung.
     *
     * @return list<int>
     */
    private function activeFeUserUids(): array
    {
        $uids = [];
        foreach ($this->activeSessions() as $session) {
            $feUserUid = (int)($session['ses_userid'] ?? 0);
            if ($feUserUid > 0) {
                $uids[] = $feUserUid;
            }
        }
        return array_values(array_unique($uids));
    }
}
