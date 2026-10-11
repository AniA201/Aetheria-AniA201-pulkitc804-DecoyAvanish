# Aetheria request checklist and handoff

Current review: [PR #6](https://github.com/AniA201/Aetheria/pull/6), branch `codex/final-polish`. The preview runs at `http://127.0.0.1:5176/` with the backend proxied through `/api`. Use parallel agents for independent frontend, backend, and visual checks when the account allows them; agents share this checkout, so assign disjoint files.

## Requested work

- [x] Keep the participant navigation collapse/restore arrow visible above page content, make it white, and ensure it reopens on Ask, Your form, and Read. The Ask collapse/reopen control was clicked successfully in the preview on October 11.
- [x] Center the fifth Your form section card when there is no sixth card. Combine Your form and Read under one participant navigation item while keeping the reader route accessible from the form cards.
- [x] Round Summary cards to match the rest of the participant UI.
- [x] Move Ask's question below the larger green/gray dotted globe, avoiding overlap. Replace the old centered bubbles with faded text prompts whose hover/focus grows smoothly with a dark glow and blurred text trail. The latest request arranges 12 prompts in three even rows on desktop, with responsive rows on narrower screens. Keep them off the navigation rail and preserve accessible button labels.
- [x] Align Ask's question input, send, and dictate controls; remove white background squares and gradients behind that page and use dark contour shadows.
- [x] Use volcanic gray `#3C3F44` as the third palette color, Powder `#F7F7F2` for ordinary light surfaces, mint and teal for the remaining palette. Remove warm yellow/brown surface values and retain a subtle purple hover/focus accent on buttons. Keep pure white where high-contrast mode needs it.
- [x] Update account pages: prominent blurred Aetheria wordmark, document-like 3D orbit instead of plus shapes, logo-mark account icon, no decorative corner `01`, and unclipped showcase title. Make the original document dense and the plain-language counterpart short and simple.
- [x] Connect the team backend and SQLite configuration. Researcher registration uses the case-sensitive key from the ignored local backend environment file; the checked-in example now contains a placeholder. Live tests covered wrong/right key, duplicate account, sign-in, and role mismatch. Prior round-trip tests covered document handoff and follow-up retrieval.
- [x] Landing page: resolve hero overlap, align section-title sizes, add three brief points per section, keep highlight quotes text-only and hoverable, shorten their dividers, and add “Clinical” to the study-documents brand line.
- [x] Restore the large landing Aetheria shatter. Letters now separate gradually over a long scroll distance, with motion blur, a Three.js glyph layer, and a visible DOM-letter fallback. Scrolling back reassembles the word. A preview scroll verified the letters in flight on October 11.
- [x] Transfer the hero's lowercase `r` toward Read during the shatter, change it smoothly to uppercase, and reveal the native Read heading letter when it lands. Keep a gentle hover loop and respect reduced-motion mode.
- [x] Change the login heading to Welcome, simplify the plain-language sample document, make the participant Start continuation arrow white, and place the Ask microphone left of Send in aligned circular controls.
- [x] Make the Ask globe respond to cursor movement with damped spin, while keeping reduced-motion mode static. Center the Ask input text and circular controls, avoid clipped tops, and soften their dark shadows. Use a subtle translucent purple inset tint on button hover/focus while preserving text-only prompt hover.
- [x] Expand the empty Start upload card to fill the available page space, round its edges, and give its file target a soft paper treatment with a clear hover/focus state.
- [x] Center the fifth “Your form at a glance” item across the two-column Start list when the section count is odd.
- [x] Restore this checkout's existing ignored Gemini credentials from the older local Aetheria checkout. `/gemini/status` now reports configured and a real generation request succeeded. Add startup diagnostics and a short client retry interval so a key added after startup does not leave Gemini disabled for the whole browser session.
- [x] Keep the local preview open and push completed work to PR #6.

## Verification

- `npm test`: 100 passed, 1 skipped (October 11).
- `npm run build`: passed (October 11); Vite still reports the existing PDF standard-font URL and bundle-size warnings.
- Browser: landing title visible at the top, letters visibly separated mid-scroll, and Ask text prompts displayed at desktop width. Participant nav collapsed and reopened. Ask at 390 px had no horizontal overflow.
- Gemini relay: configured status and HTTP 200 generation on October 11; local env files remain ignored and untracked.

## Operational notes

- Restart FastAPI after changing `backend/.env`; the researcher key is case sensitive. Keep real values out of tracked files. An earlier version of the example file exposed the key in Git history, so rotate it before real-world use.
- Restart Vite after changing `.env.local` or `.env.keys`; the Gemini key and team decryption key belong in those ignored files, never in the PR.
- The account's agent usage cap interrupted earlier audit agents. Their changes were integrated and checked in this PR; remaining future work can be distributed as separate agent tasks.
