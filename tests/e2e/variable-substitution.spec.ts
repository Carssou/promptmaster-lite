import { test, expect } from './setup';

test.describe('Variable Substitution', () => {
  test('should detect and substitute variables in real-time', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Variable Test');
    
    // Add content with variables
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Hello {{name}}, your task is {{task}} and deadline is {{deadline}}.');
    
    // Wait for variable detection
    await page.waitForSelector('[data-testid="variable-panel"]', { timeout: 5000 });
    
    // Verify variables are detected
    await expect(page.locator('[data-testid="variable-name"]')).toContainText('name');
    await expect(page.locator('[data-testid="variable-task"]')).toContainText('task');
    await expect(page.locator('[data-testid="variable-deadline"]')).toContainText('deadline');
    
    // Check that variables start with fallback values
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText('Hello «name», your task is «task» and deadline is «deadline».');
    
    // Fill in variable values
    await page.fill('[data-testid="variable-input-name"]', 'John');
    await page.fill('[data-testid="variable-input-task"]', 'Write tests');
    await page.fill('[data-testid="variable-input-deadline"]', 'Tomorrow');
    
    // Wait for substitution to happen
    await page.waitForTimeout(500); // Allow for debouncing
    
    // Verify substitution in preview
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText('Hello John, your task is Write tests and deadline is Tomorrow.');
    
    // Test partial substitution
    await page.fill('[data-testid="variable-input-name"]', '');
    await page.waitForTimeout(500);
    
    // Should show fallback for empty variable
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText('Hello «name», your task is Write tests and deadline is Tomorrow.');
  });
  
  test('should handle invalid variable syntax', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Invalid Variable Test');
    
    // Add content with invalid variables
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Valid: {{valid_name}} Invalid: {{123invalid}} {{-invalid}} Unclosed: {{incomplete');
    
    // Wait for variable detection
    await page.waitForTimeout(1000);
    
    // Should only detect the valid variable
    await expect(page.locator('[data-testid="variable-valid_name"]')).toBeVisible();
    
    // Invalid variables should not appear in the panel
    await expect(page.locator('[data-testid="variable-123invalid"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="variable--invalid"]')).not.toBeVisible();
    
    // Check error markers in editor (if implemented)
    // This would require Monaco editor error markers to be visible
    // await expect(page.locator('[data-testid="editor-error-marker"]')).toBeVisible();
  });
  
  test('should handle nested braces gracefully', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Nested Braces Test');
    
    // Add content with nested braces
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Normal: {{name}} Nested: {{outer{{inner}}}} Valid: {{another}}');
    
    // Wait for variable detection
    await page.waitForTimeout(1000);
    
    // Should detect valid variables only
    await expect(page.locator('[data-testid="variable-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="variable-another"]')).toBeVisible();
    
    // Nested variable should not be detected
    await expect(page.locator('[data-testid="variable-outer"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="variable-inner"]')).not.toBeVisible();
  });
  
  test('should preserve variable values when editing content', async ({ cleanDatabase: page }) => {
    // Navigate to new prompt
    await page.click('text=New Prompt');
    await page.waitForSelector('[data-testid="prompt-editor"]', { timeout: 10000 });
    
    // Fill basic info
    await page.fill('[data-testid="prompt-title"]', 'Variable Persistence Test');
    
    // Add content with variables
    const editor = page.locator('[data-testid="prompt-editor"]');
    await editor.click();
    await page.keyboard.type('Hello {{name}}, your task is {{task}}.');
    
    // Wait for variable detection
    await page.waitForSelector('[data-testid="variable-panel"]', { timeout: 5000 });
    
    // Fill in variable values
    await page.fill('[data-testid="variable-input-name"]', 'Alice');
    await page.fill('[data-testid="variable-input-task"]', 'Code review');
    
    // Verify substitution
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText('Hello Alice, your task is Code review.');
    
    // Edit content to add more variables
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Your deadline is {{deadline}}.');
    
    // Wait for new variable detection
    await page.waitForTimeout(1000);
    
    // Original variables should still have their values
    await expect(page.locator('[data-testid="variable-input-name"]')).toHaveValue('Alice');
    await expect(page.locator('[data-testid="variable-input-task"]')).toHaveValue('Code review');
    
    // New variable should appear with fallback
    await expect(page.locator('[data-testid="variable-deadline"]')).toBeVisible();
    
    // Preview should maintain old substitutions and show new fallback
    await expect(page.locator('[data-testid="preview-panel"]')).toContainText('Hello Alice, your task is Code review. Your deadline is «deadline».');
  });
});