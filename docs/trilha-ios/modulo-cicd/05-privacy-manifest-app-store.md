---
title: Privacy Manifest and App Store Submission
---

# Privacy Manifest and App Store Submission

Apple introduced the privacy manifest requirement with iOS 17 and made it mandatory for all App Store submissions starting in Spring 2024. For React Native developers, this requirement carries additional complexity because the framework itself accesses several privacy-sensitive APIs internally, meaning your app must declare reasons for API usage that your own code may never call directly.

This document explains every piece of the privacy manifest for React Native apps, how to create and validate it, and what to expect during App Store review.

## Why Privacy Manifests Exist

The privacy manifest system gives Apple and users a machine-readable record of which sensitive APIs an app (or any included SDK) accesses and why. Before this requirement, third-party SDKs could silently access APIs like `UserDefaults` or file timestamps without any declared justification. Apple now requires a `PrivacyInfo.xcprivacy` file for any app or SDK that touches a set of designated required reason APIs.

Failure to include correct declarations results in rejection during App Store review, not during the build process. Xcode does not block you from submitting an incomplete manifest. The rejection arrives as an email from App Store Review, typically within 24 to 48 hours of submission.

## The PrivacyInfo.xcprivacy File Format

A `PrivacyInfo.xcprivacy` file is a standard Apple property list (plist) with an `.xcprivacy` extension. Its root dictionary can contain three top-level keys:

- `NSPrivacyAccessedAPITypes` — declares which required reason APIs the app or SDK uses and why
- `NSPrivacyCollectedDataTypes` — declares which categories of user data the app collects
- `NSPrivacyTracking` — a boolean declaring whether the app uses data for tracking as defined by ATT

Xcode renders this file in a structured editor when you open it, but it is plain XML underneath. You can edit either representation.

## Required Reason APIs That React Native Uses

React Native's internals access several required reason APIs as part of normal framework operation. Even if your application code never imports these APIs, you must declare them because they appear in the linked binary.

### NSUserDefaults

React Native uses `NSUserDefaults` to persist certain framework-level preferences. The system logs warnings about this access and Apple flags it during review if no reason is declared.

The correct reason code for framework-level defaults access, where usage is not driven by user-initiated data storage, is `CA92.1`. This reason covers reading and writing values to `NSUserDefaults` for the purpose of storing state needed for the app's own operation, without transmitting that data off device.

In plist XML this entry looks like:

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>CA92.1</string>
    </array>
</dict>
```

### File Timestamp APIs (NSFileManager)

React Native's Metro bundler runtime, image caching layers, and asset resolution code read file timestamps via `NSFileManager`. The required reason API category is `NSPrivacyAccessedAPICategoryFileTimestamp`.

Apple provides several reason codes for file timestamp access. The appropriate code for internal framework operations where timestamps are used for cache invalidation and not surfaced to users is `C617.1`. This covers reading timestamps of files that the app itself created or manages.

If your app also explicitly reads file timestamps for features like showing a "last modified" date to the user, you would declare `DDA9.1` in addition to `C617.1`.

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>C617.1</string>
    </array>
</dict>
```

### System Boot Time (mach_absolute_time)

React Native's performance tracing and animation subsystems use `mach_absolute_time()` to measure elapsed intervals with high precision. This falls under the `NSPrivacyAccessedAPICategorySystemBootTime` category.

The standard reason code for using boot time to measure intervals without transmitting device uptime off device is `35F9.1`.

```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>35F9.1</string>
    </array>
</dict>
```

### Disk Space APIs

Some React Native versions and common SDKs query available disk space through `NSFileManager` attributes. If your dependency tree includes any SDK that does this, the category `NSPrivacyAccessedAPICategoryDiskSpace` with reason `E174.1` (checking available capacity before performing an operation) must be present.

Run a privacy report in Xcode to discover whether any of your linked frameworks trigger this category.

## Complete NSPrivacyAccessedAPITypes Structure

A minimal React Native app typically requires at least the three core entries. The full `NSPrivacyAccessedAPITypes` array in your manifest should read:

```xml
<key>NSPrivacyAccessedAPITypes</key>
<array>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>CA92.1</string>
        </array>
    </dict>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>C617.1</string>
        </array>
    </dict>
    <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
            <string>35F9.1</string>
        </array>
    </dict>
</array>
```

Adjust the set of entries after running your own privacy report to catch additional APIs introduced by your dependencies.

## Expo Managed Workflow

If you are using Expo SDK 56 or later, the managed workflow handles the privacy manifest automatically. The Expo CLI generates and embeds a `PrivacyInfo.xcprivacy` file during the prebuild step that covers all APIs accessed by the Expo runtime and by the SDK modules your project includes.

Each Expo module that accesses a required reason API ships its own `PrivacyInfo.xcprivacy` in its pod. CocoaPods merges these per-pod manifests into a single aggregate manifest for the final binary. This aggregation is automatic and happens during `pod install`.

For Expo managed workflow, your responsibility is limited to declaring any additional APIs your own custom native code accesses. If you have no custom native modules, the generated manifest should be sufficient. Verify this by running a privacy report in Xcode after `npx expo prebuild --platform ios`.

## Bare Workflow: Creating PrivacyInfo.xcprivacy Manually

In the bare workflow, you must create and maintain the manifest yourself. Follow these steps in Xcode.

### Creating the File

1. Open your project in Xcode by opening the `.xcworkspace` file (not the `.xcodeproj`).
2. In the Project Navigator, select the folder named after your app target (the group that contains `AppDelegate.swift` or `AppDelegate.mm`).
3. Go to File > New > File from Template.
4. In the filter field, type "Privacy". Select the "App Privacy" template and click Next.
5. Name the file `PrivacyInfo.xcprivacy`. Confirm that the target checkbox for your app target is selected. Click Create.

Xcode places the file inside your app group in the Project Navigator and adds it to the target's bundle resources build phase automatically.

### Correct Location in the Project Navigator

The `PrivacyInfo.xcprivacy` file must be a member of your app target, not of any extension target or framework target. In the Project Navigator it should appear at the same level as your other source files, inside the group that represents your application folder.

You can verify membership by selecting the file in the Project Navigator and opening the File Inspector on the right panel. Under Target Membership, the checkbox for your app target must be checked.

If you open the file and Xcode shows the structured privacy editor (with sections for "Privacy Accessed API Types," "Privacy Collected Data Types," and "Privacy Tracking"), the file is in a recognized location. If Xcode opens it as raw XML, right-click the file and choose Open As > Property List.

### Adding Entries in the Structured Editor

The Xcode structured editor for privacy manifests provides menus for each category and reason code. To add a required API entry:

1. Click the plus button next to "Privacy Accessed API Types."
2. In the "Privacy Accessed API Type" column, select the category from the dropdown (for example, "User Defaults").
3. Expand the row and click the plus button next to "Privacy Accessed API Type Reasons."
4. Select the appropriate reason code from the dropdown.

Repeat for each required category.

## NSPrivacyCollectedDataTypes: Declaring Data Collection

Beyond required reason APIs, you must declare any user data your app collects. This is separate from the API reason declarations and maps directly to the privacy nutrition label shown on the App Store product page.

Common data types and their `NSPrivacyCollectedDataType` values:

| Data category | Key value |
|---|---|
| Name | `NSPrivacyCollectedDataTypeName` |
| Email address | `NSPrivacyCollectedDataTypeEmailAddress` |
| Phone number | `NSPrivacyCollectedDataTypePhoneNumber` |
| Device identifier | `NSPrivacyCollectedDataTypeDeviceID` |
| Crash data | `NSPrivacyCollectedDataTypeCrashData` |
| Performance data | `NSPrivacyCollectedDataTypePerformanceData` |

For each declared data type, you must also specify:

- `NSPrivacyCollectedDataTypeLinked` — boolean, whether this data is linked to the user's identity
- `NSPrivacyCollectedDataTypeTracking` — boolean, whether this data is used for tracking
- `NSPrivacyCollectedDataTypePurposes` — array of purpose strings such as `NSPrivacyCollectedDataTypePurposeAnalytics` or `NSPrivacyCollectedDataTypePurposeAppFunctionality`

If your React Native app uses Crashlytics or Sentry, you must declare crash data collection. If it uses any analytics SDK, declare the relevant identifiers. The manifest must reflect actual data collection behavior. Declaring less than what your app collects constitutes a policy violation.

## Generating a Privacy Report in Xcode

Before submission, generate a privacy report to identify all required reason API usage across your binary and its linked frameworks:

1. Build your app for any device or simulator (Product > Build).
2. In Xcode, go to Product > Archive if you want a full report for a distribution build, or use Product > Build and then inspect the binary.
3. In the Xcode Organizer (Window > Organizer), select your archive and click Generate Privacy Report.

The report lists every required reason API found in the binary and indicates whether each has a corresponding declaration in your manifest. Address every flagged item before submitting.

## Common App Store Rejection Patterns

### Missing Reason for File Timestamp API

This is the most frequent rejection for React Native apps. Apple's review system detects `NSFileManager` timestamp access in the binary and finds no declaration in the manifest. The rejection email reads approximately:

> ITMS-91053: Missing API declaration — Your app's code in the "YourApp.app" file accesses the following required reason API category: File timestamp APIs. Provide an approved reason in the manifest file.

Resolution: add the `NSPrivacyAccessedAPICategoryFileTimestamp` entry with reason `C617.1` as shown above, rebuild, and resubmit.

### Missing Reason for UserDefaults

React Native's bridge initialization code reads from `NSUserDefaults`. If you submitted without `NSPrivacyAccessedAPICategoryUserDefaults` declared, you will receive a similar rejection. Resolution: add `CA92.1` as the reason.

### Manifest Not in Target

If you created the `PrivacyInfo.xcprivacy` file but did not add it to the correct target, the archive will not include it and the rejection will repeat. Verify target membership in the File Inspector before archiving.

### Incorrect Reason Code

Selecting a reason that does not apply to your actual usage is a policy violation. Apple may accept the submission initially but can reject an update or revoke the app later. Use only reason codes that accurately describe your API usage.

## App Store Review Process for React Native Apps

### Binary Review

The initial review phase examines your compiled iOS binary. Reviewers check:

- Privacy manifest completeness
- Entitlements match declared capabilities
- No use of private APIs
- Info.plist entries for any permission request your app makes

React Native apps pass binary review identically to native apps. The JavaScript bundle is embedded as an asset in the binary and does not require separate review at this stage.

### JavaScript Bundle Update Policy

Apple's guidelines permit React Native apps to update their JavaScript bundle over the air (OTA) without a new App Store submission, provided the update does not materially change the app's functionality, add new features, or circumvent the review process. This is the policy basis for tools like EAS Update and CodePush.

The boundary that reviewers enforce: OTA updates may fix bugs and make minor adjustments. OTA updates may not introduce new features, change the app's primary purpose, or bypass payment systems. A significant feature change must go through a new App Store submission even if it is technically deliverable via a JavaScript bundle update.

Apple does not review individual OTA updates. Responsibility for compliance rests with the developer. Violating this policy can result in app removal.

### Metadata Review

Alongside the binary, reviewers check your App Store Connect metadata: screenshots, app description, keywords, age rating, and category. Ensure screenshots reflect the current app state. Outdated or misleading screenshots cause rejections that are unrelated to the technical implementation.

## TestFlight External Testing

Before submitting for App Store review, distribute via TestFlight to external testers. External TestFlight builds undergo a shorter review (typically 24 to 48 hours) that checks for crashes and policy violations but is less thorough than full App Store review.

Privacy manifests are checked during TestFlight external review. If your manifest is incomplete, you will receive a rejection during TestFlight distribution, allowing you to fix the issue before the full review cycle. This is a useful validation step.

To distribute externally via TestFlight:

1. Archive the app in Xcode (Product > Archive).
2. In the Organizer, select the archive and click Distribute App.
3. Choose App Store Connect distribution.
4. Upload to App Store Connect.
5. In App Store Connect, navigate to the TestFlight tab, select the build, and submit it for external review.
6. Once approved, add external testers by email or public link.

## Phased Release Strategy

Once your build passes review and you are ready to release, consider enabling phased release in App Store Connect. Phased release distributes the update gradually over seven days:

- Day 1 to 2: 1% of users receive the update
- Day 3: 2% of users
- Day 4: 5% of users
- Day 5: 10% of users
- Day 6: 20% of users
- Day 7: 50% of users
- Day 8: 100% of users

You can pause the rollout at any stage if monitoring reveals elevated crash rates or unexpected behavior. Pausing stops new devices from receiving the update without removing it from devices that already installed it.

Phased release applies only to automatic updates. Users who manually check for updates in the App Store receive the new version immediately regardless of phase.

For React Native apps, phased release works well alongside OTA update capability. You can release a binary update with phased rollout, then use OTA updates to deliver rapid hotfixes to users who have already received the new binary.

## Pre-Submission Checklist

Before uploading a build for review:

- Run a privacy report in Xcode and confirm all required reason APIs have declarations
- Verify `PrivacyInfo.xcprivacy` is in the correct target and appears in the archive's bundle
- Confirm `NSPrivacyCollectedDataTypes` reflects all data your app actually collects
- Validate that every permission usage description key in `Info.plist` has a corresponding prompt in the app
- Test the archive on a physical device before uploading
- Distribute via TestFlight external testing and collect feedback before full submission
- Set the release date and phased release preference in App Store Connect before submitting for review

Addressing the privacy manifest requirements thoroughly eliminates the most common category of React Native App Store rejections. Treat the manifest as a living document: update it whenever you add a native dependency that accesses new required reason APIs.
