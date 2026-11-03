# ShiftNote AU Mobile

**Mobile Native App for Australian Independent NDIS Support Workers (React Native & Expo)**

Mobile-first companion app for **ShiftNote AU**. Designed for support workers to record post-shift clinical voice notes in their car or on the move, with instant NDIS Quality & Safeguards Commission case note generation, deterministic rate capping, and native PDF sharing.

---

## Mobile Features

- **Native Microphone Dictation (`expo-av`)**: High-fidelity post-shift voice recording with real-time metering.
- **Native Haptics (`expo-haptics`)**: Tactile vibration confirmation when holding to speak and releasing.
- **Offline-First Storage (`@react-native-async-storage/async-storage`)**: Saves notes, participants, and claims locally with zero reception outside participant homes.
- **Deterministic NDIS Pricing Engine (`src/lib/ndis-catalogue.ts`)**: Automatic day/time bracket resolution (Weekday, Evening, Weekend, Public Holiday) and strict rate-cap enforcement.
- **In-Memory PDF Generation & Native Share Sheet (`pdf-lib` + `expo-sharing`)**: Generates ATO-compliant GST-Free Tax Invoices on device and opens native iOS AirDrop / Android Share Sheet to dispatch to Plan Managers or save to Files.
- **3-Part NDIS Case Notes**: Structured into *Activities Delivered*, *Participant Engagement*, and *NDIS Plan Goals Progress*.

---

## 3-Step Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Deterministic Rate Engine & Tests
```bash
npm test
```

### 3. Start Development Server
```bash
npx expo start
```

- **iOS**: Scan the QR code with your iPhone Camera using the **Expo Go** app, or press `i` to launch in the iOS Simulator.
- **Android**: Scan the QR code with the **Expo Go** app on Android, or press `a` to launch in the Android Emulator.
- **Web Preview**: Press `w` to run in the local web browser.

---

## Standalone App Store & Play Store Builds (EAS)

To compile standalone `.ipa` (iOS) and `.aab` / `.apk` (Android) binaries for the Apple App Store and Google Play Store:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Configure build profiles
eas build:configure

# 3. Build Android APK for testing
eas build --platform android --profile preview

# 4. Build iOS for TestFlight
eas build --platform ios --profile production
```

