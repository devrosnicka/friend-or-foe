# Prototype-v1.md

# První implementace

## Cíl

Ověřit základní herní smyčku.

Neřešit diplomacii, technologie ani multiplayer.

## Scope

### Mapa

- regiony
- sousednosti
- vlastník regionu
- typ terénu
- strategické suroviny

### Hráč

- jeden lidský hráč
- jeden jednoduchý bot

### Budovy

- Farma
- Důl
- Kasárna

### Ekonomika

- jedna univerzální surovina: Production

### Expanze

- obsazování sousedních neutrálních regionů

### Bot

- jednoduchá expanze
- občas postaví budovu

## Co NEimplementovat

- diplomacii
- obchod
- technologie
- aliance
- bojový systém
- multiplayer
- notifikace
- grafiku

## Technická architektura

Frontend
↓
API
↓
Backend
↓
Game Engine

## Milníky

### Milestone 1

- datový model mapy
- regiony a sousednosti

### Milestone 2

- zobrazení mapy

### Milestone 3

- vlastnictví regionů

### Milestone 4

- budovy

### Milestone 5

- ekonomika

### Milestone 6

- jednoduchý bot

### Milestone 7

- ukládání a načítání herního stavu

## Hotovo když

- lze zabírat regiony
- lze stavět budovy
- bot expanduje
- mapa se korektně aktualizuje
