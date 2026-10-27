import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { ReportPage } from '../pages/ReportPage';

test.describe('OomniEye - Theme Update & Report Module Validation', () => {
  let dashboardPage: DashboardPage;
  let reportPage: ReportPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    reportPage = new ReportPage(page);
    await dashboardPage.login();
  });

  test('TH-01: Change theme from Dashboard and verify selected theme is applied', async ({ page }) => {
    const initialTheme = await dashboardPage.getActiveThemeState();

    await dashboardPage.selectColourPalette('Corporate Blue');
    await dashboardPage.setThemeMode('dark');

    await expect(page.locator('body'), 'TH-01: Body background should transition to dark mode').toHaveCSS(
      'background-color',
      'rgb(18, 18, 18)'
    );

    const updatedTheme = await dashboardPage.getActiveThemeState();

    expect(updatedTheme.mode, 'TH-01: Theme mode should update to dark').toBe('dark');
    expect(updatedTheme.primaryColor, 'TH-01: Primary color should change from default Emerald (#10B981)').not.toBe(
      initialTheme.primaryColor
    );
    expect(updatedTheme.bgDashboard, 'TH-01: Dashboard background token should update for dark mode').toBe('#121212');
    expect(updatedTheme.storedThemeJson, 'TH-01: Theme preference should be saved in localStorage').toBeTruthy();
  });

  test('TH-02: Open Report Module after changing theme and verify it reflects selected theme', async ({ page }) => {
    await dashboardPage.selectColourPalette('Corporate Blue');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const dashboardTheme = await dashboardPage.getActiveThemeState();

    await dashboardPage.navigateToReportModule();

    await reportPage.verifyThemeMatches(dashboardTheme, 'TH-02');
  });

  test('TH-03: Refresh Report Module and verify theme remains consistent', async ({ page }) => {
    await dashboardPage.selectColourPalette('Amber');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const selectedTheme = await dashboardPage.getActiveThemeState();

    await dashboardPage.navigateToReportModule();
    await reportPage.refreshReportPage();

    await reportPage.verifyThemeMatches(selectedTheme, 'TH-03');
  });

  test('TH-04: Navigate Dashboard -> Report -> Dashboard and verify theme remains consistent', async ({ page }) => {
    await dashboardPage.selectColourPalette('Indigo Violet');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const selectedTheme = await dashboardPage.getActiveThemeState();

    // Step 1: Dashboard -> Report Module
    await dashboardPage.navigateToReportModule();
    await reportPage.verifyThemeMatches(selectedTheme, 'TH-04 (Report Module)');

    // Step 2: Report Module -> Dashboard
    await dashboardPage.navigateToDashboard();
    await expect(
      page.locator('html'),
      'TH-04: HTML data-theme-mode should remain dark on return to Dashboard'
    ).toHaveAttribute('data-theme-mode', selectedTheme.mode || 'dark');

    const dashboardThemeOnReturn = await dashboardPage.getActiveThemeState();
    expect(dashboardThemeOnReturn.mode, 'TH-04: Dashboard mode should remain dark on return').toBe(selectedTheme.mode);
    expect(dashboardThemeOnReturn.primaryColor, 'TH-04: Dashboard primary color should remain consistent').toBe(
      selectedTheme.primaryColor
    );
    expect(dashboardThemeOnReturn.bgDashboard, 'TH-04: Dashboard --bg-dashboard token should remain consistent').toBe(
      selectedTheme.bgDashboard
    );
    expect(dashboardThemeOnReturn.bgCard, 'TH-04: Dashboard --bg-card token should remain consistent').toBe(
      selectedTheme.bgCard
    );
    expect(dashboardThemeOnReturn.textMain, 'TH-04: Dashboard --text-main token should remain consistent').toBe(
      selectedTheme.textMain
    );
  });

  test('TH-05: Change theme again and reopen Report Module to verify latest selection is reflected', async ({ page }) => {
    // First selection: Corporate Blue + Dark
    await dashboardPage.selectColourPalette('Corporate Blue');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const firstTheme = await dashboardPage.getActiveThemeState();

    await dashboardPage.navigateToReportModule();
    await reportPage.verifyThemeMatches(firstTheme, 'TH-05 (First Selection)');

    // Second selection: Ocean Teal + Light
    await dashboardPage.selectColourPalette('Ocean Teal');
    await dashboardPage.setThemeMode('light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const secondTheme = await dashboardPage.getActiveThemeState();

    expect(secondTheme.primaryColor, 'TH-05: Second palette primary color should differ from first selection').not.toBe(
      firstTheme.primaryColor
    );
    expect(secondTheme.mode, 'TH-05: Second theme mode should be light').toBe('light');

    await dashboardPage.navigateToReportModule();
    await reportPage.verifyThemeMatches(secondTheme, 'TH-05 (Second Selection)');
  });

  test('TH-06: Open Report Module directly or in a new tab and verify behavior follows application preference rules', async ({ page, context }) => {
    await dashboardPage.selectColourPalette('Graphite');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const activeTheme = await dashboardPage.getActiveThemeState();

    // Part A: Direct URL navigation to Report Module within the authenticated session
    await page.goto('https://base-application-stage.oomnieye.com/#/dashboard/reports');
    await reportPage.verifyThemeMatches(activeTheme, 'TH-06 (Direct URL Navigation)');

    // Part B: Opening Report Module in a new tab
    const sessionAuthData = await page.evaluate(() => JSON.stringify(sessionStorage));
    const newTab = await context.newPage();

    await newTab.addInitScript((storageJson) => {
      const entries = JSON.parse(storageJson);
      for (const [key, val] of Object.entries(entries)) {
        sessionStorage.setItem(key, val as string);
      }
    }, sessionAuthData);

    await newTab.goto('https://base-application-stage.oomnieye.com/#/dashboard/reports');
    const newTabReportPage = new ReportPage(newTab);
    await newTabReportPage.verifyThemeMatches(activeTheme, 'TH-06 (New Tab Navigation)');

    await newTab.close();
  });

  test('TH-07: Inspect key Report Module UI elements for readability and theme consistency', async ({ page }) => {
    await dashboardPage.selectColourPalette('Corporate Blue');
    await dashboardPage.setThemeMode('dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    const selectedTheme = await dashboardPage.getActiveThemeState();

    await dashboardPage.navigateToReportModule();
    await reportPage.verifyReportUIReadabilityAndConsistency(selectedTheme);
  });

  test('TH-08: Simulate corrupted/unsupported theme preference in storage and verify graceful fallback', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'omnieye-theme-studio',
        JSON.stringify({ preset: 'UNSUPPORTED_INVALID_THEME_999', mode: 'invalid_mode' })
      );
    });

    await dashboardPage.navigateToReportModule();
    await reportPage.refreshReportPage();

    await expect(reportPage.reportsHeading, 'TH-08: Reports page heading should remain visible on fallback').toBeVisible();
    await expect(reportPage.reportTable, 'TH-08: Reports table should render without UI crash').toBeVisible();

    const fallbackState = await reportPage.getReportThemeState();
    expect(
      ['light', 'dark'],
      'TH-08: Application should fall back to a valid theme mode (light or dark)'
    ).toContain(fallbackState.mode);
  });
});