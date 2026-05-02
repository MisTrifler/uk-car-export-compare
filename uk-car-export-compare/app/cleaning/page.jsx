"use client";

import React, { useMemo, useState } from "react";

const WHATSAPP_NUMBER = "447943617386"; // UK format, no + sign and no first 0.
const BUSINESS_EMAIL = "viddchoudhary@hotmail.com";

const serviceTypes = [
  { id: "regular", label: "Regular house clean", baseHours: 3, rate: 19 },
  { id: "one-off", label: "One-off house clean", baseHours: 3, rate: 22 },
  { id: "deep", label: "Deep clean", baseHours: 4, rate: 25 },
  { id: "end-tenancy", label: "End-of-tenancy clean", baseHours: 5, rate: 28 },
  { id: "airbnb", label: "Airbnb / changeover clean", baseHours: 3, rate: 24 },
  { id: "after-builders", label: "After-builders clean", baseHours: 5, rate: 30 },
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

const frequencies = [
  "One-off",
  "Weekly",
  "Fortnightly",
  "Monthly",
  "Airbnb/changeover as needed",
];

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function getSelectedService(serviceId) {
  return serviceTypes.find((service) => service.id === serviceId) || serviceTypes[0];
}

function calculateEstimate(form) {
  const service = getSelectedService(form.serviceType);
  const bedrooms = money(form.bedrooms);
  const bathrooms = money(form.bathrooms);

  let hours = service.baseHours;
  hours += Math.max(0, bedrooms - 1) * 0.5;
  hours += Math.max(0, bathrooms - 1) * 0.5;

  if (form.propertyCondition === "Needs extra attention") hours += 1;
  if (form.propertyCondition === "Very dirty / neglected") hours += 2;
  if (form.hasPets === "Yes") hours += 0.5;

  hours = Math.max(service.baseHours, Math.ceil(hours * 2) / 2);

  const estimatedPrice = hours * service.rate;
  const cleanerFeeEstimate = Math.round(estimatedPrice * 0.8);
  const bookingFeeEstimate = estimatedPrice - cleanerFeeEstimate;

  return {
    hours,
    rate: service.rate,
    estimatedPrice,
    cleanerFeeEstimate,
    bookingFeeEstimate,
  };
}

function buildMessage(form, estimate) {
  const service = getSelectedService(form.serviceType);

  return `New cleaning enquiry\n\nName: ${form.name || "Not provided"}\nPhone: ${form.phone || "Not provided"}\nEmail: ${form.email || "Not provided"}\nArea: ${form.area || "Not provided"}\nPostcode: ${form.postcode || "Not provided"}\nService: ${service.label}\nFrequency: ${form.frequency}\nBedrooms: ${form.bedrooms}\nBathrooms: ${form.bathrooms}\nCondition: ${form.propertyCondition}\nPets: ${form.hasPets}\nPreferred date: ${form.preferredDate || "Not provided"}\nPreferred time: ${form.preferredTime || "Not provided"}\nEstimated hours: ${estimate.hours}\nEstimated price: £${estimate.estimatedPrice.toFixed(2)}\n\nNotes:\n${form.notes || "No notes"}`;
}

export default function CleanerBookingLandingPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    area: "Birmingham",
    postcode: "",
    serviceType: "regular",
    frequency: "One-off",
    bedrooms: "2",
    bathrooms: "1",
    propertyCondition: "Normal",
    hasPets: "No",
    preferredDate: "",
    preferredTime: "",
    notes: "",
    consent: false,
  });

  const estimate = useMemo(() => calculateEstimate(form), [form]);
  const message = useMemo(() => buildMessage(form, estimate), [form, estimate]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openWhatsApp() {
    if (!form.name || !form.phone || !form.postcode || !form.consent) {
      alert("Please add your name, phone, postcode and consent before sending.");
      return;
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function openEmail() {
    if (!form.name || !form.phone || !form.postcode || !form.consent) {
      alert("Please add your name, phone, postcode and consent before sending.");
      return;
    }

    const subject = encodeURIComponent("Cleaning booking enquiry");
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroText}>
          <p style={styles.kicker}>Birmingham & Walsall Cleaner Finder</p>
          <h1 style={styles.title}>Book a reliable local cleaner without the hassle.</h1>
          <p style={styles.subtitle}>
            Tell us what you need, get a simple estimate, and we will help arrange a cleaning
            booking with an independent cleaner who has provided proof of public liability insurance.
          </p>

          <div style={styles.heroButtons}>
            <a href="#quote" style={styles.primaryLink}>Get a quote</a>
            <a href="#how-it-works" style={styles.secondaryLink}>How it works</a>
          </div>

          <div style={styles.trustRow}>
            <span>✓ Insured cleaner partners</span>
            <span>✓ Local Birmingham & Walsall</span>
            <span>✓ Simple upfront pricing</span>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Estimated booking total</p>
          <p style={styles.summaryPrice}>£{estimate.estimatedPrice.toFixed(2)}</p>
          <p style={styles.summaryText}>{estimate.hours} estimated hours at £{estimate.rate}/hour</p>
          <div style={styles.summaryLine}>
            <span>Cleaner fee estimate</span>
            <strong>£{estimate.cleanerFeeEstimate.toFixed(2)}</strong>
          </div>
          <div style={styles.summaryLine}>
            <span>Booking/admin fee estimate</span>
            <strong>£{estimate.bookingFeeEstimate.toFixed(2)}</strong>
          </div>
          <p style={styles.smallNote}>Final price is confirmed before booking.</p>
        </div>
      </section>

      <section id="quote" style={styles.quoteSection}>
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Get your cleaning quote</h2>
          <p style={styles.sectionText}>
            This form keeps things simple. No laundry, ironing, washing machine tasks or complicated
            add-ons. Just the key details needed to price and arrange the clean.
          </p>

          <div style={styles.formGrid}>
            <Field label="Full name">
              <input style={styles.input} value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Field>

            <Field label="Phone number">
              <input style={styles.input} value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            </Field>

            <Field label="Email address">
              <input style={styles.input} value={form.email} onChange={(event) => update("email", event.target.value)} />
            </Field>

            <Field label="Area">
              <select style={styles.input} value={form.area} onChange={(event) => update("area", event.target.value)}>
                {areas.map((area) => <option key={area}>{area}</option>)}
              </select>
            </Field>

            <Field label="Postcode">
              <input style={styles.input} value={form.postcode} onChange={(event) => update("postcode", event.target.value)} />
            </Field>

            <Field label="Service type">
              <select style={styles.input} value={form.serviceType} onChange={(event) => update("serviceType", event.target.value)}>
                {serviceTypes.map((service) => (
                  <option key={service.id} value={service.id}>{service.label}</option>
                ))}
              </select>
            </Field>

            <Field label="How often?">
              <select style={styles.input} value={form.frequency} onChange={(event) => update("frequency", event.target.value)}>
                {frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
            </Field>

            <Field label="Bedrooms">
              <select style={styles.input} value={form.bedrooms} onChange={(event) => update("bedrooms", event.target.value)}>
                {["0", "1", "2", "3", "4", "5", "6"].map((number) => <option key={number}>{number}</option>)}
              </select>
            </Field>

            <Field label="Bathrooms">
              <select style={styles.input} value={form.bathrooms} onChange={(event) => update("bathrooms", event.target.value)}>
                {["1", "2", "3", "4", "5"].map((number) => <option key={number}>{number}</option>)}
              </select>
            </Field>

            <Field label="Property condition">
              <select style={styles.input} value={form.propertyCondition} onChange={(event) => update("propertyCondition", event.target.value)}>
                <option>Normal</option>
                <option>Needs extra attention</option>
                <option>Very dirty / neglected</option>
              </select>
            </Field>

            <Field label="Pets at property?">
              <select style={styles.input} value={form.hasPets} onChange={(event) => update("hasPets", event.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </Field>

            <Field label="Preferred date">
              <input type="date" style={styles.input} value={form.preferredDate} onChange={(event) => update("preferredDate", event.target.value)} />
            </Field>

            <Field label="Preferred time">
              <input style={styles.input} placeholder="Example: 10am" value={form.preferredTime} onChange={(event) => update("preferredTime", event.target.value)} />
            </Field>
          </div>

          <Field label="Anything the cleaner should know?">
            <textarea style={styles.textarea} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Example: end-of-tenancy clean, empty property, focus on kitchen and bathrooms." />
          </Field>

          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} />
            I agree that my enquiry details may be shared with a suitable independent cleaner so they can complete the booking.
          </label>

          <div style={styles.actionRow}>
            <button style={styles.primaryButton} onClick={openWhatsApp}>Send enquiry by WhatsApp</button>
            <button style={styles.secondaryButton} onClick={openEmail}>Send enquiry by email</button>
          </div>
        </div>

        <aside style={styles.priceCard}>
          <h3 style={styles.priceTitle}>Your estimate</h3>
          <p style={styles.priceBig}>£{estimate.estimatedPrice.toFixed(2)}</p>
          <p style={styles.summaryText}>Estimated time: {estimate.hours} hours</p>
          <p style={styles.summaryText}>Rate: £{estimate.rate}/hour</p>
          <div style={styles.noticeBox}>
            Payment is made before the booking is confirmed. Final details are agreed with you before a cleaner is assigned.
          </div>
        </aside>
      </section>

      <section id="how-it-works" style={styles.contentSection}>
        <h2 style={styles.sectionTitle}>How it works</h2>
        <div style={styles.stepsGrid}>
          <Step number="1" title="Tell us what you need" text="Send your postcode, property size, service type and preferred date." />
          <Step number="2" title="We confirm the price" text="We check availability and confirm the booking price before you pay." />
          <Step number="3" title="We arrange the cleaner" text="Your booking is assigned to a suitable independent cleaner with insurance proof on record." />
          <Step number="4" title="Your clean is completed" text="The cleaner attends at the agreed time and completes the cleaning work." />
        </div>
      </section>

      <section style={styles.contentSectionAlt}>
        <div style={styles.twoCol}>
          <div>
            <h2 style={styles.sectionTitle}>What we cover</h2>
            <ul style={styles.cleanList}>
              <li>Regular domestic cleaning</li>
              <li>One-off house cleaning</li>
              <li>Deep cleaning</li>
              <li>End-of-tenancy cleaning</li>
              <li>Airbnb and changeover cleaning</li>
              <li>After-builders cleaning</li>
            </ul>
          </div>

          <div>
            <h2 style={styles.sectionTitle}>What we do not offer</h2>
            <ul style={styles.cleanList}>
              <li>Laundry or washing clothes</li>
              <li>Washing machine services</li>
              <li>Ironing</li>
              <li>Dry cleaning</li>
              <li>Carpet machine hire</li>
              <li>Industrial cleaning</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={styles.contentSection}>
        <h2 style={styles.sectionTitle}>Frequently asked questions</h2>
        <div style={styles.faqGrid}>
          <Faq question="Are the cleaners employed by you?" answer="No. We arrange bookings with independent self-employed cleaners. They are responsible for their own work, insurance, tax, equipment and service quality." />
          <Faq question="Do cleaners have insurance?" answer="We only assign bookings to cleaner partners who have provided proof of public liability insurance." />
          <Faq question="Do I pay before the booking?" answer="Yes. Payment is made before the booking is confirmed, and the agreed cleaner is then given the job details." />
          <Faq question="Do I need to provide products and equipment?" answer="For regular domestic cleaning, customers normally provide basic cleaning products and equipment. For deeper cleans, this can be discussed before booking." />
        </div>
      </section>
    </main>
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

function Step({ number, title, text }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNumber}>{number}</div>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardText}>{text}</p>
    </div>
  );
}

function Faq({ question, answer }) {
  return (
    <div style={styles.faqCard}>
      <h3 style={styles.cardTitle}>{question}</h3>
      <p style={styles.cardText}>{answer}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  hero: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "54px 22px 34px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.6fr)",
    gap: "24px",
    alignItems: "center",
  },
  heroText: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "28px",
    padding: "34px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  kicker: {
    margin: "0 0 10px",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: 0,
    fontSize: "46px",
    lineHeight: "1.05",
    fontWeight: "900",
    letterSpacing: "-0.04em",
  },
  subtitle: {
    margin: "18px 0 0",
    fontSize: "18px",
    lineHeight: "1.6",
    color: "#475569",
    maxWidth: "720px",
  },
  heroButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "24px",
  },
  primaryLink: {
    display: "inline-block",
    background: "#0f172a",
    color: "white",
    textDecoration: "none",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "800",
  },
  secondaryLink: {
    display: "inline-block",
    background: "white",
    color: "#0f172a",
    textDecoration: "none",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "800",
    border: "1px solid #cbd5e1",
  },
  trustRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "22px",
    color: "#166534",
    fontWeight: "800",
    fontSize: "14px",
  },
  summaryCard: {
    background: "#0f172a",
    color: "white",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
  },
  summaryLabel: {
    margin: 0,
    color: "#cbd5e1",
    fontWeight: "800",
  },
  summaryPrice: {
    margin: "8px 0",
    fontSize: "44px",
    fontWeight: "900",
  },
  summaryText: {
    color: "#64748b",
    margin: "6px 0",
    lineHeight: "1.5",
  },
  summaryLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    borderTop: "1px solid rgba(255,255,255,0.16)",
    paddingTop: "12px",
    marginTop: "12px",
  },
  smallNote: {
    margin: "16px 0 0",
    color: "#cbd5e1",
    fontSize: "13px",
  },
  quoteSection: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "22px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 320px",
    gap: "22px",
    alignItems: "start",
  },
  formCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "24px",
    padding: "26px",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.06)",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "28px",
    fontWeight: "900",
    letterSpacing: "-0.03em",
  },
  sectionText: {
    margin: "0 0 20px",
    color: "#475569",
    lineHeight: "1.6",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
  },
  field: {
    display: "grid",
    gap: "7px",
    marginBottom: "14px",
  },
  fieldLabel: {
    fontSize: "13px",
    fontWeight: "900",
    color: "#334155",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "13px",
    padding: "12px 13px",
    fontSize: "15px",
    color: "#0f172a",
    background: "white",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: "13px",
    padding: "12px 13px",
    fontSize: "15px",
    color: "#0f172a",
    background: "white",
    resize: "vertical",
  },
  checkboxLabel: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    padding: "13px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    color: "#334155",
    fontWeight: "700",
    fontSize: "14px",
  },
  actionRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  primaryButton: {
    border: 0,
    background: "#0f172a",
    color: "white",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#0f172a",
    padding: "13px 18px",
    borderRadius: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },
  priceCard: {
    position: "sticky",
    top: "18px",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.06)",
  },
  priceTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "900",
  },
  priceBig: {
    margin: "12px 0",
    fontSize: "42px",
    fontWeight: "900",
  },
  noticeBox: {
    marginTop: "16px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "16px",
    padding: "14px",
    lineHeight: "1.5",
    fontWeight: "700",
    fontSize: "14px",
  },
  contentSection: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "34px 22px",
  },
  contentSectionAlt: {
    background: "white",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    margin: "20px 0",
    padding: "34px 22px",
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  stepCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
  },
  stepNumber: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    background: "#0f172a",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    marginBottom: "12px",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "18px",
    fontWeight: "900",
  },
  cardText: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.55",
  },
  twoCol: {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "22px",
  },
  cleanList: {
    margin: "14px 0 0",
    paddingLeft: "22px",
    color: "#334155",
    lineHeight: "1.9",
    fontWeight: "700",
  },
  faqGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  faqCard: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "20px",
  },
};
