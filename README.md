# Swing Lab

Installable web application for reviewing golf swing videos. This checkout is the working source; earlier preview folders outside it are preserved snapshots.

## Current correction: v29

- A session owns its original video, notes, phase marks, captures and drawings.
- Metadata and original video save atomically in IndexedDB. A failed save leaves the previous saved session intact and shows an error. No sessions are automatically evicted to meet a fixed count.
- Existing `swinglab_history_v19` metadata migrates once. Its original localStorage data remains as a recovery copy. Legacy sessions without original videos remain readable as reports and never inherit another session's player.
- Switching sessions hydrates notes and drawings. Unsaved changes require confirmation before being discarded. Reloading a saved session restores its video offline.
- Analysis requests have a 60-second deadline, are cancelled when changing media or service, and cannot apply results to another session. Manual phase changes take precedence over pending estimates.
- Changing a phase invalidates its capture. Captures wait for decoded video seeks and are committed as a complete batch to the originating session.
- The service worker precaches the exact versioned assets, preserves each page's own route, and cleans only caches belonging to its installation scope. It does not cache API calls, videos or HTTP error responses.
- All sessions are selectable for comparison. Angle calculations use the canvas aspect ratio and handle zero coordinates.

## Running locally

Serve this directory with a static HTTP server and open `index.html`. Use HTTPS or localhost for service worker support; opening files directly is unsuitable for validating PWA installation. There is no build step.

New saves belong to the current browser profile and site origin. Open the corrected app at the same deployed origin/path to migrate that browser's old history. A localhost preview has separate data. Browser storage is not a backup; export and cross-device synchronization are not implemented yet.

## Verification

Node.js 24 or newer:

```sh
npm test
```

The logic suite uses only built-in Node modules. It covers session isolation, persistence failures, manual changes during analysis, cancellation and deadlines, schema validation, geometry and cache behavior.

Browser integration:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

Alternatively set `PLAYWRIGHT_MODULE_PATH` to an existing Playwright module and `BROWSER_EXECUTABLE` to a compatible browser executable. Tests use an isolated temporary browser profile and a local server. They create a synthetic WebM locally and do not upload videos to any external service.

Browser tests cover IndexedDB migration, real video decoding/capture, atomic rollback when video storage fails, notes/drawing recovery after reload, switching sessions, both start pages offline, and deleting sessions and original videos. Test hooks are added only by the test HTTP server; they are not exposed by the deployed application.

Validated on 14 October 2026: 19 logic tests and 13 browser integration checks passed in headless Edge. Android/iOS camera, installation and device-specific behavior still need testing.

## Analysis service and remaining work

The external analysis server is not included in this repository. Configure an HTTP(S) service through Engine URL. The client checks `/health` (with a HEAD fallback for services returning 404/405), then submits a multipart video to `/analyze`. It retries the `file`, `video` and `upload` fields only on HTTP 422. A URL supplied in a page query requires confirmation before use.

This correction makes the existing integration safer; it does not establish the accuracy of the external model. Current phase/frame conversion still assumes 30 fps. A documented response contract, source frame rates, validation against real swings, confidence estimates, useful coaching tips and exercises belong to the next phase.

Other remaining work: video quality checks, annotated report snapshots (the old Shot action does not generate one), full export/backup, accessibility, preferences, and optional accounts/synchronization. The local v28 fullscreen interaction changes are intentionally separate from these fixes.
