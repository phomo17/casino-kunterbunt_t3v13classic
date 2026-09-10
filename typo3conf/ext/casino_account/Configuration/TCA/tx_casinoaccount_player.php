<?php

declare(strict_types=1);

/**
 * Ein Spielender (CONCEPT.md D.3.2, Anhang I).
 *
 * Diese Datei beschreibt das Bearbeitungsformular. Gebaut wird das Formular
 * von der Formularmaschine des Kerns, geschrieben wird ausschließlich über
 * den DataHandler — CONCEPT.md D.3.5 verbietet eine eigene Formularmaschine
 * ausdrücklich, und genau daran hängt auch die Tastaturbedienbarkeit, die
 * D.12 als eine der drei verbindlichen Zusagen zur Barrierefreiheit nennt.
 *
 * DAS FELD „balance" IST VIRTUELL — es hat KEINE Spalte in der Datenbank:
 *
 *   balance          das GESAMTVERMÖGEN, nur zur Anzeige. Beim Öffnen füllt
 *                    es der CurrentBalanceProvider mit der Summe der drei
 *                    Beträge (D.13: „wird nicht gespeichert, sondern immer
 *                    aus den drei Beträgen gerechnet"). type => 'none'
 *                    (NoneElement) zeichnet ein echtes, aber deaktiviertes
 *                    Anzeigefeld ohne 'name'-Attribut — nichts, was der
 *                    DataHandler je schreiben könnte, und kein Zweig in
 *                    DefaultTcaSchema, der dafür eine Spalte anlegt (siehe
 *                    NACHTRAG 2026-09-09 unten).
 *
 * NACHTRAG 2026-09-09 (siehe DECISIONS.md, Eintrag zum selben Datum): Die
 * ursprüngliche Begründung „DefaultTcaSchema kennt keinen Fall für einen Typ
 * ohne Datenbankentsprechung" traf auf 'type => number' NICHT zu —
 * DefaultTcaSchema::enrichSingleTableFieldsFromTcaColumns() hat einen Zweig
 * 'case "number":' und legt für JEDES Feld dieses Typs eine echte Spalte an
 * (typo3_src/typo3/sysext/core/Classes/Database/Schema/DefaultTcaSchema.php,
 * Zeile 867 ff.). Die Spalte `balance` stand tatsächlich in der Datenbank,
 * obwohl sie in ext_tables.sql nicht vorkommt — eine zweite, von den drei
 * echten Beträgen unabhängige Ablage genau des Zustands, den D.13 ausdrück-
 * lich ausschließen will. Der Typ ist deshalb auf 'none' geändert worden.
 * 'none' gehört NICHT zu der Liste der Typen, für die DefaultTcaSchema eine
 * Spalte anlegt (siehe die switch-Zweige in derselben Datei: category,
 * datetime, slug, json, uuid, file, folder, imageManipulation, flex, text,
 * email, check, language, group, password, color, radio, link, input,
 * inline, number, select — 'none' ist nicht darunter).
 *
 * NACHTRAG 2026-09-09, ZWEITER TEIL, UMSETZUNGSSTÜCK Dc (siehe DECISIONS.md,
 * zweiter Eintrag zum selben Datum): Weil 'none' keinen `name` ausgibt, kann
 * der Bearbeiter über `balance` keinen Wert mehr EINGEBEN — es ist nur noch
 * Anzeige. D.3.3 verlangt aber ein EINGEBBARES Feld „Guthaben", das beim
 * Speichern vollständig in die Kasse gebucht wird. Gelöst, ohne eine vierte
 * Geldspalte einzuführen (D.13 schließt das ausdrücklich aus): das Feld
 * `balance_cash` selbst übernimmt in Dc die Rolle des editierbaren
 * „Guthaben" — es trägt fortan das Beschriftungspaar 'player.balanceCash'
 * mit dem Text „Guthaben" statt „Kasse", ist NICHT MEHR readOnly, und
 * PlayerDataHandlerHook::processDatamap_postProcessFieldArray() setzt beim
 * Speichern balance_machine und balance_win auf 0, sobald balance_cash sich
 * ändert (D.3.3 wörtlich). Der bekannte Schönheitsfehler: öffnet der
 * Bearbeiter einen Datensatz mitten im Spiel, zeigt „Guthaben" nur die Kasse,
 * nicht das Gesamtvermögen — das bleibt hinnehmbar, weil `balance`
 * (umbenannt auf „Gesamtvermögen") sowie `balance_machine`/`balance_win`
 * unverändert lesbar daneben stehen: nichts ist verborgen.
 */

$languageFile = 'LLL:EXT:casino_account/Resources/Private/Language/locallang_be.xlf:';

return [
    'ctrl' => [
        'title' => $languageFile . 'player',
        'label' => 'name',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'delete' => 'deleted',
        'default_sortby' => 'name ASC',
        'searchFields' => 'name',
        'iconfile' => 'EXT:casino_account/Resources/Public/Icons/ModulePlayers.svg',
        'enablecolumns' => [
            'disabled' => 'hidden',
        ],
        'security' => [
            'ignorePageTypeRestriction' => true,
        ],
    ],
    'types' => [
        '1' => [
            'showitem' => '
                --div--;' . $languageFile . 'player.tab.general,
                    name, balance, role,
                --div--;' . $languageFile . 'player.tab.account,
                    balance_cash, balance_machine, balance_win, is_admin,
                --div--;LLL:EXT:core/Resources/Private/Language/Form/locallang_tabs.xlf:access,
                    hidden,
            ',
        ],
    ],
    'columns' => [
        'hidden' => [
            'exclude' => true,
            'label' => 'LLL:EXT:core/Resources/Private/Language/locallang_general.xlf:LGL.visible',
            'config' => [
                'type' => 'check',
                'renderType' => 'checkboxToggle',
                'default' => 0,
                'items' => [
                    [
                        'label' => '',
                        'invertStateDisplay' => true,
                    ],
                ],
            ],
        ],
        'name' => [
            'label' => $languageFile . 'player.name',
            'description' => $languageFile . 'player.name.description',
            'config' => [
                'type' => 'input',
                'size' => 30,
                'max' => 255,
                'required' => true,
                // Bewusst KEIN 'eval'. CONCEPT.md D.3.2: „Alle Zeichen
                // erlaubt, keine Einschränkung auf Buchstaben." Auch kein
                // 'trim' — wer seinen Namen mit einem Leerzeichen schreiben
                // will, darf das. Und ausdrücklich kein 'unique': zwei
                // Personen dürfen gleich heißen, unterschieden wird über
                // die Kennung.
            ],
        ],
        'balance' => [
            'label' => $languageFile . 'player.balance',
            'description' => $languageFile . 'player.balance.description',
            'config' => [
                // 'none': ein echtes, aber deaktiviertes Anzeigefeld
                // (typo3_src/…/Form/Element/NoneElement.php) — kein
                // 'name'-Attribut, also nichts, was der DataHandler je
                // schreiben könnte, und kein Zweig in DefaultTcaSchema, der
                // dafür eine Datenbankspalte anlegt. Siehe Kopfkommentar
                // dieser Datei und DECISIONS.md (2026-09-09). Beschriftet als
                // „Gesamtvermögen" — nicht mehr „Guthaben" seit
                // Umsetzungsstück Dc, das diesen Namen an das jetzt
                // editierbare Feld balance_cash vergeben hat.
                'type' => 'none',
                'size' => 12,
            ],
        ],
        'role' => [
            'label' => $languageFile . 'player.role',
            'description' => $languageFile . 'player.role.description',
            'config' => [
                'type' => 'select',
                'renderType' => 'selectSingle',
                'default' => 0,
                // CONCEPT.md D.3.2: „aufklappbar, zunächst ohne Einträge,
                // Vorgabewert leer". Ein einziger leerer Eintrag statt einer
                // ganz leeren Liste — für den Bearbeiter dasselbe Bild, aber
                // die Formularmaschine bekommt eine gültige Auswahlliste.
                // Teil E füllt sie; bis dahin wird hier nichts entwickelt.
                'items' => [
                    ['label' => $languageFile . 'player.role.none', 'value' => 0],
                ],
            ],
        ],
        // Seit Umsetzungsstück Dc das EDITIERBARE Feld „Guthaben" aus D.3.2 —
        // NICHT mehr readOnly. Kein 'format': die Voreinstellung 'integer'
        // ist gewollt (keine Nachkommastellen, D.3.2). 'range.lower' => 0
        // ist die letzte, im Formular sichtbare Verteidigungslinie gegen
        // negative Beträge, zusätzlich zur unsigned-Spalte und zum
        // DataHandler-Hook. Beim Speichern übersetzt
        // PlayerDataHandlerHook::processDatamap_postProcessFieldArray() eine
        // Änderung dieses Feldes in D.3.3: der ganze Betrag bleibt hier
        // stehen, balance_machine und balance_win werden auf 0 gesetzt.
        'balance_cash' => [
            'label' => $languageFile . 'player.balanceCash',
            'description' => $languageFile . 'player.balanceCash.description',
            'config' => [
                'type' => 'number',
                'range' => [
                    'lower' => 0,
                    'upper' => 999999999,
                ],
                'default' => 0,
                'size' => 12,
            ],
        ],
        'balance_machine' => [
            'label' => $languageFile . 'player.balanceMachine',
            'description' => $languageFile . 'player.balanceMachine.description',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
                'default' => 0,
            ],
        ],
        'balance_win' => [
            'label' => $languageFile . 'player.balanceWin',
            'description' => $languageFile . 'player.balanceWin.description',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
                'default' => 0,
            ],
        ],
        'is_admin' => [
            'label' => $languageFile . 'player.isAdmin',
            'description' => $languageFile . 'player.isAdmin.description',
            'config' => [
                'type' => 'check',
                'renderType' => 'checkboxToggle',
                'readOnly' => true,
                'default' => 0,
            ],
        ],
        // Ab hier: gespeichert, aber nie im Formular. 'passthrough' heißt
        // genau das — die Spalte existiert, der Bearbeiter sieht sie nie und
        // kann sie nicht ändern.
        //
        // Die Kennung steht bewusst NICHT im Formular (CONCEPT.md D.3.2:
        // „Text, verborgen"). Lesen kann man sie in der QR-Ansicht, wo sie
        // laut D.6.1 im Klartext unter dem Code stehen muss, damit man sie
        // abtippen kann.
        'token' => [
            'config' => ['type' => 'passthrough'],
        ],
        'fe_user' => [
            'config' => ['type' => 'passthrough'],
        ],
        'be_user' => [
            'config' => ['type' => 'passthrough'],
        ],
        'booking_seq' => [
            'config' => ['type' => 'passthrough'],
        ],
        'last_seen' => [
            'config' => ['type' => 'passthrough'],
        ],
    ],
];
