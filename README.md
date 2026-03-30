# EatSafe

A better search interface for [NYC DOHMH restaurant inspection data](https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j).

**[eatsafe.nyc](https://eatsafe.nyc)**

## Features

- Search by name, address, zip code, cuisine, neighborhood, borough, and grade
- Multi-select filters for borough, grade, and community board (neighborhood)
- Word-boundary name matching (searching "Om" finds "Om Restaurant", not "Momofuku")
- Restaurant inspection history with grade timeline
- Dark mode

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Headless UI
- NYC Open Data API (SoQL)

## Development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` automatically deploy to [eatsafe.nyc](https://eatsafe.nyc) via GitHub Actions.
