# HydroSense: Etap X A, kontrakt syntezy

## Kontrakt i reguły

`synthesizeReport(input, locale)` składa **gotowe wyniki** Sentinel-2, Open-Meteo i SoilGrids. Zwraca `evidence` z liczbami w oryginalnej precyzji oraz `findings` z identyfikatorem reguły, sekcją, ścieżką do dowodu i krótką etykietą PL/EN. Sekcje to `observation`, `context`, `limitation` i `next-step`. To czyste funkcje bez zapytań sieciowych; żaden ekran ani asystent nie wywołuje ich w X A.

| Moduł | Dane i warunki |
| --- | --- |
| Zakres | Punkt jako `[szerokość, długość]`, promień 500 lub 1000 m, okres raportu UTC `[od, do)`. Zakres, promień i punkt odczytu satelitarnego muszą odpowiadać raportowi. |
| Sentinel-2 | Wybrana użyteczna doba UTC, przedział obserwacji, wartości bez jednostki (`null` przy braku), udział użytecznego pokrycia, frakcja zachmurzenia, liczba użytecznych pikseli i historia dostarczonych obserwacji. Użyteczność bierze się z istniejącej kwalifikacji. W historii doby odrzucone zachowują pokrycie, ale nie wartości indeksów. Doby bez obserwacji nie są dopisywane. Dla wskazanej użytecznej doby odniesienia różnica to **wybrana minus odniesienie**, tylko dla dostępnych par. Nie jest to trend. |
| Open-Meteo | Tylko przebieg dla tego samego punktu, w UTC. Okna D−7 do D−1 i D−30 do D−1 są włączne; bez dnia obserwacji. Suma dostępnych dobowych opadów ERA5 (mm, ok. 25 km), średnia dostępnych średnich dobowych ERA5-Land (°C, 2 m, ok. 11 km). Każda miara ma liczbę dni dostępnych, brakujących i oczekiwanych. `null` oznacza brak wyniku, a `0` pozostaje odczytem. Zachowano istniejące zasady uzupełniania zakresu i obsługi awarii jednego modelu. |
| SoilGrids | Gotowy odczyt istniejącej komórki dla tego samego punktu: modelowane mediany dla 0–5 cm, siatka 250 m i nominalny 90% przedział predykcji pH (Q0.05–Q0.95), o ile dostępny. Zachowane jednostki, maski i statusy `available`, `partial`, `outside`, `no-data`, `unavailable` oraz `not-provided`, gdy nie przekazano pasującego odczytu. Wynik pochodzi z lokalnego wycinka ISRIC, CC BY 4.0. Nie ma ponownego skalowania ani normalizacji frakcji. |

Brak użytecznej wybranej obserwacji (`no-usable-selection` lub `unavailable`) usuwa podstawę kontekstu pogodowego (`no-anchor`), ale nie usuwa dostępnego odczytu SoilGrids. Synteza nie wybiera samodzielnie innej doby i nie tworzy fikcyjnego raportu satelitarnego. Gdy doba jest użyteczna, lecz opadów lub temperatur brak, silnik zachowuje wszystkie pozostałe poprawne wartości i podaje braki osobno dla każdej miary.

## Rzeczywisty przykład: Biała Podlaska

**Zakres:** punkt `52.0423, 23.0804`, promień 500 m, sierpień 2026 UTC. Próba wykorzystała odpowiedź HTTP 200 z istniejącej lokalnej trasy `/api/copernicus/stats` (odczyt 20.11.2026), odtworzenie dwóch rzeczywistych odpowiedzi Open-Meteo z [audytu VIII D](etap-viii-d-audyt-pogody.md) przez istniejący parser oraz odczyt lokalnego wycinka SoilGrids przez `soilPreviewAt`. To sprawdzenie syntezy na danych źródłowych, nie niezależna walidacja meteorologiczna ani glebowa. Wartości poniżej zaokrąglono tylko do prezentacji.

**Obserwacja Sentinel-2.** Doba 26.08.2026 UTC: NDVI **0,560501**, NDWI **−0,541574**, NDMI **0,106040**. Odpowiedź wskazała 100% użytecznego pokrycia według metody raportu, ok. 0,196% zachmurzenia i 2025 użytecznych pikseli. W historii było 16 zaobserwowanych dób: 10 użytecznych i 6 odrzuconych. Względem użytecznej doby 16.08 różnice wyniosły odpowiednio −0,014151, +0,017610 i +0,010770. To różnice dwóch obserwacji, nie trend ani diagnoza.

**Kontekst pogodowy.** W 7 dobach przed obserwacją (19–25.08) ERA5 wskazał **15,80 mm** opadów (7/7 dób), a ERA5-Land średnią **18,43°C** (7/7). W 30 dobach przed obserwacją (27.07–25.08) ERA5 wskazał **50,50 mm** (30/30). Żadne okno nie obejmuje 26.08. Są to wartości z siatki reanalizy, nie ze stacji na działce. Nie wyjaśniają przyczyny zmian indeksów.

**Kontekst glebowy.** Dla komórki 250 m i warstwy 0–5 cm: pH w wodzie **5,4**, 90% przedział predykcji **3,9–7,6**; piasek **60,3%**, pył **29,8%**, ił **5,0%** (osobne mediany, % masy); węgiel organiczny **21,6 g/kg**; gęstość objętościowa **1,27 kg/dm³**. Suma frakcji wynosi 95,1% i nie została normalizowana. Komórka nie opisuje całej działki ani powierzchni bufora 500 m.

**Ograniczenie i weryfikacja.** Zestawienie nie pozwala określić wilgotności gleby, poziomu wód gruntowych, chorób, niedoborów, plonów ani dawek nawozów lub wapna. Do oceny warunków w terenie potrzebne są odpowiednie pomiary i oględziny, a do oceny gleby całej działki reprezentatywne próbki.

Identyfikatory użytych danych (SHA-256): `c7baa457ee7d3866dc51a8d85b9b574bd51073e46346bcb74ac1f2830fe0def8` (odpowiedź Sentinel-2), `455982c4a1fa6856ef27aae445922989b96a9edc1deabbf3144d4bfb09910fe7` (ERA5), `32d819f08b57eb9c85e64c4e64424a4af130c01fe18b13895da15eee965c25a6` (ERA5-Land), `3552c840663a2db94a130e8b04eafb7234b687b28ea71782582a82dda1b179e4` (`lib/soil-preview-regions.json`). Surowe odpowiedzi dostawców nie są dołączane do paczki aplikacji.

## Weryfikacja i rekomendacja dla X B

- `npm test`: 84/84, w tym 9 nowych testów syntezy. `npm run lint` i `npm run build`: poprawnie.
- Pokryto zmianę dnia w roku przestępnym, zera i braki, awarię jednego modelu, rozróżnienie `NoData` i braku pokrycia, niedostępny wycinek, niepełne indeksy, odrzuconą obserwację, odpowiedzi z innego zakresu i brak wywołań sieciowych przez silnik.
- **GO dla X B jako warstwy prezentacji.** Najpierw podłączyć niewielki adapter do zweryfikowanych stanów bieżącego raportu, z kontrolą kluczy zapytań (punkt, okres i promień dla Sentinel-2) oraz anulowaniem odczytów w dotychczasowych modułach. Renderować liczby z `evidence`, a ich charakter i ograniczenia z `findings`. Nie używać JSON-u dostarczonego przez klienta jako dowodu w asystencie. Nie dodawać zapytań ani automatycznej kwalifikacji upraw.
