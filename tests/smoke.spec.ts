import { expect, test } from "@playwright/test";

test("boots, chooses animals, renders gameplay, and persists shared progress", async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:4173/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("button", { name: /koala/i })).toBeVisible();
  await page.getByRole("button", { name: /koala/i }).click();
  await expect(page.locator("[data-picker]")).toBeHidden();
  await expect(page.locator("[data-objective]")).toContainText("Next:");

  const beforeDrag = await page.evaluate(() => {
    const player = window.__canberraGame?.state.player;
    return player ? { x: player.position.x, z: player.position.z } : { x: 0, z: 0 };
  });
  const animalScreen = await page.evaluate(() => window.__canberraGame?.getPlayerScreenPosition() ?? { x: 0, y: 0 });
  await page.mouse.move(animalScreen.x, animalScreen.y);
  await page.mouse.down();
  await page.mouse.move(animalScreen.x, animalScreen.y - 108, { steps: 6 });
  await page.waitForTimeout(850);
  await page.mouse.up();
  const afterDrag = await page.evaluate(() => {
    const player = window.__canberraGame?.state.player;
    return player ? { x: player.position.x, z: player.position.z } : { x: 0, z: 0 };
  });
  expect(Math.hypot(afterDrag.x - beforeDrag.x, afterDrag.z - beforeDrag.z)).toBeGreaterThan(0.75);

  const beforeRight = await page.evaluate(() => window.__canberraGame?.state.player?.position.x ?? 0);
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await page.waitForTimeout(300);
  const afterRight = await page.evaluate(() => window.__canberraGame?.state.player?.position.x ?? 0);
  expect(afterRight).toBeGreaterThan(beforeRight + 0.25);

  await page.keyboard.down("w");
  await page.waitForTimeout(1500);
  await page.keyboard.up("w");
  await expect(page.locator("[data-progress]")).toContainText("1 gumleaves");

  await expect
    .poll(() => page.evaluate(() => window.__canberraGame?.state.player?.grounded ?? false))
    .toBe(true);
  await page.locator("[data-jump]").click();
  await page.waitForTimeout(120);
  const jumpY = await page.evaluate(() => window.__canberraGame?.state.player?.position.y ?? 0);
  expect(jumpY).toBeGreaterThan(0.2);
  const beforeDash = await page.evaluate(() => {
    const player = window.__canberraGame?.state.player;
    return player ? { x: player.position.x, z: player.position.z } : { x: 0, z: 0 };
  });
  await page.keyboard.down("ShiftLeft");
  await page.waitForTimeout(280);
  await page.keyboard.up("ShiftLeft");
  const afterDash = await page.evaluate(() => {
    const player = window.__canberraGame?.state.player;
    return player ? { x: player.position.x, z: player.position.z } : { x: 0, z: 0 };
  });
  expect(Math.hypot(afterDash.x - beforeDash.x, afterDash.z - beforeDash.z)).toBeGreaterThan(1.5);

  const canvasBox = await page.locator("canvas").boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(500);
  expect(canvasBox?.height).toBeGreaterThan(350);

  if (testInfo.project.name === "chromium-desktop") {
    const pixelSignal = await page.locator("canvas").evaluate((canvas) => {
      const source = canvas as HTMLCanvasElement;
      const probe = document.createElement("canvas");
      probe.width = 32;
      probe.height = 32;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      if (!ctx) return 0;
      ctx.drawImage(source, 0, 0, 32, 32);
      const data = ctx.getImageData(0, 0, 32, 32).data;
      let signal = 0;
      for (let i = 0; i < data.length; i += 4) {
        signal += data[i] + data[i + 1] + data[i + 2];
      }
      return signal;
    });
    expect(pixelSignal).toBeGreaterThan(10000);
  }

  await page.reload();
  await expect(page.locator("[data-picker]")).toBeHidden();
  await page.getByRole("button", { name: /restart/i }).click();
  await expect(page.locator("[data-picker]")).toBeVisible();
  await page.getByRole("button", { name: /koala/i }).click();
  await expect(page.locator("[data-picker]")).toBeHidden();
  await page.getByRole("button", { name: /guide/i }).click();
  await expect(page.locator("[data-restart]")).toBeVisible();
  await page.locator("[data-restart]").click();
  await expect(page.locator("[data-picker]")).toBeVisible();
  await expect(page.locator("[data-guide]")).not.toBeVisible();
  await page.reload();
  await expect(page.locator("[data-picker]")).toBeVisible();

  await page.getByRole("button", { name: /jaguar/i }).click();
  await expect(page.locator("[data-picker]")).toBeHidden();
  await expect(page.locator("[data-objective]")).toContainText("Next:");
});
