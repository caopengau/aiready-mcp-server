import { test, expect } from '@playwright/test';

test.describe('ClawMore SEO Metadata', () => {
  test('homepage has correct SEO tags', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ClawMore/);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toContain('AI');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /logo-text-raw-1024.png/
    );
  });

  test.skip('blog index has correct SEO tags', async ({ page }) => {
    // /blog returns 403 in production CloudFront — skip until routing is fixed
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog | ClawMore/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /logo-text-raw-1024.png/
    );
  });
});
