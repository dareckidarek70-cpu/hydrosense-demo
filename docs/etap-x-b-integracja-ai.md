# HydroSense: Etap X B, synteza w asystencie raportu

## Co się zmieniło

Asystent własnego obszaru odpowiada lokalnie na podstawie tej samej użytecznej doby Sentinel-2, którą wyświetla raport. Dołącza pogodę z już pobranego kontekstu dla tej doby oraz odczyt SoilGrids przekazany przez raport dla jego punktu. Nie wysyła pytania ani danych do modelu, nie wywołuje `/api/ai/parcel-chat` i nie dodaje zapytań do Copernicus, Open-Meteo ani ISRIC. Działki demonstracyjne i stare reguły dotyczące upraw zachowano; nie zmieniono algorytmów ani ocen.

Odpowiedź znika natychmiast po zmianie punktu, promienia, okresu lub obserwacji. Tożsamość panelu zależy również od języka i stanu pobierania kontekstu pogodowego. Asystent sygnalizuje oczekiwanie, zamiast wyświetlać poprzednie dane. Stany źródeł są niezależne: brak SoilGrids nie blokuje Sentinel-2 ani pogody. Bez użytecznej doby nie przypisujemy wcześniejszej pogody do przypadkowej daty.

## Próby na rzeczywistych raportach

Chrome, własne punkty (nie działki demo), raport 01–31.08.2026 UTC, promień 500 m. Wartości poniżej porównano bezpośrednio z tekstem w kartach raportu i panelu asystenta, w precyzji interfejsu. To sprawdzenie spójności, nie niezależna walidacja naukowa.

| Punkt | Doba UTC | NDVI / NDWI / NDMI w raporcie i odpowiedzi | Opady 7 / 30 dni oraz temperatura 7 dni | SoilGrids |
| --- | --- | --- | --- | --- |
| Biała Podlaska `52.0423, 23.0804` | 26.08.2026 | 0,56 / −0,54 / 0,11 | 15,80 mm / 50,50 mm / 18,4°C | pH 5,4 |
| Veneto `45.523244962, 12.221163987` | 30.08.2026 | 0,61 / −0,58 / 0,18 | 18,10 mm / 81,20 mm / 24,6°C | pH 7,7 |
| Okolice Sulejówka `52.2668, 21.3112` | 21.08.2026 | 0,73 / −0,65 / 0,27 | 44,70 mm / 77,60 mm / 19,9°C | Poza wycinkiem; bez zastępczej wartości |

Dodatkowo w Białej Podlaskiej sprawdzono wybór 25.08 (0,58 / −0,55 / 0,13, opady 7 dni 31,60 mm), zmianę zakresu na 11–24.08 (wybrana 16.08, 0,57 / −0,56 / 0,10) i promień 1 km (0,55 / −0,53 / 0,11 dla 26.08). Poprzednia odpowiedź znikała, a kolejne odpowiedzi zgadzały się z raportem. Sprawdzono szerokości 1440, 390 i 320 px, PL/EN oraz oba motywy. Odpowiadanie nie wysyłało żadnych dodatkowych żądań do tras raportu ani AI. W pierwszej serii Veneto i Sulejówek dostały HTTP 429 z trasy pogodowej i zachowały odpowiedzi satelitarne; pomiar pogody powtórzono po upływie limitu, bez jego zmiany.

## Przykładowe pytania i odpowiedzi

Przykłady z próby Białej Podlaskiej (skrócone tam, gdzie pełna odpowiedź powtarza ograniczenia):

| Pytanie | Odpowiedź |
| --- | --- |
| Co pokazuje ostatnia obserwacja satelitarna? | Wybrana obserwacja: 26.08.2026 UTC. NDVI 0,56 · NDWI −0,54 · NDMI 0,11. To wskaźniki spektralne, nie bezpośrednie pomiary wilgotności gleby ani wód gruntowych. |
| Jak zmienił się NDVI? | 0,58 (25.08) → 0,56 (26.08 UTC); różnica −0,01 obliczona z wartości przed zaokrągleniem. To porównanie dwóch obserwacji, nie trend. |
| Jakie były opady przed obserwacją? | 15,80 mm w poprzednich 7 dobach (7/7, brak 0) i 50,50 mm w 30 dobach (30/30, brak 0). Doba obserwacji jest wyłączona; to reanaliza ERA5, nie pomiar ze stacji na działce. |
| Co wiadomo o glebie w tym miejscu? | Modelowane pH w wodzie 5,4 (90% przedział predykcji 3,9–7,6), węgiel organiczny 21,6 g/kg, gęstość 1,27 kg/dm³. Warstwa 0–5 cm, komórka 250 m nie opisuje całej działki. |
| Czy te dane mogą wskazywać na problem z roślinnością? | Dane nie potwierdzają problemu z roślinnością. Sprawdź warunki w terenie i porównaj kolejne użyteczne obserwacje; dwa odczyty nie pozwalają rozpoznać choroby, niedoboru ani suszy glebowej. |
| Jakie informacje warto jeszcze sprawdzić? | Stan roślin i wilgotność gleby w terenie, dalsze obserwacje Sentinel-2 oraz reprezentatywne próbki gleby, jeśli decyzja dotyczy całej działki. |
| Jaka szansa na obsianie żytem? | Nie da się jeszcze ocenić, czy to pole nadaje się pod żyto. Żyto lepiej niż pszenica znosi gleby lekkie i bardziej kwaśne. Zbadaj pH i skład gleby w kilku miejscach i sprawdź zastoiska wody. Nie oszacowano procentowej szansy. |

## Testy i następny krok

- `npm test`: 91/91, w tym 7 nowych testów odpowiedzi. Obejmują zmianę punktu, promienia, dat i obserwacji, odrzucanie starego kontekstu, pełne i częściowe dane, brak pogody, brak użytecznej doby, statusy SoilGrids, pytania o uprawy, PL/EN oraz brak zapytań przez silnik.
- `npm run lint` i `npm run build`: zaliczone. Nie zmieniono map, PDF, ocen upraw, progów indeksów ani warunków dostępności źródeł.
- Ograniczenia: zakres pytań wynika z reguł językowych. Porównanie NDVI bierze wcześniejszą użyteczną dobę z NDVI w tym samym okresie, nie wyznacza trendu. Pokrycie SoilGrids pozostaje ograniczone, a kontekst pogodowy zależy od dostępności archiwum i limitów.
- **GO dla X C** po ocenie Preview. Najpierw usprawnić wskazywanie w raporcie obserwacji, okien i właściwości użytych w odpowiedzi. Nie zamieniać tej syntezy w automatyczną ocenę przydatności upraw.
