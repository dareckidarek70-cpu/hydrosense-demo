# HydroSense: Etap VIII B, panel pogody

Sekcja **Warunki pogodowe** pojawia się w raporcie własnego punktu bezpośrednio po danych Sentinel-2. Nie jest częścią wydruku ani raportów demonstracyjnych. Korzysta z istniejącego [API i metodyki Etapu VIII A](etap-viii-a-pogoda.md) bez modyfikacji dostępu, limitów, modeli lub wartości.

- Domyślnie zapytanie używa zakresu raportu. Kontrolka pogody pozwala wybrać ostatnie 30, 90 lub 365 dni albo własny zakres i wrócić do zakresu raportu satelitarnego. Dni pozostają w UTC.
- Każda statystyka liczy wyłącznie dostępne wartości i pokazuje swój mianownik. Średnia okresu to średnia dostępnych średnich dobowych. Najdłuższa seria obejmuje kolejne doby z opadem **poniżej 1 mm**. Brak danych lub brak kolejnej daty przerywa serię. Nie jest to wskaźnik suszy glebowej.
- Pionowa linia zaznacza wybraną dobę. Wybór dnia myszą, dotykiem, przyciskami lub listą dat pokazuje dokładne wartości, w tym brak danych. Linie temperatury nie łączą luk. Oś pionowa dostosowuje się do wartości w zakresie.
- Cache przeglądarki jest wyłącznie w pamięci karty, do pięciu minut (sześć kluczy). Klucz zależy od współrzędnych i dat, nie od promienia, języka ani motywu. Przy zmianie zakresu lub obszaru panel odczekuje 200 ms przed wysłaniem żądania i anuluje starsze żądanie klienta. Uruchomiona już praca serwera może jednak dokończyć się i zasilić jego cache. Nie ma automatycznego ponawiania; przy limicie panel respektuje `Retry-After`.
- W Chrome kontrola liczby żądań i anulowania korzystała z lokalnego proxy. Zrzut błędu 502 to kontrolowana symulacja odpowiedzi pogodowej, przy rzeczywiście działającym raporcie Sentinel-2. Próby z pełnym i częściowym zakresem używają realnych danych przetwarzanych przez HydroSense.
