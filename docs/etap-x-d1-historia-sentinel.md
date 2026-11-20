# HydroSense: Etap X D1, historia Sentinel-2

## Przed i po

Porównanie dotyczy tego samego wyniku Sentinel-2 L2A dla Białej Podlaskiej: `52.0423, 23.0804`, 500 m, 2–31.08.2026 UTC, wybrana doba 26.08. Zrzuty obu wersji wykonano z tej samej zapisanej odpowiedzi raportu, bez zastępowania wartości danymi testowymi.

| Ekran | Przed (X C) | Po (X D1) |
| --- | --- | --- |
| Desktop 1440 px | [Dwa statyczne wykresy](media/x-d1/przed-1440.png) | [Interaktywna historia NDVI](media/x-d1/po-1440.png) |
| Telefon 390 px | [Wykresy jeden pod drugim](media/x-d1/przed-390.png) | [Interaktywna historia NDWI](media/x-d1/po-390.png) |

## Co się zmieniło

- Historia jest bezpośrednio pod mapą i kartami Sentinel-2. Jeden wykres przełącza się między NDVI, NDWI i NDMI; oś dat jest w UTC, oś wartości zawsze od −1 do +1. Rozmiar głównej mapy nie zmienił się.
- Punkt to istniejąca wartość indeksu. Romb oznacza brak danego indeksu w użytecznej dobie, krzyżyk odrzuconą dobę, a luka brak obserwacji. Nie ma linii między punktami, interpolacji ani zastępowania braku zerem. Nad wykresem widać liczbę odczytów serii względem liczby użytecznych dób.
- Linia i obwódka wyróżniają aktualną dobę raportu. Kliknięcie lub dotknięcie użytecznej doby zmienia raport. Klawiatura pokazuje podgląd strzałkami (również Home/End i skoki tygodniowe Page Up/Down), a Enter zatwierdza użyteczną dobę. Podgląd i wybór brakującej albo odrzuconej doby nie zmieniają raportu.
- Porównanie pokazuje dwie różne, użyteczne doby, trzy indeksy, zachmurzenie, użyteczne pokrycie i różnice tylko dla dostępnych par. Różnicę liczymy przed zaokrągleniem. Nie jest to trend ani dowód przyczyny. Krótkie objaśnienia serii rozróżniają kontrast powierzchniowej wody (NDWI) od sygnału uwodnienia roślinności (NDMI); żaden z nich nie mierzy wilgotności gleby.
- Link „Historia NDVI” w asystencie wybiera właściwą serię. Sama zmiana serii, podgląd daty lub ustawienie drugiej daty porównania nie wywołują żądań dostawców. Zatwierdzenie innej doby wykorzystuje już pobrane statystyki i odświeża raster oraz kontekst zgodnie z istniejącymi regułami.

## Rzeczywiste przykłady

| Punkt i zakres do 31.08.2026 UTC | Doby: użyteczne / odrzucone / bez obserwacji | Zmiana doby w teście; indeksy po wyborze (NDVI / NDWI / NDMI) |
| --- | --- | --- |
| Biała Podlaska `52.0423, 23.0804`, 500 m, 30 dni | 9 / 6 / 15 | 26 → 25.08, klawiatura; 0,58 / −0,55 / 0,13 |
| Veneto `45.523244962, 12.221163987`, 1 km, 90 dni | 18 / 9 / 63 | 30 → 27.08, mysz; 0,42 / −0,43 / 0,16 |
| Okolice Sulejówka `52.2668, 21.3112`, 500 m, 365 dni | 55 / 119 / 191 | 21 → 19.08, dotyk; 0,60 / −0,53 / 0,26 |

W Chrome porównano daty i wartości w wykresie, kartach oraz odpowiedzi. Po każdej zmianie doby odpowiedź znikała; nowa odnosiła się do tej samej daty co karty, raster i kontekst pogodowy. W Białej Podlaskiej zmiana z 26 na 25.08 zmieniła sumę opadów z poprzednich 7 dób z 15,80 mm na 31,60 mm. Sulejówek nadal poprawnie pokazuje brak pokrycia SoilGrids. To kontrola prezentacji rzeczywistych odpowiedzi dostawcy, nie walidacja naukowa.

## Testy i decyzja

- Chrome: 320, 390, 768 i 1440 px, PL/EN, Clean Nature i Warm Graphite. W kontrolowanych próbach potwierdzono pusty okres, brak pojedynczego indeksu, prawidłowe zero i odrzuconą scenę przy 90% zachmurzenia. Odrzucona doba nie jest wybierana do raportu.
- Sprawdzono OpenStreetMap, barwy naturalne, NDVI, NDWI i NDMI w wyborze obszaru. Otworzono i obejrzano PDF A4 po polsku i angielsku: zachowano dotychczasowy zakres (mapa, karty wszystkich indeksów, statyczna historia NDVI i NDMI, porównanie, metoda i zalecenia). Ekranowe kontrolki nie są drukowane.
- `npm test`: 97/97. `npm run lint` i `npm run build`: poprawnie.
- [Vercel Preview gałęzi Draft PR #2](https://hydrosense-demo-git-audit-bcf7d1-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-02&to=2026-08-31).

**Rekomendacja: GO dla X D2 po akceptacji Preview.** W kolejnym etapie warto skupić się na porównywaniu analogicznych okresów sezonu bez zmiany filtrów, klasyfikowania zdrowia roślin ani wyciągania wniosków z luk w obserwacjach.
