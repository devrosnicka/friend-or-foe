# Projekt: Asynchronní strategická webová hra

## Základní vize

Cílem je vytvořit multiplayerovou webovou strategii inspirovanou kombinací her **Diplomacy**, **Civilization** a částečně **Northgard**.

Hlavní důraz není na rychlé klikání nebo aktivní hraní v reálném čase, ale na:

- dlouhodobá strategická rozhodnutí,
- diplomacii mezi hráči,
- boj o území a zdroje,
- asynchronní hraní (několik minut denně).

Hráč by neměl získávat výhodu tím, že tráví ve hře více času. Výhodu by měla přinášet pouze lepší strategie, diplomacie a plánování.

---

# První prototyp

Cílem prvního prototypu není vytvořit hru.

Cílem je vytvořit funkční simulaci světa.

---

# Mapa

Mapa je složena z regionů (oblastí).

Každý region představuje samostatné území.

Region obsahuje:

- unikátní ID
- název
- typ terénu
- seznam sousedních regionů
- vlastníka
- seznam surovin
- seznam budov

Příklad:

```text
Region:
- id: 15
- name: Severní pláně
- terrain: plains
- owner: Player1

Resources:
- iron

Neighbours:
- 12
- 14
- 18
```

---

# Regiony a sousedství

Mapa je tvořena grafem.

Každý region zná své sousedy.

Pohyb armád i expanze jsou možné pouze mezi sousedními regiony.

Například:

```text
A sousedí s B
B sousedí s C
```

Přesun:

```text
A -> B   ano
A -> C   ne
```

---

# Typy terénu

Pro první verzi stačí několik základních typů:

```text
plains      (roviny)
forest      (les)
hills       (kopce)
mountains   (hory)
coast       (pobřeží)
```

Terén může v budoucnu ovlivňovat:

- produkci
- obranu
- dostupné budovy

---

# Suroviny

## Běžné suroviny

Nechceme simulovat detailní ekonomiku.

Prototyp používá jednu abstraktní surovinu:

```text
production
```

Ta reprezentuje:

- dřevo
- kámen
- pracovní sílu
- základní materiály

Slouží jako univerzální měna pro stavění.

## Strategické suroviny

Region může obsahovat speciální zdroje.

Například:

```text
iron
coal
horses
oil
gold
```

Tyto suroviny:

- nelze vyrábět
- existují pouze na konkrétních územích
- dávají přístup ke speciálním budovám nebo technologiím

Příklad:

```text
iron -> možnost stavět železárny
horses -> možnost budovat jízdu
oil -> moderní průmysl
```

---

# Vlastnictví regionů

Každý region má vlastníka.

V první verzi:

```text
null        = neutrální území
Player      = hráč
Bot         = AI
```

---

# Budovy

Budovy se nestaví v jednom hlavním městě.

Budovy existují přímo v regionech.

Každý region může obsahovat několik budov.

Pro první prototyp:

### Farma

```text
+ produkce
```

### Důl

```text
+ produkce
```

### Kasárna

```text
+ vojenská síla
```

Není potřeba řešit grafické umisťování budov.

Stačí seznam budov v regionu.

---

# Hráč

Hráč vlastní:

- regiony
- budovy
- zásobu produkce

Prototyp zatím neřeší:

- diplomacii
- obchod
- výzkum
- aliance

---

# Bot

První AI může být velmi jednoduchá.

Každý tah:

1. vybere sousední neutrální region
2. zabere ho
3. případně postaví farmu

Cílem není inteligence.

Cílem je vytvořit aktivní svět.

---

# Herní cyklus

První verze může běžet v jednoduchých tazích.

Například:

```text
1. hráč provede akci
2. bot provede akci
3. přepočítá se ekonomika
4. uloží se nový stav
```

Později lze přejít na skutečný asynchronní model s plánovanými událostmi.

---

# Technický cíl první implementace

Po dokončení první fáze by mělo být možné:

- zobrazit mapu regionů
- zobrazit sousedství regionů
- zobrazit vlastníky
- zobrazit suroviny
- obsadit region
- postavit budovu
- nechat bota expandovat

Bez:

- boje
- diplomacie
- výzkumu
- multiplayeru

Cílem je ověřit, že základní model světa funguje a je dostatečně flexibilní pro další rozvoj.

---

# Důležitý princip návrhu

Veškerá herní logika by měla být oddělena od UI.

Doporučené vrstvy:

```text
Frontend (mapa, ovládání)

↓ API

Backend

↓ používá

Game Engine
```

Game Engine dostane:

```text
aktuální stav světa
+ seznam akcí
```

a vrátí:

```text
nový stav světa
```

Díky tomu bude možné později měnit UI nebo backend bez přepisování herních pravidel.
