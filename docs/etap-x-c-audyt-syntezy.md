# HydroSense: Etap X C, audyt syntezy i źródeł odpowiedzi

## Jak sprawdzić odpowiedź

Otwórz [Preview gałęzi PR #2 z raportem Białej Podlaskiej](https://hydrosense-demo-git-audit-bcf7d1-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-01&to=2026-08-31) i wybierz „Podsumuj raport”. Pod odpowiedzią lista „Sprawdź w tym raporcie” skacze do odczytów na tej samej stronie. Linki są dostępne przez Tab i Enter, a fokus przechodzi na datę obserwacji, historię NDVI, konkretną kartę pogody albo komórkę gleby. Linki nie pobierają danych i nie zmieniają wybranej doby.

| Pytanie w raporcie Białej Podlaskiej | Co pokazuje odpowiedź | Gdzie prowadzą linki |
| --- | --- | --- |
| Co pokazuje obserwacja? | 26.08.2026 UTC: NDVI 0,56, NDWI −0,54, NDMI 0,11. | Źródło Sentinel-2 L2A z wybraną datą, bezpośrednio nad kartami indeksów (`#report-sentinel-2026-08-26`). |
| Jak zmienił się NDVI? | 0,58 → 0,56, różnica −0,01 z wartości niezaokrąglonych. Porównanie dwóch odczytów, nie trend. | Wybrana obserwacja oraz istniejący wykres `#report-ndvi-history`. Tę samą parę można wybrać w porównaniu dat. |
| Jakie były opady przed obserwacją? | 15,80 mm w 7 dobach (7/7) i 50,50 mm w 30 dobach (30/30). | Osobne karty ERA5 dla 7 i 30 dób (`#report-weather-2026-08-26-rainSeven` i `#report-weather-2026-08-26-rainThirty`), bez odnośnika do nieomawianej temperatury. |
| Co wiadomo o glebie? | Modelowane pH 5,4, przedział predykcji 3,9–7,6, pozostałe właściwości z komórki 250 m dla warstwy 0–5 cm. | Bieżący odczyt komórki (`#report-soil-cell`), a nie ogólna dokumentacja ISRIC. |

Pełna synteza dołącza też odnośnik do średniej temperatury z poprzednich 7 dób. Dla pytania o niedostępny wskaźnik, zamaskowaną komórkę, punkt poza wycinkiem oraz brakującą lub odrzuconą miarę pogodową nie powstaje odnośnik sugerujący dostępność. Wartość `0` pozostaje odczytem.

## Wyniki dla rzeczywistych obszarów

Chrome, raport 1–31.08.2026 UTC, promień 500 m. Porównano datę, wszystkie trzy indeksy w kartach, istniejącym porównaniu dat z historii i odpowiedzi, a także opady 7/30 dni, temperaturę 7 dni i dostępne odczyty SoilGrids. Sprawdzono zgodność liczb w precyzji interfejsu oraz różnicę NDVI dla wcześniejszej użytecznej doby. To kontrola zgodności raportu i asystenta, nie walidacja naukowa źródeł.

| Punkt | Doba UTC | NDVI / NDWI / NDMI | Opady 7 / 30 dni; temp. 7 dni | SoilGrids: pH / węgiel organiczny / gęstość |
| --- | --- | --- | --- | --- |
| Biała Podlaska `52.0423, 23.0804` | 26.08.2026 | 0,56 / −0,54 / 0,11 | 15,80 / 50,50 mm; 18,4°C | 5,4 / 21,6 g/kg / 1,27 kg/dm³ |
| Veneto `45.523244962, 12.221163987` | 30.08.2026 | 0,61 / −0,58 / 0,18 | 18,10 / 81,20 mm; 24,6°C | 7,7 / 35,6 g/kg / 1,34 kg/dm³ |
| Okolice Sulejówka `52.2668, 21.3112` | 21.08.2026 | 0,73 / −0,65 / 0,27 | 44,70 / 77,60 mm; 19,9°C | Poza wycinkiem; bez linku gleby |

Dla obu dostępnych komórek potwierdzono głębokość 0–5 cm i zgodność frakcji tekstury bez normalizacji. Różnice NDVI w historii i odpowiedzi wyniosły odpowiednio −0,01, +0,19, +0,13. Zaokrąglenie wartości przed prezentacją może dać inną różnicę przy ręcznym odejmowaniu; odpowiedź wyjaśnia, że różnicę obliczono z wartości niezaokrąglonych, tak samo jak w porównaniu dat w historii.

## Odporność, dostępność i regresja

- W Chrome, z kontrolowanymi odpowiedziami na trasach testowych, równocześnie zatrzymano wcześniejsze odpowiedzi Sentinel-2 i pogody. Po zmianie obu dat raportu nowy wynik pozostał na ekranie także po zwolnieniu starych odpowiedzi. Sprawdzono 500 m → 1 km, zmianę punktu, szybkie zmiany doby, brak użytecznej obserwacji, pojedynczy dostępny indeks, częściową pogodę, HTTP 502 i rzeczywistą komórkę NoData. Nieprawidłową paczkę gleby sprawdzono w testach jednostkowych i integracyjnych odczytu pliku; nie modyfikowano paczki we wdrożeniu.
- Sprawdzono PL/EN, Clean Nature i Warm Graphite oraz 320, 390, 768 i 1440 px. Zmiana motywu zachowuje odpowiedź, zmiana języka odświeża odpowiedź i etykiety przy niezmienionej obserwacji. Klawiatura przenosi fokus na widoczny cel. Naprawiono zasłanianie celu przez trzyrzędowy nagłówek na telefonie.
- W wyborze obszaru wyświetlił się podkład OpenStreetMap i wszystkie cztery rastry: barwy naturalne, NDVI, NDWI i NDMI. Po powrocie do podkładu nie została poprzednia nakładka. Sprawdzono własny punkt i linki do raportu dla 500 m i 1 km. Raster True Color był pobrany i zdekodowany w każdym z trzech raportów. Działały historia, pogoda, SoilGrids oraz wcześniejsze pytanie o żyto. Wygenerowano i obejrzano po jednym PDF A4 dla PL i EN; oba zachowały raster, indeksy i historię, a asystent z odnośnikami nie trafił do wydruku.
- Licznik żądań w przeglądarce nie wykazał dodatkowych zapytań do tras raportu ani AI przy zadawaniu pytań i przechodzeniu po odnośnikach. Nie zmieniono algorytmów, źródeł, ocen upraw, limitów ani zakresu PDF.
- `npm test`: 94/94. `npm run lint` i `npm run build`: poprawnie. Trzy nowe testy obejmują linkowanie tylko dostępnej miary, brak fałszywego porównania i bezpieczeństwo interpretacji.

## Interpretacja i decyzja

Doprecyzowano granice odpowiedzi o wilgotności, suszy, chorobach, plonach, nawożeniu i wapnowaniu. NDMI nie jest pomiarem wilgotności gleby, reanaliza nie diagnozuje suszy, dwa odczyty nie potwierdzają choroby ani trendu, a modelowana komórka nie ustala przydatności całej działki ani dawek. Dotychczasowe reguły odpowiedzi o nazwanych uprawach pozostały bez zmian. System nie jest pełną diagnozą agronomiczną; zasięg gleby i rozpoznawanie intencji pozostają ograniczone.

**GO dla zamknięcia Etapu X na Preview.** Nie jest to rekomendacja scalenia ani publikacji na produkcji.
