<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\EventListener;

use Phomo17\CasinoAccount\Service\AccountBookkeeper;
use Phomo17\CasinoAccount\Service\ShadowUserService;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Authentication\Event\BeforeUserLogoutEvent;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

/**
 * Erfüllt D.8: „Beim Abmelden werden Gerätekredit und Gewinnspeicher
 * vollständig in die Kasse gebucht." Der Kern löst dafür BeforeUserLogoutEvent
 * aus (AbstractUserAuthentication::logoff(), Zeilen 836–850) — VOR dem
 * Wegwerfen der Sitzung, also genau dann, wenn die Zuordnung noch besteht.
 * Der Zuhörer bucht und stimmt dem Abmelden anschließend zu (er ruft
 * preventLogout() nie).
 *
 * WARUM EIN EREIGNIS UND KEIN AUFRUF IN DER MIDDLEWARE: das Abmelden
 * geschieht in der Anmelde-Middleware des Kerns, also BEVOR unser Tor an die
 * Reihe kommt — dort ist die Person schon weg. Der Zuhörer ist die einzige
 * Stelle, die noch beides sieht: die Person und die Absicht zu gehen. Er
 * greift zudem auch dann, wenn das Abmelden aus einer ganz anderen Ecke
 * kommt (z. B. „Alle abmelden" ruft nicht logoff(), deshalb bucht
 * PlayerSessionService::logoutAll() dort selbst).
 *
 * BEHOBENER FEHLER (Behebungslauf D6/4B, gefunden über probe-abend.mjs, I-8,
 * am lebenden Objekt nachgestellt und bestätigt): DIESE KLASSE LAS BISHER
 * `$event->getUser()->user['uid']` — und genau DAS Feld ist an dieser Stelle
 * IMMER leer. AbstractUserAuthentication::start() setzt `$this->user = null;`
 * (Zeile 272), BEVOR checkAuthentication() aufgerufen wird; der
 * Formular-Abmeldezweig (`$type === LoginType::LOGOUT`, Zeile 406) steht
 * darin ALS ALLERERSTES, noch VOR jedem Code, der `$this->user` aus der
 * Sitzung befüllt (das passiert erst ab Zeile 483, `fetchPossibleUsers()`).
 * `logoff()` — und darin das Auslösen von BeforeUserLogoutEvent — läuft also
 * grundsätzlich, während `$this->user` noch null ist. Jeder Abgang über den
 * echten Knopf ".ca-bar__logout" (POST logintype=logout) bucht dadurch NIE,
 * unabhängig vom Gerätekredit — nachgestellt: Testkonto mit Gerätekredit 300
 * über den echten Knopf abgemeldet, balance_machine blieb bei 300 stehen.
 *
 * DIE BEHEBUNG: BeforeUserLogoutEvent trägt eine zweite Quelle,
 * `getUserSession(): ?UserSession` — die noch NICHT entfernte Sitzung
 * (UserSessionManager::removeSession() läuft erst in performLogoff(), NACH
 * diesem Ereignis). `UserSession::getUserId()` liefert die fe_users-Kennung
 * aus der Sitzung selbst, unabhängig davon, ob `$this->user` in diesem
 * Durchlauf schon befüllt wurde. Das ist zugleich der allgemeinere Weg: er
 * trifft jeden Abmelde-Anlass, den logoff() auslöst, nicht nur den
 * Formularweg.
 */
final readonly class BookOnLogout
{
    public function __construct(
        private ShadowUserService $shadowUsers,
        private AccountBookkeeper $bookkeeper,
    ) {}

    #[AsEventListener(identifier: 'casino-account/book-on-logout')]
    public function __invoke(BeforeUserLogoutEvent $event): void
    {
        if (!$event->getUser() instanceof FrontendUserAuthentication) {
            return;
        }
        // NICHT $event->getUser()->user['uid'] (siehe Klassenkopf): das Feld
        // ist an dieser Stelle immer leer. Die noch nicht entfernte Sitzung
        // trägt die Kennung zuverlässig, unabhängig vom Abmelde-Anlass.
        $feUserUid = $event->getUserSession()?->getUserId() ?? 0;
        if ($feUserUid <= 0) {
            return;
        }
        $playerUid = $this->shadowUsers->playersForUsers([$feUserUid])[$feUserUid] ?? 0;
        if ($playerUid > 0) {
            $this->bookkeeper->bookDeviceMoneyToCash($playerUid);
        }
    }
}
