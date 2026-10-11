# Aetheria request checklist and handoff

Current review: [PR #6](https://github.com/AniA201/Aetheria/pull/6), branch `codex/final-polish`. The preview runs at `http://127.0.0.1:5176/` with the backend proxied through `/api`. Use parallel agents for independent frontend, backend, and visual checks when the account allows them; agents share this checkout, so assign disjoint files.

## Requested work

- [x] Keep the participant navigation collapse/restore arrow visible above page content, make it white, and ensure it reopens on Ask, Your form, and Read. The Ask collapse/reopen control was clicked successfully in the preview on October 11.
- [x] Center the fifth Your form section card when there is no sixth card. Combine Your form and Read under one participant navigation item while keeping the reader route accessible from the form cards.
- [x] Round Summary cards to match the rest of the participant UI.
- [x] Move Ask's question below the larger green/gray dotted globe, avoiding overlap. Replace the old centered bubbles with 17 scattered faded text prompts across the content area; their hover/focus grows smoothly with a dark glow and blurred text trail. Keep them off the navigation rail and preserve an accessible button label.
- [x] Align Ask's question input, send, and dictate controls; remove white background squares and gradients behind that page and use dark contour shadows.
- [x] Use volcanic gray `#3C3F44` as the third palette color, Powder `#F7F7F2` for ordinary light surfaces, mint and teal for the remaining palette. Remove warm yellow/brown surface values and retain a subtle purple hover/focus accent on buttons. Keep pure white where high-contrast mode needs it.
- [x] Update account pages: prominent blurred Aetheria wordmark, document-like 3D orbit instead of plus shapes, logo-mark account icon, no decorative corner `01`, and unclipped showcase title. Make the original document dense and the plain-language counterpart short and simple.
- [x] Connect the team backend and SQLite configuration. Researcher registration uses the case-sensitive key from the ignored local backend environment file; the checked-in example now contains a placeholder. Live tests covered wrong/right key, duplicate account, sign-in, and role mismatch. Prior round-trip tests covered document handoff and follow-up retrieval.
- [x] Landing page: resolve hero overlap, align section-title sizes, add three brief points per section, keep highlight quotes text-only and hoverable, shorten their dividers, and add “Clinical” to the study-documents brand line.
- [x] Restore the large landing Aetheria shatter. Letters now separate gradually over a long scroll distance, with motion blur, a Three.js glyph layer, and a visible DOM-letter fallback. Scrolling back reassembles the word. A preview scroll verified the letters in flight on October 11.
- [x] Keep the local preview open and push completed work to PR #6.

## Verification

- `npm test`: 99 passed, 1 skipped (October 11).
- `npm run build`: passed (October 11); Vite still reports the existing PDF standard-font URL and bundle-size warnings.
- Browser: landing title visible at the top, letters visibly separated mid-scroll, and Ask text prompts displayed at desktop width. Participant nav collapsed and reopened. Ask at 390 px had no horizontal overflow.

## Operational notes

- Restart FastAPI after changing `backend/.env`; the researcher key is case sensitive. Keep real values out of tracked files. An earlier version of the example file exposed the key in Git history, so rotate it before real-world use.
- The account's agent usage cap interrupted earlier audit agents. Their changes were integrated and checked in this PR; remaining future work can be distributed as separate agent tasks.
