import { test, expect } from '@playwright/test';

const STORY_SLUGS = [
  '404-not-found', 'buffer-overflow', 'cache-invalidation', 'cafe-debug',
  'deadlock', 'dns-quest', 'docker-escape', 'encoding-error',
  'floating-point', 'fork-bomb', 'garbage-collection', 'git-blame',
  'haunted-network', 'infinite-loop', 'kernel-panic', 'memory-leak',
  'merge-conflict', 'midnight-deploy', 'permission-denied',
  'pipeline-purrdition', 'race-condition', 'regex-catastrophe',
  'segfault', 'server-room-stray', 'sql-injection', 'stack-overflow',
  'the-terminal-cat', 'tls-pawshake', 'vim-escape', 'zombie-process'
];

async function waitForTitleScreen(page) {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('NyanTales', { timeout: 15000 });
  await page.waitForFunction(() => {
    return document.querySelectorAll('.story-card').length >= 20
      && document.querySelectorAll('.chapter-card').length >= 20;
  }, { timeout: 30000 });
}

async function startStory(page, titlePattern = /Terminal Cat/i) {
  await waitForTitleScreen(page);

  const card = page.locator('.story-card').filter({ hasText: titlePattern }).first();
  await expect(card).toBeVisible();
  await card.click();

  const intro = page.locator('.story-intro-overlay');
  await expect(intro).toBeVisible({ timeout: 10000 });
  await intro.getByRole('button', { name: /continue/i }).click();

  const text = page.locator('#vn-text');
  await expect(text).not.toHaveText(/^\s*$/, { timeout: 15000 });

  return {
    text,
    choices: page.locator('.choice-btn'),
    hud: page.locator('.vn-hud')
  };
}

async function waitForChoices(page, min = 1) {
  await page.waitForFunction((count) => {
    return document.querySelectorAll('.choice-btn').length >= count;
  }, min, { timeout: 20000 });
}

async function ensureFullTextVisible(page) {
  await page.locator('#vn-textbox').click();
  await waitForChoices(page, 1);
}

test.describe('Title Screen', () => {
  test('loads title screen with story and campaign grids', async ({ page }) => {
    await waitForTitleScreen(page);

    await expect(page.locator('.story-card')).toHaveCount(30);
    await expect(page.locator('.chapter-card')).toHaveCount(26);
    await expect(page.locator('#btn-campaign')).toBeVisible();
  });

  test('story cards show title text and info controls', async ({ page }) => {
    await waitForTitleScreen(page);

    const firstCard = page.locator('.story-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('h3')).not.toHaveText(/^\s*$/);
    await expect(firstCard.locator('.story-card-info-btn')).toBeVisible();
    await expect(firstCard.locator('.story-card-fav-btn')).toBeVisible();
  });

  test('title browser remembers search, filter, and sort after reload', async ({ page }) => {
    await waitForTitleScreen(page);

    await page.locator('#filter-input').fill('terminal');
    await page.locator('.filter-tag[data-filter="new"]').click();
    await page.locator('#sort-select').selectOption('title-desc');
    await expect(page.locator('#filter-clear')).toBeVisible();

    await page.reload();
    await waitForTitleScreen(page);

    await expect(page.locator('#filter-input')).toHaveValue('terminal');
    await expect(page.locator('.filter-tag[data-filter="new"]')).toHaveClass(/active/);
    await expect(page.locator('#sort-select')).toHaveValue('title-desc');
    await expect(page.locator('#filter-clear')).toBeVisible();
    await expect(page.locator('#filter-count')).toContainText('1 story');
  });

  test('title browser clear button resets search, filter, and sort', async ({ page }) => {
    await waitForTitleScreen(page);

    await page.locator('#filter-input').fill('terminal');
    await page.locator('.filter-tag[data-filter="new"]').click();
    await page.locator('#sort-select').selectOption('title-desc');
    await page.locator('#filter-clear').click();

    await expect(page.locator('#filter-input')).toHaveValue('');
    await expect(page.locator('.filter-tag[data-filter="all"]')).toHaveClass(/active/);
    await expect(page.locator('#sort-select')).toHaveValue('title-asc');
    await expect(page.locator('#filter-clear')).toBeHidden();
  });

  test('story info modal opens from a card', async ({ page }) => {
    await waitForTitleScreen(page);

    const card = page.locator('.story-card').filter({ hasText: /Terminal Cat/i }).first();
    await card.locator('.story-card-info-btn').click();

    const modal = page.locator('.story-info-overlay');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Terminal Cat/i);
    await expect(modal.getByRole('button', { name: /play/i })).toBeVisible();
  });

  test('story info modal share button copies a deep link', async ({ page }) => {
    await page.addInitScript(() => {
      window.__copiedStoryLink = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text) => { window.__copiedStoryLink = text; }
        }
      });
      navigator.share = undefined;
    });

    await waitForTitleScreen(page);
    const card = page.locator('.story-card').filter({ hasText: /Terminal Cat/i }).first();
    await card.locator('.story-card-info-btn').click();

    const modal = page.locator('.story-info-overlay');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /share/i }).click();

    const copiedText = await page.evaluate(() => window.__copiedStoryLink);
    expect(copiedText).toContain('NyanTales — The Terminal Cat');
    expect(copiedText).toContain('/?story=the-terminal-cat');
  });
});

test.describe('Story Playback', () => {
  test('can start a story and show choices', async ({ page }) => {
    const { text, choices } = await startStory(page);

    await ensureFullTextVisible(page);
    await expect(text).toContainText(/./);
    await expect(choices.first()).toBeVisible();
    await expect(choices).toHaveCount(2);
  });

  test('clicking a choice advances the story', async ({ page }) => {
    const { text, choices } = await startStory(page);

    await ensureFullTextVisible(page);
    const before = await text.textContent();
    await choices.first().click();
    await expect(text).not.toHaveText(before || '', { timeout: 15000 });
  });

  test('number-key shortcuts can pick a choice', async ({ page }) => {
    const { text } = await startStory(page);

    await ensureFullTextVisible(page);
    const before = await text.textContent();
    await page.keyboard.press('1');
    await expect(text).not.toHaveText(before || '', { timeout: 15000 });
  });
});

test.describe('VN Panels and Controls', () => {
  test('settings panel exposes text-speed and auto-play controls', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.locator('#btn-settings').click();
    const overlay = page.locator('.settings-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('#set-text-speed')).toBeVisible();
    await expect(overlay.locator('#set-auto-play')).toBeVisible();
    await expect(overlay.locator('#set-skip-read')).toBeVisible();
    await expect(overlay.locator('#row-auto-delay')).toBeHidden();
    await overlay.locator('#set-auto-play').click();
    await expect(overlay.locator('#row-auto-delay')).toBeVisible();
    await expect(overlay.locator('#set-auto-delay')).toBeVisible();
  });

  test('history panel records dialogue after advancing', async ({ page }) => {
    const { choices } = await startStory(page);
    await ensureFullTextVisible(page);
    await choices.first().click();
    await ensureFullTextVisible(page);

    await page.locator('#btn-history').click();
    const overlay = page.locator('.history-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('.history-entry').first()).toBeVisible();
    await expect(overlay.locator('.history-count')).toContainText(/entries|matching/i);
  });

  test('auto-play HUD toggle updates pressed state', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    const btn = page.locator('#btn-auto');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('mobile HUD overflow can expand extra controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { hud } = await startStory(page);
    await ensureFullTextVisible(page);

    const moreBtn = page.locator('#btn-hud-more');
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();
    await expect(hud).toHaveClass(/hud-expanded/);
  });
});

test.describe('Statistics Dashboard', () => {
  test('story breakdown can search and launch a story row', async ({ page }) => {
    await waitForTitleScreen(page);

    await page.locator('#btn-stats').click();
    const overlay = page.locator('.stats-overlay');
    await expect(overlay).toBeVisible();

    const search = overlay.locator('.stats-search');
    await search.fill('terminal cat');
    await expect(overlay.locator('.stats-story-count')).toContainText('1/30 shown');

    const row = overlay.locator('.stats-table-row').first();
    await expect(row).toContainText(/Terminal Cat/i);
    await row.click();

    const intro = page.locator('.story-intro-overlay');
    await expect(intro).toBeVisible({ timeout: 10000 });
    await expect(intro).toContainText(/Terminal Cat/i);
  });

  test('search and sort choices persist when reopening statistics', async ({ page }) => {
    await waitForTitleScreen(page);

    await page.locator('#btn-stats').click();
    const overlay = page.locator('.stats-overlay');
    await expect(overlay).toBeVisible();

    await overlay.locator('.stats-search').fill('terminal');
    await overlay.locator('.stats-sort').selectOption('title-asc');
    await overlay.locator('.stats-close').click();
    await expect(overlay).not.toHaveClass(/visible/);

    await page.locator('#btn-stats').click();
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('.stats-search')).toHaveValue('terminal');
    await expect(overlay.locator('.stats-sort')).toHaveValue('title-asc');
    await expect(overlay.locator('.stats-story-count')).toContainText('1/30 shown');
  });
});

test.describe('Story Assets', () => {
  for (const slug of STORY_SLUGS) {
    test(`story YAML loads: ${slug}`, async ({ page }) => {
      const resp = await page.request.get(`/stories/${slug}/story.yaml`);
      expect(resp.status()).toBe(200);
      const text = await resp.text();
      expect(text).toContain('title:');
      expect(text).toContain('scenes:');
      expect(text.length).toBeGreaterThan(500);
    });
  }
});

test.describe('Error Free', () => {
  test('no page errors on boot', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await waitForTitleScreen(page);
    expect(pageErrors).toEqual([]);
  });

  test('no page errors during gameplay and panel usage', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const { choices } = await startStory(page);
    await ensureFullTextVisible(page);
    await choices.first().click();
    await ensureFullTextVisible(page);
    await page.locator('#btn-settings').click();
    await expect(page.locator('.settings-overlay')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
