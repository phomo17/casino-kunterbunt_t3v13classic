<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\EventListener;

use Phomo17\CasinoAccount\Middleware\QrTokenLogin;
use Phomo17\CasinoAccount\Service\QrMode;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Authentication\Event\BeforeRequestTokenProcessedEvent;
use TYPO3\CMS\Core\Security\RequestToken;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

/**
 * Erlaubt die Anmeldung über eine Adresse mit Kennung (D.4.2, D.6.1 Weg 1).
 *
 * Dies ist die heikelste Einzelentscheidung der ganzen Phase, deshalb
 * ausführlich.
 *
 * TYPO3 führt eine aktive Anmeldung nur aus, wenn ein gültiges
 * Anfragezeichen mitkommt. Nachgelesen im Kern:
 * AbstractUserAuthentication::checkAuthentication(), Zeilen 462–481 — passt
 * der Bereich des empfangenen Zeichens nicht auf core/user-auth/fe, wird
 * $activeLogin ausdrücklich wieder auf false gesetzt, und es findet keine
 * Anmeldung statt. Ein Anfragezeichen wird zudem nur aus POST/PUT/PATCH
 * gelesen (RequestTokenMiddleware::resolveReceivedRequestToken(),
 * Zeilen 110–116).
 *
 * Ein QR-Code, den eine beliebige Kamera-App öffnet, ist aber ein GET und
 * kann naturgemäß kein Anfragezeichen tragen. Ohne Ausnahme wäre der ganze
 * Weg 1 aus D.6.1 nicht baubar.
 *
 * Der Kern sieht für genau diesen Fall eine Tür vor. Die Changelog-Seite des
 * Merkmals (core/Documentation/Changelog/12.0/Feature-97305-IntroduceCSRF-
 * likeRequest-tokenHandling.rst, Abschnitt „Intercept & Adjust Request
 * Token") sagt wörtlich: „Scenarios that are not using a login callback
 * without having the possibility to submit a request-token,
 * BeforeRequestTokenProcessedEvent can be used to generate the token
 * individually." — und zeigt genau den Code, den diese Datei benutzt. Auch
 * der Kern selbst hängt sich dort ein
 * (felogin/Classes/Event/ProcessRequestTokenListener.php).
 */
final readonly class AllowUrlTokenLogin
{
    public function __construct(private QrMode $qrMode) {}

    /**
     * Die Bedingung ist so eng wie möglich gefasst — vier Riegel, alle
     * müssen zutreffen:
     *   1. Es liegt noch KEIN gültiges Anfragezeichen vor (ein Formular, das
     *      eins mitschickt, wird nicht angefasst).
     *   2. Es geht um eine Frontend-Anmeldung (FrontendUserAuthentication).
     *   3. Die Anfrage trägt die Markierung, die ausschließlich unsere
     *      Middleware QrTokenLogin setzt, und zwar nur für eine Kennung, die
     *      in der ADRESSE stand.
     *   4. Der QR-Modus ist an.
     *
     * WAS DAS ÖFFNET, AUSDRÜCKLICH BENANNT: wer jemanden dazu bringt, eine
     * Adresse mit FREMDER Kennung zu öffnen, meldet ihn als diese fremde
     * Person an. Das ist die unvermeidliche Kehrseite des Konzepts „auf dem
     * Code steht eine Adresse, die jede Kamera-App öffnen kann" (D.4.2) und
     * liegt genau in dem, was D.9 letzter Absatz ausdrücklich NICHT schützt:
     * „Der Schutz richtet sich gegen Versehen und Neugier, nicht gegen
     * Angriffe." Der Schaden wäre auch gering: der Angegriffene sieht ein
     * fremdes Guthaben statt seines eigenen und meldet sich ab.
     *
     * DER FORMULARWEG BLEIBT VOLL GESCHÜTZT: die Torseite schickt ein echtes
     * Anfragezeichen mit, Riegel 1 greift, und dieser Zuhörer tut nichts.
     */
    #[AsEventListener(identifier: 'casino-account/url-token-login')]
    public function __invoke(BeforeRequestTokenProcessedEvent $event): void
    {
        if ($event->getRequestToken() instanceof RequestToken) {
            return;
        }
        if (!$event->getUser() instanceof FrontendUserAuthentication) {
            return;
        }
        if ($event->getRequest()->getAttribute(QrTokenLogin::ATTRIBUTE_URL_LOGIN) !== true) {
            return;
        }
        if (!$this->qrMode->isOn()) {
            return;
        }
        $event->setRequestToken(RequestToken::create('core/user-auth/fe'));
    }
}
