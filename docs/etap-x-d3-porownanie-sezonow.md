# HydroSense: Etap X D3, porównanie sezonów Sentinel-2

## Dostępność i sposób użycia

Otwórz **Porównanie sezonów** pod historią obserwacji w raporcie własnego obszaru. Wpisz przedziały A i B, np. 1–30.08.2025 oraz 1–30.08.2026, i kliknij **Porównaj okresy**. Oba okna wykorzystują punkt i promień bieżącego raportu. Po wybraniu jednej użytecznej doby z każdego okna kliknij **Pokaż zobrazowania**. Widok sezonowy nie zmienia daty, warstwy, historii ani punktu głównego raportu.

- Zakres: od 1.01.2017 według dotychczasowej walidacji HydroSense, do ostatniej pełnej doby UTC. Daty są włączne, maksymalnie 30 dób na okno. Tryb zwykły nadal przyjmuje do 366 dni. Identyczne okna są odrzucane; dla częściowo nakładających się okien ostrzegamy, że próbki nie są niezależne. Tego samego zobrazowania nie da się porównać ze sobą.
- [Archiwum Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/Data/Others/Sentinel2_L2A_baseline.html) obejmuje przetwarzane ponownie i operacyjne produkty, ale poprawna data nie gwarantuje ani sceny w danym miejscu, ani przejścia istniejących filtrów jakości HydroSense. Bezpośrednie próby [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html) przez dotychczasową trasę HydroSense: Biała Podlaska, 1–30.08.2017, 4 użyteczne doby, 8 odrzuconych, 18 bez obserwacji; 1–30.01.2017, 0/5/25. Odpowiedź bez użytecznych scen nie jest awarią źródła ani wynikiem równym zero.

## Rzeczywiste porównania

W każdym przykładzie okna **1–30 sierpnia 2025 i 2026**, w UTC. `U/O/B` oznacza doby użyteczne, odrzucone i bez obserwacji. Wybrane daty pokazują konkretne zobrazowania, nie sceny uznane za reprezentatywne.

| Punkt i promień | 2025 / 2026: U/O/B | Daty zobrazowań, odstęp | Mediany NDVI / NDWI / NDMI (A → B) |
| --- | --- | --- | --- |
| Biała Podlaska `52.0423, 23.0804`, 500 m | `6/7/17` → `10/5/15` | 28.08.2025 → 26.08.2026, 363 dni | `0,59 / −0,57 / 0,11` → `0,59 / −0,57 / 0,13` |
| Veneto `45.523244962, 12.221163987`, 1 km | `6/2/22` → `6/3/21` | 25.08.2025 → 30.08.2026, 370 dni | `0,65 / −0,60 / 0,23` → `0,58 / −0,56 / 0,16` |
| Okolice Sulejówka `52.2668, 21.3112`, 500 m | `5/9/16` → `7/8/15` | 21.08.2025 → 21.08.2026, 365 dni | `0,73 / −0,67 / 0,23` → `0,73 / −0,65 / 0,27` |

[Desktop 1440 px, Biała Podlaska](media/x-d3/1440.png) · [Telefon 390 px, okolice Sulejówka, Warm Graphite](media/x-d3/390.png).

Wykresy mają tę samą skalę −1…+1 i oś dnia od początku okna, nie wspólną datę kalendarzową. Odczyt i jakość można sprawdzić dla każdego zwróconego dnia. Nie ma interpolacji, a odrzucone odczyty nie wchodzą do mediany ani zakresu. Podsumowanie pokazuje medianę i zaobserwowane minimum–maksimum dopiero od 3 odczytów dla danego indeksu w danym oknie. Jest to próg prezentacji, nie test istotności ani miara reprezentatywności. Różny rozkład dat, pokrycie, skład powierzchni i chmury ograniczają interpretację. Nie ma automatycznej diagnozy, prognozy plonu ani oceny przydatności upraw.

## Żądania i wydajność

- Otwarcie trybu, wpisywanie dat i zmiana indeksu wykresu: **0** zapytań. Jawne zatwierdzenie dwóch nowych okien: **2** żądania do istniejącego `/api/copernicus/stats`; ponowne użycie tej samej pary w testowanej sesji: **0**. Edycja od razu ukrywa poprzednią parę i anuluje przestarzałe pobieranie po stronie klienta. Treść odpowiedzi i cache muszą odpowiadać żądanym ramom UTC.
- Nie dodano tras ani wyjątków w limitach. Okna do 30 dni korzystają z dotychczasowej puli 10 niebuforowanych statystyk/min na instancję, wspólnej z krótkim raportem; nadal obowiązuje limit 8 równoległych prac serwera. Ważność cache: 5 minut w sesji, 10 minut na instancji serwera. To nie globalna gwarancja limitu; anulowanie po stronie przeglądarki nie gwarantuje przerwania obliczeń, które już rozpoczął dostawca.
- Rastery pojawiają się dopiero na żądanie dla pary wybranych dni. Ten sam kadr 720×324, BBOX, promień, skala i warstwa pochodzą z X D2; telefon pobiera tylko widoczną stronę. W próbach jedna scena True Color była już w cache głównego raportu: otwarcie pary zwiększyło licznik o **1**, nowa warstwa NDWI dla obu dni o **2**; ponowne otwarcie tych samych scen z cache dało **0**. Istniejący limit warstw 20/min na instancję nie został zmieniony.
- Pomiary w lokalnym Chrome, z rzeczywistą trasą: zatwierdzenie do obu gotowych statystyk **1,32–1,83 s**; pokazanie pary True Color **0,86–1,41 s**; NDWI obu dni **0,84–1,69 s**; ponowne otwarcie i zatwierdzenie okien z cache **0,13–0,19 s**. Czasy zawierają oczekiwanie i obsługę UI, nie są gwarancją ani serią pomiarów zimnego CDN.

## Regresja i decyzja

- Chrome: PL/EN, oba motywy, szerokości 320, 390, 768 i 1440 px. W trzech punktach porównano zasięgi i warstwy rastrów, rzeczywiste daty i liczby w odpowiedzi. Dla Sulejówka nadal poprawnie widniał brak pokrycia SoilGrids. Nie zmieniły się główna historia, treść odpowiedzi AI ani licznik pogody w trakcie korzystania z trybu.
- Próby kontrolowane: anulowanie opóźnionego okna i szybka edycja, odpowiedź z innym przedziałem i ponowienie pojedynczego żądania, brak użytecznej doby, częściowy indeks, okna identyczne/nakładające się, 31 dni oraz próba wyboru tej samej sceny w obu. Nie pojawiły się stare liczby ani niewybrane rastry.
- Eksport głównego raportu podczas aktywnego trybu sezonowego przygotował True Color dla doby raportu; PDF pozostał A4 i nie zawiera trybu sezonowego. `npm test`: 105/105, `npm run lint` i `npm run build`: poprawnie.
- [Vercel Preview gałęzi Draft PR #2](https://hydrosense-demo-git-audit-bcf7d1-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-02&to=2026-08-31).

**GO dla zakończenia Etapu X D na Preview po akceptacji.** Nie ma potrzeby rozszerzać limitów ani automatycznie dobierać reprezentatywnego dnia bez osobnej walidacji naukowej. Bez scalenia do `main` i bez wdrożenia produkcyjnego.
