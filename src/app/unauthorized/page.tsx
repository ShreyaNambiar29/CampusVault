import Link from "next/link";
import { ShieldX, ArrowLeft, LockKeyhole } from "lucide-react";
export default function Page() {
  return (
    <main className="denied-page">
      <div className="denied-orbit">
        <ShieldX size={90} />
        <LockKeyhole size={25} />
      </div>
      <span className="eyebrow light">PROTECTED WORKSPACE</span>
      <h1>Access denied.</h1>
      <p>
        You don’t have permission to access this resource.
        <br />
        Your documents and everyone else’s stay protected.
      </p>
      <Link className="btn btn-primary" href="/">
        <ArrowLeft size={16} />
        Back to my workspace
      </Link>
      <small>CampusVault · Secure by design</small>
    </main>
  );
}
