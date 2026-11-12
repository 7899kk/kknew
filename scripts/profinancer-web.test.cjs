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
  expenses: [
    {
      id: "fixture-payment",
      date: new Date().toISOString().slice(0, 10),
      amount: 500,
      category: "EMI",
      paymentType: "Bank",
      notes: "Bike repayment",
      merchant: "Bank",
    },
    {
      id: "old-expense",
      date: (() => {
        const now = new Date();
        now.setDate(1);
        now.setMonth(now.getMonth() - 1);
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-05`;
      })(),
      amount: 100,
      category: "Travel",
      paymentType: "Cash",
    },
  ],
  incomes: [
    {
      id: "fixture-credit",
      date: (() => {
        const now = new Date();
        now.setDate(Math.max(1, now.getDate() - 1));
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      })(),
      amount: 500,
      name: "Gift",
      category: "Gift",
    },
  ],
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
  async function section(p, name) {
    if (name === "Loans") {
      await section(p, "Home");
      await button(p, "Open monthly loan payments").click();
      return;
    }
    if (name === "Others") {
      await section(p, "Loans");
      await button(p, "Payment reminders").click();
      return;
    }
    const map = {
      Dashboard: "Dashboard",
      Home: "Dashboard",
      Activity: "Activity",
      Expenses: "Expenses",
      Dues: "Dues",
      Goals: "Goals",
      Split: "Split",
      Profile: "Profile",
    };
    await p.getByRole("tab", { name: new RegExp(map[name]) }).click();
  }
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
    await expect(
      button(owner, "Open balance details").getByText("₹70,000", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(owner.getByRole("tab", { name: /^Add$/ })).toHaveCount(0);
    await expect(owner.getByRole("tab", { name: /Expenses/ })).toBeVisible();
    /* old dashboard retains the original pie chart.
    await button(owner, "Year").click();
    await expect(
      owner.getByText("Recorded cash flow · last 12 months", { exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByLabel("Budget balance graph").locator("svg path"),
    ).toHaveCount(2);
    await button(owner, "Week").click();
    await expect(
      owner.getByText("Recorded cash flow · last 12 months", { exact: true }),
    ).toHaveCount(0);
    await button(owner, "Month").click(); */
    await owner.waitForTimeout(1400);
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
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "dashboard-chart.png"),
      fullPage: true,
    });
    await overview.click();

    await expect(
      owner.getByText("Starting savings", { exact: true }),
    ).toBeVisible();
    await button(owner, "Close").click();
    for (const name of ["Dues", "Goals", "Profile"]) {
      await section(owner, name);
      const header = owner
        .getByText("PRO FINANCIER", { exact: true })
        .filter({ visible: true })
        .first()
        .locator("..");
      await expect(header.getByText("Hi, Test", { exact: true })).toBeVisible();
      await expect(
        header.getByText("PRO FINANCIER", { exact: true }),
      ).toBeVisible();
    }
    await section(owner, "Home");
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
    await section(owner, "Split");
    await button(owner, "Create group").click();
    await fill(owner, "Group name", "Trip");
    await fill(owner, "Members, separated by commas", "A, B, C");
    await button(owner, "Save").click();
    await expect(owner.getByLabel("Group name", { exact: true })).toHaveCount(
      0,
    );
    await expect(button(owner, "Open group")).toBeVisible();
    await button(owner, "Open group").click();
    await owner
      .getByText("You in this group", { exact: true })
      .locator("..")
      .getByRole("button", { name: "A", exact: true })
      .click();
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
    expect(fs.readFileSync(groupFile, "utf8")).not.toContain(
      "groupMemberships",
    );
    const friend = await newUser();
    await section(friend, "Split");
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
    await section(owner, "Dues");
    await button(owner, "Owed to You").click();
    await expect(
      owner.getByRole("button", { name: "Open C Trip", exact: true }),
    ).toContainText("₹80");
    await section(owner, "Loans");
    await button(owner, "Add loan").click();
    await button(owner, "Existing balance").click();
    await fill(owner, "Loan name", "Bike loan");
    await fill(owner, "Lender", "Bank");
    await fill(owner, "Total balance to repay", "12000");
    await fill(owner, "Monthly payment", "2000");
    await button(owner, "Save loan").click();
    await expect(button(owner, "Open loan Bike loan")).toBeVisible();
    await section(owner, "Home");
    await expect(button(owner, "Open monthly loan payments")).toContainText(
      "₹2,000",
    );
    await expect(button(owner, "Open available balance details")).toContainText(
      "₹68,000",
    );
    await section(owner, "Loans");
    await button(owner, "Open loan Bike loan").click();
    await button(owner, "Record repayment").click();
    await fill(owner, "Payment amount", "500");
    await button(
      owner,
      `${new Date().toISOString().slice(0, 10)} · Bike repayment`,
    ).click();
    await button(owner, "Save repayment").click();
    await expect(
      owner.getByText("Matched in Activity", { exact: true }),
    ).toBeVisible();
    await button(owner, "Close").click();
    await section(owner, "Home");
    await expect(button(owner, "Open balance details")).toContainText(
      "₹70,000",
    );
    await expect(button(owner, "Open available balance details")).toContainText(
      "₹68,500",
    );
    await section(owner, "Dues");
    await button(owner, "You Owe").click();
    await expect(
      owner
        .getByRole("button", { name: "Open Bank Bike loan", exact: true })
        .first(),
    ).toContainText("₹11,500");
    // Original Dues screen displays pending and paid records together.
    await expect(
      owner
        .getByRole("button", { name: "Open Bank Bike loan", exact: true })
        .filter({ hasText: "Paid" }),
    ).toContainText("₹500");
    await section(owner, "Activity");
    await expect(
      owner.getByRole("button", {
        name: "Edit expense Bike repayment",
        exact: true,
      }),
    ).toHaveCount(1);
    await section(owner, "Dues");
    await expect(
      owner
        .getByRole("button", { name: "Open Bank Bike loan", exact: true })
        .first(),
    ).toContainText("₹11,500");
    await owner.reload();
    await section(owner, "Loans");
    await expect(button(owner, "Open loan Bike loan")).toContainText("₹11,500");
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "loans.png"),
      fullPage: true,
    });
    await section(owner, "Expenses");
    await button(owner, "Add expense").click();
    await fill(owner, "Amount", "321.45");
    await fill(owner, "Merchant / Paid To (optional)", "Manual shop");
    await fill(owner, "Notes (optional)", "Manual expense check");
    await button(owner, "Add Expense").click();
    await section(owner, "Activity");
    await button(owner, "Expenses").click();
    await expect(
      button(owner, "Edit expense Manual expense check").locator("../.."),
    ).toContainText("−₹321.45");
    await button(owner, "Income").click();
    await expect(
      button(owner, "Edit expense Manual expense check"),
    ).toHaveCount(0);
    await button(owner, "Expenses").click();
    await button(owner, "Edit expense Manual expense check").click();
    await owner
      .getByRole("dialog")
      .getByRole("button", { name: "Income", exact: true })
      .click();
    await button(owner, "Save").click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
    await button(owner, "Income").click();
    await expect(
      button(owner, "Edit income Money received").locator("../.."),
    ).toContainText("+₹321.45");
    await button(owner, "Edit income Money received").click();
    await owner
      .getByRole("dialog")
      .getByRole("button", { name: "Expense", exact: true })
      .click();
    await button(owner, "Save").click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
    await button(owner, "Expenses").click();
    await expect(
      button(owner, "Edit expense Manual expense check").locator("../.."),
    ).toContainText("−₹321.45");
    await button(owner, "Edit expense Manual expense check").click();
    await button(owner, "Delete transaction").click();
    await section(owner, "Home");
    await expect(button(owner, "Open balance details")).toContainText(
      "₹70,000",
    );
    // Loan with only an amount and EMI (zero interest and duration inferred), persists on reload.
    await section(owner, "Loans");
    await button(owner, "Add loan").click();
    await fill(owner, "Loan name", "Simple loan");
    await fill(owner, "Loan amount", "6000");
    await fill(owner, "Monthly payment (optional)", "1000");
    await button(owner, "Save loan").click();
    await expect(button(owner, "Open loan Simple loan")).toContainText(
      "₹6,000",
    );
    await owner.reload();
    await expect(button(owner, "Open loan Simple loan")).toContainText(
      "₹6,000",
    );
    await section(owner, "Home");
    await expect(button(owner, "Open monthly loan payments")).toContainText(
      "₹2,500",
    );
    await section(owner, "Loans");
    await button(owner, "Open loan Simple loan").click();
    await button(owner, "Delete loan").click();
    // New detailed loan terms feed the same dashboard reserve and survive reload.
    await section(owner, "Loans");
    await button(owner, "Add loan").click();
    await fill(owner, "Loan name", "Interest plan");
    await fill(owner, "Lender", "Lender");
    await fill(owner, "Loan amount", "100000");
    await fill(owner, "Annual interest (%)", "12");
    await fill(owner, "Term (months)", "12");
    await expect(
      owner.getByText("Estimated EMI ₹8,884.88", { exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByText("Total repayment ₹1,06,618.53", { exact: true }),
    ).toBeVisible();
    await button(owner, "Save loan").click();
    await section(owner, "Home");
    await expect(button(owner, "Open monthly loan payments")).toContainText(
      "₹10,384.88",
    );
    await expect(button(owner, "Open available balance details")).toContainText(
      "₹59,615.12",
    );
    await section(owner, "Loans");
    await button(owner, "Open loan Interest plan").click();
    await expect(
      owner.getByText("Interest 12% annually · reducing balance", {
        exact: true,
      }),
    ).toBeVisible();
    await button(owner, "Show payment schedule").click();
    await expect(owner.getByText("#1 · ", { exact: false })).toBeVisible();
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "interest-plan.png"),
      fullPage: true,
    });
    await button(owner, "Hide payment schedule").click();
    await button(owner, "Close").click();
    await section(owner, "Others");
    await expect(
      owner
        .getByText("Payment reminders", { exact: true })
        .filter({ visible: true })
        .last(),
    ).toBeVisible();
    await expect(
      owner.getByText("Interest plan EMI · ₹8,884.88", { exact: true }),
    ).toBeVisible();
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "others.png"),
      fullPage: true,
    });
    await section(owner, "Goals");
    await button(owner, "Add goal").click();
    const goalPicker = owner.waitForEvent("filechooser");
    await button(owner, "Choose goal image").click();
    await (
      await goalPicker
    ).setFiles(path.resolve("artifacts/wealthtrack/assets/images/logo.png"));
    await fill(owner, "Goal Name", "Dream Car");
    await fill(owner, "Target Amount", "200000");
    await button(owner, "Create Goal").click();
    await expect(
      owner.getByLabel("Goal photo").filter({ visible: true }),
    ).toBeVisible();
    await owner.reload();
    await expect(
      owner.getByLabel("Goal photo").filter({ visible: true }),
    ).toBeVisible();
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "goal-photo.png"),
      fullPage: true,
    });
    await section(owner, "Profile");
    const photoPicker = owner.waitForEvent("filechooser");
    await button(owner, "Change profile photo").click();
    await (
      await photoPicker
    ).setFiles(path.resolve("artifacts/wealthtrack/assets/images/logo.png"));

    await expect(
      button(owner, "Change profile photo").locator(
        'img[src^="data:image/jpeg"]',
      ),
    ).toBeVisible();
    await expect(button(owner, "Change profile photo")).toBeEnabled();
    await owner.reload();
    await expect(
      button(owner, "Change profile photo").locator(
        'img[src^="data:image/jpeg"]',
      ),
    ).toBeVisible();
    await owner.waitForTimeout(650);
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
    await section(owner, "Goals");
    await expect(
      owner.getByLabel("Goal photo").filter({ visible: true }),
    ).toBeVisible();
    await section(owner, "Loans");
    await button(owner, "Open loan Interest plan").click();
    await expect(
      owner.getByText("Total interest ₹6,618.53", { exact: true }),
    ).toBeVisible();
    await button(owner, "Close").click();

    await section(owner, "Split");
    if (await button(owner, "Open group").count())
      await button(owner, "Open group").click();
    await expect(owner.getByText("Taxi · ₹60", { exact: false })).toBeVisible();
    await expect(
      owner.getByText("Who owes whom", { exact: true }),
    ).toBeVisible();
    await owner.waitForTimeout(650);
    await owner.screenshot({
      path: path.join(temp, "shared-bills.png"),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    console.log(
      "Browser checks passed: detailed APR/EMI/term/schedule, dashboard interest reserve, loan reminder controls, goal photo persistence and backup, restored classic teal dashboard/pie/details, manual expense sign/filter and correction, inferred-term loan persistence, original Profile navigation, local group identity and linked dues, loan monthly reserves and matching without duplicate cash, restart persistence, sharing/approval, photos and encrypted backup/restore.",
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
