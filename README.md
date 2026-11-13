# KBS Makro-Mix

Ein Klassenspiel zu Nährwerten und Makronährstoffen, nach dem Kartenspiel „Makro-Mix“ aus dem Unterricht. Zwei Spielarten:

- **Reihe:** Lebensmittel nach Kalorien, Fett, Kohlenhydraten oder Eiweiß ordnen. Wo gehört die neue Karte in die Reihe?
- **Bedarf:** Eine Bedarfskarte nennt eine Person und einen Zielwert. Aus 10 Lebensmitteln bis zu 5 auswählen und dem Zielwert so nah wie möglich kommen, ohne ihn zu überschreiten.

Zwei Arten zu spielen, beide mit der ganzen Klasse (bis 30 SuS und mehr) gleichzeitig:

- **Klassenrunde:** Alle spielen Runde für Runde gleichzeitig dieselbe Karte bzw. Bedarfskarte. Die Auflösung kommt nach jeder Runde am Beamer, mit Punkte-Rangliste.
- **Qualifying + Finale:** Erst spielen alle allein auf dem Handy (mit Live-Rangliste am Beamer), dann spielen die Besten das Finale.

Nach einer Klassenrunde kann es auch direkt mit dem Finale weitergehen.

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
   - **Klassenrunde:** 10, 15 oder 20 Runden (voreingestellt: 15).
   - **Finale:** mit 2, 3 oder 4 Personen.
   - **Sieg mit** (nur Bedarf): 3 oder 5 Bedarfskarten.
   - **Zeitlimit** (für Finale und Klassenrunde): *Mit Zeitlimit* (sehr großzügig, siehe unten) oder *Ohne Zeitlimit*.
4. Entweder **Klassenrunde starten** (Taste K, siehe [Klassenrunde](#klassenrunde)) oder **Qualifying starten** (Enter). Nach einem Countdown spielen alle **gleichzeitig auf dem eigenen Handy**, für alle gleich lang. Im ersten Versuch bekommen alle dieselben Karten, im zweiten Versuch wieder alle dieselben usw. Am Beamer laufen die Restzeit und eine Live-Rangliste.
5. Nach einem Fehler zeigt das Handy die **Auflösung** mit allen Werten (bei *Bedarf* auch die beste mögliche Kombination). Mit **Neuer Versuch** geht es weiter. Es zählt der **beste Versuch** (siehe Regeln). Im Qualifying gibt es kein Zeitlimit pro Karte. Nachzügler können über den kleinen QR-Code noch einsteigen, haben dann aber nur die restliche Zeit.
6. Ist die Zeit um, zeigt der Beamer den **Endstand**, die Handys zeigen das eigene Ergebnis und den Platz. **Weiter zum Finale** (Enter). Mit „Qualifying beenden“ (zweimal Enter) lässt es sich auch vorzeitig beenden, dann zählt der beste Versuch bis dahin.
7. **Finale einrichten:** Die Besten sind vorausgewählt, über die Auswahllisten lässt sich jemand austauschen. Spielart, Nährwert, Schwierigkeit und Zeitlimit kannst du fürs Finale noch ändern. **Finale starten** (Enter), sobald alle Finalisten-Handys verbunden sind.
8. **Finale:** Gespielt wird auf dem Handy, am Beamer sieht man die Karte bzw. Bedarfskarte, wer schon abgegeben hat, und danach die **Auflösung mit Ton** (siehe Regeln). Nach jeder Auflösung startet die nächste Runde automatisch (Reihe nach 9, Bedarf nach 15 Sekunden). Mit der **Leertaste** hältst du an, um die Auflösung zu besprechen, und mit der Leertaste geht es weiter.
9. **Siegerehrung** mit Pokal und Platzierungen. Bei *Reihe* steht daneben die ganze Reihe mit allen Werten, bei *Bedarf* die gesammelten Bedarfskarten. Danach **Revanche** (Enter, gleiche Finalisten, neue Karten), **Andere Finalisten** oder **Neues Spiel** (Esc, zurück zur Anmeldung, alle bleiben angemeldet).

### Klassenrunde

Die ganze Klasse spielt gleichzeitig, Runde für Runde. Am Beamer stehen die Karte, wie viele schon abgegeben haben, und die Punkte-Rangliste (die besten 10). Nach jeder Runde kommt die Auflösung am Beamer, danach startet die nächste Runde automatisch. Mit der **Leertaste** hältst du an, um zu besprechen. **Runde beenden** wartet nicht länger auf Nachzügler, **Klassenrunde beenden** springt zum Endstand. Am Ende: **Weiter zum Finale** (Enter, die Besten nach Punkten sind vorausgewählt), **Noch eine Klassenrunde** (K) oder **Neues Spiel** (Esc).

**Reihe als Klassenrunde** (nah am Kartenspiel, mit Zweifeln):
- Jede Runde kommt eine neue Karte. Alle entscheiden auf dem Handy: **einordnen** oder **„Ich zweifle!“** (zweimal tippen, damit niemand aus Versehen zweifelt).
- Die Karte kommt dorthin, wo die **Mehrheit** sie hingelegt hat, auch wenn das falsch ist (bei Gleichstand die untere Lücke). Die Werte bleiben verdeckt. Am Beamer sieht man, wie viele welche Lücke gewählt haben.
- **Zweifelt jemand, wird die Reihe aufgedeckt.** Steckt ein Fehler drin, bekommen alle Zweifelnden **+3 Punkte**. War die Reihe richtig, verlieren sie **2 Punkte** (der Punktestand fällt nie unter 0). Wer gezweifelt hat, steht am Beamer, das bremst Dauerzweifler. Danach beginnt eine neue Reihe, wie am Tisch.
- Jede passend eingeordnete Karte bringt **+1 Punkt**. Gutgeschrieben wird erst beim Aufdecken. So verrät der Punktestand nicht, ob in der Reihe ein Fehler steckt.
- Ist eine Reihe voll (12 Karten), wird sie automatisch aufgedeckt. Nach der letzten Runde wird die laufende Reihe aufgedeckt.
- In der Klassenrunde sind die Werte immer verdeckt, die Einstellung *Schwierigkeit* gilt hier nicht.

**Bedarf als Klassenrunde:**
- Alle bekommen dieselbe Bedarfskarte und dieselben 10 Lebensmittel. So lässt sich die Lösung am Beamer gemeinsam besprechen.
- Punkte: **3** für die beste mögliche Kombination, **2** für mindestens 90 % des Zielwerts, **1** für mindestens 80 %, **0** bei zu wenig oder zu viel.
- Am Beamer: beste Kombination, wie viele wie viele Punkte bekommen haben und welche Lebensmittel wie oft gewählt wurden.

**Rangliste:** mehr Punkte vorn. Bei Gleichstand teilen sich die Personen den Platz. Für die Reihenfolge innerhalb eines Platzes und für die Auswahl fürs Finale zählen dann mehr richtige Abgaben, danach die kürzere Bedenkzeit.

**Stabil mit der ganzen Klasse:** Wer nicht verbunden ist (Handy aus, WLAN weg), hält keine Runde auf: Die Runde endet, sobald alle verbundenen Handys abgegeben haben. Bei Zeitlimit melden auch die Handys selbst das Ende der Zeit, falls der Beamer-Laptop kurz schläft. Wer die Seite neu öffnet, wird wiedererkannt und spielt mit seinem Punktestand weiter. Nachzügler können jederzeit einsteigen.

### Computergegner (CPU) im Finale

Im Finale lässt sich in jeder Auswahlliste statt einer Person ein **🤖 CPU-Gegner** wählen: *leicht*, *mittel* oder *schwer*. Hat sich nur eine Person qualifiziert, ist Platz 2 automatisch mit „CPU (mittel)“ belegt. Es können auch mehrere CPUs mitspielen (z. B. eine Person gegen zwei CPUs), aber mindestens eine Person muss dabei sein.

- Die CPU schätzt die Nährwerte wie ein Mensch, nur mit einem festen Schätzfehler: *leicht* grob, *schwer* fast genau. Deshalb liegt sie vor allem bei knappen Entscheidungen daneben.
- Ungefähre Stärke: *Reihe* – leicht ordnet 58 % der Karten richtig ein, mittel 73 %, schwer 93 %. *Bedarf* – leicht landet im Schnitt bei 74 % des Zielwerts, mittel bei 83 %, schwer bei 92 % (dabei überschreitet sie ihn manchmal).
- Die CPU lässt sich ein paar Sekunden Bedenkzeit und erscheint dann am Beamer als „abgegeben“. Haben alle Menschen abgegeben, antwortet sie sofort: Niemand wartet auf die CPU.
- Die Stärken stehen in `public/js/regeln.js` unter `CPU_FEHLER` (Reihe) und `CPU_BEDARF` (Bedarf). Kleinere Zahl = genauer.

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

**Zeitlimits** (im Finale und in der Klassenrunde, getestet wird Wissen, nicht Tipptempo)
- Reihe: 30 Sekunden plus 3 Sekunden pro Karte in der Reihe (z. B. 45 Sekunden bei 5 Karten).
- Bedarf: 2 Minuten.
- Die Runde endet sofort, wenn alle abgegeben haben.
- Ohne Zeitlimit gibt es keinen Zeitbalken. Gibt im Finale jemand nicht ab (z. B. Handy weggelegt), beendest du die Runde am Beamer mit **Runde beenden**: Bei *Reihe* scheidet aus, wer nicht abgegeben hat, bei *Bedarf* bekommt diese Person in der Runde nichts. Der Knopf funktioniert auch mit Zeitlimit, etwa wenn ein Handy ausgefallen ist.

### Tasten am Beamer

| Taste | Funktion |
|---|---|
| Enter | Qualifying starten / beenden, Finale starten, Revanche, nach der Klassenrunde: weiter zum Finale |
| K | Klassenrunde starten (auch: noch eine Klassenrunde) |
| Leertaste | Finale und Klassenrunde: anhalten (nach der Runde) / weiter |
| Esc | Neues Spiel (zurück zur Anmeldung) |
| F | Vollbild |
| M | Ton an/aus |

**Tipps**
- Die Handys sind immer stumm, auch auf der Übungsseite. Ton gibt es nur über den Beamer-Laptop, im Finale und in der Klassenrunde (mit **M** oder dem Knopf oben rechts ausschaltbar).
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

Die Punkte der Klassenrunde stehen in `public/js/regeln.js` unter `PUNKTE` (z. B. `zweifelRichtig: 3`) und lassen sich dort genauso ändern.

Nach einer Änderung prüfen die Tests (`node --test tests/regeln.test.mjs`) die Datei: fehlende Werte, doppelte Kennungen, unbekannte Bilder, Kalorien, die gar nicht zu den Nährwerten passen (z. B. verrutschtes Komma), zu wenige deutlich verschiedene Karten für eine Reihe und Bedarfskarten, die sich nicht treffen lassen.

**Hinweise zu den Karten aus dem Kartenspiel**
- Im gedruckten Deck sind 12 Lebensmittel doppelt, mit leicht anderen Werten (Gurke, Banane, Magerquark, Reis, Haferflocken, Ei, Hähnchen, Lachs, Avocado, Gouda, Mandeln, Butter). Im Spiel kommt jedes nur einmal vor, mit den Werten der Karten #01–#32. Es sind 52 Lebensmittel. Die Kartennummer steht in der Datei als `nr`.
- Alle Werte gelten **je 100 g**, wie auf den gedruckten Karten. Im Spiel steht „je 100 g“ auf jeder Lebensmittelkarte und in jedem Satz mit einem Wert.
- **Geprüft** wurden alle Werte gegen den Bundeslebensmittelschlüssel: *Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0*, https://doi.org/10.25826/Data20251217-134202-0, Lizenz CC BY 4.0. **Kohlenhydrate** zählen ohne Ballaststoffe, wie auf deutschen Verpackungen.
- **Angepasst** (Werte aus dem BLS 4.0, je 100 g: kcal / Fett / Kohlenhydrate / Eiweiß):

| Karte | Lebensmittel | vorher (Karte) | jetzt (BLS) | Grund |
|---|---|---|---|---|
| #03 | Magerquark | 66 / 1,0 / 4,3 / 10,0 | 66 / 0,2 / 3,7 / 11,9 | 1 g Fett ist für Magerquark zu viel (entspricht Karte #45) |
| #04 | Kidneybohnen, gekocht | 116 / 0,7 / 10,5 / 9,3 | 129 / 1,0 / 15,2 / 8,6 | Kohlenhydrate passten nicht zur Energie |
| #21 | Linsen, gekocht | 116 / 0,4 / 20,1 / 9,0 | 119 / 0,7 / 15,5 / 9,1 | Kohlenhydrate mit Ballaststoffen gezählt |
| #24 | Kichererbsen, gekocht | 164 / 2,6 / 27,4 / 8,9 | 151 / 3,0 / 17,4 / 8,4 | Kohlenhydrate mit Ballaststoffen gezählt |
| #26 | Hummus | 166 / 9,6 / 14,3 / 7,9 | 324 / 28,5 / 8,0 / 5,9 | US-Produkt mit wenig Tahin/Öl; Kohlenhydrate mit Ballaststoffen |
| #52 | Roggenbrot | 259 / 3,3 / 48,3 / 8,5 | 220 / 1,2 / 43,0 / 6,0 | Werte eines US-„rye bread“ (mit Weizen und Fett) |
| #54 | Mozzarella | 280 / 17,0 / 3,0 / 18,0 | 259 / 21,0 / 0,0 / 17,1 | Energie passte nicht zu den Nährwerten |
| #55 | Schwarze Bohnen, gekocht | 132 / 0,5 / 23,7 / 8,9 | 131 / 0,6 / 17,8 / 9,1 | Kohlenhydrate mit Ballaststoffen gezählt (BLS: Gartenbohne reif, gekocht) |
| #60 | Kokosraspeln | 660 / 64,5 / 23,7 / 6,9 | 676 / 65,2 / 7,8 / 7,4 | Kohlenhydrate mit Ballaststoffen gezählt |
| #61 | Brezel | 339 / 4,4 / 68,0 / 10,0 | 282 / 4,1 / 50,0 / 9,1 | Werte einer US-Soft-Pretzel statt Laugenbrezel |

- **Nicht geändert**, obwohl der BLS etwas anderes angibt, weil die Werte natürlich schwanken: Lachs und Makrele (Fettgehalt je nach Zucht und Fangzeit), Avocado (Sorte, Reife), Tofu (Festigkeit), Couscous (Wassermenge beim Kochen), Datteln (Sorte), Thunfisch, Banane, Mandeln, Walnüsse.
- Bei einigen Bedarfskarten endete der Text mit „… mit“ (z. B. „Frühstück mit“). Das „mit“ ist weggelassen, weil der Zielwert im Spiel separat angezeigt wird.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens und die Spielergebnisse. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung und den zuletzt eingegebenen Namen. Die Übungsseite speichert nur die eigenen Rekorde im Browser.
- Schriften, Grafiken und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

## Kosten

Der kostenlose Cloudflare-Tarif reicht aus (100.000 Anfragen pro Tag). Im Qualifying schickt jedes Handy pro geschaffter Karte bzw. Bedarfskarte und pro Fehler eine kurze Nachricht, im Finale und in der Klassenrunde eine pro Abgabe. Eine Unterrichtsstunde mit 30 SuS braucht grob 1.000 bis 3.000 Anfragen.

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
node tests/e2e-klasse.mjs                               # Browser-Durchlauf Klassenrunde: Beamer + 6 Handys
node tests/last.mjs                                     # Lasttest: 30 Handys gleichzeitig (ohne Browser)
node tests/e2e-cpu.mjs                                  # Browser-Durchlauf: eine Person gegen die CPU (Reihe und Bedarf)
```

Alle Durchläufe lassen sich auch gegen die echte Cloudflare-Umgebung auf dem eigenen Rechner richten: `npx wrangler dev` starten und die Adresse anhängen, z. B. `node tests/last.mjs http://127.0.0.1:8787`.

**Lasttest:** 30 simulierte Handys spielen 10 Runden Klassenrunde *Reihe* (mit Zweifeln), 5 Runden *Bedarf* und ein Qualifying. Unterwegs verlieren 3 Handys die Verbindung und kommen später zurück, 2 Handys geben eine Runde lang nichts ab. Geprüft wird, dass keine Runde hängen bleibt, alle Abgaben zählen und die Auflösung bei allen Handys ankommt (lokal und mit `wrangler dev` jeweils nach wenigen Millisekunden).

Der Klassenrunden-Durchlauf prüft: Mehrheit legt falsch, zu Recht und zu Unrecht zweifeln, Punkte erst beim Aufdecken, Pause und Weiter, ein Handy wird geschlossen und kommt zurück, Endstand, weiter zum Finale, Klassenrunde *Bedarf* und vorzeitiges Beenden.

Der Browser-Durchlauf `e2e.mjs` spielt wie eine Klasse: Die Handys lesen die Karten vom Bildschirm und tippen richtig oder absichtlich falsch. Geprüft werden Anmeldung, Qualifying *Reihe* (mit Fehlern, vorzeitig beendet) und Rangliste, ein Finale *Reihe* mit 4 Personen (alle falsch → alle bleiben, Pause und Weiter, Ausscheiden, Platzierungen), Revanche und Abbruch, Qualifying *Bedarf* mit abgelaufener Zeit, ein Finale *Bedarf* mit 3 Personen ohne Zeitlimit (Gleichstand, „Runde beenden“, Sieg mit 3 Karten), die Übungsseite und dass die Handys stumm bleiben.

**Lizenzen:** Schriften Bungee und Rubik unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.

---

© 2026 Sven Klawitter
