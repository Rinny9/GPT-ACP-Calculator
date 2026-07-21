# ACP Field Calc — ALS PCS 5.4

Static, offline-capable clinical calculation and directive-reference app for Ontario ALS PCS 5.4. The production app is the root `index.html`; it does not require a build step.

## Publish

Upload these files to the repository root:

- `index.html`
- `sw.js`
- `manifest.webmanifest`
- `icon.svg`

Enable GitHub Pages from the repository root. Open the deployed page once while connected, wait for **Offline pack ready**, and test it in airplane mode before field use. See `UPLOAD.md` for the short checklist.

## Key safeguards

- Age-unknown mode suppresses age-gated branches instead of applying adult defaults.
- kg/lb and years/months/days selectors convert the entered value.
- Tidal volume is shown only from adult predicted body weight with valid height and sex; actual weight is never substituted.
- Estimated weights, draw-up volumes, local stock concentrations, and PDC reference-band differences are prominently flagged.
- New-patient reset clears patient-specific state, manual pediatric overrides, timers, and the critical-call event log while preserving the local field profile.
- The service worker precaches the app shell for offline access.

## Clinical disclaimer

This is educational decision support, not a certified medical device. It must not be used clinically until independently validated and approved through the appropriate service/base-hospital governance process. Confirm every calculation against the current ALS PCS, Companion Document, local RBHP direction, service authorization, patient factors, equipment, medication vial, and concentration.

The older `src/` React/Vite prototype remains in the repository for history but is not the production page and should not be used for deployment or clinical validation.

Run the dependency-free calculation regression suite with `npm run test:field` (or `node tests/safety.test.js`).
