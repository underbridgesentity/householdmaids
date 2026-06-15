# Household Maids — Mobile apps (iOS + Android)

The mobile apps are **Capacitor** shells that load the live Household Maids site
(`https://householdmaids.vercel.app`) inside a native WebView. Because the app is
fully server-rendered (auth, database, server actions), this gives a real native
app — installable from the App Store and Google Play, with a native splash screen,
status bar, Android back-button handling, and a hook for push notifications — while
every screen stays in sync with the website automatically. Ship a web change, and
the apps show it on next launch with no resubmission.

- **App name:** Household Maids
- **App ID (bundle / package):** `za.co.householdmaids.app`
- **iOS project:** `ios/` (open in Xcode)
- **Android project:** `android/` (open in Android Studio)
- **Config:** `capacitor.config.ts`
- **Splash/status-bar/back-button wiring:** `components/CapacitorInit.tsx`

---

## One-time machine setup

| Platform | Needs |
|---|---|
| iOS | macOS + **Xcode** (installed: 26.5), **CocoaPods** (installed: 1.16.2), an Apple Developer account |
| Android | **Android Studio** (bundles its own JDK + Android SDK), a Google Play Console account |

> This machine has Xcode + CocoaPods, so iOS builds work here directly.
> Android needs Android Studio installed (it provides the JDK and SDK — no separate
> Java install required). Just open the `android/` folder in it.

---

## Day-to-day workflow

The web app is the source of truth. You normally never rebuild the apps for content
or feature changes — they load the live site. You only rebuild the native app when:

- you change `capacitor.config.ts` (e.g. point at the custom domain),
- you add/update a native plugin,
- you update app icons or the splash screen,
- you bump the version for a new store submission.

After any of those:

```bash
npm run cap:sync        # copy config + plugins into ios/ and android/
npm run cap:ios         # sync iOS, then open Xcode
npm run cap:android     # sync Android, then open Android Studio
```

To regenerate icons/splash after changing the brand art in `assets/`:

```bash
npm run cap:assets      # regenerates ios/ + android/ icons and splash from assets/*.png
npm run cap:sync
```

Source art lives in `assets/` (`icon-only.png` 1024², `icon-foreground.png`,
`icon-background.png`, `splash.png`/`splash-dark.png` 2732²).

---

## Point the apps at the custom domain (do this before store submission)

Right now the shells load `householdmaids.vercel.app`. Once `householdmaids.co.za`
is live:

1. In `capacitor.config.ts`, set `server.url` to `https://householdmaids.co.za`
   (a commented line is already there) and keep the domain in `allowNavigation`.
2. `npm run cap:sync`
3. Rebuild + resubmit.

---

## Build & submit — iOS (App Store)

1. `npm run cap:ios` (opens `ios/App/App.xcworkspace` in Xcode).
2. Select the **App** target → **Signing & Capabilities** → choose your Team. Xcode
   manages the provisioning profile automatically for `za.co.householdmaids.app`.
3. Set the **version** (e.g. 1.0.0) and **build** number.
4. Choose **Any iOS Device (arm64)** as the run destination.
5. **Product → Archive**. When the Organizer opens, **Distribute App → App Store Connect → Upload**.
6. In [App Store Connect](https://appstoreconnect.apple.com): create the app record
   (bundle ID `za.co.householdmaids.app`), attach the build, add screenshots, the
   privacy policy URL (`/privacy`), the App Privacy questionnaire, and submit for review.

## Build & submit — Android (Google Play)

1. `npm run cap:android` (opens `android/` in Android Studio; let Gradle sync).
2. **Generate a signing key** (once) and keep it safe — losing it means you can never
   update the app:
   ```bash
   keytool -genkey -v -keystore householdmaids-release.keystore \
     -alias householdmaids -keyalg RSA -keysize 2048 -validity 10000
   ```
   Reference it in `android/keystore.properties` (do **not** commit it).
3. Set `versionCode` / `versionName` in `android/app/build.gradle`.
4. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**, signed with
   your release key.
5. In the [Play Console](https://play.google.com/console): create the app, upload the
   `.aab`, complete the Data Safety form (link `/privacy`), add the store listing +
   screenshots, and roll out to a track (internal → production).

---

## Push notifications (scaffolded, wire when ready)

`@capacitor/push-notifications` is installed and the native projects are configured for
it, but registration is intentionally **not** triggered yet (it would prompt users for
permission with no backend to send messages). To enable later:

1. **iOS:** add the *Push Notifications* capability in Xcode, create an APNs key in the
   Apple Developer portal.
2. **Android:** add a Firebase project, drop `google-services.json` into `android/app/`.
3. In `components/CapacitorInit.tsx`, call `PushNotifications.requestPermissions()` →
   `register()`, and on the `registration` event POST the device token to a new server
   action that stores it against the user. Send via APNs/FCM from the backend.

---

## What's committed vs generated

- **Committed:** `ios/`, `android/`, `capacitor.config.ts`, `assets/`, `mobile/www/`.
- **Git-ignored (regenerated by tooling):** `ios/App/Pods/`, `android/.gradle/`,
  `android/app/build/`, Xcode `DerivedData` — handled by Capacitor's generated
  `.gitignore` files. Run `npm install && npm run cap:sync` on a fresh clone to restore.
