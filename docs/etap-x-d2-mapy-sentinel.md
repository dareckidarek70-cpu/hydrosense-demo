# HydroSense: Etap X D2, porównanie map Sentinel-2

## Audyt i zmiany

W X D1 mapa wyboru obszaru obsługiwała cztery warstwy i legendy, ale raport przedstawiał tylko True Color. Porównanie dwóch dni było liczbowe. Piksele przezroczyste stapiały się z jednolitym tłem, a mobilny raport nie miał sposobu przejścia między zobrazowaniami dwóch dób.

W raporcie są teraz True Color, NDVI, NDWI i NDMI. Aktywną warstwę oznacza obramowanie oraz stan przycisku. Obok mapy są data UTC, zachmurzenie, użyteczne pokrycie analizowanego obszaru i osobno udział niezamaskowanych pikseli całego obrazu. Kreskowanie oznacza maskę lub brak danych, nie niską wartość indeksu. Numeryczne przedziały i kolorowe próbki pochodzą z tego samego pliku palet co istniejące rastry. Objaśnienia nie klasyfikują kondycji upraw.

Wybranie drugiej użytecznej doby ustawia też odniesienie w historii i odpowiedzi o zmianie NDVI. Dopiero „Porównaj mapy” otwiera drugi widok. Oba obrazy mają ten sam zakres WGS84, 720×324 px, promień, datowaną warstwę, skalę przybliżoną w środku i obrys kołowego obszaru analizy, nie granicy działki ewidencyjnej. Kadry są nieruchome, więc nie ma niezależnego przesuwania ani zoomu. Na telefonie przełącza się tylko jedną widoczną mapę. Oglądanie odniesienia nie przestawia daty raportu, kart, pogody ani AI. Zatwierdzenie nowej doby w historii aktualizuje te elementy wspólnie.

| Ekran, Biała Podlaska 500 m, 26.08.2026 UTC | Przed: X D1 | Po: X D2 |
| --- | --- | --- |
| 1440 px | [Jedna mapa True Color](media/x-d2/przed-1440.png) | [Porównanie NDVI 26 i 25.08](media/x-d2/po-1440.png) |
| 390 px | [Jedna mapa True Color](media/x-d2/przed-390.png) | [NDVI dla 25.08, przełączanie dat](media/x-d2/po-390.png) |

## Koszt pobierania

Przed zmianą raport wykonywał jedno żądanie PNG na wybraną dobę. Wcześniejsze pomiary w projekcie wskazywały ok. 165 kB dla tej klasy kadru; dlatego wybrano porównanie uruchamiane na żądanie i bezstratny WebP do ekranu. Serwer zachowuje dotychczasowy limit i współdzieli tę samą treść źródłową między formatami. Klient czeka 160 ms przed wysłaniem niebuforowanego żądania, anuluje nieaktualne, sprawdza wymiary i kanał alfa oraz trzyma maksymalnie 8 obrazów, do 8 MiB, przez maksymalnie 5 min. Anulowanie po stronie przeglądarki nie gwarantuje zatrzymania przetwarzania, które rozpoczął już dostawca.

Pomiar odpowiedzi HTTP dla Białej Podlaskiej, 500 m, ten sam kadr. To rozmiary treści, bez nagłówków; czasy Chrome poniżej obejmują interakcję i dekodowanie, ale nie są pomiarem całkowicie zimnego CDN ani dostawcy.

| Warstwa | 26.08, WebP | 25.08, WebP | Para |
| --- | ---: | ---: | ---: |
| True Color | 100 144 B | 61 292 B | 161 436 B |
| NDVI | 9 998 B | 6 630 B | 16 628 B |
| NDWI | 978 B | 1 148 B | 2 126 B |
| NDMI | 5 210 B | 3 862 B | 9 072 B |

Pierwotny PNG True Color z 26.08 miał 164 434 B. Otworzenie porównania dodało na desktopie jedno żądanie; na telefonie zero do wybrania drugiej daty. Zmiana niebuforowanej warstwy kosztowała dwa żądania w otwartym widoku desktopowym i jedno w mobilnym. Powrót do wcześniej zdekodowanych warstw nie wysłał żądania. W próbach lokalnych w Chrome wyświetlenie nowej warstwy lub porównania trwało ok. 0,24–2,38 s, powrót z cache do pary na desktopie 27–45 ms. Czasy są orientacyjne, nie gwarantowane.

## Próby i regresja

| Punkt, raport 2–31.08.2026 UTC | Doba raportu → odniesienie | Sprawdzone rzeczywiste warstwy |
| --- | --- | --- |
| Biała Podlaska `52.0423, 23.0804`, 500 m | 26 → 25.08 | True Color, NDVI, NDWI i NDMI dla obu dni |
| Veneto `45.523244962, 12.221163987`, 1 km | 30 → 27.08 | True Color i NDMI dla obu dni |
| Okolice Sulejówka `52.2668, 21.3112`, 500 m | 21 → 19.08 | True Color dla obu dni, NDWI dla odniesienia; poprawnie bez SoilGrids |

- Chrome: PL/EN, Clean Nature i Warm Graphite, szerokości 320, 390, 768 i 1440 px, mysz, klawiatura i dotyk. Porównano dokładne parametry zasięgu w żądaniach i próbki kolorów legend z paletami. Każdy raport zachował swoją datę kart, pogody i AI oraz prawidłowy status gleby.
- Próby kontrolowane: opóźniona warstwa i data, szybkie przełączanie, brak użytecznej obserwacji, odrzucona doba, całkiem przezroczysty obraz. Nie pojawił się raster z poprzedniego kontekstu. Brak nie jest zerem.
- Wywołanie eksportu podczas porównania NDVI przygotowuje wyłącznie mapę True Color dla doby raportu, nie drukuje dwóch map ani kontrolek i zachowuje istniejący raport A4. Ręczny wydruk przeglądarki nie zastępuje akcji aplikacji „Eksportuj PDF”, która przygotowuje osobny raster wydruku.
- `npm test`: 101/101. `npm run lint` i `npm run build`: poprawnie.
- [Vercel Preview gałęzi Draft PR #2](https://hydrosense-demo-git-audit-bcf7d1-dareckidarek70-8119s-projects.vercel.app/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-02&to=2026-08-31).

## Porównanie sezonów i X D3

Aktualny raport przyjmuje do 366 dni. Obejmuje różne pory roku, ale nie mieści dwóch kompletnych, równoległych 30-dniowych okien w różnych latach. Porównanie dwóch dat w X D2 nie jest porównaniem wieloletnim ani diagnozą stanu upraw. W X D3 minimalny zakres to dwie jawnie wybrane, osobno pobierane 30-dniowe ramy w tej samej części sezonu, dla tego samego punktu, promienia i warstwy. Należy pokazać rzeczywiste daty, ich różnicę, chmury, pokrycie i braki, porównując tylko pary o użytecznych odczytach. Bez interpolacji i bez przypisywania przyczyny.

**Rekomendacja: GO dla X D3 po akceptacji Preview**, zaczynając od takiego ograniczonego porównania sezonów, a nie od automatycznego raportu wieloletniego.
