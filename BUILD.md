# Building the desktop apps

Both installers are produced by GitHub Actions on GitHub's own macOS and Windows
runners, so no local Docker or Windows machine is needed.

| Platform | Output file |
| --- | --- |
| macOS | `PishFaktor-1.0.0.dmg` (universal: Apple Silicon + Intel) |
| Windows | `PishFaktor-Setup-1.0.0.exe` (x64 installer) |

---

## Running a build

### Every push to main

The workflow runs automatically on every push to `main`. When it finishes
(roughly 5-10 minutes), open the **Actions** tab, click the run, and download
`PishFaktor-macOS` and `PishFaktor-Windows` from the **Artifacts** section.

Artifacts are kept for 5 days to limit storage use. For a build you want to
keep, publish a release instead.

### Tagged release

Pushing a tag that starts with `v` runs the same build and additionally
attaches both installers to a GitHub Release, which does not expire and does
not count against artifact storage:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Building locally

Requires Node.js 22 or newer. Each platform can only build its own installer
locally; use the workflow above to get both.

```bash
npm ci
npm run dist:mac   # macOS only, produces release/*.dmg
npm run dist:win   # Windows only, produces release/*.exe
```

---

## Installing an unsigned build

Neither installer is code-signed, so both operating systems show a warning the
first time. This is expected.

**Windows** shows "Windows protected your PC":
**More info** -> **Run anyway**

**macOS** reports that the app cannot be opened because the developer cannot be
verified. Either right-click the app and choose **Open**, or allow it under
**System Settings -> Privacy & Security**. If the DMG is blocked outright, clear
the quarantine flag:

```bash
xattr -cr "/Applications/PishFaktor.app"
```

Removing the warning entirely requires a code signing certificate (an Apple
Developer account for macOS, a commercial certificate for Windows), which is not
necessary for internal use.

---

## Where data is stored

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/pishfaktor/` |
| Windows | `%APPDATA%\pishfaktor\` |

Each folder holds `database.json` and the saved logo. The folder lives outside
the application bundle, so installing or updating the app never erases the data.

### Moving data between machines

1. On the source machine: Settings -> full data export, and save the `.json` file.
2. Copy that file to the other machine.
3. There: Settings -> import data, and select the same file.

The logo is stored inside the backup file, so it does not need to be moved
separately.

---

## Sign-in

The app is protected by a local sign-in, stored as a SHA-256 hash rather than
plain text. To change the credentials, edit the `CREDENTIALS` block in
[electron/main.cjs](electron/main.cjs).
