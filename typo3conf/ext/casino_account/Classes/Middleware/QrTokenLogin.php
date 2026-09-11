<?php

declare(strict_types=1);

namespace Phomo17\CasinoAccount\Middleware;

use Phomo17\CasinoAccount\Frontend\GatePage;
use Phomo17\CasinoAccount\Service\PlayerUrlBuilder;
use Phomo17\CasinoAccount\Service\QrMode;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\RateLimiter\RequestRateLimitedException;

/**
 * Die Übersetzerin. Der Kern versteht als Anmeldung genau drei Felder:
 * logintype=login, user, pass. Unsere Anmeldung hat aber nur EIN Merkmal, die
 * Kennung, und sie kommt auf zwei Wegen: in der ADRESSE
 * (…/?casinoToken=…, so steht es auf dem QR-Code, D.4.2) oder im FORMULAR der
 * Torseite. Diese Schicht ist der einzige Ort, an dem entschieden wird, was
 * als Kennung gilt — und der einzige, der die Kern-Feldnamen kennt.
 *
 * WARUM DIE TORSEITE NICHT GLEICH user/pass SCHICKT. Dann stünde die Kennung
 * im Formular unter einem fremden Namen, und die beiden Wege (Adresse und
 * Formular) hätten zwei verschiedene Bauformen. So gibt es genau einen
 * Namen, casinoToken, und er ist bereits seit D1 als Konstante festgelegt
 * (PlayerUrlBuilder::PARAMETER).
 */
final readonly class QrTokenLogin implements MiddlewareInterface
{
    /** Es wurde überhaupt eine Kennung mitgeschickt (Adresse oder Formular). */
    public const ATTRIBUTE_LOGIN_ATTEMPT = 'casino_account.loginAttempt';
    /** Die Kennung stand in der ADRESSE — nur dann darf AllowUrlTokenLogin greifen. */
    public const ATTRIBUTE_URL_LOGIN = 'casino_account.urlLogin';

    public function __construct(
        private QrMode $qrMode,
        private GatePage $gate,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->qrMode->isOn()) {
            return $handler->handle($request);   // aus heißt aus: eine Abfrage, sonst nichts
        }

        $body = is_array($request->getParsedBody()) ? $request->getParsedBody() : [];
        $ausFormular = trim((string)($body[PlayerUrlBuilder::PARAMETER] ?? ''));
        $ausAdresse = trim((string)($request->getQueryParams()[PlayerUrlBuilder::PARAMETER] ?? ''));
        $kennung = $ausFormular !== '' ? $ausFormular : $ausAdresse;

        if ($kennung !== '') {
            $request = $request
                ->withParsedBody($body + [
                    'logintype' => 'login',
                    'user' => $kennung,
                    // 'pass' trägt dieselbe Kennung. Zwei Gründe: der
                    // Passwortdienst des Kerns würde bei leerem Passwort einen
                    // eigenen Fehlversuch ins Protokoll schreiben, und der Kern
                    // maskiert das Feld 'uident' in jeder Protokollausgabe
                    // ('********'). Unser eigener Dienst liest 'pass' nie.
                    'pass' => $kennung,
                ])
                ->withAttribute(self::ATTRIBUTE_LOGIN_ATTEMPT, true)
                ->withAttribute(self::ATTRIBUTE_URL_LOGIN, $ausFormular === '' && $ausAdresse !== '');
        }

        try {
            return $handler->handle($request);
        } catch (RequestRateLimitedException) {
            /*
             * Die Begrenzung aus D.9 hat zugeschlagen. Der Kern wirft dafür
             * eine Ausnahme (FrontendUserAuthenticator), und die würde
             * ungefangen als Fehlerseite enden — mit einem englischen Text,
             * der die Sperre erklärt. Hier wird stattdessen dieselbe
             * Torseite gezeigt, nur mit dem passenden Satz und mit dem
             * richtigen Rückgabewert 429 („zu viele Anfragen").
             *
             * Diese Schicht ist die einzige, die die Ausnahme fangen KANN:
             * sie liegt außerhalb der Anmeldung, in der geworfen wird.
             */
            return $this->gate->render($request, GatePage::REASON_RATE_LIMITED, 429);
        }
    }
}
