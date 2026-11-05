# Zombie, spawny i rozdziały

W indeksie jest teraz 13 typów przeciwników. Siedem nowych modeli ma własne
elementy sylwetki i animacje zdolności, oprócz chodu, ataku, trafień i śmierci.

| Typ            | Pierwsza fala łącznie | Bazowe HP | Zachowanie                                                                                                               |
| -------------- | --------------------: | --------: | ------------------------------------------------------------------------------------------------------------------------ |
| Acid Spitter   |                     5 |       120 | Zapowiada strzał kwasem. Pocisk leci w wybranym kierunku, można go ominąć; trafienie zostawia kałużę na 4 sekundy.       |
| Leaper         |                     6 |       100 | Przysiada przez 0,45 s, potem skacze po łuku. Po wybiciu nie koryguje kierunku do gracza.                                |
| Brute          |                     7 |       420 | Duże pięści, powolny chód i zapowiadane uderzenie w ziemię. Można wyjść poza zasięg.                                     |
| Screamer       |                     8 |       130 | Ładuje krzyk przez 1,1 s, po czym przyspiesza pobliskich zombie na 4 sekundy. Zabicie przerywa ładowanie.                |
| Shadow Stalker |                     9 |        95 | Kaptur i wydłużone pazury; zachodzi z boku i krótko przyspiesza podczas zbliżania.                                       |
| Plague Carrier |                    10 |       260 | Rozdęty kombinezon i maska. Po śmierci zostawia toksyczną chmurę na 5 sekund.                                            |
| Boneguard      |                    12 |       320 | Kostne płyty zmniejszają obrażenia w ciało do 55%. Poniżej 40% HP płyty odpadają i ochrona znika; głowa jest odsłonięta. |

HP rośnie wraz z łącznym numerem fali. Nowy typ jest przedstawiany w swojej
pierwszej fali, a następnie trafia do losowanej mieszanki hordy. W kolejnych
rozdziałach nowe typy pojawiają się częściej. Pociski, obrażenia, osłanianie
przez ściany, chmury i wzmocnienia oblicza wspólna symulacja solo / serwera.

## Pojawianie się i śmierć

Każdy mecz ma osobne ziarno losowania. W lesie dyrektor wybiera punkty 18–33 m
od gracza, poza obozem i minimum 14 m od każdego ocalałego. Sprawdza kolizje,
drogę do gracza, odstęp od hordy i ostatnich spawnów. Odrzuca miejsca w widocznym,
niezasłoniętym stożku patrzenia wszystkich graczy. Gdy brak miejsca, ponawia próbę.
Nie odradza zombie wewnątrz drzewa ani tuż przed kamerą.

Zombie wychodzi z ziemi przez około 1,15–2,1 s, zależnie od typu. Najpierw
wyciąga ręce, potem podnosi ciało. Towarzyszą temu gruz, ciemna szczelina,
cząstki ziemi i odgłos. W tym czasie nie porusza się po mapie ani nie atakuje.
Strefy trafień podążają za ciałem; zakopany zombie nie ma niewidzialnej głowy
na wysokości normalnego przeciwnika. Leaper ma też strefy trafień na wysokości
swojego skoku.

Śmierć w aktualnej grze wykorzystuje ragdoll Rapier: 11 brył połączonych stawami,
impuls trafienia, grawitację i zderzenia z podłożem oraz pobliskimi przeszkodami.
Ciało i kończyny spadają bezwładnie, a uderzenie wywołuje cząstki i odgłos.
Fizyka jest zamrażana po ustabilizowaniu, zwłoki zanikają pod koniec
siedmiosekundowego cyklu i wracają do ograniczonej puli. Dawna animacja
proceduralna pozostaje pomocnikiem testów; w rozgrywce działa fizyka ragdoll.

## Rozdziały co 15 ukończonych fal

- **I — THE LOST FOREST**, fale 1–15.
- **II — WHISPERING PINES**, fale 16–30.
- **III — THE HOLLOW WOODS**, fale 31–45.

Przejście następuje po pokonaniu całej 15. fali, w tym bossa. Pięciosekundowy
ekran rozpoczyna nowy rozdział wyprawy; potem jest 10 sekund przygotowania.
Obóz, pozycja, seed, otwarte chaty i zabrane skrytki pozostają na swoim miejscu.
Las odblokowuje dalsze pierścienie. Podczas ekranu ruch i walka są wstrzymane.
HUD pokazuje rozdział i falę 1–15; trudność wynika z łącznej liczby fal.
Po 45. fali nazwy rozdziałów powtarzają się, a trudność dalej rośnie.

Zachowywane są bronie, ulepszenia, schematy, perki, punkty i statystyki.
Transfer daje 500 punktów dodatkowo do 100 za ukończenie fali, przywraca zdrowie,
co najmniej 50 pancerza oraz amunicję. Powaleni i wyeliminowani członkowie
drużyny wracają. Barykady, dzienniki, materiały, wyposażenie i skiny są zachowane.
Stojaki broni nadal odblokowują schematy bezpłatnie pod E, a sklep działa pod B.

W co-op rozdział, pozycje, czasy wyłaniania oraz zagrożenia są przekazywane
w snapshotach. Ten sam generator aktualizuje lokalne kolizje przewidywania ruchu,
zachowując geometrię istniejącego lasu.

## Sprawdzenie

`npm.cmd test` obejmuje rozdziały, różnorodność spawnów, zdolności, hitboxy,
modele, ponowne użycie modeli i synchronizację dwóch klientów Socket.IO.
`npm.cmd run test:outbreak` sprawdza wpisy indeksu, wyłanianie, upadek,
ekwipunek i sterowanie po przejściu. `npm.cmd run test:forest` sprawdza
rozbudowę lasu, warsztat, zachowanie obozu i limity streamingu.
