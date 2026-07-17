# Manual Test: 03 — Curation Pipeline

This is a behind-the-scenes build-time script (not user-facing). It's a demo/pitch feature showing the agentic AI pipeline.

## How to test (demo walkthrough)

1. Open a terminal and run:
   ```
   npx tsx scripts/curate-stall.ts --city "Penang" --type "hawker"
   ```

2. Watch the terminal output

- [ ] Scout agent searches and finds stall candidates
- [ ] Verifier cross-checks each stall's claims (founding year, cultural origin, signature dish)
- [ ] If sources disagree, it re-searches to resolve the conflict
- [ ] Enricher adds tags and heritage scores
- [ ] Quality gate rejects duplicates and outputs final results
- [ ] Pipeline ends with a summary of how many new stalls were curated

3. Try a different city

   ```
   npx tsx scripts/curate-stall.ts --city "KL" --type "kopitiam"
   ```

- [ ] Finds different stalls for the new city/type
