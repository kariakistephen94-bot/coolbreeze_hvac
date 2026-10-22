import { z } from "zod";
export const statuses = [
  "New",
  "In conversation",
  "Booked",
  "Needs attention",
  "Closed",
] as const;
export const priorities = ["Normal", "High", "Urgent"] as const;
export const leadSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  service: z.string(),
  city: z.string(),
  source: z.string(),
  createdAt: z.string().datetime(),
  responseSeconds: z.number().nullable(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  messages: z.array(
    z.object({
      sender: z.enum(["Customer", "Assistant", "Team"]),
      text: z.string(),
      at: z.string().datetime(),
    }),
  ),
});
export type Lead = z.infer<typeof leadSchema>;
export const bookingSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  technician: z.string(),
  notification: z.enum(["Delivered", "Pending", "Failed"]),
  address: z.string(),
});
export type Booking = z.infer<typeof bookingSchema>;
export const snapshotSchema = z.object({
  leads: z.array(leadSchema),
  bookings: z.array(bookingSchema),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const demoNow = "2026-10-17T17:00:00Z";
export const timezone = "America/Chicago";
export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}
const people = [
  [
    "Emma Wilson",
    "AC not cooling",
    "Dallas",
    "Website",
    "Needs attention",
    "Urgent",
    null,
  ],
  [
    "James Miller",
    "Fall furnace tune-up",
    "Plano",
    "Google Ads",
    "Booked",
    "Normal",
    24,
  ],
  [
    "Olivia Davis",
    "AC repair",
    "Dallas",
    "Website",
    "In conversation",
    "High",
    18,
  ],
  [
    "Noah Thompson",
    "Heat pump installation",
    "Frisco",
    "Referral",
    "Booked",
    "Normal",
    32,
  ],
  ["Ava Martinez", "Duct cleaning", "Irving", "Website", "New", "Normal", null],
  [
    "William Johnson",
    "Thermostat replacement",
    "Dallas",
    "Google Ads",
    "Booked",
    "Normal",
    21,
  ],
  [
    "Sophia Brown",
    "Furnace repair",
    "Richardson",
    "Website",
    "In conversation",
    "High",
    16,
  ],
  [
    "Liam Anderson",
    "Seasonal maintenance",
    "Plano",
    "Referral",
    "Closed",
    "Normal",
    29,
  ],
  [
    "Isabella Garcia",
    "AC installation estimate",
    "Dallas",
    "Website",
    "Booked",
    "Normal",
    23,
  ],
  [
    "Lucas Taylor",
    "Airflow inspection",
    "Irving",
    "Google Ads",
    "In conversation",
    "Normal",
    27,
  ],
  [
    "Mia Robinson",
    "Furnace tune-up",
    "Frisco",
    "Website",
    "Booked",
    "Normal",
    19,
  ],
  ["Ethan Clark", "AC repair", "Dallas", "Referral", "Closed", "High", 31],
] as const;
export const demoData: Snapshot = {
  leads: people.map((p, i) => {
    const at = `2026-10-${String(17 - Math.floor(i / 3)).padStart(2, "0")}T${String(16 - (i % 3)).padStart(2, "0")}:10:00Z`;
    return {
      id: `CB-${1048 - i}`,
      name: p[0],
      email: p[0].toLowerCase().replace(" ", ".") + "@example.com",
      phone: `(214) 555-${String(100 + i).padStart(4, "0")}`,
      service: p[1],
      city: p[2],
      source: p[3],
      status: p[4],
      priority: p[5],
      responseSeconds: p[6],
      createdAt: at,
      messages: [
        {
          sender: "Customer",
          text:
            i === 0
              ? "Our AC is running but the house is still warm. Can someone come out today?"
              : `Hi, I’d like to schedule ${p[1].toLowerCase()}. I’m in ${p[2]}.`,
          at,
        },
        ...(p[6] === null
          ? []
          : [
              {
                sender: "Assistant" as const,
                text: `Thanks for reaching out to CoolBreeze. We can help with ${p[1].toLowerCase()}. What day works best for you?`,
                at: new Date(
                  new Date(at).getTime() + p[6] * 1000,
                ).toISOString(),
              },
            ]),
        ...(p[4] === "Booked"
          ? [
              {
                sender: "Customer" as const,
                text: "That appointment time works for me. Thank you!",
                at: new Date(new Date(at).getTime() + 180000).toISOString(),
              },
              {
                sender: "Assistant" as const,
                text: "Your appointment is confirmed. You’ll receive an email with your appointment details.",
                at: new Date(new Date(at).getTime() + 200000).toISOString(),
              },
            ]
          : []),
      ],
    };
  }),
  bookings: [
    {
      id: "APT-201",
      leadId: "CB-1047",
      start: "2026-10-19T14:00:00Z",
      end: "2026-10-19T15:00:00Z",
      technician: "Mike Reynolds",
      notification: "Delivered",
      address: "1204 Oak Lane, Plano, TX",
    },
    {
      id: "APT-202",
      leadId: "CB-1045",
      start: "2026-10-19T16:00:00Z",
      end: "2026-10-19T17:30:00Z",
      technician: "David Chen",
      notification: "Delivered",
      address: "805 Maple Drive, Frisco, TX",
    },
    {
      id: "APT-203",
      leadId: "CB-1043",
      start: "2026-10-20T15:00:00Z",
      end: "2026-10-20T16:00:00Z",
      technician: "Mike Reynolds",
      notification: "Pending",
      address: "2310 Elm Street, Dallas, TX",
    },
    {
      id: "APT-204",
      leadId: "CB-1040",
      start: "2026-10-21T18:00:00Z",
      end: "2026-10-21T19:00:00Z",
      technician: "David Chen",
      notification: "Delivered",
      address: "708 Cedar Lane, Dallas, TX",
    },
    {
      id: "APT-205",
      leadId: "CB-1038",
      start: "2026-10-22T14:00:00Z",
      end: "2026-10-22T15:00:00Z",
      technician: "Mike Reynolds",
      notification: "Failed",
      address: "619 Pine Road, Frisco, TX",
    },
  ],
};
export function metrics(leads: Lead[]) {
  const responded = leads.filter((l) => l.responseSeconds !== null);
  const booked = leads.filter((l) => l.status === "Booked").length;
  return {
    total: leads.length,
    average: responded.length
      ? Math.round(
          responded.reduce((n, l) => n + l.responseSeconds!, 0) /
            responded.length,
        )
      : null,
    booked,
    conversion: leads.length ? Math.round((booked / leads.length) * 100) : 0,
  };
}
export function filterLeads(
  leads: Lead[],
  query: string,
  status: string,
  priority: string,
) {
  return leads.filter(
    (l) =>
      (status === "All statuses" || l.status === status) &&
      (priority === "All priorities" || l.priority === priority) &&
      `${l.name} ${l.email} ${l.service} ${l.id} ${l.city}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
}
