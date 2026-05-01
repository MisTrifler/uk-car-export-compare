import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Car,
  Ship,
  ShieldCheck,
  Globe2,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Star,
  MapPin,
  Phone,
  Mail,
  PoundSterling,
  Search,
  FileCheck,
  Users,
} from "lucide-react";

const countries = {
  Botswana: {
    port: "Walvis Bay / Durban route",
    shipping: 1350,
    dutyRate: 0.27,
    notes: "Popular for Toyota Hilux, Ranger, Prado, Fortuner and Land Cruiser imports.",
  },
  Nigeria: {
    port: "Lagos / Apapa route",
    shipping: 1450,
    dutyRate: 0.35,
    notes: "High demand for Toyota, Lexus, Mercedes, Honda and commercial vehicles.",
  },
  Zimbabwe: {
    port: "Durban / Beira route",
    shipping: 1550,
    dutyRate: 0.32,
    notes: "Strong demand for Hilux, SUVs, vans and reliable Japanese vehicles.",
  },
  Ghana: {
    port: "Tema route",
    shipping: 1400,
    dutyRate: 0.30,
    notes: "Good market for Toyota, Hyundai, Kia, Mercedes and family SUVs.",
  },
  Kenya: {
    port: "Mombasa route",
    shipping: 1500,
    dutyRate: 0.34,
    notes: "Age limits and compliance checks matter. Great for Japanese and UK stock.",
  },
  Zambia: {
    port: "Durban / Walvis Bay route",
    shipping: 1600,
    dutyRate: 0.31,
    notes: "Demand for pickups, family SUVs, Toyota, Ford and Isuzu models.",
  },
};

const popularCars = [
  "Toyota Hilux",
  "Toyota Land Cruiser",
  "Toyota Prado",
  "Ford Ranger",
  "Mercedes C-Class",
  "Lexus RX",
  "BMW X5",
  "Toyota Alphard",
  "Nissan Navara",
  "Range Rover Sport",
];

const partners = [
  {
    title: "UK Vehicle Sourcing",
    body: "Find undervalued cars from trusted UK sellers, auctions and dealers.",
    icon: Search,
  },
  {
    title: "Inspection & HPI Checks",
    body: "Help customers avoid stolen, written-off or finance-owed vehicles.",
    icon: FileCheck,
  },
  {
    title: "Shipping Quotes",
    body: "Connect buyers with container, RoRo and forwarding agents.",
    icon: Ship,
  },
  {
    title: "Clearing Agents",
    body: "Send leads to destination-country customs and clearing partners.",
    icon: Users,
  },
];

function formatGBP(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default function UKCarExportCompare() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  const [country, setCountry] = useState("Botswana");
  const [vehicleValue, setVehicleValue] = useState(12000);
  const [inspection, setInspection] = useState(true);
  const [insurance, setInsurance] = useState(true);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    destination: "Botswana",
    car: "Toyota Hilux",
    budget: "15000",
    message: "",
  });

  const selected = countries[country];

  const estimate = useMemo(() => {
    const value = Number(vehicleValue) || 0;
    const shipping = selected.shipping;
    const duty = value * selected.dutyRate;
    const inspectionCost = inspection ? 150 : 0;
    const insuranceCost = insurance ? Math.max(120, value * 0.012) : 0;
    const admin = 250;
    const total = value + shipping + duty + inspectionCost + insuranceCost + admin;
    return { value, shipping, duty, inspectionCost, insuranceCost, admin, total };
  }, [vehicleValue, selected, inspection, insurance]);

  const handleForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const whatsappText = encodeURIComponent(
    `Hi, I want a UK car export quote. Destination: ${form.destination}. Car: ${form.car}. Budget: £${form.budget}. Name: ${form.name}. Phone: ${form.phone}.`
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">UK Car Export Compare</p>
              <p className="text-xs text-slate-400">UK to Africa car export quotes</p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#calculator" className="hover:text-white">Calculator</a>
            <a href="#countries" className="hover:text-white">Countries</a>
            <a href="#quotes" className="hover:text-white">Get quotes</a>
            <a href="#partners" className="hover:text-white">Partners</a>
          </nav>

          <a
            href="#quotes"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            Request Quote
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.22),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.18),transparent_35%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center"
            >
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Compare trusted UK car export services
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Ship a UK car to Africa with clearer costs and better quotes.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Estimate shipping, duty and total landed cost, then request quotes from exporters, vehicle inspectors, shipping agents and clearing partners.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#calculator"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-7 py-4 font-black text-slate-950 shadow-xl shadow-emerald-400/20 transition hover:bg-emerald-300"
                >
                  Calculate export cost <Calculator className="h-5 w-5" />
                </a>
                <a
                  href="#quotes"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-bold text-white transition hover:bg-white/10"
                >
                  Get supplier quotes <ArrowRight className="h-5 w-5" />
                </a>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                {[
                  ["6+", "destination markets"],
                  ["£20-£200+", "lead value target"],
                  ["24h", "quote follow-up goal"],
                ].map(([number, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-2xl font-black text-white">{number}</p>
                    <p className="mt-1 text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="rounded-[1.5rem] bg-slate-900 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Live estimate preview</p>
                    <h2 className="mt-2 text-3xl font-black">UK to {country}</h2>
                  </div>
                  <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                    <Ship className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-slate-400">Vehicle value</span>
                    <strong>{formatGBP(estimate.value)}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 py-4">
                    <span className="text-slate-400">Estimated shipping</span>
                    <strong>{formatGBP(estimate.shipping)}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 py-4">
                    <span className="text-slate-400">Duty/tax placeholder</span>
                    <strong>{formatGBP(estimate.duty)}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 py-4">
                    <span className="text-slate-400">Inspection + admin</span>
                    <strong>{formatGBP(estimate.inspectionCost + estimate.admin)}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-5 text-xl">
                    <span className="font-black">Estimated landed cost</span>
                    <strong className="text-emerald-300">{formatGBP(estimate.total)}</strong>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  Estimates are placeholders for lead capture. Final duty, tax, compliance and shipping must be confirmed by licensed partners.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03] py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              [Globe2, "Africa-focused", "Built for UK to Africa car buyers."],
              [ShieldCheck, "Trust-led", "Inspection and fraud prevention angle."],
              [PoundSterling, "High-value leads", "Designed around serious buyers."],
              [MessageCircle, "WhatsApp ready", "Easy enquiries from mobile users."],
            ].map(([Icon, title, body]) => (
              <div key={title} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5">
                <div className="h-fit rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="calculator" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-bold text-emerald-300">Export cost calculator</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Turn confused visitors into quote requests.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                This calculator gives people a useful first estimate, then pushes them to request a real quote. That is how the website becomes a lead machine.
              </p>
              <div className="mt-8 space-y-4">
                {["Captures buyer intent before they leave", "Lets you rank on Google for cost searches", "Creates leads for exporters, shippers and agents"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-300">Destination country</span>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      handleForm("destination", e.target.value);
                    }}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-300"
                  >
                    {Object.keys(countries).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-300">Vehicle value</span>
                  <input
                    type="number"
                    value={vehicleValue}
                    onChange={(e) => setVehicleValue(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-300"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setInspection(!inspection)}
                  className={`rounded-2xl border p-4 text-left transition ${inspection ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/5"}`}
                >
                  <p className="font-black">Inspection check</p>
                  <p className="mt-1 text-sm text-slate-400">Recommended before export.</p>
                </button>
                <button
                  onClick={() => setInsurance(!insurance)}
                  className={`rounded-2xl border p-4 text-left transition ${insurance ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/5"}`}
                >
                  <p className="font-black">Transit insurance</p>
                  <p className="mt-1 text-sm text-slate-400">Protect shipment value.</p>
                </button>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-950 p-5">
                {[
                  ["Vehicle price", estimate.value],
                  ["Shipping estimate", estimate.shipping],
                  ["Duty/tax estimate", estimate.duty],
                  ["Inspection", estimate.inspectionCost],
                  ["Insurance", estimate.insuranceCost],
                  ["Admin/documentation", estimate.admin],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/10 py-3 last:border-0">
                    <span className="text-slate-400">{label}</span>
                    <strong>{formatGBP(value)}</strong>
                  </div>
                ))}
                <div className="mt-4 rounded-2xl bg-emerald-400 p-5 text-slate-950">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg font-black">Estimated total</span>
                    <span className="text-3xl font-black">{formatGBP(estimate.total)}</span>
                  </div>
                </div>
              </div>

              <a
                href="#quotes"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Request a real quote <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </section>

        <section id="countries" className="bg-white/[0.03] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="font-bold text-emerald-300">Destination pages</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Target profitable Google searches country by country.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Each country can later become its own SEO landing page with shipping costs, documents, duty guidance and partner quote forms.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(countries).map(([name, info]) => (
                <div key={name} className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-emerald-300/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">From {formatGBP(info.shipping)}</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-black">UK to {name}</h3>
                  <p className="mt-2 text-sm text-slate-400">Route: {info.port}</p>
                  <p className="mt-4 leading-7 text-slate-300">{info.notes}</p>
                  <button
                    onClick={() => {
                      setCountry(name);
                      handleForm("destination", name);
                      document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-300"
                  >
                    Calculate this route <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-bold text-emerald-300">Popular export vehicles</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Build content around cars people already want.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                These vehicle pages can attract high-intent searches like “Toyota Hilux UK export to Botswana” and “best UK cars to export to Nigeria”.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {popularCars.map((car, index) => (
                <div key={car} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 font-black text-emerald-300">{index + 1}</div>
                  <span className="font-bold">{car}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="quotes" className="bg-emerald-400 py-20 text-slate-950">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="flex flex-col justify-center">
              <p className="font-black">Get quotes</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Capture the lead before they choose another exporter.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-800">
                This form is designed for WhatsApp-heavy buyers. In production, connect it to Formspree, Airtable, Google Sheets, Supabase, or your own backend.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {["Buyer details", "Destination", "Car wanted", "Budget", "WhatsApp follow-up", "Partner quote matching"].map((item) => (
                  <div key={item} className="flex items-center gap-3 font-bold">
                    <CheckCircle2 className="h-5 w-5" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <input placeholder="Your name" value={form.name} onChange={(e) => handleForm("name", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />
                <input placeholder="WhatsApp / phone" value={form.phone} onChange={(e) => handleForm("phone", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />
                <input placeholder="Email address" value={form.email} onChange={(e) => handleForm("email", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />
                <select value={form.destination} onChange={(e) => handleForm("destination", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300">
                  {Object.keys(countries).map((name) => <option key={name}>{name}</option>)}
                </select>
                <input placeholder="Car wanted" value={form.car} onChange={(e) => handleForm("car", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />
                <input placeholder="Budget in GBP" value={form.budget} onChange={(e) => handleForm("budget", e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />
              </div>
              <textarea placeholder="Tell us what you need: car type, year, engine, destination city, how soon you want to ship..." value={form.message} onChange={(e) => handleForm("message", e.target.value)} className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-emerald-300" />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href={`https://wa.me/447943617386?text=${whatsappText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-slate-950 transition hover:bg-emerald-300"
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp quote
                </a>
                <a
                  href={`mailto:quotes@uk-car-export-compare.vercel.app?subject=UK car export quote request&body=${whatsappText}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-black text-slate-950 transition hover:bg-slate-200"
                >
                  <Mail className="h-5 w-5" /> Email quote
                </a>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                Your enquiry will open in WhatsApp or email so you can send your quote request directly.
              </p>
            </div>
          </div>
        </section>

        <section id="partners" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="font-bold text-emerald-300">Revenue model</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Sell leads to businesses that already want buyers.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Start by manually sending leads to partners. Later, charge per lead, per successful deal, or monthly for featured listings.
              </p>
              <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center gap-2 text-yellow-300">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                </div>
                <p className="mt-4 text-lg font-bold leading-8">
                  “A serious buyer asking for UK car sourcing and shipping can be worth much more than a normal affiliate click.”
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {partners.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
                  <div className="mb-5 inline-flex rounded-2xl bg-emerald-400/15 p-3 text-emerald-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xl font-black">UK Car Export Compare</p>
            <p className="mt-2 text-sm text-slate-400">Free UK car export quote comparison for African buyers.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <a className="flex items-center gap-2 hover:text-white" href="tel:+447943617386"><Phone className="h-4 w-4" /> 07943 617386</a>
            <a className="flex items-center gap-2 hover:text-white" href="mailto:quotes@uk-car-export-compare.vercel.app"><Mail className="h-4 w-4" /> quotes@uk-car-export-compare.vercel.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
