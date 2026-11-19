# Etap VIII D: audyt modułu pogodowego

Zakres: archiwum Open-Meteo, panel raportu i kontekst Sentinel-2. Bez zmian źródeł, zatwierdzonych motywów, mapy, PDF, ocen upraw ani dostępu do Production.

## Porównanie danych dostawcy

19.11.2026 zestawiono bezpośrednie odpowiedzi `/v1/archive` (osobne zapytania o ERA5 i ERA5-Land, `timezone=GMT`, `cell_selection=nearest`, `elevation=nan`) z odpowiedzią HydroSense dla tych samych parametrów. Porównanie dopasowano po dacie UTC i wykonano przed zaokrągleniem prezentacyjnym. To kontrola zgodności integracji, nie niezależna walidacja meteorologiczna.

| Punkt / zakres UTC | Porównane pola dobowe | Różnice wartości | Wynik panelu |
| --- | ---: | ---: | --- |
| 52.0423, 23.0804; 27.07–31.08.2026 | 144 | 0 | Sierpień: 56,20 mm, średnia 20,4 °C, 31/31 dni. Min. 10,7 °C, maks. 36,2 °C, najdłuższa seria poniżej 1 mm: 9 dni. |
| 45.41, 12.3; 24.02–03.03.2024 | 36 | 0 | 80,80 mm z 9/9 dni, w tym 29 lutego. Trzy kolumny temperatury: 0/9 dni (archiwum zwróciło `null`, nie błąd HTTP). |

Dla obserwacji Sentinel-2 26.08.2026 w Białej Podlaskiej: 15,80 mm w 19–25.08, 50,50 mm w 27.07–25.08 i 18,4 °C w 19–25.08. Prezentowane wartości to suma lub średnia zgodnych danych dobowych; dzień obserwacji nie jest wliczany. W aktualnym okresie rocznym raport pokazał 360/365 dni z opadami, 359/365 dni ze średnią temperaturą. Lokalne dane żądane po granicy archiwum są jawnymi lukami, nie zerami.

## Znalezione usterki i zakres poprawki

- Jeśli dokładnie jeden model zawiedzie, endpoint zachowuje prawidłowe wartości drugiego i zwraca HTTP 200, `failedSeries` oraz częściowe pokrycie. Nieudana seria ma brak punktu siatki i wartości `null`; jej poprzednie, zwykłe luki nie są estymowane. Jeśli w odpowiedzi działającego modelu nie ma użytecznych wartości, endpoint zachowuje błąd zamiast zwracać pozorny sukces.
- Limit dostawcy jest aktywny od chwili zgłoszenia; zarówno klient, jak i serwer obsługują sekundy oraz datę HTTP w `Retry-After`, również przy częściowej odpowiedzi i wejściowym 503 z nagłówkiem. 504 dostawcy jest rozróżniany od 502. Nie zwiększono limitów i nie ma automatycznych ponowień. Prawidłowo niepełny wynik z obu modeli zachowuje zwykły cache. Wynik z awarią modelu jest współdzielony przez co najmniej 60 s; przy limicie obowiązuje dłuższy czas z nagłówka. Kolejna zwykła akcja użytkownika może po tym czasie ponowić parę, w ramach dotychczasowych limitów.
- Przy nakładających się zakresach kontekst używa zweryfikowanych danych z drugiej odpowiedzi dla serii, która uległa awarii. Nie pobiera braków pojedynczych dni i nie podmienia zwykłych archiwalnych `null`.

## Macierz sprawdzeń

- Automatyczne: granice i daty UTC (zmiana miesiąca/roku, 29 II, zmiana czasu), pokrycia dla każdej metryki, zmiana obserwacji, niepełne serie, błędy 400/429/502/503/504, odmowa dostępu, utrata połączenia i ponowienie ręczne, współdzielenie cache, nieaktualne odpowiedzi i limity.
- Chrome: oba zatwierdzone motywy, PL/EN, szerokości 320/390/768/1440 px (bez poziomego wyjścia panelu ani osi), okresy 30/90/365 (dwa wykresy i właściwa liczba opcji dni), wybór dnia klawiszem Enter i kliknięciem wykresu. Wybór dnia ma nazwaną natywną listę, przyciski wstecz/dalej i nie wymaga rozróżniania kolorów. Test rozmiaru nie zastępuje testu dotykowego na fizycznym telefonie.
- Kontrast obu motywów pokrywają testy tekstu, kontrolek, fokusu i wykresów. Linie temperatury mają również różne wzory. To nie pełny audyt WCAG z czytnikiem ekranu.
- Bramka niekomercyjnego Preview pozostaje bez zmian. Cache i limity serwerowe są na instancję Vercel, nie globalne. Zmiana obszaru anuluje oczekiwanie klienta; wspólne pobranie serwerowe może dobiec końca i zasilić cache. Serie są reanalizą na dwóch siatkach (ERA5 opady ~25 km, ERA5-Land temperatura ~11 km), nie pomiarami na działce. Seria dni z opadem poniżej 1 mm nie stwierdza suszy glebowej. Zestawienie z Sentinel-2 nie wykazuje przyczynowości. Pogoda nadal nie wchodzi do PDF.
