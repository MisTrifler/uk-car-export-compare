"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Lock, Unlock, Plus, Search, Phone, Mail, MapPin, PoundSterling, Trash2, Copy, Download, Users, ClipboardList, CheckCircle2, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "cleanerLeadTrackerJobs_v1";
const CLEANERS_KEY = "cleanerLeadTrackerCleaners_v1";

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

const leadSources = ["Facebook Group", "Facebook Marketplace", "Nextdoor", "Gumtree", "WhatsApp", "Referral", "Website", "Other"];
const areas = ["Birmingham", "Walsall", "Sutton Coldfield", "Great Barr", "Edgbaston", "Harborne", "Selly Oak", "Moseley", "Kings Heath", "Erdington", "Handsworth", "Bloxwich", "Willenhall", "Aldridge", "Darlaston", "Other"];

const defaultJob = {
  id: "",
  dateReceived: "",
  status: "New Enquiry",
  leadSource: "Facebook Group",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  postcode: "",
  area: "Birmingham",
  serviceType: "Regular Weekly Clean",
  propertySize: "",
  preferredDate: "",
  customerBudget: "",
  consentToShare: false,
  customerNotes: "",
  anonymisedSummary: "",
  allocatedCleaner: "",
  dateOffered: "",
  leadFee: "",
  cleanerPaid: false,
  paymentAmount: "",
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
  services: "",
  insuranceProof: false,
  reviewsProof: false,
  paymentTermsAccepted: false,
  reliabilityScore: "New",
  notes: "",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function StatusBadge({ job }) {
  if (!job.cleanerPaid && !job.detailsReleased) return <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Locked</Badge>;
  if (job.cleanerPaid && !job.detailsReleased) return <Badge className="gap-1"><Unlock className="h-3 w-3" /> Paid - Release</Badge>;
  if (job.cleanerPaid && job.detailsReleased) return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Released</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Check</Badge>;
}

export default function CleanerLeadTrackerApp() {
  const [jobs, setJobs] = useState([]);
  const [cleaners, setCleaners] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeJob, setActiveJob] = useState(null);
  const [activeCleaner, setActiveCleaner] = useState(null);

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

  const stats = useMemo(() => {
    const total = jobs.length;
    const paid = jobs.filter((j) => j.cleanerPaid).length;
    const released = jobs.filter((j) => j.detailsReleased).length;
    const revenue = jobs.reduce((sum, j) => sum + safeMoney(j.paymentAmount), 0);
    const locked = jobs.filter((j) => !j.cleanerPaid && !j.detailsReleased).length;
    return { total, paid, released, revenue, locked };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const text = `${job.customerName} ${job.customerPhone} ${job.postcode} ${job.area} ${job.serviceType} ${job.allocatedCleaner}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [jobs, query, statusFilter]);

  function newJob() {
    setActiveJob({ ...defaultJob, id: uid("JOB"), dateReceived: today() });
  }

  function saveJob(job) {
    const correctedJob = {
      ...job,
      status: job.detailsReleased ? "Details Released" : job.cleanerPaid ? "Paid - Release Details" : job.allocatedCleaner ? "Offered to Cleaner" : "New Enquiry",
    };
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === correctedJob.id);
      return exists ? prev.map((j) => (j.id === correctedJob.id ? correctedJob : j)) : [correctedJob, ...prev];
    });
    setActiveJob(null);
  }

  function deleteJob(id) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function newCleaner() {
    setActiveCleaner({ ...defaultCleaner, id: uid("CLEANER") });
  }

  function saveCleaner(cleaner) {
    setCleaners((prev) => {
      const exists = prev.some((c) => c.id === cleaner.id);
      return exists ? prev.map((c) => (c.id === cleaner.id ? cleaner : c)) : [cleaner, ...prev];
    });
    setActiveCleaner(null);
  }

  function deleteCleaner(id) {
    setCleaners((prev) => prev.filter((c) => c.id !== id));
  }

  function createAnonymisedText(job) {
    return `New cleaning lead available:\n\nArea: ${job.area || "Unknown"}\nPostcode area: ${(job.postcode || "").slice(0, 4).toUpperCase() || "Not provided"}\nService: ${job.serviceType}\nProperty: ${job.propertySize || "Not provided"}\nPreferred date: ${job.preferredDate || "Flexible / not provided"}\nBudget: ${job.customerBudget ? "£" + job.customerBudget : "Not provided"}\nNotes: ${job.customerNotes || "None"}\n\nLead fee: £${job.leadFee || "TBC"}\n\nFull customer details are released only after payment is received.`;
  }

  function createReleaseText(job) {
    if (!job.cleanerPaid) return "Payment has not been received. Do not release this customer's details.";
    return `Customer details for paid lead:\n\nName: ${job.customerName}\nPhone: ${job.customerPhone}\nEmail: ${job.customerEmail || "Not provided"}\nPostcode/address area: ${job.postcode}\nService: ${job.serviceType}\nProperty: ${job.propertySize}\nPreferred date: ${job.preferredDate}\nBudget: ${job.customerBudget ? "£" + job.customerBudget : "Not provided"}\nNotes: ${job.customerNotes || "None"}\n\nPlease contact the customer quickly and professionally.`;
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
  }

  function exportCsv() {
    const headers = Object.keys(defaultJob);
    const rows = jobs.map((job) => headers.map((h) => `"${String(job[h] ?? "").replaceAll('"', '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaner-leads-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Cleaner Lead Control Centre</h1>
            <p className="text-slate-600">Track Birmingham & Walsall cleaning leads. Payment must be received before client details are released.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={newJob} className="gap-2"><Plus className="h-4 w-4" /> New Job</Button>
            <Button onClick={newCleaner} variant="outline" className="gap-2"><Users className="h-4 w-4" /> New Cleaner</Button>
            <Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard title="Total Leads" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} />
          <StatCard title="Paid Leads" value={stats.paid} icon={<PoundSterling className="h-5 w-5" />} />
          <StatCard title="Details Released" value={stats.released} icon={<Unlock className="h-5 w-5" />} />
          <StatCard title="Locked Leads" value={stats.locked} icon={<Lock className="h-5 w-5" />} />
          <StatCard title="Revenue" value={`£${stats.revenue.toFixed(2)}`} icon={<PoundSterling className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Jobs Tracker</TabsTrigger>
            <TabsTrigger value="cleaners">Cleaner Partners</TabsTrigger>
            <TabsTrigger value="rules">Rules & Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input className="pl-9" placeholder="Search by customer, phone, postcode, area, service or cleaner" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="New Enquiry">New Enquiry</SelectItem>
                      <SelectItem value="Offered to Cleaner">Offered to Cleaner</SelectItem>
                      <SelectItem value="Paid - Release Details">Paid - Release Details</SelectItem>
                      <SelectItem value="Details Released">Details Released</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {filteredJobs.length === 0 ? (
                <Card className="rounded-2xl border-dashed"><CardContent className="p-8 text-center text-slate-500">No jobs yet. Click “New Job” to add your first enquiry.</CardContent></Card>
              ) : filteredJobs.map((job) => (
                <Card key={job.id} className="rounded-2xl shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{job.customerName || "Unnamed customer"}</h3>
                          <StatusBadge job={job} />
                          <Badge variant="outline">{job.serviceType}</Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                          <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {job.customerPhone || "No phone"}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.area} / {job.postcode || "No postcode"}</span>
                          <span className="flex items-center gap-1"><PoundSterling className="h-4 w-4" /> Lead fee £{job.leadFee || "0"} / Paid £{job.paymentAmount || "0"}</span>
                        </div>
                        <p className="text-sm text-slate-700">{job.propertySize || "Property size not added"} • Preferred: {job.preferredDate || "Not added"} • Cleaner: {job.allocatedCleaner || "Not allocated"}</p>
                        {!job.cleanerPaid && (
                          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Payment not received. Client details must stay locked.</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => copyText(createAnonymisedText(job))} className="gap-2"><Copy className="h-4 w-4" /> Copy Lead</Button>
                        <Button variant={job.cleanerPaid ? "default" : "outline"} disabled={!job.cleanerPaid} onClick={() => copyText(createReleaseText(job))} className="gap-2"><Unlock className="h-4 w-4" /> Copy Details</Button>
                        <Button variant="outline" onClick={() => setActiveJob(job)}>Edit</Button>
                        <Button variant="destructive" onClick={() => deleteJob(job.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cleaners" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {cleaners.length === 0 ? (
                <Card className="rounded-2xl border-dashed md:col-span-2"><CardContent className="p-8 text-center text-slate-500">No cleaner partners yet. Add cleaners before selling leads.</CardContent></Card>
              ) : cleaners.map((cleaner) => (
                <Card key={cleaner.id} className="rounded-2xl shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">{cleaner.name}</h3>
                        <p className="text-sm text-slate-600">{cleaner.areasCovered}</p>
                      </div>
                      <Badge>{cleaner.reliabilityScore}</Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {cleaner.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {cleaner.email}</span>
                    </div>
                    <p className="text-sm">{cleaner.services}</p>
                    <div className="flex flex-wrap gap-2">
                      {cleaner.insuranceProof && <Badge variant="outline">Insurance proof</Badge>}
                      {cleaner.reviewsProof && <Badge variant="outline">Reviews proof</Badge>}
                      {cleaner.paymentTermsAccepted && <Badge variant="outline">Terms accepted</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setActiveCleaner(cleaner)}>Edit</Button>
                      <Button variant="destructive" onClick={() => deleteCleaner(cleaner.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-2xl font-bold">Airtight Operating Rules</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Rule title="1. Customer consent first" text="Tell the customer you are a matching service and their details may be shared with an independent cleaner to respond to their enquiry." />
                  <Rule title="2. Anonymised lead only" text="Before payment, send cleaners only area, service, property size, date and lead fee. Do not send name, phone, email or full address." />
                  <Rule title="3. Payment before details" text="Cleaner must pay your lead fee before you release client details. The app locks the details button until Cleaner Paid is ticked." />
                  <Rule title="4. Release and record" text="After payment, copy the details message, send it to the cleaner, then tick Details Released and record the release date." />
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <h3 className="font-semibold">Refund rule</h3>
                  <p className="text-sm text-slate-700">Only refund or replace if the lead is fake, wrong number, duplicate, or the customer did not request cleaning. Do not refund because the cleaner quoted too high, replied late, or failed to win the job.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!activeJob} onOpenChange={(open) => !open && setActiveJob(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle>{activeJob?.id && jobs.some((j) => j.id === activeJob.id) ? "Edit Job" : "New Job"}</DialogTitle></DialogHeader>
            {activeJob && <JobForm job={activeJob} setJob={setActiveJob} cleaners={cleaners} onSave={saveJob} />}
          </DialogContent>
        </Dialog>

        <Dialog open={!!activeCleaner} onOpenChange={(open) => !open && setActiveCleaner(null)}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle>{activeCleaner?.id && cleaners.some((c) => c.id === activeCleaner.id) ? "Edit Cleaner" : "New Cleaner"}</DialogTitle></DialogHeader>
            {activeCleaner && <CleanerForm cleaner={activeCleaner} setCleaner={setActiveCleaner} onSave={saveCleaner} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return <label className="space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}

function JobForm({ job, setJob, cleaners, onSave }) {
  const canRelease = job.cleanerPaid && job.paymentAmount && job.paymentDate;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-100 p-4">
        <div className="flex items-center gap-2 font-semibold">
          {canRelease ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          {canRelease ? "Payment received. You may release details." : "Details locked until cleaner payment is recorded."}
        </div>
      </div>

      <Section title="1. Customer Enquiry">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Date Received"><Input type="date" value={job.dateReceived} onChange={(e) => setJob({ ...job, dateReceived: e.target.value })} /></Field>
          <Field label="Lead Source"><SimpleSelect value={job.leadSource} options={leadSources} onChange={(v) => setJob({ ...job, leadSource: v })} /></Field>
          <Field label="Area"><SimpleSelect value={job.area} options={areas} onChange={(v) => setJob({ ...job, area: v })} /></Field>
          <Field label="Customer Name"><Input value={job.customerName} onChange={(e) => setJob({ ...job, customerName: e.target.value })} /></Field>
          <Field label="Customer Phone"><Input value={job.customerPhone} onChange={(e) => setJob({ ...job, customerPhone: e.target.value })} /></Field>
          <Field label="Customer Email"><Input value={job.customerEmail} onChange={(e) => setJob({ ...job, customerEmail: e.target.value })} /></Field>
          <Field label="Postcode / Address Area"><Input value={job.postcode} onChange={(e) => setJob({ ...job, postcode: e.target.value })} /></Field>
          <Field label="Service Type"><SimpleSelect value={job.serviceType} options={serviceTypes} onChange={(v) => setJob({ ...job, serviceType: v })} /></Field>
          <Field label="Property Size"><Input placeholder="Example: 2-bed flat" value={job.propertySize} onChange={(e) => setJob({ ...job, propertySize: e.target.value })} /></Field>
          <Field label="Preferred Date"><Input type="date" value={job.preferredDate} onChange={(e) => setJob({ ...job, preferredDate: e.target.value })} /></Field>
          <Field label="Customer Budget £"><Input type="number" value={job.customerBudget} onChange={(e) => setJob({ ...job, customerBudget: e.target.value })} /></Field>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={job.consentToShare} onCheckedChange={(v) => setJob({ ...job, consentToShare: Boolean(v) })} />
            <span className="text-sm font-medium">Consent to share details</span>
          </div>
        </div>
        <Field label="Customer Notes"><Textarea value={job.customerNotes} onChange={(e) => setJob({ ...job, customerNotes: e.target.value })} /></Field>
      </Section>

      <Section title="2. Offer Anonymised Lead to Cleaner">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Allocated Cleaner">
            <Select value={job.allocatedCleaner || "Unallocated"} onValueChange={(v) => setJob({ ...job, allocatedCleaner: v === "Unallocated" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Unallocated">Unallocated</SelectItem>
                {cleaners.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date Offered"><Input type="date" value={job.dateOffered} onChange={(e) => setJob({ ...job, dateOffered: e.target.value })} /></Field>
          <Field label="Lead Fee £"><Input type="number" value={job.leadFee} onChange={(e) => setJob({ ...job, leadFee: e.target.value })} /></Field>
        </div>
        <Field label="Anonymised Lead Summary"><Textarea value={job.anonymisedSummary} onChange={(e) => setJob({ ...job, anonymisedSummary: e.target.value })} placeholder="Example: B12 area, 2-bed flat, end-of-tenancy clean needed Saturday. Lead fee £35." /></Field>
      </Section>

      <Section title="3. Cleaner Payment">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={job.cleanerPaid} onCheckedChange={(v) => setJob({ ...job, cleanerPaid: Boolean(v), detailsReleased: Boolean(v) ? job.detailsReleased : false })} />
            <span className="text-sm font-medium">Cleaner Paid?</span>
          </div>
          <Field label="Payment Amount £"><Input type="number" value={job.paymentAmount} onChange={(e) => setJob({ ...job, paymentAmount: e.target.value })} /></Field>
          <Field label="Payment Date"><Input type="date" value={job.paymentDate} onChange={(e) => setJob({ ...job, paymentDate: e.target.value })} /></Field>
          <Field label="Payment Method"><SimpleSelect value={job.paymentMethod} options={["Bank Transfer", "Stripe", "PayPal", "Cash", "Other"]} onChange={(v) => setJob({ ...job, paymentMethod: v })} /></Field>
          <Field label="Payment Reference"><Input value={job.paymentReference} onChange={(e) => setJob({ ...job, paymentReference: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="4. Release Details After Payment">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 pt-6">
            <Checkbox disabled={!canRelease} checked={job.detailsReleased} onCheckedChange={(v) => setJob({ ...job, detailsReleased: Boolean(v) })} />
            <span className="text-sm font-medium">Details Released?</span>
          </div>
          <Field label="Date Details Released"><Input disabled={!canRelease} type="date" value={job.dateDetailsReleased} onChange={(e) => setJob({ ...job, dateDetailsReleased: e.target.value })} /></Field>
          <Field label="Outcome"><SimpleSelect value={job.outcome} options={["Pending", "Booked", "Completed", "Lost", "Refunded", "Replaced"]} onChange={(v) => setJob({ ...job, outcome: v })} /></Field>
        </div>
        <Field label="Internal Notes"><Textarea value={job.internalNotes} onChange={(e) => setJob({ ...job, internalNotes: e.target.value })} /></Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSave(job)}>Save</Button>
        <Button onClick={() => onSave({ ...job, cleanerPaid: job.cleanerPaid, detailsReleased: canRelease ? job.detailsReleased : false })}>Save Job</Button>
      </div>
    </div>
  );
}

function CleanerForm({ cleaner, setCleaner, onSave }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Cleaner / Company Name"><Input value={cleaner.name} onChange={(e) => setCleaner({ ...cleaner, name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={cleaner.phone} onChange={(e) => setCleaner({ ...cleaner, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={cleaner.email} onChange={(e) => setCleaner({ ...cleaner, email: e.target.value })} /></Field>
        <Field label="Reliability Score"><SimpleSelect value={cleaner.reliabilityScore} options={["New", "Good", "Excellent", "Warning", "Do Not Use"]} onChange={(v) => setCleaner({ ...cleaner, reliabilityScore: v })} /></Field>
      </div>
      <Field label="Areas Covered"><Textarea value={cleaner.areasCovered} onChange={(e) => setCleaner({ ...cleaner, areasCovered: e.target.value })} /></Field>
      <Field label="Services Offered"><Textarea value={cleaner.services} onChange={(e) => setCleaner({ ...cleaner, services: e.target.value })} /></Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Check label="Insurance proof seen" checked={cleaner.insuranceProof} onChange={(v) => setCleaner({ ...cleaner, insuranceProof: v })} />
        <Check label="Reviews/photos seen" checked={cleaner.reviewsProof} onChange={(v) => setCleaner({ ...cleaner, reviewsProof: v })} />
        <Check label="Payment terms accepted" checked={cleaner.paymentTermsAccepted} onChange={(v) => setCleaner({ ...cleaner, paymentTermsAccepted: v })} />
      </div>
      <Field label="Notes"><Textarea value={cleaner.notes} onChange={(e) => setCleaner({ ...cleaner, notes: e.target.value })} /></Field>
      <div className="flex justify-end"><Button onClick={() => onSave(cleaner)}>Save Cleaner</Button></div>
    </div>
  );
}

function Section({ title, children }) {
  return <div className="space-y-3 rounded-2xl border bg-white p-4"><h3 className="text-lg font-semibold text-slate-950">{title}</h3>{children}</div>;
}

function SimpleSelect({ value, options, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border p-3">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function Rule({ title, text }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{text}</p>
    </div>
  );
}
