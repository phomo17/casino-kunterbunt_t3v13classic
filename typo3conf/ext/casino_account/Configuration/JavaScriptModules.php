<?php

declare(strict_types=1);

/**
 * Import-Karte dieser Extension.
 *
 * Registriert das Präfix „@phomo17/casino-account/" für alle ES-Module unter
 * Resources/Public/JavaScript/ — dieselbe Bauart wie in casino_startpage, nur
 * fürs Backend.
 *
 * Geladen wird ausschließlich über
 *   $pageRenderer->loadJavaScriptModule('@phomo17/casino-account/qr-tools.js')
 * im Controller. Im Backend gibt es keinen f:asset.module-ViewHelper wie im
 * Frontend; der PageRenderer ist dort der Weg.
 *
 * „dependencies: [backend]" sagt: die Import-Karte des Backends muss vorher
 * da sein. Sie ist es ohnehin — im Backend lädt der Kern sie immer —, aber
 * die Angabe macht die Reihenfolge zur Zusage statt zum Zufall und kostet
 * nichts. Eigene Importe aus dem Kern hat qr-tools.js bewusst keine: die
 * Datei kommt mit dem aus, was jeder Browser mitbringt.
 */
return [
    'dependencies' => ['backend'],
    'imports' => [
        '@phomo17/casino-account/' => 'EXT:casino_account/Resources/Public/JavaScript/',
    ],
];
