# HydroSense 2.0: ograniczony podgląd SoilGrids (IX B)

## Kontrola IX A

Punktem wejścia jest zachowany katalog `isric` z prób IX A, nie tabela z raportu. Generator [build-soil-preview.py](../scripts/build-soil-preview.py) czyta GeoTIFF Int16 i źródłowy VRT, sprawdza sumy SHA-256, warstwę `0-5cm`, indeks komórki i rozdzielczość 250 m. Układy GeoTIFF i VRT opisano nieco innym WKT, dlatego zgodność sprawdzamy przez transformację tych samych współrzędnych do obu układów i porównanie współrzędnych natywnych, a nie przez porównanie tekstu CRS. Mediana pH musi dodatkowo zgadzać się z WebDAV/VRT, który usuwa niejednoznaczność nieoznaczonych zer WCS.

**Dlaczego 95,1%?** Oryginalne wartości Białej Podlaskiej to 603, 298 i 50 g/kg z tej samej komórki, głębokości oraz kwantyla Q0.5. Wynik 951 g/kg istniał już w surowych rastrach. Po podzieleniu przez 10 mamy 60,3%, 29,8% i 5,0% masy. To nie błąd skali, zaokrąglenia, głębokości ani maski. [Metodyka SoilGrids 2.0, sekcje 2.1.2 i 2.5.1](https://soil.copernicus.org/articles/7/217/2021/) opisuje skład domykający się na poziomie pojedynczych predykcji drzew po transformacji odwrotnej, a następnie kwantyle wyznaczane osobno dla każdej frakcji. Suma trzech median brzegowych nie musi wynosić 100%. Nie dopisujemy brakującej części, nie normalizujemy i nie pokazujemy wykresu składu ani klasy tekstury. W Veneto wynik to analogicznie 91,9%.

Według [dokumentacji ISRIC](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html) dzielnik 10 dotyczy także pH w wodzie (bez jednostki) i węgla organicznego (g/kg), a dla gęstości objętościowej w kg/dm³ jest to 100. Dla pH pobrano osobne rastry Q0.05 i Q0.95: granice nominalnego **90% przedziału predykcji modelu**, nie przedział ufności ani miara lokalnej zmienności. Pozostałym właściwościom nie przypisano niesprawdzonych przedziałów.

**Licencja:** [polityka ISRIC](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html) udostępnia produkt SoilGrids na [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Wyodrębnione komórki można zachować, przeliczać i pokazywać z atrybucją i informacją o modyfikacji. Panel podaje ISRIC, licencję, publikację Poggio i in. oraz informację o odczycie komórki i konwersji jednostek. Nie zawiera WoSIS ani konturów, atrybutów czy obrazów GUGiK. Jest wyłącznie link do oficjalnej kompozycji Rolnictwo.

## Lokalny odczyt i rzeczywiste wyniki

`lib/soil-preview-cells.json` zawiera tylko **trzy natywne komórki**: dwie z danymi, jedną jawnie zamaskowaną. Zapisano surowe wartości całkowite i sumy kontrolne 28 plików wejściowych. `lib/soil-preview.ts` odczytuje indeks komórki z przeliczenia WGS84 na północno-wschodni płat IGH ([PROJ](https://proj.org/en/stable/operations/projections/igh.html)). Zachodni i północny brzeg należą do komórki; wschodni i południowy do sąsiedniej. Nie ma wyszukiwania najbliższego piksela, interpolacji, uśredniania w buforze ani ponownego pobierania po zmianie motywu, języka, okresu lub dnia satelitarnego. Odczyt odbywa się na serwerze tylko z lokalnego pliku, bez REST, WCS, serwisu zewnętrznego i nowych kluczy. Panel blokuje się przy `VERCEL_ENV=production`.

| Punkt, szerokość / długość | Status | Odczyt warstwy 0–5 cm |
| --- | --- | --- |
| Biała Podlaska 52.0423 / 23.0804 | Dostępny | pH 5,4 (3,9–7,6); piasek 60,3%, pył 29,8%, ił 5,0%; węgiel organiczny 21,6 g/kg; gęstość 1,27 kg/dm³ |
| Wenecja 45.41 / 12.30 | NoData | Brak wartości: VRT pH wskazuje NoData. WCS zwrócił nieoznaczone zera; nie publikujemy ich jako pomiarów. |
| Lądowy punkt Veneto 45.55 / 12.15 | Dostępny | pH 7,8 (5,6–8,3); piasek 25,4%, pył 46,8%, ił 19,7%; węgiel organiczny 33,3 g/kg; gęstość 1,34 kg/dm³ |
| Warszawa 52.2297 / 21.0122 lub niewłączone komórki obok punktów | Poza wycinkiem | Ten sam nagłówek o niedostępności, ale z inną przyczyną niż maska SoilGrids. |

Regeneracja offline (Rasterio wyłącznie w narzędziu deweloperskim, bez zależności aplikacji):

```sh
python scripts/build-soil-preview.py --capture /path/to/unpacked/isric --out lib/soil-preview-cells.json
```

Weryfikacja automatyczna: **69/69** testów; 4 nowe testy sprawdzają zgodność indeksów z PROJ/GDAL, odczyty i jednostki, cztery krawędzie w odległości 1 m po obu stronach, maskę, punkt poza wycinkiem i zmianę współrzędnych. `npm run lint` i `npm run build` przeszły. Do próby interfejsu na Preview użyj `/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-01&to=2026-08-31#soil-title` i zmień współrzędne zgodnie z tabelą.

## Ograniczenia i kryterium przejścia dalej

Panel jest po głównej analizie Sentinel-2 i pogodzie. Dotyczy tylko raportu współrzędnych, nie działek demonstracyjnych ani PDF. Dane przedstawiają regionalny kontekst modelowy, nie próbkę, skład całego pola ani diagnozę przydatności, nawożenia lub wapnowania. W wycinku brak pozostałych warstw głębokości i niepewności innych właściwości; brak pokrycia podglądu nie jest informacją o braku gleby. Wersja produkcyjna i poprzednie integracje pozostają bez zmian.

**IX C:** można kontynuować ograniczony podgląd i planowanie większego, wersjonowanego zestawu wycinków ze zweryfikowaną maską dla każdej dokładanej warstwy. Nie rozszerzać automatycznie zasięgu ani nie wykorzystywać danych do ocen pola. GUGiK wymaga niezależnego potwierdzenia praw przed integracją.
