# HydroSense 2.0: końcowy audyt SoilGrids (IX D)

**Decyzja: GO dla zakończenia Etapu IX jako podglądu na Vercel Preview.** Nie jest to zgoda na odczyt globalny, wdrożenie produkcyjne ani użycie w ocenie upraw. Punkt odniesienia: `abeac0d`; kod zweryfikowany na Vercel: `ea7a96a`. PR #2 pozostaje Draft; zakres wycinków, głębokość, katalog właściwości, PDF i oceny upraw nie zmieniły się.

## Odtworzenie z archiwum

20.11.2026 rozpakowano archiwum IX C do pustego katalogu i utworzono nowe środowisko Python 3.12 z Rasterio 1.4.4. Generator działał bez `--download`; źródłem były wyłącznie manifest i oryginalne pliki VRT/GeoTIFF. Repozytoryjny JSON użyto dopiero w porównaniu końcowym.

| Kontrola | Wynik |
| --- | --- |
| Archiwum ZIP | 4 187 333 B; SHA-256 `01ae947f22006a87223f20a4a29c8cd2af04ac2bf7dad7060421bf99444916bd` |
| Pliki wejściowe | **28/28** zgodnych skrótów i rozmiarów (8 indeksów VRT i 20 GeoTIFF) |
| Odtworzony JSON | `cmp`: identyczny bajtowo; 124 667 B; SHA-256 `3552c840663a2db94a130e8b04eafb7234b687b28ea71782582a82dda1b179e4` |
| Metadane | `soilgrids-igh250-6c4b8ac630977b09`, przygotowano 20.11.2026, IGH 250 m, głębokość 0–5 cm, ISRIC i CC BY 4.0. Jednostki i dzielniki zgodne z IX C: 10 dla pH, frakcji i SOC oraz 100 dla gęstości. |

Niezależny od generatora [skrypt audytu](../scripts/audit-soil-integrity.py) czyta oryginalne VRT bez przepisywania ich źródeł. Polecenia po rozpakowaniu i zainstalowaniu Rasterio:

```sh
python scripts/build-soil-preview.py --capture /path/to/sources --prepared-on 2026-11-20 --out /tmp/soil-ix-d.json
cmp /tmp/soil-ix-d.json lib/soil-preview-regions.json
python scripts/audit-soil-integrity.py --capture /path/to/sources --regenerated /tmp/soil-ix-d.json
```

## Georeferencja i dane

Porównano pozycje JS z niezależnym przeliczeniem [PROJ/GDAL](https://proj.org/en/stable/operations/projections/igh.html): **128** punktów w deterministycznej próbie (64 na obszar, z podpróbą 25 mm od granic komórek), **16** punktów 25 mm po obu stronach ośmiu boków wycinków oraz **8** punktów dokładnie na tych bokach. Maksymalna różnica współrzędnych: **9,32 × 10⁻⁹ m**, tolerancja porównania **0,001 m**. Poza bokami dokładnymi indeks i status zgadzały się w **144/144** próbach. Na dokładnej krawędzi 3/8 odczytów zaokrągliły się do sąsiedniego indeksu; żadna różnica nie przekroczyła jednej komórki ani tolerancji. Reguła półotwartego rastra pozostała bez zmian.

| Obszar | Komórki | Komplet | Częściowe | NoData | Ważne zera |
| --- | ---: | ---: | ---: | ---: | ---: |
| Biała Podlaska | 256 | 213 | 0 | 43 | 0 |
| Veneto | 3243 | 1610 | 0 | 1633 | 0 |
| Razem | **3499** | **1823** | **0** | **1676** | **0** |

Porównano z VRT **27 992/27 992 pól i masek**. Maski wszystkich ośmiu warstw są bitowo zgodne w obu obszarach. Dodatkowy odczyt pojedynczych pozycji, poza próbą IX C: **128 komórek × 8 = 1024/1024** zgodnych odczytów. SOC i gęstość nadal wymagają korekty indeksu o trzy kolumny (750 m różnicy początku VRT); inne warstwy nie wymagają korekty. Odczyt nie resampluje, nie interpoluje i nie wybiera najbliższego piksela. Na danych kontrolnych zero w ważnej masce pozostaje zerem; brak pojedynczego pasma lub kwantyla daje wynik częściowy bez wymyślania wartości.

## Odporność i poprawka

- Generator odrzucił **6/6** prób: brak pliku, obcięty VRT, podstawienie innej warstwy oraz ponownie zahaszowane źródła z błędnym CRS, maską lub rozdzielczością. Żaden przypadek nie wygenerował paczki.
- W IX C statyczny import JSON wiązał poprawność buildu z opcjonalną paczką, a za krótka tablica mogła dać `undefined` w miejscu liczby. IX D odczytuje plik na serwerze, weryfikuje zatwierdzony SHA-256, schemat, wymiary, jednostki, długości pasm i kolejność kwantyli. Tracing dołącza plik tylko do funkcji raportu; wynik jest buforowany w procesie. Nowa paczka wymaga audytu i aktualizacji zatwierdzonego skrótu.
- Uszkodzenie paczki daje stan niedostępności, nie NoData, nie brak pokrycia i nie liczbę zastępczą. W osobnej kopii buildu z niepoprawnym JSON: **raport 200, SoilGrids niedostępne, Sentinel‑2 200 (16 mozaik), pogoda 200 (31 dni), regułowe AI 200**. Brak nowej zależności od ISRIC ani od modelu AI. Nie wprowadzono danych gleby do pytań ani ocen.

## Preview, wydajność i regresja

Pomiar zalogowanym Chrome: zakładka Network → Timing → „Oczekiwanie na odpowiedź serwera” dla dokumentu HTTP 200, identyczny punkt `52.059532736,23.064128316` i okres 01–31.08.2026, wyłączony cache przeglądarki, 5 prób na kod. Anonimowe HTTP 302 logowania odrzucono. Czasy w ms:

| Wersja | Próbki | Mediana |
| --- | --- | ---: |
| IX C `abeac0d` | 806,72 · 755,67 · 302,72 · 219,07 · 556,83 | **556,83** |
| IX D `ea7a96a` | 187,06 · 585,94 · 204,43 · 219,83 · 206,84 | **206,84** |

Mała i zmienna próba, bez kontroli instancji Vercel: nie dowodzi przyspieszenia o daną wartość ani nie wyznacza SLA. Wydruk, historia i pogoda mają niezależne ścieżki po załadowaniu dokumentu. Plik gleby nie zmienił rozmiaru i pozostał po stronie serwera; po stronie klienta tylko wynik wybranego piksela (176 B przed narzutem React w próbce IX C). W lokalnych buildach suma nieskompresowanych JS i CSS w `.next/static` wyniosła 1 074 069 B dla IX C oraz 1 074 616 B dla IX D (**+547 B**, ok. 0,05%; nie jest to transfer pojedynczej strony). W żadnym z bundli nie było paczki; rejestr plików funkcji raportu zawiera ją po stronie serwera. Trasa wyników nie zawiera runtime HTTP do ISRIC.

[Preview, na którym wykonano pomiary i regresję](https://hydrosense-demo-6iwpad2sz-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.059532736&lng=23.064128316&radius=500&from=2026-08-01&to=2026-08-31#soil-title).

**Regresja:** 75/75 testów, lint i build przeszły. Na Preview potwierdzono PL/EN, Clean Nature i Warm Graphite oraz 320/390/768/1440 px. Kolory i układ zachowano. „Brak danych SoilGrids dla tej komórki” i „Punkt poza przygotowanym obszarem podglądu” mają odrębne nagłówki. Widoczne są 250 m, 0–5 cm, modelowy charakter, 90% przedział predykcji pH i ostrzeżenie przed wnioskowaniem o całej działce.

**Sentinel‑2:** obraz w raporcie, historia NDVI/NDMI, pogoda i panel AI działają na Preview; mapa bazowa oraz True Color, NDVI, NDWI, NDMI faktycznie załadowały rastry. Lokalnie potwierdzono odpowiedź regułową o życie. **PDF:** rzeczywisty eksport w Chrome, 1 strona A4 (448 727 B). Odczyt tekstu i render potwierdziły mapę Sentinel‑2, indeksy i historię oraz brak SoilGrids i pogody w wydruku.

## Ograniczenia

To [model SoilGrids](https://doi.org/10.5194/soil-7-217-2021), nie próbka terenowa ani walidacja laboratoryjna. Dotyczy dwóch wycinków i jednej warstwy. Nominalny przedział predykcji Q0.05–Q0.95 nie jest przedziałem ufności ani gwarancją lokalnej zgodności. Nie narzucamy sumy 100% medianom uziarnienia i nie wnioskujemy o wapnowaniu, nawożeniu ani plonach. Na granicach dokładnych różnice na poziomie arytmetyki zmiennoprzecinkowej mogą zmieniać przypisanie jednej z dwóch komórek. GUGiK pozostaje tylko odsyłaczem, nie źródłem danych aplikacji. Bez zmian w `main` ani produkcji.
