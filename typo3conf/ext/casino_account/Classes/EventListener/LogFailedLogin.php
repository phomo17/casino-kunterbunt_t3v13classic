<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\EventListener;

use Phomo17\CasinoAccount\Service\PlayerTokenGenerator;
use Psr\Log\LoggerInterface;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Authentication\Event\LoginAttemptFailedEvent;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

/**
 * Erfüllt D.9 („Fehlversuche werden protokolliert") — und zwar so, dass
 * dabei nicht genau das im Protokoll landet, was D.9 im selben Atemzug
 * verbietet („Kennungen erscheinen nie … in einer Fehlermeldung").
 *
 * WIE VIEL IM PROTOKOLL STEHT UND WARUM GENAU SO VIEL: die Absenderadresse
 * (damit man sieht, ob jemand herumprobiert), die Länge und die
 * Wohlgeformtheit der Kennung (damit man einen Tippfehler von einem
 * Zufallsversuch unterscheiden kann) — und KEIN EINZIGES ZEICHEN der Kennung
 * selbst. Wer die Kennung braucht, sieht sie im Backend beim Spielenden; wer
 * ein Protokoll liest, braucht sie nicht.
 *
 * EINE GRENZE, DIE BENANNT GEHÖRT UND NICHT BEHOBEN WIRD: der Kern selbst
 * schreibt bei einer Anmeldung $this->logger->debug('Login data', …) mit dem
 * Feld 'uname' — also der Kennung. Das greift nur, wenn jemand die
 * Protokollstufe des Kerns auf 'debug' stellt; in der Voreinstellung wird
 * nichts davon geschrieben. Das ist eine Einstellung der Installation, keine
 * Zeile dieser Extension; sie gehört in die README (Umsetzungsstück D2d) und
 * in „Offene Fragen", nicht in eine Umgehung des Kerns.
 *
 * Der Logger wird über den Konstruktor eingespritzt (Psr\Log\LoggerInterface)
 * statt über LoggerAwareTrait/-Interface: diese Klasse ist eine readonly
 * class, und LoggerAwareTrait deklariert eine NICHT-readonly Eigenschaft —
 * in einer readonly class wäre das ein Fehler. Der Kern löst genau diesen
 * Konstruktor-Fall selbst auf (LoggerInterfacePass), ohne dass hier eine
 * eigene Anmeldung nötig wäre.
 */
final readonly class LogFailedLogin
{
    public function __construct(private LoggerInterface $logger) {}

    #[AsEventListener(identifier: 'casino-account/failed-login')]
    public function __invoke(LoginAttemptFailedEvent $event): void
    {
        if (!$event->getUser() instanceof FrontendUserAuthentication) {
            return;   // Backend-Anmeldungen gehen uns nichts an
        }
        $uname = (string)($event->getLoginData()['uname'] ?? '');
        $this->logger->warning(
            'Fehlgeschlagene Anmeldung am Casino von {ip}. Kennung {laenge} Zeichen lang, {form} übermittelt.',
            [
                'ip' => $event->getRequest()->getAttribute('normalizedParams')?->getRemoteAddress() ?? '?',
                'laenge' => strlen($uname),
                'form' => PlayerTokenGenerator::looksValid($uname) ? 'wohlgeformt' : 'unbrauchbar',
            ]
        );
    }
}
