import { test as base } from '@playwright/test';

// Test fixtures for common setup
export const test = base.extend({
  // Set up a clean database state before each test
  cleanDatabase: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the dashboard or need to navigate there
    const url = page.url();
    if (!url.includes('/dashboard') && !url.includes('/')) {
      await page.goto('/dashboard');
    }
    
    await use(page);
  },
});

export { expect } from '@playwright/test';