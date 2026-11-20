# HydroSense 2.0: regionalne wycinki SoilGrids (IX C)

Przygotowano 20.11.2026. Wersja lokalnego zbioru: **`soilgrids-igh250-6c4b8ac630977b09`**, schemat 2. Identyfikator pochodzi z SHA-256 źródeł, geometrii wycinków i konfiguracji ekstrakcji; nie jest numerem wydania nadanym przez ISRIC ani datą pomiaru.

## Pokrycie

Dwa prostokąty w natywnej siatce IGH 250 m. Granice planowano wokół wcześniejszych punktów; wycinek Veneto zachowuje ciągły pas od lądu do laguny, a nie tylko miejsca z wartościami. Narożniki poniżej są przybliżeniem prezentacyjnym WGS84 (szerokość, długość); odczyt korzysta z dokładnych indeksów w IGH.

| Obszar | Wiersze × kolumny | Powierzchnia wycinka / komórek z kompletem | Dostępne / częściowe / NoData |
| --- | ---: | ---: | ---: |
| Biała Podlaska | 16 × 16 = 256 | 16,00 / 13,31 km² | 213 / 0 / 43 |
| Veneto, ląd i obrzeże laguny | 69 × 47 = 3243 | 202,69 / 100,63 km² | 1610 / 0 / 1633 |

| Obszar | NW | NE | SE | SW |
| --- | --- | --- | --- | --- |
| Biała Podlaska | 52.06317, 23.04856 | 52.06317, 23.10265 | 52.02435, 23.10643 | 52.02435, 23.05238 |
| Veneto | 45.56140, 12.13416 | 45.56140, 12.28054 | 45.40190, 12.31204 | 45.40190, 12.16592 |

Granica atlasu nie jest granicą pola. Powierzchnie są geometryczne, sumują komórki 62 500 m²; nie oznaczają powierzchni gruntów rolnych.

## Źródło, maski i skalowanie

- [Oficjalny WebDAV/VRT ISRIC](https://docs.isric.org/globaldata/soilgrids/WebDav.html): **8 indeksów VRT** (37 793 313 B metadanych) i **20 przecinających wycinki GeoTIFF** (11 915 038 B). Nie pobrano globalnych danych pikselowych. Archiwum z oryginalnymi ścieżkami i manifestem ma 4 187 333 B po spakowaniu. Nie trafia na Vercel; zbiór wynikowy zawiera SHA-256 i rozmiar każdej z 28 odpowiedzi.
- Sprawdzono CRS, siatkę, typ Int16, brak dodatkowego przelicznika GeoTIFF/VRT oraz jawne `NoData=-32768` w każdej warstwie i kaflu. SOC i gęstość objętościowa zaczynają się 750 m dalej na wschód niż pH, więc przy indeksowaniu ich okien odejmujemy **3 kolumny**. Fizyczne komórki pozostają wyrównane. Nie dodano resamplingu, interpolacji ani dopasowania do najbliższej wartości. Ułamkowe przesunięcia kafli wewnątrz VRT są zachowane zgodnie z indeksem dostawcy.
- Dzielimy surową wartość przez 10 dla pH, frakcji (% masy) i SOC (g/kg); przez 100 dla gęstości (kg/dm³). Frakcje to niezależne mediany zgodnie z [metodyką SoilGrids](https://soil.copernicus.org/articles/7/217/2021/), bez renormalizacji. Oba kwantyle pH muszą być dostępne i obejmować medianę, aby powstał nominalny 90% przedział predykcji.
- Maski sprawdzono osobno. W tym wycinku są identyczne we wszystkich ośmiu warstwach: **43 NoData w Białej i 1633 w Veneto w każdej warstwie**. Zmierzono zero komórek częściowych i zero niezamaskowanych zer. Przykładowe niezamaskowane zero i mieszaną komórkę przetestowano na danych kontrolnych; aplikacja zachowuje 0 tylko jako ważną liczbę, nie jako zastępstwo.
- Porównanie z **24 archiwalnymi wartościami WCS** IX A: 16/16 wartości dla dwóch punktów lądowych identycznych. W punkcie Wenecja wszystkie osiem plików WCS miało 0 bez tagu NoData, natomiast źródłowy VRT ma rzeczywiste NoData. Nie korzystamy z WCS przy budowie tej paczki ani na żywo.

## Przykładowe nowe odczyty

| Punkt | WGS84 | pH w wodzie (90% przedział predykcji) | Piasek / pył / ił (% masy) | SOC / gęstość |
| --- | --- | --- | --- | --- |
| Biała, próba losowa | 52.059532736, 23.064128316 | 5,4 (3,8–7,3) | 61,3 / 25,7 / 4,7 | 24,5 g/kg / 1,21 kg/dm³ |
| Veneto, próba losowa | 45.523244962, 12.221163987 | 7,7 (5,3–8,3) | 18,1 / 44,8 / 27,2 | 35,6 g/kg / 1,34 kg/dm³ |
| Biała, zamaskowana komórka | 52.061959460, 23.077411797 | NoData | NoData | NoData |
| Veneto, zamaskowana komórka | 45.560246929, 12.182664397 | NoData | NoData | NoData |
| Warszawa | 52.2297, 21.0122 | Poza wycinkami, nie NoData źródłowe | — | — |

Dotychczasowe odczyty Białej i lądowego Veneto zachowano. Nie interpretujemy przyczyny maski konkretnej komórki wyłącznie z wyniku NoData.

## Odtworzenie i wydajność

Rozpakować archiwum źródeł z zachowaniem ścieżek. W odizolowanym środowisku deweloperskim (Python 3.12, Rasterio 1.4.4) skrypt odtwarza identyczny JSON bez sieci i odrzuca pliki z niezgodnym SHA-256. `--download` jest osobnym trybem do przygotowania nowego archiwum, poza aplikacją.

```sh
python scripts/build-soil-preview.py --capture /path/to/ix-c --prepared-on 2026-11-20 --out lib/soil-preview-regions.json
python scripts/verify-soil-preview.py --capture /path/to/ix-c --pack lib/soil-preview-regions.json --ix-a /path/to/ix-a/isric
```

Zbiór serwerowy wzrósł z **3654 do 124 667 B** (19 027 B po gzip). W lokalnym mikroteście Node mediana/p95 samego parsowania JSON (1000 powtórzeń) wyniosła **0,006/0,008 ms** dla IX B i **0,274/0,345 ms** dla IX C. Średni czas wyboru komórki i utworzenia wyniku: **0,0008 ms** (200 tys. odczytów na rozgrzanym procesie). To nie pomiar opóźnienia sieciowego ani TTFB Vercel. Do klienta trafia wynik jednej komórki (przykład: **176 B** JSON przed narzutem React), nie cały zbiór. Panel nie wywołuje ISRIC i nie blokuje Sentinel-2 ani pogody.

**Weryfikacja:** 32 losowe komórki × 8 warstw, w tym NoData, sprawdzone bezpośrednim odczytem z oryginalnych lokalnych VRT: **256/256 zgodnych wartości i masek**. Regeneracja identyczna bajtowo. `npm test`: **72/72**, w tym granice 1 m po obu stronach wycinków, zmiana komórki, domeny, NoData, częściowy wynik i prawidłowe 0. Lint i build przeszły.

## Przed audytem IX D

Zachowano warstwę 0–5 cm. Nie dodano 5–15 cm: odczyt punktowy z IX A nie weryfikuje wszystkich komórek, masek i kwantyli głębszej warstwy. Azot, CEC i retencja pozostają poza panelem. Nadal są to szacunki komórki, nie ocena pola, promienia, przydatności uprawowej czy potrzeb nawożenia. GUGiK pozostaje odsyłaczem. Panel jest ograniczony do Preview/lokalnego środowiska i ukryty w istniejącym PDF.

**Rekomendacja:** przekazać regionalny podgląd do IX D. W audycie potwierdzić reprodukcję ZIP–JSON na czystym środowisku, brak paczki w bundlu klienta, zachowanie udostępnionych granic i zrozumiałość różnicy NoData–poza wycinkiem. Nie rozszerzać się na globalny odczyt ani na głębszy profil bez odrębnego audytu.
