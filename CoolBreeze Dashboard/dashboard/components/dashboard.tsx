"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Wind,
  LayoutDashboard,
  Users,
  MessagesSquare,
  CalendarDays,
  Workflow,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Clock3,
  Check,
  Mail,
  MapPin,
  Phone,
  CircleHelp,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { DemoAdapter, SupabaseAdapter } from "@/lib/adapter";
import {
  demoData,
  filterLeads,
  formatDate,
  metrics,
  priorities,
  snapshotSchema,
  statuses,
  type Lead,
  type Snapshot,
  type Booking,
} from "@/lib/data";
const navigation = [
  ["Overview", LayoutDashboard],
  ["Leads", Users],
  ["Conversations", MessagesSquare],
  ["Appointments", CalendarDays],
  ["Automations", Workflow],
  ["Settings", Settings],
] as const;
const href = (s: string) => (s === "Overview" ? "/" : `/${s.toLowerCase()}/`);
function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="dot" />
      {value}
    </span>
  );
}
function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar">
      {name
        .split(" ")
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
export default function Dashboard({ section }: { section: string }) {
  const [data, setData] = useState<Snapshot>(demoData),
    [ready, setReady] = useState(false),
    [isLive, setIsLive] = useState(false),
    [loading, setLoading] = useState(false),
    [lastSynced, setLastSynced] = useState<Date | null>(null),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [priority, setPriority] = useState("All priorities"),
    [selected, setSelected] = useState<string | null>(null),
    [range, setRange] = useState("all"),
    [week, setWeek] = useState(0),
    [notice, setNotice] = useState(""),
    [workflow, setWorkflow] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  async function loadData(showNotice = false) {
    setLoading(true);
    try {
      const live = await new SupabaseAdapter().load();
      setData(live);
      setIsLive(true);
      setReady(true);
      setLastSynced(new Date());
      if (showNotice) {
        setNotice(
          `Dashboard synced with Supabase (${live.leads.length} leads, ${live.bookings.length} bookings loaded).`,
        );
      }
    } catch (err: any) {
      console.warn("Could not load from Supabase directly:", err);
      if (!ready) {
        let initial = await new DemoAdapter().load();
        try {
          const saved = localStorage.getItem("coolbreeze-demo-v1");
          if (saved) initial = snapshotSchema.parse(JSON.parse(saved));
        } catch {}
        setData(initial);
        setReady(true);
        setIsLive(false);
        setNotice("Could not load live Supabase data. Displaying sample data.");
      } else if (showNotice) {
        setNotice("Sync failed: " + (err.message || "Could not reach Supabase"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadData();

    // Periodic auto-sync every 15 seconds to keep data dynamic
    const interval = setInterval(() => {
      if (active) loadData(false);
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  const lead = data.leads.find((l) => l.id === selected);
  const filtered = filterLeads(data.leads, query, status, priority);
  const periodLeads = data.leads.filter((l) => {
    if (range === "all") return true;
    const days = Number(range);
    const leadTime = new Date(l.createdAt).getTime();
    return leadTime >= Date.now() - days * 86400000;
  });
  const stats = metrics(periodLeads);

  async function updateLead(key: "status" | "priority", value: string) {
    if (!selected) return;
    const previous = data;
    // Optimistic UI update
    setData((d) => ({
      ...d,
      leads: d.leads.map((l) =>
        l.id === selected ? { ...l, [key]: value } : l,
      ),
    }));

    if (isLive) {
      try {
        await new SupabaseAdapter().updateLead(selected, { [key]: value });
        setNotice(`Lead updated in Supabase (${key}: ${value}).`);
      } catch (err: any) {
        setData(previous);
        setNotice(`Failed to update in Supabase: ${err.message}`);
      }
    } else {
      setNotice("Lead updated in this browser.");
    }
  }
  function leadTable(rows: Lead[]) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Received · Dallas</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <button
                    className="customer"
                    onClick={() => setSelected(l.id)}
                  >
                    <Avatar name={l.name} />
                    <span>
                      <strong>{l.name}</strong>
                      <small>
                        {l.city}, TX · {l.source}
                      </small>
                    </span>
                  </button>
                </td>
                <td>{l.service}</td>
                <td>
                  <Badge value={l.status} />
                </td>
                <td>
                  <span className={`priority ${l.priority.toLowerCase()}`}>
                    {l.priority === "Urgent"
                      ? "● "
                      : l.priority === "High"
                        ? "↑ "
                        : ""}
                    {l.priority}
                  </span>
                </td>
                <td className="muted">
                  {formatDate(l.createdAt, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`View ${l.name}`}
                    onClick={() => setSelected(l.id)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            No leads match these filters. Try another search or clear your
            filters.
          </div>
        )}
      </div>
    );
  }
  function bookingRow(b: Booking) {
    const l = data.leads.find((l) => l.id === b.leadId);
    return (
      <button
        className="booking-row"
        key={b.id}
        onClick={() => setSelected(b.leadId)}
      >
        <span className="date-tile">
          <small>{formatDate(b.start, { month: "short" })}</small>
          <strong>{formatDate(b.start, { day: "numeric" })}</strong>
        </span>
        <span className="grow">
          <strong>{l?.name}</strong>
          <small>{l?.service}</small>
          <small>
            {formatDate(b.start, {
              weekday: "short",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            · {l?.city}
          </small>
        </span>
        <ChevronRight size={16} />
      </button>
    );
  }
  const workflows = [
    {
      name: "Lead intake",
      detail: "Capture and organize every new inquiry.",
      system: "Website → Supabase",
      state: data.leads.length > 0 ? "Healthy" : "Idle",
      count: isLive
        ? `${data.leads.length} live leads in Supabase`
        : "12 leads captured",
      steps: [
        "Receive website inquiry",
        "Validate contact and service details",
        "Create lead record in Supabase",
      ],
    },
    {
      name: "AI email conversation",
      detail: "Respond, qualify, and offer appointment times.",
      system: "FastAPI → Email",
      state: "Healthy",
      count: isLive
        ? `${data.leads.reduce((n, l) => n + (l.messages.length > 1 ? 1 : 0), 0)} active conversations`
        : "1 inquiry awaiting review",
      steps: [
        "Read customer inquiry",
        "Draft contextual service response",
        "Check availability and continue conversation",
      ],
      note: isLive
        ? undefined
        : "Emma Wilson’s urgent cooling issue is awaiting a team response.",
    },
    {
      name: "Appointment booking",
      detail: "Turn qualified conversations into confirmed visits.",
      system: "FastAPI → Google Calendar",
      state: data.bookings.length > 0 ? "Healthy" : "Idle",
      count: isLive
        ? `${data.bookings.length} ${data.bookings.length === 1 ? "booking" : "bookings"} scheduled`
        : "5 appointments created",
      steps: [
        "Confirm customer-selected time",
        "Create calendar event in Dallas time",
        "Link event to the customer lead",
      ],
    },
    {
      name: "Notifications",
      detail: "Keep the customer and service team informed.",
      system: "Calendar event → n8n → Email",
      state: "Healthy",
      count: isLive ? "Active via n8n & Email" : "1 pending · 1 failed",
      steps: [
        "Detect newly created calendar event",
        "Send confirmation to customer",
        "Notify assigned service team",
      ],
    },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Wind size={25} />
          </span>
          <span>
            CoolBreeze<small>HVAC OPERATIONS</small>
          </span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">C</span>
          <span>
            CoolBreeze HVAC<small>Dallas–Fort Worth</small>
          </span>
          <span className="workspace-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(([name, Icon]) => (
            <Link
              key={name}
              href={href(name)}
              aria-current={section === name ? "page" : undefined}
              className={section === name ? "active" : ""}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Leads" && (
                <span className="nav-count">{data.leads.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-side">
            <span
              className="dot"
              style={
                isLive
                  ? { background: "#22c55e", boxShadow: "0 0 6px #22c55e" }
                  : {}
              }
            />{" "}
            {isLive ? "Live workspace" : "Demo workspace"}
            <p>
              {isLive
                ? "Connected to Supabase database."
                : "A closer look at a calmer workday."}
            </p>
          </div>
          <div className="profile">
            <span className="profile-avatar">CB</span>
            <span>
              CoolBreeze team<small>Workspace administrator</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <span>/</span> <strong>{section}</strong>
          </div>
          <div className="top-right">
            <button
              className={`refresh-btn ${loading ? "spinning" : ""}`}
              onClick={() => loadData(true)}
              title="Sync with Supabase"
              aria-label="Sync with Supabase"
            >
              <RefreshCw size={13} />
              <span>{loading ? "Syncing..." : "Sync"}</span>
            </button>
            {isLive ? (
              <span className="live-pill">
                <span className="dot" /> SUPABASE LIVE
              </span>
            ) : (
              <span className="demo-pill">DEMO DATA</span>
            )}
            <span className="timezone">
              <Clock3 size={14} /> Dallas, TX · Central Time
            </span>
            <span className="top-avatar">CB</span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">COOLBREEZE LEAD DESK</p>
              <h1>
                {section === "Overview" ? "A clear view of your day." : section}
              </h1>
              <p>
                {
                  (
                    {
                      Overview:
                        "Every inquiry, conversation, and booking. All in one place.",
                      Leads: "From first inquiry to the next service call.",
                      Conversations:
                        "Follow the conversation. Step in when it matters.",
                      Appointments: "A reliable view of the week ahead.",
                      Automations:
                        "The workflows that keep your front desk moving.",
                      Settings:
                        "Your workspace, service area, and connections.",
                    } as Record<string, string>
                  )[section]
                }
              </p>
            </div>
            {section === "Overview" ? (
              <label className="range-label">
                <CalendarDays size={16} />
                <select
                  aria-label="Overview date range"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="7">Last 7 days</option>
                  <option value="1">Last 24 hours</option>
                  <option value="30">Last 30 days</option>
                </select>
              </label>
            ) : (
              <span className="subtle-label">
                {isLive ? "SUPABASE LIVE" : "DEMO WORKSPACE"}
              </span>
            )}
          </div>
          <div className="demo-banner">
            <span>
              <span className="dot" />{" "}
              {isLive
                ? "Connected to Supabase · Real-time HVAC lead desk"
                : "Sample workspace · October 17, 2026"}
            </span>
            <span>
              {isLive && lastSynced
                ? `Last updated: ${formatDate(lastSynced.toISOString(), { hour: "numeric", minute: "2-digit", second: "2-digit" })} (${data.leads.length} live ${data.leads.length === 1 ? "lead" : "leads"})`
                : "No live messages or bookings are sent."}
            </span>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {section === "Overview" && (
            <>
              <div className="metrics">
                {[
                  {
                    label: "New leads",
                    value: stats.total,
                    note: "In the selected period",
                    icon: Users,
                  },
                  {
                    label: "Avg. first response",
                    value: stats.average === null ? "—" : `${stats.average}s`,
                    note: `${periodLeads.filter((l) => l.responseSeconds !== null).length} of ${stats.total} leads answered`,
                    icon: Clock3,
                  },
                  {
                    label: "Appointments booked",
                    value: stats.booked,
                    note: "Leads with a confirmed booking",
                    icon: CalendarDays,
                  },
                  {
                    label: "Lead-to-booking rate",
                    value: `${stats.conversion}%`,
                    note: "Booked leads ÷ total leads",
                    icon: ArrowUpRight,
                  },
                ].map((m) => (
                  <div className="metric" key={m.label}>
                    <div>
                      {m.label}
                      <m.icon size={17} />
                    </div>
                    <strong>{m.value}</strong>
                    <small>{m.note}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel lead-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent leads</h2>
                      <p>Your latest customer inquiries.</p>
                    </div>
                    <Link className="text-link" href="/leads/">
                      View all leads <ArrowRight size={15} />
                    </Link>
                  </div>
                  {leadTable(periodLeads.slice(0, 5))}
                </section>
                <section className="panel upcoming">
                  <div className="panel-heading">
                    <div>
                      <h2>Coming up next</h2>
                      <p>All times in Dallas.</p>
                    </div>
                    <CalendarDays size={18} />
                  </div>
                  {data.bookings.slice(0, 3).map(bookingRow)}
                  <Link href="/appointments/" className="panel-footer">
                    Open appointment calendar <ArrowRight size={15} />
                  </Link>
                </section>
              </div>
              <div className="bottom-grid">
                <section className="panel attention">
                  <span className="attention-icon">
                    <CircleHelp size={21} />
                  </span>
                  <div>
                    <p className="eyebrow">NEEDS A HUMAN TOUCH</p>
                    <h2>
                      {
                        data.leads.filter((l) => l.status === "Needs attention")
                          .length
                      }{" "}
                      lead needs your attention
                    </h2>
                    <p>
                      Review urgent inquiries and keep the conversation moving.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => {
                        const l = data.leads.find(
                          (l) => l.status === "Needs attention",
                        );
                        if (l) setSelected(l.id);
                        else setNotice("No leads currently need attention.");
                      }}
                    >
                      Review lead <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="panel health">
                  <div className="panel-heading">
                    <h2>Automation health</h2>
                    <Link href="/automations/" className="text-link">
                      View workflows <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="health-items">
                    {workflows.map((w, i) => (
                      <Link href="/automations/" key={w.name}>
                        <span
                          className={`health-dot ${w.state === "Healthy" ? "ok" : "warn"}`}
                        />
                        <span>
                          {
                            [
                              "Lead intake",
                              "AI response",
                              "Booking",
                              "Notifications",
                            ][i]
                          }
                          <small>{w.state}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className="health-foot">
                    Illustrative workflow status · live monitoring is not
                    connected
                  </p>
                </section>
              </div>
            </>
          )}
          {(section === "Leads" || section === "Conversations") && (
            <>
              <div className="filter-bar">
                <label className="search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search customers, services, or lead IDs"
                    aria-label="Search leads"
                  />
                </label>
                <select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {["All statuses", ...statuses].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {["All priorities", ...priorities].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="plain-button"
                  onClick={() => {
                    setQuery("");
                    setStatus("All statuses");
                    setPriority("All priorities");
                  }}
                >
                  Clear filters
                </button>
              </div>
              <div className="results-label">
                {filtered.length} {filtered.length === 1 ? "lead" : "leads"}{" "}
                <span>Newest first</span>
              </div>
              {section === "Leads" ? (
                <section className="panel">{leadTable(filtered)}</section>
              ) : (
                <section className="panel conversation-list">
                  {filtered.map((l) => (
                    <button key={l.id} onClick={() => setSelected(l.id)}>
                      <Avatar name={l.name} />
                      <span className="grow">
                        <strong>
                          {l.name} <span className="muted">· {l.service}</span>
                        </strong>
                        <p>{l.messages.at(-1)?.text}</p>
                        <small>
                          {l.messages.length} messages · Email ·{" "}
                          {formatDate(l.createdAt, {
                            month: "short",
                            day: "numeric",
                          })}
                        </small>
                      </span>
                      <Badge value={l.status} />
                      <ChevronRight size={18} />
                    </button>
                  ))}
                  {!filtered.length && (
                    <p className="empty">
                      No conversations match these filters.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          {section === "Appointments" && (
            <section className="panel calendar-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {formatDate(
                      new Date(
                        Date.UTC(2026, 9, 19 + week * 7, 12),
                      ).toISOString(),
                      { month: "long", day: "numeric" },
                    )}{" "}
                    –{" "}
                    {formatDate(
                      new Date(
                        Date.UTC(2026, 9, 25 + week * 7, 12),
                      ).toISOString(),
                      { month: "long", day: "numeric", year: "numeric" },
                    )}
                  </h2>
                  <p>America/Chicago · Customer appointments</p>
                </div>
                <div className="calendar-controls">
                  <button
                    className="icon-button"
                    aria-label="Previous week"
                    onClick={() => setWeek((w) => w - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button className="plain-button" onClick={() => setWeek(0)}>
                    Demo week
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Next week"
                    onClick={() => setWeek((w) => w + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(
                    Date.UTC(2026, 9, 19 + week * 7 + i, 12),
                  ).toISOString();
                  const bookings = data.bookings.filter(
                    (b) =>
                      formatDate(b.start, {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      }) ===
                      formatDate(day, {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                      }),
                  );
                  return (
                    <div className="calendar-day" key={day}>
                      <div className="day-heading">
                        <small>{formatDate(day, { weekday: "short" })}</small>
                        <strong>{formatDate(day, { day: "numeric" })}</strong>
                      </div>
                      {bookings.map((b) => {
                        const l = data.leads.find((l) => l.id === b.leadId);
                        return (
                          <button
                            className="calendar-event"
                            key={b.id}
                            onClick={() => setSelected(b.leadId)}
                          >
                            <small>
                              {formatDate(b.start, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </small>
                            <strong>{l?.name}</strong>
                            <span>{l?.service}</span>
                            <small>{b.technician}</small>
                            <span
                              className={`notification ${b.notification.toLowerCase()}`}
                            >
                              Email {b.notification.toLowerCase()}
                            </span>
                          </button>
                        );
                      })}
                      {!bookings.length && (
                        <p className="no-bookings">No bookings</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-note">
                <MapPin size={15} /> Dallas–Fort Worth service area{" "}
                <span>Sample calendar · not connected to Google Calendar</span>
              </div>
            </section>
          )}
          {section === "Automations" && (
            <>
              <div className="section-note">
                <Workflow size={19} />
                <p>
                  Workflow architecture for the demo. These indicators
                  illustrate sample activity; they do not test your n8n or
                  FastAPI services.
                </p>
              </div>
              <div className="workflow-list">
                {workflows.map((w, i) => (
                  <section className="panel workflow-panel" key={w.name}>
                    <button
                      className="workflow-toggle"
                      aria-expanded={workflow === i}
                      onClick={() => setWorkflow(workflow === i ? null : i)}
                    >
                      <span className="workflow-number">0{i + 1}</span>
                      <span className="grow">
                        <h2>{w.name}</h2>
                        <p>{w.detail}</p>
                        <small>{w.system}</small>
                      </span>
                      <span className="workflow-status">
                        <Badge value={w.state} />
                        <small>{w.count}</small>
                      </span>
                      <ChevronRight
                        className={workflow === i ? "rotate" : ""}
                        size={19}
                      />
                    </button>
                    {workflow === i && (
                      <div className="workflow-details">
                        <ol>
                          {w.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                        {w.note && <p>{w.note}</p>}
                        <small>
                          Read-only demonstration. No workflow execution or
                          retry is available without a backend connection.
                        </small>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
          {section === "Settings" && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <h2>Workspace details</h2>
                <p>Configuration used throughout this workspace.</p>
                <dl>
                  <div>
                    <dt>Business</dt>
                    <dd>CoolBreeze HVAC</dd>
                  </div>
                  <div>
                    <dt>Service area</dt>
                    <dd>Dallas–Fort Worth, Texas</dd>
                  </div>
                  <div>
                    <dt>Booking timezone</dt>
                    <dd>America/Chicago</dd>
                  </div>
                  <div>
                    <dt>Workspace mode</dt>
                    <dd>
                      <span className={`badge ${isLive ? "healthy" : "demo"}`}>
                        <span className="dot" />
                        {isLive ? "Live (Supabase Connected)" : "Demo"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Data storage</dt>
                    <dd>
                      {isLive
                        ? "Supabase PostgreSQL (cdtmwlmfqrgkvgspboio)"
                        : "This browser only"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="panel settings-panel">
                <h2>Connections</h2>
                <p>Configured backend services and database status.</p>
                {[
                  {
                    name: "Supabase database",
                    status: isLive ? "Connected" : "Offline",
                    ok: isLive,
                    detail: "cdtmwlmfqrgkvgspboio.supabase.co",
                  },
                  {
                    name: "FastAPI backend",
                    status: "Active",
                    ok: true,
                    detail: "Lead intake & validation service",
                  },
                  {
                    name: "n8n automation & email",
                    status: "Configured",
                    ok: true,
                    detail: "steve58.app.n8n.cloud webhook",
                  },
                  {
                    name: "Google Calendar",
                    status: data.bookings.length > 0 ? "Bookings synced" : "Active",
                    ok: true,
                    detail: "America/Chicago timezone",
                  },
                ].map((s) => (
                  <div className="connection" key={s.name}>
                    <div>
                      <strong>{s.name}</strong>
                      <small
                        style={{
                          display: "block",
                          color: "var(--muted, #666)",
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        {s.detail}
                      </small>
                    </div>
                    <span className={`badge ${s.ok ? "healthy" : "needs-attention"}`}>
                      <span className="dot" />
                      {s.status}
                    </span>
                  </div>
                ))}
                <p className="settings-help">
                  Connected via dynamic Supabase server adapter. Live inquiries
                  from your website and backend flow into this workspace.
                </p>
              </section>
              <section className="panel settings-panel">
                <h2>Sync & Cache</h2>
                <p>
                  Data is fetched dynamically from Supabase. You can manually
                  trigger a fresh sync or reset browser-local overrides.
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    className="outline-button"
                    onClick={() => loadData(true)}
                  >
                    <RefreshCw size={15} /> Force Supabase sync
                  </button>
                  <button
                    className="outline-button"
                    onClick={() => {
                      if (window.confirm("Reload data from Supabase?")) {
                        loadData(true);
                      }
                    }}
                  >
                    <RotateCcw size={15} /> Reload workspace
                  </button>
                </div>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              CoolBreeze HVAC <span>·</span> A better first response.
            </span>
            <span>Demonstration workspace</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="lead-dialog"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
        aria-labelledby="detail-title"
      >
        {lead && (
          <>
            <div className="detail-header">
              <span className="eyebrow">LEAD {lead.id}</span>
              <button
                className="icon-button"
                aria-label="Close lead details"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="detail-identity">
              <Avatar name={lead.name} />
              <div>
                <h2 id="detail-title">{lead.name}</h2>
                <p>
                  {lead.service} · {lead.city}, TX
                </p>
              </div>
            </div>
            <div className="contact-details">
              <span>
                <Mail size={15} />
                {lead.email}
              </span>
              <span>
                <Phone size={15} />
                {lead.phone}
              </span>
            </div>
            <div className="detail-controls">
              <label>
                Status
                <select
                  value={lead.status}
                  onChange={(e) => updateLead("status", e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={lead.priority}
                  onChange={(e) => updateLead("priority", e.target.value)}
                >
                  {priorities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="detail-hint">
              {isLive
                ? "Status and priority changes are saved directly to Supabase."
                : "Changes affect this browser’s demo only."}
            </p>
            {data.bookings
              .filter((b) => b.leadId === lead.id)
              .map((b) => (
                <section className="detail-booking" key={b.id}>
                  <h3>
                    <CalendarDays size={17} /> Scheduled appointment
                  </h3>
                  <strong>
                    {formatDate(b.start, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {formatDate(b.end, {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </strong>
                  <p>{b.address}</p>
                  <p>Technician: {b.technician}</p>
                  <Badge value={b.notification} />
                </section>
              ))}
            <h3 className="conversation-title">
              Conversation <span>Email · {lead.messages.length} messages</span>
            </h3>
            <div className="messages">
              {lead.messages.map((m, i) => (
                <article
                  className={`message ${m.sender === "Assistant" ? "assistant" : ""}`}
                  key={i}
                >
                  <div>
                    <strong>
                      {m.sender === "Customer"
                        ? lead.name
                        : "CoolBreeze assistant"}
                    </strong>
                    <time>
                      {formatDate(m.at, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{m.text}</p>
                </article>
              ))}
            </div>
            <div className="read-only">
              <Mail size={16} />
              <span>
                {isLive
                  ? "Live email conversation thread from Supabase lead_messages."
                  : "Sample conversation · sending is unavailable until email is connected."}
              </span>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
