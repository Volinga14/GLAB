# SwingLab Android · experimental native agent client

This branch keeps the existing SwingLab web editor and bundles it as local Android assets. Native code adds the authorized ChatGPT plan connection, model discovery, image requests, usage reporting and protected credential storage. The deployed GitHub Pages application is not updated by this branch.

## Build

Use JDK 17, Android SDK 35 and Gradle 8.9:

```sh
gradle -p android assembleDebug
```

GitHub Actions builds `app-debug.apk` on pushes to `android-agent-trial`. The debug package is `com.swinglab.mobile.beta` and its label is **SwingLab Beta**. It is separate from an installed SwingLab PWA. This is an experimental debug build, not a store release. The CI APK is an intermediate debug package. User deliveries are re-signed locally with the persistent Beta signing key, which is kept privately and never committed. The old Trial key was generated on an ephemeral CI runner and cannot be recovered. Beta therefore installs beside Trial; it does not overwrite Trial sessions. Future Beta deliveries must reuse the same private signing key to preserve the app data and OAuth session.

## First phone test

1. Install the APK and open **SwingLab Beta**. No original video is included.
2. Load a short video, tap **Analyze**, choose **On this device**, optionally mark impact, and review all phases.
3. Tap **Agent**, then **Prepare swing images**. Preview the selected images.
4. Tap **Continue with ChatGPT**. A short-lived foreground service keeps the loopback listener alive for up to ten minutes while the system browser authorizes. The callback page offers **Abrir SwingLab**. This link only brings the app forward; OAuth codes are accepted exclusively by the loopback listener after state checks.
5. Models load automatically after authorization and on app resume. The first available model is selected, or the prior selection is restored. Run the short connection test once; it is never run automatically.
6. If it completes, authorize sending the selected images and run **Analyze with connected account**. No API key or automatic paid-API fallback is configured.
7. Open the visual report. Evidence, phase audit and practice priorities are stored with the session without applying phase corrections automatically.
8. Use **Share result and usage JSON** to export the test record. Reported tokens do not determine the remaining plan percentage or a monetary price.

The app retains the latest 100 usage records on this device and can share a usage record even when an inference failed. Credentials and video images are excluded from this ledger.

The experimental runtime allows three inference attempts per app process, including interrupted requests. It does not retry automatically. Reaching an account/client usage limit does not change the plan. If authorization or inference is rejected, keep the exact error; installing Android alone does not guarantee provider eligibility.

## Authentication and privacy

OAuth Authorization Code with PKCE and OIDC nonce/state checks. The ID token is verified against the issuer's published RSA signing keys, expected audience, issuer and expiry before installing the session. Only a granted `chatgpt.tokens.use.direct` permission enables inference. Tokens never enter WebView JavaScript, logs or exported results. Native credentials are encrypted using an Android Keystore AES/GCM key in app-private storage; backups are disabled.

The app uses HTTPS `appassets.androidplatform.net` through WebViewAssetLoader for secure local content. External web resources are blocked inside the WebView; approved external HTTPS navigation opens the system browser. The JavaScript interface serves only packaged app content. It exposes fixed native actions, not a general filesystem or HTTP proxy. OAuth callbacks use a temporary loopback listener; no server runs off the phone and no public callback endpoint is created.

The account sign-in may create a distinct registration from the desktop experiment. Closing the app keeps encrypted credentials for reconnection; **Disconnect** clears them locally and attempts revocation. Uninstalling the app removes local sessions and Keystore credentials and does not guarantee remote revocation of the registration. Manage app access in ChatGPT Settings.

## Availability limits

The official flow documents open-source/local clients, loopback return URLs and image inputs. It does not establish that this particular Android client or every Plus/Pro account is eligible. A successful APK build verifies compilation, not authorization, account limits or visual-analysis quality. The decisive tests require the user's Android device and explicit account authorization.

The native client accepts text and images. It does not use unsupported native video upload or audio transcription endpoints. Frames are extracted locally first. Review requests use the public Responses endpoint with `store:false` and `stream:true`. This parameter is not a promise of zero service-side retention.

Official references:
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content

## Connection recovery in 0.2

The native runtime belongs to the application process, not the Activity/WebView. Destroying an Activity while the browser is open detaches the view without discarding the pending authorization. Native resume, document visibility and first initialization restore the account and fetch the model catalog without opening sign-in or sending inference. The foreground service is used only during user-started authorization and stops after completion, cancellation or timeout. A force-stopped process requires a fresh authorization attempt; this is reported explicitly.

Credential writes complete synchronously before activation. Refreshes are serialized independently from UI status reads; rotating access and refresh credentials are persisted together before replacing the active session. A failed network request preserves the saved session. Revocation or an invalid grant requires explicit sign-in. Account/host registration is reused; available identity hints reduce returning sign-in steps.

The connection panel distinguishes browser authorization, code exchange, identity validation, storage, renewal, model discovery and readiness. A bounded diagnostic history contains stage, sanitized code and time; no tokens, callback URLs, authorization codes, PKCE secrets or account identifiers are exported in diagnostics. Diagnostics can be shared before any inference completes.

Run `gradle -p android testDebugUnitTest assembleDebug` for native protocol checks and compilation, and `npm test` for web and connection UI tests. The tests exercise callback binding, returning client IDs, restart expiry, token rotation, network failure recovery, automatic catalog discovery and diagnostic export. They do not replace an authorized device test with a real ChatGPT account.

## 0.3 · Coaching report

The visible app name is SwingLab; package com.swinglab.mobile.beta and the persistent Beta signing key remain unchanged so updating Beta 0.2 keeps its sessions and account. The shared web report adds evidence-bound strengths, six coaching areas, a derived indicative score, structured drills and a practice plan. New instructions require a fresh review to populate the extra fields; existing reviews remain compatible. Phase suggestions are separate from the coaching report and never change user marks automatically.

Native shareReport exports self-contained HTML through the same narrow FileProvider cache directory. printReport uses a dedicated JavaScript-disabled, network-blocked WebView and Android PrintManager; the user chooses the destination, including Save as PDF. The print WebView is released when its adapter finishes. No account credentials, usage ledger or client registration are included in the client-facing report.
