<?php

declare(strict_types=1);

use Phomo17\CasinoAccount\Middleware\AccountBar;
use Phomo17\CasinoAccount\Middleware\BookingEndpoint;
use Phomo17\CasinoAccount\Middleware\QrGate;
use Phomo17\CasinoAccount\Middleware\QrTokenLogin;

/**
 * Die drei Schichten des QR-Modus (CONCEPT.md D.6, D.7, D.9).
 *
 * NUR 'frontend'. Das Backend hat eine eigene Kette und einen eigenen
 * Einstiegspunkt; hier steht bewusst kein 'backend'-Block. Deshalb kann der
 * QR-Modus einen Bearbeiter niemals aus dem Backend aussperren — und deshalb
 * ist ein versehentliches Einschalten immer zurücknehmbar.
 *
 * REIHENFOLGE (ausführlich begründet im Plan, Teil 1, Vorbemerkung):
 *   qr-login  vor  der Anmeldung des Kerns  — es übersetzt die Kennung in das,
 *             was der Kern als Anmeldedaten erwartet.
 *   qr-gate   nach der Anmeldung            — erst danach steht fest, ob eine
 *             Sitzung besteht; und VOR page-resolver, damit ohne Sitzung nicht
 *             einmal nachgeschlagen wird, welche Seite gemeint war.
 *   account-bar innerhalb von qr-gate       — es sieht nur, was das Tor
 *             durchgelassen hat.
 *
 * WAS PASSIERT, WENN MAN DIE REIHENFOLGE VERTAUSCHT: steht qr-gate vor der
 * Anmeldung, hält es jeden für einen Fremden und sperrt auch die
 * Angemeldeten aus. Steht qr-login hinter der Anmeldung, kommt die Kennung zu
 * spät und niemand kann sich anmelden. Der Prüfstand hält beide Zusagen fest
 * (verify-gate.mjs, G-2).
 *
 * NACHGETRAGEN IN UMSETZUNGSSTÜCK D2d: bis einschließlich D2c meldete diese
 * Datei nur die ersten beiden Schichten an. AccountBar.php existierte noch
 * nicht, und der Kern baut den Schichtenstapel bei JEDER Frontend-Anfrage
 * vollständig auf (der MiddlewareStackResolver erzeugt jedes 'target'
 * unabhängig vom Zustand des QR-Modus) — ein Eintrag mit einer nicht
 * existierenden Klasse hätte deshalb JEDE Seite lahmgelegt, nicht nur bei
 * eingeschaltetem Modus. Seit AccountBar.php besteht (Umsetzungsstück D2d,
 * CONCEPT.md D.7/D.8), steht die dritte Schicht hier vollständig.
 *
 * NACHGETRAGEN IN UMSETZUNGSSTÜCK D3a: der Buchungsendpunkt aus D.7.2 kommt
 * als VIERTE Schicht dazu, zwischen der Anmeldung des Kerns und qr-gate. Er
 * liegt VOR dem Tor, damit ein Aufruf ohne Sitzung eine JSON-Absage bekommt
 * und nicht die Torseite als HTML — ein JSON-Aufrufer würde die als Ausfall
 * deuten und das Gerät sperren (BookingEndpoint.php, Plan Abschnitt 4.9). Er
 * liegt NACH der Anmeldung, weil er die Sitzung braucht, und VOR page-
 * resolver, weil er keine Seite braucht. Wie schon bei AccountBar.php gilt
 * dieselbe Warnung: eine nicht existierende Klasse hier legt JEDE Seite lahm,
 * auch bei ausgeschaltetem Modus.
 */
return [
    'frontend' => [
        'casino_account/qr-login' => [
            'target' => QrTokenLogin::class,
            'after' => [
                'typo3/cms-frontend/site',
                'typo3/cms-core/request-token-middleware',
            ],
            'before' => [
                'typo3/cms-frontend/authentication',
            ],
        ],
        // Der Buchungsendpunkt (D.7.2). Er liegt VOR dem Tor, damit ein
        // Aufruf ohne Sitzung eine JSON-Absage bekommt und nicht die
        // Torseite als HTML — ein JSON-Aufrufer würde die als Ausfall deuten
        // und das Gerät sperren. Er liegt NACH der Anmeldung, weil er die
        // Sitzung braucht, und VOR page-resolver, weil er keine Seite
        // braucht.
        'casino_account/booking' => [
            'target' => BookingEndpoint::class,
            'after' => ['typo3/cms-frontend/authentication'],
            'before' => ['casino_account/qr-gate', 'typo3/cms-frontend/page-resolver'],
        ],
        'casino_account/qr-gate' => [
            'target' => QrGate::class,
            'after' => [
                'typo3/cms-frontend/authentication',
            ],
            'before' => [
                'casino_account/account-bar',
                'typo3/cms-frontend/page-resolver',
            ],
        ],
        'casino_account/account-bar' => [
            'target' => AccountBar::class,
            'after' => [
                'casino_account/qr-gate',
            ],
            'before' => [
                'typo3/cms-frontend/page-resolver',
            ],
        ],
    ],
];
