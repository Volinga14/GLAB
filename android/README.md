# SwingLab Android · experimental native agent client

This branch keeps the existing SwingLab web editor and bundles it as local Android assets. Native code adds the authorized ChatGPT plan connection, model discovery, image requests, usage reporting and protected credential storage. The deployed GitHub Pages application is not updated by this branch.

## Build

Use JDK 17, Android SDK 35 and Gradle 8.9:

```sh
gradle -p android assembleDebug
```

GitHub Actions builds `app-debug.apk` on pushes to `android-agent-trial`. The debug package is `com.swinglab.mobile.trial` and its label is **SwingLab Trial**. It is separate from an installed SwingLab PWA. This is an experimental debug build, not a store release. Signing across future builds needs a stable release key; do not treat CI debug APKs as a production update channel.

## First phone test

1. Install the APK and open **SwingLab Trial**. No original video is included.
2. Load a short video, tap **Analyze**, choose **On this device**, optionally mark impact, and review all phases.
3. Tap **Agent**, then **Prepare swing images**. Preview the selected images.
4. Tap **Continue with ChatGPT**. The official browser authorization returns to a listener bound exclusively to `127.0.0.1` on this phone. Return to the app after the callback page appears.
5. Tap **Refresh models**, select an available model and run the single short connection test.
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
