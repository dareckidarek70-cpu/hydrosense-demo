# HydroSense 2.0: Etap X E1, poprawki po audycie UX

[Vercel Preview gałęzi Draft PR #2](https://hydrosense-demo-git-audit-bcf7d1-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-02&to=2026-08-31). Punkt odniesienia: audyt X E wykonany na commicie `8476efc`.

## Co się zmieniło

1. **Raport zachowuje kontekst.** W nagłówku prowadzi do początku aktualnego raportu. Po przejściu do innego widoku wraca do ostatniego raportu w tej samej karcie przeglądarki. Przed otwarciem pierwszego raportu wejście demonstracyjne jest jawnie podpisane. Tryb, współrzędne, promień i zastosowane daty pozostają w URL. Zmiana okresu tworzy wpis w historii przeglądarki; odświeżenie oraz Wstecz/Dalej używają tego URL, nie zapamiętanego formularza.
2. **Wybór własnego punktu na telefonie.** Karta własnego obszaru i jeden istniejący przycisk otwarcia raportu znajdują się przed działkami demo. Po wskazaniu punktu karta pojawia się pod nagłówkiem, a przycisk otrzymuje fokus. Na desktopie karta nadal znajduje się obok mapy.
3. **Skróty w raporcie.** Historia Sentinel-2, sezony, pogoda, gleba i HydroSense AI są dostępne przez odnośniki do istniejących sekcji. Cele są fokusowalne, a odstęp wynika z rzeczywistej wysokości nagłówka. Odnośnik nie obiecuje sekcji, której raport nie renderuje.
4. **Trzy rodzaje porównania.** PL/EN: „Porównanie wartości” / “Value comparison” (indeksy z dwóch dat), „Porównanie map” / “Map comparison” (dwa zobrazowania), „Porównanie sezonów” / “Season comparison” (dwa okna). Istniejące mechanizmy pozostają bez zmian.

## Przed i po

| Widok | Przed: Preview X D3 | Po: build X E1 w Chrome |
| --- | --- | --- |
| Telefon, 390 px, po wybraniu środka mapy | [Karta pod działkami demo i akcja poza ekranem](media/x-e/03-wybor-punktu-mobile.jpg) | [Karta i pojedyncze CTA widoczne od razu](media/x-e1/telefon-po.jpg) |
| Desktop, raport Białej Podlaskiej | [Nagłówek bez skrótów](media/x-e/01-raport-desktop.jpg) | [Skróty nad okresem, mapa jako pierwszy moduł danych](media/x-e1/desktop-po.jpg) |

## Weryfikacja

- **Biała Podlaska, 500 m:** własne daty `2026-08-06…2026-08-29` zachowane po odświeżeniu, Wstecz/Dalej i przejściu przez stronę główną. Porównanie dwóch dat pokazało wartości i dwa obrazy True Color (26 i 25 sierpnia). Porównanie sierpniowych okien 2025/2026 dało 6 i 10 użytecznych dni; główny okres pozostał bez zmian.
- **Veneto, 1 km:** EN i Warm Graphite przy 768 px; zachowanie trybu `water` w URL, kompletna seria pogodowa, dostępne odczyty SoilGrids. **Sulejówek, 500 m:** brak pokrycia SoilGrids pozostał jawnym stanem, AI cytowało scenę 21.08.2026 i okna pogodowe, nie podawało wyniku gleby.
- **Nawigacja demo i urządzenia:** demo C pozostało demo C przy powrocie z Home i przez Wstecz. Chrome: 320, 390, 768 i 1440 px; PL/EN, oba motywy. Na 320 i 390 px po wyborze punktu przycisk był w widoku i przed sekcją demo. Enter na pięciu skrótach przenosił fokus na właściwy nagłówek; w testach poprawiono osobną, stałą regułę offsetu gleby kolidującą z nagłówkiem na telefonie.
- **PDF:** przycisk eksportu uruchomiono z raportu rzeczywistego. Nie zmieniano mechanizmu wydruku, arkusza wydruku ani zakresu danych. Skróty są ukryte przez istniejącą klasę `print-hidden`. Brak nowego, zapisanego PDF do porównania bajtowego na etapie testów lokalnych.
- `npm test`: **108/108**; `npm run lint`, `npm run build`, `git diff --check`: poprawnie. Brak nowych zależności lub zmian w endpointach.

**GO do oceny Draft PR #2 na Preview**, bez automatycznego scalenia do `main` lub wdrożenia produkcyjnego. Zakres: cztery zatwierdzone poprawki, bez zmian algorytmów, źródeł, motywów ani wyników.
