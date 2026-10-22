# Swing Lab — small group pilot

Open https://volinga14.github.io/GLAB/ on your own phone. No account is required. Reviews and feedback notes stay in the browser on that device.

## A 10-minute walkthrough

1. **Start and personalise.** Tap Get started, open Profile and enter your name. Choose your dominant hand, camera view and preferred club. Return Home. Check whether the navigation and main action are obvious.
2. **Review a swing.** Tap New analysis and choose a short video with your whole body visible. Play, pause and step through it. Tap an unmarked phase to mark the current frame. Use Mark to adjust an existing phase.
3. **Create and save.** Mark at least two phases, tap Create captures, add a short note and save. The confirmation should not interrupt your work. Reload the app and open the review from My swings. The original video, captures and notes should still be there.
4. **Draw and export.** Open drawing tools. Try a line, angle and guide; collapse the tools if they obscure the video. Save image should download an annotated frame. Tap Done and save the session to keep drawings with it.
5. **Find and compare.** Save another video. Find a session using the history search, edit its name and open its report. In Compare, select two sessions and open the comparison. Adjust layers, opacity, zoom and phase, then close it.
6. **Share feedback.** In Profile → Help & testing, write down anything confusing, misplaced, too small or difficult to tap. Copy feedback and share it with the person who invited you. No feedback is sent automatically.

## What to report

- Phone model, operating system and browser.
- The screen and action you were trying to use.
- What you expected and what actually happened.
- A screenshot, if useful. Avoid sharing private videos unless you want to.

## Pilot boundaries

- Accounts, cloud synchronisation and automatic coaching are not connected. The manual review workflow is available without an analysis service; existing optional service settings remain in Profile.
- Browser storage is local, and is not a backup. Clearing site data or local history removes saved sessions from that device.
- Frame labels currently assume 30 fps. Compare recordings made with similar camera positions and frame rates.
- Native camera capture, supported video formats and PWA installation need checking on actual iOS and Android devices. If recording fails, try an MP4 selected from the gallery and report the device/browser details.

## Automated validation

`npm test`, `npm run test:browser` and `npm run test:frontend` cover logic, video and persistence, offline availability, search, comparison, dialogs, navigation and responsive alignment. Browser tests use isolated storage and synthetic video; they do not send clips to an analysis service.
