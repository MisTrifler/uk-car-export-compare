"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "wm_cleaner_jobs_v4";
const CLEANERS_KEY = "wm_cleaner_partners_v4";
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const serviceTypes = [
  "Regular Weekly Clean",
  "One-Off House Clean",
  "Deep Clean",
  "End-of-Tenancy Clean",
  "Airbnb / Changeover Clean",
  "After-Builders Clean",
  "Office / Shop Clean",
  "Other",
];

const leadSources = [
  "Facebook Group",
  "Facebook Marketplace",
  "Nextdoor",
  "Gumtree",
  "WhatsApp",
  "Referral",
  "Website",
  "Other",
];

const areas = [
  "Birmingham",
  "Walsall",
  "Sutton Coldfield",
  "Great Barr",
  "Edgbaston",
  "Harborne",
  "Selly Oak",
  "Moseley",
  "Kings Heath",
  "Erdington",
  "Handsworth",
  "Bloxwich",
  "Willenhall",
  "Aldridge",
  "Darlaston",
  "Other",
];

const paymentMethods = ["Bank Transfer", "Stripe", "PayPal", "Cash", "Other"];
const outcomes = ["Pending", "Booked", "Completed", "Lost", "Refunded", "Replaced"];

const defaultJob = {
  id: "",
  dateReceived: "",
  status: "New Enquiry",
  leadSource: "Facebook Group",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerPostcode: "",
  area: "Birmingham",
  serviceType: "Regular Weekly Clean",
  propertySize: "",
  preferredDate: "",
  customerBudget: "",
  consentToShare: false,
  customerNotes: "",
  anonymisedLeadSummary: "",
  allocatedCleaner: "",
  dateOfferedToCleaner: "",
  leadFee: "",
  cleanerPaid: false,
  paymentAmountReceived: "",
  paymentDate: "",
  paymentMethod: "Bank Transfer",
  paymentReference: "",
  detailsReleased: false,
  dateDetailsReleased: "",
  outcome: "Pending",
  internalNotes: "",
};

const defaultCleaner = {
  id: "",
  name: "",
  phone: "",
  email: "",
  areasCovered: "",
  servicesOffered: "",
  insuranceProofSeen: false,
  insuranceProvider: "",
  insuranceCoverAmount: "",
  insuranceExpiryDate: "",
  reviewsProofSeen: false,
  paymentTermsAccepted: false,
  reliabilityScore: "New",
  notes: "",
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

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copied to clipboard");
}

function isInsuranceExpired(expiryDate) {
  if (!expiryDate) return true;
  const todayDate = new Date(today());
  const expiry = new Date(expiryDate);
  return expiry < todayDate;
}

function cleanerCanReceiveLeads(cleaner) {
  return Boolean(
    cleaner.insuranceProofSeen &&
      cleaner.insuranceProvider &&
      cleaner.insuranceCoverAmount &&
      cleaner.insuranceExpiryDate &&
      !isInsuranceExpired(cleaner.insuranceExpiryDate) &&
      cleaner.paymentTermsAccepted
  );
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
    } else if ((char === NL || char === CR) && !insideQuotes) {
      if (char === CR && nextChar === NL) i += 1;
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

function rowsToObjects(rowsToConvert, defaultShape) {
  if (rowsToConvert.length < 1) return [];

  const headers = rowsToConvert[0].map((header) => header.trim());

  return rowsToConvert
    .slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const item = { ...defaultShape };

      headers.forEach((header, index) => {
        if (!(header in item)) return;

        const value = row[index] ?? "";

        if (typeof item[header] === "boolean") {
          item[header] =
            value === "true" ||
            value === "TRUE" ||
            value === "Yes" ||
            value === "yes";
        } else {
          item[header] = value;
        }
      });

      if (!item.id) item.id = makeId("IMPORTED");
      return item;
    });
}

export default function CleanerLeadTrackerPage() {
  const [jobs, setJobs] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [activeTab, setActiveTab] = useState("jobs");
  const [search, setSearch] = useState("");
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [cleanerFormOpen, setCleanerFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editingCleaner, setEditingCleaner] = useState(null);
  const importFullInputRef = useRef(null);

  useEffect(() => {
    try {
      const savedJobs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const savedCleaners = JSON.parse(localStorage.getItem(CLEANERS_KEY) || "[]");
      setJobs(savedJobs);
      setCleaners(savedCleaners);
    } catch {
      setJobs([]);
      setCleaners([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(CLEANERS_KEY, JSON.stringify(cleaners));
  }, [cleaners]);

  const approvedCleaners = useMemo(
    () => cleaners.filter((cleaner) => cleanerCanReceiveLeads(cleaner)),
    [cleaners]
  );

  const stats = useMemo(() => {
    const totalLeads = jobs.length;
    const paidLeads = jobs.filter((job) => job.cleanerPaid).length;
    const releasedLeads = jobs.filter((job) => job.detailsReleased).length;
    const lockedLeads = jobs.filter((job) => !job.cleanerPaid).length;
    const revenue = jobs.reduce((sum, job) => sum + money(job.paymentAmountReceived), 0);

    return {
      totalLeads,
      paidLeads,
      releasedLeads,
      lockedLeads,
      approvedCleaners: approvedCleaners.length,
      revenue,
    };
  }, [jobs, approvedCleaners]);

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase();

    return jobs.filter((job) => {
      const text = [
        job.customerName,
        job.customerPhone,
        job.customerEmail,
        job.customerPostcode,
        job.area,
        job.serviceType,
        job.allocatedCleaner,
        job.status,
        job.outcome,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [jobs, search]);

  function openNewJob() {
    setEditingJob({
      ...defaultJob,
      id: makeId("JOB"),
      dateReceived: today(),
    });
    setJobFormOpen(true);
  }

  function openEditJob(job) {
    setEditingJob(job);
    setJobFormOpen(true);
  }

  function saveJob(job) {
    let status = "New Enquiry";

    if (job.detailsReleased) {
      status = "Details Released";
    } else if (job.cleanerPaid) {
      status = "Paid - Release Details";
    } else if (job.allocatedCleaner) {
      status = "Offered to Cleaner";
    }

    const updatedJob = {
      ...job,
      status,
      detailsReleased: job.cleanerPaid ? job.detailsReleased : false,
    };

    setJobs((current) => {
      const exists = current.some((item) => item.id === updatedJob.id);
      if (exists) {
        return current.map((item) => (item.id === updatedJob.id ? updatedJob : item));
      }
      return [updatedJob, ...current];
    });

    setEditingJob(null);
    setJobFormOpen(false);
  }

  function deleteJob(jobId) {
    if (!window.confirm("Delete this job?")) return;
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  function openNewCleaner() {
    setEditingCleaner({
      ...defaultCleaner,
      id: makeId("CLEANER"),
    });
    setCleanerFormOpen(true);
  }

  function openEditCleaner(cleaner) {
    setEditingCleaner(cleaner);
    setCleanerFormOpen(true);
  }

  function saveCleaner(cleaner) {
    setCleaners((current) => {
      const exists = current.some((item) => item.id === cleaner.id);
      if (exists) {
        return current.map((item) => (item.id === cleaner.id ? cleaner : item));
      }
      return [cleaner, ...current];
    });

    setEditingCleaner(null);
    setCleanerFormOpen(false);
  }

  function deleteCleaner(cleanerId) {
    if (!window.confirm("Delete this cleaner?")) return;
    setCleaners((current) => current.filter((cleaner) => cleaner.id !== cleanerId));
  }

  function createAnonymisedLead(job) {
    const postcodeArea = job.customerPostcode
      ? job.customerPostcode.trim().split(" ")[0].toUpperCase()
      : "Not provided";

    return `NEW CLEANING LEAD AVAILABLE

Area: ${job.area || "Not provided"}
Postcode area: ${postcodeArea}
Service needed: ${job.serviceType || "Not provided"}
Property size: ${job.propertySize || "Not provided"}
Preferred date: ${job.preferredDate || "Flexible / not provided"}
Customer budget: ${job.customerBudget ? "£" + job.customerBudget : "Not provided"}
Notes: ${job.customerNotes || "No extra notes"}

Lead fee: £${job.leadFee || "TBC"}

Full customer name, phone number, email and full address/postcode are released only after the lead fee is paid.`;
  }

  function createReleaseDetails(job) {
    if (!job.cleanerPaid) {
      return "Payment has not been received. Do not release this customer's details.";
    }

    return `PAID CLEANING LEAD - CUSTOMER DETAILS

Customer name: ${job.customerName || "Not provided"}
Phone: ${job.customerPhone || "Not provided"}
Email: ${job.customerEmail || "Not provided"}
Postcode / address area: ${job.customerPostcode || "Not provided"}

Area: ${job.area || "Not provided"}
Service needed: ${job.serviceType || "Not provided"}
Property size: ${job.propertySize || "Not provided"}
Preferred date: ${job.preferredDate || "Flexible / not provided"}
Customer budget: ${job.customerBudget ? "£" + job.customerBudget : "Not provided"}

Customer notes:
${job.customerNotes || "No extra notes"}

Please contact the customer quickly and professionally.`;
  }

  function exportFullBackupCsv() {
    const jobHeaders = Object.keys(defaultJob);
    const cleanerHeaders = Object.keys(defaultCleaner);

    const jobRows = jobs.map((job) =>
      jobHeaders.map((header) => csvCell(job[header])).join(",")
    );

    const cleanerRows = cleaners.map((cleaner) =>
      cleanerHeaders.map((header) => csvCell(cleaner[header])).join(",")
    );

    const csv = [
      "SECTION,JOBS",
      jobHeaders.join(","),
      ...jobRows,
      "SECTION,CLEANERS",
      cleanerHeaders.join(","),
      ...cleanerRows,
    ].join(NL);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaner-lead-tracker-full-backup.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importFullBackupCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ""));
      const jobsSectionIndex = rows.findIndex(
        (row) => row[0] === "SECTION" && row[1] === "JOBS"
      );
      const cleanersSectionIndex = rows.findIndex(
        (row) => row[0] === "SECTION" && row[1] === "CLEANERS"
      );

      if (
        jobsSectionIndex === -1 ||
        cleanersSectionIndex === -1 ||
        cleanersSectionIndex <= jobsSectionIndex
      ) {
        alert(
          "This does not look like a full tracker backup CSV. Please import the file exported from 'Export Full Backup CSV'."
        );
        event.target.value = "";
        return;
      }

      const jobRows = rows.slice(jobsSectionIndex + 1, cleanersSectionIndex);
      const cleanerRows = rows.slice(cleanersSectionIndex + 1);

      const importedJobs = rowsToObjects(jobRows, defaultJob);
      const importedCleaners = rowsToObjects(cleanerRows, defaultCleaner);

      const replace = window.confirm(
        `Full backup found:

Jobs: ${importedJobs.length}
Cleaners: ${importedCleaners.length}

Click OK to replace current jobs and cleaners.
Click Cancel to add them to current jobs and cleaners.`
      );

      if (replace) {
        setJobs(importedJobs);
        setCleaners(importedCleaners);
      } else {
        setJobs((current) => [...importedJobs, ...current]);
        setCleaners((current) => [...importedCleaners, ...current]);
      }

      alert("Full backup imported successfully.");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.kicker}>Private Admin Tool</p>
          <h1 style={styles.title}>Cleaner Lead Control Centre</h1>
          <p style={styles.subtitle}>
            Track Birmingham and Walsall cleaning leads. Client details stay locked until cleaner
            payment is recorded. Cleaners must have valid public liability insurance before receiving
            leads.
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.primaryButton} onClick={openNewJob}>
            + New Job
          </button>
          <button style={styles.secondaryButton} onClick={openNewCleaner}>
            + New Cleaner
          </button>
          <button style={styles.primaryButton} onClick={exportFullBackupCsv}>
            Export Full Backup CSV
          </button>
          <button
            style={styles.primaryButton}
            onClick={() => importFullInputRef.current?.click()}
          >
            Import Full Backup CSV
          </button>
          <input
            ref={importFullInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={importFullBackupCsv}
          />
        </div>
      </section>

      <section style={styles.statsGrid}>
        <StatCard label="Total Leads" value={stats.totalLeads} />
        <StatCard label="Paid Leads" value={stats.paidLeads} />
        <StatCard label="Details Released" value={stats.releasedLeads} />
        <StatCard label="Locked Leads" value={stats.lockedLeads} />
        <StatCard label="Approved Cleaners" value={stats.approvedCleaners} />
        <StatCard label="Revenue" value={`£${stats.revenue.toFixed(2)}`} />
      </section>

      <section style={styles.tabs}>
        <button
          style={activeTab === "jobs" ? styles.activeTabButton : styles.tabButton}
          onClick={() => setActiveTab("jobs")}
        >
          Jobs Tracker
        </button>
        <button
          style={activeTab === "cleaners" ? styles.activeTabButton : styles.tabButton}
          onClick={() => setActiveTab("cleaners")}
        >
          Cleaner Partners
        </button>
        <button
          style={activeTab === "rules" ? styles.activeTabButton : styles.tabButton}
          onClick={() => setActiveTab("rules")}
        >
          Rules & Templates
        </button>
      </section>

      {activeTab === "jobs" && (
        <section>
          <div style={styles.searchCard}>
            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer, phone, postcode, area, service, cleaner or status"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <div style={styles.emptyCard}>
              <h2 style={styles.emptyTitle}>No jobs yet</h2>
              <p style={styles.emptyText}>Click “New Job” to add your first customer enquiry.</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredJobs.map((job) => {
                const canRelease = job.cleanerPaid && job.paymentAmountReceived && job.paymentDate;

                return (
                  <article key={job.id} style={styles.jobCard}>
                    <div style={styles.jobTop}>
                      <div>
                        <div style={styles.badgeRow}>
                          <h2 style={styles.jobTitle}>
                            {job.customerName || "Unnamed customer"}
                          </h2>
                          <StatusBadge job={job} />
                          <span style={styles.outlineBadge}>{job.serviceType}</span>
                        </div>

                        <p style={styles.jobMeta}>
                          {job.area} • {job.customerPostcode || "No postcode"} •{" "}
                          {job.propertySize || "No property size"} • Preferred:{" "}
                          {job.preferredDate || "Not added"}
                        </p>

                        <p style={styles.jobMeta}>
                          Cleaner: {job.allocatedCleaner || "Not allocated"} • Lead fee: £
                          {job.leadFee || "0"} • Paid: £{job.paymentAmountReceived || "0"}
                        </p>

                        {!job.cleanerPaid && (
                          <div style={styles.warningBox}>
                            🔒 Payment not received. Do not release customer details.
                          </div>
                        )}

                        {job.cleanerPaid && !job.detailsReleased && (
                          <div style={styles.successBox}>
                            ✅ Payment recorded. You can now release customer details.
                          </div>
                        )}
                      </div>

                      <div style={styles.cardButtons}>
                        <button
                          style={styles.secondaryButton}
                          onClick={() => copyToClipboard(createAnonymisedLead(job))}
                        >
                          Copy Lead
                        </button>

                        <button
                          style={canRelease ? styles.primaryButton : styles.disabledButton}
                          disabled={!canRelease}
                          onClick={() => copyToClipboard(createReleaseDetails(job))}
                        >
                          Copy Details
                        </button>

                        <button style={styles.secondaryButton} onClick={() => openEditJob(job)}>
                          Edit
                        </button>

                        <button style={styles.dangerButton} onClick={() => deleteJob(job.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "cleaners" && (
        <section>
          {cleaners.length === 0 ? (
            <div style={styles.emptyCard}>
              <h2 style={styles.emptyTitle}>No cleaner partners yet</h2>
              <p style={styles.emptyText}>
                Add reliable insured cleaners before you begin sending paid leads.
              </p>
            </div>
          ) : (
            <div style={styles.cleanerGrid}>
              {cleaners.map((cleaner) => {
                const approved = cleanerCanReceiveLeads(cleaner);
                const expired =
                  cleaner.insuranceExpiryDate && isInsuranceExpired(cleaner.insuranceExpiryDate);

                return (
                  <article key={cleaner.id} style={styles.cleanerCard}>
                    <div style={styles.cleanerTop}>
                      <div>
                        <h2 style={styles.jobTitle}>{cleaner.name}</h2>
                        <p style={styles.jobMeta}>{cleaner.areasCovered}</p>
                      </div>
                      <span style={approved ? styles.successBadge : styles.lockedBadge}>
                        {approved ? "Approved for leads" : "Do not send leads"}
                      </span>
                    </div>

                    <p style={styles.jobMeta}>Phone: {cleaner.phone || "Not added"}</p>
                    <p style={styles.jobMeta}>Email: {cleaner.email || "Not added"}</p>
                    <p style={styles.jobMeta}>
                      Services: {cleaner.servicesOffered || "Not added"}
                    </p>
                    <p style={styles.jobMeta}>
                      Insurance: {cleaner.insuranceProvider || "Not added"} • Cover:{" "}
                      {cleaner.insuranceCoverAmount || "Not added"} • Expires:{" "}
                      {cleaner.insuranceExpiryDate || "Not added"}
                    </p>

                    {expired && (
                      <div style={styles.warningBox}>
                        ⚠️ Insurance appears expired. Do not send leads until updated proof is seen.
                      </div>
                    )}

                    <div style={styles.badgeRow}>
                      {cleaner.insuranceProofSeen && (
                        <span style={styles.successBadge}>Insurance proof seen</span>
                      )}
                      {cleaner.reviewsProofSeen && (
                        <span style={styles.successBadge}>Reviews/photos</span>
                      )}
                      {cleaner.paymentTermsAccepted && (
                        <span style={styles.successBadge}>Terms accepted</span>
                      )}
                    </div>

                    <div style={styles.cardButtons}>
                      <button
                        style={styles.secondaryButton}
                        onClick={() => openEditCleaner(cleaner)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.dangerButton}
                        onClick={() => deleteCleaner(cleaner.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "rules" && (
        <section style={styles.rulesCard}>
          <h2 style={styles.sectionTitle}>Airtight Operating Rules</h2>

          <div style={styles.policyBoxImportant}>
            <h3 style={styles.policyTitle}>Main cleaner rule</h3>
            <p style={styles.policyText}>
              No insurance proof = no leads. Only send customer enquiries to cleaners who have
              provided valid public liability insurance proof and accepted your payment terms.
            </p>
          </div>

          <div style={styles.rulesGrid}>
            <RuleCard
              title="1. Get customer consent"
              text="Tell the customer you are a matching service and their details may be shared with an independent cleaner who can respond to their enquiry."
            />
            <RuleCard
              title="2. Send anonymised lead only"
              text="Before payment, send only the area, postcode area, service type, property size, preferred date and lead fee. Do not send name, phone, email or full address."
            />
            <RuleCard
              title="3. Payment before details"
              text="Cleaner must pay your lead fee first. Only after payment is recorded should you release customer details."
            />
            <RuleCard
              title="4. Record the release"
              text="After releasing details, tick details released and add the release date. This protects you if there is a dispute later."
            />
            <RuleCard
              title="5. Insurance check"
              text="Store the insurance provider, cover amount and expiry date. If insurance has expired or proof is missing, do not send that cleaner any leads."
            />
            <RuleCard
              title="6. Independent cleaners only"
              text="Cleaners are independent self-employed providers, not your employees. They handle their own quotes, bookings, work, payments, insurance and customer service."
            />
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Cleaner onboarding message</h3>
            <p style={styles.policyText}>
              “To protect customers and keep the service professional, I only work with independent
              cleaners who can provide proof of valid public liability insurance. Before I can send
              any customer enquiries, please send your full name, areas covered, services offered,
              prices, availability, proof of public liability insurance, and any reviews or photos
              you have.”
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Refund / replacement rule</h3>
            <p style={styles.policyText}>
              Replace or refund only if the lead is fake, the phone number is wrong, the customer
              never requested cleaning, or you accidentally sold the same lead twice. Do not refund
              because the cleaner quoted too high, replied too slowly, or failed to win the job.
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Customer wording</h3>
            <p style={styles.policyText}>
              “We are a local matching service, not the cleaning company. By sending your details,
              you agree that we may share your enquiry with a suitable independent cleaner so they
              can contact you about your cleaning request.”
            </p>
          </div>
        </section>
      )}

      {jobFormOpen && editingJob && (
        <JobModal
          job={editingJob}
          setJob={setEditingJob}
          cleaners={approvedCleaners}
          onSave={saveJob}
          onClose={() => {
            setJobFormOpen(false);
            setEditingJob(null);
          }}
        />
      )}

      {cleanerFormOpen && editingCleaner && (
        <CleanerModal
          cleaner={editingCleaner}
          setCleaner={setEditingCleaner}
          onSave={saveCleaner}
          onClose={() => {
            setCleanerFormOpen(false);
            setEditingCleaner(null);
          }}
        />
      )}
    </main>
  );
}

function JobModal({ job, setJob, cleaners, onSave, onClose }) {
  const canRelease = job.cleanerPaid && job.paymentAmountReceived && job.paymentDate;

  function update(field, value) {
    setJob((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Job Details</h2>
            <p style={styles.modalSubtitle}>
              Fill in the enquiry, allocate an approved insured cleaner, record payment, then
              release details.
            </p>
          </div>
          <button style={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={canRelease ? styles.successBox : styles.warningBox}>
          {canRelease
            ? "✅ Payment received. You may release customer details."
            : "🔒 Details are locked until cleaner payment amount and date are recorded."}
        </div>

        <FormSection title="1. Customer Enquiry">
          <div style={styles.formGrid}>
            <Field label="Date Received">
              <input
                style={styles.input}
                type="date"
                value={job.dateReceived}
                onChange={(event) => update("dateReceived", event.target.value)}
              />
            </Field>

            <Field label="Lead Source">
              <select
                style={styles.input}
                value={job.leadSource}
                onChange={(event) => update("leadSource", event.target.value)}
              >
                {leadSources.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Area">
              <select
                style={styles.input}
                value={job.area}
                onChange={(event) => update("area", event.target.value)}
              >
                {areas.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Customer Name">
              <input
                style={styles.input}
                value={job.customerName}
                onChange={(event) => update("customerName", event.target.value)}
              />
            </Field>

            <Field label="Customer Phone">
              <input
                style={styles.input}
                value={job.customerPhone}
                onChange={(event) => update("customerPhone", event.target.value)}
              />
            </Field>

            <Field label="Customer Email">
              <input
                style={styles.input}
                value={job.customerEmail}
                onChange={(event) => update("customerEmail", event.target.value)}
              />
            </Field>

            <Field label="Customer Postcode / Address Area">
              <input
                style={styles.input}
                value={job.customerPostcode}
                onChange={(event) => update("customerPostcode", event.target.value)}
              />
            </Field>

            <Field label="Service Type">
              <select
                style={styles.input}
                value={job.serviceType}
                onChange={(event) => update("serviceType", event.target.value)}
              >
                {serviceTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Property Size">
              <input
                style={styles.input}
                placeholder="Example: 2-bed flat"
                value={job.propertySize}
                onChange={(event) => update("propertySize", event.target.value)}
              />
            </Field>

            <Field label="Preferred Date">
              <input
                style={styles.input}
                type="date"
                value={job.preferredDate}
                onChange={(event) => update("preferredDate", event.target.value)}
              />
            </Field>

            <Field label="Customer Budget £">
              <input
                style={styles.input}
                type="number"
                value={job.customerBudget}
                onChange={(event) => update("customerBudget", event.target.value)}
              />
            </Field>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={job.consentToShare}
                onChange={(event) => update("consentToShare", event.target.checked)}
              />
              Consent to share details
            </label>
          </div>

          <Field label="Customer Notes">
            <textarea
              style={styles.textarea}
              value={job.customerNotes}
              onChange={(event) => update("customerNotes", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection title="2. Offer Anonymised Lead to Cleaner">
          <div style={styles.formGrid}>
            <Field label="Allocated Cleaner">
              <select
                style={styles.input}
                value={job.allocatedCleaner}
                onChange={(event) => update("allocatedCleaner", event.target.value)}
              >
                <option value="">Unallocated</option>
                {cleaners.map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.name}>
                    {cleaner.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date Offered to Cleaner">
              <input
                style={styles.input}
                type="date"
                value={job.dateOfferedToCleaner}
                onChange={(event) => update("dateOfferedToCleaner", event.target.value)}
              />
            </Field>

            <Field label="Lead Fee £">
              <input
                style={styles.input}
                type="number"
                value={job.leadFee}
                onChange={(event) => update("leadFee", event.target.value)}
              />
            </Field>
          </div>

          {cleaners.length === 0 && (
            <div style={styles.warningBox}>
              ⚠️ No approved cleaners available. Add a cleaner with valid insurance proof and
              accepted payment terms first.
            </div>
          )}

          <Field label="Anonymised Lead Summary">
            <textarea
              style={styles.textarea}
              placeholder="Example: B12 area, 2-bed flat, end-of-tenancy clean needed Saturday. Lead fee £35."
              value={job.anonymisedLeadSummary}
              onChange={(event) => update("anonymisedLeadSummary", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection title="3. Cleaner Payment">
          <div style={styles.formGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={job.cleanerPaid}
                onChange={(event) => {
                  update("cleanerPaid", event.target.checked);
                  if (!event.target.checked) update("detailsReleased", false);
                }}
              />
              Cleaner Paid?
            </label>

            <Field label="Payment Amount Received £">
              <input
                style={styles.input}
                type="number"
                value={job.paymentAmountReceived}
                onChange={(event) => update("paymentAmountReceived", event.target.value)}
              />
            </Field>

            <Field label="Payment Date">
              <input
                style={styles.input}
                type="date"
                value={job.paymentDate}
                onChange={(event) => update("paymentDate", event.target.value)}
              />
            </Field>

            <Field label="Payment Method">
              <select
                style={styles.input}
                value={job.paymentMethod}
                onChange={(event) => update("paymentMethod", event.target.value)}
              >
                {paymentMethods.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>

            <Field label="Payment Reference">
              <input
                style={styles.input}
                value={job.paymentReference}
                onChange={(event) => update("paymentReference", event.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="4. Release Details After Payment">
          <div style={styles.formGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                disabled={!canRelease}
                checked={job.detailsReleased}
                onChange={(event) => update("detailsReleased", event.target.checked)}
              />
              Details Released?
            </label>

            <Field label="Date Details Released">
              <input
                style={styles.input}
                type="date"
                disabled={!canRelease}
                value={job.dateDetailsReleased}
                onChange={(event) => update("dateDetailsReleased", event.target.value)}
              />
            </Field>

            <Field label="Outcome">
              <select
                style={styles.input}
                value={job.outcome}
                onChange={(event) => update("outcome", event.target.value)}
              >
                {outcomes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Internal Notes">
            <textarea
              style={styles.textarea}
              value={job.internalNotes}
              onChange={(event) => update("internalNotes", event.target.value)}
            />
          </Field>
        </FormSection>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.primaryButton} onClick={() => onSave(job)}>
            Save Job
          </button>
        </div>
      </div>
    </div>
  );
}

function CleanerModal({ cleaner, setCleaner, onSave, onClose }) {
  const approved = cleanerCanReceiveLeads(cleaner);
  const expired = cleaner.insuranceExpiryDate && isInsuranceExpired(cleaner.insuranceExpiryDate);

  function update(field, value) {
    setCleaner((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Cleaner Partner</h2>
            <p style={styles.modalSubtitle}>
              Store cleaner details, insurance proof, expiry date and payment terms.
            </p>
          </div>
          <button style={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div style={approved ? styles.successBox : styles.warningBox}>
          {approved
            ? "✅ This cleaner is approved to receive leads."
            : "⚠️ Do not send leads until valid insurance proof is seen and payment terms are accepted."}
        </div>

        {expired && (
          <div style={styles.warningBox}>
            ⚠️ Insurance expiry date has passed. Ask for updated proof before sending leads.
          </div>
        )}

        <FormSection title="Cleaner Details">
          <div style={styles.formGrid}>
            <Field label="Cleaner / Full Name">
              <input
                style={styles.input}
                value={cleaner.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>

            <Field label="Phone">
              <input
                style={styles.input}
                value={cleaner.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field>

            <Field label="Email">
              <input
                style={styles.input}
                value={cleaner.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </Field>

            <Field label="Reliability Score">
              <select
                style={styles.input}
                value={cleaner.reliabilityScore}
                onChange={(event) => update("reliabilityScore", event.target.value)}
              >
                {["New", "Good", "Excellent", "Warning", "Do Not Use"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Areas Covered">
            <textarea
              style={styles.textarea}
              value={cleaner.areasCovered}
              onChange={(event) => update("areasCovered", event.target.value)}
            />
          </Field>

          <Field label="Services Offered">
            <textarea
              style={styles.textarea}
              value={cleaner.servicesOffered}
              onChange={(event) => update("servicesOffered", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection title="Mandatory Insurance Proof">
          <div style={styles.formGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={cleaner.insuranceProofSeen}
                onChange={(event) => update("insuranceProofSeen", event.target.checked)}
              />
              Public liability insurance proof seen
            </label>

            <Field label="Insurance Provider">
              <input
                style={styles.input}
                placeholder="Example: AXA, Simply Business, Hiscox"
                value={cleaner.insuranceProvider}
                onChange={(event) => update("insuranceProvider", event.target.value)}
              />
            </Field>

            <Field label="Cover Amount">
              <input
                style={styles.input}
                placeholder="Example: £1m or £2m"
                value={cleaner.insuranceCoverAmount}
                onChange={(event) => update("insuranceCoverAmount", event.target.value)}
              />
            </Field>

            <Field label="Insurance Expiry Date">
              <input
                style={styles.input}
                type="date"
                value={cleaner.insuranceExpiryDate}
                onChange={(event) => update("insuranceExpiryDate", event.target.value)}
              />
            </Field>
          </div>

          <div style={styles.warningBox}>
            Rule: no insurance proof, missing insurance details, expired insurance, or no accepted
            payment terms = do not send leads.
          </div>
        </FormSection>

        <FormSection title="Checks & Terms">
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={cleaner.reviewsProofSeen}
                onChange={(event) => update("reviewsProofSeen", event.target.checked)}
              />
              Reviews/photos seen
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={cleaner.paymentTermsAccepted}
                onChange={(event) => update("paymentTermsAccepted", event.target.checked)}
              />
              Payment terms accepted
            </label>
          </div>

          <Field label="Notes">
            <textarea
              style={styles.textarea}
              value={cleaner.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Example: Public liability insurance seen. Provider: AXA. Cover: £1m. Expires: 12/03/2027."
            />
          </Field>
        </FormSection>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.primaryButton} onClick={() => onSave(cleaner)}>
            Save Cleaner
          </button>
        </div>
      </div>
    </div>
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

function StatusBadge({ job }) {
  if (!job.cleanerPaid) {
    return <span style={styles.lockedBadge}>Locked</span>;
  }

  if (job.cleanerPaid && !job.detailsReleased) {
    return <span style={styles.paidBadge}>Paid - Release</span>;
  }

  return <span style={styles.successBadge}>Released</span>;
}

function RuleCard({ title, text }) {
  return (
    <div style={styles.ruleCard}>
      <h3 style={styles.ruleTitle}>{title}</h3>
      <p style={styles.ruleText}>{text}</p>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section style={styles.formSection}>
      <h3 style={styles.formSectionTitle}>{title}</h3>
      {children}
    </section>
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
    maxWidth: "680px",
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
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  disabledButton: {
    border: "0",
    background: "#cbd5e1",
    color: "#64748b",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: "700",
    cursor: "not-allowed",
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
    fontSize: "26px",
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
  searchCard: {
    maxWidth: "1200px",
    margin: "0 auto 18px auto",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
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
  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "11px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "white",
    color: "#0f172a",
    resize: "vertical",
    boxSizing: "border-box",
  },
  emptyCard: {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "white",
    border: "1px dashed #cbd5e1",
    borderRadius: "18px",
    padding: "40px",
    textAlign: "center",
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: "22px",
  },
  emptyText: {
    margin: 0,
    color: "#64748b",
  },
  cardList: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gap: "14px",
  },
  jobCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
  },
  jobTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  badgeRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  jobTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },
  jobMeta: {
    margin: "8px 0 0 0",
    color: "#475569",
    fontSize: "14px",
  },
  cardButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  lockedBadge: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },
  paidBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },
  successBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },
  outlineBadge: {
    border: "1px solid #cbd5e1",
    color: "#334155",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    background: "white",
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
  cleanerGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
  },
  cleanerCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
  },
  cleanerTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  rulesCard: {
    maxWidth: "1200px",
    margin: "0 auto",
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
  policyBoxImportant: {
    marginBottom: "16px",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "16px",
    padding: "16px",
  },
  policyBox: {
    marginTop: "16px",
    background: "#f1f5f9",
    borderRadius: "16px",
    padding: "16px",
  },
  policyTitle: {
    margin: "0 0 8px 0",
    fontSize: "17px",
    fontWeight: "800",
  },
  policyText: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.5",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    zIndex: 50,
    padding: "24px",
    overflow: "auto",
  },
  modal: {
    maxWidth: "980px",
    margin: "0 auto",
    background: "white",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.35)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "flex-start",
    marginBottom: "14px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "800",
  },
  modalSubtitle: {
    margin: "6px 0 0 0",
    color: "#64748b",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
  },
  formSection: {
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    marginTop: "16px",
    background: "#ffffff",
  },
  formSectionTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
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
  checkboxLabel: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "11px 12px",
    fontSize: "14px",
    fontWeight: "700",
    background: "white",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginTop: "12px",
  },
};
