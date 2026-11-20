# HydroSense: Etap VIII C, pogoda przed Sentinel-2

W raporcie własnego obszaru, w panelu pogodowym, widać kontekst dla aktualnie wybranej **użytecznej obserwacji Sentinel-2**. Zmiana doby w historii satelitarnej zmienia etykietę i obliczenia. Demo i PDF nie zawierają tej sekcji.

- Dla obserwacji z dnia `D` okresy obejmują `D−7…D−1` oraz `D−30…D−1`, w UTC. Doba obserwacji nie jest wliczana. Punktem odniesienia nie jest bieżąca data ani sterowanie wykresem pogody.
- Opady ERA5 to suma tylko dostępnych dni, a temperatura ERA5-Land to średnia dostępnych średnich dobowych. Każda karta podaje liczbę dostępnych i brakujących dni. Zera dostawcy liczą się jako wartości, braki nie. Wynik bez żadnego odczytu to „Brak danych”.
- Kontekst wykorzystuje dane wykresu. Jeżeli potrzeba starszych danych, wykonuje co najwyżej jedno zapytanie uzupełniające w tym stanie raportu. Przy synchronizacji ze startem raportu pobranie jednolitego zakresu poprzedzającego ten start obsługuje wszystkie przełączenia doby w tym raporcie; pozostałe dni są już w wykresie. Przy odrębnym zakresie wykresu pobiera tylko brakujące daty lub jedno wspólne okno, gdy brakuje obu krańców.
- Wykres i kontekst używają tego samego cache w przeglądarce, anulowania i blokady `Retry-After`. Błąd głównego odczytu nie uruchamia dodatkowej próby. Wartości `null` z archiwum nie powodują ponowień; limitów serwera i dostępu Production nie zmieniono.
- Warstwa kontekstu nie zmienia obliczania indeksów, nie trafia do asystenta i nie orzeka o suszy, chorobach, plonie ani przyczynach zmian Sentinel-2. To agregaty siatkowej reanalizy, nie pomiary ze stacji na działce. Szczegóły: [modele i warunki użycia](etap-viii-a-pogoda.md).

Przypadek do sprawdzenia: raport punktu `52.0423, 23.0804`, promień 500 m, sierpień 2026. Zmień dzień z 26 na 16 sierpnia w historii obserwacji. Dla 16 sierpnia zakresy to odpowiednio 9–15 sierpnia oraz 17 lipca–15 sierpnia UTC.

| Dzień Sentinel-2 (UTC) | Opady w poprzednich 7 dobach | Opady w poprzednich 30 dobach | Średnia temperatura z poprzednich 7 dób |
| --- | ---: | ---: | ---: |
| 26.08.2026 | 15,80 mm (7/7) | 50,50 mm (30/30) | 18,4°C (7/7) |
| 16.08.2026 | 0,90 mm (7/7) | 56,90 mm (30/30) | 19,7°C (7/7) |

Licznik lokalnego proxy z rzeczywistym backendem pokazał dwa zapytania do HydroSense: 1–31 sierpnia i 2–31 lipca. Zmiana wybranej obserwacji, języka i motywu nie wywołała kolejnego odczytu. W kontrolowanej próbie odmowy dostępu do pogody wyświetliły się braki 7/30 dni i zachowały się trzy wskaźniki Sentinel-2; kontekst nie ponowił zapytania.
