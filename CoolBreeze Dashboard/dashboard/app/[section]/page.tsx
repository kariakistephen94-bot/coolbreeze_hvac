import Dashboard from "@/components/dashboard";
const sections = [
  "Leads",
  "Conversations",
  "Appointments",
  "Automations",
  "Settings",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section: section.toLowerCase() }));
}
export const dynamicParams = false;
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return (
    <Dashboard
      section={sections.find((s) => s.toLowerCase() === section) || "Overview"}
    />
  );
}
