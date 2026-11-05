# The Lost Forest — integracja istniejącej gry

Aktualizacja rozwija ten sam projekt, z tą samą symulacją walki i serwerem Socket.IO.

| System                                            | Decyzja                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 27 broni, 3 noże, dźwięki, ADS, odrzut, trafienia | Dotychczasowe mechaniki oraz 10 kolejnych broni.                                                           |
| 1110 wykończeń za punkty fal                      | Po 8 rzadkich, 4 epickie, 2 mityczne i 4 specjalne na model, warianty GOLD, portfel i polskie tłumaczenia. |
| 13 zombie, wyrastanie i śmierć                    | Zachowane; spawn i nawigacja korzystają z nowej geometrii lasu.                                            |
| Solo i co-op 1–4                                  | Ta sama autorytatywna symulacja; seed, rozszerzenia i zmiany świata pochodzą z serwera.                    |
| Rozdział co 15 fal                                | Nowa część wyprawy i klimat lasu; bez usuwania obozu, odkrytych lokacji i wyposażenia.                     |
| Sklep B / schematy                                | Podstawowe od startu, specjalne w leśnych skrzyniach. Część cen zwiększona po zniesieniu płatnych drzwi.   |
| Perki i ulepszenia                                | Istniejące efekty przedstawione jako medycyna, trening i prace rusznikarskie.                              |
| Stare lokacje                                     | Zachowane moduły kompatybilności i testy regresji; rozgrywka korzysta z lasu.                              |

Plan prac: wspólny generator → obóz i streaming → obrona i zasoby → atmosfera i interfejs → testy solo / co-op / broni / skinów.

Las rośnie etapami przy falach 4, 7, 11, 16, następnie co 5 fal. Stały seed i współrzędne chunków określają ich zawartość. Otwarta skrytka i uszkodzona barykada nie odradzają się przez odejście gracza ani zmianę rozdziału. Limit zasięgu świata i pamięci renderera zapobiega nieograniczonemu wzrostowi kosztów.

## Zrealizowana adaptacja

- Chunki 24 m, kolejne obszary 72 / 120 / 168 / 216 / 264 / 312 / 360 / 408 m szerokości. Maksymalnie 289 chunków danych na mecz i 25 załadowanych chunków renderera. Dalsze fale zwiększają trudność, bez nieograniczonego rozrostu mapy.
- Generator tworzy ścieżki, iglaki, skały, trawę, powalone pnie, chaty, biwaki, ruiny, wieże i wraki. Drzewa nie powstają wewnątrz obozu, dróg ani zabudowań. Teren ma wspólną siatkę wysokości renderera i Rapiera.
- Obóz pozostaje w punkcie 0:0. Palisady, cztery naprawialne barykady, schronienie, pojazd, wieże, stoły, magazyn, namiot medyczny, lampy, generator i ognisko zastępują placówkę badawczą.
- Skrytki są wspólne i jednorazowe, łup osobisty. Chaty można odblokować za 3 drewna i 2 złomu; otwarcie jest wspólne. Naprawa barykady kosztuje 2 drewna, przywraca 150 HP. Naprawiona barykada może zostać wzmocniona do 600 HP. Zombie niszczą obronę, co usuwa rzeczywistą kolizję.
- Crafting przy warsztacie: amunicja, przenośne apteczki, Mołotowy, pułapki, pancerz, +25% magazynka, serwis mechanizmu i kalibracja ADS. Ulepszenie za kredyty nadal działa i łączy się z modyfikacjami. Nie wprowadzono losowych zacięć lub zużycia odbierającego sprawność istniejącym broniom.
- Latarka, 8-minutowy cykl dobowy, deszcz, burze, mokre powierzchnie, wiatr, liście, miękkie smugi światła i dźwięki lasu. W nocy zombie poruszają się o 12% szybciej. Strzały wpływają na wybór celu przez hordę; broń tłumiona robi to krócej.
- Częste obiekty korzystają z InstancedMesh, detale obozu są scalone według materiału. Trawa i cienie mają limity dystansu. Szeroka faza kolizji i współdzielone pola nawigacji ograniczają koszt AI. Wyładowane chunki zwalniają geometrie i tekstury tablic.

## Świadomie pozostawione do dalszej rozbudowy

Modele i animacje pozostają autorskie, proceduralne i stylizowane. Smugi światła są efektem przezroczystych warstw, nie pełnym renderowaniem wolumetrycznym. Rzeka jest płytkim elementem otoczenia; nie ma pływania. Nie ma pełnej destrukcji palisady ani fizycznego odrywania desek. Wieże i generator są elementami obozu; naprawialnymi obiektami są cztery barykady. Budowalne pułapki działają bez osobnego rozbudowanego edytora bazy.

Łuk i toporek wymagają osobnych dopracowanych modeli, animacji i balistyki; nie dodano ich jako atrap. Zachowano trzy wcześniejsze noże, a rolę lekkiego karabinu łowieckiego pełni SCOUT-9. Modyfikacja optyki kalibruje istniejący celownik i ADS; nie zastępuje własnych celowników broni. Cel 60 FPS wymaga pomiarów na docelowych komputerach; testy automatyczne sprawdzają działanie i ograniczenia pamięci, nie obiecują wydajności konkretnego GPU.
