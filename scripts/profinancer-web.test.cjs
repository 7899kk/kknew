// Export first: pnpm --filter @workspace/wealthtrack exec expo export --platform web --output-dir dist
// Run: node scripts/profinancer-web.test.cjs artifacts/wealthtrack/dist
const { chromium, expect } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const root = path.resolve(process.argv[2] || "artifacts/wealthtrack/dist");
const initial = {
  profile: {
    name: "Test User",
    username: "test",
    monthlySalary: 50000,
    yearlySalary: 600000,
    otherIncome: 0,
    currentSavings: 20000,
    onboardingComplete: true,
  },
  expenses: [],
  incomes: [],
  autoExpenses: [],
  debts: [],
  stocks: [],
  cryptos: [],
  goldSilver: [],
  goals: [],
  billGroups: [],
  paymentReviews: [],
  capturedIds: [],
};
const types = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".html": "text/html",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
  );
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(root, "index.html");
  res.setHeader(
    "Content-Type",
    types[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  if (!fs.existsSync(path.join(root, "index.html")))
    throw Error("Export the web app before running this test.");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "profinancer-web-test-"));
  const errors = [];
  async function newUser() {
    const context = await browser.newContext({
      viewport: { width: 420, height: 900 },
      acceptDownloads: true,
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    await p.addInitScript((data) => {
      if (!localStorage.getItem("test-seeded")) {
        localStorage.setItem("profinancier_data_v3", JSON.stringify(data));
        localStorage.setItem("test-seeded", "1");
      }
    }, initial);
    await p.goto(base);
    await expect(
      p.getByText("Available to spend", { exact: false }),
    ).toBeVisible();
    await expect(
      p.getByText("Available to spend", { exact: false }),
    ).toBeInViewport();
    return p;
  }
  const button = (p, name) => p.getByRole("button", { name, exact: true });
  const fill = async (p, label, value) => {
    const input = p.getByLabel(label, { exact: true });
    await input.fill(value);
    await input.press("Tab");
  };
  async function download(p, action, name) {
    const pending = p.waitForEvent("download");
    await action();
    const d = await pending;
    const file = path.join(temp, name);
    await d.saveAs(file);
    return file;
  }
  async function importGroup(p, file) {
    const pending = p.waitForEvent("filechooser");
    await button(p, "Open a shared bill or update").click();
    await (await pending).setFiles(file);
  }
  try {
    const owner = await newUser();
    await expect(owner.getByText("₹70,000", { exact: true })).toBeVisible();
    await owner.screenshot({
      path: path.join(temp, "home.png"),
      fullPage: true,
    });
    for (const [buttonName, detailLabel] of [
      ["Open balance details", "Starting savings"],
      ["Open available balance details", "Recurring bills reserved"],
      ["Open income details", "Salary estimate"],
      ["Open expenses details", "Total expenses"],
      ["Open savings details", "Reserved for dreams"],
      ["Open debts & credits details", "Net receivable"],
    ]) {
      await button(owner, buttonName).click();
      await expect(owner.getByText(detailLabel, { exact: true })).toBeVisible();
      await button(owner, "Close").click();
      await expect(button(owner, "Close")).toHaveCount(0);
    }
    await expect(
      owner.getByText("Starting savings + monthly income − recorded expenses", {
        exact: true,
      }),
    ).toHaveCount(0);
    const overview = button(owner, "Open finance overview details");
    await overview.scrollIntoViewIfNeeded();
    await expect(overview).toBeInViewport();
    await expect(overview.locator("svg")).toHaveCount(1);
    await owner.screenshot({
      path: path.join(temp, "dashboard-chart.png"),
      fullPage: true,
    });
    await overview.click();
    await button(owner, "View expenses").click();
    await expect(
      owner.getByText("Total expenses", { exact: true }),
    ).toBeVisible();
    await button(owner, "Close").click();
    for (const tab of ["Dues", "Goals", "Profile"]) {
      await owner.getByRole("tab", { name: new RegExp(tab) }).click();
      await expect(
        owner.getByText("Hi, Test", { exact: true }).last(),
      ).toBeVisible();
      await expect(
        owner.getByText("PRO FINANCIER", { exact: true }).last(),
      ).toBeVisible();
    }
    await owner.getByRole("tab", { name: /Dashboard/ }).click();
    await button(owner, "Open budgets and reports").click();
    await fill(owner, "Limit (INR)", "1000");
    await button(owner, "Save monthly limit").click();
    await expect(
      owner.getByText("Food · Limit ₹1,000", { exact: false }),
    ).toBeVisible();
    await button(owner, "Close").click();
    await expect(owner.getByLabel("Limit (INR)", { exact: true })).toHaveCount(
      0,
    );
    await owner.getByRole("tab", { name: /Split/ }).click();
    await button(owner, "Create group").click();
    await fill(owner, "Group name", "Trip");
    await fill(owner, "Members, separated by commas", "A, B, C");
    await button(owner, "Save").click();
    await expect(owner.getByLabel("Group name", { exact: true })).toHaveCount(
      0,
    );
    await expect(button(owner, "Open group")).toBeVisible();
    await button(owner, "Open group").click();
    await button(owner, "Add expense").click();
    await fill(owner, "Description", "Dinner");
    await fill(owner, "Amount (INR)", "300");
    await button(owner, "Save").click();
    await expect(
      owner.getByText("B → A: ₹100", { exact: false }),
    ).toBeVisible();
    await button(owner, "Mark as paid").first().click();
    await button(owner, "Save").click();
    await expect(button(owner, "Mark as paid")).toHaveCount(1);
    await owner.reload();
    await expect(button(owner, "Open group")).toBeVisible();
    await button(owner, "Open group").click();
    await expect(button(owner, "Mark as paid")).toHaveCount(1);
    await button(owner, "View group summary").click();
    await expect(
      owner.getByText("Group summary", { exact: true }),
    ).toBeVisible();
    await expect(button(owner, "Copy summary")).toBeVisible();
    await button(owner, "Back to group").click();
    await expect(owner.getByText("Group summary", { exact: true })).toHaveCount(
      0,
    );
    const groupFile = await download(
      owner,
      () => button(owner, "Share group with friends").click(),
      "group.json",
    );
    const friend = await newUser();
    await friend.getByRole("tab", { name: /Split/ }).click();
    await importGroup(friend, groupFile);
    await expect(button(friend, "Open group")).toBeVisible();
    await button(friend, "Open group").click();
    await expect(button(friend, "Add expense")).toHaveCount(0);
    await button(friend, "Send an expense for approval").click();
    await fill(friend, "Description", "Taxi");
    await fill(friend, "Amount (INR)", "60");
    const proposalFile = await download(
      friend,
      () => button(friend, "Save and send to group owner").click(),
      "proposal.json",
    );
    await importGroup(owner, proposalFile);
    await expect(
      owner.getByText("Needs approval: expense", { exact: true }),
    ).toBeVisible();
    const approval = owner
      .getByText("Needs approval: expense", { exact: true })
      .locator("..");
    await approval.getByText("B", { exact: true }).click();
    await button(owner, "Approve update").click();
    await expect(owner.getByText("Taxi · ₹60", { exact: false })).toBeVisible();
    await owner.getByRole("tab", { name: /Profile/ }).click();
    const photoPicker = owner.waitForEvent("filechooser");
    await button(owner, "Change profile photo").click();
    await (
      await photoPicker
    ).setFiles(path.resolve("artifacts/wealthtrack/assets/images/logo.png"));

    await expect(
      owner.locator('img[src^="data:image/jpeg"]').filter({ visible: true }),
    ).toBeVisible();
    await owner.reload();
    await expect(
      owner.locator('img[src^="data:image/jpeg"]').filter({ visible: true }),
    ).toBeVisible();
    await owner.screenshot({
      path: path.join(temp, "profile-photo.png"),
      fullPage: true,
    });
    await button(owner, "Payment tracking settings").click();
    await expect(
      owner.getByText("Track payments", { exact: true }),
    ).toBeVisible();
    await button(owner, "Done").click();
    await button(owner, "Export encrypted backup").click();
    await fill(owner, "Backup password", "browser test backup password");
    await fill(
      owner,
      "Confirm backup password",
      "browser test backup password",
    );
    const backup = await download(
      owner,
      () => button(owner, "Encrypt and save / share").click(),
      "backup.json",
    );
    if (fs.readFileSync(backup, "utf8").includes("Dinner"))
      throw Error("Backup leaked plaintext");
    await button(owner, "Restore encrypted backup").click();
    const picker = owner.waitForEvent("filechooser");
    await button(owner, "Choose backup file").click();
    await (await picker).setFiles(backup);
    await fill(owner, "Backup password", "wrong password");
    await button(owner, "Decrypt and preview").click();
    await expect(
      owner.getByText(
        "Incorrect password or damaged backup. No data was changed.",
        { exact: true },
      ),
    ).toBeVisible();
    await fill(owner, "Backup password", "browser test backup password");
    await button(owner, "Decrypt and preview").click();
    await expect(button(owner, "Replace local data")).toBeVisible();
    await button(owner, "Replace local data").click();
    await expect(
      owner.getByLabel("Backup password", { exact: true }),
    ).toHaveCount(0);
    await expect(button(owner, "Export encrypted backup")).toBeVisible();
    await owner.getByRole("tab", { name: /Split/ }).click();
    if (await button(owner, "Open group").count())
      await button(owner, "Open group").click();
    await expect(owner.getByText("Taxi · ₹60", { exact: false })).toBeVisible();
    await expect(
      owner.getByText("Who owes whom", { exact: true }),
    ).toBeVisible();
    await owner.screenshot({
      path: path.join(temp, "shared-bills.png"),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    console.log(
      "Browser checks passed: legacy migration, budgets, groups, repayments/restart, snapshots, friend proposals/approval, encrypted export, wrong password and confirmed restore.",
    );
    console.log("Evidence:", temp);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
