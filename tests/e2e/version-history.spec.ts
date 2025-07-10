import { test, expect } from './setup';

test.describe('Version History Navigation', () => {
  test('should create multiple versions and navigate through history', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Version History Test');
    await page.fill('[data-testid="prompt-tags"]', 'version, test');
    
    // Create version 1.0.0
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('# Version 1.0.0\n\nThis is the first version.');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify version 1.0.0
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.0');
    
    // Create version 1.0.1
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('# Version 1.0.1\n\nThis is the second version with changes.');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify version 1.0.1
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.1');
    
    // Create version 1.0.2
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('# Version 1.0.2\n\nThis is the third version with more changes.');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify version 1.0.2
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.2');
    
    // Open version history sidebar
    await page.click('[data-testid="version-history-toggle"]');
    await page.waitForSelector('[data-testid="version-history-sidebar"]', { timeout: 5000 });
    
    // Verify all versions are listed
    await expect(page.locator('[data-testid="version-item-v1.0.0"]')).toBeVisible();
    await expect(page.locator('[data-testid="version-item-v1.0.1"]')).toBeVisible();
    await expect(page.locator('[data-testid="version-item-v1.0.2"]')).toBeVisible();
    
    // Click on version 1.0.0 to view it
    await page.click('[data-testid="version-item-v1.0.0"]');
    await page.waitForTimeout(500);
    
    // Verify content switched to version 1.0.0
    await expect(page.locator('[data-testid="prompt-editor"]')).toContainText('This is the first version.');
    
    // Editor should be read-only when viewing old version
    await expect(page.locator('[data-testid="prompt-editor"]')).toHaveAttribute('data-readonly', 'true');
    
    // Click on version 1.0.1
    await page.click('[data-testid="version-item-v1.0.1"]');
    await page.waitForTimeout(500);
    
    // Verify content switched to version 1.0.1
    await expect(page.locator('[data-testid="prompt-editor"]')).toContainText('This is the second version with changes.');
    
    // Return to latest version
    await page.click('[data-testid="version-item-v1.0.2"]');
    await page.waitForTimeout(500);
    
    // Verify we're back to latest version and editor is editable
    await expect(page.locator('[data-testid="prompt-editor"]')).toContainText('This is the third version with more changes.');
    await expect(page.locator('[data-testid="prompt-editor"]')).not.toHaveAttribute('data-readonly', 'true');
  });
  
  test('should support version comparison via shift+click', async ({ cleanDatabase: page }) => {
    // Create a prompt with multiple versions (setup)
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    await page.fill('[data-testid="prompt-title"]', 'Comparison Test');
    
    // Version 1
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Original content');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Version 2
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('Modified content');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Open version history
    await page.click('[data-testid="version-history-toggle"]');
    await page.waitForSelector('[data-testid="version-history-sidebar"]', { timeout: 5000 });
    
    // Select first version
    await page.click('[data-testid="version-item-v1.0.0"]');
    
    // Shift+click second version to compare
    await page.keyboard.down('Shift');
    await page.click('[data-testid="version-item-v1.0.1"]');
    await page.keyboard.up('Shift');
    
    // Wait for diff view
    await page.waitForSelector('[data-testid="diff-viewer"]', { timeout: 5000 });
    
    // Verify diff is showing
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
    await expect(page.locator('text=v1.0.0 → v1.0.1')).toBeVisible();
    
    // Verify diff content
    await expect(page.locator('text=- Original content')).toBeVisible();
    await expect(page.locator('text=+ Modified content')).toBeVisible();
    
    // Exit diff view
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="diff-viewer"]', { state: 'hidden' });
  });
  
  test('should support version rollback', async ({ cleanDatabase: page }) => {
    // Create a prompt with multiple versions
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    await page.fill('[data-testid="prompt-title"]', 'Rollback Test');
    
    // Version 1
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Good content');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Version 2 (bad version we want to rollback)
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('Bad content that we want to rollback');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify we're on version 1.0.1
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.1');
    
    // Open version history
    await page.click('[data-testid="version-history-toggle"]');
    await page.waitForSelector('[data-testid="version-history-sidebar"]', { timeout: 5000 });
    
    // Click rollback button for version 1.0.0
    await page.click('[data-testid="rollback-button-v1.0.0"]');
    
    // Confirm rollback in modal
    await page.waitForSelector('[data-testid="rollback-confirmation"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-rollback"]');
    
    // Wait for rollback to complete
    await page.waitForSelector('text=Rolled back successfully', { timeout: 5000 });
    
    // Verify new version was created (1.0.2)
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.2');
    
    // Verify content is back to the good version
    await expect(page.locator('[data-testid="prompt-editor"]')).toContainText('Good content');
    
    // Verify version history shows the rollback
    await expect(page.locator('[data-testid="version-item-v1.0.2"]')).toBeVisible();
  });
  
  test('should handle version timestamps and metadata', async ({ cleanDatabase: page }) => {
    // Create a prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    await page.fill('[data-testid="prompt-title"]', 'Metadata Test');
    
    // Create first version
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Test content');
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Open version history
    await page.click('[data-testid="version-history-toggle"]');
    await page.waitForSelector('[data-testid="version-history-sidebar"]', { timeout: 5000 });
    
    // Verify version metadata is displayed
    const versionItem = page.locator('[data-testid="version-item-v1.0.0"]');
    await expect(versionItem).toBeVisible();
    
    // Check for timestamp (should be recent)
    await expect(versionItem).toContainText('ago'); // e.g., "2 minutes ago"
    
    // Hover over version to see tooltip (if implemented)
    await versionItem.hover();
    // await expect(page.locator('[data-testid="version-tooltip"]')).toBeVisible();
  });
});