# Swing Lab

Installable web application for reviewing golf swing videos. This checkout is the working source; earlier preview folders outside it are preserved snapshots.

## Local analysis and learning feedback: v33

The main app uses only the on-device phase marker. Videos are decoded separately from the review player and never uploaded. Source presentation timestamps replace assumed 30 fps when readable; other sources use explicitly labelled time steps. Every model run retains its proposal and weight identity.

Manual phase changes retain their original proposal and correction history. Saving captures up to six source frames around both the proposal and correction, or a labelled time window for unsupported timing. Phase confirmation is explicit and later changes invalidate it. Learning ZIP exports include metadata and context previews by default, with optional original videos. Feedback images, session metadata and original video writes commit atomically, and deletion removes their associated feedback.

See [the private feedback and training workflow](TRAINING.md). Historical GLAB material can be inventoried and prepared locally; it is never published with the app and is treated as development data. No automatic retraining occurs.

## Local marking lab: v32

The experimental [marking lab](lab/) defines the five phase events and compares a frozen local ONNX candidate with real GLAB snapshots and editable, revisioned references. It is independent of production session data. See [the lab protocol and usage](lab/README.md). Private reference videos and their derived metadata remain in the local pack and are not included in the published site.

## Pilot frontend: v31

- One canonical interface stylesheet (`ui.css`) with consistent icon slots, touch controls, spacing and screen scrolling. Existing editor rules are isolated in a lower-priority CSS layer.
- Honest account-free first launch, direct return to Home on later visits, an in-app review guide, contextual empty states and accessible dialogs.
- A guided video → review → report flow, an explicit save action, unsaved/saving/saved status, and non-blocking save confirmation. Capture actions are enabled only when a decoded video and phase marks are available.
- Searchable history with open, report, rename and delete actions. Comparison keeps the selected pair when a third item is tapped and includes an explicit overlay action.
- Fullscreen drawing and comparison dialogs support keyboard dismissal and keep background controls out of the focus order. Save image downloads the displayed frame with its annotations.
- Local pilot feedback notes can be copied for sharing. Nothing is submitted automatically. See [TESTING.md](TESTING.md) for the pilot walkthrough.

Validated on 22 October 2026: all 19 logic tests and 13 browser integration checks passed in Edge. Frontend checks passed at 320×568, 390×844, 768×1024 and 1440×900, including icon centering, navigation baselines, profile persistence, history search, comparison selection and overlay navigation. Real-device camera, codec and installation behavior remain part of the pilot.

### Light interface foundation: v30

- White and mint surfaces, a compact wordmark with the original swing arc and tagline, and a single prominent New analysis entry point.
- Persistent five-tab navigation: Home, My swings, New analysis, Compare and Profile. Inactive screens are removed from keyboard navigation.
- Existing upload, camera, phase capture, reports, notes, original-video storage, annotation tools and comparison workflows are retained. The annotation and comparison overlays retain dark controls.
- Profile name and recording preferences now persist in local browser storage. Engine URL, service status, installation and clearing local history remain available in Profile.
- Analysis streak shows saved sessions in the current local Monday-to-Sunday week. Multiple sessions on one day count individually, with one practice indicator for that day. Profile counts come from actual stored history.
- Both entry pages and the new theme/wordmark are included in the versioned offline cache. Session storage and its migration format are unchanged.

Run `npm run test:frontend` for responsive layout, navigation, preferences and activity regression checks. This uses the same Playwright/browser environment options as `test:browser` below.

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

## Analysis and remaining work

Reviewed references can be imported from a private JSON file in Profile. Match the original video, compare the reviewer, five marks and uncertainty ranges, then explicitly apply and save. Importing only updates a separate local reference library; it does not replace saved session marks. Newer reference versions keep the previous version, and conflicting versions with the same date are rejected atomically. Applying retains previous marks/review metadata and existing model runs. The library uses the existing IndexedDB meta store, without a database upgrade. On localhost, the local review server can provide its private library directly and open a selected reviewed clip without a file picker. No real references or videos ship in this repository.

Assisted references remain identifiable in saved sessions and feedback exports. Their uncertainty ranges are retained, and the training importer excludes them from point-label and validity training pending human adjudication. Re-running the marker preserves applied references and records a separate proposal. Clearing session history keeps the separate reference library.

The main app offers only the local marker. Old service URLs and `engine` query parameters are ignored. Profile provides offline preparation instead of an external service address. GLAB is preserved separately and is available only through the explicit laboratory comparison tools.

The local model uses frozen GLAB weights and still needs visual review. The motion filter is not a trained swing-presence classifier; other movement can receive phase proposals. Users can explicitly mark a clip as having no swing, with negative feedback kept separate from phase labels. See [TRAINING.md](TRAINING.md) for the private feedback, label reconciliation and evaluation workflow.

Validated for this version: 54 logic checks, 13 session/browser checks, 10 integrated learning checks, nine marking-lab checks, four segment checks and four reference-library checks. Responsive frontend checks also passed. Tests include real on-device inference, three-source-frame corrections, model proposal preservation, correction-image rollback, local ZIP export, source timing, reference identity/version conflicts, uncertainty persistence and offline use. They do not establish phase accuracy or real-phone performance.

Remaining work includes independent phase/validity evaluation, candidate training, Android/iOS camera and installation testing, numerical swing analysis, validated coaching guidance, full session backup and optional synchronization.

## Local hybrid marking - v0.36.0

The main app now uses local-mark-v0.4: motion-compensated swing selection, the
existing frozen GLAB model, and optional local audio evidence. No weights were
retrained. The optional impact helper sits below video playback: pause at visible
contact or ball departure, choose **Mark impact here**, then **Analyze from my
impact**. Source-frame buttons become available when readable presentation
timestamps are available; unknown timing retains labelled 20 ms steps.

A supplied impact is held fixed by the ordered temporal decoder. The original
video, manual reference and its provenance, baseline proposals, audio candidates
and resulting run are saved locally. Clearing the reference retains existing phase
marks; clearing all phases or declaring no swing removes it. Manual/confirmed
phase corrections are not overwritten by reruns. The phase audit labels supplied
impact as a reference and omits its model-error delta.

Without a manual reference, the marker considers the audio candidate nearest its
visual impact. Agreement within 250 ms permits anchored refinement; unavailable
audio, disagreement or refinement failure keeps the visual proposal and offers
manual help. Agreement is not calibrated confidence. Static rejection, view
restrictions, explicit segment bounds and cancellation remain active. Processing
stays local and the required hybrid assets are included in both offline caches.

Verification: 73 logic/regression checks passed, including pipeline orchestration,
manual impact, failure/cancellation paths, provenance normalization, reference
locking, and save/reload behavior in the app harness. Frozen-model hashes and
Python/JavaScript decoder parity also pass. The end-to-end browser test is
available as npm run test:impact or node tests/impact-browser.cjs. When Playwright
is installed outside this repository, set PLAYWRIGHT_MODULE_PATH. Edge launch in
this environment failed with access-denied/profile errors before page creation.

Browser rendering, actual phone latency and independent phase accuracy remain
unverified. Historical 17-clip development measurements are exploratory, not
production accuracy claims for this integration. Release v0.36.0 includes this integration.
