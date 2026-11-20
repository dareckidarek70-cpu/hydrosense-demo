# HydroSense: Etap VIII A, archiwum pogodowe

Moduł jest niezależny od raportów, Sentinel-2, AI i PDF. Nie dodaje panelu ani ocen przydatności upraw. Na tym etapie weryfikację zapewnia JSON w przeglądarce lub terminalu. Darmowy endpoint jest przeznaczony wyłącznie do niekomercyjnej ewaluacji; integracja nie działa przy `VERCEL_ENV=production`. Przed użyciem komercyjnym trzeba potwierdzić warunki dostępu, a nie tylko licencję samych danych.

## Odczyt

`GET /api/weather/history?lat=52.0423&lng=23.0804&from=2024-08-16&to=2024-08-18`

- Wstaw własne `lat` i `lng` WGS84 z raportu analizowanego obszaru. Wynik opisuje punkt siatki, nie średnią w buforze 500 m lub 1 km.
- Wybierz `days=30`, `days=90` albo `days=365`. Bez okresu domyślnie zwracane jest 30 pełnych dni UTC do wczoraj. Własny zakres wymaga obu parametrów `from` i `to` w formacie `YYYY-MM-DD` (obie daty włącznie). Jak w raportach HydroSense: najwcześniej od 2017-01-01, maks. 366 dni i bez bieżącego dnia UTC.
- `requested` to zakres użytkownika; `queried` to część wysłana do archiwum (do piątego dnia przed bieżącym dniem UTC). `availability` podaje faktyczne pierwsze i ostatnie daty z danymi oraz liczby dni częściowych i kompletnych poprzez `daysWithData` i `completeDays`. Sam koniec `queried` nie jest dowodem dostępności.
- `days` zachowuje każdą datę z żądanego zakresu. Status dnia: `complete`, `partial`, `missing` albo `not-queried-recent`. Braki to `null`; zero oznacza wartość zwróconą przez dostawcę. Pusta odpowiedź dostawcy jest inna niż problem z połączeniem.
- Niepoprawne parametry: **400**. Przeciążenie instancji: **429**. Niedostępna lub nieprawidłowa odpowiedź dostawcy: **502**. Limit Open-Meteo: **503** z `Retry-After`. Timeout: **504**. Błąd nie zwraca zastępczej pogody.

## Pochodzenie i ograniczenia

Obie serie pobierane są z [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), ścieżka `https://archive-api.open-meteo.com/v1/archive`, jako dzienne agregaty dla `timezone=GMT` (UTC, bez zmian czasu letniego). Wybierana jest najbliższa komórka, bez korekty wysokościowej Open-Meteo. Odpowiedź podaje osobno współrzędne żądane i zwrócone przez dostawcę dla każdego modelu.

| Wielkość | Model | Siatka | Jednostka |
| --- | --- | --- | --- |
| Minimum, maksimum, średnia temperatury powietrza na 2 m | ERA5-Land | 0,1° (ok. 11 km) | °C |
| Dobowa suma opadów, również śnieg w ekwiwalencie wody | ERA5 | 0,25° (ok. 25 km) | mm |

Open-Meteo nie udostępnia opadu w tej konfiguracji ERA5-Land. W odczycie kontrolnym ten model zwrócił `null` dla `precipitation_sum`; opad pochodzi więc jawnie z oddzielnej serii ERA5. Średnia jest wartością dostawcy z godzin doby, nie średnią minimum i maksimum. Nie jest publikowana, jeśli dostawca nie zwrócił obu ekstremów lub podał średnią poza ich przedziałem. Ten warunek odrzuca wykryte niekompletne wyniki, ale nie jest niezależnym przeliczeniem godzin.

To reanaliza griddowana, nie stacja na działce. Siatki nie rozwiązują lokalnych różnic terenu i krótkotrwałych opadów punktowych. Zero w modelu nie stwierdza suszy glebowej. Wartości nie służą jeszcze do automatycznej oceny upraw.

### Rzeczywisty odczyt kontrolny, okolice Białej Podlaskiej

Współrzędne `52.0423, 23.0804`, całe doby UTC. Dane porównano z odpowiedziami obu zapytań dostawcy; nie jest to walidacja względem stacji.

| Data | Opad ERA5 (mm) | Min. ERA5-Land (°C) | Maks. ERA5-Land (°C) | Śr. ERA5-Land (°C) |
| --- | ---: | ---: | ---: | ---: |
| 2024-08-16 | 0,30 | 18,2 | 31,6 | 25,0 |
| 2024-08-17 | 0,00 | 18,7 | 32,0 | 26,3 |
| 2024-08-18 | 0,40 | 20,2 | 32,4 | 25,6 |

## Limity i licencja

Izolowany cache instancji: 15 minut, maks. 24 pary serii. Równoległe zapytania o te same dane są łączone. Maks. dwa równoczesne pobrania par, cztery nowe pary na minutę i szacowany budżet 1600 jednostek na dobę UTC (każdy model zaokrąglony w górę do bloków 14 dni). To ograniczenia instancji, nie globalna gwarancja limitu dostawcy przy skalowaniu Vercel. Limit dostawcy wstrzymuje nowe odczyty danej instancji do `Retry-After`. Brak ponowień automatycznych. Odpowiedź dostawcy: maks. 64 KiB na model i wspólny timeout 8 s. Własna odpowiedź HTTP nie jest zapisywana w CDN.

Dane: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), z atrybucją Open-Meteo i Copernicus Climate Change Service w odpowiedzi. HydroSense scala szeregi po datach UTC, oznacza luki i nie interpoluje wartości. [Warunki usługi](https://open-meteo.com/en/terms) ograniczają bezpłatny endpoint do użytku niekomercyjnego; to inne ograniczenie niż licencja danych. Zobacz też [sposób liczenia zapytań i dostęp komercyjny](https://open-meteo.com/en/pricing).
