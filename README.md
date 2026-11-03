# DEADZONE: OUTBREAK

Grywalna gra FPS 3D w przeglądarce: przetrwanie kolejnych fal zombie w BLACKSITE–13, solo lub w prywatnej drużynie do czterech graczy. JavaScript ES Modules, Three.js, Rapier 3D, Vite, Node.js, Socket.IO i Web Audio. Bez Reacta, płatnych modeli, zewnętrznych tekstur ani usług wymagających kluczy API.

## Uruchomienie

Wymagany Node.js **20.19+** lub **22.12+** oraz przeglądarka desktopowa z WebGL 2. Zalecana aktualna wersja Chrome lub Edge. Klawiatura i mysz są wymagane do gry.

W folderze projektu:

```powershell
npm.cmd install
npm.cmd start
```

Otwórz **http://localhost:5173**. `npm start` uruchamia frontend i serwer co-op. Ctrl+C zatrzymuje oba procesy. W PowerShell używaj `npm.cmd`, jeśli polityka wykonywania skryptów blokuje `npm.ps1`; nie trzeba zmieniać polityki systemowej. W innych powłokach można używać zwykłego `npm`.

Osobne polecenia też są dostępne:

```powershell
# Terminal 1: frontend; wystarczy do gry solo
npm.cmd run dev

# Terminal 2: serwer dla co-op
npm.cmd run server
```

Tryb solo nie potrzebuje serwera multiplayer. Pierwsze wejście inicjalizuje lokalny moduł fizyki WASM. Kliknij **DEPLOY SOLO**; przeglądarka przechwyci kursor. Esc otwiera pauzę i zwalnia mysz.

## Co jest grywalne

- Sześć sektorów BLACKSITE–13 z fizycznymi ścianami, przeszkodami, maszynami, zamkniętymi drzwiami, oświetleniem i proceduralnymi materiałami.
- Ruch FPS: przyspieszenie, hamowanie, skakanie, kucanie, cichy chód, kolizje kapsuły Rapier, regulowana czułość i FOV, kołysanie broni, odrzut i reakcja na lądowanie.
- Dziesięć oryginalnych broni: **VX-9**, **DESERT EAGLE**, **TEC-9**, **RAVEN-47**, **M4-SPECTRE**, **VORTEX-9**, **IRON-12**, **LYNX-50**, **SCOUT-9** i **PBS-1**. Różne obrażenia, szybkostrzelność, zapasy amunicji, przeładowanie, rozrzut, odrzut, zasięg i modele 3D. Trzy sloty ekwipunku.
- Osobny slot noża pod **F** z trzema modelami odwzorowanymi z referencji: **Karambit**, **Skeleton Knife** i **Stiletto**. Wybrany model można zmienić w ustawieniach; poprzedni wybór Dagger automatycznie przechodzi na Stiletto. Nóż atakuje na bliskim dystansie po kliknięciu LPM.
- Karambit ma łukowatą klingę i profilowany chwyt z pierścieniem; Skeleton — duży otwór przy nasadzie, pięć małych otworów w klindze, otwór na końcu i owinięty chwyt. Stiletto ma wąską klingę, metalowe okucia, drewniane okładziny oraz animację otwierania ostrza.
- Noże mają fazowane ostrza, rzeczywiste otwory w rękojeściach, jedną dłoń z palcami zagiętymi wokół chwytu i animacje dobycia, cięcia oraz oglądania pod **V**. Dłoń i nóż poruszają się razem. Krótkie kliknięcia są zapamiętywane do następnego kroku gry; atak nożem nie zużywa amunicji broni palnej.
- Każdy typ zombie ma model ze stawami łokciowymi i kolanowymi, ruchomą szczęką, twarzą oraz ubraniem lub pancerzem. Ruch wynika z prędkości przeciwnika; osobno animowane są ataki, trafienia, śmierć, pełzanie i przygotowanie ataku bossa.
- Celność zależy od ruchu, skoku, kucania, czasu wejścia w celowanie i długości serii. Celownik pokazuje aktualny stożek rozrzutu. Rozrzut jest liczony w tej samej symulacji solo i na serwerze; śrut strzelby zachowuje własny stożek także przy celowaniu.
- Kamera odrzuca skoki kursora po przechwyceniu myszy i zmianie okna. Limit patrzenia obejmuje też odrzut, co zapobiega przechodzeniu kamery ponad pion i odwracaniu widoku.
- Hitscan z zasłanianiem przez geometrię, strefami głowy/tułowia/kończyn, premiami za headshot, pancerzem przeciwnika, markerami trafień, smugami i efektami uderzeń. Granaty z obrażeniami obszarowymi i zasłanianiem wybuchów przez ściany.
- Animowane modele 3D: zwykły zombie, runner, armored, crawler, exploder oraz boss **THE EXPERIMENT**. Nawigacja po siatce, rozdzielanie przeciwników, ataki wręcz, reakcje na trafienie i upadek po śmierci.
- Niekończące się rundy z narastającą trudnością, przerwą na zakupy oraz bossem co piątą rundę. Boss ma trzy fazy i zapowiadany atak obszarowy.
- Punkty za eliminacje, headshoty, asysty i naprawę barykady. Zakup broni, amunicji, pancerza, drzwi i pięciu perków; mystery cache, ulepszanie broni oraz trzy ukryte dzienniki.
- Zdrowie, pancerz, regeneracja po sześciu sekundach bez obrażeń, śmierć solo, stan powalenia w co-op, reanimacja przez przytrzymanie E, wykrwawienie, obserwowanie ocalałego gracza i odrodzenie po ukończeniu rundy.
- Prywatne pokoje Socket.IO, kody zaproszeń, gotowość graczy, start przez hosta, wspólny stan rozgrywki, osobne punkty i ekwipunki, restart meczu, zmiana hosta po rozłączeniu i czyszczenie pustych pokojów.
- Menu z animowanym tłem 3D, HUD, scoreboard, instrukcja, ustawienia, pauza i ekran końca meczu. Proceduralne dźwięki przestrzenne. Ustawienia Low/Medium/High/Ultra, bloom w High/Ultra i opcjonalna dynamiczna rozdzielczość.
- **Field Index** w menu zapisuje odkryte typy zombie i zdobyte bronie w przeglądarce; nowe wpisy pojawiają się po spotkaniu przeciwnika lub zdobyciu broni.
- Kliknięcie wpisu indeksu otwiera opis, statystyki i model 3D obracający się wokół własnej, wyśrodkowanej osi. Dostępne są bronie, przeciwnicy i trzy noże. Podgląd nie zmienia licznika odkrytych wpisów ani odblokowań sklepu.
- **B** otwiera sklep z bronią, amunicją, pancerzem (shield), apteczkami, granatami, perkami i ulepszeniem aktualnej broni. **B**, **Esc** lub przycisk zamknięcia wracają do rozgrywki. W solo sklep zatrzymuje symulację; w co-op mecz trwa dalej.
- Indeks broni i zagrożeń przewija się wewnątrz menu na komputerach oraz razem ze stroną na urządzeniach mobilnych. Zombie mają 5% szansy na upuszczenie podświetlonego schematu; podnieś go klawiszem **E**, by odblokować odpowiadającą mu broń za darmo.

## Pierwsza rozgrywka

Startujesz z pistoletem, 500 punktami, 25 punktami pancerza i dwoma granatami. Pierwsza fala zaczyna się po siedmiu sekundach.

- Zwykła eliminacja: **100** punktów, headshot: **150**, asysta: **50**.
- Stacje broni odblokowują schemat **za darmo** po interakcji **E**. Następnie kupujesz broń w sklepie **B**, np. TEC-9 za **950**, DESERT EAGLE za **1 400**, SCOUT-9 za **1 900** lub PBS-1 za **2 400** punktów. Schematy są indywidualne i obowiązują w aktualnym meczu. Ponowne wybranie posiadanej broni w sklepie tylko ją wyposaża, bez opłaty.
- Jeśli nie chcesz szukać stacji ani czekać na drop, możesz kupić zablokowany schemat w sklepie za **70% ceny broni**. Odblokowanie schematu nie kupuje samej broni — jej pełną cenę płacisz osobno.
- Drzwi do punktu kontrolnego: **750** punktów; tunel: **1 000**.
- Amunicja w sklepie: **250** punktów — uzupełnia zapas aktualnej broni; magazynek nadal wymaga przeładowania. Stare stacje amunicji dodatkowo uzupełniają co najmniej dwa granaty.
- Pancerz: **500** punktów, przywraca 100 punktów shield. Apteczka: **350**, przywraca pełne zdrowie. Dwa granaty: **300**, maksymalnie można nosić cztery. Zakupy pełnych zasobów są blokowane bez pobierania punktów.
- Po każdej rundzie masz 12 sekund na zakupy; otrzymujesz 100 punktów i jeden granat, maksymalnie cztery.
- Ulepszenie broni kosztuje **2 500** punktów, zwiększa obrażenia ×1,9 i pojemność magazynka ×1,5.
- Naprawa barykady daje 25 punktów; ograniczona do czterech napraw na rundę i jednej co pięć sekund.
- Przeciwnicy specjalni pojawiają się stopniowo od trzeciej rundy. Boss pojawia się w rundach 5, 10, 15 itd.

## Sterowanie

| Klawisz              | Działanie                                   |
| -------------------- | ------------------------------------------- |
| W / A / S / D        | Ruch                                        |
| Mysz                 | Rozglądanie                                 |
| Lewy przycisk myszy  | Strzał; przytrzymanie prowadzi ogień        |
| Prawy przycisk myszy | Celowanie                                   |
| R                    | Przeładowanie                               |
| Shift                | Cichy chód                                  |
| Ctrl lub C           | Kucanie                                     |
| Ctrl podczas biegu   | Ślizg z zachowaniem pędu                    |
| Spacja               | Skok                                        |
| E                    | Interakcja / zakup; przytrzymanie reanimuje |
| F                    | Wyciągnięcie / schowanie noża               |
| V                    | Oglądanie broni lub noża                    |
| B                    | Sklep / zamknięcie sklepu                   |
| Lewy przycisk myszy  | Atak nożem, gdy jest wyciągnięty            |
| G                    | Granat                                      |
| 1 / 2 / 3            | Zmiana broni                                |
| Tab                  | Wyniki drużyny                              |
| Esc                  | Pauza / zwolnienie kursora                  |

W multiplayer menu pauzy **nie zatrzymuje meczu**. Reanimacja wymaga trzech sekund przy powalonym graczu. Czas wykrwawienia wynosi 30 sekund. Jeżeli wszyscy zostaną powaleni, mecz się kończy.

## Co-op na dwóch klientach

1. Uruchom `npm start`.
2. Otwórz dwa okna przeglądarki na `http://localhost:5173`.
3. W pierwszym wybierz **CO-OP OPERATIONS → CREATE PRIVATE LOBBY**.
4. W drugim wpisz otrzymany sześcioznakowy kod i wybierz **JOIN**.
5. Obaj gracze wybierają **READY UP**, host następnie **DEPLOY SQUAD**.
6. Jeśli przeglądarka nie przechwyci automatycznie myszy drugiego gracza, kliknij **RESUME OPERATION** w jego oknie.

Na innych komputerach w tej samej sieci użyj adresu `Network` wyświetlanego przez Vite, np. `http://192.168.x.x:5173`. Zapora systemu musi pozwalać na połączenie z tym portem. Proxy Vite przekazuje Socket.IO do serwera, więc w tym układzie nie trzeba udostępniać klientom portu 3001.

Dla osobnych domen frontendu i backendu ustaw `VITE_SERVER_URL` przed buildem i `ALLOWED_ORIGINS` na serwerze. Przykłady znajdują się w `.env.example`; Vite odczytuje `.env`, natomiast serwer używa zmiennych środowiskowych procesu. Kod pokoju nie zastępuje uwierzytelnienia konta.

## Build produkcyjny

```powershell
npm.cmd run build
npm.cmd run server
```

Serwer udostępnia zbudowany frontend i Socket.IO pod **http://localhost:3001**. Do publikacji internetowej użyj hostingu uruchamiającego Node.js oraz reverse proxy z HTTPS i obsługą WebSocket. Sam statyczny hosting pozwoli grać solo; co-op wymaga działającego procesu serwera.

Domyślny port serwera to 3001 (`PORT`), interfejs to `0.0.0.0` (`HOST`). `/health` zwraca stan procesu i liczbę pokojów. Pokoje i mecze przechowywane są w pamięci procesu.

## Weryfikacja

```powershell
npm.cmd test
npm.cmd run build

# Test zbudowanej gry; uruchamia własny serwer na wolnym porcie:
npm.cmd run test:production

# Z działającym frontendem i serwerem:
npm.cmd run test:browser
npm.cmd run test:models
npm.cmd run test:features
```

Testy jednostkowe i integracyjne sprawdzają walidację wejścia, kolizje Rapier, skok i kucanie, trafienia i przesłanianie przez ściany, odrzucanie zbyt szybkich strzałów, przeładowanie, zakupy i punkty, drzwi, nawigację, rundy, bossów, reanimację, granaty, sześć broni, gotowość hosta, limity pokoi, synchronizację i rozłączenia. Integracja korzysta z prawdziwych klientów Socket.IO i serwera na losowym lokalnym porcie.

Test przeglądarkowy używa Playwright i zainstalowanego Microsoft Edge, bez pobierania osobnej przeglądarki. Obejmuje menu, ustawienia, instrukcję, pointer lock, klawiaturę i mysz, strzelanie, przeładowanie, zakup drzwi, pauzę, śmierć i restart. Uruchamia też dwóch niezależnych klientów co-op, sprawdza wspólny stan i ruch, rozłączenie oraz brak błędów konsoli. Zrzuty zapisuje w `test-results/`. Zmienna `TEST_BROWSER=chrome` wybiera zainstalowanego Chrome; `TEST_URL` zmienia adres aplikacji.

Wyłącznie w trybie developerskim `window.__DEADZONE__` pozwala testom przygotować deterministyczny scenariusz walki. Produkcyjny build nie wystawia tego obiektu. Weryfikacja przez LAN, Internet i testy obciążenia na czterech fizycznych komputerach pozostają osobnymi zadaniami wdrożeniowymi.

## Architektura

```text
shared/
  config.js             parametry broni, przeciwników, perków
  map.js                wspólna geometria kolizji, sektory i interakcje
  Physics.js            Rapier, kapsuły graczy i kolizje
  Navigation.js         pola odległości BFS dla nawigacji zombie
  Simulation.js         walka, AI, fale, zdrowie, ekonomia i interakcje
src/
  core/                 inicjalizacja, stały krok symulacji, wejście
  rendering/            Three.js, materiały, światło, bloom, efekty
  world/                proceduralna geometria BLACKSITE–13
  weapons/              modele i animacje broni z pierwszej osoby
  enemies/              modele, animacje, ponowne użycie przeciwników
  audio/                synteza dźwięku i przestrzenne źródła
  multiplayer/          połączenie i komunikaty Socket.IO
  ui/                   menu, lobby, HUD i ustawienia
server/
  index.js              HTTP, pokoje, limity zdarzeń, pętla serwera
  GameRoom.js           gracze, host, gotowość, cykl meczu
scripts/dev.js          jednoczesne uruchamianie frontendu i backendu
tests/                  testy symulacji, sieci i przeglądarki
```

Solo i multiplayer wykorzystują ten sam moduł symulacji. Serwer pracuje w kroku **60 Hz**, wysyła snapshoty **20 Hz** i jest właścicielem pozycji, trafień, zdrowia, punktów, ekwipunku, zakupów, zombie i rund. Klient przesyła przyciski, kierunek patrzenia i akcje; nie przesyła wiążącej wartości obrażeń ani punktów. Ruch lokalny jest przewidywany z Rapier i uzgadniany z potwierdzeniami serwera; zombie są interpolowane z buforem około 100 ms.

Optymalizacje obejmują instancjonowanie podłogi, scalanie statycznej geometrii według materiału, bufory nawigacji, pule efektów i modeli zombie, ograniczenie liczby jednoczesnych zombie do 40 i jakości cieni/rozdzielczości.

## Zakres i ograniczenia tej wersji

Grywalny zakres fazy 1 jest zaimplementowany, wraz z systemami walki, progresji, co-op i bossem z kolejnych faz. Jest to samodzielna, proceduralna gra; modele i animacje są stylizowane, dźwięki syntetyczne, a sektory tworzą kompaktową mapę na jednym poziomie. Barykady mają ograniczaną akcję naprawy i nagrodę; nie ma systemu fizycznego odrywania desek. Nie zastosowano płatnych ani zewnętrznych assetów.

Nie ma zapisu meczu, dobierania losowych graczy, kont, ponownego dołączenia do trwającego meczu ani kompensacji opóźnienia przez cofanie czasu trafień. Rozłączenie usuwa gracza z meczu. Serwer waliduje akcje i ogranicza ich tempo; nie jest to kompletny system przeciwdziałania oszustwom. Celem wydajności jest 60 FPS, ale nie zostało to potwierdzone pomiarami na reprezentatywnych komputerach graczy. Na słabszym sprzęcie wybierz Medium lub Low.

Rapier może wypisać ostrzeżenie o przestarzałej sygnaturze inicjalizacji wewnątrz pakietu WASM. Jego publiczne API nadal przyjmuje `init()` bez argumentów. Build może zgłosić rozmiar pakietu fizyki przekraczający 500 kB — to lokalny moduł WASM, nie brakujący zasób.

## Dokumentacja bibliotek

- [Three.js — WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)
- [Rapier — character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/)
- [Socket.IO — dokumentacja](https://socket.io/docs/v4/)

Formatowanie kodu: `npm run format`.
