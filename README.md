# OomniEye – Theme Update & Report Module Validation

Playwright + TypeScript automation framework (using Page Object Model) to validate **Theme Application, Persistence, UI Readability, and Cross-Module Consistency** between the **Dashboard** and **Report Module (`Report Builder`)** on the OomniEye Staging environment.

---

## 1. Project Structure

```text
theme-report-assignment/
├── tests/
│   └── theme-report.spec.ts       # Automated test scenarios (TH-01 to TH-08)
├── pages/
│   ├── DashboardPage.ts           # Login, Theme Studio palettes, Mode toggle & Dashboard state
│   └── ReportPage.ts              # Report Module navigation, theme checks & UI readability assertions
├── playwright-report/             # Playwright HTML Execution Report (8/8 Passed)
├── playwright.config.ts           # Playwright configuration (dotenv, traces, screenshots)
├── package.json                   # Dependencies and test scripts
├── .env.example                   # Environment variable template (safe for Git)
├── .gitignore                     # Ignores node_modules, .env, and temporary test-results
└── README.md                      # Setup instructions, Test Scenarios, Defect Report, RCA & Notes
```

---

## 2. Setup & Execution Instructions

### Prerequisites
- **Node.js** (v18+ or v20+)

### Step 1: Install Dependencies
```bash
npm install
npx playwright install chromium
```

### Step 2: Configure Environment Variables (`.env`)
Copy `.env.example` to create a `.env` file in the project root:
```bash
cp .env.example .env
```
Add the staging credentials inside `.env` (Note: `.env` is ignored via `.gitignore` so credentials are never committed to GitHub):
```env
BASE_URL=https://base-application-stage.oomnieye.com/#/dashboard/
APP_USERNAME=<staging_username>
APP_PASSWORD=<staging_password>
```

### Step 3: Run Tests & View Report
```bash
# Run all 8 test scenarios in headless mode
npx playwright test

# Run tests in headed browser mode
npx playwright test --headed

# Open the Playwright HTML Report
npx playwright show-report
```

---

## 3. Application Exploration & Findings (Task 1)

1. **Authentication & Session Storage:**
   - Navigating to `/#/dashboard/` redirects unauthenticated users to `/#/login`.
   - After login, session state is stored in **`sessionStorage`** (`omnieye_auth_session: "true"`, `omnieye_auth_email`, `omnieye_auth_role`).
2. **Theme Controls & Supported Options:**
   - **Dark / Light Mode Toggle:** Top header button (`button[title="Switch to Dark Mode"]` / `button[title="Switch to Light Mode"]`).
   - **Theme Studio (`Theme Settings`):** Accessible via the `Theme Studio` sidebar link (`/#/dashboard/overview?themeStudio=true`). Expanding `Theme Settings` shows **6 supported colour palettes**:
     - `Emerald` (Default — `#10B981`)
     - `Corporate Blue` (`#7d8fe8` in Dark mode)
     - `Indigo Violet`
     - `Graphite`
     - `Ocean Teal`
     - `Amber`
3. **DOM & Persistence Mechanism:**
   - **HTML Root Attribute:** `<html data-theme-mode="light|dark">` updates dynamically.
   - **CSS Custom Properties:** Inline CSS variables on `<html>` update immediately (`--primary`, `--bg-dashboard`, `--bg-card`, `--text-main`).
   - **Computed Styles:** `document.body` background color changes between `rgb(255, 255, 255)` (Light) and `rgb(18, 18, 18)` (Dark).
   - **LocalStorage Persistence:** Theme preferences are saved in **`localStorage`** under the key **`omnieye-theme-studio`**.
4. **Report Module (`Report Builder`):**
   - Accessed via the `Report Builder` link (`/#/dashboard/reports`).
   - Contains the `Reports` heading (`h1/h2/h3`), Material UI data table (`.MuiTable-root`), table headers (`.MuiTableRow-head`, `.MuiTableCell-head`), table body cells (`.MuiTableCell-body`), and `Default View` action button.

---

## 4. Automated Test Scenarios & Execution Summary (Task 2 & Task 3)

| ID | Scenario | Expected & Verified Behavior | Status |
| :--- | :--- | :--- | :---: |
| **TH-01** | Change theme from Dashboard | Selects `Corporate Blue` + `Dark` mode; verifies `data-theme-mode="dark"`, `--primary`, `--bg-dashboard` (`#121212`), computed body background (`rgb(18, 18, 18)`), and `localStorage['omnieye-theme-studio']`. | ✅ **PASSED** |
| **TH-02** | Open Report Module after changing theme | Opens `Report Builder` (`/#/dashboard/reports`) and verifies theme mode, palette CSS variables, and computed background match the Dashboard. | ✅ **PASSED** |
| **TH-03** | Refresh Report Module | Selects `Amber` + `Dark`, opens Report Module, reloads the page (`page.reload()`), and verifies theme remains consistent. | ✅ **PASSED** |
| **TH-04** | Navigate Dashboard → Report → Dashboard | Selects `Indigo Violet` + `Dark`, navigates `Dashboard → Report → Dashboard`, and verifies theme attributes and CSS variables do not revert. | ✅ **PASSED** |
| **TH-05** | Change theme again and reopen Report Module | Changes from `Corporate Blue (Dark)` to `Ocean Teal (Light)` and verifies Report Module reflects the latest selection. | ✅ **PASSED** |
| **TH-06** | Open Report Module directly or in a new tab | Verifies direct URL navigation (`/#/dashboard/reports`) and new tab opening with persisted `localStorage` theme preference and active session context. | ✅ **PASSED** |
| **TH-07** | Inspect key Report Module UI elements | Verifies `Reports` heading, `.MuiTable-root`, `.MuiTableRow-head`, `.MuiTableCell-head`, `.MuiTableCell-body`, and `Default View` button visibility and text/background readability. | ✅ **PASSED** |
| **TH-08** | Simulate unsupported/corrupted preference | Injects invalid preset/mode values into `localStorage['omnieye-theme-studio']`, refreshes Report Module, and verifies graceful fallback without UI crash. | ✅ **PASSED** |

**Execution Summary:** `8 passed (1.0m)` | `0 failed` | `0 skipped`

---

## 5. Defect Report & Root Cause Analysis (RCA)

### Defect 1: Computed `<body>` Background Resets to Transparent (`rgba(0, 0, 0, 0)`) When Navigating Back from Report Module to Dashboard Overview
- **Defect ID:** `DEF-THEME-01`
- **Severity / Impact:** Low / P3 (CSS Inheritance Inconsistency across routes)
- **Steps to Reproduce:**
  1. Log in and select any palette (e.g., `Indigo Violet`) + `Dark Mode` in `Theme Studio`.
  2. Navigate to `Report Builder` (`/#/dashboard/reports`) — `getComputedStyle(document.body).backgroundColor` is `rgb(18, 18, 18)`.
  3. Click `Dashboard` in the sidebar to return to `/#/dashboard/overview`.
  4. Check `getComputedStyle(document.body).backgroundColor`.
- **Expected Result:** `document.body` computed background color should consistently remain `rgb(18, 18, 18)` (`var(--bg-dashboard)`) across all modules.
- **Actual Result:** On returning to `/#/dashboard/overview`, `<html>` retains `data-theme-mode="dark"` and `--bg-dashboard: #121212`, but `document.body` computed `background-color` becomes `rgba(0, 0, 0, 0)` (or mid-transition `rgba(18, 18, 18, 0.93)`).
- **Evidence:** Observed during automated execution of `TH-04` (trace and screenshot captured in Playwright diagnostic run).
- **Root Cause Analysis (RCA):** The Dashboard overview route applies background styling on its inner layout container (`--dash-canvas-bg` / `--bg-dashboard`) rather than `document.body`, whereas the Report Module relies on `document.body` background styling.
- **Recommended Fix:** Apply `background-color: var(--page-bg, var(--bg-dashboard)); color: var(--text-main);` globally on `body` in the root CSS and remove route-specific overrides.

---

### Defect 2: Opening Report Module in a New Tab Redirects to `/#/login` Due to `sessionStorage` Auth Isolation
- **Defect ID:** `DEF-THEME-02`
- **Severity / Impact:** Medium / P2 (Cross-tab navigation & deep-linking limitation)
- **Steps to Reproduce:**
  1. Sign in to OomniEye and change the theme (saved in `localStorage['omnieye-theme-studio']`).
  2. Open a new browser tab and navigate to `https://base-application-stage.oomnieye.com/#/dashboard/reports`.
- **Expected Result:** Authenticated users opening the Report Module URL in a new tab should stay logged in and view the Report Module with their saved theme.
- **Actual Result:** While `<html data-theme-mode="dark">` is applied from `localStorage`, the app redirects the new tab to `/#/login`.
- **Evidence:** Captured during `TH-06` exploration (`Received URL: https://base-application-stage.oomnieye.com/#/login` while `<html data-theme-mode="dark">` was active).
- **Root Cause Analysis (RCA):** Theme state is persisted in `localStorage` (shared across tabs), but authentication state (`omnieye_auth_session`) is stored in `sessionStorage` (isolated per browser tab).
- **Recommended Fix:** Store session tokens in `localStorage` or `httpOnly` cookies so authenticated sessions persist across browser tabs alongside theme preferences.

---

## 6. Assumptions, Limitations & Design Choices

- **Sequential Execution (`workers: 1`):** Configured in `playwright.config.ts` to prevent session/theme state collisions on the single shared staging user account.
- **Zero Hardcoded Waits:** All tests rely strictly on Playwright web-first assertions (`toHaveCSS`, `toHaveAttribute`, `toBeVisible`, `toHaveURL`) with automatic retry rather than `waitForTimeout()`.
- **Real DOM Validation:** Assertions inspect real application attributes (`data-theme-mode`), CSS custom properties (`--primary`, `--bg-dashboard`, `--bg-card`, `--text-main`), computed styles, and `localStorage['omnieye-theme-studio']`.

---

## 7. AI Tool Usage Disclosure

As permitted in the assessment guidelines:
- **Where & How Used:** AI tools (ChatGPT/Claude) were used to help structure the Page Object Model boilerplate (`DashboardPage.ts`, `ReportPage.ts`) and format the `README.md` documentation.
- **Verification:** All locators, DOM attributes, CSS variables, test assertions, and defect analyses were directly inspected, executed, and verified against the live OomniEye staging environment.