<?php

declare(strict_types=1);

use Phomo17\CasinoLobby\Middleware\LobbyEndpoint;
use Phomo17\CasinoLobby\Middleware\LobbyTable;

/**
 * Die zwei Schichten des Lobby-Systems (CONCEPT.md D.10).
 *
 * NUR 'frontend' — aus demselben Grund wie in casino_account: das Backend
 * hat eine eigene Kette, und eine Lobby hat dort nichts zu suchen.
 *
 * WARUM ZWEI SCHICHTEN UND NICHT EINE. Sie liegen an verschiedenen Stellen
 * des Stapels, weil sie Verschiedenes brauchen:
 *
 *   casino_lobby/endpoint  beantwortet drei JSON-Adressen. Er braucht die
 *                          Sitzung, aber KEINE Seite. Er liegt deshalb VOR
 *                          typo3/cms-frontend/page-resolver — eine Abfrage im
 *                          Sekundentakt darf nicht jedes Mal eine Seite
 *                          auflösen lassen. Er liegt NACH casino_account/
 *                          qr-gate, damit er das Merkmal casino_account.player
 *                          vorfindet und die Herleitung „Sitzung -> Spielender"
 *                          kein drittes Mal im Haus steht.
 *
 *   casino_lobby/table     entscheidet, was unter der Adresse eines Tisches
 *                          ausgeliefert wird, und speist den Zustandsblock in
 *                          die fertige Seite ein (die Platzleiste selbst kommt
 *                          erst mit Umsetzungsstück D4c). Sie braucht die
 *                          aufgelöste Seite, um zu wissen, WELCHES Spiel dort
 *                          steht, und liegt deshalb NACH page-resolver. Sie
 *                          liegt zugleich NACH casino_account/account-bar —
 *                          also INNERHALB der Kontenleiste —, damit die von
 *                          ihr selbst gerenderte Übersichtsseite die
 *                          Kontenleiste und den Zustandsblock des Kontos
 *                          genauso bekommt wie jede andere Seite (D.7: „steht
 *                          oben auf jeder Seite, immer, egal wo man ist").
 *
 * WAS PASSIERT, WENN MAN DIE LAGE VERTAUSCHT: läge 'endpoint' vor 'qr-gate',
 * müsste er die Sitzung selbst herleiten (dritte Kopie derselben fünfzehn
 * Zeilen). Läge 'table' vor 'account-bar', trüge die Übersichtsseite kein
 * Gesamtvermögen und keinen Abmelden-Knopf. Läge 'table' vor 'page-resolver',
 * wüsste sie nicht, welches Spiel gemeint ist, und müsste die Seite erst
 * rendern lassen, um es dem Markup zu entnehmen — eine vollständig gerenderte
 * Seite, die anschließend weggeworfen wird.
 *
 * WARUM 'endpoint' KEINE JSON-ANTWORT FÜR EINE FEHLENDE SITZUNG BRAUCHT:
 * anders als der Buchungsendpunkt aus D.7.2 liegt diese Schicht INNERHALB des
 * Tors. Wer keine Sitzung hat, bekommt vom Tor die Torseite mit Rückgabewert
 * 200 — und genau das ist für die Lobby die richtige Auskunft: „du bist nicht
 * mehr angemeldet". Läuft die Sitzung WÄHREND des Aufenthalts an der Lobby
 * ab, obwohl der Modus an bleibt, antwortet der Endpunkt selbst mit 401 JSON
 * (LobbyEndpoint::process()); lobby-live.js behandelt das ausdrücklich
 * (Umsetzungsstück D4c) und lädt die Seite neu, statt wie ein Gerät in die
 * Sperre zu gehen.
 *
 * ACHTUNG BEIM ÄNDERN DIESER DATEI (Lehre aus casino_account, zweimal in
 * dieser Sitzung wiederholt): der Kern baut den Schichtenstapel bei JEDER
 * Frontend-Anfrage vollständig auf, unabhängig vom Zustand des QR-Modus. Ein
 * Eintrag mit einer nicht existierenden Klasse legt deshalb JEDE Seite lahm
 * — auch bei ausgeschaltetem Modus. Diese Datei wurde deshalb ERST angelegt,
 * als LobbyEndpoint.php UND LobbyTable.php bereits vollständig existierten.
 */
return [
    'frontend' => [
        'casino_lobby/endpoint' => [
            'target' => LobbyEndpoint::class,
            'after' => ['casino_account/qr-gate'],
            'before' => [
                'casino_account/account-bar',
                'typo3/cms-frontend/page-resolver',
            ],
        ],
        'casino_lobby/table' => [
            'target' => LobbyTable::class,
            'after' => [
                'casino_account/account-bar',
                'typo3/cms-frontend/page-resolver',
            ],
        ],
    ],
];
