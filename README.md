# DEADZONE: OUTBREAK — THE LOST FOREST

Przeglądarkowy FPS 3D: obrona obozu ocalałych, eksploracja rosnącego lasu i fale zombie. Solo lub prywatny co-op do czterech graczy. Three.js, Rapier, Vite, Node.js, Socket.IO i Web Audio.

[Opis ostatniej aktualizacji i trzech większych systemów](docs/survivor-update.md) · [Integracja leśnej mapy](docs/forest-integration.md) · [Przeciwnicy i rozdziały](docs/infected-and-chapters.md) · [Referencje broni](docs/weapon-references.md).

## Uruchomienie

Node.js 20.19+ / 22.12+, desktopowa przeglądarka z WebGL 2, klawiatura i mysz.

```powershell
npm.cmd install
npm.cmd start
```

Otwórz **http://localhost:5173**. Polecenie uruchamia frontend i serwer co-op. Ctrl+C zatrzymuje oba. W PowerShell używaj `npm.cmd`, jeśli polityka systemowa blokuje `npm.ps1`.

Oddzielnie można uruchomić `npm.cmd run dev` i `npm.cmd run server`. Solo wymaga tylko frontendu. Po aktualizacji zrestartuj serwer Node i odśwież stronę; ustawienia, indeks i wybory skinów pozostają zapisane w przeglądarce.

## Obecna zawartość

- **27 broni palnych i 3 noże**: dotychczasowy arsenał oraz Colt M1911A1, SIG Sauer P226, CZ 75 B, IWI UZI PRO, KRISS Vector SMG, Benelli M4, Remington 870, FN FAL, HK G36C i Accuracy International AXMC. Własne modele, dźwięki, parametry i ruchome części. Zachowano ADS, odrzut, rozrzut, headshoty, przeładowanie i trzy sloty.
- **1110 płatnych wykończeń**: na każdą broń i nóż przypada 8 rzadkich, 4 epickie, 2 mityczne i 4 specjalne skiny, ich 18 wariantów GOLD oraz samodzielny GOLD. Serie specjalne to Lustrzane srebro, Karmazynowa sieć (Crimson Web), Szmaragd i Głęboka czerń. Polskie nazwy i opisy, z przełączaniem na angielski w ustawieniach. Podgląd 3D i osobny zapis zakupów. Oryginał fabryczny pozostaje bezpłatny. Dłonie i szkło zachowują własne materiały; specjalne serie pokrywają również lufy i mechanizmy. Skin nie kupuje broni ani schematu.
- **Karambit, Skeleton i Stiletto** z wcześniejszych referencji. Jedna dłoń podczas trzymania noża, rzeczywiste otwory w geometrii, dobycie, cięcie, oglądanie i otwieranie Stiletto. Ochrona kamery przed skokami myszy i przekręceniem widoku pozostała aktywna.
- **13 wariantów zombie** korzysta z kanciastej podstawy odtworzonej z ostatniego obrazka: porwana koszula, poszarpane spodnie, otwarte usta i pomarańczowe oczy. Różnią się paletą, ubraniem, wielkością i zdolnościami. Śmierć korzysta z **11-bryłowego ragdolla Rapier** z grawitacją, połączeniami, impulsem trafienia i zderzeniami z terenem oraz przeszkodami.
- **Rosnący las** z deterministycznego seeda. Chunki 24 m, ścieżki, drzewa, trawa, skały, chaty, biwaki, ruiny, wraki i skrytki. Wspólna geometria terenu i kolizji, nawigacja omijająca zabudowę i drzewa, odradzanie poza obozem i widocznym stożkiem kamery.
- **Rozbudowany obóz**: palisada, cztery barykady, wieże, ognisko, namiot medyczny, radiostacja, stolarnia, magazyn, generator i zbiorniki wody. Barykady mają 300 HP, można je naprawić za 2 drewna i wzmocnić do 600 HP. Zniszczenie i odbudowa zmieniają rzeczywistą kolizję.
- **Crafting** przy warsztacie: amunicja, apteczki, Mołotowy, pułapki, pancerz i modyfikacje aktualnej broni. Magazynek +25%, szybsze przeładowanie / mniejszy rozrzut, kalibracja ADS. Działa razem z wcześniejszym ulepszeniem za kredyty.
- **Arena treningowa**: precyzja, tracking i refleks, próby po 60 sekund, wszystkie bronie bez opłat, pomiar celności i headshotów. Wyposażenie treningowe nie przechodzi do przetrwania.
- **Kontrakty wypraw** z tablicy przy radiostacji: obrona obozu, odzyskanie skrzyni i zniszczenie gniazda. Wspólny postęp oraz nagrody dla drużyny.
- **Wspólna rozbudowa obozu**: po trzy poziomy ambulatorium, warsztatu i generatora. Skuteczniejsze apteczki, tańszy crafting i impulsy obronne przy barykadach.
- **Mapa taktyczna M**: obóz, dostępny las, pobliskie rozpoznane struktury, drużyna, cel wyprawy i wspólne znaczniki na 45 sekund. Nie ujawnia wszystkich ukrytych skrzyń.
- **PL / EN w ustawieniach**, zapis wyboru języka, lokalizowany interfejs i tablice w świecie. Przyciemnione oświetlenie, cykl dobowy, deszcz, burze, wiatr, ognisko i latarka. W nocy zombie są o 12% szybsze.

## Progresja i schematy

**15 broni podstawowych ma schemat od startu**. Schematy **12 specjalnych** znajdują się w ukrytych skrzyniach w lesie. Schemat jest odblokowywany drużynie, materiały otrzymuje zbierający. Sama broń nadal kosztuje kredyty. W lesie schematy nie wypadają z zombie i nie można kupić ich oddzielnie w sklepie. Barrett wymaga dotarcia do głębokiego lasu od fali 11, nadal kosztuje **6000** i zadaje bazowo **210 w ciało / 650 w głowę**.

Sklep **B** zachowuje amunicję za 250, pancerz za 500, leczenie za 350, dwa granaty za 300 i ulepszenie broni za 2500 kredytów. Ceny części broni podniesiono, ponieważ rozszerzanie lasu nie wymaga kupowania drzwi. Ponowne wyposażenie posiadanej broni jest bezpłatne. Pełnych zapasów nie można opłacić ponownie.

Broń w B ma filtry: pistolety, PM, karabiny, snajperki i strzelby. **B → Zapasy** odblokowuje latarkę za **600 kredytów** z baterią na **120 sekund**. Zapasowa bateria kosztuje **200**, można nosić trzy; wymienia się automatycznie po rozładowaniu. **L** włącza mocny snop światła. Wyłączona latarka nie zużywa baterii. Zakup i zapasy pozostają po zmianie rozdziału.

**Latarnia ochronna** w zapasach kosztuje **350 kredytów**. **O** stawia ją przed graczem na ziemi. Odstrasza zwykłe zombie w promieniu **6 m** przez **180 sekund**. Bossy ignorują jej światło; przeciwnicy dystansowi nadal mogą atakować spoza kręgu. Maksymalnie dwie latarnie w plecaku i cztery aktywne w drużynie. Nieudane ustawienie nie zużywa przedmiotu.

Pasywne leczenie działa wyłącznie **do 5 m od ogniska**, po **5 sekundach bez obrażeń**, z szybkością **4 HP/s**. Poza ogniskiem używaj apteczek H lub kup apteczkę polową. Ambulatorium wzmacnia apteczki o 5 HP na poziom; nie przywraca regeneracji w lesie.

**Skiny N** kupuje się za osobne punkty: **25 PTS za faktycznie ukończoną falę**, wypłata po śmierci lub wyjściu do menu. Ta sama fala z tego meczu nie jest rozliczana ponownie; trening nie przyznaje punktów. Rzadki skin kosztuje **100**, epicki **250**, mityczny **600**, specjalny **800**. Każdy legendarny **GOLD kosztuje 1000 PTS** (40 ukończonych fal oszczędzania); wersja GOLD konkretnego skina wymaga też posiadania jego podstawy. Portfel i zakupy zapisują się w tej przeglądarce. Wcześniej bezpłatnie wybrane skiny wymagają teraz zakupu.

Startujesz z pistoletem, 500 kredytami, 25 pancerza, dwoma granatami i podstawowym wyposażeniem survivalowym. Pierwsza fala po 7 sekundach; za eliminację 100, headshot 150, asystę 50 kredytów. Za ukończenie fali dostajesz także drewno i medykamenty.

Przerwy po ukończonych falach wynoszą **25, 30, 35, 40, 45, 50, potem 55 sekund**. Limit 55 sekund pozostaje także po zmianie rozdziału.

**Ostatnia fala rozdziału (15, 30, 45...)** zaczyna się od jednego **BIG BOSSA / Władcy Lasu**, większego i wytrzymalszego od minibossów. Przywołuje trzy grupy obstawy. Dopóki trwa przywołanie lub żyje obstawa, boss jest chroniony (niebieskie oczy / tarcza w HUD). Po jej pokonaniu odsłania się. Kolejne grupy pojawiają się przy 65% i 30% HP; duży pojedynczy strzał nie omija etapu. Dopiero jego śmierć kończy falę i otwiera następny rozdział.

Las rozszerza się przy falach **4, 7, 11, 16**, potem co pięć fal. Obszar rośnie od **72 × 72 m** do **408 × 408 m**. Co 15 ukończonych fal zaczyna się kolejny rozdział wyprawy; obóz, pozycje, seed, skrytki, otwarte chaty, bronie, schematy, materiały i skiny pozostają. Rozdział daje zapasy i 500 kredytów. Nazwy rozdziałów powtarzają się po trzecim, trudność rośnie dalej.

## Sterowanie

| Klawisz       | Działanie                                                                  |
| ------------- | -------------------------------------------------------------------------- |
| WASD / mysz   | Ruch / rozglądanie                                                         |
| LPM / PPM     | Strzał lub cięcie / ADS                                                    |
| R             | Przeładowanie                                                              |
| Shift         | Cichy chód                                                                 |
| Ctrl / C      | Kucanie; podczas biegu ślizg                                               |
| Spacja        | Skok                                                                       |
| E             | Interakcja, skrytka, kontrakt, naprawa, rozbudowa; przytrzymanie reanimuje |
| F / V         | Wyciągnij nóż / obejrzyj model                                             |
| B / N         | Sklep / kolekcja i zakupy skinów                                           |
| K / M         | Warsztat / mapa taktyczna                                                  |
| L / H / J / T | Latarka / apteczka / Mołotow / pułapka                                     |
| O             | Postaw kupioną latarnię ochronną                                           |
| G / 1–3       | Granat / zmiana slotu broni                                                |
| P / U         | W treningu: wybór ćwiczenia i broni / nowa próba                           |
| Tab / Esc     | Wyniki / pauza i zwolnienie kursora                                        |

W solo menu zatrzymują symulację. W co-op mecz nadal trwa. Reanimacja wymaga trzymania E przez 3 sekundy obok powalonego; wykrwawienie trwa 30 s. Wyeliminowani wracają po ukończeniu fali. Powalenie całej drużyny kończy mecz.

## Multiplayer i produkcja

W menu wybierz **CO-OP OPERATIONS → CREATE PRIVATE LOBBY** (lub odpowiedniki PL). Drugi gracz wpisuje kod pokoju i wybiera JOIN. Wszyscy zaznaczają READY UP, host uruchamia DEPLOY SQUAD. Jeśli kursor nie zostanie przechwycony, kliknij przycisk wznowienia.

W LAN użyj adresu Network wypisanego przez Vite. Proxy przekazuje Socket.IO na port 3001. Dla osobnych domen ustaw `VITE_SERVER_URL` przed buildem i `ALLOWED_ORIGINS` na serwerze; zobacz `.env.example`.

```powershell
npm.cmd run build
npm.cmd run server
```

Gotowy frontend i Socket.IO są pod **http://localhost:3001**. `PORT` / `HOST` zmieniają nasłuch, `/health` pokazuje stan. Co-op wymaga procesu Node i WebSocket; statyczny hosting obsłuży solo. Serwer jest właścicielem seeda, rozszerzeń, uszkodzeń, trafień, zakupów, craftingu, kontraktów, rozbudowy, markerów, zombie i fal.

## Weryfikacja

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:production  # własny serwer i dwóch klientów co-op

# Przy uruchomionym frontendzie:
npm.cmd run test:forest
npm.cmd run test:survivor
npm.cmd run test:skins
npm.cmd run test:update
npm.cmd run test:models
npm.cmd run test:knife-reference
```

Testy Node sprawdzają walkę, ceny, kamerę, kolizje, generację, zdolności, modele, ragdoll, crafting, obóz, kontrakty, schematy, trening i prawdziwych klientów Socket.IO. Test skinów renderuje wszystkie 1110 wykończeń, sprawdza cztery serie specjalne, ich materiały oraz polskie nazwy. Scenariusz update sprawdza kategorie, latarkę, baterie, szyję ragdolla, przerwy 25–55 sekund, rozliczenie skinów i GOLD. Pozostałe scenariusze sprawdzają język, bronie, trening, mapę i współpracę.

Playwright używa zainstalowanego Edge; `TEST_BROWSER=chrome` wybiera Chrome, `TEST_URL` zmienia frontend. Zrzuty trafiają do `test-results/`. Debug `window.__DEADZONE__` istnieje wyłącznie w Vite DEV. Formatowanie: `npm.cmd run format`.

## Granice wersji

Modele są autorską, proceduralną rekonstrukcją referencji, nie oryginalnymi plikami z obrazków. Nie dodano atrap łuku i toporka. Woda jest płytka; wieże stanowią otoczenie, a naprawiać można cztery barykady. Smugi światła są efektem warstw, nie pełną wolumetrią.

Pamięć jest ograniczona: do 289 chunków danych, 25 załadowanych chunków renderera, 40 żywych zombie i 28 zwłok. Wydajność 60 FPS wymaga pomiarów na docelowych komputerach; na słabszych wybierz Low / Medium.

Nie ma zapisu meczu na dysku, kont, matchmakingu, ponownego dołączenia do rozpoczętej sesji ani cofania czasu trafień. Świat trwa w pamięci meczu; ustawienia, język, indeks i skiny w localStorage. Dźwięki broni są lokalnie dołączone: [autorzy i licencje](public/audio/CREDITS.md).
