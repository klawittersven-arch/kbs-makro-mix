# KBS Makro-Mix

Ein Klassenspiel zu Nährwerten und Makronährstoffen, nach dem Kartenspiel „Makro-Mix“ aus dem Unterricht. Zwei Spielarten:

- **Reihe:** Lebensmittel nach Kalorien, Fett, Kohlenhydraten oder Eiweiß ordnen. Wo gehört die neue Karte in die Reihe?
- **Bedarf:** Eine Bedarfskarte nennt eine Person und einen Zielwert. Aus 10 Lebensmitteln bis zu 5 auswählen und dem Zielwert so nah wie möglich kommen, ohne ihn zu überschreiten.

Erst spielen alle allein auf dem Handy (Qualifying, mit Live-Rangliste am Beamer), dann spielen die Besten das Finale, die Auflösung kommt am Beamer.

| Seite | Adresse | Für wen |
|---|---|---|
| Üben | `/` | alle, auch zu Hause (ohne Klasse, ohne Anmeldung), mit Übersicht aller Karten |
| Klassenmodus | `/lehrer` | Lehrkraft am Laptop mit Beamer |
| Mitspielen | `/mitspielen` | SuS, wird über den QR-Code geöffnet |

**Link für den Beamer (nach der Einrichtung):** `https://kbs-makro-mix.klawittersven.workers.dev/lehrer`

Spiel, Lebensmittel- und Personen-Grafiken und Töne: © 2026 Sven Klawitter. Alle Bilder sind eigene Zeichnungen.

---

## Einmalige Einrichtung bei Cloudflare (etwa 10 Minuten)

Genauso wie bei KBS Simon says, KBS-Kart, Tetris und der Spielewahl:

1. Bei Cloudflare anmelden: <https://dash.cloudflare.com>
2. Links im Menü **Workers & Pages** öffnen (je nach Ansicht unter **Compute (Workers)**).
3. **Create application** (Anwendung erstellen) wählen, dann **GitHub** bzw. **Import a repository**.
4. Das Repository **kbs-makro-mix** auswählen. Falls es nicht in der Liste steht: in den GitHub-Einstellungen der Cloudflare-App den Zugriff auf `kbs-makro-mix` erlauben.
5. Einstellungen prüfen:
   - **Project name / Worker name:** `kbs-makro-mix` (muss genau so heißen, sonst schlägt der Build fehl)
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy` (ist voreingestellt)
   - **Root directory:** leer lassen
6. **Save and Deploy** klicken. Nach ein bis zwei Minuten ist das Spiel online unter `https://kbs-makro-mix.klawittersven.workers.dev`.

**Updates:** Jede Änderung, die im Branch `main` dieses GitHub-Repositorys landet, veröffentlicht Cloudflare automatisch.

---

## Ablauf im Unterricht

1. **Lehrer-Link am Laptop öffnen**, Beamer und Lautsprecher an, **F** für Vollbild. Oben rechts steht der Code der Sitzung.
2. **Anmeldung:** Die SuS scannen den QR-Code und geben Vornamen und den ersten Buchstaben des Nachnamens ein (z. B. „Lena K.“). Die Namen erscheinen am Beamer. Mit **×** entfernst du unpassende Namen.
3. **Einstellungen** (unter den Namen, bleiben gespeichert):
   - **Spielart:** Reihe oder Bedarf.
   - **Nährwert:** Kalorien, Fett, Kohlenhydrate, Eiweiß oder Gemischt. Bei *Reihe* wird danach geordnet (Gemischt: jeder Versuch mit einem anderen Nährwert, im Finale wird einer ausgelost). Bei *Bedarf* kommen nur Bedarfskarten mit diesem Nährwert vor (Gemischt: alle 32).
   - **Schwierigkeit** (nur Reihe): *Einfach*: Die Werte der Karten in der Reihe sind sichtbar, geschätzt wird nur die neue Karte. *Schwer*: Alle Werte bleiben verdeckt wie am Tisch, aufgedeckt wird erst bei der Auflösung.
   - **Qualifying:** dauert 2, 3 oder 5 Minuten (voreingestellt: 3 Minuten).
   - **Finale:** mit 2, 3 oder 4 Personen.
   - **Sieg mit** (nur Bedarf): 3 oder 5 Bedarfskarten.
   - **Zeitlimit** (fürs Finale): *Mit Zeitlimit* (sehr großzügig, siehe unten) oder *Ohne Zeitlimit*.
4. **Qualifying starten** (Enter). Nach einem Countdown spielen alle **gleichzeitig auf dem eigenen Handy**, für alle gleich lang. Im ersten Versuch bekommen alle dieselben Karten, im zweiten Versuch wieder alle dieselben usw. Am Beamer laufen die Restzeit und eine Live-Rangliste.
5. Nach einem Fehler zeigt das Handy die **Auflösung** mit allen Werten (bei *Bedarf* auch die beste mögliche Kombination). Mit **Neuer Versuch** geht es weiter. Es zählt der **beste Versuch** (siehe Regeln). Im Qualifying gibt es kein Zeitlimit pro Karte. Nachzügler können über den kleinen QR-Code noch einsteigen, haben dann aber nur die restliche Zeit.
6. Ist die Zeit um, zeigt der Beamer den **Endstand**, die Handys zeigen das eigene Ergebnis und den Platz. **Weiter zum Finale** (Enter). Mit „Qualifying beenden“ (zweimal Enter) lässt es sich auch vorzeitig beenden, dann zählt der beste Versuch bis dahin.
7. **Finale einrichten:** Die Besten sind vorausgewählt, über die Auswahllisten lässt sich jemand austauschen. Spielart, Nährwert, Schwierigkeit und Zeitlimit kannst du fürs Finale noch ändern. **Finale starten** (Enter), sobald alle Finalisten-Handys verbunden sind.
8. **Finale:** Gespielt wird auf dem Handy, am Beamer sieht man die Karte bzw. Bedarfskarte, wer schon abgegeben hat, und danach die **Auflösung mit Ton** (siehe Regeln). Nach jeder Auflösung startet die nächste Runde automatisch (Reihe nach 9, Bedarf nach 15 Sekunden). Mit der **Leertaste** hältst du an, um die Auflösung zu besprechen, und mit der Leertaste geht es weiter.
9. **Siegerehrung** mit Pokal und Platzierungen. Bei *Reihe* steht daneben die ganze Reihe mit allen Werten, bei *Bedarf* die gesammelten Bedarfskarten. Danach **Revanche** (Enter, gleiche Finalisten, neue Karten), **Andere Finalisten** oder **Neues Spiel** (Esc, zurück zur Anmeldung, alle bleiben angemeldet).

### Regeln im Detail

**Reihe**
- Die Reihe steht senkrecht: oben mehr, unten weniger (wie am Tisch: „oberhalb = mehr“). Man tippt auf die Lücke, in die die neue Karte gehört, und bestätigt mit „Hier einordnen“. Wer sich vertippt, kann vor dem Bestätigen eine andere Lücke wählen.
- Es kommen nur Karten zusammen in eine Reihe, deren Werte sich **deutlich unterscheiden** (mindestens 10 % und mindestens 10 kcal bzw. 1 g). Fast gleiche Werte wie Banane und Apfel (beide 0,2 g Fett) kommen also nie gleichzeitig vor, das Einordnen ist nie Glückssache.
- Ein Versuch hat 12 Karten zum Einordnen (dazu die Startkarte).
- **Qualifying:** Es zählt der Versuch mit den meisten richtig eingeordneten Karten, bei Gleichstand die kürzere Bedenkzeit in diesem Versuch.
- **Finale (K.-o.):** Alle ordnen gleichzeitig dieselbe Karte in dieselbe Reihe ein. Wer falsch liegt, scheidet aus. **Liegen alle falsch, bleiben alle im Spiel.** Scheiden mehrere in derselben Runde aus, steht vorn, wer näher an der richtigen Lücke lag, dann wer schneller war. Wer zuletzt übrig ist, gewinnt. Schaffen mehrere alle 12 Karten, gewinnt die kürzere Bedenkzeit insgesamt.

**Bedarf**
- Bedarfskarte plus 10 Lebensmittel (je 100 g), bis zu 5 auswählen. Die Werte sind beim Auswählen verdeckt (wie am Tisch). Es gibt immer eine Kombination, die den Zielwert trifft.
- **Qualifying:** Eine Bedarfskarte ist geschafft, wenn die Summe **zwischen 80 und 100 %** des Zielwerts liegt. Dann kommt die nächste Bedarfskarte. Zu viel oder zu wenig beendet den Versuch. Es zählt die **längste Serie**, bei Gleichstand die höhere Trefferquote (Ø, wie nah man im Schnitt am Zielwert war), dann die kürzere Bedenkzeit.
- **Finale (wie am Tisch):** Alle bekommen dieselbe Bedarfskarte und dieselben 10 Lebensmittel. Wer am nächsten am Zielwert liegt, ohne ihn zu überschreiten, bekommt die Bedarfskarte. Bei Gleichstand bekommen alle Gleichstehenden eine (statt Schere-Stein-Papier). Wer zuerst 3 (bzw. 5) Karten hat **und allein vorn liegt**, gewinnt, sonst geht es weiter.

**Zeitlimits** (nur im Finale, getestet wird Wissen, nicht Tipptempo)
- Reihe: 30 Sekunden plus 3 Sekunden pro Karte in der Reihe (z. B. 45 Sekunden bei 5 Karten).
- Bedarf: 2 Minuten.
- Die Runde endet sofort, wenn alle abgegeben haben.
- Ohne Zeitlimit gibt es keinen Zeitbalken. Gibt im Finale jemand nicht ab (z. B. Handy weggelegt), beendest du die Runde am Beamer mit **Runde beenden**: Bei *Reihe* scheidet aus, wer nicht abgegeben hat, bei *Bedarf* bekommt diese Person in der Runde nichts. Der Knopf funktioniert auch mit Zeitlimit, etwa wenn ein Handy ausgefallen ist.

### Tasten am Beamer

| Taste | Funktion |
|---|---|
| Enter | Qualifying starten / beenden, Finale starten, Revanche |
| Leertaste | Finale: anhalten (nach der Runde) / weiter |
| Esc | Neues Spiel (zurück zur Anmeldung) |
| F | Vollbild |
| M | Ton an/aus |

**Tipps**
- Die Handys sind immer stumm, auch auf der Übungsseite. Ton gibt es nur im Finale über den Beamer-Laptop (mit **M** oder dem Knopf oben rechts ausschaltbar).
- Auf den Wartebildschirmen stehen „Wusstest du?“-Sätze aus den Infotexten (Makronährstoffe, Energiebedarf).
- Die Übungsseite hat unter **Alle Karten ansehen** eine Tabelle aller Lebensmittel mit Werten, sortierbar nach Nährwert, und alle Bedarfskarten.
- Der Bildschirm der Handys bleibt während des Spiels an (sofern der Browser das unterstützt).
- Wer die Seite versehentlich schließt, scannt den QR-Code noch einmal. Das Handy wird wiedererkannt, solange derselbe Browser benutzt wird. Im Qualifying geht es dann mit einem neuen Versuch weiter, der beste bisherige Versuch bleibt gespeichert.
- **Mehrere Klassen gleichzeitig:** Jede Lehrkraft öffnet `/lehrer` und bekommt einen eigenen Code. **Sitzung → Neue Sitzung** erzeugt einen neuen Code.

---

## Inhalte ändern

Alle Inhalte stehen in **`public/js/inhalte.js`**. Auf GitHub die Datei öffnen, auf den Stift klicken, ändern, „Commit changes“. Nach ein bis zwei Minuten ist die Änderung im Spiel.

- **`LEBENSMITTEL`:** Name, Nährwerte je 100 g (kcal, fett, kh, eiweiss) und das Bild. Kommazahlen mit **Punkt** schreiben (`0.2`, nicht `0,2`), im Spiel erscheint trotzdem „0,2 g“. Erlaubte Bildnamen stehen oben in der Datei. Die Kennung (`id`) darf nicht doppelt vorkommen.
- **`BEDARFSKARTEN`:** Name, Alter (bestimmt das Personenbild: Kind, Jugendliche/r, Erwachsene/r, ältere Person), kurzer Text, Nährwert (`kcal`, `fett`, `kh` oder `eiweiss`) und Zielwert.
- **`ABSTAND`:** Wie deutlich sich zwei Werte unterscheiden müssen, damit sie zusammen in eine Reihe dürfen.
- **`TREFFER_PROZENT`:** Ab wie viel Prozent des Zielwerts eine Bedarfskarte im Qualifying als geschafft gilt (voreingestellt 80).
- **`TIPPS`:** die „Wusstest du?“-Sätze.

Nach einer Änderung prüfen die Tests (`node --test tests/regeln.test.mjs`) die Datei: fehlende Werte, doppelte Kennungen, unbekannte Bilder, Kalorien, die gar nicht zu den Nährwerten passen (z. B. verrutschtes Komma), zu wenige deutlich verschiedene Karten für eine Reihe und Bedarfskarten, die sich nicht treffen lassen.

**Hinweise zu den Karten aus dem Kartenspiel**
- Im gedruckten Deck sind 12 Lebensmittel doppelt, mit leicht anderen Werten (Gurke, Banane, Magerquark, Reis, Haferflocken, Ei, Hähnchen, Lachs, Avocado, Gouda, Mandeln, Butter). Im Spiel kommt jedes nur einmal vor, mit den Werten der Karten #01–#32. Es sind 52 Lebensmittel. Die Kartennummer steht in der Datei als `nr`.
- Bei einigen Bedarfskarten endete der Text mit „… mit“ (z. B. „Frühstück mit“). Das „mit“ ist weggelassen, weil der Zielwert im Spiel separat angezeigt wird.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens und die Spielergebnisse. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung und den zuletzt eingegebenen Namen. Die Übungsseite speichert nur die eigenen Rekorde im Browser.
- Schriften, Grafiken und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

## Kosten

Der kostenlose Cloudflare-Tarif reicht aus (100.000 Anfragen pro Tag). Im Qualifying schickt jedes Handy pro geschaffter Karte bzw. Bedarfskarte und pro Fehler eine kurze Nachricht, im Finale eine pro Abgabe. Eine Unterrichtsstunde mit 30 SuS braucht grob 1.000 bis 2.000 Anfragen.

---

## Notlösung ohne Cloudflare: Laptop als Server

1. [Node.js](https://nodejs.org) installieren (Version 18 oder neuer).
2. Das Repository herunterladen (bei GitHub: **Code → Download ZIP**) und entpacken.
3. Im Projektordner ein Terminal öffnen und `node server/local.mjs` eingeben.
4. Die angezeigte Adresse „Im Netz: http://192.168.…:8787/lehrer“ am Laptop öffnen (nicht `localhost`), damit der QR-Code die Netzwerkadresse enthält.

Voraussetzung: Handys und Laptop sind im selben WLAN, und das WLAN erlaubt Verbindungen zwischen den Geräten.

---

## Technik

| Datei | Inhalt |
|---|---|
| `public/js/inhalte.js` | ← die Inhalte (Lebensmittel, Bedarfskarten, Tipps) |
| `public/js/bilder.js` | Lebensmittel- und Personen-Grafiken (SVG) |
| `public/js/regeln.js` | Regeln, Zeiten, Zufall, Auswertung (gilt für Handys, Beamer und Server) |
| `public/js/karten.js` | Karten, Reihe, Auswahl und Auflösungen zum Anzeigen |
| `public/js/solo.js` | Einzelspiel auf dem Handy (Qualifying und Üben) |
| `public/js/lehrer.js` | Beamer-Seite: Anmeldung, Rangliste, Finale, Siegerehrung |
| `public/js/mitspielen.js` | Handy-Seite: Anmeldung, Qualifying, Finale |
| `public/js/ueben.js` | Übungsseite mit Kartenübersicht |
| `public/js/ton.js` | Töne (Web Audio, ohne Dateien) |
| `public/js/net.js` | WebSocket-Verbindung mit Wiederverbinden und Uhrabgleich |
| `src/room.js` | Raum-Logik einer Klasse (unabhängig vom Server) |
| `src/worker.js` | Cloudflare Worker und Durable Object (ein Raum je Code) |
| `server/local.mjs` | Lokaler Server ohne Zusatzpakete |

Im Finale prüft der Server jede Abgabe und entscheidet, wann eine Runde beginnt. Beamer und Handys gleichen ihre Uhren mit dem Server ab. Die Handys sehen die Abgaben der anderen erst nach der Auswertung.

### Tests

```
node --test tests/regeln.test.mjs tests/room.test.mjs   # Inhalte, Regeln und Raum-Logik
node tests/e2e.mjs                                      # Browser-Durchlauf: Beamer + 5 Handys (Playwright), Bildschirmfotos in tests/ergebnisse/
```

Der Browser-Durchlauf spielt wie eine Klasse: Die Handys lesen die Karten vom Bildschirm und tippen richtig oder absichtlich falsch. Geprüft werden Anmeldung, Qualifying *Reihe* (mit Fehlern, vorzeitig beendet) und Rangliste, ein Finale *Reihe* mit 4 Personen (alle falsch → alle bleiben, Pause und Weiter, Ausscheiden, Platzierungen), Revanche und Abbruch, Qualifying *Bedarf* mit abgelaufener Zeit, ein Finale *Bedarf* mit 3 Personen ohne Zeitlimit (Gleichstand, „Runde beenden“, Sieg mit 3 Karten), die Übungsseite und dass die Handys stumm bleiben.

**Lizenzen:** Schriften Bungee und Rubik unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.

---

© 2026 Sven Klawitter
