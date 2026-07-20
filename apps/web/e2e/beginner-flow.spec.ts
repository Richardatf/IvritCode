import { expect, test } from "@playwright/test";

test("builds pointed Hebrew, deletes a grapheme, and animates the constellation", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "First IvritCode program" });
  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Add Hiriq" }).click();
  await expect(page.getByRole("alert")).toContainText("Choose a Hebrew letter");
  await page.getByRole("button", { name: /^Aleph \(/ }).click();
  await page.getByRole("button", { name: "Add Hiriq" }).click();
  await expect(editor).toHaveValue("אִ");
  await page.getByRole("button", { name: "Delete grapheme" }).click();
  await expect(editor).toHaveValue("");
  for (const name of ["Aleph", "Vav", "Resh"])
    await page.getByRole("button", { name: new RegExp(`^${name} \\(`) }).click();
  await page.getByRole("button", { name: "Run the letters" }).click();
  await expect(page.getByRole("heading", { name: "The constellation has formed." })).toBeVisible();
  await expect(page.getByLabel("Circular 22-letter constellation")).toBeVisible();
  await page.getByRole("button", { name: "Read the Constellation" }).click();
  await expect(
    page.getByRole("heading", {
      name: /The (Full Spectrum|Chorus|Mirror|Return|Spiral|Flame|Still Point|Open Field)/,
    }),
  ).toBeVisible();
  await expect(page.getByText("Reflective reading / deterministic evidence")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close the Reading" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByRole("link", { name: "Explore in Quantum Etz Chaim" })).toHaveAttribute(
    "href",
    /https:\/\/quantumetzchaim\.com\/\?exchange=/,
  );
  await page.getByRole("button", { name: "Watch the Journey" }).click();
  await expect(page.getByText(/Step \d+ of 3/)).toBeVisible();
});

test("restores Hebrew source from the Quantum Etz Chaim return link", async ({ page }) => {
  await page.goto(`/?source=${encodeURIComponent("אור")}#try`);
  await expect(page.getByRole("textbox", { name: "First IvritCode program" })).toHaveValue("אור");
});
