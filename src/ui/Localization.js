import { SKIN_TRANSLATIONS } from '../../shared/Skins.js';
// Text catalog shared by DOM UI and the hand-painted signs in the 3D world.
const pairs = [
  ...SKIN_TRANSLATIONS,
  ['SKINY / ARSENAŁ', 'SKINS / ARMORY'],
  ['ARSENAŁ', 'ARMORY'],
  ['WYKOŃCZEŃ', 'FINISHES'],
  ['PISTOLET TAKTYCZNY', 'TACTICAL PISTOL'],
  ['CIĘŻKI PISTOLET', 'HEAVY PISTOL'],
  ['PISTOLET AUTOMATYCZNY', 'MACHINE PISTOL'],
  ['KARABINEK SZTURMOWY', 'ASSAULT RIFLE'],
  ['KARABIN Z TŁUMIKIEM', 'SUPPRESSED RIFLE'],
  ['PISTOLET MASZYNOWY', 'SUBMACHINE GUN'],
  ['STRZELBA POWTARZALNA', 'PUMP SHOTGUN'],
  ['KARABIN PRECYZYJNY', 'PRECISION RIFLE'],
  ['LEKKI KARABIN PRECYZYJNY', 'LIGHT PRECISION RIFLE'],
  ['WYTŁUMIONY KARABIN PRECYZYJNY', 'SUPPRESSED PRECISION RIFLE'],
  ['PISTOLET SŁUŻBOWY', 'SERVICE PISTOL'],
  ['BROŃ OBRONY OSOBISTEJ', 'PERSONAL DEFENCE WEAPON'],
  ['KARABIN BOJOWY', 'BATTLE RIFLE'],
  ['KARABINEK SZTURMOWY BULLPUP', 'BULLPUP ASSAULT RIFLE'],
  ['WIELKOKALIBROWY KARABIN WYBOROWY', 'ANTI-MATERIEL RIFLE'],
  ['STRZELBA PÓŁAUTOMATYCZNA', 'SEMI-AUTO SHOTGUN'],
  ['KARABIN WYBOROWY ZAMKOWY', 'BOLT-ACTION SNIPER'],
  ['SPECJALNY', 'SPECIAL'],
  ['SPECJALNE', 'SPECIAL FINISHES'],
  [
    '8 rzadkich · 4 epickie · 2 mityczne · 4 specjalne + GOLD',
    '8 rare · 4 epic · 2 mythic · 4 special + GOLD',
  ],
  ['Wykończenia za punkty fal', 'Finishes for wave points'],
  [
    'Zablokowany skin można obejrzeć. Zakup za punkty po meczu.',
    'Preview locked finishes. Buy them with points earned after matches.',
  ],
  [
    'Leczenie: do 5 m od ogniska, po 5 sekundach bez obrażeń, 4 HP/s. H używa apteczki także w lesie. B / Zapasy: latarka i baterie oraz latarnia ochronna. O stawia latarnię na 180 sekund; zwykłe zombie boją się jej w promieniu 6 m. W ostatniej fali pokonaj obstawę BIG BOSSA, aby zdjąć jego tarczę. N: skiny za 25 punktów od ukończonej fali, wypłata po meczu.',
    'Healing: within 5 m of the campfire, after 5 seconds without damage, 4 HP/s. H uses a medkit anywhere. B / Supplies: flashlight, batteries and protective lantern. O places a lantern for 180 seconds, repelling ordinary zombies within 6 m. In the final wave, defeat the BIG BOSS guards to remove its shield. N: skins cost points earned at 25 per cleared wave, awarded after the match.',
  ],
  ['LATARNIA OCHRONNA', 'PROTECTIVE LANTERN'],
  ['LATARNIE', 'LANTERNS'],
  ['Postaw latarnię ochronną', 'Place a protective lantern'],
  ['ZAPAS LATARNI PEŁNY', 'LANTERNS FULL'],
  [
    'Za blisko innej latarni lub limit 4 aktywnych latarni.',
    'Too close to another lantern, or all 4 team lanterns are already active.',
  ],
  [
    'O — postaw przed sobą. Odstrasza zwykłe zombie w promieniu 6 m przez 180 sekund. Boss nie boi się światła. Maks. 2 w plecaku / 4 aktywne w drużynie.',
    'O — place in front of you. Repels ordinary zombies within 6 m for 180 seconds. Bosses ignore its light. Carry 2 / team limit 4 active lanterns.',
  ],
  ['BIG BOSS / WŁADCA LASU', 'BIG BOSS / FOREST OVERLORD'],
  [
    'Pokonaj przywołaną obstawę, aby zranić bossa. Trzy etapy walki.',
    'Defeat the summoned guards to hurt the boss. Three stages.',
  ],
  ['Boss chroniony — pokonaj przywołaną obstawę!', 'Boss shielded — defeat the summoned guards!'],
  ['BOSS PRZYWOŁUJE OBSTAWĘ', 'BOSS SUMMONING GUARDS'],
  ['BOSS ODSŁONIĘTY', 'BOSS EXPOSED'],
  ['Obstawa pokonana — teraz atakuj bossa!', 'Guards defeated — attack the boss now!'],
  ['najpierw pokonaj przywołane zombie.', 'defeat the summoned zombies first.'],
  ['Etap', 'Stage'],
  ['ETAP', 'STAGE'],
  ['TARCZA', 'SHIELD'],
  ['OBSTAWA', 'GUARDS'],
  ['ODSŁONIĘTY', 'EXPOSED'],
  ['OGNISKO', 'CAMPFIRE'],
  ['LECZENIE ZA', 'HEALING IN'],
  ['Apteczki leczą o 5 HP więcej na każdy poziom.', 'Medkits restore 5 more HP per upgrade level.'],
  ['PISTOLETY', 'PISTOLS'],
  ['PM', 'SMGS'],
  ['KARABINY', 'RIFLES'],
  ['SNAJPERKI', 'SNIPER RIFLES'],
  ['STRZELBY', 'SHOTGUNS'],
  ['Rodzaj broni', 'Weapon category'],
  ['LATARKA TAKTYCZNA', 'TACTICAL FLASHLIGHT'],
  ['BATERIA DO LATARKI', 'FLASHLIGHT BATTERY'],
  [
    'Mocny snop światła / L. Zawiera baterię na 120 sekund świecenia. Pozostaje po zmianie rozdziału.',
    'Strong light beam / L. Includes a battery for 120 seconds of use. Kept across chapters.',
  ],
  [
    'Zapas na 120 sekund. Automatyczna wymiana po rozładowaniu. Maksymalnie 3 zapasowe baterie.',
    '120 seconds of spare power. Automatically replaced when empty. Carry up to 3 spare batteries.',
  ],
  ['LATARKA ODBLOKOWANA', 'FLASHLIGHT OWNED'],
  ['NAJPIERW KUP LATARKĘ', 'BUY A FLASHLIGHT FIRST'],
  ['ZAPAS BATERII PEŁNY', 'BATTERIES FULL'],
  ['Odblokuj latarkę w magazynie: B / ZAPASY.', 'Unlock a flashlight in storage: B / SUPPLIES.'],
  [
    'Brak baterii. Kup zapas w magazynie: B / ZAPASY.',
    'No battery power. Buy a spare in storage: B / SUPPLIES.',
  ],
  [
    'Latarka rozładowana. Kup baterie: B / ZAPASY.',
    'Flashlight empty. Buy batteries: B / SUPPLIES.',
  ],
  ['DO KUPIENIA: B / ZAPASY', 'BUY: B / SUPPLIES'],
  ['BATERIE', 'BATTERIES'],
  ['Uzupełnij zapasy. Następna fala za', 'Resupply. Next wave in'],
  ['sekund.', 'seconds.'],
  ['WYBIERZ SKIN', 'CHOOSE A SKIN'],
  ['TWOJE SKINY', 'YOUR SKINS'],
  ['LEGENDARNE / GOLD', 'LEGENDARY / GOLD'],
  ['LEGENDARNY', 'LEGENDARY'],
  ['POSIADANY', 'OWNED'],
  ['WYPOSAŻ', 'EQUIP'],
  ['KUP I WYPOSAŻ', 'BUY & EQUIP'],
  ['NAJPIERW KUP BAZOWY SKIN', 'BUY THE BASE FINISH FIRST'],
  ['ZA MAŁO PUNKTÓW', 'NOT ENOUGH SKIN POINTS'],
  ['NIEDOSTĘPNY', 'UNAVAILABLE'],
  ['Wymagany bazowy skin:', 'Required base finish:'],
  [
    '25 PTS za ukończoną falę. Rozliczenie po grze. GOLD: 1000 PTS za wariant.',
    '25 PTS per cleared wave, awarded after the match. GOLD: 1000 PTS per variant.',
  ],
  ['UKOŃCZONE FALE', 'CLEARED WAVES'],
  ['PTS NA SKINY', 'SKIN PTS'],
  ['PORTFEL', 'WALLET'],
  ['25 PTS ZA UKOŃCZONĄ FALĘ', '25 PTS PER CLEARED WAVE'],
  [
    'Legendarne złocenie z polerowanymi krawędziami i grawerem tego modelu. GOLD kosztuje 1000 punktów; wariant wymaga bazowego skina.',
    'Legendary gold plating with polished edges and model-specific engraving. GOLD costs 1000 points; variants require their base finish.',
  ],
  ['Dedykowany wzór:', 'Exclusive design:'],
  ['USTAWIENIA', 'SETTINGS'],
  ['JĘZYK', 'LANGUAGE'],
  ['Polski', 'Polish'],
  ['Angielski', 'English'],
  ['ZASTOSUJ I WRÓĆ', 'APPLY & RETURN'],
  ['GRAJ SOLO', 'DEPLOY SOLO'],
  ['Jeden ocalały. Bez wsparcia.', 'One operator. No backup.'],
  ['GRA WSPÓLNA', 'CO-OP OPERATIONS'],
  ['Drużyna do czterech ocalałych.', 'Assemble a squad of up to four.'],
  ['INDEKS POLOWY', 'FIELD INDEX'],
  ['DZIENNIK OCALAŁYCH', 'SURVIVOR JOURNAL'],
  ['PORADNIK', 'FIELD MANUAL'],
  ['WRÓĆ DO MENU', 'RETURN TO MAIN MENU'],
  ['← WRÓĆ DO MENU', '← RETURN TO OPERATIONS'],
  ['← WSZYSTKIE WPISY', '← ALL PROFILES'],
  ['BROŃ', 'WEAPONS'],
  ['ZAPASY', 'SUPPLIES'],
  ['UMIEJĘTNOŚCI', 'PERKS'],
  ['ULEPSZENIA', 'UPGRADES'],
  ['MAGAZYN OBOZOWY', 'CAMP STORAGE'],
  ['OBÓZ 07 / MAGAZYN OCALAŁYCH', 'CAMP 07 / SURVIVOR SUPPLIES'],
  ['WZNÓW GRĘ', 'RESUME OPERATION'],
  ['CHWILA ODDECHU.', 'TAKE A BREATH.'],
  ['POWRÓT DO MENU', 'ABORT TO MAIN MENU'],
  ['POWALENIE.', 'OVERRUN.'],
  ['GRAJ PONOWNIE', 'DEPLOY AGAIN'],
  ['JAKOŚĆ GRAFIKI', 'GRAPHICS QUALITY'],
  ['Niska', 'Low'],
  ['Średnia', 'Medium'],
  ['Wysoka', 'High'],
  ['Ultra', 'Ultra'],
  ['CZUŁOŚĆ MYSZY', 'MOUSE SENSITIVITY'],
  ['POLE WIDZENIA', 'FIELD OF VIEW'],
  ['FOV MODELU BRONI', 'VIEWMODEL FOV'],
  ['GŁOŚNOŚĆ', 'MASTER VOLUME'],
  ['KOŁYSANIE GŁOWY', 'HEAD BOB'],
  ['DYNAMICZNA ROZDZIELCZOŚĆ', 'DYNAMIC RESOLUTION'],
  ['MODEL NOŻA', 'KNIFE MODEL'],
  ['PRYWATNA DRUŻYNA', 'CREATE PRIVATE LOBBY'],
  ['DOŁĄCZ', 'JOIN'],
  ['GOTOWOŚĆ', 'READY UP'],
  ['ANULUJ GOTOWOŚĆ', 'CANCEL READY'],
  ['ROZPOCZNIJ MISJĘ', 'DEPLOY SQUAD'],
  ['KOD POKOJU', 'ROOM CODE'],
  ['PSEUDONIM', 'CALLSIGN'],
  ['KOPIUJ', 'COPY'],
  ['SKOPIOWANO', 'COPIED'],
  ['OCZEKIWANIE NA OCALAŁEGO', 'AWAITING OPERATOR'],
  ['GOTOWY', '● READY'],
  ['NIEGOTOWY', 'NOT READY'],
  ['ARENA TRENINGOWA', 'TRAINING ARENA'],
  [
    'Precyzja · tracking · refleks / pełny arsenał',
    'Precision · tracking · reaction / full arsenal',
  ],
  ['POLIGON OCALAŁYCH / BEZPIECZNA ARENA', 'SURVIVOR RANGE / SAFE PRACTICE'],
  ['TRENUJ.', 'PRACTICE.'],
  ['PRZETRWAJ DŁUŻEJ.', 'SURVIVE LONGER.'],
  ['ĆWICZENIE', 'DRILL'],
  ['PRECYZJA', 'PRECISION'],
  ['REFLEKS', 'REACTION'],
  ['ROZPOCZNIJ / ZRESETUJ WYNIK', 'START / RESET SCORE'],
  ['PRECYZJA / STAŁE CELE', 'PRECISION / STATIC TARGETS'],
  ['TRACKING / CELE W RUCHU', 'TRACKING / MOVING TARGETS'],
  ['REFLEKS / ZMIANA CELU', 'REACTION / SWITCH TARGETS'],
  [
    '60 sekund, prawdziwy odrzut, przeładowanie i obrażenia. Wszystkie bronie dostępne bez opłat. Wynik i wyposażenie treningowe nie przechodzą do meczu.',
    '60 seconds with real recoil, reloads and damage. Every firearm is free to practice. Training scores and equipment stay separate from survival.',
  ],
  [
    'Trzy stałe cele. Ćwicz krótkie serie, ADS i headshoty.',
    'Three static targets. Practice bursts, ADS and headshots.',
  ],
  [
    'Cele poruszają się na boki. Prowadź celownik za głową.',
    'Targets strafe sideways. Keep your crosshair on the head.',
  ],
  [
    'Jeden cel odradza się w nowym miejscu po eliminacji. Ćwicz szybkie przenoszenie celownika.',
    'One target respawns at a new position after each kill. Practice fast target switching.',
  ],
  ['MAPA TAKTYCZNA', 'TACTICAL MAP'],
  ['OBÓZ 07 / ROZPOZNANIE TERENU', 'CAMP 07 / FIELD RECON'],
  [
    'Kliknij, aby postawić wspólny znacznik na 45 sekund. M lub Esc zamyka mapę. Skrytki pozostają ukryte do odnalezienia.',
    'Click to place a shared marker for 45 seconds. M or Esc closes the map. Supply caches remain hidden until found.',
  ],
  [
    'Jasny punkt — ty · zielone — drużyna · złote — znaczniki · czerwone — cel wyprawy.',
    'White — you · green — teammates · gold — markers · red — expedition objective.',
  ],
  ['KOLEKCJA WYKOŃCZEŃ', 'FINISH COLLECTION'],
  ['WSZYSTKIE ZA DARMO', 'ALL FREE'],
  ['BROŃ / NÓŻ', 'FIREARM / KNIFE'],
  ['WSZYSTKIE', 'ALL'],
  ['MITYCZNE', 'MYTHIC'],
  ['EPICKIE', 'EPIC'],
  ['RZADKIE', 'RARE'],
  ['MITYCZNY', 'MYTHIC'],
  ['EPICKI', 'EPIC'],
  ['RZADKI', 'RARE'],
  ['ORYGINAŁ', 'ORIGINAL'],
  ['DARMOWY', 'FREE'],
  ['WYPOSAŻONY', 'EQUIPPED'],
  ['WYPOSAŻ ZA DARMO', 'EQUIP FOR FREE'],
  ['WYBIERZ DARMOWY SKIN', 'CHOOSE A FREE SKIN'],
  ['Ⅱ OBRÓT', 'Ⅱ ROTATION'],
  ['▶ OBRÓT', '▶ ROTATION'],
  [
    'Wybór zapisuje się osobno dla każdej broni.',
    'Your selection is saved separately for each weapon.',
  ],
  [
    'Wyposażono. Wykończenie zapisane dla tej broni.',
    'Equipped. The finish is saved for this weapon.',
  ],
  [
    '7 skinów na tę broń · 1 mityczny · 2 epickie · 4 rzadkie',
    '7 finishes per weapon · 1 mythic · 2 epic · 4 rare',
  ],
  ['MAGAZYN', 'STORAGE'],
  ['WARSZTAT', 'WORKSHOP'],
  ['STÓŁ RUSZNIKARSKI', 'GUNSMITH BENCH'],
  ['WARSZTAT / CRAFTING', 'WORKBENCH / CRAFTING'],
  ['ZAPASY AMUNICJI', 'AMMUNITION SUPPLY'],
  ['OSŁONY BALISTYCZNE', 'BALLISTIC PLATES'],
  ['PORZUCONA SKRZYNIA', 'ABANDONED SUPPLY CRATE'],
  ['ZAPASOWE DESKI', 'SPARE PLANKS'],
  ['UKRYTE ZAPASY', 'HIDDEN SUPPLIES'],
  ['SCHEMAT W SKRZYNI', 'BLUEPRINT IN CACHE'],
  ['UKRYTE SKRZYNIE W LESIE / OD FALI 4', 'HIDDEN FOREST CACHES / FROM WAVE 4'],
  ['GŁĘBOKI LAS / OD FALI 11', 'DEEP FOREST / FROM WAVE 11'],
  ['ZAMKNIĘTA CHATA / USUŃ BARYKADĘ', 'LOCKED CABIN / REMOVE BARRICADE'],
  ['OBÓZ OCALAŁYCH / WARSZTAT POLOWY', 'SURVIVOR CAMP / FIELD WORKSHOP'],
  ['ZRÓB UŻYTEK', 'MAKE USE'],
  ['Z TEGO, CO ZOSTAŁO.', 'OF WHAT REMAINS.'],
  ['AMUNICJA', 'AMMUNITION'],
  ['APTECZKA', 'MEDKIT'],
  ['KOKTAJL MOŁOTOWA', 'MOLOTOV COCKTAIL'],
  ['PUŁAPKA KŁUSOWNICZA', 'IMPROVISED TRAP'],
  ['NAPRAWA OSŁON', 'REPAIR ARMOR'],
  ['WIĘKSZY MAGAZYNEK', 'EXTENDED MAGAZINE'],
  ['SERWIS MECHANIZMU', 'MECHANISM SERVICE'],
  ['KALIBRACJA CELOWNIKA', 'SIGHT CALIBRATION'],
  ['WYPOSAŻENIE', 'EQUIPMENT'],
  ['RUSZNIKARSTWO', 'GUNSMITHING'],
  ['WYTWÓRZ', 'CRAFT'],
  ['Podejdź do warsztatu w obozie.', 'Approach the camp workbench.'],
  ['Modyfikacja już zamontowana.', 'Modification already installed.'],
  ['Pełny zapas.', 'Reserve is full.'],
  ['Pancerz jest pełny.', 'Armor is full.'],
  ['Limit wyposażenia: 3.', 'Equipment limit: 3.'],
  ['Brakuje materiałów.', 'Not enough materials.'],
  ['Uzupełnia zapas aktualnej broni.', 'Refills your current weapon reserve.'],
  ['H — leczenie 65 HP. Możesz nosić 3.', 'H — heals 65 HP. Carry up to 3.'],
  [
    'J — rzut. Ogień rani zombie przez 7 sekund.',
    'J — throw. Fire damages infected for 7 seconds.',
  ],
  [
    'T — ustaw przed sobą. Zatrzymuje i rani zombie.',
    'T — place in front of you. Stops and damages infected.',
  ],
  ['Przywraca 100 punktów pancerza.', 'Restores armor to 100.'],
  [
    '+25% pojemności obecnej broni. Działa razem z ulepszeniem.',
    '+25% current magazine capacity. Stacks with weapon enhancement.',
  ],
  ['10% szybsze przeładowanie i 12% mniejszy rozrzut.', '10% faster reload and 12% less spread.'],
  [
    'Dokładniejsze ADS i dodatkowe przybliżenie. Zachowuje fabryczną optykę.',
    'More accurate ADS and extra zoom. Retains the original optics.',
  ],
  ['TABLICA WYPRAW', 'EXPEDITION BOARD'],
  ['OBROŃ OBÓZ', 'DEFEND THE CAMP'],
  ['ODZYSKAJ ZAPASY', 'RECOVER SUPPLIES'],
  ['ZNISZCZ GNIAZDO', 'DESTROY THE NEST'],
  ['WRÓĆ DO TABLICY', 'RETURN TO THE BOARD'],
  ['ROZBUDUJ AMBULATORIUM', 'UPGRADE THE CLINIC'],
  ['ROZBUDUJ WARSZTAT', 'UPGRADE THE WORKSHOP'],
  ['ULEPSZ GENERATOR', 'UPGRADE THE GENERATOR'],
  ['ROZBUDOWANO DLA DRUŻYNY', 'UPGRADED FOR THE TEAM'],
  ['Brakuje materiałów na rozbudowę obozu.', 'Not enough materials to upgrade the camp.'],
  ['NAMIOT MEDYCZNY', 'MEDICAL TENT'],
  ['TRENING PRZEŁADOWANIA', 'RELOAD TRAINING'],
  ['TRENING TERENOWY', 'FIELD TRAINING'],
  ['TRENING STRZELECKI', 'MARKSMANSHIP TRAINING'],
  ['MODYFIKACJA SPUSTU', 'TRIGGER MODIFICATION'],
  ['Las pochłonął ostatnie drogi.', 'The forest has reclaimed the roads.'],
  ['Utrzymaj obóz. Odkryj, co zostało.', 'Hold the camp. Discover what remains.'],
  ['Obóz ocalałych w porzuconym lesie', 'A survivor camp in an abandoned forest'],
  ['UTRZYMAJ OSTATNIE SCHRONIENIE', 'DEFEND THE LAST REFUGE'],
  ['OGNISKO NADAL PŁONIE', 'THE CAMPFIRE STILL BURNS'],
  ['DANE ZAPISANE', 'PROFILE RECORDED'],
  ['NIEZNANY', 'UNKNOWN'],
  ['NIEODKRYTE', 'CLASSIFIED'],
  ['ZOBACZ MODEL 3D →', 'VIEW 3D PROFILE →'],
  ['▶ ODTWÓRZ STRZAŁ', '▶ PLAY SHOT SOUND'],
  ['STAN DRUŻYNY', 'SQUAD STATUS'],
  ['TRAFIENIE W GŁOWĘ', 'HEADSHOT'],
  ['ZABÓJSTWO', 'ELIMINATION'],
  ['BRAK KREDYTÓW', 'NOT ENOUGH POINTS'],
  ['WYPOSAŻ', 'EQUIP'],
  ['AMUNICJA PEŁNA', 'AMMO FULL'],
  ['PANCERZ PEŁNY', 'SHIELD FULL'],
  ['ZDROWIE PEŁNE', 'HEALTH FULL'],
  ['GRANATY PEŁNE', 'GRENADES FULL'],
  ['AKTYWNE', 'ACTIVE'],
  ['ULEPSZONO', 'ENHANCED'],
  ['Klawisze i mysz są wymagane do gry.', 'A keyboard and mouse are required for deployment.'],
  ['OBÓZ 07', 'CAMP 07'],
  ['MAPA', 'MAP'],
  ['WODA', 'WATER'],
  ['AMBULATORIUM', 'CLINIC'],
  ['POLIGON', 'TRAINING RANGE'],
  ['POLIGON OCALAŁYCH', 'SURVIVOR RANGE'],
];
const extraPairs = [
  ['THE LOST FOREST / DZIENNIK OCALAŁYCH', 'THE LOST FOREST / SURVIVOR JOURNAL'],
  ['OBÓZ OCALAŁYCH', 'SURVIVOR CAMP'],
  ['OSTATNI SYGNAŁ / OBÓZ 07', 'LAST SIGNAL / CAMP 07'],
  ['STREFA ZAKAŻENIA / DZIKI LAS', 'INFECTED ZONE / WILDERNESS'],
  ['NOWE SZLAKI / NOWE ZAPASY', 'NEW TRAILS / NEW SUPPLIES'],
  ['GŁĘBOKI LAS', 'DEEP FOREST'],
  ['WSPÓLNY OBÓZ', 'SHARED CAMP'],
  ['OCALAŁYCH', 'SURVIVORS'],
  ['ŻYWE ZAGROŻENIA', 'HOSTILE BIOLOGY'],
  ['ZAREJESTROWANE ZAGROŻENIA', 'ENCOUNTERED THREATS'],
  ['REJESTR BRONI', 'WEAPON REGISTRY'],
  ['ODZYSKANE BRONIE', 'RECOVERED WEAPONS'],
  ['BROŃ BIAŁA', 'FIELD BLADES'],
  ['WYPOSAŻENIE OCALAŁYCH', 'OPERATOR EQUIPMENT'],
  ['PROFIL ZAGROŻENIA', 'THREAT PROFILE'],
  ['OBRAŻENIA W CIAŁO', 'BODY DAMAGE'],
  ['OBRAŻENIA W GŁOWĘ', 'HEAD DAMAGE'],
  ['CENA', 'PRICE'],
  ['KALIBER', 'CALIBRE'],
  ['MAGAZYNEK', 'MAGAZINE'],
  ['ZAPAS', 'RESERVE'],
  ['SZYBKOSTRZELNOŚĆ', 'FIRE RATE'],
  ['ZASIĘG SKUTECZNY', 'EFFECTIVE RANGE'],
  ['BAZOWE ZDROWIE', 'BASE HEALTH'],
  ['PRĘDKOŚĆ RUCHU', 'MOVEMENT SPEED'],
  ['OBRAŻENIA WRĘCZ', 'MELEE DAMAGE'],
  ['WYSOKOŚĆ', 'HEIGHT'],
  ['SŁABY PUNKT', 'WEAK POINT'],
  ['GŁOWA', 'HEAD'],
  ['MODEL 3D / OBRÓT AUTOMATYCZNY', '3D PROFILE / AUTOMATIC ROTATION'],
  ['PRZETRWAJ ZAKAŻENIE', 'SURVIVE THE OUTBREAK'],
  ['POZIOM ZAGROŻENIA', 'THREAT LEVEL'],
  ['CEL', 'OBJECTIVE'],
  ['KRYTYCZNY', 'CRITICAL'],
  ['AKTYWNA WYPRAWA', 'ACTIVE OPERATION'],
  ['ZAPISANY PROFIL', 'PROFILE RECORDED'],
  ['PODGLĄD / ZDOBĄDŹ TĘ BROŃ, ABY JĄ ZAPISAĆ', 'PREVIEW / ACQUIRE THIS WEAPON TO RECORD IT'],
  [
    'PODGLĄD / SPOTKAJ TO ZAGROŻENIE, ABY JE ZAPISAĆ',
    'PREVIEW / ENCOUNTER THIS THREAT TO RECORD IT',
  ],
  ['ZAPASY OCALAŁYCH', 'SURVIVOR SUPPLIES'],
  ['SCHRONIENIE OCALAŁYCH', 'SURVIVOR SHELTER'],
  ['OBOZ OCALALYCH', 'SURVIVOR CAMP'],
  ['POLIGON / OBOZ 07', 'TRAINING RANGE / CAMP 07'],
  ['TRENING UMIEJETNOSCI', 'SKILL PRACTICE'],
  ['PRECYZJA / TRACKING / REFLEKS', 'PRECISION / TRACKING / REACTION'],
  ['P / WYBIERZ BRON I CWICZENIE', 'P / CHOOSE WEAPON AND DRILL'],
  ['20 METROW', '20 METRES'],
  ['PRZELADOWUJ / KONTROLUJ ODRZUT', 'RELOAD / CONTROL RECOIL'],
  ['SOLO / PAUZA', 'SOLO / OPERATION PAUSED'],
  ['CO-OP / MECZ TRWA — UWAŻAJ', 'CO-OP / MATCH CONTINUES — STAY ALERT'],
  ['OPERACJA WSTRZYMANA', 'OPERATION SUSPENDED'],
  ['PRZYGOTOWANIE OCALAŁYCH', 'OPERATOR PREFERENCES'],
  ['WYJDŹ / UTRATA SYGNAŁU', 'SIGNAL LOST / OPERATION FAILED'],
  ['CZAS PRZETRWANIA', 'TIME SURVIVED'],
  ['OSIĄGNIĘTA FALA', 'ROUND REACHED'],
  [
    'Standardowy zakażony. Powolny, wytrwały i groźny w grupie.',
    'Standard infected. Slow, persistent, and dangerous in numbers.',
  ],
  [
    'Szybki zakażony błyskawicznie skracający dystans.',
    'Fast-moving infected that closes distance before you can react.',
  ],
  [
    'Ciężkie płyty pochłaniają obrażenia. Użyj mocnej broni.',
    'Heavy plating absorbs punishment. Use high-damage weapons.',
  ],
  [
    'Pełzający zakażony atakuje poniżej linii celowania.',
    'Low-profile infected that attacks from below your sightline.',
  ],
  [
    'Niestabilny zakażony. Trzymaj dystans.',
    'Volatile organism. Keep your distance when it gets close.',
  ],
  [
    'Potężny zakażony. Uważaj na przygotowanie fali uderzeniowej.',
    'A massive infected. Watch for its shockwave wind-up.',
  ],
  ['Niezawodny pistolet każdego ocalałego.', 'Reliable sidearm issued to every operator.'],
  [
    'Wolny, ciężki pistolet z silnym odrzutem i groźnymi headshotami.',
    'A slow, heavy pistol with punishing headshots and difficult recoil.',
  ],
  [
    'Szybki pistolet maszynowy, celny także w ruchu.',
    'A fast machine pistol that stays controllable while moving.',
  ],
  ['Wytłumiony karabin do precyzyjnych serii.', 'Suppressed rifle with precise, controlled fire.'],
  [
    'Pistolet maszynowy o wysokiej szybkostrzelności do bliskiej walki.',
    'High-rate submachine gun built for close quarters.',
  ],
  [
    'Strzelba powtarzalna o dużej sile z bliska.',
    'Pump-action shotgun that devastates at short range.',
  ],
  [
    'Karabin precyzyjny do dalekich celów.',
    'Precision rifle capable of eliminating threats at long range.',
  ],
  [
    'Lekki karabin z celownikiem. Groźny w głowę, słabszy w ciało.',
    'A light scoped rifle with lethal headshots but modest body damage.',
  ],
  [
    'Precyzyjny karabin ze zintegrowanym tłumikiem.',
    'A precise, powerful scoped rifle with an integrated suppressor.',
  ],
  [
    'Własny model ocalałych z osobnym odrzutem, przeładowaniem i dźwiękiem.',
    'A distinctive survivor firearm with its own model, recoil, reload and sound.',
  ],
  ['Jesteś przy warsztacie. Wybierz recepturę.', 'You are at the workbench. Choose a recipe.'],
  [
    'Podejdź do stołu w północnej części obozu: 6 m na zachód, 12 m na północ od ogniska.',
    'Approach the workbench in the north of camp: 6 m west and 12 m north of the campfire.',
  ],
  ['Co-op: czas nadal płynie.', 'Co-op: the match continues.'],
  ['Solo: pauza.', 'Solo: paused.'],
  [
    'Podstawowe schematy są gotowe. Specjalnych szukaj w skrzyniach w lesie. B lub Esc wraca do gry.',
    'Basic blueprints are ready. Find special blueprints in forest supply caches. B or Esc returns to play.',
  ],
  [
    'POLIGON / wszystkie bronie za darmo. B lub Esc wraca do treningu.',
    'RANGE / all firearms are free. B or Esc returns to training.',
  ],
  [
    'Dzień 38. Postawiliśmy palisadę. Gdy zapada mgła, pilnuj czterech wejść do obozu.',
    'Day 38. The palisade is up. Guard all four camp entrances when the fog rolls in.',
  ],
  [
    'Podążaj ścieżkami. Za lasem są opuszczone chaty i skrytki. Zostaw znaki, aby znaleźć drogę powrotną.',
    'Follow the trails to abandoned cabins and caches. Leave markers to find your way back.',
  ],
  [
    'Po piętnastu nocach dotarliśmy głębiej. Obóz nadal stoi. Nie zostawiaj rannych za sobą.',
    'After fifteen nights we reached deeper woodland. The camp still stands. Leave no injured survivor behind.',
  ],
  [
    'Broń obozu. Zbieraj zapasy. Las odsłania nowe szlaki z kolejnymi falami.',
    'Defend the camp. Gather supplies. New forest trails open as you survive more waves.',
  ],
  [
    'Wyprawa trwa. Obóz i odkryte miejsca pozostają na swoim miejscu.',
    'The expedition continues. The camp and discovered locations persist.',
  ],
  [
    'Nowy rozdział wyprawy. Uzupełnij zapasy — obóz nadal stoi.',
    'A new expedition chapter. Resupply — the camp still stands.',
  ],
  ['REANIMUJ', 'REVIVE'],
  ['PRZYTRZYMAJ, ABY REANIMOWAĆ', 'HOLD TO REVIVE'],
  ['PRZYTRZYMAJ, ABY UŻYĆ', 'HOLD TO INTERACT'],
  ['WYPOSAŻENIE WŁĄCZONE', 'ACQUIRED'],
  ['PRZEŁADOWYWANIE…', 'RELOADING…'],
  ['R / PRZEŁADUJ', 'PRESS R TO RELOAD'],
  ['RUCH / ŚLIZG', 'MOVEMENT / SLIDING'],
  ['WRĘCZ / NÓŻ POLOWY', 'MELEE / FIELD KNIFE'],
];
pairs.push(...extraPairs);
const dictionary = new Map();
for (const pair of pairs) for (const value of pair) dictionary.set(value, pair);
const words = [
  ['ROZDZIAŁ', 'CHAPTER'],
  ['FALA', 'WAVE'],
  ['PRZYGOTOWANIE', 'PREPARE'],
  ['POZOSTAŁO', 'REMAINING'],
  ['WYNIK', 'RESULT'],
  ['CELNOŚĆ', 'ACCURACY'],
  ['TRAFIENIA', 'HITS'],
  ['HEADSHOTY', 'HEADSHOTS'],
  ['ELIMINACJE', 'KILLS'],
  ['KREDYTY', 'POINTS'],
  ['KREDYTÓW', 'POINTS'],
  ['WYPAWA', 'EXPEDITION'],
  ['WYPRAWA', 'EXPEDITION'],
  ['ZNACZNIK DRUŻYNY', 'TEAM MARKER'],
  ['OBRONA', 'DEFENSE'],
  ['OBSZAR', 'AREA'],
  ['DZIEŃ', 'DAY'],
  ['NOC', 'NIGHT'],
  ['DESZCZ', 'RAIN'],
  ['MGŁA', 'FOG'],
  ['DREWNO', 'WOOD'],
  ['DREWNA', 'WOOD'],
  ['ZŁOMU', 'SCRAP'],
  ['ZŁOM', 'SCRAP'],
  ['CZĘŚCI', 'PARTS'],
  ['MEDYKAMENTY', 'MEDICAL SUPPLIES'],
  ['LATARKA', 'FLASHLIGHT'],
  ['APTECZKI', 'MEDKITS'],
  ['MOŁOTOW', 'MOLOTOV'],
  ['PUŁAPKI', 'TRAPS'],
  ['SEKUND', 'SECONDS'],
  ['STRZAŁY', 'SHOTS'],
  ['PRZEŁADOWANIE', 'RELOAD'],
  ['NÓŻ', 'KNIFE'],
  ['KUCANIE', 'CROUCH'],
  ['ŚLIZG', 'SLIDE'],
  ['GRANAT', 'GRENADE'],
  ['SCHEMAT', 'BLUEPRINT'],
  ['TRENING', 'TRAINING'],
  ['ZA DARMO', 'FREE'],
  ['BROŃ PODSTAWOWA', 'BASIC FIREARMS'],
  ['OBÓZ', 'CAMP'],
  ['LAS', 'FOREST'],
  ['PÓŁNOC', 'NORTH'],
  ['POŁUDNIE', 'SOUTH'],
  ['ZACHÓD', 'WEST'],
  ['WSCHÓD', 'EAST'],
  ['ŚRODEK', 'CENTER'],
  ['drewno', 'wood'],
  ['drewna', 'wood'],
  ['złom', 'scrap'],
  ['złomu', 'scrap'],
  ['części', 'parts'],
  ['medykamenty', 'medical supplies'],
  ['wykończeń', 'finishes'],
  ['wszystkie za darmo', 'all free'],
];
const escapePattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
const replacements = Object.fromEntries(
  ['pl', 'en'].map((locale) => [
    locale,
    [...pairs]
      .sort((a, b) => b[locale === 'en' ? 0 : 1].length - a[locale === 'en' ? 0 : 1].length)
      .concat(words)
      .map(([pl, en]) => [
        new RegExp(
          '(?<![\\p{L}])' + escapePattern(locale === 'en' ? pl : en) + '(?![\\p{L}])',
          'gu',
        ),
        locale === 'en' ? en : pl,
      ]),
  ]),
);
const translatedCache = new Map();
export function translateText(value, locale = 'pl') {
  const text = String(value),
    trim = text.trim(),
    pair = dictionary.get(trim);
  if (pair) return text.replace(trim, pair[locale === 'en' ? 1 : 0]);
  if (/^[\d\s/.,%:+−-]+$/.test(text)) return text;
  const cacheKey = locale + ':' + text;
  if (translatedCache.has(cacheKey)) return translatedCache.get(cacheKey);
  const protectedNames = [];
  let result = text.replace(/THE LOST FOREST|WHISPERING PINES|THE HOLLOW WOODS/g, (m) => {
    protectedNames.push(m);
    return `\u0001${protectedNames.length - 1}\u0001`;
  });
  for (const [pattern, replacement] of replacements[locale === 'en' ? 'en' : 'pl'])
    result = result.replace(pattern, replacement);
  result = result.replace(/\u0001(\d+)\u0001/g, (_, n) => protectedNames[Number(n)]);
  if (translatedCache.size > 4096) translatedCache.clear();
  translatedCache.set(cacheKey, result);
  return result;
}
export class Localization {
  constructor(root, locale = 'pl') {
    this.root = root;
    this.locale = locale;
    this.sources = new WeakMap();
    this.observer = new MutationObserver((records) => {
      this.observer.disconnect();
      const nodes = new Set(records.map((r) => r.target));
      for (const node of nodes) this.translateTree(node);
      this.watch();
    });
    this.setLocale(locale);
  }
  watch() {
    this.observer.observe(this.root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
  }
  translateTree(root) {
    if (root.nodeType === 3) {
      this.translateNode(root);
      return;
    }
    if (root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) this.translateNode(node);
    for (const element of [root, ...root.querySelectorAll('[placeholder],[title],[aria-label]')])
      for (const key of ['placeholder', 'title', 'aria-label']) {
        const value = element.getAttribute(key);
        if (value) element.setAttribute(key, translateText(value, this.locale));
      }
  }
  translateNode(node) {
    if (
      !node.nodeValue.trim() ||
      node.parentElement?.closest(
        'script,style,kbd,option[data-no-translate],.room-code-label strong',
      )
    )
      return;
    const previous = this.sources.get(node),
      source = previous && node.nodeValue === previous.last ? previous.source : node.nodeValue,
      last = translateText(source, this.locale);
    this.sources.set(node, { source, last });
    if (node.nodeValue !== last) node.nodeValue = last;
  }
  setLocale(locale) {
    this.locale = locale === 'en' ? 'en' : 'pl';
    document.documentElement.lang = this.locale;
    this.observer.disconnect();
    this.translateTree(this.root);
    this.watch();
  }
  t(value) {
    return translateText(value, this.locale);
  }
}
