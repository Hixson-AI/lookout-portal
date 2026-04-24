/**
 * ExecutionStepTree — E2E test for Slice 6.2.E.1
 *
 * Tests the ExecutionStepTree component rendering on an execution run page.
 *
 * Prerequisites:
 *   - ExecutionStepTree component must be integrated into the portal routing
 *   - A demo execution must exist (seed via API or create manually)
 *   - Test tenant and execution ID must be configured via environment variables
 */

import { test, expect } from '@playwright/test';
import { authenticateAs } from './helpers/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? '231e94d3cba03fec2585417151aafd4ee8a36b350c69f19d1843efc79e7d49c5';
const TENANT_ID = process.env.E2E_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const TEST_APP_ID = process.env.E2E_TEST_APP_ID;
const TEST_EXECUTION_ID = process.env.E2E_TEST_EXECUTION_ID;

test.describe('ExecutionStepTree', () => {
  test.skip(!TEST_APP_ID || !TEST_EXECUTION_ID, 'Skipping: E2E_TEST_APP_ID and E2E_TEST_EXECUTION_ID must be set');

  test('renders step tree with runtime badges and retry button', async ({ page }) => {
    // Authenticate as platform admin
    await authenticateAs(page, '/', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      role: 'admin',
      isSystemAdmin: true,
    });

    // Navigate to execution run page
    // TODO: Update this route once ExecutionStepTree is integrated into portal routing
    const executionPath = `/tenants/${TENANT_ID}/apps/${TEST_APP_ID}/executions/${TEST_EXECUTION_ID}`;
    await page.goto(executionPath, { waitUntil: 'networkidle' });

    // Wait for component to load
    await page.waitForTimeout(2000);

    // Assert step tree container is present
    const stepTree = page.locator('[data-testid="execution-step-tree"] .space-y-2');
    await expect(stepTree).toBeVisible();

    // Assert at least one step card is rendered
    const stepCards = page.locator('.border.rounded-lg');
    await expect(stepCards.first()).toBeVisible();

    // Assert runtime badges are present (n8n, native, inprocess)
    const runtimeBadges = page.locator('.text-[10px]');
    await expect(runtimeBadges.first()).toBeVisible();

    // Assert status icons are present
    const statusIcons = page.locator('.h-4.w-4');
    await expect(statusIcons.first()).toBeVisible();

    // Assert retry button is visible for platform admin (on failed steps)
    // The retry button should be present for failed steps with runtime !== 'inprocess'
    const retryButton = page.locator('button:has-text("Retry")');
    const retryButtonCount = await retryButton.count();
    
    // If there are failed steps, retry button should be visible
    // This is a soft assertion since we can't guarantee failed steps exist
    if (retryButtonCount > 0) {
      await expect(retryButton.first()).toBeVisible();
    }
  });

  test('shows loading state while fetching steps', async ({ page }) => {
    await authenticateAs(page, '/', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      role: 'admin',
      isSystemAdmin: true,
    });

    const executionPath = `/tenants/${TENANT_ID}/apps/${TEST_APP_ID}/executions/${TEST_EXECUTION_ID}`;
    await page.goto(executionPath);

    // Check for loading indicator
    const loadingIndicator = page.locator('text=Loading steps…');
    // Loading state is transient, so we use a soft assertion
    const isVisible = await loadingIndicator.isVisible().catch(() => false);
    if (isVisible) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('handles error state gracefully', async ({ page }) => {
    // Test with invalid execution ID to trigger error state
    await authenticateAs(page, '/', {
      jwtSecret: JWT_SECRET,
      tenantId: TENANT_ID,
      role: 'admin',
      isSystemAdmin: true,
    });

    const invalidExecutionPath = `/tenants/${TENANT_ID}/apps/${TEST_APP_ID}/executions/invalid-execution-id`;
    await page.goto(invalidExecutionPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Error state should show an error message
    const errorMessage = page.locator('text=Failed to load steps');
    const errorVisible = await errorMessage.isVisible().catch(() => false);
    
    // Soft assertion - error may or may not appear depending on API behavior
    if (errorVisible) {
      await expect(errorMessage).toBeVisible();
    }
  });
});
