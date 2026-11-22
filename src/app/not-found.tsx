import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>A little off campus.</h1>
      <p>This page doesn’t exist. Let’s get you back to your workspace.</p>
      <Link href="/" className="btn btn-primary">
        Back to CampusVault
      </Link>
    </main>
  );
}
