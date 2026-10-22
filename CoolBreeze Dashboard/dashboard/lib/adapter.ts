import { demoData, snapshotSchema, type Snapshot } from "./data";

export interface DashboardAdapter {
  load(): Promise<Snapshot>;
}

export class DemoAdapter implements DashboardAdapter {
  async load() {
    return structuredClone(demoData);
  }
}

/** Contract for an authenticated HTTP backend. Never silently falls back to demo data. */
export class HttpAdapter implements DashboardAdapter {
  constructor(
    private endpoint: string,
    private getToken: () => Promise<string>,
  ) {}
  async load() {
    const token = await this.getToken();
    const response = await fetch(this.endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(`Dashboard request failed (${response.status})`);
    return snapshotSchema.parse(await response.json());
  }
}

/** Live Supabase Adapter calling the dynamic Next.js Route Handler */
export class SupabaseAdapter implements DashboardAdapter {
  constructor(private endpoint: string = "/api/dashboard") {}

  async load(): Promise<Snapshot> {
    const response = await fetch(this.endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Failed to load live data from Supabase (${response.status}): ${text}`,
      );
    }

    const data = await response.json();
    return snapshotSchema.parse(data);
  }

  async updateLead(
    leadId: string,
    updates: { status?: string; priority?: string },
  ) {
    const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update lead (${response.status})`);
    }

    return response.json();
  }
}
