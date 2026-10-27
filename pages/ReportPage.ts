import { Page, Locator, expect } from '@playwright/test';
import { ThemeState } from './DashboardPage';

export class ReportPage {
  readonly page: Page;
  readonly reportsHeading: Locator;
  readonly reportTable: Locator;
  readonly tableHeaderRow: Locator;
  readonly tableHeaderCells: Locator;
  readonly tableBodyCells: Locator;
  readonly defaultViewButton: Locator;
  readonly searchOrFilterInputs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.reportsHeading = page.locator('h1, h2, h3').filter({ hasText: 'Reports' }).first();
    this.reportTable = page.locator('.MuiTable-root').first();
    this.tableHeaderRow = page.locator('.MuiTableRow-head').first();
    this.tableHeaderCells = page.locator('.MuiTableCell-head');
    this.tableBodyCells = page.locator('.MuiTableCell-body');
    this.defaultViewButton = page.getByRole('button', { name: 'Default View' });
    this.searchOrFilterInputs = page.locator('input, select, [role="combobox"]');
  }

  async waitForReportPageLoaded(): Promise<void> {
    await expect(this.page, 'Should be on Report Module route').toHaveURL(/.*reports.*/i);
    await expect(this.reportsHeading, 'Reports heading should be visible').toBeVisible();
    await expect(this.reportTable, 'Reports data table should be visible').toBeVisible();
  }

  async refreshReportPage(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForReportPageLoaded();
  }

  async getReportThemeState(): Promise<ThemeState> {
    await this.waitForReportPageLoaded();
    return await this.page.evaluate(() => {
      const root = document.documentElement;
      return {
        mode: root.getAttribute('data-theme-mode'),
        primaryColor: root.style.getPropertyValue('--primary').trim(),
        bgDashboard: root.style.getPropertyValue('--bg-dashboard').trim(),
        bgCard: root.style.getPropertyValue('--bg-card').trim(),
        textMain: root.style.getPropertyValue('--text-main').trim(),
        bodyComputedBg: window.getComputedStyle(document.body).backgroundColor,
        storedThemeJson: localStorage.getItem('omnieye-theme-studio'),
      };
    });
  }

  async verifyThemeMatches(expected: ThemeState, scenarioId: string): Promise<void> {
    await this.waitForReportPageLoaded();

    await expect(
      this.page.locator('html'),
      `${scenarioId}: Report Module data-theme-mode attribute should match selected theme`
    ).toHaveAttribute('data-theme-mode', expected.mode || 'light');

    await expect(
      this.page.locator('body'),
      `${scenarioId}: Report Module computed body background color should match`
    ).toHaveCSS('background-color', expected.bodyComputedBg);

    const actual = await this.getReportThemeState();
    expect(actual.primaryColor, `${scenarioId}: Report Module --primary CSS variable should match selected palette`).toBe(
      expected.primaryColor
    );
    expect(actual.bgDashboard, `${scenarioId}: Report Module --bg-dashboard CSS variable should match`).toBe(
      expected.bgDashboard
    );
  }

  async verifyReportUIReadabilityAndConsistency(expected: ThemeState): Promise<void> {
    await this.waitForReportPageLoaded();

    // 1. Verify Heading visibility & contrast against body background
    await expect(this.reportsHeading, 'Reports heading must be visible').toBeVisible();
    const headingStyles = await this.reportsHeading.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { color: style.color, bodyBg: window.getComputedStyle(document.body).backgroundColor };
    });
    expect(
      headingStyles.color,
      'Reports heading text color must be readable against page background'
    ).not.toBe(headingStyles.bodyBg);

    // 2. Verify Table & Table Header row styles
    await expect(this.reportTable, 'Report table must be visible').toBeVisible();
    await expect(this.tableHeaderRow, 'Report table header row must be visible').toBeVisible();

    const headerStyles = await this.tableHeaderCells.first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      const rowBg = window.getComputedStyle(el.closest('tr') || el).backgroundColor;
      return { textColor: style.color, rowBg };
    });
    expect(
      headerStyles.textColor,
      'Table header cell text color must not blend into table header background'
    ).not.toBe(headerStyles.rowBg);

    // 3. Verify Table Body Cells readability in active mode (Dark/Light)
    if ((await this.tableBodyCells.count()) > 0) {
      const bodyCellColor = await this.tableBodyCells.first().evaluate((el) => window.getComputedStyle(el).color);
      expect(
        bodyCellColor,
        'Table body cell text color must be readable against page background'
      ).not.toBe(expected.bodyComputedBg);
    }

    // 4. Verify Controls / Buttons usability
    if (await this.defaultViewButton.isVisible().catch(() => false)) {
      await expect(this.defaultViewButton, 'Default View button should be enabled and visible').toBeEnabled();
    }
  }
}