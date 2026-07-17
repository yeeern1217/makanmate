# MakanMate

**A Pokedex for Malaysian street food** — discover, scan, and collect Malaysia's living food heritage, one legendary stall at a time.

MakanMate is a mobile-first PWA that gamifies heritage food discovery across Penang, KL, and Ipoh. You physically visit grassroots hawker stalls, photograph them to "catch" collectible cards, scan menus with AI vision, explore dishes through interactive 3D knowledge graphs, and build Heritage Trails that connect your catches into cultural narratives.

## Why This Exists

Malaysia's most important food isn't in malls or on Instagram. It's in unmarked roadside stalls run by third-generation hawkers — places with 15 online reviews that serve the best char kuey teow in the country. These stalls are invisible to Google, to food apps, and to tourists. When the uncle retires, the recipe disappears.

MakanMate is built around a curated dataset of these invisible stalls. The app deliberately inverts how recommendation systems normally work: stalls with *fewer* online reviews score *higher*. We call it the Invisibility Boost — and it's the core of everything from card rarity to next-stall recommendations.

**"Why not just use ChatGPT / Claude / Gemini directly?"** Because no LLM has trained on these stalls. The invisible-shop dataset — real GPS coordinates, review counts, cultural origins, grassroots/hyped classification, food tags — is the moat. The AI layer (Gemini) handles vision and storytelling, but the *intelligence about which stalls matter and why* lives in our data and algorithms, not in any foundation model.

---

## AI Architecture

A single API route (`/api/chat`) dispatches to an orchestrator (`src/lib/orchestrator/orchestrator.ts`) that handles **6 distinct AI modes**, each with its own system prompt, Zod-validated tool schema, and structured output:

### 1. Menu Vision (`mode: "vision"`)
Extracts dishes from hawker menu photos. Decodes Malaysian shorthand (CKT → Char Kuey Teow, NL → Nasi Lemak, BKT → Bak Kut Teh). Returns structured data: raw text, English name, local name, price, decoded shorthand, and whether each dish matches a known entry in our database. Server-side Haversine GPS matching runs in parallel — no hallucination possible on location validation.

### 2. Magic Lens (`mode: "magic-lens"`)
AR-style menu translator. Returns bounding-box positions (percentage-based coordinates) for each menu item so the frontend can overlay translations, allergen icons (shellfish, peanut, gluten, dairy, egg, soy), and halal/non-halal badges directly on the camera feed.

### 3. Ingredient Lore with RAG (`mode: "lore"`)
The only mode that uses external web search. Pipeline:
1. **Tavily web search** — queries `"{ingredient} {dish} Malaysian food culture history origin"` for real sources
2. **Source injection** — search results are formatted and injected into the user message as context
3. **Gemini synthesis** — generates cultural storytelling grounded in the search results, with source attribution
4. **Graceful fallback** — if Tavily is unavailable or returns nothing, Gemini generates from its own knowledge and the response is flagged with `fallbackUsed: true`

### 4. Migration Stories (`mode: "migration"`)
Generates historically-grounded narratives about how a dish traveled to Malaysia — trade routes, immigration waves, colonial influences. Each dish entry has a `migrationStoryHint` field (e.g., "Teochew fishermen who settled along Penang's coast in the 1800s") that guides generation toward specific, verifiable history rather than generic output.

### 5. Trail Narratives (`mode: "trail-narrative"`)
Given a list of caught stalls, generates a narrative connecting them historically and culturally. Produces both a `historical_thread` (geographic and historical connections) and `cultural_connections` (diversity represented).

### 6. Recommendation Phrasing (`mode: "phrase-recommendation"`)
Takes the algorithmic recommendation output (stall name, dish, reasoning factors) and generates a natural-language suggestion in a warm, local voice. Under 30 words. This is the only mode where AI is used *after* a non-AI algorithm has already made the decision — the AI phrases, it doesn't choose.

All modes use `toolChoice: "required"` with Zod schemas to force structured output. The orchestrator returns timing data (`durationMs`) and fallback flags for every call.

---

## Algorithmic Intelligence (No AI)

These systems run entirely on the client or server with zero LLM calls:

### Inverted-Ranking Recommender
The recommendation engine deliberately inverts standard recommendation logic. Four weighted factors:

| Factor | Weight | What It Does |
|---|---|---|
| Content Similarity | 35% | Jaccard similarity between user's food tags and stall's tags |
| **Invisibility Boost** | **30%** | **Stalls with fewer online reviews score higher** — `1 - (reviewCount / 200)` plus a 15-point bonus for grassroots stalls |
| Diversity Gap | 20% | Unexplored cultural origins, cities, or stall types score higher |
| Proximity | 15% | Haversine distance from user's GPS |

The system builds a `TasteProfile` from your card collection — counting affinities across cultural origins (Chinese, Malay, Indian, Peranakan, Mamak, Portuguese), cities, and stall types. It then scores every uncaptured grassroots stall and returns the top-N with human-readable reasoning explaining *why* each was recommended.

### Akar Score & Rarity Classification
Heritage scoring algorithm: `age × 30% + scarcity × 30% + base heritage score × 40%`. Scarcity is derived from `reviewCount` — again, fewer reviews = higher score. Maps to rarity tiers: Legendary (90+), Rare (75+), Uncommon (55+), Common.

### Grassroots vs. Hyped Classification
The dataset contains 12 grassroots stalls (real heritage hawkers, 15-310 reviews) and 4 "hyped" venues (mall food courts, 950-3100 reviews). Hyped stalls appear greyed out on the radar, can't be caught for cards, and are excluded from recommendations. This classification is a design choice that shapes the entire app: only grassroots stalls produce cards, earn Akar Score, and appear in trails.

### Quiz Generator
Procedurally generates quiz questions from the dish knowledge graph — testing cultural origin, origin state, dialect phrase meanings, cooking techniques, and local ingredient names. Questions pull distractors from the full dish database to ensure plausible wrong answers.

### Trail Builder & Reflection
Connects 3+ caught cards into Heritage Trails with computed metadata: cultural diversity count (out of 6 origins), rarity highlights, invisibility analysis (how many stops had <25 reviews), and total walking distance via Haversine.

---

## The Dataset

16 heritage nodes across 3 cities, each with:

| Field | Purpose |
|---|---|
| `isGrassroots` | Core filter — only grassroots stalls produce cards |
| `reviewCount` | Drives Invisibility Boost and Akar Score scarcity |
| `culturalOrigin` | One of 6 origins — drives diversity recommendations |
| `tags` | Food category tags — drives content-based recommendations |
| `communityCatchCount` | Simulated community data for social proof |
| `founded` | Stall founding year — drives age factor in Akar Score |

12 dish entries, each a knowledge graph with:
- **Ingredients** with cultural lore hints, local names, and cooking hints
- **Techniques** with tool descriptions (wok hei, sieve pressing, spice pounding)
- **Dialect phrases** with pronunciation guides and usage context
- **Cooking order** sequences defined per dish (data only — not surfaced in the UI)
- **Migration story hints** that guide AI generation toward specific history

---

## Features

### Heritage Radar (`/radar`)
GPS-enabled map (MapLibre GL, no API key) showing all 16 stalls. Grassroots pins pulse with color; hyped pins are greyed out. Proximity voice guide with 3 regional personas (Uncle Lim in Penang, Auntie Kamala in KL, Ah Kong in Ipoh) that speak colloquial Malaysian English phrases as you approach a stall — using Web Speech API, no external service.

### Catch Flow (`/scan`)
2-step pipeline: GPS proximity validation → card creation. On a successful grassroots catch, the Akar Score algorithm runs, rarity is classified, and a card reveal animation plays. After catching, the recommendation card appears automatically — the inverted-ranking recommender fires and Gemini phrases a natural-language suggestion for your next stall, with a Navigate button that jumps straight to that pin on the radar.

### Magic Lens (`/lens`)
AR-style menu translator with positioned overlays. Allergen icons, halal/non-halal badges, translations, and prices placed at approximate bounding-box coordinates on the camera feed.

### Pokedex Collection (`/pokedex`)
Card collection grid with tier badges (Bronze/Silver/Gold), rarity badges, creature emojis, cultural origin labels, and Akar Score. Undiscovered dishes appear as greyed-out placeholders.

### Heritage Blueprint (`/pokedex/[dishId]`)
Interactive 3D knowledge graph (React Three Fiber) with concentric orbital rings:
- **Ingredients** — tap for RAG-powered cultural lore with web sources
- **Techniques** — cooking method descriptions
- **Migration story** — AI-generated historical narrative with "Listen" narration
- **Dialect phrases** — local pronunciations with "Speak" button

Card evolution (Bronze → Silver → Gold) via timed quiz challenges. Tapping a node also glides the camera in to frame it while its lore streams in from Gemini.

### Heritage Trail (`/trail`)
Connects 3+ catches into a trail with AI-generated narrative, trail map with route lines, cultural diversity summary, and shareable PNG card (html-to-image + Web Share API).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| AI | Google Gemini via Vercel AI SDK (6 modes) |
| Search/RAG | Tavily API (ingredient lore grounding) |
| 3D | React Three Fiber + drei |
| Maps | MapLibre GL JS + CARTO (free, no API key) |
| Voice | Web Speech API (browser-native, no external service) |
| State | Zustand with localStorage persistence |
| Styling | Tailwind CSS v4 |
| Sharing | html-to-image + Web Share API |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google AI API key (for menu scanning, lore, magic lens, trail narratives)
- Tavily API key (optional — ingredient lore falls back gracefully without it)

### Setup

```bash
git clone https://github.com/yeeern1217/makanmate.git
cd makanmate
npm install --legacy-peer-deps
```

Create `.env.local`:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here          # optional
NEXT_PUBLIC_MOCK_GPS=true              # for local testing
NEXT_PUBLIC_MOCK_GPS_LAT=5.4141        # Penang
NEXT_PUBLIC_MOCK_GPS_LNG=100.3288
```

```bash
npm run dev
```

### Mock GPS Coordinates

| Stall | Lat | Lng |
|---|---|---|
| New Lane Char Kuey Teow (Penang) | 5.4141 | 100.3288 |
| Lorong Selamat Cendol (Penang) | 5.4220 | 100.3310 |
| Petaling Street BKT (KL) | 3.1438 | 101.6953 |

---

## Project Structure

```
src/
  app/
    api/chat/            Single API route → orchestrator (6 Gemini modes)
    radar/               Heritage map with GPS + voice guide
    scan/                Camera catch flow (vision → GPS → card)
    pokedex/             Collection grid + [dishId] 3D blueprint
    trail/               Heritage trail builder
    lens/                AR menu translator
    offline/             PWA offline fallback
  lib/
    orchestrator/        Central AI dispatcher with mode routing
    ai/                  System prompts (6) + Zod tool schemas (7)
    recommender/         Inverted-ranking engine + taste profiling
    scoring/             Akar Score algorithm + rarity classifier
    search/              Tavily web search integration (RAG)
    data/                16 heritage nodes + 12 dish knowledge graphs
    quiz/                Procedural quiz generator from dish data
    trails/              Trail builder + reflection generator
    voice/               3 regional personas + speech synthesis
    camera.ts            getUserMedia + base64 capture
    gps.ts               Geolocation wrapper + mock GPS
    geo.ts               Haversine distance + nearest-node finder
  store/                 Zustand (app state, cards, pokedex)
  types/                 TypeScript interfaces
  components/
    blueprint/           3D orbital knowledge graph nodes
    catch/               Card reveal animation + recommendation card
    evolve/              Card evolution + quiz challenge
    lens/                Magic lens AR overlay
    map/                 MapLibre radar + proximity voice guide
    pokedex/             3D dish viewer, collection grid
    scan/                Camera viewport, capture button, results
    trail/               Trail map, diversity summary, share card
    nav/                 Bottom navigation bar
    ui/                  Shared UI components
```
