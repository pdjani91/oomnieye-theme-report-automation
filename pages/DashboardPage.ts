import { Page, Locator, expect } from '@playwright/test';

export type SupportedPalette =
  | 'Corporate Blue'
  | 'Emerald'
  | 'Indigo Violet'
  | 'Graphite'
  | 'Ocean Teal'
  | 'Amber';

export interface ThemeState {
  mode: string | null;
  primaryColor: string;
  bgDashboard: string;
  bgCard: string;
  textMain: string;
  bodyComputedBg: string;
  storedThemeJson: string | null;
}

export class DashboardPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly dashboardNavLink: Locator;
  readonly themeStudioLink: Locator;
  readonly reportBuilderLink: Locator;
  readonly themeSettingsAccordion: Locator;
  readonly switchToDarkBtn: Locator;
  readonly switchToLightBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign in' });

    this.dashboardNavLink = page.getByRole('link', { name: 'Dashboard' });
    this.themeStudioLink = page.getByRole('link', { name: 'Theme Studio' });
    this.reportBuilderLink = page.getByRole('link', { name: 'Report Builder' });

    this.themeSettingsAccordion = page.locator('button', { hasText: 'Theme Settings' });
    this.switchToDarkBtn = page.locator('button[title="Switch to Dark Mode"]');
    this.switchToLightBtn = page.locator('button[title="Switch to Light Mode"]');
  }

  async login(): Promise<void> {
    const username = process.env.APP_USERNAME;
    const password = process.env.APP_PASSWORD;

    if (!username || !password) {
      throw new Error('Missing APP_USERNAME or APP_PASSWORD in .env file');
    }

    await this.page.goto('https://base-application-stage.oomnieye.com/#/login');
    await this.emailInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();

    await expect(this.page, 'Should redirect to Dashboard after login').toHaveURL(/.*dashboard.*/i);
  }

  async openThemeSettingsPanel(): Promise<void> {
    await this.themeStudioLink.click();
    await expect(this.themeSettingsAccordion, 'Theme Settings accordion should be visible').toBeVisible();

    const corporateBlueTile = this.page.locator('[title*="Corporate Blue — applies this colour palette"]').first();
    if (!(await corporateBlueTile.isVisible().catch(() => false))) {
      await this.themeSettingsAccordion.click();
    }
    await expect(corporateBlueTile, 'Theme palette options should be visible').toBeVisible();
  }

  async selectColourPalette(palette: SupportedPalette): Promise<void> {
    await this.openThemeSettingsPanel();
    const paletteTile = this.page.locator(`[title*="${palette} — applies this colour palette"]`).first();
    await expect(paletteTile, `Palette option "${palette}" should be visible`).toBeVisible();
    await paletteTile.click();
  }

  async setThemeMode(targetMode: 'dark' | 'light'): Promise<void> {
    const currentMode = await this.page.locator('html').getAttribute('data-theme-mode');
    if (currentMode !== targetMode) {
      if (targetMode === 'dark') {
        await expect(this.switchToDarkBtn, 'Switch to Dark Mode button should be visible').toBeVisible();
        await this.switchToDarkBtn.click();
      } else {
        await expect(this.switchToLightBtn, 'Switch to Light Mode button should be visible').toBeVisible();
        await this.switchToLightBtn.click();
      }
    }
    await expect(
      this.page.locator('html'),
      `HTML data-theme-mode attribute should update to "${targetMode}"`
    ).toHaveAttribute('data-theme-mode', targetMode);
  }

  async navigateToDashboard(): Promise<void> {
    await this.dashboardNavLink.click();
    await expect(this.page, 'Should be on Dashboard overview URL').toHaveURL(/.*dashboard\/overview.*/i);
  }

  async navigateToReportModule(): Promise<void> {
    await this.reportBuilderLink.click();
    await expect(this.page, 'Should navigate to Report Builder URL').toHaveURL(/.*dashboard\/reports.*/i);
  }

  async getActiveThemeState(): Promise<ThemeState> {
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
}