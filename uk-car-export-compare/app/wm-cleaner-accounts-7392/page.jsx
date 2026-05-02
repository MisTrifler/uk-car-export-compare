"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "wm_cleaner_accounts_v1";
const NL = String.fromCharCode(10);

const defaultAccounts = [
  { code: "1000", name: "Bank / Cash", type: "Asset" },
  { code: "1100", name: "Accounts Receivable", type: "Asset" },
  { code: "1200", name: "Prepaid Costs", type: "Asset" },

  { code: "2000", name: "Accounts Payable", type: "Liability" },
  { code: "2100", name: "Refunds Payable", type: "Liability" },
  { code: "2200", name: "Tax / HMRC Payable", type: "Liability" },

  { code: "3000", name: "Owner Capital", type: "Equity" },
  { code: "3100", name: "Owner Drawings", type: "Equity" },
  { code: "3200", name: "Retained Earnings", type: "Equity" },

  { code: "4000", name: "Lead Fee Income", type: "Income" },
  { code: "4100", name: "Cleaner Subscription Income", type: "Income" },
  { code: "4200", name: "Other Income", type: "Income" },

  { code: "5000", name: "Advertising Expense", type: "Expense" },
  { code: "5100", name: "Website / Software Expense", type: "Expense" },
  { code: "5200", name: "Refunds Given", type: "Expense" },
  { code: "5300", name: "Bank Fees", type: "Expense" },
  { code: "5400", name: "Phone / Internet Expense", type: "Expense" },
  { code: "5500", name: "General Business Expense", type: "Expense" },
];

const defaultState = {
  accounts: defaultAccounts,
  entries: [],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `£${money(value).toFixed(2)}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function accountLabel(account) {
  return `${account.code} - ${account.name}`;
}

function getNormalSide(type) {
  if (type === "Asset" || type === "Expense") return "Debit";
  return "Credit";
}

function calculateAccountBalances(accounts, entries) {
  return accounts.map((account) => {
    let debitTotal = 0;
    let creditTotal = 0;

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (line.accountCode === account.code) {
          if (line.side === "Debit") debitTotal += money(line.amount);
          if (line.side === "Credit") creditTotal += money(line.amount);
        }
      });
    });

    const normalSide = getNormalSide(account.type);
    const balance =
      normalSide === "Debit" ? debitTotal - creditTotal : creditTotal - debitTotal;

    return {
      ...account,
      debitTotal,
      creditTotal,
      balance,
      normalSide,
    };
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);

  return rows;
}

export default function AccountsPage() {
  const [data, setData] = useState(defaultState);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [entryForm, setEntryForm] = useState({
    date: today(),
    description: "",
    debitAccountCode: "1000",
    creditAccountCode: "4000",
    amount: "",
    reference: "",
  });

  const [accountForm, setAccountForm] = useState({
    code: "",
    name: "",
    type: "Expense",
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.accounts && saved.entries) {
        setData(saved);
      }
    } catch {
      setData(defaultState);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const accountBalances = useMemo(
    () => calculateAccountBalances(data.accounts, data.entries),
    [data.accounts, data.entries]
  );

  const totals = useMemo(() => {
    const assets = accountBalances
      .filter((account) => account.type === "Asset")
      .reduce((sum, account) => sum + account.balance, 0);

    const liabilities = accountBalances
      .filter((account) => account.type === "Liability")
      .reduce((sum, account) => sum + account.balance, 0);

    const equity = accountBalances
      .filter((account) => account.type === "Equity")
      .reduce((sum, account) => sum + account.balance, 0);

    const income = accountBalances
      .filter((account) => account.type === "Income")
      .reduce((sum, account) => sum + account.balance, 0);

    const expenses = accountBalances
      .filter((account) => account.type === "Expense")
      .reduce((sum, account) => sum + account.balance, 0);

    const profit = income - expenses;
    const balanceSheetDifference = assets - (liabilities + equity + profit);

    const trialDebit = accountBalances.reduce((sum, account) => {
      if (account.normalSide === "Debit" && account.balance >= 0) return sum + account.balance;
      if (account.normalSide === "Credit" && account.balance < 0) return sum + Math.abs(account.balance);
      return sum;
    }, 0);

    const trialCredit = accountBalances.reduce((sum, account) => {
      if (account.normalSide === "Credit" && account.balance >= 0) return sum + account.balance;
      if (account.normalSide === "Debit" && account.balance < 0) return sum + Math.abs(account.balance);
      return sum;
    }, 0);

    return {
      assets,
      liabilities,
      equity,
      income,
      expenses,
      profit,
      balanceSheetDifference,
      trialDebit,
      trialCredit,
      trialDifference: trialDebit - trialCredit,
    };
  }, [accountBalances]);

  function updateEntry(field, value) {
    setEntryForm((current) => ({ ...current, [field]: value }));
  }

  function addJournalEntry() {
    const amount = money(entryForm.amount);

    if (!entryForm.description.trim()) {
      alert("Please enter a description.");
      return;
    }

    if (!entryForm.debitAccountCode || !entryForm.creditAccountCode) {
      alert("Please choose both debit and credit accounts.");
      return;
    }

    if (entryForm.debitAccountCode === entryForm.creditAccountCode) {
      alert("Debit and credit account cannot be the same.");
      return;
    }

    if (amount <= 0) {
      alert("Please enter an amount above zero.");
      return;
    }

    const newEntry = {
      id: makeId("JE"),
      date: entryForm.date || today(),
      description: entryForm.description.trim(),
      reference: entryForm.reference.trim(),
      lines: [
        {
          accountCode: entryForm.debitAccountCode,
          side: "Debit",
          amount,
        },
        {
          accountCode: entryForm.creditAccountCode,
          side: "Credit",
          amount,
        },
      ],
    };

    setData((current) => ({
      ...current,
      entries: [newEntry, ...current.entries],
    }));

    setEntryForm({
      date: today(),
      description: "",
      debitAccountCode: "1000",
      creditAccountCode: "4000",
      amount: "",
      reference: "",
    });
  }

  function deleteEntry(entryId) {
    if (!window.confirm("Delete this journal entry?")) return;

    setData((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== entryId),
    }));
  }

  function addAccount() {
    const code = accountForm.code.trim();
    const name = accountForm.name.trim();

    if (!code || !name) {
      alert("Enter account code and account name.");
      return;
    }

    if (data.accounts.some((account) => account.code === code)) {
      alert("That account code already exists.");
      return;
    }

    setData((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        {
          code,
          name,
          type: accountForm.type,
        },
      ].sort((a, b) => a.code.localeCompare(b.code)),
    }));

    setAccountForm({
      code: "",
      name: "",
      type: "Expense",
    });
  }

  function deleteAccount(code) {
    const used = data.entries.some((entry) =>
      entry.lines.some((line) => line.accountCode === code)
    );

    if (used) {
      alert("This account is used in journal entries, so it cannot be deleted.");
      return;
    }

    if (!window.confirm("Delete this account?")) return;

    setData((current) => ({
      ...current,
      accounts: current.accounts.filter((account) => account.code !== code),
    }));
  }

  function findAccount(code) {
    return data.accounts.find((account) => account.code === code);
  }

  function exportAccountsBackup() {
    const backup = JSON.stringify(data, null, 2);
    const blob = new Blob([backup], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaner-accounts-backup.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importAccountsBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || ""));

        if (!imported.accounts || !imported.entries) {
          alert("This is not a valid accounts backup file.");
          event.target.value = "";
          return;
        }

        if (!window.confirm("Import this backup and replace current accounting data?")) {
          event.target.value = "";
          return;
        }

        setData(imported);
        alert("Accounts backup imported successfully.");
        event.target.value = "";
      } catch {
        alert("Could not read this backup file.");
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  function exportJournalCsv() {
    const rows = [
      ["Date", "Reference", "Description", "Account Code", "Account Name", "Side", "Amount"],
    ];

    data.entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const account = findAccount(line.accountCode);
        rows.push([
          entry.date,
          entry.reference,
          entry.description,
          line.accountCode,
          account?.name || "",
          line.side,
          line.amount,
        ]);
      });
    });

    const csv = rows.map((row) => row.map(csvCell).join(",")).join(NL);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaner-accounts-journal.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.kicker}>Private Accounts Tool</p>
          <h1 style={styles.title}>Cleaner Lead Business Accounts</h1>
          <p style={styles.subtitle}>
            Double-entry bookkeeping system with journal entries, trial balance, profit and loss,
            and balance sheet.
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.primaryButton} onClick={exportAccountsBackup}>
            Export Accounts Backup
          </button>

          <label style={styles.secondaryButton}>
            Import Accounts Backup
            <input
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={importAccountsBackup}
            />
          </label>

          <button style={styles.secondaryButton} onClick={exportJournalCsv}>
            Export Journal CSV
          </button>
        </div>
      </section>

      <section style={styles.statsGrid}>
        <StatCard label="Income" value={formatMoney(totals.income)} />
        <StatCard label="Expenses" value={formatMoney(totals.expenses)} />
        <StatCard label="Profit / Loss" value={formatMoney(totals.profit)} />
        <StatCard label="Assets" value={formatMoney(totals.assets)} />
        <StatCard label="Liabilities" value={formatMoney(totals.liabilities)} />
        <StatCard
          label="Trial Balance Difference"
          value={formatMoney(totals.trialDifference)}
        />
      </section>

      <section style={styles.tabs}>
        <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
          Dashboard
        </TabButton>
        <TabButton active={activeTab === "journal"} onClick={() => setActiveTab("journal")}>
          Journal Entries
        </TabButton>
        <TabButton active={activeTab === "trial"} onClick={() => setActiveTab("trial")}>
          Trial Balance
        </TabButton>
        <TabButton active={activeTab === "profit"} onClick={() => setActiveTab("profit")}>
          Profit & Loss
        </TabButton>
        <TabButton active={activeTab === "balance"} onClick={() => setActiveTab("balance")}>
          Balance Sheet
        </TabButton>
        <TabButton active={activeTab === "accounts"} onClick={() => setActiveTab("accounts")}>
          Chart of Accounts
        </TabButton>
        <TabButton active={activeTab === "rules"} onClick={() => setActiveTab("rules")}>
          How To Use
        </TabButton>
      </section>

      {activeTab === "dashboard" && (
        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Quick Entry Examples</h2>
            <ExampleLine title="Cleaner pays you lead fee" text="Debit Bank / Cash, Credit Lead Fee Income." />
            <ExampleLine title="You pay for Facebook advert" text="Debit Advertising Expense, Credit Bank / Cash." />
            <ExampleLine title="You refund a cleaner" text="Debit Refunds Given, Credit Bank / Cash." />
            <ExampleLine title="You put money into the business" text="Debit Bank / Cash, Credit Owner Capital." />
            <ExampleLine title="You withdraw money for yourself" text="Debit Owner Drawings, Credit Bank / Cash." />
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Health Check</h2>
            <p style={styles.bigNumber}>
              {Math.abs(totals.trialDifference) < 0.01 ? "Balanced" : "Not Balanced"}
            </p>
            <p style={styles.muted}>
              Your trial balance should always be zero difference. If it is not zero, check your
              journal entries.
            </p>
            <div style={Math.abs(totals.balanceSheetDifference) < 0.01 ? styles.successBox : styles.warningBox}>
              Balance sheet check: {formatMoney(totals.balanceSheetDifference)}
            </div>
          </div>
        </section>
      )}

      {activeTab === "journal" && (
        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Add Double-Entry Journal</h2>

            <div style={styles.formGrid}>
              <Field label="Date">
                <input
                  type="date"
                  style={styles.input}
                  value={entryForm.date}
                  onChange={(event) => updateEntry("date", event.target.value)}
                />
              </Field>

              <Field label="Amount £">
                <input
                  type="number"
                  style={styles.input}
                  value={entryForm.amount}
                  onChange={(event) => updateEntry("amount", event.target.value)}
                />
              </Field>

              <Field label="Debit Account">
                <select
                  style={styles.input}
                  value={entryForm.debitAccountCode}
                  onChange={(event) => updateEntry("debitAccountCode", event.target.value)}
                >
                  {data.accounts.map((account) => (
                    <option key={account.code} value={account.code}>
                      {accountLabel(account)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Credit Account">
                <select
                  style={styles.input}
                  value={entryForm.creditAccountCode}
                  onChange={(event) => updateEntry("creditAccountCode", event.target.value)}
                >
                  {data.accounts.map((account) => (
                    <option key={account.code} value={account.code}>
                      {accountLabel(account)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Reference">
                <input
                  style={styles.input}
                  placeholder="Example: Lead #12"
                  value={entryForm.reference}
                  onChange={(event) => updateEntry("reference", event.target.value)}
                />
              </Field>

              <Field label="Description">
                <input
                  style={styles.input}
                  placeholder="Example: Cleaner paid lead fee"
                  value={entryForm.description}
                  onChange={(event) => updateEntry("description", event.target.value)}
                />
              </Field>
            </div>

            <button style={styles.primaryButtonWide} onClick={addJournalEntry}>
              Add Journal Entry
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Journal Entries</h2>

            {data.entries.length === 0 ? (
              <p style={styles.muted}>No journal entries yet.</p>
            ) : (
              <div style={styles.entryList}>
                {data.entries.map((entry) => (
                  <div key={entry.id} style={styles.entryCard}>
                    <div style={styles.entryTop}>
                      <div>
                        <strong>{entry.date}</strong>
                        <p style={styles.mutedSmall}>{entry.description}</p>
                        {entry.reference && <p style={styles.mutedSmall}>Ref: {entry.reference}</p>}
                      </div>
                      <button style={styles.dangerButton} onClick={() => deleteEntry(entry.id)}>
                        Delete
                      </button>
                    </div>

                    {entry.lines.map((line, index) => {
                      const account = findAccount(line.accountCode);
                      return (
                        <div key={index} style={styles.journalLine}>
                          <span>{line.side}</span>
                          <span>{line.accountCode} - {account?.name}</span>
                          <strong>{formatMoney(line.amount)}</strong>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "trial" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Trial Balance</h2>
          <Table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Account</th>
                <th>Type</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {accountBalances.map((account) => {
                let debit = 0;
                let credit = 0;

                if (account.normalSide === "Debit" && account.balance >= 0) debit = account.balance;
                if (account.normalSide === "Credit" && account.balance < 0) debit = Math.abs(account.balance);
                if (account.normalSide === "Credit" && account.balance >= 0) credit = account.balance;
                if (account.normalSide === "Debit" && account.balance < 0) credit = Math.abs(account.balance);

                return (
                  <tr key={account.code}>
                    <td>{account.code}</td>
                    <td>{account.name}</td>
                    <td>{account.type}</td>
                    <td>{debit ? formatMoney(debit) : "-"}</td>
                    <td>{credit ? formatMoney(credit) : "-"}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="3"><strong>Total</strong></td>
                <td><strong>{formatMoney(totals.trialDebit)}</strong></td>
                <td><strong>{formatMoney(totals.trialCredit)}</strong></td>
              </tr>
            </tbody>
          </Table>
        </section>
      )}

      {activeTab === "profit" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Profit & Loss</h2>

          <ReportSection
            title="Income"
            accounts={accountBalances.filter((account) => account.type === "Income")}
          />

          <ReportSection
            title="Expenses"
            accounts={accountBalances.filter((account) => account.type === "Expense")}
          />

          <div style={styles.totalLine}>
            <strong>Net Profit / Loss</strong>
            <strong>{formatMoney(totals.profit)}</strong>
          </div>
        </section>
      )}

      {activeTab === "balance" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Balance Sheet</h2>

          <ReportSection
            title="Assets"
            accounts={accountBalances.filter((account) => account.type === "Asset")}
          />

          <ReportSection
            title="Liabilities"
            accounts={accountBalances.filter((account) => account.type === "Liability")}
          />

          <ReportSection
            title="Equity"
            accounts={accountBalances.filter((account) => account.type === "Equity")}
          />

          <div style={styles.totalLine}>
            <strong>Current Year Profit / Loss</strong>
            <strong>{formatMoney(totals.profit)}</strong>
          </div>

          <div style={styles.totalLine}>
            <strong>Assets</strong>
            <strong>{formatMoney(totals.assets)}</strong>
          </div>

          <div style={styles.totalLine}>
            <strong>Liabilities + Equity + Profit</strong>
            <strong>{formatMoney(totals.liabilities + totals.equity + totals.profit)}</strong>
          </div>

          <div style={Math.abs(totals.balanceSheetDifference) < 0.01 ? styles.successBox : styles.warningBox}>
            Balance sheet difference: {formatMoney(totals.balanceSheetDifference)}
          </div>
        </section>
      )}

      {activeTab === "accounts" && (
        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Add Account</h2>

            <div style={styles.formGrid}>
              <Field label="Code">
                <input
                  style={styles.input}
                  value={accountForm.code}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="Example: 5600"
                />
              </Field>

              <Field label="Name">
                <input
                  style={styles.input}
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Example: Travel Expense"
                />
              </Field>

              <Field label="Type">
                <select
                  style={styles.input}
                  value={accountForm.type}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  <option>Asset</option>
                  <option>Liability</option>
                  <option>Equity</option>
                  <option>Income</option>
                  <option>Expense</option>
                </select>
              </Field>
            </div>

            <button style={styles.primaryButtonWide} onClick={addAccount}>
              Add Account
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Chart of Accounts</h2>

            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((account) => (
                  <tr key={account.code}>
                    <td>{account.code}</td>
                    <td>{account.name}</td>
                    <td>{account.type}</td>
                    <td>
                      <button
                        style={styles.smallDangerButton}
                        onClick={() => deleteAccount(account.code)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </section>
      )}

      {activeTab === "rules" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>How To Use The Accounts Page</h2>

          <div style={styles.rulesGrid}>
            <RuleCard
              title="Lead fee received"
              text="When a cleaner pays you a lead fee: Debit Bank / Cash and Credit Lead Fee Income."
            />
            <RuleCard
              title="Advertising cost"
              text="When you pay for ads: Debit Advertising Expense and Credit Bank / Cash."
            />
            <RuleCard
              title="Refund"
              text="When you refund a cleaner: Debit Refunds Given and Credit Bank / Cash."
            />
            <RuleCard
              title="Owner puts money in"
              text="When you put your own money in: Debit Bank / Cash and Credit Owner Capital."
            />
            <RuleCard
              title="Owner takes money out"
              text="When you take money out: Debit Owner Drawings and Credit Bank / Cash."
            />
            <RuleCard
              title="Keep backups"
              text="Use Export Accounts Backup regularly. This page stores data in your browser until you upgrade to a real database."
            />
          </div>

          <div style={styles.warningBox}>
            This is a practical bookkeeping tracker, not tax advice. Keep proper records and speak to
            an accountant before filing accounts or tax returns.
          </div>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button style={active ? styles.activeTabButton : styles.tabButton} onClick={onClick}>
      {children}
    </button>
  );
}

function Table({ children }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>{children}</table>
    </div>
  );
}

function ReportSection({ title, accounts }) {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div style={styles.reportSection}>
      <h3 style={styles.reportTitle}>{title}</h3>
      {accounts.map((account) => (
        <div key={account.code} style={styles.reportLine}>
          <span>{account.code} - {account.name}</span>
          <strong>{formatMoney(account.balance)}</strong>
        </div>
      ))}
      <div style={styles.totalLine}>
        <strong>Total {title}</strong>
        <strong>{formatMoney(total)}</strong>
      </div>
    </div>
  );
}

function ExampleLine({ title, text }) {
  return (
    <div style={styles.exampleLine}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function RuleCard({ title, text }) {
  return (
    <div style={styles.ruleCard}>
      <h3 style={styles.ruleTitle}>{title}</h3>
      <p style={styles.ruleText}>{text}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  header: {
    maxWidth: "1200px",
    margin: "0 auto 24px auto",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  kicker: {
    margin: "0 0 6px 0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    lineHeight: "1.1",
    fontWeight: "800",
  },
  subtitle: {
    margin: "10px 0 0 0",
    color: "#475569",
    fontSize: "16px",
    maxWidth: "720px",
  },
  headerButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "0",
    background: "#0f172a",
    color: "white",
    padding: "11px 16px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  primaryButtonWide: {
    width: "100%",
    border: "0",
    background: "#0f172a",
    color: "white",
    padding: "13px 16px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "14px",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#0f172a",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  dangerButton: {
    border: "0",
    background: "#dc2626",
    color: "white",
    padding: "9px 12px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },
  smallDangerButton: {
    border: "0",
    background: "#dc2626",
    color: "white",
    padding: "7px 10px",
    borderRadius: "9px",
    fontWeight: "700",
    cursor: "pointer",
  },
  statsGrid: {
    maxWidth: "1200px",
    margin: "0 auto 24px auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
  },
  statCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
  },
  statLabel: {
    margin: "0 0 8px 0",
    color: "#64748b",
    fontSize: "14px",
  },
  statValue: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "800",
  },
  tabs: {
    maxWidth: "1200px",
    margin: "0 auto 20px auto",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  tabButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "700",
    cursor: "pointer",
  },
  activeTabButton: {
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "700",
    cursor: "pointer",
  },
  gridTwo: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  card: {
    maxWidth: "1200px",
    margin: "0 auto 18px auto",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
  },
  sectionTitle: {
    margin: "0 0 16px 0",
    fontSize: "24px",
    fontWeight: "800",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  field: {
    display: "grid",
    gap: "6px",
  },
  fieldLabel: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "white",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  muted: {
    color: "#64748b",
    lineHeight: "1.5",
  },
  mutedSmall: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "13px",
  },
  bigNumber: {
    fontSize: "32px",
    fontWeight: "800",
    margin: "0 0 8px 0",
  },
  successBox: {
    marginTop: "12px",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: "12px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "700",
  },
  warningBox: {
    marginTop: "12px",
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
    padding: "12px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "700",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  entryList: {
    display: "grid",
    gap: "12px",
  },
  entryCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
    background: "#f8fafc",
  },
  entryTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  journalLine: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 100px",
    gap: "10px",
    padding: "8px 0",
    borderTop: "1px solid #e2e8f0",
    fontSize: "14px",
  },
  reportSection: {
    marginTop: "18px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "14px",
    background: "#f8fafc",
  },
  reportTitle: {
    margin: "0 0 10px 0",
    fontSize: "18px",
    fontWeight: "800",
  },
  reportLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    borderTop: "1px solid #e2e8f0",
  },
  totalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
    marginTop: "8px",
    borderTop: "2px solid #0f172a",
  },
  exampleLine: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "10px",
    background: "#f8fafc",
  },
  rulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
  },
  ruleCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
    background: "#f8fafc",
  },
  ruleTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "800",
  },
  ruleText: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: "1.5",
  },
};
