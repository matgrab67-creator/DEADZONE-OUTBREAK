# Aktualizacja ocalałych — obecny zakres

Ta wersja łączy leśną przebudowę z wcześniejszym arsenałem, nożami, sklepem, skinami i multiplayerem.

## Zombie z ostatniej referencji

Wspólny, kanciasty model ma szarą porwaną koszulę, kołnierz, ciemne poszarpane spodnie, kanciaste dłonie z palcami, otwarte usta i świecące pomarańczowe oczy. Trzynaście wariantów korzysta z tej samej podstawy, z innymi paletami, skalą i elementami ubrania / pancerza. Modele pozostają animowane podczas ruchu, ataków i wyłaniania.

Model jest autorską rekonstrukcją widoków z obrazka. Dokładna topologia i tekstura oryginału 1:1 wymagałyby pliku źródłowego 3D; obraz referencyjny nie zawiera tych danych.

Śmierć w grze wykorzystuje **Rapier ragdoll**: 11 brył, 10 połączeń, grawitację, impuls trafienia oraz kolizje z terenem i pobliskimi przeszkodami. Głowa, tułów, miednica i kończyny upadają bezwładnie. Kontakt wywołuje odgłos i drobne cząstki. Po ustabilizowaniu fizyka jest zamrażana, ciało zanika po kilku sekundach i wraca do puli. Limit wynosi 28 widocznych ciał; nie powstaje nieograniczona liczba obiektów fizycznych. Ragdoll jest efektem wizualnym klienta i nie zmienia autorytatywnych trafień serwera.

## Dziesięć nowych broni

| Broń                        | Cena w kredytach | Schemat        |
| --------------------------- | ---------------: | -------------- |
| Colt M1911A1                |              800 | Podstawowy     |
| SIG Sauer P226              |              850 | Podstawowy     |
| CZ 75 B                     |              750 | Podstawowy     |
| IWI UZI PRO                 |             1600 | Podstawowy     |
| KRISS Vector SMG            |             3400 | Leśna skrzynia |
| Benelli M4                  |             3300 | Leśna skrzynia |
| Remington 870               |             2000 | Podstawowy     |
| FN FAL                      |             4300 | Leśna skrzynia |
| HK G36C                     |             3300 | Leśna skrzynia |
| Accuracy International AXMC |             5600 | Leśna skrzynia |

Każda ma własny model, parametry, dźwięk, animowane części, profil celności i wpis indeksu. Łącznie jest **27 broni palnych, trzy noże i 1110 płatnych wykończeń**. Barrett nadal kosztuje 6000 i zadaje bazowo 210 obrażeń w ciało / 650 w głowę.

## Poprawki ciał, przerwy, zapasy i ekonomia skinów

- Szyja podąża za fizyczną głową ragdolla; po śmierci nie pozostaje na wysokości stojącego zombie. Usunięto bryły policzków i dodatkowe gruczoły na twarzy plującego wariantu.
- Przerwy po kolejnych falach: 25, 30, 35, 40, 45, 50, 55 sekund, następnie 55; po transferze rozdziału limit pozostaje. Pierwsze przygotowanie nadal trwa 7 sekund.
- B ma filtry pistoletów, PM, karabinów, snajperek i strzelb. Zapasy zawierają latarkę za 600 kredytów i baterie za 200. Pierwsza bateria w cenie, każda daje 120 sekund świecenia, do trzech zapasowych. Automatyczna wymiana, mocniejszy snop z cieniami, licznik w HUD i stan zachowany między rozdziałami. Trening udostępnia latarkę bez zużycia.
- N otwiera płatną kolekcję. Za każdą faktycznie ukończoną falę przetrwania naliczane jest po meczu 25 punktów; śmierć i wyjście do menu rozliczają ten sam identyfikator meczu bez podwójnej wypłaty. Trening nie daje punktów. Punkty skinów są oddzielne od kredytów meczu.
- Każdy z 30 modeli ma 8 rzadkich, 4 epickie, 2 mityczne i 4 specjalne skiny, 18 złotych wersji i samodzielny GOLD. Ceny: 100 rzadki / 250 epicki / 600 mityczny / 800 specjalny / 1000 GOLD. Polskie nazwy i opisy obejmują także nowe serie; Mecha Industries zachowuje nazwę własną. Specjalne materiały to lustrzane srebro (metaliczność 1, szorstkość 0,018), czerwony Crimson Web z czarną siecią, błyszczący Szmaragd i jednolita matowa czerń (metaliczność 0, szorstkość 0,98). Materiały reagują na światło i środowisko podglądu; nie używają udawanych odbić namalowanych na srebrze. Skóra i szkło pozostają wyłączone z malowania. Warianty GOLD wymagają zakupu odpowiedniej podstawy. Podgląd zablokowanych skinów jest dostępny. Oryginał fabryczny jest bezpłatny.
- Portfel, własność, wyposażenie i rozliczenia zapisują się lokalnie w przeglądarce. Gra nadal nie ma kont ani centralnego zapisu postępu.

**15 broni podstawowych ma schemat od startu**. Pozostałych 12 schematów znajduje się wyłącznie w ukrytych skrzyniach w lesie. Schemat ze skrzyni odblokowuje zakup całej drużynie; materiały ze skrzyni otrzymuje zbierający. Same bronie nadal kosztują kredyty. Schematy nie wypadają z zombie i nie można kupić ich za 70% ceny w leśnym trybie gry. Każdy seed ma gwarantowane miejsca z wszystkimi specjalnymi schematami; Barrett pojawia się w głębokim lesie od fali 11.

## Arena treningowa

Przycisk **ARENA TRENINGOWA** w menu otwiera osobny poligon. Trzy ćwiczenia trwają po 60 sekund: precyzja na stałych celach, tracking poruszających się celów i refleks z celami odradzającymi się w innych miejscach. **P** wybiera broń i ćwiczenie, **U** resetuje próbę. HUD pokazuje czas, celność, trafienia w głowę i eliminacje. Wszystkie bronie są dostępne za darmo, z prawdziwym odrzutem i przeładowaniem. Wynik i wyposażenie nie przechodzą do meczu przetrwania.

## Trzy większe systemy

1. **Wyprawy z tablicy przy radiostacji.** E przyjmuje kontrakt: obrona obozu, odzyskanie konkretnej skrzyni albo zniszczenie gniazda strzałami. Cel i postęp są wspólne. Po wykonaniu wróć do tablicy po 450 kredytów i materiały dla każdego członka drużyny.
2. **Wspólna rozbudowa obozu.** E przy ambulatorium, warsztacie lub generatorze kupuje kolejny z trzech poziomów za materiały. Ambulatorium wzmacnia apteczki o 5 HP na poziom, warsztat zmniejsza koszt składników receptur (minimum jeden), generator zasila impulsy obronne przy barykadach i wzmacnia światło ogniska. Poziomy i efekty są synchronizowane przez serwer.
3. **Mapa taktyczna i znaczniki drużyny.** M pokazuje dostępny las, obóz, pobliskie rozpoznane struktury, członków drużyny i cel wyprawy. Kliknięcie stawia wspólny znacznik na 45 sekund. Mapa nie ujawnia wszystkich ukrytych skrzyń. Serwer odrzuca znaczniki poza odblokowanym terenem.

## Nawigacja, finał rozdziału i leczenie

Siatka nawigacji sprawdza teraz przejście między komórkami na całej długości, zamiast oceniać wyłącznie ich środki. Zablokowany przeciwnik po sekundzie szuka krótkiego obejścia w dokładniejszej siatce i wraca na wspólną trasę. Nie przenosi się przez drzewa ani ściany.

Każda 15. fala rozpoczyna się samym BIG BOSSEM, o 35% większym i ze zwiększonym HP. Przywołuje trzy grupy zombie, chroniące go przed wszystkimi obrażeniami. Po wyeliminowaniu obstawy można go ranić. Następne grupy aktywują się przy 65% i 30% HP; nie można ominąć etapu silnym strzałem. Po pokonaniu bossa następuje transfer rozdziału. Minibossy z fal 5 i 10 pozostają.

Latarnia ochronna kosztuje 350 kredytów w B → Zapasy; O ustawia ją na ziemi. Przez 180 sekund odstrasza zwykłe zombie w promieniu 6 m. Bossy ignorują latarnie. Limit: dwie noszone, cztery aktywne w drużynie. Pozycje, czas działania i reakcja AI są autorytatywne; nieudana próba nie zabiera przedmiotu.

Regeneracja w przetrwaniu działa wyłącznie do 5 m od ogniska, z widocznością ogniska, po 5 sekundach bez obrażeń, dokładnie 4 HP/s. HUD pokazuje odliczanie i leczenie. Apteczki H działają także poza obozem; ambulatorium poprawia ich skuteczność.

Obóz ma dodatkowo radiostację, ambulatorium, stolarnię, magazyn, osłonę generatora i zbiorniki wody. Zabudowania mają wspólne wizualne i fizyczne położenie. Pola nawigacji uwzględniają nowe przeszkody, a wybór kierunku sprawdza przejście obok narożników i drzew.

## Język i atmosfera

**Ustawienia → Język / Language → Polski / English** zmieniają interfejs i tablice w świecie bez rozpoczynania nowego meczu. Wybór zapisuje się w przeglądarce. Nazwy własne broni, skinów i rozdziałów pozostają nazwami własnymi.

Przyciemniono światło i mgłę, zachowując czytelność obozu, ogniska oraz latarki L. Las nadal ma pogodę i cykl dnia / nocy, rozbudowuje się falami i zachowuje stan między rozdziałami.

## Źródła referencji broni

Geometria jest autorska, a obrażenia i ceny stanowią balans gry. Dane i sylwetki porównano z materiałami producentów:

- [Colt M1911A1](https://www.colt.com/wp-content/uploads/2023/02/wwiireproductionpistolmodelm1911a1.pdf)
- [SIG Sauer P226](https://www.sigsauer.com/shop/p226-grip-items)
- [CZ — katalog](https://katalogy.czub.cz/cz-katalog-2023-en/files/assets/common/downloads/publication.pdf)
- [IWI UZI PRO](https://iwi.net/uzi-submachine-gun/uzi-pro/)
- [KRISS Vector SMG](https://store.kriss-usa.com/download/KRISS_VECTOR_G2/2022_KV_G2_SMG_DS.pdf)
- [Benelli M4](https://www.benelliusa.com/resources/benelli-unleashes-the-m4-ext-more-firepower-more-versatility-more-m4)
- [Remington 870](https://www.remarms.com/firearm-history/model-870-history)
- [FN — FAL w służbie](https://fnherstal.com/en/news/fn-herstal-will-attend-defence-services-asia-exhibition-in-malaysia/)
- [HK G36](https://www.heckler-koch.com/en/Products/Military%20and%20Law%20Enforcement/Assault%20rifles/G36)

Parametry gry i pełny zestaw danych dla AXMC są jawne w `shared/SurvivorArsenal.js`; nie stanowią deklaracji rzeczywistych obrażeń.
