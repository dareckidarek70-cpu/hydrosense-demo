# HydroSense 2.0: audyt źródeł glebowych (IX A)

Stan prób: **19.11.2026 UTC**, gałąź Draft PR #2 po `42edd6a`. Audyt i skrypt są niezależne od aplikacji: bez panelu, endpointu, nowych sekretów, opłat czy zmian w Sentinel-2, pogodzie, mapach, AI i PDF.

## 1. Porównanie źródeł

| Źródło i sposób dostępu | Co zwraca | Ocena |
| --- | --- | --- |
| [ISRIC SoilGrids WCS](https://docs.isric.org/globaldata/soilgrids/wcs.html) 2.0.1 | Liczbowe wycinki GeoTIFF, osobna usługa na właściwość i jedno pokrycie na wywołanie. | Działa. Mały wycinek jest wydajny, ale eksport może kodować brak jako nieoznaczone zero. Nie stosować samodzielnie do ustalania pokrycia ani jako niekontrolowanego źródła na żywo. |
| [ISRIC SoilGrids WebDAV/VRT](https://docs.isric.org/globaldata/soilgrids/WebDav.html) | Globalny VRT odsyłający do plików źródłowych i opisujący natywną siatkę oraz NoData. | Działa. **Rekomendowany transport do pobrania i przygotowania danych poza aplikacją**. Nie pobierać globalnych VRT i źródłowych kafli przy każdym kliknięciu. |
| ISRIC SoilGrids WMS 1.3.0 | Render stylizowany według legendy, nie wartość właściwości. | Działa, tylko poglądowo. Kolor i przezroczystość nie stanowią liczbowego API ani autorytatywnej maski dla wszystkich właściwości. |
| ISRIC REST v2.0 beta | Interfejs zapytań o piksel. | [Oficjalnie czasowo wstrzymany](https://docs.isric.org/globaldata/soilgrids/), bez daty powrotu. Jednorazowe zapytanie o pH w Białej Podlaskiej przekroczyło 15 s; nie uzyskano odpowiedzi HTTP. Historyczny fair use 5/min dotyczy REST, nie stanowi limitu ani gwarancji dla WCS/WMS. |
| [GUGiK Mapa Glebowo-Rolnicza WMS](https://www.geoportal.gov.pl/pl/dane/mapy/) 1.3.0 | Polska mapa konturowa 1:5000, identyfikacja konturów i odkrywek. | Działa dla wskazanego punktu w Polsce; nie obejmuje Włoch. Źródło opcjonalne, nie zastępuje liczbowych parametrów i wymaga osobnego ustalenia warunków użycia. |

## 2. Rzeczywiste próby SoilGrids

Punkty podano w kolejności **szerokość, długość** (WGS84). Odczyt dotyczy zawierającej punkt komórki **250 × 250 m** w przerwanej projekcji Goode’a, nie średniej z działki ani bufora. Próba: transformacja WGS84 według WKT z VRT, wybór komórki z affine VRT, wycinek WCS o jej dokładnych granicach i kontrola georeferencji. Węższy testowy wycinek zwrócił GeoTIFF z pikselem wyjściowym 200 m, choć dane wejściowe są 250 m; zmiana rozmiaru wyjścia nie poprawia rozdzielczości modelu.

W tabeli `surowe → przeliczone`; `Q0.5` oznacza medianę predykcji, nie średnią. Parametry i przeliczniki: [ISRIC SoilGrids layers](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html).

| Właściwość i głębokość | Dzielnik / jednostka | Biała Podlaska 52.0423, 23.0804 | Wenecja 45.41, 12.30 | Kontrola lądowa Veneto 45.55, 12.15 |
| --- | --- | ---: | --- | ---: |
| pH w wodzie, 0–5 cm, Q0.5 | 10 / bez jednostki | 54 → 5,4 | brak | 78 → 7,8 |
| pH w wodzie, 0–5 cm, Q0.05–Q0.95 | 10 / bez jednostki | 39–76 → 3,9–7,6 | brak | 56–83 → 5,6–8,3 |
| pH w wodzie, 5–15 cm, Q0.5 | 10 / bez jednostki | 55 → 5,5 | brak | 79 → 7,9 |
| Piasek, 0–5 cm, Q0.5 | 10 / % masy | 603 → 60,3 | brak | 254 → 25,4 |
| Pył, 0–5 cm, Q0.5 | 10 / % masy | 298 → 29,8 | brak | 468 → 46,8 |
| Ił, 0–5 cm, Q0.5 | 10 / % masy | 50 → 5,0 | brak | 197 → 19,7 |
| Węgiel organiczny, 0–5 cm, Q0.5 | 10 / g/kg | 216 → 21,6 | brak | 333 → 33,3 |
| Gęstość objętościowa, 0–5 cm, Q0.5 | 100 / kg/dm³ | 127 → 1,27 | brak | 134 → 1,34 |
| Pojemność wymiany kationów przy pH 7, 0–5 cm, Q0.5 | 10 / cmol(c)/kg | 222 → 22,2 | brak | 208 → 20,8 |
| Azot ogółem, 0–5 cm, Q0.5 | 100 / g/kg | 406 → 4,06 | brak | 254 → 2,54 |

- **WCS:** zdekodowano 33 rzeczywiste wycinki Int16 o wymiarze 1 × 1 i georeferencji 250 m. W Wenecji we wszystkich 11 plikach surowe `0` wystąpiło **bez tagu NoData**. Dla pH VRT w tym samym pikselu wykazał NoData (`-32768`), a poglądowy WMS pH był całkowicie przezroczysty. Nie klasyfikowano przez to miejsca jako określonego rodzaju powierzchni, a nieoznaczonych zer pozostałych właściwości nie przedstawiono jako wyników. Zera z jawnie ważnej maski danych nie należy globalnie zamieniać na braki. Dwie późniejsze próby tego samego wycinka pH dla Białej Podlaskiej (Node 12 s, curl 9 s) zakończyły się timeoutem bez nowej odpowiedzi. To sygnał niepewnej dostępności, nie pomiar SLA.
- **WebDAV/VRT:** pobrano [VRT Q0.5 dla pH 0–5 cm](https://files.isric.org/soilgrids/latest/data/phh2o/phh2o_0-5cm_Q0.5.vrt) (3 524 139 B) oraz źródła dla odpowiednich komórek. Odtworzony lokalny VRT zachowuje oryginalną georeferencję, przesunięcia i NoData; próbka pH dała 54 w Polsce, NoData w Wenecji i 78 w punkcie kontrolnym. Porównanie dotyczy pH, nie potwierdza zgodności obu transportów dla każdej właściwości.
- **WMS:** dwa pliki PNG 257 × 257, HTTP 200. Biała Podlaska: nieprzezroczysty środek, 1 394 B. Wenecja: cały obraz przezroczysty, 334 B. WMS nie służył do odczytywania pH z barwy.
- **Głębokości i niepewność:** produkt przewiduje 0–5, 5–15, 15–30, 30–60, 60–100 i 100–200 cm dla podstawowych właściwości; audyt sprawdził dwie pierwsze, w drugiej tylko medianę pH. Q0.05 i Q0.95 ograniczają nominalny 90% przedział predykcji modelu dla komórki; nie jest to zmienność wewnątrz pola ani gwarancja trafności. Kwantyli innych właściwości nie sprawdzono w tej próbie i nie należy zapożyczać dla nich przedziału pH.
- **Interpretacja:** mediany piasku, pyłu i iłu sumują się tu do 95,1% i 91,9%. Są to osobne statystyki brzegowe, nie zamknięty skład jednej próbki; brakującego udziału nie należy przypisywać częściom szkieletowym ani cicho normalizować. Węgiel organiczny nie jest procentem materii organicznej ani zasobem węgla; azot ogółem i CEC nie wyznaczają dawki nawozu. Parametry retencji `wv0010`, `wv003`, `wv1500` są dostępne wg dokumentacji, ale nie testowano ich. Nie oznaczają bieżącej wilgotności, retencji całego profilu ani poziomu wód gruntowych.

Odtworzenie: w Pythonie 3.12 zainstaluj `rasterio==1.4.4` w odizolowanym środowisku i uruchom `python scripts/audit-soilgrids.py --out /tmp/hydrosense-soil-ix-a`. Opcjonalny trzeci punkt: dopisz `--point biala --point venice --point veneto-land`. Skrypt zapisuje pliki i manifest z adresami, sumami SHA-256, metadanymi i stanem próbki; nie zapisuje nic w aplikacji. Wyniki tabeli zweryfikowano ponownym dekodowaniem zapisanych bajtów, bez powtarzania pełnej serii żądań.

## 3. GUGiK: identyfikacja i prawo wykorzystania

**GetCapabilities** zwrócił HTTP 200 i wymienia trzy warstwy `queryable="1"`: `0 KONTURY_GLEBOWE`, `1 ZASIEG_KONTUROW_GLEBOWYCH` i `2 ODKRYWKI_GLEBOWE`. Sprawdzono treść konturów, nie potwierdzano zawartości odkrywek. Mapa źródłowa jest opracowaniem 1:5000 (wektor PL–1992), nie rastrem o stałej dokładności metrowej. Geograficzny zasięg z katalogu nie gwarantuje konturu dla konkretnego punktu.

**GetMap / GetFeatureInfo** ([adres usługi](https://mapy.geoportal.gov.pl/wss/service/pub/guest/MapaGlebowoRolnicza/MapServer/WMSServer)): WMS 1.3.0, `CRS=CRS:84` (kolejność lon, lat), `WIDTH=257`, `HEIGHT=257`, `LAYERS=0`, `STYLES=`, `FORMAT=image/png`, `TRANSPARENT=TRUE`. BBOX: Biała `23.0754,52.0393,23.0854,52.0453`; Wenecja `12.295,45.407,12.305,45.413`. Dla identyfikacji dodano `QUERY_LAYERS=0`, `I=128`, `J=128`, `FEATURE_COUNT=1` i `INFO_FORMAT=application/vnd.esri.wms_featureinfo_xml`.

| Próba | Biała Podlaska | Wenecja |
| --- | --- | --- |
| GetMap | HTTP 200, PNG 9 045 B, widoczny środek | HTTP 200, PNG 857 B, całkowicie przezroczysty; poza zakresem |
| GetFeatureInfo ESRI XML | HTTP 200, 5 312 B, 1 kontur | HTTP 200, 175 B, pusty `FeatureInfoResponse` |
| GetFeatureInfo HTML | HTTP 200, tabela tego konturu | HTTP 200, brak rekordu |
| GetFeatureInfo JSON oraz OGC GML | HTTP 200, XML `ServiceException/InvalidFormat`; nie traktować jako dane | Ten sam błąd formatu |

Pola zwrócone dla Białej Podlaskiej: `TYPPODTYP=Bw`, `KOMPLEKS=7`, `PODLOZE1=ps`, `PODLOZE3=pl`, `ZRODLO=Mgr5000`, `WERSJAOBIEKTU=08.07.2026`, `AKTUALNOSC_NR=missing`. Wg [objaśnień GUGiK](https://www.gov.pl/attachment/f0278bf3-9423-4dbc-8be3-901bdaddd0db) są to **gleby brunatne wyługowane** i **kompleks żytni (żytnio-łubinowy) bardzo słaby**. W uwagach podano wektoryzację map z lat **1962–1966 dla województwa lubelskiego**. Data wersji obiektu nie jest datą próby glebowej. Zachować oryginalne kody i użyć słownika właściwego dla tego zbioru; nie przypisywać obecnego pH, dokładnych głębokości podłoża, klasy bonitacyjnej, plonu ani automatycznej rekomendacji żyta z tych kodów.

**Warunki użycia:**

- **SoilGrids:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) pozwala używać i adaptować produkt, także komercyjnie, z atrybucją i oznaczeniem zmian. Proponowana atrybucja: „ISRIC – World Soil Information, SoilGrids; CC BY 4.0. HydroSense: próbkowanie komórki i przeliczenie jednostek”, ze źródłem i cytowaniem [Poggio i in., 2021](https://doi.org/10.5194/soil-7-217-2021). Licencja danych nie gwarantuje wydajności usług ani praw do baz wejściowych WoSIS. Nie znaleziono opublikowanego SLA ani potwierdzonego budżetu zapytań WCS/WMS/WebDAV. Próby nie wymagały kluczy ani opłat; transport i hosting mogą mieć własne limity infrastrukturalne.
- **GUGiK:** publiczny WMS służy do przeglądania, także przez kompatybilne oprogramowanie; katalog podaje `Fees=no conditions apply` oraz `AccessConstraints=otherRestrictions`. [Art. 12 ustawy o IIP](https://eli.gov.pl/api/acts/DU/2025/242/text/O/D20250242.pdf#page=6) rozróżnia nieodpłatny dostęp do przeglądania od wtórnego wykorzystania zarobkowego. Nie znaleziono jednoznacznej zgody na osadzenie tej usługi w produkcie HydroSense oraz utrwalanie, eksport lub odpłatne udostępnianie konturów i atrybutów. **Na IX B tylko odsyłacz do Geoportalu**, z oznaczeniem GUGiK/PZGiK; przed osadzeniem lub ponownym publikowaniem potwierdzić na piśmie zakres użycia, cache, atrybucję, eksport i użycie komercyjne.
- **Pełna baza GML GUGiK:** według [Geoportalu](https://www.geoportal.gov.pl/pl/dane/mapy/) udostępniana na wniosek, zasadniczo odpłatnie za paczkę województwa. Możliwe przypadki nieodpłatne (m.in. edukacja i badania) nie oznaczają automatycznej zgody na komercyjne rozpowszechnianie. Licencja wydawana dla materiału określa jego dozwolone operacje ([art. 40c Pgik](https://api.sejm.gov.pl/eli/acts/DU/2026/1389/text.pdf#page=35)); koszt do wyliczenia przez [kalkulator PZGiK](https://kalkulator.gugik.gov.pl/) lub organ dla konkretnego wniosku. Nie zamawiano danych.

## 4. Proponowany kontrakt danych

```ts
type SoilStatus = "ok" | "partial" | "no-data" | "outside-preview-coverage" | "unavailable";
type SoilModelCell = {
  source: "isric-soilgrids";
  datasetRef: string;              // Release or pinned extract with checksums, never observation date
  kind: "modelled-cell";
  point: { latitude: number; longitude: number };
  cell: { grid: "igh-250m"; row: number; col: number; resolutionMeters: 250 };
  checkedAt: string;
  license: "CC-BY-4.0";
  status: SoilStatus;
  properties: Array<{
    property: "phh2o" | "sand" | "silt" | "clay" | "soc" | "bdod" | "cec" | "nitrogen";
    depthCm: { top: number; bottom: number };
    unit: string;
    q05: number | null;
    q50: number | null;
    q95: number | null;
    status: "ok" | "no-data" | "unavailable";
  }>;
};
// Optional only after rights clearance: separate mapped-contour record (GUGiK),
// with raw codes, codebook version, map scale and source age. Do not merge with SoilModelCell.
```

Rozróżniać brak piksela, odmowę, przekroczenie limitu i awarię, a także brak zakresu wycinka Preview od rzeczywistego NoData. Wydzielić metadane dostępu, ważność maski i źródłowe przeliczniki od tekstów UI. Nie wysyłać współrzędnych do analityki/logów dostawców poza samym niezbędnym odczytem źródłowym; domyślny wariant lokalny nie wysyła punktu do ISRIC.

## 5. Plan IX B i rekomendacja

1. **Źródło podstawowe: SoilGrids jako kontekst regionalny.** ISRIC [odradza zastosowania na poziomie gospodarstwa](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_04.html#which-tile-in-the-webdav-corresponds-to-my-region-of-interest). Kliknięcie punktu ma odszukać komórkę modelu, nie diagnozować działki. Nie rozciągać wyniku na promień 500 m / 1 km, nie łączyć go z AI, ocenami upraw, nawożeniem ani PDF. Potrzebę lokalnej oceny potwierdzić próbką laboratoryjną i rozpoznaniem terenowym.
2. Przygotować offline ograniczone, wersjonowane wycinki VRT/GeoTIFF z prawidłową maską, metadanymi/atrybucją i sumami kontrolnymi. Na Vercel Preview serwować mały statyczny zestaw odczytów lub paczek dla jawnie objętych obszarów Polski i Włoch. Poza nimi pokazywać informację o braku pokrycia **preview**, nie braku gleby. Zacząć od 0–5 cm i kompletu zweryfikowanych kwantyli dla pH; dla pozostałych wartości pokazywać brak weryfikacji niepewności lub najpierw pobrać odpowiadające kwantyle. Nie uruchamiać ciężkiego GDAL w ścieżce użytkownika.
3. Jeśli potrzebny będzie zasięg dowolnych współrzędnych, WCS dopuścić za przełącznikiem Preview **dopiero po niezależnym sprawdzeniu maski**. Osobne allowlisty hostów, właściwości i głębokości; żadnych dowolnych URL. Mała odpowiedź, deadline całego odczytu, jedna aktywna operacja na komórkę, wspólny cache wg wersji/komórki/właściwości/głębokości/statystyki. Proponowane na start: 64 KiB na WCS, limit twardy 2 równoległych wywołań, cache sukcesu 7 dni, NoData 1 dzień, cooldown błędu 1–5 min, respektowanie `Retry-After`, bez automatycznych lawin ponowień. Wartość ostatnio potwierdzoną można pokazać z datą i flagą stale, nigdy z innej komórki. Limity procesu nie są globalne na Vercel; bez wspólnego budżetu korzystać ze statycznych wycinków, nie publicznego live fan-out.
4. **Źródło opcjonalne: GUGiK.** Do potwierdzenia warunków tylko link do kompozycji Rolnictwo. Po zgodzie odrębny moduł odczytu jednego konturu, weryfikacja granic i wielu obiektów, parsowanie tylko allowlisty atrybutów ESRI XML (bez DTD, HTML ani renderowania odpowiedzi), brak łączenia kodów z wartościami ilościowymi i brak masowego pobierania.
5. Bramka akceptacji: punkty dodatnie PL i IT, wybrzeże/NoData, granica komórki, prawidłowe zero z maską, częściowe kwantyle, błędny CRS/MIME/XML, timeout i limit, bez rozbieżności z plikami referencyjnymi. Zmierzyć p95 i liczbę żądań na zimnym Vercel Preview przed rozszerzeniem zasięgu.

**Decyzja: GO dla IX B jako ograniczonego podglądu modelu SoilGrids z przygotowanymi wycinkami i sprawdzoną maską. NO-GO dla ocen działek, niekontrolowanych odczytów WCS i osadzania/redistribucji danych GUGiK przed potwierdzeniem praw.**

Weryfikacja techniczna: 65/65 testów repozytorium, lint i build. Siedem izolowanych prób GeoTIFF: prawidłowe zero z maską, zero nieoznaczone, NoData, odczyt wartości Int16, błędna rozdzielczość, wyjątek XML zamiast rastra i uszkodzony TIFF. Surowe odpowiedzi zapisano lokalnie do audytu, poza Gitem i poza Vercel.
