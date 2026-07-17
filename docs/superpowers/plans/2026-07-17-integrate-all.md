# feat/integrate-all Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3D Heritage Blueprint genuinely interactive (tappable nodes + camera focus, no UI overlap), auto-surface the next-hunt recommendation after a catch, remove liveness detection, and give the trail narrative a persistent fallback.

**Architecture:** Frontend-only changes to a Next.js 16 / React 19 / React-Three-Fiber PWA. 3D interactivity is added by wiring pointer events onto invisible hit meshes and animating the camera via `useFrame` lerps (no runtime geometry). Layout overlap is fixed by making the canvas fill its container and lifting the focused node above the lore sheet. AI/recommendation changes are small edits to existing handlers and one Zustand store method.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `@react-three/fiber` + `@react-three/drei`, `three`, Zustand + persist, Google Gemini via Vercel AI SDK.

## Global Constraints

- All commands run from `makanmate/` (its own git repo; repo root is NOT git).
- Install with `npm install --legacy-peer-deps` (React 19 peer conflicts) — deps already installed.
- **No test runner exists.** Each task's verification cycle is `npm run build` + `npm run lint` + a concrete manual check in `npm run dev` (http://localhost:3000). Use `NEXT_PUBLIC_MOCK_GPS=true` with stall coords from the README for on-site flows.
- **Demo must never break:** every live path keeps its failsafe. Do not remove camera/GPS fallbacks or AI hardcoded fallbacks.
- **3D stays lightweight:** only manipulate scale/position/active-state/camera — never generate geometry at runtime.
- Commit after each task with a descriptive message.

---

### Task 1: Remove liveness / anti-cheat detection

**Files:**
- Modify: `src/app/scan/page.tsx` (client gate in `handleStallCapture`)
- Modify: `src/lib/orchestrator/orchestrator.ts` (handlers, imports, switch cases)
- Modify: `src/lib/ai/tools.ts` (remove `livenessCheckSchema`)
- Modify: `src/lib/ai/prompts.ts` (remove both liveness prompts)
- Modify: `src/types/ai.ts` (remove modes from union)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on. `mode` union loses `"liveness"` and `"liveness-test"`.

- [ ] **Step 1: Remove the client liveness gate in `src/app/scan/page.tsx`**

In `handleStallCapture`, delete the liveness fetch + gate (currently lines ~100–112). The block to remove:

```js
      const livenessRes = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, mode: "liveness" }),
        headers: { "Content-Type": "application/json" },
      });
      const livenessData = await livenessRes.json();
      const liv = livenessData.result;
      if (liv && !liv.isReal && liv.confidence > 0.7) {
        setToast("That looks like a screen — find the real stall!");
        setScanning(false);
        return;
      }

```

After removal, the `try {` block continues directly with `const nearest = findNearestHeritageNode(...)`. Leave everything from `const nearest` onward untouched.

- [ ] **Step 2: Remove handlers + wiring in `src/lib/orchestrator/orchestrator.ts`**

Delete `handleLivenessTest` (lines ~66–105) and `handleLiveness` (lines ~107–149) — the two full functions.

Remove the now-unused imports: delete `livenessCheckSchema,` from the `@/lib/ai/tools` import block (line 5), and delete `SYSTEM_PROMPT_LIVENESS,` (line 15) and `SYSTEM_PROMPT_LIVENESS_TEST,` (line 19) from the `@/lib/ai/prompts` import block.

Remove the switch cases (lines ~448–451):

```js
      case "liveness-test":
        return await handleLivenessTest(body, start);
      case "liveness":
        return await handleLiveness(body, start);
```

- [ ] **Step 3: Remove the schema in `src/lib/ai/tools.ts`**

Delete the `livenessCheckSchema` export (lines 3–7):

```js
export const livenessCheckSchema = z.object({
  isReal: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});
```

- [ ] **Step 4: Remove prompts in `src/lib/ai/prompts.ts`**

Delete `SYSTEM_PROMPT_LIVENESS_TEST` (line 1) and the entire `SYSTEM_PROMPT_LIVENESS` template (lines 2–22), leaving the file to start at `export const SYSTEM_PROMPT_MENU_VISION`.

- [ ] **Step 5: Remove modes from the union in `src/types/ai.ts`**

Change line 5 from:

```ts
  mode: "vision" | "lore" | "liveness" | "liveness-test" | "magic-lens" | "migration" | "trail-narrative";
```

to:

```ts
  mode: "vision" | "lore" | "magic-lens" | "migration" | "trail-narrative";
```

- [ ] **Step 6: Verify no liveness references remain**

Run: `cd makanmate && grep -rn -i "liveness" src`
Expected: no output.

- [ ] **Step 7: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: both succeed with no errors (no "unused import", no type errors).

- [ ] **Step 8: Manual check**

Run `npm run dev`, go to `/scan`, tap CATCH on a stall (with mock GPS at a stall). Expected: catch proceeds straight to GPS/nearest-node match + card mint; no "looks like a screen" path exists.

- [ ] **Step 9: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: remove liveness/anti-cheat detection"
```

---

### Task 2: Recommendation card auto-shows after catch

**Files:**
- Modify: `src/app/scan/page.tsx` (`handleCatchComplete`, `dismissRecommendation`)

**Interfaces:**
- Consumes: existing `setShowRecommendation`, `recommendation`, `phraseAbortRef`, `setPhrasedSuggestion`, `router`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Auto-show the card in `handleCatchComplete`**

Inside the `if (recs.length > 0) {` branch, after `setRecommendation(rec);`, add `setShowRecommendation(true);`. Result:

```js
      if (recs.length > 0) {
        const rec = recs[0];
        setRecommendation(rec);
        setShowRecommendation(true);
        phraseAbortRef.current?.abort();
        // ...existing phrase-recommendation fetch unchanged...
      }
```

- [ ] **Step 2: Make `dismissRecommendation` just close the card (stay on menu stage)**

Change `dismissRecommendation` from navigating away to closing only:

```js
  const dismissRecommendation = () => {
    phraseAbortRef.current?.abort();
    setPhrasedSuggestion(null);
    setShowRecommendation(false);
  };
```

(Remove the `navigateToPokedex()` call. `onNavigate` and `handleFinish` are unchanged.)

- [ ] **Step 3: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: success. Note: `navigateToPokedex` is still used by `handleFinish`, so no unused-var error.

- [ ] **Step 4: Manual check**

`npm run dev` → `/scan` → catch a stall. Expected: after the catch reveal animation, the "Next Hidden Gem" card slides up automatically. Tap **Navigate** → lands on `/radar` with the recommended pin selected/centered (`?highlight=`). Catch again → tap **Dismiss** → card closes and you remain on the scan/menu screen.

- [ ] **Step 5: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: auto-show next-gem recommendation after catch"
```

---

### Task 3: Trail narrative fallback + persist fix

**Files:**
- Modify: `src/store/useCardStore.ts` (add `updateTrail`)
- Modify: `src/app/trail/page.tsx` (`handleBuildTrail`)

**Interfaces:**
- Produces: `updateTrail(trailId: string, patch: Partial<HeritageTrail>) => void` on `useCardStore`.
- Consumes: existing `addTrail`, `setActiveTrail`, `buildTrail`, `getStallNamesForNarrative`.

- [ ] **Step 1: Add `updateTrail` to the store interface in `src/store/useCardStore.ts`**

In the `CardState` interface, after `addTrail: (trail: HeritageTrail) => void;` add:

```ts
  updateTrail: (trailId: string, patch: Partial<HeritageTrail>) => void;
```

- [ ] **Step 2: Implement `updateTrail` in the store body**

After the `addTrail` implementation (`addTrail: (trail) => set((s) => ({ trails: [...s.trails, trail] })),`) add:

```ts
      updateTrail: (trailId, patch) =>
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, ...patch } : t
          ),
        })),
```

- [ ] **Step 3: Wire persist + fallback in `src/app/trail/page.tsx`**

Get the new action near the other store selectors: add `const updateTrail = useCardStore((s) => s.updateTrail);` alongside `addTrail`.

Replace the body of `handleBuildTrail`'s `try/catch` (the fetch block, ~lines 52–71) so both success and failure write a thread via `updateTrail`:

```js
    try {
      const stallNames = getStallNamesForNarrative(trail, cards);
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ mode: "trail-narrative", stalls: stallNames }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      const thread: string =
        data.result?.historical_thread ?? buildFallbackThread(trail);
      updateTrail(trail.id, { historicalThread: thread });
      setActiveTrail({ ...trail, historicalThread: thread });
    } catch (err) {
      console.error("Trail narrative error:", err);
      const thread = buildFallbackThread(trail);
      updateTrail(trail.id, { historicalThread: thread });
      setActiveTrail({ ...trail, historicalThread: thread });
    } finally {
      setLoadingNarrative(false);
    }
```

- [ ] **Step 4: Add the `buildFallbackThread` helper in `src/app/trail/page.tsx`**

Add this module-level helper (above the component, after imports). It uses only data already on the trail object:

```js
function buildFallbackThread(trail: HeritageTrail): string {
  const origins = trail.culturalDiversity.join(", ");
  const stops = trail.cardIds.length;
  return `Your trail links ${stops} heritage stalls, weaving ${origins} food traditions into one journey through Malaysia's living street-food history.`;
}
```

Ensure `HeritageTrail` is imported in the file (it is used by `buildTrail`'s return type; if not already imported add `import type { HeritageTrail } from "@/types/card";`).

- [ ] **Step 5: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: success.

- [ ] **Step 6: Manual check**

`npm run dev`, catch 3+ stalls, go to `/trail`, build a trail. Expected: narrative section is populated (AI or fallback — force fallback by unsetting the API key or going offline). Navigate away to `/pokedex` and back to `/trail`: the narrative is still there (persisted, not blank).

- [ ] **Step 7: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: persist trail narrative + hardcoded fallback thread"
```

---

### Task 4: Tappable 3D nodes + hover feedback

**Files:**
- Modify: `src/components/blueprint/BlueprintNode.tsx`

**Interfaces:**
- Consumes: `onSelect?: (id, category) => void` (already in prop type), `onNodeTap` passed from `DishCanvas` (already wired via `onSelect={onNodeTap}`).
- Produces: interactive nodes calling `onSelect(id, category)` on tap. Adds an optional `registerObject?: (id: string, obj: THREE.Object3D | null) => void` prop consumed by Task 5.

- [ ] **Step 1: Destructure `onSelect` and add hover state + `registerObject` prop**

Update the component signature to destructure `onSelect` (currently declared but dropped) and accept `registerObject`. Add a `useState` for hover:

```tsx
function BlueprintNode({
  id,
  emoji,
  label,
  category,
  position,
  isActive,
  isExplored,
  onSelect,
  registerObject,
}: {
  id: string;
  emoji: string;
  label: string;
  category: NodeCategory;
  position: [number, number, number];
  isActive: boolean;
  isExplored: boolean;
  onSelect?: (id: string, category: NodeCategory) => void;
  registerObject?: (id: string, obj: THREE.Object3D | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
```

Add the `useState` import: `import { memo, useRef, useState, useEffect } from "react";`

- [ ] **Step 2: Register the group object for camera focus (Task 5 consumes this)**

Add an effect that registers/unregisters the group ref by id (only when interactive):

```tsx
  useEffect(() => {
    if (!onSelect || !registerObject) return;
    registerObject(id, groupRef.current);
    return () => registerObject(id, null);
  }, [id, onSelect, registerObject]);
```

- [ ] **Step 3: Update the scale lerp to include hover**

In the existing `useFrame`, change the target scale line:

```tsx
    const targetScale = isActive ? 1.3 : hovered ? 1.12 : 1.0;
```

- [ ] **Step 4: Add an invisible hit mesh with pointer handlers**

Inside the returned `<group ref={groupRef} position={position}>`, immediately after the existing glow `<mesh>`, add a transparent hit sphere. Only interactive when `onSelect` is provided:

```tsx
      {onSelect && (
        <mesh
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect(id, category);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
```

Leave both `<Html>` billboards with `pointerEvents: "none"` so labels never block the raycast.

- [ ] **Step 5: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: success.

- [ ] **Step 6: Manual check**

`npm run dev` → `/pokedex/<any caught dish>`. Expected: tapping an actual 3D node (ingredient/technique/migration/dialect sphere) opens its lore sheet — same as tapping the DOM pill. Hovering a node on desktop shows a pointer cursor and a slight scale bump. Drag still rotates the scene.

- [ ] **Step 7: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: make 3D blueprint nodes tappable with hover feedback"
```

---

### Task 5: Camera focus, ring freeze, canvas fill, ring re-spacing

**Files:**
- Modify: `src/components/pokedex/DishCanvas.tsx`

**Interfaces:**
- Consumes: `BlueprintNode`'s `registerObject` + `onSelect` props (Task 4), `activeNodeId` (already a prop).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add imports and a node-object registry**

At the top of `DishCanvas.tsx`, ensure imports include `useRef`, `useMemo`, `useCallback`, `useEffect` from react and `useThree` from `@react-three/fiber`:

```tsx
import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
```

Inside `DishCanvas`, add a ref-map and a stable register callback (before the `return`):

```tsx
  const nodeObjects = useRef<Map<string, THREE.Object3D>>(new Map());
  const registerObject = useCallback((id: string, obj: THREE.Object3D | null) => {
    if (obj) nodeObjects.current.set(id, obj);
    else nodeObjects.current.delete(id);
  }, []);
```

- [ ] **Step 2: Freeze ring rotation while a node is focused**

Add a `frozen` prop to `OrbitalRing` and guard its `useFrame`:

```tsx
function OrbitalRing({
  radius,
  speed,
  color,
  frozen = false,
  children,
}: {
  radius: number;
  speed: number;
  color: string;
  frozen?: boolean;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !frozen) {
      groupRef.current.rotation.y += delta * speed;
    }
  });
```

Pass `frozen={activeNodeId !== null}` to each of the four `<OrbitalRing>` usages.

- [ ] **Step 3: Add the `CameraFocus` controller component**

Add this component in the file (module scope, above `DishCanvas`). It lerps the OrbitControls target + camera dolly toward the active node (lifted into the upper area), and back to defaults when none is active:

```tsx
const DEFAULT_CAM = new THREE.Vector3(0, 2, 7);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const _nodePos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _camGoal = new THREE.Vector3();

function CameraFocus({
  activeNodeId,
  nodeObjects,
  controlsRef,
}: {
  activeNodeId: string | null;
  nodeObjects: React.RefObject<Map<string, THREE.Object3D>>;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = Math.min(1, delta * 3);

    const obj = activeNodeId ? nodeObjects.current?.get(activeNodeId) : null;
    if (obj) {
      obj.getWorldPosition(_nodePos);
      // target slightly below the node so the node renders in the upper ~60%
      _target.copy(_nodePos).add(new THREE.Vector3(0, -0.8, 0));
      // camera pulls in along the node's outward direction
      const dir = _nodePos.clone().setY(0).normalize();
      _camGoal.copy(_nodePos).add(dir.multiplyScalar(3)).add(new THREE.Vector3(0, 1.2, 0));
    } else {
      _target.copy(DEFAULT_TARGET);
      _camGoal.copy(DEFAULT_CAM);
    }

    controls.target.lerp(_target, t);
    camera.position.lerp(_camGoal, t);
    controls.update();
  });

  return null;
}
```

- [ ] **Step 4: Hold an OrbitControls ref, disable auto-rotate when focused, mount CameraFocus**

In `DishCanvas`, add `const controlsRef = useRef<any>(null);`. Update `<OrbitControls>`:

```tsx
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate={activeNodeId === null}
          autoRotateSpeed={0.3}
          minDistance={4}
          maxDistance={12}
        />
        <CameraFocus activeNodeId={activeNodeId} nodeObjects={nodeObjects} controlsRef={controlsRef} />
```

- [ ] **Step 5: Pass `registerObject` to every interactive `BlueprintNode`**

Add `registerObject={registerObject}` to each `<BlueprintNode>` that already has `onSelect={onNodeTap}` (the ingredient, technique, migration, and dialect nodes). Do NOT add it to the center node.

- [ ] **Step 6: Make the canvas fill its container**

Change the wrapper div (line 78) from `height: "60vh"` to `height: "100%"`:

```tsx
    <div style={{ width: "100%", height: "100%", visibility: paused ? "hidden" : "visible" }}>
```

- [ ] **Step 7: Re-space the orbital rings to end node collision**

Update the memoized positions and the ring radii so no two rings share a radius, and move migration to the outermost orbit:

- `ingredientPositions`: `distributeOnRing(dish.ingredients.length, 2.2)`
- `techniquePositions`: `distributeOnRing(dish.techniques?.length ?? 0, 3.4, 0.4)`
- `dialectPositions`: `distributeOnRing(dish.dialectPhrases?.length ?? 0, 4.4, 0.5)`

Ring usages: Ingredients `<OrbitalRing radius={2.2} ...>`, Techniques `<OrbitalRing radius={3.4} ...>`, Dialect `<OrbitalRing radius={4.4} ...>`, and Migration `<OrbitalRing radius={5.4} ...>` with its node `position={[5.4, 0, 0]}`.

- [ ] **Step 8: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: success. (If lint flags `any` on the controls ref, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above those lines to match how the codebase handles drei refs, or type as `import('three-stdlib').OrbitControls` if already available.)

- [ ] **Step 9: Manual check**

`npm run dev` → `/pokedex/<dish>`. Expected: tapping a node → the scene stops idling and the camera smoothly glides to frame that node in the upper part of the view; closing returns to the idle orbit. Rings no longer overlap (migration node sits on its own outer orbit). Canvas fills the available area.

- [ ] **Step 10: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: camera focus + ring freeze + canvas fill + ring re-spacing"
```

---

### Task 6: Blueprint layout — compact bar, collapsible pill index, no overlap

**Files:**
- Modify: `src/app/pokedex/[dishId]/page.tsx`
- Modify: `src/components/blueprint/NodeDetailOverlay.tsx`

**Interfaces:**
- Consumes: existing state/handlers on the page (`handleNodeTap`, `activeNodeId`, `exploredNodeIds`, `canEvolve`, etc.).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Cap the lore sheet height in `src/components/blueprint/NodeDetailOverlay.tsx`**

Confirm the scroll body uses `max-h-[42vh]` (currently `max-h-[40vh]`); update to `max-h-[42vh]`:

```tsx
        <div className="px-4 pb-4 max-h-[42vh] overflow-y-auto">
```

- [ ] **Step 2: Add a `pillsOpen` toggle state in `src/app/pokedex/[dishId]/page.tsx`**

With the other `useState` hooks add: `const [pillsOpen, setPillsOpen] = useState(false);`

- [ ] **Step 3: Condense header + progress + evolve into one compact bar**

Replace the current header block, `DishMetaCard` wrapper, node-progress bar, legend block, and the standalone evolve block (the JSX from the header down to just before the "Node picker" comment) with a single compact top bar. Keep the back link, dish name, a progress readout, and the evolve button:

```tsx
      {/* Compact top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[var(--surface)]/85 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <Link href="/pokedex" className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm shrink-0">
          &larr;
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-sm font-black text-[var(--accent-primary)] truncate">{dish.name}</h1>
          <p className="text-[10px] text-[var(--text-muted)]">{exploredCount}/{totalNodes} explored</p>
        </div>
        {canEvolve ? (
          <button
            onClick={() => setShowQuiz(true)}
            className="shrink-0 px-3 py-1.5 rounded-full font-bold text-xs text-white shadow-[0_3px_0_var(--border)] active:translate-y-[3px] active:shadow-none transition-all animate-pulse-warm"
            style={{ background: card && card.tier === "bronze" ? "var(--tier-silver)" : "var(--tier-gold)" }}
          >
            ⚡ Evolve
          </button>
        ) : (
          <span className="shrink-0 text-xs font-bold text-[var(--tier-gold)]">{card && card.tier === "gold" ? "🥇" : ""}</span>
        )}
      </div>
```

(`exploredCount` and `totalNodes` are already computed further down — move those two `const` declarations above this JSX so they're in scope, or keep them where they are if already above the `return`. They are currently computed before `return`, so they are in scope.)

- [ ] **Step 4: Wrap the canvas + overlays and mount the collapsible pill index inside the canvas container**

The `{/* 3D Blueprint Canvas */}` container stays `relative flex-1`. Move the entire existing node-picker pill block (the `flex flex-wrap` of ingredient/technique/migration/dialect buttons) INTO this container as an absolutely-positioned, collapsible strip, plus a toggle button. Add at the end of the `relative flex-1` div (after the NodeDetailOverlay blocks):

```tsx
        {/* Pill index toggle (failsafe interaction) */}
        <button
          onClick={() => setPillsOpen((v) => !v)}
          className="absolute top-2 right-2 z-30 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-sm active:scale-95"
        >
          {pillsOpen ? "✕" : "≡ Index"}
        </button>
        {pillsOpen && (
          <div className="absolute top-12 left-2 right-2 z-30 flex gap-1.5 overflow-x-auto pb-2 rounded-xl bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-sm p-2">
            {/* ...the existing pill buttons, moved here verbatim... */}
          </div>
        )}
```

Move the existing pill `<button>` elements (ingredients, techniques, migration, dialect) verbatim into the `pillsOpen` container, changing the outer wrapper from `flex flex-wrap justify-center` to the horizontal-scroll row above. Keep each button's `onClick={() => handleNodeTap(...)}` and styling. Wrap the buttons in a `whitespace-nowrap` flex so they scroll horizontally.

- [ ] **Step 5: Remove now-unused imports/vars**

If `DishMetaCard` is no longer rendered, remove its import (`import DishMetaCard from "@/components/pokedex/DishMetaCard";`). Keep `Link`. Run lint to catch any other unused symbols (e.g. legend array).

- [ ] **Step 6: Build + lint**

Run: `cd makanmate && npm run lint && npm run build`
Expected: success, no unused-import errors.

- [ ] **Step 7: Manual check**

`npm run dev` → `/pokedex/<dish>` on a narrow (mobile) viewport. Expected: one compact bar on top; the 3D fills the rest; tapping a node opens the lore sheet at the bottom WITHOUT covering the focused node (camera lifted it up); the `≡ Index` button opens a horizontal-scroll pill row as a fallback; no elements overlap; quiz/evolution modals still open above everything.

- [ ] **Step 8: Commit**

```bash
cd makanmate && git add -A && git commit -m "feat: blueprint compact bar + collapsible pill index, fix overlap"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (tappable 3D + camera focus) → Tasks 4 (tappable/hover) + 5 (camera focus, ring freeze, canvas fill, ring re-spacing). ✓
- Spec §2 (layout/overlap) → Task 6 (compact bar, collapsible pills, sheet cap) + Task 5 Step 6 (canvas fill) + Step 7 (ring re-spacing). ✓
- Spec §3 (rec auto-show + dismiss-closes) → Task 2. ✓
- Spec §4 (remove liveness, full cleanup) → Task 1 (client + orchestrator + tools + prompts + types). ✓
- Spec §5 (trail fallback + persist + `updateTrail`) → Task 3. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases". The one "moved here verbatim" (Task 6 Step 4) refers to existing code being relocated, with explicit instructions — acceptable, not a placeholder.

**Type consistency:** `registerObject: (id: string, obj: THREE.Object3D | null) => void` is defined identically in Task 4 (producer) and Task 5 (consumer). `updateTrail(trailId, patch: Partial<HeritageTrail>)` is consistent between store (Task 3 Step 1/2) and caller (Task 3 Step 3). `onSelect(id, category)` matches the existing `NodeCategory` typing. `frozen?: boolean` on `OrbitalRing` consistent within Task 5.

**Ordering:** Tasks 1–3 are independent and low-risk (do first). Task 4 must precede Task 5 (Task 5 consumes `registerObject`). Task 6 last (verifies overlap once camera-focus + canvas-fill exist).
