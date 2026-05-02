"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "wm_cleaner_booking_jobs_v2";
const CLEANERS_KEY = "wm_cleaner_booking_partners_v2";
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
  "Nextdoor",
  "Facebook Group",
  "Facebook Marketplace",
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

const outcomes = ["Pending", "Booked", "Completed", "Cancelled", "Refunded", "Dispute"];

const defaultJob = {
  id: "",
  dateReceived: "",
  status: "New Enquiry",
  leadSource: "Nextdoor",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerPostcode: "",
  area: "Birmingham",
  serviceType: "Regular Weekly Clean",
  propertySize: "",
  preferredDate: "",
  preferredTime: "",
  customerNotes: "",
  consentToShare: false,

  customerQuotedPrice: "",
  quoteSentDate: "",
  customerAcceptedQuote: false,

  customerPaid: false,
  customerPaymentAmount: "",
  customerPaymentDate: "",
  customerPaymentMethod: "Bank Transfer",
  customerPaymentReference: "",

  allocatedCleaner: "",
  cleanerFeeAgreed: "",
  yourBookingFee: "",
  cleanerAssignedDate: "",
  detailsReleasedToCleaner: false,
  dateDetailsReleased: "",

  jobCompleted: false,
  jobCompletedDate: "",
  cleanerPaidOut: false,
  cleanerPayoutAmount: "",
  cleanerPayoutDate: "",
  cleanerPayoutReference: "",

  outcome: "Pending",
  internalNotes: "",
};

const defaultCleaner = {
  id: "",
  name: "",
  phone: "",
  email: "",
  baseArea: "Birmingham",
  basePostcode: "",
  areasCovered: "",
  servicesOffered: "",
  usualPrices: "",
  availability: "",
  insuranceProofSeen: false,
  insuranceProvider: "",
  insuranceCoverAmount: "",
  insuranceExpiryDate: "",
  reviewsProofSeen: false,
  contractorTermsAccepted: false,
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

function formatMoney(value) {
  return `£${money(value).toFixed(2)}`;
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

function cleanerCanReceiveBookings(cleaner) {
  return Boolean(
    cleaner.insuranceProofSeen &&
      cleaner.insuranceProvider &&
      cleaner.insuranceCoverAmount &&
      cleaner.insuranceExpiryDate &&
      !isInsuranceExpired(cleaner.insuranceExpiryDate) &&
      cleaner.contractorTermsAccepted &&
      cleaner.paymentTermsAccepted
  );
}

function calculateYourFee(job) {
  const quoted = money(job.customerQuotedPrice || job.customerPaymentAmount);
  const cleanerFee = money(job.cleanerFeeAgreed || job.cleanerPayoutAmount);
  const manualFee = money(job.yourBookingFee);
  if (manualFee > 0) return manualFee;
  return quoted - cleanerFee;
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("/", " ")
    .replaceAll("-", " ")
    .replaceAll(",", " ")
    .replaceAll(".", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPostcodePrefix(postcode) {
  const cleaned = String(postcode || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const firstPart = cleaned.split(" ")[0] || "";
  return firstPart;
}

function getPostcodeDistrict(postcode) {
  const prefix = getPostcodePrefix(postcode);
  const match = prefix.match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function textIncludesAny(text, values) {
  const clean = cleanText(text);
  return values.some((value) => clean.includes(cleanText(value)));
}

function serviceKeywords(serviceType) {
  const service = cleanText(serviceType);

  if (service.includes("regular")) return ["regular", "weekly", "house", "domestic"];
  if (service.includes("one off")) return ["one off", "oneoff", "house", "domestic"];
  if (service.includes("deep")) return ["deep"];
  if (service.includes("end of tenancy")) return ["end", "tenancy"];
  if (service.includes("airbnb") || service.includes("changeover")) return ["airbnb", "changeover"];
  if (service.includes("builders")) return ["builders", "after builders"];
  if (service.includes("office") || service.includes("shop")) return ["office", "shop", "commercial"];
  return [service];
}

function reliabilityPoints(score) {
  if (score === "Excellent") return 20;
  if (score === "Good") return 14;
  if (score === "New") return 8;
  if (score === "Warning") return -15;
  if (score === "Do Not Use") return -100;
  return 0;
}

function getCleanerMatch(job, cleaner) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  const approved = cleanerCanReceiveBookings(cleaner);
  const expired = cleaner.insuranceExpiryDate && isInsuranceExpired(cleaner.insuranceExpiryDate);

  const jobArea = cleanText(job.area);
  const jobPostcodePrefix = getPostcodePrefix(job.customerPostcode);
  const jobPostcodeDistrict = getPostcodeDistrict(job.customerPostcode);
  const cleanerBasePrefix = getPostcodePrefix(cleaner.basePostcode);
  const cleanerBaseDistrict = getPostcodeDistrict(cleaner.basePostcode);

  const cleanerAreas = cleanText(`${cleaner.baseArea} ${cleaner.areasCovered}`);
  const cleanerServices = cleanText(cleaner.servicesOffered);
  const cleanerAvailability = cleanText(cleaner.availability);
  const jobServiceKeywords = serviceKeywords(job.serviceType);

  if (approved) {
    score += 35;
    reasons.push("Approved: valid insurance and accepted terms");
  } else {
    score -= 80;
    warnings.push("Cleaner is not fully approved yet");
  }

  if (expired) {
    score -= 80;
    warnings.push("Insurance appears expired");
  }

  if (cleaner.reliabilityScore === "Do Not Use") {
    warnings.push("Reliability score is Do Not Use");
  }

  const exactAreaMatch =
    jobArea && (cleanerAreas.includes(jobArea) || cleanText(cleaner.baseArea).includes(jobArea));

  if (exactAreaMatch) {
    score += 25;
    reasons.push(`Covers ${job.area}`);
  } else {
    warnings.push(`Area ${job.area} not clearly listed`);
  }

  if (
    jobPostcodePrefix &&
    cleanerBasePrefix &&
    jobPostcodePrefix === cleanerBasePrefix
  ) {
    score += 30;
    reasons.push(`Very close postcode match: ${jobPostcodePrefix}`);
  } else if (
    jobPostcodeDistrict &&
    cleanerBaseDistrict &&
    jobPostcodeDistrict === cleanerBaseDistrict
  ) {
    score += 18;
    reasons.push(`Same postcode district: ${jobPostcodeDistrict}`);
  } else if (jobPostcodePrefix && cleanerAreas.includes(cleanText(jobPostcodePrefix))) {
    score += 16;
    reasons.push(`Postcode area ${jobPostcodePrefix} is listed in cleaner coverage`);
  }

  const serviceMatch = jobServiceKeywords.some((keyword) =>
    cleanerServices.includes(cleanText(keyword))
  );

  if (serviceMatch) {
    score += 20;
    reasons.push(`Offers ${job.serviceType}`);
  } else {
    warnings.push(`Service ${job.serviceType} not clearly listed`);
  }

  if (job.preferredDate && cleanerAvailability) {
    score += 5;
    reasons.push("Availability notes are recorded");
  }

  if (cleaner.reviewsProofSeen) {
    score += 6;
    reasons.push("Reviews/photos seen");
  }

  const reliability = reliabilityPoints(cleaner.reliabilityScore);
  score += reliability;

  if (cleaner.reliabilityScore) {
    reasons.push(`Reliability: ${cleaner.reliabilityScore}`);
  }

  if (!cleaner.phone && !cleaner.email) {
    score -= 10;
    warnings.push("No cleaner phone/email saved");
  }

  if (!cleaner.basePostcode) {
    warnings.push("No cleaner base postcode saved");
  }

  if (!cleaner.areasCovered) {
    warnings.push("No areas covered saved");
  }

  if (!cleaner.servicesOffered) {
    warnings.push("No services offered saved");
  }

  return {
    cleaner,
    score,
    reasons,
    warnings,
    approved,
  };
}

function getCleanerMatches(job, cleaners) {
  return cleaners
    .map((cleaner) => getCleanerMatch(job, cleaner))
    .sort((a, b) => b.score - a.score);
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
            value === "true" || value === "TRUE" || value === "Yes" || value === "yes";
        } else {
          item[header] = value;
        }
      });

      if (!item.id) item.id = makeId("IMPORTED");
      return item;
    });
}

export default function CleanerBookingTrackerPage() {
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
    () => cleaners.filter((cleaner) => cleanerCanReceiveBookings(cleaner)),
    [cleaners]
  );

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const customerPaidJobs = jobs.filter((job) => job.customerPaid).length;
    const completedJobs = jobs.filter((job) => job.jobCompleted).length;
    const cleanerPaidJobs = jobs.filter((job) => job.cleanerPaidOut).length;

    const customerMoneyReceived = jobs.reduce(
      (sum, job) => sum + money(job.customerPaymentAmount),
      0
    );

    const cleanerPayouts = jobs.reduce((sum, job) => {
      const payout = money(job.cleanerPayoutAmount || job.cleanerFeeAgreed);
      return sum + (job.cleanerPaidOut ? payout : 0);
    }, 0);

    const expectedCleanerPayouts = jobs.reduce(
      (sum, job) => sum + money(job.cleanerFeeAgreed),
      0
    );

    const expectedProfit = jobs.reduce((sum, job) => sum + calculateYourFee(job), 0);
    const actualProfit = customerMoneyReceived - cleanerPayouts;
    const unpaidCleaners = jobs.filter((job) => job.jobCompleted && !job.cleanerPaidOut).length;

    return {
      totalJobs,
      customerPaidJobs,
      completedJobs,
      cleanerPaidJobs,
      customerMoneyReceived,
      expectedCleanerPayouts,
      cleanerPayouts,
      expectedProfit,
      actualProfit,
      unpaidCleaners,
      approvedCleaners: approvedCleaners.length,
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
      id: makeId("BOOKING"),
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

    if (job.outcome === "Refunded") {
      status = "Refunded";
    } else if (job.outcome === "Cancelled") {
      status = "Cancelled";
    } else if (job.cleanerPaidOut) {
      status = "Cleaner Paid Out";
    } else if (job.jobCompleted) {
      status = "Job Completed";
    } else if (job.allocatedCleaner && job.detailsReleasedToCleaner) {
      status = "Cleaner Assigned";
    } else if (job.customerPaid) {
      status = "Customer Paid - Assign Cleaner";
    } else if (job.customerQuotedPrice) {
      status = "Quoted to Customer";
    }

    const customerPaymentAmount = job.customerPaymentAmount || job.customerQuotedPrice;
    const cleanerPayoutAmount = job.cleanerPayoutAmount || job.cleanerFeeAgreed;

    const updatedJob = {
      ...job,
      status,
      customerPaymentAmount,
      cleanerPayoutAmount,
      detailsReleasedToCleaner: job.customerPaid ? job.detailsReleasedToCleaner : false,
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
    if (!window.confirm("Delete this booking?")) return;
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

  function createCustomerQuoteMessage(job) {
    return `Hi, thanks for your enquiry.

Cleaning request: ${job.serviceType || "Not provided"}
Area: ${job.area || "Not provided"}
Property: ${job.propertySize || "Not provided"}
Preferred date/time: ${job.preferredDate || "Not provided"} ${job.preferredTime || ""}

Price: £${job.customerQuotedPrice || "TBC"}

This booking would be arranged with an independent cleaner who has provided proof of public liability insurance. Payment is required before the booking is confirmed.

Please confirm if you would like to go ahead.`;
  }

  function createCleanerOfferMessage(job) {
    const postcodeArea = job.customerPostcode
      ? job.customerPostcode.trim().split(" ")[0].toUpperCase()
      : "Not provided";

    return `PAID CLEANING JOB AVAILABLE

Area: ${job.area || "Not provided"}
Postcode area: ${postcodeArea}
Service needed: ${job.serviceType || "Not provided"}
Property size: ${job.propertySize || "Not provided"}
Preferred date/time: ${job.preferredDate || "Flexible / not provided"} ${job.preferredTime || ""}
Customer notes: ${job.customerNotes || "No extra notes"}

Cleaner fee offered: £${job.cleanerFeeAgreed || "TBC"}

Full customer details are released after you accept the job. You remain self-employed and responsible for your own work, tools, transport, insurance, tax and service quality.`;
  }

  function createReleaseDetails(job) {
    if (!job.customerPaid) {
      return "Customer payment has not been received. Do not release this customer's details.";
    }

    return `CONFIRMED CLEANING BOOKING - CUSTOMER DETAILS

Customer name: ${job.customerName || "Not provided"}
Phone: ${job.customerPhone || "Not provided"}
Email: ${job.customerEmail || "Not provided"}
Postcode / address area: ${job.customerPostcode || "Not provided"}

Area: ${job.area || "Not provided"}
Service needed: ${job.serviceType || "Not provided"}
Property size: ${job.propertySize || "Not provided"}
Preferred date/time: ${job.preferredDate || "Flexible / not provided"} ${job.preferredTime || ""}
Customer paid: £${job.customerPaymentAmount || job.customerQuotedPrice || "0"}
Cleaner fee agreed: £${job.cleanerFeeAgreed || "0"}

Customer notes:
${job.customerNotes || "No extra notes"}

Please contact the customer professionally and attend at the agreed time.`;
  }

  function exportFullBackupCsv() {
    const jobHeaders = Object.keys(defaultJob);
    const cleanerHeaders = Object.keys(defaultCleaner);

    const jobRows = jobs.map((job) => jobHeaders.map((header) => csvCell(job[header])).join(","));
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
    link.download = "cleaner-booking-tracker-full-backup.csv";
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
          "This does not look like a full booking tracker backup CSV. Please import the file exported from this page."
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
          <h1 style={styles.title}>Cleaner Booking Control Centre</h1>
          <p style={styles.subtitle}>
            Customer pays you first. You arrange the booking with an insured independent cleaner,
            then pay the cleaner after deducting your fee. The system now suggests the best cleaner
            for each job based on area, postcode, service, approval status and reliability.
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.primaryButton} onClick={openNewJob}>
            + New Booking
          </button>
          <button style={styles.secondaryButton} onClick={openNewCleaner}>
            + New Cleaner
          </button>
          <button style={styles.primaryButton} onClick={exportFullBackupCsv}>
            Export Full Backup CSV
          </button>
          <button style={styles.primaryButton} onClick={() => importFullInputRef.current?.click()}>
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
        <StatCard label="Total Bookings" value={stats.totalJobs} />
        <StatCard label="Customer Paid" value={stats.customerPaidJobs} />
        <StatCard label="Completed Jobs" value={stats.completedJobs} />
        <StatCard label="Cleaners Paid Out" value={stats.cleanerPaidJobs} />
        <StatCard label="Approved Cleaners" value={stats.approvedCleaners} />
        <StatCard label="Unpaid Cleaners" value={stats.unpaidCleaners} />
        <StatCard label="Customer Money Received" value={formatMoney(stats.customerMoneyReceived)} />
        <StatCard label="Cleaner Payouts Made" value={formatMoney(stats.cleanerPayouts)} />
        <StatCard label="Expected Profit" value={formatMoney(stats.expectedProfit)} />
        <StatCard label="Actual Profit After Payouts" value={formatMoney(stats.actualProfit)} />
      </section>

      <section style={styles.tabs}>
        <button
          style={activeTab === "jobs" ? styles.activeTabButton : styles.tabButton}
          onClick={() => setActiveTab("jobs")}
        >
          Bookings Tracker
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
              <h2 style={styles.emptyTitle}>No bookings yet</h2>
              <p style={styles.emptyText}>Click “New Booking” to add your first customer enquiry.</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredJobs.map((job) => {
                const canRelease = job.customerPaid && job.allocatedCleaner;
                const fee = calculateYourFee(job);
                const topMatch = getCleanerMatches(job, cleaners)[0];

                return (
                  <article key={job.id} style={styles.jobCard}>
                    <div style={styles.jobTop}>
                      <div>
                        <div style={styles.badgeRow}>
                          <h2 style={styles.jobTitle}>{job.customerName || "Unnamed customer"}</h2>
                          <StatusBadge job={job} />
                          <span style={styles.outlineBadge}>{job.serviceType}</span>
                        </div>

                        <p style={styles.jobMeta}>
                          {job.area} • {job.customerPostcode || "No postcode"} •{" "}
                          {job.propertySize || "No property size"} • Preferred:{" "}
                          {job.preferredDate || "Not added"} {job.preferredTime || ""}
                        </p>

                        <p style={styles.jobMeta}>
                          Cleaner: {job.allocatedCleaner || "Not allocated"} • Customer paid: £
                          {job.customerPaymentAmount || "0"} • Cleaner fee: £
                          {job.cleanerFeeAgreed || "0"} • Your fee: £{fee.toFixed(2)}
                        </p>

                        {topMatch && !job.allocatedCleaner && (
                          <div style={styles.matchMiniBox}>
                            ⭐ Best suggested cleaner: <strong>{topMatch.cleaner.name}</strong> — Match score:{" "}
                            <strong>{topMatch.score}</strong>
                          </div>
                        )}

                        {!job.customerPaid && (
                          <div style={styles.warningBox}>
                            🔒 Customer payment not received. Do not release customer details to cleaner.
                          </div>
                        )}

                        {job.customerPaid && !job.detailsReleasedToCleaner && (
                          <div style={styles.successBox}>
                            ✅ Customer payment recorded. Assign cleaner and release details when ready.
                          </div>
                        )}

                        {job.jobCompleted && !job.cleanerPaidOut && (
                          <div style={styles.warningBox}>
                            ⚠️ Job completed but cleaner has not been paid out yet.
                          </div>
                        )}
                      </div>

                      <div style={styles.cardButtons}>
                        <button
                          style={styles.secondaryButton}
                          onClick={() => copyToClipboard(createCustomerQuoteMessage(job))}
                        >
                          Copy Customer Quote
                        </button>
                        <button
                          style={styles.secondaryButton}
                          onClick={() => copyToClipboard(createCleanerOfferMessage(job))}
                        >
                          Copy Cleaner Offer
                        </button>
                        <button
                          style={canRelease ? styles.primaryButton : styles.disabledButton}
                          disabled={!canRelease}
                          onClick={() => copyToClipboard(createReleaseDetails(job))}
                        >
                          Copy Customer Details
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
              <p style={styles.emptyText}>Add reliable insured self-employed cleaners before taking bookings.</p>
            </div>
          ) : (
            <div style={styles.cleanerGrid}>
              {cleaners.map((cleaner) => {
                const approved = cleanerCanReceiveBookings(cleaner);
                const expired = cleaner.insuranceExpiryDate && isInsuranceExpired(cleaner.insuranceExpiryDate);

                return (
                  <article key={cleaner.id} style={styles.cleanerCard}>
                    <div style={styles.cleanerTop}>
                      <div>
                        <h2 style={styles.jobTitle}>{cleaner.name}</h2>
                        <p style={styles.jobMeta}>
                          Base: {cleaner.baseArea || "Not added"} • {cleaner.basePostcode || "No base postcode"}
                        </p>
                        <p style={styles.jobMeta}>{cleaner.areasCovered}</p>
                      </div>
                      <span style={approved ? styles.successBadge : styles.lockedBadge}>
                        {approved ? "Approved for bookings" : "Do not assign jobs"}
                      </span>
                    </div>

                    <p style={styles.jobMeta}>Phone: {cleaner.phone || "Not added"}</p>
                    <p style={styles.jobMeta}>Email: {cleaner.email || "Not added"}</p>
                    <p style={styles.jobMeta}>Services: {cleaner.servicesOffered || "Not added"}</p>
                    <p style={styles.jobMeta}>Prices: {cleaner.usualPrices || "Not added"}</p>
                    <p style={styles.jobMeta}>Availability: {cleaner.availability || "Not added"}</p>
                    <p style={styles.jobMeta}>
                      Insurance: {cleaner.insuranceProvider || "Not added"} • Cover:{" "}
                      {cleaner.insuranceCoverAmount || "Not added"} • Expires:{" "}
                      {cleaner.insuranceExpiryDate || "Not added"}
                    </p>

                    {expired && (
                      <div style={styles.warningBox}>
                        ⚠️ Insurance appears expired. Do not assign jobs until updated proof is seen.
                      </div>
                    )}

                    <div style={styles.badgeRow}>
                      {cleaner.insuranceProofSeen && <span style={styles.successBadge}>Insurance proof seen</span>}
                      {cleaner.reviewsProofSeen && <span style={styles.successBadge}>Reviews/photos</span>}
                      {cleaner.contractorTermsAccepted && <span style={styles.successBadge}>Contractor terms accepted</span>}
                      {cleaner.paymentTermsAccepted && <span style={styles.successBadge}>Payment terms accepted</span>}
                    </div>

                    <div style={styles.cardButtons}>
                      <button style={styles.secondaryButton} onClick={() => openEditCleaner(cleaner)}>
                        Edit
                      </button>
                      <button style={styles.dangerButton} onClick={() => deleteCleaner(cleaner.id)}>
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
          <h2 style={styles.sectionTitle}>Operating Rules For Your Business Model</h2>

          <div style={styles.policyBoxImportant}>
            <h3 style={styles.policyTitle}>Main payment rule</h3>
            <p style={styles.policyText}>
              Customer pays your business first. Do not release customer details to the cleaner until customer payment is recorded and the cleaner has accepted the job fee.
            </p>
          </div>

          <div style={styles.rulesGrid}>
            <RuleCard title="1. Get customer enquiry" text="Collect customer name, phone, postcode, service type, property size, preferred date/time and consent to share details with an independent cleaner." />
            <RuleCard title="2. Quote customer" text="Send the customer a price. The customer must pay before the booking is confirmed." />
            <RuleCard title="3. Use smart matching" text="Check the suggested cleaners and pick the closest suitable cleaner based on area, postcode, service, approval and reliability." />
            <RuleCard title="4. Agree cleaner fee" text="Offer the job to an approved insured cleaner and agree their cleaner fee before releasing customer details." />
            <RuleCard title="5. Pay cleaner after completion" text="After the job is completed, pay the cleaner the agreed payout amount and keep your fee." />
            <RuleCard title="6. Insurance mandatory" text="No valid public liability insurance proof, no contractor terms, or expired insurance means no jobs should be assigned." />
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Customer wording</h3>
            <p style={styles.policyText}>
              “We arrange cleaning bookings with independent insured cleaners. We are not the cleaner employer. By sending your details, you agree that we may share your enquiry with a suitable independent cleaner so they can complete your booking.”
            </p>
          </div>

          <div style={styles.policyBox}>
            <h3 style={styles.policyTitle}>Cleaner wording</h3>
            <p style={styles.policyText}>
              “You remain self-employed and independent. You choose whether to accept each job. We agree the cleaner fee before the booking. After the customer pays and the job is completed, we pay you the agreed amount.”
            </p>
          </div>
        </section>
      )}

      {jobFormOpen && editingJob && (
        <JobModal
          job={editingJob}
          setJob={setEditingJob}
          cleaners={cleaners}
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
  const canRelease = job.customerPaid && job.allocatedCleaner;
  const calculatedFee = calculateYourFee(job);
  const matches = useMemo(() => getCleanerMatches(job, cleaners), [job, cleaners]);

  function update(field, value) {
    setJob((current) => ({ ...current, [field]: value }));
  }

  function markCompletedToday() {
    update("jobCompleted", true);
    update("jobCompletedDate", today());
    update("outcome", "Completed");
  }

  function assignCleaner(cleaner) {
    update("allocatedCleaner", cleaner.name);
    update("cleanerAssignedDate", today());
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Booking Details</h2>
            <p style={styles.modalSubtitle}>Customer pays you first. The system suggests the most suitable cleaner for the booking.</p>
          </div>
          <button style={styles.secondaryButton} onClick={onClose}>Close</button>
        </div>

        <div style={canRelease ? styles.successBox : styles.warningBox}>
          {canRelease ? "✅ Customer payment and cleaner allocation recorded. You may release customer details." : "🔒 Do not release customer details until customer has paid and cleaner is allocated."}
        </div>

        <FormSection title="1. Customer Enquiry">
          <div style={styles.formGrid}>
            <Field label="Date Received"><input style={styles.input} type="date" value={job.dateReceived} onChange={(e) => update("dateReceived", e.target.value)} /></Field>
            <Field label="Lead Source"><Select value={job.leadSource} options={leadSources} onChange={(v) => update("leadSource", v)} /></Field>
            <Field label="Area"><Select value={job.area} options={areas} onChange={(v) => update("area", v)} /></Field>
            <Field label="Customer Name"><input style={styles.input} value={job.customerName} onChange={(e) => update("customerName", e.target.value)} /></Field>
            <Field label="Customer Phone"><input style={styles.input} value={job.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} /></Field>
            <Field label="Customer Email"><input style={styles.input} value={job.customerEmail} onChange={(e) => update("customerEmail", e.target.value)} /></Field>
            <Field label="Customer Postcode / Area"><input style={styles.input} value={job.customerPostcode} onChange={(e) => update("customerPostcode", e.target.value)} /></Field>
            <Field label="Service Type"><Select value={job.serviceType} options={serviceTypes} onChange={(v) => update("serviceType", v)} /></Field>
            <Field label="Property Size"><input style={styles.input} placeholder="Example: 2-bed flat" value={job.propertySize} onChange={(e) => update("propertySize", e.target.value)} /></Field>
            <Field label="Preferred Date"><input style={styles.input} type="date" value={job.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} /></Field>
            <Field label="Preferred Time"><input style={styles.input} placeholder="Example: 10am" value={job.preferredTime} onChange={(e) => update("preferredTime", e.target.value)} /></Field>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={job.consentToShare} onChange={(e) => update("consentToShare", e.target.checked)} /> Consent to share details</label>
          </div>
          <Field label="Customer Notes"><textarea style={styles.textarea} value={job.customerNotes} onChange={(e) => update("customerNotes", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="2. Quote & Customer Payment">
          <div style={styles.formGrid}>
            <Field label="Customer Quoted Price £"><input style={styles.input} type="number" value={job.customerQuotedPrice} onChange={(e) => update("customerQuotedPrice", e.target.value)} /></Field>
            <Field label="Quote Sent Date"><input style={styles.input} type="date" value={job.quoteSentDate} onChange={(e) => update("quoteSentDate", e.target.value)} /></Field>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={job.customerAcceptedQuote} onChange={(e) => update("customerAcceptedQuote", e.target.checked)} /> Customer accepted quote</label>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={job.customerPaid} onChange={(e) => update("customerPaid", e.target.checked)} /> Customer paid?</label>
            <Field label="Customer Payment Amount £"><input style={styles.input} type="number" value={job.customerPaymentAmount} onChange={(e) => update("customerPaymentAmount", e.target.value)} /></Field>
            <Field label="Customer Payment Date"><input style={styles.input} type="date" value={job.customerPaymentDate} onChange={(e) => update("customerPaymentDate", e.target.value)} /></Field>
            <Field label="Customer Payment Method"><Select value={job.customerPaymentMethod} options={paymentMethods} onChange={(v) => update("customerPaymentMethod", v)} /></Field>
            <Field label="Customer Payment Reference"><input style={styles.input} value={job.customerPaymentReference} onChange={(e) => update("customerPaymentReference", e.target.value)} /></Field>
          </div>
        </FormSection>

        <FormSection title="3. Smart Cleaner Suggestions">
          {matches.length === 0 ? (
            <div style={styles.warningBox}>⚠️ No cleaners saved yet. Add cleaners first.</div>
          ) : (
            <div style={styles.matchList}>
              {matches.slice(0, 5).map((match, index) => (
                <div key={match.cleaner.id} style={index === 0 ? styles.bestMatchCard : styles.matchCard}>
                  <div style={styles.matchHeader}>
                    <div>
                      <h4 style={styles.matchTitle}>
                        {index === 0 ? "⭐ Best match: " : ""}
                        {match.cleaner.name || "Unnamed cleaner"}
                      </h4>
                      <p style={styles.jobMeta}>
                        Score: <strong>{match.score}</strong> • Base: {match.cleaner.baseArea || "No area"}{" "}
                        {match.cleaner.basePostcode || ""}
                      </p>
                    </div>
                    <button
                      style={match.approved ? styles.primaryButton : styles.disabledButton}
                      disabled={!match.approved}
                      type="button"
                      onClick={() => assignCleaner(match.cleaner)}
                    >
                      Assign this cleaner
                    </button>
                  </div>

                  {match.reasons.length > 0 && (
                    <div style={styles.reasonList}>
                      {match.reasons.slice(0, 5).map((reason) => (
                        <span key={reason} style={styles.successBadge}>{reason}</span>
                      ))}
                    </div>
                  )}

                  {match.warnings.length > 0 && (
                    <div style={styles.reasonList}>
                      {match.warnings.slice(0, 5).map((warning) => (
                        <span key={warning} style={styles.lockedBadge}>{warning}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title="4. Cleaner Allocation & Your Fee">
          <div style={styles.formGrid}>
            <Field label="Allocated Cleaner">
              <select style={styles.input} value={job.allocatedCleaner} onChange={(e) => update("allocatedCleaner", e.target.value)}>
                <option value="">Unallocated</option>
                {cleaners
                  .filter((cleaner) => cleanerCanReceiveBookings(cleaner))
                  .map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.name}>{cleaner.name}</option>
                  ))}
              </select>
            </Field>
            <Field label="Cleaner Fee Agreed £"><input style={styles.input} type="number" value={job.cleanerFeeAgreed} onChange={(e) => update("cleanerFeeAgreed", e.target.value)} /></Field>
            <Field label="Your Fee £"><input style={styles.input} type="number" value={job.yourBookingFee} onChange={(e) => update("yourBookingFee", e.target.value)} placeholder={`Auto: £${calculatedFee.toFixed(2)}`} /></Field>
            <Field label="Cleaner Assigned Date"><input style={styles.input} type="date" value={job.cleanerAssignedDate} onChange={(e) => update("cleanerAssignedDate", e.target.value)} /></Field>
            <label style={styles.checkboxLabel}><input type="checkbox" disabled={!canRelease} checked={job.detailsReleasedToCleaner} onChange={(e) => update("detailsReleasedToCleaner", e.target.checked)} /> Details released to cleaner?</label>
            <Field label="Date Details Released"><input style={styles.input} type="date" disabled={!canRelease} value={job.dateDetailsReleased} onChange={(e) => update("dateDetailsReleased", e.target.value)} /></Field>
          </div>
          <div style={styles.successBox}>Calculated expected profit/fee: £{calculatedFee.toFixed(2)}</div>
          {cleaners.filter((cleaner) => cleanerCanReceiveBookings(cleaner)).length === 0 && (
            <div style={styles.warningBox}>⚠️ No approved cleaners available. Add an insured cleaner with accepted terms first.</div>
          )}
        </FormSection>

        <FormSection title="5. Completion & Cleaner Payout">
          <div style={styles.formGrid}>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={job.jobCompleted} onChange={(e) => update("jobCompleted", e.target.checked)} /> Job completed?</label>
            <Field label="Job Completed Date"><input style={styles.input} type="date" value={job.jobCompletedDate} onChange={(e) => update("jobCompletedDate", e.target.value)} /></Field>
            <button style={styles.secondaryButton} type="button" onClick={markCompletedToday}>Mark Completed Today</button>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={job.cleanerPaidOut} onChange={(e) => update("cleanerPaidOut", e.target.checked)} /> Cleaner paid out?</label>
            <Field label="Cleaner Payout Amount £"><input style={styles.input} type="number" value={job.cleanerPayoutAmount} onChange={(e) => update("cleanerPayoutAmount", e.target.value)} /></Field>
            <Field label="Cleaner Payout Date"><input style={styles.input} type="date" value={job.cleanerPayoutDate} onChange={(e) => update("cleanerPayoutDate", e.target.value)} /></Field>
            <Field label="Cleaner Payout Reference"><input style={styles.input} value={job.cleanerPayoutReference} onChange={(e) => update("cleanerPayoutReference", e.target.value)} /></Field>
            <Field label="Outcome"><Select value={job.outcome} options={outcomes} onChange={(v) => update("outcome", v)} /></Field>
          </div>
          <Field label="Internal Notes"><textarea style={styles.textarea} value={job.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} /></Field>
        </FormSection>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button style={styles.primaryButton} onClick={() => onSave(job)}>Save Booking</button>
        </div>
      </div>
    </div>
  );
}

function CleanerModal({ cleaner, setCleaner, onSave, onClose }) {
  const approved = cleanerCanReceiveBookings(cleaner);
  const expired = cleaner.insuranceExpiryDate && isInsuranceExpired(cleaner.insuranceExpiryDate);

  function update(field, value) {
    setCleaner((current) => ({ ...current, [field]: value }));
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Cleaner Partner</h2>
            <p style={styles.modalSubtitle}>Store cleaner location, coverage, services, insurance proof, contractor terms and payout agreement.</p>
          </div>
          <button style={styles.secondaryButton} onClick={onClose}>Close</button>
        </div>

        <div style={approved ? styles.successBox : styles.warningBox}>
          {approved ? "✅ This cleaner is approved to receive bookings." : "⚠️ Do not assign bookings until insurance and terms are complete."}
        </div>
        {expired && <div style={styles.warningBox}>⚠️ Insurance expiry date has passed. Ask for updated proof before assigning jobs.</div>}

        <FormSection title="Cleaner Details & Location">
          <div style={styles.formGrid}>
            <Field label="Cleaner / Full Name"><input style={styles.input} value={cleaner.name} onChange={(e) => update("name", e.target.value)} /></Field>
            <Field label="Phone"><input style={styles.input} value={cleaner.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
            <Field label="Email"><input style={styles.input} value={cleaner.email} onChange={(e) => update("email", e.target.value)} /></Field>
            <Field label="Base Area"><Select value={cleaner.baseArea} options={areas} onChange={(v) => update("baseArea", v)} /></Field>
            <Field label="Base Postcode"><input style={styles.input} placeholder="Example: WS1, B21, B44" value={cleaner.basePostcode} onChange={(e) => update("basePostcode", e.target.value)} /></Field>
            <Field label="Reliability Score"><Select value={cleaner.reliabilityScore} options={["New", "Good", "Excellent", "Warning", "Do Not Use"]} onChange={(v) => update("reliabilityScore", v)} /></Field>
          </div>
          <Field label="Areas Covered">
            <textarea
              style={styles.textarea}
              value={cleaner.areasCovered}
              onChange={(e) => update("areasCovered", e.target.value)}
              placeholder="Example: Walsall, Great Barr, Sutton Coldfield, Birmingham, WS1, WS2, B21"
            />
          </Field>
          <Field label="Services Offered">
            <textarea
              style={styles.textarea}
              value={cleaner.servicesOffered}
              onChange={(e) => update("servicesOffered", e.target.value)}
              placeholder="Example: regular domestic cleaning, deep cleaning, end-of-tenancy, Airbnb changeovers"
            />
          </Field>
          <Field label="Usual Prices / Hourly Rate"><textarea style={styles.textarea} value={cleaner.usualPrices} onChange={(e) => update("usualPrices", e.target.value)} /></Field>
          <Field label="Availability"><textarea style={styles.textarea} value={cleaner.availability} onChange={(e) => update("availability", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="Mandatory Insurance Proof">
          <div style={styles.formGrid}>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={cleaner.insuranceProofSeen} onChange={(e) => update("insuranceProofSeen", e.target.checked)} /> Public liability insurance proof seen</label>
            <Field label="Insurance Provider"><input style={styles.input} placeholder="Example: AXA, Simply Business, Hiscox" value={cleaner.insuranceProvider} onChange={(e) => update("insuranceProvider", e.target.value)} /></Field>
            <Field label="Cover Amount"><input style={styles.input} placeholder="Example: £1m or £2m" value={cleaner.insuranceCoverAmount} onChange={(e) => update("insuranceCoverAmount", e.target.value)} /></Field>
            <Field label="Insurance Expiry Date"><input style={styles.input} type="date" value={cleaner.insuranceExpiryDate} onChange={(e) => update("insuranceExpiryDate", e.target.value)} /></Field>
          </div>
          <div style={styles.warningBox}>Rule: no insurance proof, missing insurance details, expired insurance, or no accepted terms = do not assign jobs.</div>
        </FormSection>

        <FormSection title="Checks & Terms">
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={cleaner.reviewsProofSeen} onChange={(e) => update("reviewsProofSeen", e.target.checked)} /> Reviews/photos seen</label>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={cleaner.contractorTermsAccepted} onChange={(e) => update("contractorTermsAccepted", e.target.checked)} /> Self-employed contractor terms accepted</label>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={cleaner.paymentTermsAccepted} onChange={(e) => update("paymentTermsAccepted", e.target.checked)} /> Payout terms accepted</label>
          </div>
          <Field label="Notes"><textarea style={styles.textarea} value={cleaner.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Example: Public liability insurance seen. Cleaner understands customer pays us first and cleaner is paid agreed fee after completion." /></Field>
        </FormSection>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button style={styles.primaryButton} onClick={() => onSave(cleaner)}>Save Cleaner</button>
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
  if (job.status === "Refunded" || job.status === "Cancelled") return <span style={styles.lockedBadge}>{job.status}</span>;
  if (!job.customerPaid) return <span style={styles.lockedBadge}>Awaiting Customer Payment</span>;
  if (job.customerPaid && !job.detailsReleasedToCleaner) return <span style={styles.paidBadge}>Paid - Assign Cleaner</span>;
  if (job.jobCompleted && !job.cleanerPaidOut) return <span style={styles.paidBadge}>Completed - Pay Cleaner</span>;
  if (job.cleanerPaidOut) return <span style={styles.successBadge}>Cleaner Paid</span>;
  return <span style={styles.successBadge}>Booked</span>;
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

function Select({ value, options, onChange }) {
  return (
    <select style={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", padding: "32px", color: "#0f172a", fontFamily: "Arial, Helvetica, sans-serif" },
  header: { maxWidth: "1200px", margin: "0 auto 24px auto", display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" },
  kicker: { margin: "0 0 6px 0", fontSize: "13px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em" },
  title: { margin: 0, fontSize: "34px", lineHeight: "1.1", fontWeight: "800" },
  subtitle: { margin: "10px 0 0 0", color: "#475569", fontSize: "16px", maxWidth: "760px" },
  headerButtons: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryButton: { border: "0", background: "#0f172a", color: "white", padding: "11px 16px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  secondaryButton: { border: "1px solid #cbd5e1", background: "white", color: "#0f172a", padding: "10px 14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  dangerButton: { border: "0", background: "#dc2626", color: "white", padding: "10px 14px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" },
  disabledButton: { border: "0", background: "#cbd5e1", color: "#64748b", padding: "10px 14px", borderRadius: "12px", fontWeight: "700", cursor: "not-allowed" },
  statsGrid: { maxWidth: "1200px", margin: "0 auto 24px auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" },
  statCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)" },
  statLabel: { margin: "0 0 8px 0", color: "#64748b", fontSize: "14px" },
  statValue: { margin: 0, fontSize: "23px", fontWeight: "800" },
  tabs: { maxWidth: "1200px", margin: "0 auto 20px auto", display: "flex", gap: "8px", flexWrap: "wrap" },
  tabButton: { border: "1px solid #cbd5e1", background: "white", padding: "10px 14px", borderRadius: "999px", fontWeight: "700", cursor: "pointer" },
  activeTabButton: { border: "1px solid #0f172a", background: "#0f172a", color: "white", padding: "10px 14px", borderRadius: "999px", fontWeight: "700", cursor: "pointer" },
  searchCard: { maxWidth: "1200px", margin: "0 auto 18px auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "16px" },
  input: { width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "white", color: "#0f172a", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: "90px", padding: "11px 12px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "white", color: "#0f172a", resize: "vertical", boxSizing: "border-box" },
  emptyCard: { maxWidth: "1200px", margin: "0 auto", background: "white", border: "1px dashed #cbd5e1", borderRadius: "18px", padding: "40px", textAlign: "center" },
  emptyTitle: { margin: "0 0 8px 0", fontSize: "22px" },
  emptyText: { margin: 0, color: "#64748b" },
  cardList: { maxWidth: "1200px", margin: "0 auto", display: "grid", gap: "14px" },
  jobCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)" },
  jobTop: { display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" },
  badgeRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "10px" },
  jobTitle: { margin: 0, fontSize: "20px", fontWeight: "800" },
  jobMeta: { margin: "8px 0 0 0", color: "#475569", fontSize: "14px" },
  cardButtons: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" },
  lockedBadge: { background: "#fee2e2", color: "#991b1b", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "800" },
  paidBadge: { background: "#dbeafe", color: "#1e40af", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "800" },
  successBadge: { background: "#dcfce7", color: "#166534", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "800" },
  outlineBadge: { border: "1px solid #cbd5e1", color: "#334155", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "800", background: "white" },
  warningBox: { marginTop: "12px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "12px", borderRadius: "14px", fontSize: "14px", fontWeight: "700" },
  successBox: { marginTop: "12px", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "14px", fontSize: "14px", fontWeight: "700" },
  matchMiniBox: { marginTop: "12px", background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe", padding: "12px", borderRadius: "14px", fontSize: "14px", fontWeight: "700" },
  cleanerGrid: { maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  cleanerCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)" },
  cleanerTop: { display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" },
  rulesCard: { maxWidth: "1200px", margin: "0 auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "22px", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)" },
  sectionTitle: { margin: "0 0 16px 0", fontSize: "24px", fontWeight: "800" },
  rulesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" },
  ruleCard: { border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", background: "#f8fafc" },
  ruleTitle: { margin: "0 0 8px 0", fontSize: "16px", fontWeight: "800" },
  ruleText: { margin: 0, color: "#475569", fontSize: "14px", lineHeight: "1.5" },
  policyBoxImportant: { marginBottom: "16px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "16px", padding: "16px" },
  policyBox: { marginTop: "16px", background: "#f1f5f9", borderRadius: "16px", padding: "16px" },
  policyTitle: { margin: "0 0 8px 0", fontSize: "17px", fontWeight: "800" },
  policyText: { margin: 0, color: "#475569", lineHeight: "1.5" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", zIndex: 50, padding: "24px", overflow: "auto" },
  modal: { maxWidth: "980px", margin: "0 auto", background: "white", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.35)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", marginBottom: "14px" },
  modalTitle: { margin: 0, fontSize: "26px", fontWeight: "800" },
  modalSubtitle: { margin: "6px 0 0 0", color: "#64748b" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" },
  formSection: { border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", marginTop: "16px", background: "#ffffff" },
  formSectionTitle: { margin: "0 0 14px 0", fontSize: "18px", fontWeight: "800" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  field: { display: "grid", gap: "6px" },
  fieldLabel: { fontSize: "13px", fontWeight: "800", color: "#334155" },
  checkboxLabel: { display: "flex", gap: "8px", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "11px 12px", fontSize: "14px", fontWeight: "700", background: "white" },
  checkboxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "12px" },
  matchList: { display: "grid", gap: "12px" },
  matchCard: { border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px", background: "#f8fafc" },
  bestMatchCard: { border: "2px solid #2563eb", borderRadius: "16px", padding: "14px", background: "#eff6ff" },
  matchHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" },
  matchTitle: { margin: 0, fontSize: "16px", fontWeight: "900" },
  reasonList: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" },
};
