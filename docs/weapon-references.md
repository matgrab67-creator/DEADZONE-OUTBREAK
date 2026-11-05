# Arsenał — referencje i balans

Sprawdzone 3 listopada 2026. Sylwetki, kalibry i pojemności magazynków oparto
na materiałach producentów. Modele 3D są własną geometrią proceduralną, a nie
skopiowanymi plikami z gier. Obrażenia, zasięgi, prędkość obsługi i ceny w punktach
stanowią balans DEADZONE OUTBREAK; nie są pomiarami obrażeń rzeczywistych ani
cenami sklepowymi w walucie. Tempo ręcznie powtarzanych strzałów jest ograniczeniem
gry. Przytrzymanie LPM pozostaje ułatwieniem sterowania także dla pistoletów.

| Broń                    | Cena po odblokowaniu |   Tułów |   Głowa | Magazynek | Tempo w grze |
| ----------------------- | -------------------: | ------: | ------: | --------: | -----------: |
| Glock 17                |                  500 |      28 |    78,4 |        17 |   do 353/min |
| Beretta 92FS            |                  650 |      30 |      84 |        15 |   do 316/min |
| HK MP5                  |                1 900 |      24 |    64,8 |        30 |      800/min |
| FN P90                  |                3 200 |      23 |      69 |        50 |      900/min |
| AK-47 (zastępuje Raven) |                2 600 |      40 |     112 |        30 |      600/min |
| Steyr AUG               |                3 700 |      35 |     105 |        30 |      700/min |
| FN SCAR-H               |                4 400 |      54 |     162 |        20 |      600/min |
| Barrett M82A1           |            **6 000** | **210** | **650** |        10 |    do 71/min |

To bazowe wartości przed pancerzem przeciwnika, spadkiem obrażeń na dystansie,
ulepszeniem ×1,9 i perkiem Deadeye. Za trafienie kończyny naliczane jest 65%
obrażeń tułowia. P90 ma najwęższy stożek rozrzutu podczas biegu wśród PM,
mały przyrost rozrzutu w serii i niski odrzut; skoki nadal pogarszają celność.
Barrett ma największe bazowe obrażenia w tułów i głowę spośród całego arsenału,
kosztem tempa ognia, mobilności, wejścia w celowanie i przeładowania.

W leśnej wersji podstawowe schematy są gotowe od startu, a specjalne znajdują się
w ukrytych skrzyniach zaopatrzenia. Nie wypadają z zombie i nie są sprzedawane osobno.
Zakup samej broni nadal wymaga kredytów. [Aktualne ceny i 10 kolejnych broni](survivor-update.md).
Wewnętrzny identyfikator `raven` pozostaje dla zgodności z zapisanym indeksem
i protokołem sieciowym; nazwa i oznaczenia widoczne w grze to **AK-47**.

## Materiały producentów

- [GLOCK — instrukcja, dane techniczne G17](https://eu.glock.com/-/media/Global/EU/GLOCK-GmbH-2019/ContactandSupport/Download-Area/Instructions-for-use-Relaunch_G17-48_incl-40Gen5-EN_Art-51092-072020.pdf): 9×19mm, standardowy magazynek 17.
- [Beretta — instrukcja serii 92](https://www.beretta.com/content/dam/beretta-usa/user-manuals/90_Series_Manual.pdf): 92FS, magazynek 15, otwarty zamek i zewnętrzny kurek.
- [Heckler & Koch — MP5](https://www.heckler-und-koch.com/en/Products/Military%20and%20Law%20Enforcement/Submachine%20guns/MP5): 9×19mm, magazynek 30, 800/min.
- [FN Herstal — P90](https://fnherstal.com/en/defence/portable-weapons/fn-p90/): 5.7×28mm, magazynek 50, kompaktowy bullpup i niski odrzut.
- [FN Herstal — SCAR-H Mk2](https://fnherstal.com/en/defence/portable-weapons/fn-scar-h-mk2/) i [karta techniczna](https://fnherstal.com/app/uploads/technical-data-fn-scar-h-mk2-2.pdf): 7.62×51mm, magazynek 20, 550–650/min.
- [Steyr Arms — AUG A3](https://www.steyr-arms.com/en/military-law-enforcement/assault-rifles/aug-a3/): bullpup 5.56×45mm, magazynek 30, oliwkowa kolba, pionowy chwyt i celownik optyczny.
- [Barrett — FAQ producenta](https://barrett.net/support/faq/): M82A1, .50 BMG, magazynek 10.

## Dźwięk

Każda z 17 broni ma osobny miks nagrania: korekcję częstotliwości, wysokość,
atak, niskie pasmo, odgłos mechanizmu i czas wybrzmiewania. Trzy warianty
strzału ograniczają powtarzalność serii. Wszystkie pliki są lokalne i dekodowane
raz; przestrzenny odsłuch w co-op zachowuje kierunek i dystans. Kompresor
kontroluje sumę wielu jednoczesnych strzałów. P90 brzmi krótko i ostro,
MP5 bardziej sucho, AK metalicznie, SCAR głębiej, a Barrett ma długi, ciężki huk.
Przeładowanie ma osobne etapy wyjęcia, włożenia magazynka i pracy mechanizmu.

Bazowe nagrania pochodzą z wolnych bibliotek; część jest wspólna dla rodziny
kalibrów i poddana własnemu miksowi. Nie są to autentyczne nagrania każdego
z 17 modeli. Dokładni autorzy, źródła, licencje CC0 / CC BY 3.0 i opis edycji
znajdują się w [public/audio/CREDITS.md](../public/audio/CREDITS.md).
W Field Index przycisk **PLAY SHOT SOUND** pozwala odsłuchać każdą broń.
