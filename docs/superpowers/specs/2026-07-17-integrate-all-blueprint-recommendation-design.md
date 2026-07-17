# feat/integrate-all — Blueprint interactivity, recommendation CTA, liveness removal, trail fallback

**Date:** 2026-07-17
**Branch:** `feat/integrate-all`
**Status:** Approved design — ready for implementation plan

## Goal

Five focused changes to the MakanMate PWA:

1. Make the 3D "Heritage Blueprint" nodes **directly tappable** with a **camera-focus** glide (the 3D is currently decorative — interaction only happens via DOM pills).
2. Fix the **blueprint screen layout** so the lore sheet, controls, and 3D no longer overlap; re-space the orbital rings.
3. Make the **"next hidden gem" recommendation card auto-show** after a catch (it currently hides behind an easy-to-miss "Done" link).
4. **Remove liveness / anti-cheat detection** entirely (client gate + dead server modes).
5. Give the **trail narrative a fallback** and fix a bug where the AI narrative is lost on navigate-away.

Out of scope (deliberately): mounting the orphaned cooking mini-game, progressive/locked nodes, richer lore content, onboarding coach, safety-critic feature.

---

## 1. Tappable 3D nodes + camera focus

### `src/components/blueprint/BlueprintNode.tsx`
- Destructure the already-declared `onSelect` prop (currently dropped on the floor).
- Add an invisible hit-target mesh (a `<sphereGeometry>` ~radius 0.6 with a transparent material, `visible` but opacity 0, or a `<mesh>` with `material-transparent material-opacity={0}`) that carries:
  - `onPointerDown={(e) => { e.stopPropagation(); onSelect?.(id, category); }}`
  - `onPointerOver` → `document.body.style.cursor = "pointer"` + hover state
  - `onPointerOut` → reset cursor + clear hover state
- Keep both `<Html>` billboard layers `pointerEvents: "none"` so labels never block the raycast.
- The `center` node (the dish itself) receives no `onSelect`, so it stays non-interactive.
- Hover adds a subtle scale/glow bump (extend the existing `useFrame` lerp: target scale = `isActive ? 1.3 : hovered ? 1.12 : 1.0`).

### `src/components/pokedex/DishCanvas.tsx`
- Add a `<CameraFocus>` component rendered inside `<Canvas>`:
  - Interactive `BlueprintNode`s register their `THREE.Object3D` via a ref-callback prop keyed by node id, into a `Map` held by `DishCanvas`.
  - Holds a ref to `OrbitControls`.
  - `useFrame`: when `activeNodeId` is set and its object is registered, read the node's live world position (`getWorldPosition`), then lerp `controls.target` toward it and lerp the camera dolly from ~7 to ~4.5. Bias the target slightly downward (e.g. `target = nodePos - up*0.8`) so the focused node renders in the **upper ~60%** of the canvas, above the lore sheet. When `activeNodeId` is null, lerp `controls.target` back to origin and the camera back to the default framing.
- While `activeNodeId` is non-null: set `OrbitControls autoRotate={false}` and **freeze ring rotation** (guard the `useFrame` in `OrbitalRing` on a `frozen` prop derived from `activeNodeId != null`) so the scene holds still during focus.
- Drag-to-spin still works via OrbitControls; a quick tap selects a node, a drag rotates. The existing 200 ms tap debounce in the page handler stays.
- Pass the `onSelect={onNodeTap}` through (already wired) — it now actually reaches a handler.

### Ring re-spacing (fixes visual collision)
Current radii: ingredients 2.0 / techniques 3.2 / **migration 3.8** / dialect 4.4 — the single migration node at `[3.8,0,0]` collides with the technique (3.2) and dialect (4.4) rings.

New radii: **ingredients 2.2 / techniques 3.4 / dialect 4.4 / migration 5.4** (migration gets its own outermost orbit — fitting for a special "story" node). The migration node's hardcoded `position={[3.8,0,0]}` becomes `[5.4,0,0]` (tracks its ring radius). Update the memoized `distributeOnRing` radii accordingly.

---

## 2. Blueprint layout / overlap fix

### `src/app/pokedex/[dishId]/page.tsx`
- **Canvas fills the content area.** Remove the hardcoded `height: "60vh"` in `DishCanvas` (see below); the `relative flex-1` container drives height.
- **Condense the top into one compact bar** overlaid on the canvas (`absolute top-0 left-0 right-0 z-10`): back link + dish name + `●●●○ N/total` progress + ⚡Evolve button. Move the bulky `DishMetaCard` and the legend row out of the always-on vertical stack (tuck meta behind a small "ⓘ" toggle in the bar).
- **Node pills become a collapsible index.** A `[≡]` toggle (bottom-right, `absolute`, above the canvas) opens a one-row horizontal-scroll strip of the existing pills. Collapsed by default. **Kept as a failsafe** so interaction survives if a 3D tap misfires (honors the "demo must never break" guardrail).
- The full-screen quiz/evolution overlays (`z-50`) are unchanged.

### `src/components/pokedex/DishCanvas.tsx`
- Change the wrapper from `height: "60vh"` to `height: "100%"` so it fills the `flex-1` parent. Keep the `visibility: paused ? "hidden" : "visible"` and `frameloop` pause logic.

### `src/components/blueprint/NodeDetailOverlay.tsx`
- Keep `absolute bottom-0 z-20`. Because the focused node is now lifted into the top ~60% by the camera, the sheet no longer covers it. Cap sheet height (`max-h-[42vh]`, already close) and keep the internal scroll. No structural change beyond sizing.

**Result:** no element overlaps the interactive node — matches the approved "3D-first w/ camera focus" mockup.

---

## 3. Recommendation card auto-shows after catch

### `src/app/scan/page.tsx`
- In `handleCatchComplete`, after computing the rec and firing the `phrase-recommendation` fetch, **also `setShowRecommendation(true)`** when `recs.length > 0`, so the card slides up automatically as the catch reveal finishes.
- **`dismissRecommendation`** changes from navigating to the Pokédex to **just closing the card** (`phraseAbortRef.current?.abort(); setPhrasedSuggestion(null); setShowRecommendation(false);`) — the user stays on the menu-scan stage, so both the next-hunt path and the existing flow remain intact.
- `onNavigate` is unchanged: `setShowRecommendation(false); router.push('/radar?highlight=' + recommendation.node.id)` — radar already honors `?highlight`.
- If `recs.length === 0`, nothing pops (current behavior).
- The hardcoded fallback sentence in `RecommendationCard.tsx` (when the AI blurb fails) **stays** — demo guardrail.
- The small "Done" link on the menu stage may remain (harmless; it re-opens the card if dismissed).

---

## 4. Remove liveness / anti-cheat detection

### `src/app/scan/page.tsx`
Delete the liveness fetch + gate in `handleStallCapture` (currently ~lines 100–112):
```js
const livenessRes = await fetch("/api/chat", { ...mode: "liveness" });
const liv = livenessData.result;
if (liv && !liv.isReal && liv.confidence > 0.7) { setToast(...); return; }
```
Catch flow becomes: GPS check → `findNearestHeritageNode` → mint card. The surrounding `try/catch` stays wrapping the nearest-node + card-mint logic.

### Server-side dead-code cleanup (full removal)
- `src/lib/orchestrator/orchestrator.ts` — remove `handleLiveness`, the `liveness-test` handler, and their `switch` cases.
- `src/lib/ai/tools.ts` — remove the `livenessCheck` tool + schema.
- `src/lib/ai/prompts.ts` — remove `SYSTEM_PROMPT_LIVENESS` and `SYSTEM_PROMPT_LIVENESS_TEST`.
- `src/types/ai.ts` — remove `liveness` and `liveness-test` from the `mode` union.
- Grep for any other references to `liveness` and remove/adjust.

(`liveness-test` was already dead code; this clears both artifacts.)

---

## 5. Trail narrative fallback + persist fix

### `src/store/useCardStore.ts`
- Add `updateTrail: (trailId: string, patch: Partial<HeritageTrail>) => void` that maps over `trails` and merges the patch into the matching trail. `trails` is already persisted, so writes survive navigation.

### `src/app/trail/page.tsx` (`handleBuildTrail`)
- Keep `addTrail(trail)` + `setActiveTrail(trail)` early (instant UI while the narrative loads).
- On AI success: call **`updateTrail(trail.id, { historicalThread })`** (persist) in addition to `setActiveTrail(updatedTrail)`.
- On AI failure (catch, or missing `historical_thread`): write a **hardcoded fallback thread** via `updateTrail` + `setActiveTrail`, so the section is never blank. Fallback text is generated from trail data already on hand, e.g.:
  > `Your trail links {N} heritage stalls across {cities} — {origins} traditions woven into one walk through {city}'s living food history.`
- Net effect: the trail story is never empty, and it persists across navigation.

---

## Files touched (summary)

| File | Change |
|------|--------|
| `src/components/blueprint/BlueprintNode.tsx` | Wire `onSelect` to a hit mesh; hover cursor/scale |
| `src/components/pokedex/DishCanvas.tsx` | `<CameraFocus>`, ring freeze, `height:100%`, ring re-spacing |
| `src/app/pokedex/[dishId]/page.tsx` | Compact top bar, collapsible pill index, layout restructure |
| `src/components/blueprint/NodeDetailOverlay.tsx` | Sheet sizing (`max-h-[42vh]`) |
| `src/app/scan/page.tsx` | Auto-show rec card; `dismiss` = close; remove liveness gate |
| `src/lib/orchestrator/orchestrator.ts` | Remove liveness handlers/cases |
| `src/lib/ai/tools.ts`, `prompts.ts`, `src/types/ai.ts` | Remove liveness tool/prompts/modes |
| `src/store/useCardStore.ts` | Add `updateTrail` |
| `src/app/trail/page.tsx` | Persist narrative on success; hardcoded fallback thread |

No data-model changes to `heritage-nodes.ts` / `pokedex-entries.ts`. No persisted-store shape change beyond the additive `updateTrail` (no version bump needed — `trails` shape unchanged).

## Guardrails preserved

- 3D stays lightweight: only scale/position/camera lerp + one transparent hit sphere per node — **no runtime geometry generation**. `frameloop`/`paused` logic intact.
- DOM pill index kept as an interaction failsafe.
- `/scan` camera + GPS failsafes untouched.
- AI fallbacks preserved (rec sentence) and extended (trail thread).

## Verification

- `npm run build` and `npm run lint` clean.
- Manual: tap 3D nodes → camera glides, lore/migration/dialect sheets open without covering the node; ring nodes don't overlap; catch a stall → rec card auto-appears → Navigate lands on radar with the pin highlighted, Dismiss returns to menu stage; stall catch works with liveness removed; build a trail offline / force AI failure → narrative shows fallback and survives navigate-away.
