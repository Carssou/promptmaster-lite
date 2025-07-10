import { test, expect } from './setup';

test.describe('Edit → Save → Diff Flow', () => {
  test('should create prompt, edit content, save version, and view diff', async ({ cleanDatabase: page }) => {
    // Step 1: Create a new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill in the prompt details
    await page.fill('[data-testid="prompt-title"]', 'Test Prompt for E2E');
    await page.fill('[data-testid="prompt-tags"]', 'e2e, test');
    
    // Add initial content to the editor
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('# Test Prompt\n\nThis is the initial content with a variable: {{test_var}}');
    
    // Step 2: Save the prompt (first version)
    await page.keyboard.press('Meta+s'); // Cmd+S on Mac
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify version is v1.0.0
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.0');
    
    // Step 3: Edit the content
    await editor.click();
    await page.keyboard.press('Meta+a'); // Select all
    await page.keyboard.type('# Updated Test Prompt\n\nThis is the updated content with variables: {{test_var}} and {{new_var}}');
    
    // Step 4: Save the updated version
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Verify version bumped to v1.0.1
    await expect(page.locator('[data-testid="version-display"]')).toContainText('v1.0.1');
    
    // Step 5: Open diff view
    await page.keyboard.press('Meta+d'); // Cmd+D to open diff
    await page.waitForSelector('[data-testid="diff-viewer"]', { timeout: 5000 });
    
    // Verify diff shows changes
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
    await expect(page.locator('text=v1.0.0 → v1.0.1')).toBeVisible();
    
    // Verify diff content shows the changes
    await expect(page.locator('text=- This is the initial content')).toBeVisible();
    await expect(page.locator('text=+ This is the updated content')).toBeVisible();
    
    // Step 6: Exit diff view
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="diff-viewer"]', { state: 'hidden' });
    
    // Verify we're back to the editor
    await expect(page.locator('[data-testid="prompt-editor"]')).toBeVisible();
  });
  
  test('should handle keyboard shortcuts correctly', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Keyboard Test');
    
    // Add content
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Test content');
    
    // Test Cmd+S (save)
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Modify content
    await editor.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('Modified content');
    
    // Save again
    await page.keyboard.press('Meta+s');
    await page.waitForSelector('text=Saved successfully', { timeout: 5000 });
    
    // Test Cmd+D (diff)
    await page.keyboard.press('Meta+d');
    await page.waitForSelector('[data-testid="diff-viewer"]', { timeout: 5000 });
    
    // Test Escape (exit diff)
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="diff-viewer"]', { state: 'hidden' });
    
    // Test Cmd+? (help)
    await page.keyboard.press('Meta+Shift+?');
    await page.waitForSelector('[data-testid="help-modal"]', { timeout: 5000 });
    
    // Close help modal
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="help-modal"]', { state: 'hidden' });
  });
});