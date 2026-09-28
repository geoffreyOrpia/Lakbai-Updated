# LakBai release checklist

This checklist separates automated release evidence from checks that require a real
Android device or physical travel.

## Automated gate

Run from the repository root:

```powershell
npm run check
npx expo config --type public
npx expo export --platform android --output-dir .tmp-release-export
git diff --check
```

The repository `check` command verifies dependency alignment, lint, all Jest tests,
and Expo Doctor.

## EAS builds

Installable Android preview APK:

```powershell
npx eas-cli@latest build -p android --profile preview
```

Production Android build:

```powershell
npx eas-cli@latest build -p android --profile production
```

The production profile uses EAS remote versioning with automatic Android build-number
incrementing.

## Manual real-device checks — required before calling the build field-tested

These checks cannot be proven by Jest or Expo export and must stay explicitly manual:

- [ ] Fresh install on the intended Android device.
- [ ] Approved launcher icon and native splash render correctly.
- [ ] Exact LakBai Welcome artwork fits the target screen without unwanted cropping.
- [ ] Location permission granted path works.
- [ ] Location permission denied path remains usable.
- [ ] Launch with mobile data/Wi-Fi disabled.
- [ ] Open a previously saved destination pack completely offline.
- [ ] Calculate and follow an offline walking route.
- [ ] Calculate and follow an offline driving route.
- [ ] Intentionally miss a turn and confirm rerouting behavior.
- [ ] Lock/sleep the screen and confirm expected foreground-navigation behavior after return.
- [ ] Force-close during a multi-stop trip and confirm a recent valid checkpoint resumes.
- [ ] Confirm an intentionally stale/invalid checkpoint does not resume.
- [ ] Test a mainland route and a Samal route.
- [ ] Physically verify any ferry journey before describing the crossing as field-tested.
- [ ] Physically verify any released trail/entrance before describing it as field-verified.
- [ ] Test on a lower-memory Android device if available.
- [ ] Observe battery/GPS behavior during a meaningful real trip.

## Content review

Before a public demo or submission:

- [ ] No prototype/coming-soon destination is presented as complete.
- [ ] Online-source review is not described as field verification.
- [ ] Time-sensitive fees/hours/schedules are either current and sourced or clearly unknown.
- [ ] OpenStreetMap attribution remains visible in Settings/About and project documentation.
- [ ] Any newly added destination source has a URL, source type, scope, and review date.

## Final repository state

- [ ] `master` is clean.
- [ ] `master` is synchronized with `origin/master`.
- [ ] The final EAS build was created from the intended commit.
- [ ] The commit hash used for the submitted APK/AAB is recorded in the project notes.
