# Audyt HydroSense

## Ustalenia i poprawki

| Waga | Ustalenie | Zmiana |
| --- | --- | --- |
| Krytyczna | Plik `.env.local` z danymi dostępowymi Copernicus trafił do historii Git. | Dodano pusty szablon. Usunięcie pliku z indeksu przygotowano w osobnym lokalnym commicie z zachowaniem kopii. Publikacja tego commita powinna nastąpić po rotacji ujawnionego sekretu. |
| Wysoka | Błędy dostawcy uruchamiały procentowy fallback oparty na współrzędnych. Raport ufał ocenom, źródłu i fladze wody z adresu URL. | Raport sam odczytuje obserwacje wybranego obszaru. Nieudana analiza i brak obserwacji mają odrębne stany. |
| Wysoka | Wyniki inwestycji, nawodnienia i uprawy wynikały z arbitralnych wag NDVI/NDWI. Sustainability było średnią pozostałych ocen. | Cztery oceny pozostają wyłącznie w oznaczonych scenariuszach demo. Raport obserwacyjny podaje, jakich danych brakuje do każdej oceny. |
| Wysoka | Maskowanie pomijało chmury i cienie, zakresy dat mapy i raportu były różne, a wodę zgadywano z prostokątów w rejonie Wenecji. | Wspólne reguły Sentinel-2 SCL dla mapy i obliczeń. Warstwa używa dnia podanego w raporcie, gdy istnieje użyteczna obserwacja. Woda wynika z udziału pikseli SCL 6. |
| Wysoka | Publiczne endpointy pozwalały na duże żądania, wielokrotne próby dostawcy i wywołania OpenAI bez limitu. | Limity rozmiarów, zakresu dat, współrzędnych, czasu i liczby zapytań. Wyniki i token przechowywane z ograniczeniami; równoległe identyczne żądania współdzielą pracę. OpenAI jest domyślnie wyłączone. |
| Wysoka | Zainstalowane wersje zależności miały zgłoszone podatności, a polecenie `next lint` zostało usunięte z Next.js 16. | Uaktualniono Next.js, React i Zod. Lint działa przez ESLint CLI, przeniesiony do zależności deweloperskich. |

## Metoda obserwacyjna

Źródłem jest [Copernicus CDSE Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html). [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html) oblicza oddzielne statystyki dzienne dla rzeczywistej geometrii na siatce około 20 m. Standardowe okno obejmuje 30 pełnych dni UTC. Promienie 500 m i 1 km odpowiadają w przybliżeniu 78,5 i 314,2 ha. Odczyt działa na buforze, więc może obejmować kilka typów powierzchni oraz tereny poza granicą własności.

| Wskaźnik | Wzór | Interpretacja |
| --- | --- | --- |
| NDVI | (B08 − B04) / (B08 + B04) | Zieloność roślinności na lądzie |
| NDWI, wariant zielone–NIR | (B03 − B08) / (B03 + B08) | Kontrast wód powierzchniowych, z możliwym wpływem zabudowy |
| NDMI | (B8A − B11) / (B8A + B11) | Optyczna odpowiedź związana z wodą w roślinności i cechami powierzchni |

W obliczeniach pozostają klasy SCL 4, 5 i 6. Wodę wyklucza się z NDVI i NDMI. Piksel bez danych, z zerowym mianownikiem albo z klasą chmury, cienia, śniegu lub niepewnej powierzchni jest wykluczany. Zachmurzenie to udział klas 8–10 w pikselach zaobserwowanych i niesklasyfikowanych jako uszkodzone lub brak danych. Przybliżone użyteczne pokrycie obszaru wynika z liczby wyraźnych pikseli względem powierzchni i rozdzielczości siatki. Raport wybiera najnowszy dzień z co najmniej 50% takiego pokrycia i co najmniej 20 pikselami dla przynajmniej jednego wskaźnika. To jawne kryteria jakości, bez udawanej dokładności oceny agronomicznej.

Data oznacza dzień dziennej mozaiki UTC. Więcej niż jeden fragment sceny może współtworzyć obraz. Gdy brak dnia wynikowego, mapa w warstwie satelitarnej może pokazywać mozaikę 30 dni z podanym zakresem. Jasne piksele w raporcie i mapa mogą mieć inne próbkowanie ze względu na siatkę mapy i zakres widoku.

Lasy i uprawy mogą mieć podobny NDVI. Grunty odsłonięte, zabudowa i nieużytki wymagają niezależnych danych o pokryciu terenu. Sentinel-2 w tej konfiguracji nie ustala wilgotności gleby, poziomu wód podziemnych, infrastruktury, ryzyka inwestycyjnego ani możliwości uprawy. OpenStreetMap służy jako mapa orientacyjna. Poligony i procenty demo są ilustracyjne. Brak połączenia z danymi katastralnymi, glebowymi i hydrogeologicznymi.

## Uruchomienie i dalsze decyzje

- Weryfikacja lokalna obejmowała prawdziwy odczyt Copernicus dla dwóch promieni tego samego punktu, warstwę NDVI, próbę dla otwartej wody i widok Chrome o szerokości 390 px. Testy jednostkowe, ESLint i build przeszły. `npm audit --omit=dev` zwrócił 0 podatności.
- Lokalnie uruchom `npm ci`, następnie `npm run dev`. Do testów jednostkowych używaj Node.js 22.18+ albo 24. Uruchom `npm test`, `npm run lint` oraz `npm run build`.
- `.env.example` zawiera nazwy zmiennych. Do rzeczywistych odczytów serwer wymaga `COPERNICUS_CLIENT_ID` i `COPERNICUS_CLIENT_SECRET`. Na Vercel ustawiaj je oddzielnie dla Preview i Production. Nie zapisuj ich w Git.
- Rotacja ujawnionego klienta Copernicus powinna objąć unieważnienie poprzedniego sekretu, weryfikację wykorzystania limitów i aktualizację lokalnej konfiguracji oraz Vercel. Samo usunięcie pliku z gałęzi nie usuwa go z historii.
- Publiczne wdrożenie powinno mieć wspólny limit zapytań na brzegu lub u dostawcy. Limity w kodzie działają na pojedynczej instancji i nie zastępują limitu globalnego. Nie włączaj płatnego OpenAI bez ustalenia budżetu i kontroli dostępu.
- Link utworzony w selektorze zachowuje wybrany zakres dat. Ponowne otwarcie pobiera dostępne obserwacje z Copernicus, więc link nie jest archiwalnym zapisem rastra. Druk zachowuje wybraną datę oraz obszar.

## Etap II

- Historia udostępnia okresy 30, 90 i 365 dni oraz własny zakres do 366 pełnych dni UTC. NDVI i NDMI są punktami na osi czasu. Krzyżyki oznaczają odczyt niedostępny dla danego wskaźnika, a luki dni bez obserwacji. Dzienna tabela pokazuje zachmurzenie i udział użytecznej powierzchni. Zmiana okresowa to różnica median pierwszych i ostatnich trzech kwalifikujących się pomiarów, o ile jest ich co najmniej sześć.
- Użytkownik może wybrać dzień raportu i datę do porównania. Porównanie obszarowe obejmuje dwa promienie tego samego punktu. Różnicę między promieniami liczymy na najnowszej wspólnej użytecznej dacie. To wspólny dzień UTC, który może zawierać różne fragmenty sceny. Nakładające się bufory mogą obejmować różne rodzaje powierzchni. Nie ma jeszcze porównania dwóch niezależnych lokalizacji.
- Progi NDVI, NDWI i NDMI są progami wizualizacji wspólnymi dla rastra i legendy. Interpretacja opisuje kontrast spektralny. Progi nie są progami agronomicznymi. Naturalne kolory używają B04, B03 i B02 z rozjaśnieniem 2,5×.
- Wydruk A4 używa obrazu True Color z dnia raportu, wektorowego obrysu bufora, skali w środku mapy i dwóch wykresów wektorowych. Gdy raster jest niedostępny, wydruk pokazuje wyraźnie oznaczony schemat bufora.
- Kontrola z Copernicus: obszar z polami w Veneto (NDVI 0,55 dla 500 m i 0,48 dla 1 km), Warszawa (0,08 dla 500 m) i Adriatyk (100% wody, NDWI 0,78, brak NDVI i NDMI). Zakresy 90 i 365 dni zwróciły odpowiednio 27 i 104 dni z obserwacjami w Veneto, przed odrzuceniem na podstawie jakości. Potwierdzono również pusty dzień oraz błąd 503 na instancji bez poświadczeń.
