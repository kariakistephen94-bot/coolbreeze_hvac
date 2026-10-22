import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "40px", textAlign: "center", color: "#f8fafc" }}>
      <h2>Page Not Found</h2>
      <p style={{ marginTop: "12px" }}>
        <Link href="/" style={{ color: "#38bdf8", textDecoration: "underline" }}>
          Return to Dashboard
        </Link>
      </p>
    </div>
  );
}
