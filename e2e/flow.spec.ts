import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Full happy path in local dev mode: the couple creates an event and connects (fake) Google Photos,
// then a guest takes a photo, picks a film, adds a wish and sends it.

async function createEvent(page: Page, names: string): Promise<string> {
  await page.goto("/host/new");
  await settle(page);
  await page.getByLabel("Your names").fill(names);
  await page.getByLabel("Wedding date").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Host PIN", { exact: true }).fill("2468");
  await page.getByLabel("PIN again").fill("2468");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("Bookmark this page")).toBeVisible();
  const slug = new URL(page.url()).pathname.split("/")[2];
  await settle(page);

  // Follow the link's href directly: next dev sometimes reloads a page right after its first compile,
  // which can swallow a click.
  const connect = await page.getByRole("link", { name: "Connect Google Photos" }).getAttribute("href");
  await page.goto(connect!).catch(async () => {
    await settle(page);
    await page.goto(connect!);
  });
  await expect(page.getByText(/was created in your Google Photos/)).toBeVisible();
  await settle(page);

  await page.getByLabel("Shared album link").fill("https://photos.app.goo.gl/e2eTestAlbum");
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  // Copying the guest link works (with a fallback for plain-HTTP pages).
  await page.getByRole("button", { name: "Copy guest link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  return slug;
}

/** A JPEG made in the browser, for the gallery picker (WebKit has no fake camera). */
async function makeJpeg(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 1200;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 900, 1200);
    g.addColorStop(0, "#f3c9a0");
    g.addColorStop(1, "#5f7052");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(450, 500, 220, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL("image/jpeg", 0.9);
  });
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

test("guest goes from welcome to Memory saved and the photo reaches the album", async ({ page, browserName }) => {
  const names = `E2E ${browserName} ${Date.now().toString(36)}`;
  const slug = await createEvent(page, names);

  // Guests have no host cookie: use a fresh context.
  const guest = await guestContext(page);
  const g = await guest.newPage();
  g.on("pageerror", (e) => console.log(`[guest pageerror] ${e.message}`));

  await g.goto(`/e/${slug}`);
  await settle(g);
  await expect(g.getByRole("heading", { name: names })).toBeVisible();
  await g.getByLabel("Your name").fill("Aunt Nok");
  await g.getByRole("button", { name: "Start capturing memories" }).click();
  await expect(g).toHaveURL(new RegExp(`/e/${slug}/camera$`));
  await settle(g);

  // Back goes to the welcome screen, then forward again.
  await g.getByRole("link", { name: "Back" }).click();
  await expect(g).toHaveURL(new RegExp(`/e/${slug}$`));
  await g.getByRole("button", { name: "Start capturing memories" }).click();
  await expect(g).toHaveURL(new RegExp(`/e/${slug}/camera$`));
  await settle(g);

  const shutter = g.getByRole("button", { name: "Take photo" });
  if (browserName === "chromium") {
    await expect(shutter).toBeEnabled();
    await shutter.click();
  } else {
    await g.getByTestId("gallery-input").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(g) });
  }

  await expect(g).toHaveURL(new RegExp(`/e/${slug}/edit/filter$`));
  await settle(g);
  await expect(g.getByRole("heading", { name: "Choose a film" })).toBeVisible();
  await g.getByRole("button", { name: "Polaroid" }).click();
  await expect(g.getByRole("button", { name: "Polaroid" })).toHaveAttribute("aria-pressed", "true");

  // Refreshing mid-edit keeps the photo and the choice.
  await g.reload();
  await settle(g);
  await expect(g.getByRole("button", { name: "Polaroid" })).toHaveAttribute("aria-pressed", "true");
  await expect(g.getByText("Loading your photo…")).toHaveCount(0);

  await g.getByRole("link", { name: "Next: add your words" }).click();
  await expect(g).toHaveURL(new RegExp(`/e/${slug}/edit/text$`));
  await settle(g);
  await expect(g.getByLabel("Your name")).toHaveValue("Aunt Nok");
  await g.getByLabel("A wish for the couple (optional)").fill("Wishing you a lifetime of love");
  await g.getByRole("button", { name: "Typewriter" }).click();
  await g.getByRole("button", { name: "Send to the wedding album" }).click();

  await expect(g).toHaveURL(new RegExp(`/e/${slug}/saved$`));
  await expect(g.getByRole("heading", { name: "Memory saved!" })).toBeVisible();
  await expect(g.getByRole("heading", { name: "Your photos today" })).toBeVisible();
  await expect(g.getByRole("link", { name: "Back" })).toHaveAttribute("href", `/e/${slug}/camera`);
  await expect(g.getByRole("link", { name: /View the shared album/ })).toHaveAttribute(
    "href",
    "https://photos.app.goo.gl/e2eTestAlbum",
  );

  // The fake Google Photos wrote the JPEG and its description.
  const dir = path.join(process.cwd(), ".data", "uploads", slug);
  await expect.poll(() => existsSync(dir) && readdirSync(dir).some((f) => f.endsWith(".jpg"))).toBe(true);
  const desc = readdirSync(dir).find((f) => f.endsWith(".txt"))!;
  expect(readFileSync(path.join(dir, desc), "utf8")).toBe("Aunt Nok — Wishing you a lifetime of love");
  const jpg = readFileSync(path.join(dir, readdirSync(dir).find((f) => f.endsWith(".jpg"))!));
  expect([jpg[0], jpg[1]]).toEqual([0xff, 0xd8]);

  // Host dashboard counts it.
  await page.reload();
  await expect(page.getByText("Aunt Nok")).toBeVisible();

  await guest.close();
});

test("Thai language toggle persists across guest screens", async ({ page }) => {
  const slug = await createEvent(page, `Thai ${Date.now().toString(36)}`);
  const guest = await guestContext(page);
  const g = await guest.newPage();
  await g.goto(`/e/${slug}`);
  await settle(g);
  await g.getByRole("button", { name: "ไทย" }).click();
  await expect(g.getByRole("button", { name: "เริ่มเก็บความทรงจำ" })).toBeVisible();
  await g.reload();
  await settle(g);
  await expect(g.getByRole("button", { name: "เริ่มเก็บความทรงจำ" })).toBeVisible();
  await guest.close();
});

test("unknown event shows not found, host page asks for the PIN", async ({ page, browser }) => {
  await page.goto("/e/does-not-exist-123");
  await expect(page.getByRole("heading", { name: "We couldn't find this wedding" })).toBeVisible();

  const slug = await createEvent(page, `Pin ${Date.now().toString(36)}`);
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto(`/host/${slug}`);
  await settle(p);
  await p.getByLabel("Host PIN").fill("0000");
  await p.getByRole("button", { name: "Open host setup" }).click();
  await expect(p.getByText("That PIN isn't right.")).toBeVisible();
  await p.getByLabel("Host PIN").fill("2468");
  await p.getByRole("button", { name: "Open host setup" }).click();
  await expect(p.getByRole("heading", { name: "Wedding details" })).toBeVisible();
  await other.close();
});

test("an existing host can get back to setup from the home page", async ({ page, browser }) => {
  const slug = await createEvent(page, `Back ${Date.now().toString(36)}`);
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/");
  await settle(p);
  await p.getByRole("button", { name: "I already have an event" }).click();
  const field = p.getByLabel("Your guest link or event code");
  await field.fill("not-a-real-event-123");
  await p.getByRole("button", { name: "Open host setup" }).click();
  await expect(p.getByText("We couldn't find an event with that link or code.")).toBeVisible();
  await field.fill("http://192.168.1.35:3000/e/" + slug);
  await p.getByRole("button", { name: "Open host setup" }).click();
  await expect(p).toHaveURL(new RegExp("/host/" + slug + "$"));
  await expect(p.getByLabel("Host PIN")).toBeVisible();
  await other.close();
});

/** A separate browser context (no host cookie) with the same phone settings as the project. */
async function guestContext(page: Page) {
  const u = test.info().project.use;
  return page.context().browser()!.newContext({
    baseURL: u.baseURL,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
    permissions: u.permissions,
  });
}

/** Wait until the page's JavaScript has loaded (next dev compiles pages on first visit). */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
}
