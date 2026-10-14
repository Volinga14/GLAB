Swing Lab v29: see README.md for the current implementation, corrections and tests.

Historical changelog — Swing Lab PWA v19 full mockup

Includes:
- Landing / Welcome
- Dashboard
- Upload / record video
- Video player with timeline
- Manual phase marking
- Capture generation
- Report placeholder
- Local history metadata
- Compare selector and overlay viewer
- Profile/settings

Installable PWA support is included with manifest, service worker and mobile app icons.
Cloudflare analysis engine support is included as a configurable prototype.
Use the "Engine URL" button on Home or open index.html with ?engine=https://your-worker-url.
When the engine is online, uploaded videos are sent to /analyze and returned phase estimates are applied to the review.
The service worker caches the app shell for a reliable installed-app launch.

V20 fix: Sign in now reliably opens the dashboard/home zone from the landing screen.

V21 fix: Sign in is now an internal anchor fallback plus inline JS. It should open the dashboard even if app.js has issues.

V22 fix:
- Sign in and Create account now navigate directly to dashboard.html.
- This does not depend on JavaScript transitions.
- dashboard.html opens directly in the app/dashboard zone.

V24:
- Loading a video opens the review/key phases screen.
- Tapping the video opens fullscreen analysis.
- Fullscreen player is compact and fixed to the bottom.
- Drawing tools are available in draggable panels.
- Tools: select/move, line, angle, circle, box, freehand.
- Style panel: colors, stroke thickness, clear all.
- Delete selected, undo, guides, view toggle, speed, frame stepping.

V25:
- Adds install buttons for Android/Chrome and iOS guidance.
- Registers sw.js so GitHub Pages can expose the installable app prompt.
- Replaces the mobile app icon with a clearer Swing Lab launcher button.

V26:
- Home-first navigation: bottom tabs removed and all main actions moved into Home.
- Cloudflare engine URL can always be changed from the installed app.
- Review opens first after upload; fullscreen analysis opens only when tapping the video.
- Review player controls now match fullscreen play/pause and frame stepping more closely.
- Saved swings can be renamed or deleted individually.
- Drawing tools are easier to drag and default to thicker, cleaner lines.

V27:
- Engine uploads now post a FastAPI-compatible multipart file field first, then retry compatible field names if /api/analyze returns 422.
- Quick actions now show only New analysis and Compare; saved swings remain available from View all.
- Cache and asset versions bumped so installed PWAs and GitHub Pages refresh the updated app shell.
