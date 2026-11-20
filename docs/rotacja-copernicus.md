# Rotacja Copernicus i archiwum HydroSense

Zakres: Draft PR #2, gałąź `audit/hydrosense-improvements`. Usunięcie `.env.local` z bieżącej gałęzi nie usuwa istniejących kopii z historii. Repozytorium pozostaje publicznym, niekomercyjnym projektem edukacyjnym koła LEO. Poniższe kroki nie wymagają płatnej usługi ani zmiany funkcjonalności aplikacji.

## Przełączenie Preview

1. W [Sentinel Hub](https://shapps.dataspace.copernicus.eu/dashboard/) otwórz **User settings → OAuth clients**. Właściciel tworzy nowego klienta serwerowego **HydroSense Preview**: bez opcji SPA, z terminem ważności zapisanym w kalendarzu zespołu. Nie usuwaj ani nie unieważniaj dotychczasowego klienta. [Instrukcja Copernicus](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html).
2. W [Vercel → Environment Variables](https://vercel.com/dareckidarek70-8119s-projects/hydrosense-demo/settings/environment-variables) właściciel wprowadza nowy identyfikator i sekret jako `COPERNICUS_CLIENT_ID` oraz `COPERNICUS_CLIENT_SECRET`. Ustaw typ **Secret**, środowisko **Preview** i gałąź `audit/hydrosense-improvements`. Nie zmieniaj istniejących wpisów współdzielonych z Production. Jeśli panel nie pozwoli dodać wartości dla gałęzi bez zmiany wspólnych wpisów, przerwij i uzgodnij alternatywę; nie usuwaj tych wpisów. [Zakresy zmiennych Vercel](https://vercel.com/docs/environment-variables) · [Typ Secret](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types).
3. Po zapisaniu obu wpisów uruchom nowe wdrożenie **Preview** z aktualnego commitu gałęzi. Istniejące wdrożenia zachowują poprzednią konfigurację. Sprawdź, że wdrożenie jest typu Preview, nie Production, oraz że oba wpisy mają zakres tylko tej gałęzi. [Zastosowanie nowych wartości](https://vercel.com/docs/environment-variables/managing-environment-variables).
4. W świeżym Preview otwórz własny obszar pod Białą Podlaską (`52.0423, 23.0804`, 500 m, `2026-08-02…2026-08-31 UTC`). Potwierdź odpowiedź statystyk, datę i wskaźniki, a następnie wyświetlenie True Color, NDVI, NDWI i NDMI dla tej samej doby. Weryfikuj gotowy obraz, nie tylko HTTP 200. Nie wyświetlaj tokenów ani wartości zmiennych. Działający raport na poprzednim wdrożeniu nie zalicza tego testu.
5. Osobno uzgodnij klienta Production, termin wdrożenia i sprawdzenie obu środowisk. Dopiero po osobnej, wyraźnej zgodzie właściciel unieważnia stary klient i uwzględnia czas życia wcześniej wydanych tokenów. Do tego momentu incydent pozostaje otwarty.

## Plan oczyszczenia historii, bez wykonywania

- Najpierw rotacja i unieważnienie. Następnie uzgodnij z właścicielem i współpracownikami przerwę w publikowaniu. Zinwentaryzuj gałęzie, tagi, PR-y, forki i kopie wdrożeń. Zachowaj wyłącznie sprawdzony, bezsekretowy eksport drzewa jako kopię konkursową.
- Po akceptacji wykonaj próbę `git-filter-repo --sensitive-data-removal` w odizolowanej kopii. Usuń wszystkie ustalone historyczne ścieżki z sekretami, także dawne nazwy. Gdy sekret występuje w innych plikach, zaplanuj redakcję bez zapisywania wartości w poleceniach, logach lub repozytorium. Przed publikacją porównaj czyste drzewa, sprawdź nowe odwołania oraz uruchom testy.
- Przepisanie odwołań GitHuba wymaga osobnej zgody. Uzgodnij wpływ na hashe, podpisy, otwarte PR-y i ochronę gałęzi. Z właścicielami forków i klonów uzgodnij odtworzenie z czystej kopii, bez ponownego scalania starej historii. Sprawdź historyczne wdrożenia, cache i artefakty. Jeśli kopie pozostają dostępne, przeanalizuj zakres pomocy [GitHub Support](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
- Po przełączeniu włącz lub skonfiguruj ochronę przed wypchnięciem sekretów, jeśli jest dostępna dla repozytorium. Nie zapisuj rzeczywistych wartości w przykładach, raportach lub artefaktach.

## Kopia konkursowa

Wybrano `a08cb4c` (29.04.2026), ostatni kwietniowy commit na pierwszej linii `main`, sprzed listopadowych zmian. Repozytorium nie zawiera oznaczonego tagu konkursowego. Eksport obejmuje odtworzone pliki projektu, bez `.git`, `.env.local` i danych Vercel, z pustym przykładem konfiguracji. Archiwum przechowuj poza publicznym repozytorium i chmurą dostępną publicznie; nie używaj klonu lustrzanego jako bezpiecznego archiwum konkursowego.
