<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Authentication;

use Phomo17\CasinoAccount\Domain\Player;
use Phomo17\CasinoAccount\Domain\PlayerRepository;
use Phomo17\CasinoAccount\Service\PlayerTokenGenerator;
use Phomo17\CasinoAccount\Service\ShadowUserService;
use TYPO3\CMS\Core\Authentication\AbstractAuthenticationService;
use TYPO3\CMS\Core\Authentication\LoginType;

/**
 * Der Authentifizierungsdienst aus D.6.2 — die Stelle, an der aus einer
 * Kennung eine Sitzung wird.
 *
 * TYPO3 fragt bei einer Anmeldung reihum alle angemeldeten Dienste; jeder
 * darf sagen „ich habe den Benutzer gefunden" und danach „er ist es
 * wirklich". Belegt in RESEARCH.md 10.3 und noch einmal am Kern nachgelesen:
 * AbstractUserAuthentication::fetchPossibleUsers() ruft getUser…,
 * checkAuthentication() ruft authUser…; ein Rückgabewert ≥ 200 beendet die
 * Kette mit Erfolg.
 *
 * Warum der Kern einen fe_users-Datensatz braucht und wie er entsteht, ist in
 * D1 entschieden und gebaut (Schattendatensatz, ShadowUserService). Diese
 * Klasse legt nichts an; sie sucht nur.
 *
 * WARUM KEIN processLoginData: der Untertyp processLoginDataFE dient dazu,
 * ein übertragenes Passwort umzurechnen. Wir haben keins. Der Dienst meldet
 * sich für diesen Untertyp deshalb gar nicht erst an (ext_localconf.php).
 *
 * WARUM DIE KLASSE PUBLIC IM DIENST-CONTAINER STEHEN MUSS: der Kern holt
 * Authentifizierungsdienste über GeneralUtility::makeInstanceService() →
 * GeneralUtility::makeInstance($className). Das fragt den Container nur nach
 * Klassen, die dort ÖFFENTLICH angemeldet sind; sonst bekäme die Klasse ihre
 * drei eingespritzten Helfer nicht und stürzte beim ersten Anmeldeversuch ab.
 * Dieselbe Lage wie beim PlayerDataHandlerHook in D1 — deshalb dieselbe Zeile
 * in Services.yaml.
 */
final class PlayerAuthenticationService extends AbstractAuthenticationService
{
    /**
     * Der Spielende, den getUser() über die Kennung gefunden hat. authUser()
     * prüft ihn danach noch einmal — die beiden Methoden werden vom Kern
     * getrennt gerufen, deshalb muss der Fund dazwischen liegenbleiben.
     */
    private ?Player $player = null;

    public function __construct(
        private readonly PlayerRepository $players,
        private readonly ShadowUserService $shadowUsers,
        private readonly PlayerTokenGenerator $tokens,
    ) {}

    /**
     * Schritt 1: „Wer will da herein?"
     *
     * @return array<string, mixed>|false die Zeile aus fe_users oder false
     */
    public function getUser(): array|false
    {
        // 1. Nur bei einer aktiven Anmeldung. Ohne diese Zeile liefe der
        //    Dienst bei JEDEM Seitenaufruf mit einer bestehenden Sitzung mit.
        if (LoginType::tryFrom($this->login['status'] ?? '') !== LoginType::LOGIN) {
            return false;
        }

        // 2. Die Kennung. Sie steht im Feld 'uname' — dorthin hat sie die
        //    Middleware QrTokenLogin geschrieben (Umsetzungsstück D2c). Diese
        //    Klasse liest die Anfrage NICHT selbst: der Kern reicht die
        //    Anmeldedaten hier herein, und genau eine Stelle soll bestimmen,
        //    was als Kennung gilt.
        $token = (string)($this->login['uname'] ?? '');

        // 3. Der Fund. findByToken() weist offensichtlichen Unsinn ohne
        //    Datenbankabfrage ab, sucht mit gebundenem Parameter, schließt
        //    stillgelegte Datensätze aus und entscheidet zuletzt mit
        //    hash_equals().
        $player = $this->players->findByToken($token);
        if ($player === null) {
            return false;   // der Kern zählt das als Fehlversuch und meldet es
        }

        // 4. Der Schattendatensatz. Fehlt er oder ist er gesperrt, kommt
        //    niemand herein — auch dann nicht, wenn die Kennung stimmt.
        $row = $this->shadowUsers->findEnabledRow($player->feUser);
        if ($row === null) {
            $this->logger->warning(
                'Spielender {uid} hat eine gültige Kennung, aber keinen benutzbaren Schattendatensatz.',
                ['uid' => $player->uid]     // KEINE Kennung im Protokoll (D.9)
            );
            return false;
        }

        $this->player = $player;
        return $row;
    }

    /**
     * Schritt 2: „Ist er es wirklich?"
     *
     * 200 = ja, und niemand muss mehr gefragt werden (der dokumentierte Wert
     * für eine Anmeldung ohne Passwort).
     * 100 = ich bin nicht zuständig, fragt weiter — dann greift der
     *       Passwortdienst des Kerns, der an unserem unbenutzbaren
     *       Zufallspasswort scheitert. Genau so soll es sein.
     */
    public function authUser(array $user): int
    {
        if ($this->player === null) {
            return 100;
        }
        if ((int)($user['uid'] ?? 0) !== $this->player->feUser) {
            return 100;
        }
        // Zweiter, unabhängiger Vergleich derselben Kennung. Er ist nicht
        // überflüssig: getUser() und authUser() sind zwei Aufrufe, und ein
        // Umbau, der zwischen ihnen etwas verändert, soll hier auffallen und
        // nicht durchrutschen. hash_equals(), nie „==" (D.4.2).
        return $this->tokens->equals($this->player->token, (string)($this->login['uname'] ?? ''))
            ? 200
            : -1;   // negativ = Anmeldung abgelehnt, Kette wird abgebrochen
    }
}
