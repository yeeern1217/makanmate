# MakanMate

Pokemon Go for Malaysian Street Food. A PWA that lets you discover heritage hawker stalls across Malaysia, scan menus with AI, translate them with an AR lens, cook dishes in a 3D mini-game, collect them in a Pokedex, and build Heritage Trails connecting your catches.

## Features

### Heritage Radar (`/radar`)
Interactive GPS-enabled map showing 12 legendary grassroots stalls and 4 "hyped" mall food courts across Penang, KL, and Ipoh. Grassroots pins pulse with Akar Score; hyped pins are greyed out. Includes a proximity voice guide with 3 regional personas (Uncle Lim, Auntie Kamala, Ah Kong) that speak colloquial Malaysian English as you approach a stall.

### AI Menu Scanner (`/scan`)
Point your camera at a hawker menu board and a 3-step AI pipeline kicks in:
1. **Liveness check** — Gemini detects if you're photographing a real stall or a screen (anti-cheat)
2. **Menu vision** — Gemini extracts dishes with English/local names, prices, and shorthand decodings
3. **GPS matching** — Checks if you're within 200m of a heritage node

On a successful catch, you receive a `CapturedCard` with rarity classification (Common / Uncommon / Rare / Legendary) and a card reveal animation. A manual dish dropdown is available as a fallback.

### Magic Lens (`/lens`)
AR-style menu translator. Point your camera at a hawker menu and get an overlay with translated dish names, prices, allergen icons (shellfish, peanut, gluten, etc.), and halal/non-halal status badges, positioned at approximate locations on the camera feed.

### Pokedex Collection (`/pokedex`)
Grid display of all captured cards with tier badges (Bronze / Silver / Gold), rarity badges, creature emojis, cultural origin labels, and Akar Score points. Undiscovered dishes appear as greyed-out placeholders. Progress tracked per region.

### Heritage Blueprint (`/pokedex/[dishId]`)
Interactive 3D knowledge graph (React Three Fiber) for each dish. A solar-system-style visualization with concentric orbital rings:
- **Ingredients** — Tap to fetch AI-generated cultural lore, fun facts, and origin regions
- **Cooking techniques** — Tool descriptions and methods
- **Migration story** — How the dish traveled to Malaysia, with a "Listen" button for narration
- **Dialect phrases** — Local pronunciations with a "Speak" button

Includes card evolution (Bronze → Silver → Gold) via timed quiz challenges testing knowledge of cultural origins, dialect phrases, cooking techniques, and ingredients.

### 3D Cooking Mini-Game
Tap ingredients into a 3D wok in the correct cooking order. Correct picks fly into the wok with sizzle particle effects; wrong picks trigger shake feedback. Completion triggers a victory celebration with orbiting ingredients above the wok.

### Heritage Trail (`/trail`)
Requires 3+ caught stalls. Connects your catches into a Heritage Trail with:
- AI-generated historical narrative tying the stalls together
- Trail map with route lines and numbered markers
- Cultural diversity summary across 6 origins (Malay, Chinese, Indian, Peranakan, Mamak, Portuguese)
- Shareable trail card (PNG via html2canvas + Web Share API)

### Akar Score & Rarity System
Heritage scoring algorithm combining stall age (30%), scarcity (30%), and base heritage score (40%). Scores map to rarity tiers: Legendary (90+), Rare (75+), Uncommon (55+), Common.

### Voice Guide
Browser-native speech synthesis (Web Speech API) with 3 culturally authentic personas that provide proximity feedback, narrate migration stories, and speak dialect phrases. No external API required.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- React Three Fiber + drei (3D scenes and cooking game)
- MapLibre GL JS (maps, no API key needed)
- Google Gemini 2.5 Flash via Vercel AI SDK (6 AI modes)
- Zustand (state management with localStorage persistence)
- html2canvas (shareable trail cards)
- Web Speech API (voice guide and narration)

## Getting Started

### Prerequisites

- Node.js 18+
- A Google AI API key (for menu scanning, lore generation, magic lens, and trail narratives)

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

### Testing Locally

Since MakanMate relies on GPS and camera, here's how to test each feature on localhost:

#### Mock GPS (recommended for local testing)

Add these to your `.env.local` to skip real GPS and simulate being near a heritage stall:

```
NEXT_PUBLIC_MOCK_GPS=true
NEXT_PUBLIC_MOCK_GPS_LAT=5.4141
NEXT_PUBLIC_MOCK_GPS_LNG=100.3288
```

This places you at **New Lane Char Kuey Teow** in Penang. Other coordinates to try:

| Stall | Lat | Lng |
|---|---|---|
| New Lane Char Kuey Teow (Penang) | 5.4141 | 100.3288 |
| Lorong Selamat Cendol (Penang) | 5.4220 | 100.3310 |
| Nasi Kandar Line Clear (Penang) | 5.4185 | 100.3365 |

#### Camera

- **Desktop**: Chrome DevTools → More tools → Sensors → select a camera. Or use a real webcam.
- **Mobile on same network**: Run `npm run dev -- --hostname 0.0.0.0`, then open `http://<your-local-ip>:3000` on your phone. Camera APIs require HTTPS in production but work on `localhost`.
- **No camera**: Use the manual dish dropdown fallback on the Catch page.

#### Feature-by-Feature Testing Guide

1. **Home (`/`)** — Loads immediately. Check the typewriter animation and animated counters.

2. **Radar (`/radar`)** — With mock GPS enabled, the map centers on your mock position. Tap a grassroots pin (coloured circle) to open the stall details sheet. Tap "Catch This Stall" to go to the scanner.

3. **Catch (`/scan`)** — With a camera, photograph any food menu or hawker stall image. The AI pipeline runs: liveness → menu vision → GPS match. Without a camera, use the manual dropdown to select a dish. After catching, watch the card reveal animation.

4. **Pokedex (`/pokedex`)** — View your collected cards. Tap a card to enter the Heritage Blueprint.

5. **Heritage Blueprint (`/pokedex/[dishId]`)** — Interact with the 3D orbital view. Tap ingredient/technique/migration/dialect nodes to fetch AI content. Try the "Evolve" button to take a quiz (needs a caught card).

6. **Cooking Game** — Accessible from the Heritage Blueprint. Tap ingredients in the correct order into the wok.

7. **Magic Lens (`/lens`)** — Point camera at any food menu image. The AR overlay appears with translations, allergens, and halal status.

8. **Heritage Trail (`/trail`)** — Requires 3+ caught cards. Build a trail and view the AI-generated narrative. Test the "Share Trail Card" button.

9. **Voice Guide** — On the Radar page, approach a stall (or set mock GPS near one). The proximity guide speaks colloquial phrases. Also test the "Listen" / "Speak" buttons in the Heritage Blueprint.

#### Chrome DevTools Mobile Emulation

For the best experience, open DevTools (F12) → toggle device toolbar → select a mobile device (e.g., iPhone 14 Pro). The app is designed as a mobile-first PWA.

## Project Structure

```
src/
  app/                  # Next.js pages
    api/chat/           #   Single API route (6 Gemini modes)
    radar/              #   Heritage map
    scan/               #   Camera catch flow
    pokedex/            #   Collection + [dishId] blueprint
    trail/              #   Heritage trail builder
    lens/               #   AR menu translator
    offline/            #   Offline fallback
  components/
    blueprint/          #   3D blueprint nodes + detail overlay
    catch/              #   Card reveal animation + stall card
    evolve/             #   Card evolution + quiz challenge
    lens/               #   Magic lens AR overlay
    map/                #   MapLibre radar + proximity guide
    nav/                #   Bottom navigation bar
    pokedex/            #   3D dish viewer, cooking game, collection
    scan/               #   Camera, capture button, results
    trail/              #   Trail map, diversity summary, share card
    ui/                 #   Shared UI (bottom sheet, buttons, toast)
  lib/
    ai/                 #   Gemini prompts and Zod tool schemas
    data/               #   Heritage nodes, dish entries, regions, creatures
    quiz/               #   Quiz question generator
    scoring/            #   Akar Score algorithm + rarity classifier
    share/              #   html2canvas share image generator
    trails/             #   Trail builder logic
    voice/              #   Voice personas + speech synthesis wrapper
  store/                # Zustand stores (app state, cards, pokedex)
  types/                # TypeScript interfaces
```
