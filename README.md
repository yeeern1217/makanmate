# MakanMate

Pokemon Go for Malaysian Street Food. A PWA that lets you discover heritage food stalls across Malaysia, scan their menus with AI, cook dishes in a 3D mini-game, and collect them all in a Pokedex.

## Features

- **Heritage Radar** — Interactive map showing 12 legendary food stalls across Penang, KL, and Ipoh
- **AI Menu Scanner** — Point your camera at a hawker menu board and Gemini AI identifies the dishes
- **3D Cooking Mini-Game** — Tap ingredients into a wok in the correct order to "master" each dish
- **Pokedex Collection** — Track your progress across 3 regions with district badges and completion stats

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- React Three Fiber + drei (3D scenes)
- MapLibre GL JS (maps, no API key needed)
- Google Gemini 2.5 Flash via Vercel AI SDK
- Zustand (state management with localStorage persistence)

## Getting Started

### Prerequisites

- Node.js 18+
- A Google AI API key (for the menu scanner and ingredient lore features)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/yeeern1217/makanmate.git
   cd makanmate
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
   The `--legacy-peer-deps` flag is required due to React 19 peer dependency conflicts.

3. Create a `.env.local` file in the project root:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
   ```
   Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Notes

- **GPS/Camera**: The Radar and Scan features use browser Geolocation and Camera APIs. These require HTTPS in production but work on `localhost` during development.
- **Mobile testing**: For the best experience, use Chrome DevTools mobile emulation or access via your phone on the same network.

## Project Structure

```
src/
  app/              # Next.js pages (home, radar, scan, pokedex)
  components/       # React components
    map/            #   MapLibre radar map
    nav/            #   Bottom navigation bar
    pokedex/        #   3D dish viewer, cooking game, collection cards
    scan/           #   Camera viewport, capture button, results
    ui/             #   Shared UI (buttons, sheets, toasts)
  lib/
    ai/             # Gemini prompts and tool schemas
    data/           # Heritage nodes, dish entries, region config
  store/            # Zustand stores (app state, pokedex progress)
  types/            # TypeScript interfaces
```
