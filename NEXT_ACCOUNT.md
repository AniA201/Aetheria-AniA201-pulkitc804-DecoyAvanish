# Next-account handoff

## Status

This batch is ready for PR review after the validation listed below. The current branch adds backend verification, account-page motion, the finalized volcanic-gray accent, purple hover under-glows, landing-page refinements, and participant-page layout fixes.

## Pinned next change: replace plain white with a light cream

The next account should make the site’s remaining pure-white and near-white surfaces a very slight cream. This is intentionally **not** included in the current batch so it can be reviewed as one cohesive visual change rather than mixed into unrelated fixes.

Audit these surfaces together:

- Auth cards, forms, and fallback documents.
- Participant cards, inputs, and reading surfaces.
- Landing document mockups and paper previews.
- Three.js document textures and fallback canvases.
- High-contrast mode, which must keep its required black/white contrast.

Use the existing paper family (for example `#f4f1e8` / `#f8f6ee`) rather than introducing a new white-like color. Keep text contrast readable.

## Efficient delegation plan

Use agents/subagents in separate file scopes before touching the cream conversion:

1. **CSS surface audit agent** — inventory white or near-white values in `src/styles.css` and propose token replacements only.
2. **Three.js texture agent** — update `src/scene/documentTextures.ts`, `src/scene/AuthFolio3D.tsx`, `src/scene/ConsentSheet.tsx`, and `src/scene/MedicalField.tsx` only.
3. **Visual QA agent** — check landing, register, login, participant home, my-study, read, ask, check, and summary at desktop and mobile widths; report contrast or overlap regressions without editing.

The primary agent should apply the consolidated token changes, run all tests and build once, then create a focused follow-up PR.

## Follow-up visual checks

- The landing word currently shatters with smooth blurred CSS letter motion while the existing Three.js medical field continues behind it. If a literal WebGL glyph shatter is still desired, make it a dedicated, reduced-motion-safe Three.js component rather than layering another canvas over interactive content.
- Recheck the new account page’s document-orbit animation at narrow widths.
- Recheck all 12 Ask prompts at desktop, tablet, and phone widths; they should remain away from the rail and input controls.

## Backend configuration and validation

Local `backend/.env` is intentionally ignored by Git and contains the database URL plus the supplied case-sensitive researcher registration key. `backend/main.py` now resolves `sqlite:///./aetheria.db` from the backend directory, so launch location cannot point to the wrong database.

The running service was verified end to end with temporary records that were deleted afterward:

- health check
- participant registration
- incorrect researcher-key rejection
- exact-key researcher registration
- authenticated teach-back handoff
- researcher follow-up
- participant message retrieval

## Required commands

```sh
npm run api
npm test
npm run build
```
