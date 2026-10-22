import { createClient } from "@supabase/supabase-js";
import {
  type Snapshot,
  type Lead,
  type Booking,
  snapshotSchema,
  statuses,
  priorities,
} from "./data";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://cdtmwlmfqrgkvgspboio.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export function formatServiceName(raw: string): string {
  if (!raw) return "General inquiry";
  const mapped: Record<string, string> = {
    AC_REPAIR: "AC repair",
    HEATING_REPAIR: "Heating repair",
    HVAC_MAINTENANCE: "HVAC maintenance",
    HVAC_INSTALLATION: "HVAC installation",
    DUCT_CLEANING: "Duct cleaning",
    EMERGENCY_SERVICE: "Emergency service",
  };
  if (mapped[raw.toUpperCase()]) return mapped[raw.toUpperCase()];
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const BOOKING_REGEX =
  /(?:appointment[^\n\r.!?]{0,60}?(?:has\s+been|is)\s+(?:successfully\s+|now\s+)?(?:booked|confirmed|scheduled|reserved)|(?:successfully\s+|now\s+)?(?:booked|confirmed|scheduled|reserved)\s+(?:your\s+)?appointment|confirmed\s+for\s+|here\s+are\s+your\s+confirmed\s+details|status:\s*confirmed|appointment\s+(?:has\s+been|is)\s+(?:successfully\s+)?booked)/i;

const CANCELLATION_REGEX =
  /(?:appointment\s+(?:is\s+)?(?:now\s+)?cancell?ed|cancell?ed\s+(?:your\s+)?appointment)/i;

function isOutboundAssistant(msg: { direction?: string; sender?: string }): boolean {
  const dir = (msg.direction || "").toUpperCase();
  const sender = (msg.sender || "").toUpperCase();
  return dir === "OUTBOUND" || sender === "AI" || sender === "ASSISTANT";
}

export function formatStatus(
  status: string | null | undefined,
  aiPriority: string | null | undefined,
  hasBooking: boolean,
  hasConversation: boolean,
): (typeof statuses)[number] {
  if (hasBooking) return "Booked";

  const norm = (status || "").toUpperCase();
  if (norm === "BOOKED") return "Booked";
  if (norm === "CLOSED") return "Closed";

  // "Needs attention": if explicitly flagged in DB or priority is URGENT and unbooked
  if (norm === "NEEDS_ATTENTION" || (aiPriority || "").toUpperCase() === "URGENT") {
    return "Needs attention";
  }

  if (norm === "QUALIFIED" || norm === "IN_CONVERSATION" || hasConversation) {
    return "In conversation";
  }

  for (const s of statuses) {
    if (s.toLowerCase() === (status || "").toLowerCase()) return s;
  }
  return "New";
}

export function formatPriority(
  aiPriority: string | null | undefined,
  neededWhen: string | null | undefined,
): (typeof priorities)[number] {
  const prio = (aiPriority || "").toUpperCase();
  if (prio === "URGENT") return "Urgent";
  if (prio === "HIGH") return "High";
  if (prio === "NORMAL") return "Normal";

  const urgency = (neededWhen || "").toUpperCase();
  if (urgency.includes("ASAP") || urgency.includes("EMERGENCY")) return "Urgent";
  if (urgency.includes("TODAY")) return "High";
  return "Normal";
}

export function mapUIToDbStatus(status: string): string {
  switch (status) {
    case "New":
      return "NEW";
    case "In conversation":
      return "QUALIFIED";
    case "Booked":
      return "BOOKED";
    case "Needs attention":
      return "NEW";
    case "Closed":
      return "CLOSED";
    default:
      return "NEW";
  }
}

export function mapUIToDbPriority(priority: string): string {
  switch (priority) {
    case "Urgent":
      return "URGENT";
    case "High":
      return "HIGH";
    case "Normal":
      return "NORMAL";
    default:
      return priority.toUpperCase();
  }
}

function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function parseTimeToHoursMinutes(timeStr: string): { hours: number; minutes: number } {
  const match = (timeStr || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return { hours: 14, minutes: 0 };
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const isPM = match[3].toUpperCase() === "PM";
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return { hours: h, minutes: m };
}

function parseAppointmentDate(text: string, refDate: Date): Date {
  // 1. Explicit full date: e.g. "Monday, October 19, 2026" or "October 19, 2026"
  const specificDateMatch = text.match(
    /(?:Date:\s*(?:[A-Za-z]+,\s*)?([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})|(?:for\s+(?:today,\s*)?([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})))/i,
  );
  if (specificDateMatch) {
    const raw = (specificDateMatch[1] || specificDateMatch[2]).trim();
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Relative: tomorrow
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(refDate);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // 3. Relative: today
  if (/\btoday\b/i.test(text)) {
    return new Date(refDate);
  }

  // 4. Day of the week: e.g. "Monday", "next Tuesday"
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayMatch = text.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  if (dayMatch) {
    const targetDay = days.indexOf(dayMatch[1].toLowerCase());
    const d = new Date(refDate);
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Target next upcoming day
    d.setDate(d.getDate() + diff);
    return d;
  }

  return new Date(refDate);
}

export async function fetchLiveSnapshot(): Promise<Snapshot> {
  // Fetch leads, messages, and events in parallel
  const [leadsRes, messagesRes, eventsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_messages")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("lead_events")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (leadsRes.error) {
    throw new Error(`Failed to fetch leads: ${leadsRes.error.message}`);
  }

  const rawLeads = leadsRes.data || [];
  const rawMessages = messagesRes.data || [];
  const rawEvents = eventsRes.data || [];

  // Group messages by lead_id
  const messagesByLead: Record<string, typeof rawMessages> = {};
  for (const msg of rawMessages) {
    if (!messagesByLead[msg.lead_id]) {
      messagesByLead[msg.lead_id] = [];
    }
    messagesByLead[msg.lead_id].push(msg);
  }

  // Group events by lead_id
  const eventsByLead: Record<string, typeof rawEvents> = {};
  for (const evt of rawEvents) {
    if (!eventsByLead[evt.lead_id]) {
      eventsByLead[evt.lead_id] = [];
    }
    eventsByLead[evt.lead_id].push(evt);
  }

  const bookings: Booking[] = [];
  const leads: Lead[] = [];

  for (const raw of rawLeads) {
    const leadMsgs = messagesByLead[raw.id] || [];
    const leadEvts = eventsByLead[raw.id] || [];

    // Construct full message thread
    const thread: Lead["messages"] = [];

    // 1. Initial inquiry from customer description
    if (raw.description && raw.description.trim()) {
      thread.push({
        sender: "Customer",
        text: raw.description,
        at: toIso(raw.created_at),
      });
    }

    // 2. Subsequent lead_messages
    for (const msg of leadMsgs) {
      const sender =
        msg.sender === "CUSTOMER" || msg.direction === "INBOUND"
          ? "Customer"
          : isOutboundAssistant(msg)
            ? "Assistant"
            : "Team";

      thread.push({
        sender,
        text: msg.content || "",
        at: toIso(msg.created_at),
      });
    }

    // Response time calculation (seconds until first outbound message)
    let responseSeconds: number | null = null;
    const firstOutbound = leadMsgs.find(isOutboundAssistant);
    if (firstOutbound && raw.created_at && firstOutbound.created_at) {
      const startMs = new Date(raw.created_at).getTime();
      const endMs = new Date(firstOutbound.created_at).getTime();
      responseSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));
    }

    // Filter only outbound assistant messages to avoid customer false positives
    const outboundAssistantMsgs = leadMsgs.filter(isOutboundAssistant);

    // Find the latest confirmation message in reverse chronological order
    const confirmationMsg = [...outboundAssistantMsgs].reverse().find((m) =>
      BOOKING_REGEX.test(m.content || ""),
    );

    // Check if the appointment was cancelled after the confirmation
    const lastOutboundMsg = outboundAssistantMsgs[outboundAssistantMsgs.length - 1];
    const isCancelled =
      lastOutboundMsg &&
      confirmationMsg &&
      new Date(lastOutboundMsg.created_at).getTime() > new Date(confirmationMsg.created_at).getTime() &&
      CANCELLATION_REGEX.test(lastOutboundMsg.content || "");

    const hasActiveBooking = Boolean(confirmationMsg && !isCancelled) || (raw.status || "").toUpperCase() === "BOOKED";

    // Keep database in sync whenever an appointment is confirmed or cancelled
    if (hasActiveBooking && (raw.status || "").toUpperCase() !== "BOOKED") {
      Promise.resolve(
        supabase
          .from("leads")
          .update({ status: "BOOKED", updated_at: new Date().toISOString() })
          .eq("id", raw.id),
      ).catch((err: unknown) => {
        console.error("Failed to auto-sync lead status to BOOKED:", err);
      });
    } else if (isCancelled && (raw.status || "").toUpperCase() === "BOOKED") {
      Promise.resolve(
        supabase
          .from("leads")
          .update({ status: "NEW", updated_at: new Date().toISOString() })
          .eq("id", raw.id),
      ).catch((err: unknown) => {
        console.error("Failed to auto-sync lead status on cancellation:", err);
      });
    }

    const status = formatStatus(
      raw.status,
      raw.ai_priority,
      hasActiveBooking,
      thread.length > 1,
    );
    const priority = formatPriority(raw.ai_priority, raw.needed_when);

    // City determination: check address in messages, description, or default
    let city = "Dallas";
    const fullText = (
      raw.description +
      " " +
      thread.map((t) => t.text).join(" ")
    ).toLowerCase();
    if (fullText.includes("plano")) city = "Plano";
    else if (fullText.includes("frisco")) city = "Frisco";
    else if (fullText.includes("irving")) city = "Irving";
    else if (fullText.includes("richardson")) city = "Richardson";
    else if (fullText.includes("dallas")) city = "Dallas";

    // Refine service name if stated in confirmation message
    let serviceName = formatServiceName(raw.service);
    if (confirmationMsg?.content) {
      const sMatch = confirmationMsg.content.match(/-\s*Service:\s*([^\n\r(]+)/i);
      if (sMatch && sMatch[1].trim()) {
        serviceName = sMatch[1].trim();
      }
    }

    const leadObj: Lead = {
      id: raw.id,
      name: raw.full_name || "Anonymous Customer",
      email: raw.email || "customer@example.com",
      phone: raw.phone || "(214) 555-0100",
      service: serviceName,
      city,
      source: raw.source
        ? raw.source.charAt(0).toUpperCase() + raw.source.slice(1)
        : "Website",
      createdAt: toIso(raw.created_at),
      responseSeconds,
      status,
      priority,
      messages: thread,
    };

    leads.push(leadObj);

    // Check for structured booking event first
    const bookingEvent = leadEvts.find(
      (e) =>
        (e.event_type || "").toLowerCase().includes("book") ||
        (e.event_type || "").toLowerCase().includes("appointment"),
    );

    if (bookingEvent?.event_data && bookingEvent.event_data.start) {
      const ev = bookingEvent.event_data;
      bookings.push({
        id: `APT-${raw.id.slice(0, 6).toUpperCase()}`,
        leadId: raw.id,
        start: toIso(ev.start),
        end: toIso(ev.end || new Date(new Date(ev.start).getTime() + 3600000)),
        technician: ev.technician || "Mike Reynolds",
        notification: ev.notification || "Delivered",
        address: ev.address || (raw.zip_code ? `${city}, TX ${raw.zip_code}` : `${city}, TX`),
      });
    } else if (hasActiveBooking) {
      let startIso: string;
      let endIso: string;
      let address = raw.zip_code ? `${city}, TX ${raw.zip_code}` : `${city}, TX`;

      if (confirmationMsg?.content) {
        const text = confirmationMsg.content;

        // Extract address: match "Address: ...", "Service address: ...", or full US street addresses
        const addrMatch = text.match(
          /(?:(?:Service\s+)?Address:\s*([^\n\r-]+)|(?:at|in)\s+(\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}))/i,
        );
        if (addrMatch) {
          address = (addrMatch[1] || addrMatch[2]).trim();
        } else {
          for (const m of leadMsgs) {
            const mAddr = (m.content || "").match(
              /(?:service\s+address\s+is\s+|at\s+)?(\d+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5})/i,
            );
            if (mAddr) {
              address = mAddr[1].trim();
              break;
            }
          }
        }

        // Extract time
        const timeMatch = text.match(
          /(?:Time:\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))|from\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:to|–|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)))/i,
        );
        const startTimeStr = timeMatch ? (timeMatch[1] || timeMatch[3]) : "1:00 PM";
        const endTimeStr = timeMatch ? (timeMatch[2] || timeMatch[4]) : "2:00 PM";

        const startParsed = parseTimeToHoursMinutes(startTimeStr);
        const endParsed = parseTimeToHoursMinutes(endTimeStr);

        const msgDate = new Date(confirmationMsg.created_at || raw.created_at || new Date());
        const apptDate = parseAppointmentDate(text, msgDate);

        const y = apptDate.getFullYear();
        const m = String(apptDate.getMonth() + 1).padStart(2, "0");
        const day = String(apptDate.getDate()).padStart(2, "0");

        // Construct Central Time ISO (-05:00 for Daylight Saving Time)
        const startString = `${y}-${m}-${day}T${String(startParsed.hours).padStart(2, "0")}:${String(startParsed.minutes).padStart(2, "0")}:00-05:00`;
        const endString = `${y}-${m}-${day}T${String(endParsed.hours).padStart(2, "0")}:${String(endParsed.minutes).padStart(2, "0")}:00-05:00`;

        startIso = toIso(startString);
        endIso = toIso(endString);
      } else {
        const d = new Date(raw.created_at || new Date());
        d.setUTCHours(18, 0, 0, 0);
        startIso = d.toISOString();
        const dEnd = new Date(d);
        dEnd.setUTCHours(19, 0, 0, 0);
        endIso = dEnd.toISOString();
      }

      bookings.push({
        id: `APT-${raw.id.slice(0, 6).toUpperCase()}`,
        leadId: raw.id,
        start: startIso,
        end: endIso,
        technician: "Mike Reynolds",
        notification: "Delivered",
        address,
      });
    }
  }

  const snapshot: Snapshot = {
    leads,
    bookings,
  };

  return snapshotSchema.parse(snapshot);
}

export async function updateLeadStatusOrPriority(
  leadId: string,
  updates: { status?: string; priority?: string },
) {
  const dbUpdates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    if (updates.status === "Needs attention") {
      // Postgres check constraint valid_status only allows ('NEW', 'QUALIFIED', 'BOOKED', 'CLOSED')
      // Setting NEW with ai_priority = URGENT persists "Needs attention" cleanly without constraint errors
      dbUpdates.status = "NEW";
      dbUpdates.ai_priority = "URGENT";
    } else {
      dbUpdates.status = mapUIToDbStatus(updates.status);
    }
  }

  if (updates.priority) {
    dbUpdates.ai_priority = mapUIToDbPriority(updates.priority);
  }

  const { data, error } = await supabase
    .from("leads")
    .update(dbUpdates)
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update lead ${leadId}: ${error.message}`);
  }

  return data;
}
