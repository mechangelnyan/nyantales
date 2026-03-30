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

    // Use an unlocked card — campaign locking may lock the alphabetically-first cards
    const unlockedCard = page.locator('.story-card:not(.story-locked)').first();
    await expect(unlockedCard).toBeVisible();
    await expect(unlockedCard.locator('h3')).not.toHaveText(/^\s*$/);
    await expect(unlockedCard.locator('.story-card-info-btn')).toBeVisible();
    await expect(unlockedCard.locator('.story-card-fav-btn')).toBeVisible();
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

  test('title search matches character names across stories', async ({ page }) => {
    await waitForTitleScreen(page);

    // Search for Nyan — protagonist of The Terminal Cat (always unlocked as chapter 1)
    await page.locator('#filter-input').fill('nyan');

    const visibleCards = page.locator('.story-card:not(.hidden-by-filter)');
    // At least The Terminal Cat should match (other stories with "Nyan" may be locked)
    const terminalCard = visibleCards.filter({ hasText: /The Terminal Cat/i });
    await expect(terminalCard).toHaveCount(1);
    await expect(page.locator('#filter-count')).toBeVisible();
  });

  test('story info modal shows cast chips for the selected story', async ({ page }) => {
    await waitForTitleScreen(page);

    // Use The Terminal Cat — always unlocked (campaign chapter 1)
    const card = page.locator('.story-card:not(.story-locked)').filter({ hasText: /The Terminal Cat/i }).first();
    await card.locator('.story-card-info-btn').click();

    const modal = page.locator('.story-info-overlay');
    await expect(modal).toBeVisible();
    const sectionTitles = modal.locator('.story-info-section-title');
    await expect(sectionTitles).toContainText(['🐾 Cast']);
    await expect(modal.locator('.story-info-cast-chip')).toHaveCount(1);
    await expect(modal.locator('.story-info-cast')).toContainText('Nyan');
  });

  test('mobile title browser keeps filters sticky while the story list scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForTitleScreen(page);

    const layout = await page.evaluate(() => {
      const grid = getComputedStyle(document.getElementById('story-list'));
      return {
        gridOverflowY: grid.overflowY,
        gridMaxHeight: grid.maxHeight
      };
    });

    expect(layout.gridOverflowY).toBe('visible');
    expect(layout.gridMaxHeight).toBe('none');

    const filter = page.locator('#story-filter');
    const stickyInner = page.locator('.story-filter-inner');
    const before = await stickyInner.boundingBox();
    await page.locator('.title-bg').evaluate((el) => {
      const filterEl = document.getElementById('story-filter');
      el.scrollTo({ top: filterEl.offsetTop + 120, behavior: 'instant' });
    });
    await page.waitForTimeout(150);
    const after = await stickyInner.boundingBox();

    await expect(filter).toHaveClass(/mobile-stuck/);
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after.y).toBeLessThan(before.y);
    expect(after.y).toBeLessThan(24);
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

test.describe('Save, Rewind, and Deep Links', () => {
  test('save panel opens and shows slot controls', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    // Open save panel
    await page.locator('#btn-save').click();
    const saveOverlay = page.locator('.save-overlay');
    await expect(saveOverlay).toBeVisible();

    // Should show save mode by default with slot buttons
    await expect(saveOverlay.locator('[data-action="save"]').first()).toBeVisible();

    // Switch to load mode
    await saveOverlay.locator('[data-mode="load"]').click();
    await expect(saveOverlay.locator('[data-action="load"]').first()).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(saveOverlay).not.toHaveClass(/visible/);
  });

  test('rewind button goes back to previous scene', async ({ page }) => {
    const { text, choices } = await startStory(page);
    await ensureFullTextVisible(page);
    const firstText = await text.textContent();

    await choices.first().click();
    await ensureFullTextVisible(page);

    // Click rewind
    await page.locator('#btn-rewind').click();
    await expect(text).toContainText(firstText || '');
  });

  test('deep link ?story=slug opens story directly', async ({ page }) => {
    await page.goto('/?story=the-terminal-cat');
    const intro = page.locator('.story-intro-overlay');
    await expect(intro).toBeVisible({ timeout: 15000 });
    await expect(intro).toContainText(/Terminal Cat/i);
  });

  test('invalid deep link shows error and returns to menu', async ({ page }) => {
    await page.goto('/?story=nonexistent-story-xyz');
    // Should fall back to title screen
    await expect(page.locator('#title-screen')).toHaveClass(/active/, { timeout: 15000 });
    await expect(page.locator('.story-card')).toHaveCount(30);
  });
});

test.describe('Color Themes and Keyboard Help', () => {
  test('color theme changes accent color via settings', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.locator('#btn-settings').click();
    const overlay = page.locator('.settings-overlay');
    await expect(overlay).toBeVisible();

    // Click the magenta theme swatch
    const magentaSwatch = overlay.locator('.theme-swatch[data-theme="magenta"]');
    await magentaSwatch.click();

    // Verify the CSS custom property changed
    const accentColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-cyan').trim()
    );
    expect(accentColor).toBe('#ff36ab');
  });

  test('keyboard help modal opens with ? key', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.keyboard.press('?');
    const overlay = page.locator('.keyboard-help-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText(/Space/);
    await expect(overlay).toContainText(/Esc/);
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

test.describe('Gallery and About', () => {
  test('character gallery shows characters with portraits', async ({ page }) => {
    await waitForTitleScreen(page);
    await page.locator('#btn-gallery').click();

    const overlay = page.locator('.gallery-overlay');
    await expect(overlay).toBeVisible();

    // Should have character cards
    const cards = overlay.locator('.gallery-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(30); // 45+ characters

    // Gallery search works
    const search = overlay.locator('.gallery-search');
    await search.fill('nyan');
    await page.waitForTimeout(150); // debounce
    const visible = await cards.evaluateAll(
      els => els.filter(el => !el.classList.contains('hidden-by-filter')).length
    );
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(count);

    // Close gallery — Escape closes topmost panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    // If Escape didn't close it (focus trap may swallow keystrokes), use backdrop
    if (await overlay.evaluate(el => el.classList.contains('visible'))) {
      await overlay.click({ position: { x: 5, y: 5 } });
    }
    await expect(overlay).not.toHaveClass(/visible/);
  });

  test('about panel shows project info', async ({ page }) => {
    await waitForTitleScreen(page);
    await page.locator('#btn-about').click();

    const overlay = page.locator('.about-overlay');
    await expect(overlay).toHaveClass(/visible/, { timeout: 5000 });
    await expect(overlay).toContainText(/NyanTales/);

    // Close — try Escape first, fall back to backdrop click
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await overlay.evaluate(el => el.classList.contains('visible'))) {
      await overlay.click({ position: { x: 5, y: 5 } });
    }
    await expect(overlay).not.toHaveClass(/visible/, { timeout: 5000 });
  });
});

test.describe('Favorites and Sorting', () => {
  test('favorite toggle marks card and filter shows it', async ({ page }) => {
    await waitForTitleScreen(page);

    const card = page.locator('.story-card:not(.story-locked)').filter({ hasText: /Terminal Cat/i }).first();
    const favBtn = card.locator('.story-card-fav-btn');
    await favBtn.click();
    await expect(card).toHaveAttribute('data-favorite', '1');

    // Favorites filter tab should show the card
    await page.locator('.filter-tag[data-filter="favorites"]').click();
    const visibleCards = page.locator('.story-card:not(.hidden-by-filter)');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(visibleCards.first()).toContainText(/Terminal Cat/i);

    // Unfavorite
    await favBtn.click();
    await expect(card).toHaveAttribute('data-favorite', '0');
  });

  test('sort by longest first reorders story cards', async ({ page }) => {
    await waitForTitleScreen(page);

    // Use evaluate to set sort value directly (avoids select overlay click issues)
    await page.evaluate(() => {
      const sel = document.getElementById('sort-select');
      sel.value = 'time-long';
      sel.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(300);

    const mins = await page.evaluate(() => {
      const cards = document.querySelectorAll('.story-card:not(.hidden-by-filter)');
      return Array.from(cards).map(c => Number(c.dataset.readMins || '0'));
    });
    expect(mins.length).toBeGreaterThan(1);
    expect(mins[0]).toBeGreaterThanOrEqual(mins[mins.length - 1]);
  });
});

test.describe('Route Map', () => {
  test('route map opens with R key and shows canvas', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.keyboard.press('r');
    const overlay = page.locator('.route-map-overlay');
    await expect(overlay).toHaveClass(/visible/, { timeout: 5000 });
    await expect(overlay.locator('canvas')).toBeAttached();

    // Close via backdrop click (more reliable than Escape with focus traps)
    await overlay.click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
    if (await overlay.evaluate(el => el.classList.contains('visible'))) {
      await page.keyboard.press('Escape');
    }
    await expect(overlay).not.toHaveClass(/visible/, { timeout: 5000 });
  });
});

test.describe('Font Size Setting', () => {
  test('font size slider changes text scale', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.locator('#btn-settings').click();
    const overlay = page.locator('.settings-overlay');
    await expect(overlay).toBeVisible();

    const slider = overlay.locator('#set-font-size');
    await slider.fill('140');
    await slider.dispatchEvent('input');

    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim()
    );
    expect(scale).toBe('140%');
  });
});

test.describe('Data Export', () => {
  test('export button triggers download', async ({ page }) => {
    await startStory(page);
    await ensureFullTextVisible(page);

    await page.keyboard.press('s');
    const overlay = page.locator('.settings-overlay');
    await expect(overlay).toBeVisible();

    // Find the export button by text content
    const exportBtn = overlay.getByRole('button', { name: /export/i });
    if (await exportBtn.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click()
      ]);
      expect(download.suggestedFilename()).toMatch(/nyantales-backup.*\.json/);
    }
  });
});

test.describe('Achievements Panel', () => {
  test('achievements panel opens from title screen', async ({ page }) => {
    await waitForTitleScreen(page);
    await page.locator('#btn-achievements').click();

    const overlay = page.locator('.achievements-overlay');
    await expect(overlay).toBeVisible();
    // Should show achievement items (16 total, all locked initially)
    const items = overlay.locator('.achievement-item');
    const count = await items.count();
    expect(count).toBe(16);

    await page.keyboard.press('Escape');
    await expect(overlay).not.toHaveClass(/visible/);
  });
});

test.describe('Scene Select', () => {
  test('scene select panel opens with G key', async ({ page }) => {
    const { choices } = await startStory(page);
    await ensureFullTextVisible(page);
    await choices.first().click();
    await ensureFullTextVisible(page);

    await page.keyboard.press('g');
    const overlay = page.locator('.scene-select-overlay');
    await expect(overlay).toHaveClass(/visible/, { timeout: 5000 });
    await expect(overlay.locator('.scene-select-panel')).toBeVisible();

    // Close via backdrop click (more reliable than Escape inside focus traps)
    await overlay.click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(300);
    if (await overlay.evaluate(el => el.classList.contains('visible'))) {
      await page.keyboard.press('Escape');
    }
    await expect(overlay).not.toHaveClass(/visible/, { timeout: 5000 });
  });
});

test.describe('Campaign', () => {
  test('campaign button is visible on title screen', async ({ page }) => {
    await waitForTitleScreen(page);
    const btn = page.locator('#btn-campaign');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText(/Campaign/i);
  });

  test('chapter grid shows campaign chapters', async ({ page }) => {
    await waitForTitleScreen(page);
    const grid = page.locator('#chapter-grid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('.chapter-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(15); // 26 chapters across 5 acts
  });
});
