# Next-account handoff

## Completed on PR #5

- Standardized ordinary light surfaces on **Powder** (`#F7F7F2`), while retaining pure white only for high-contrast mode.
- Updated document canvases and 3D models to use the same Powder paper surface.
- Reworked the Ask Aetheria empty state: compact outlined prompt capsules, varied section prompts, no bright panels, and an aligned input/send/dictate control with dark contour shadows.
- Replaced landing-page highlight rows with compact chips, and slowed the landing wordmark breakup to a staggered ~1.5-second transition with reduced-motion support.
- Made the account-page 3D source document visibly dense and clinical, while the plain-language side is sparse and easy to scan.

## Validation run

```sh
npm test
npm run build
```

Both pass. The build retains its existing PDF-worker and chunk-size warnings.

## Remaining visual checks

- Review authenticated participant pages at desktop and phone widths after sign-in, especially the Ask prompt capsule density and narrow input controls.
- If a literal WebGL glyph shatter is still wanted beyond the current smooth CSS letter breakup, add it as a reduced-motion-safe dedicated component rather than layering a canvas above controls.
