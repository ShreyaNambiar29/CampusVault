import { ShieldCheck } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        <ShieldCheck size={25} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span>
          Campus<span className="brand-accent">Vault</span>
          <small>UNIVERSITY DOCUMENT VAULT</small>
        </span>
      )}
    </div>
  );
}
