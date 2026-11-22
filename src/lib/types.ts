export type Role = "student" | "staff";
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  student_identifier: string | null;
  department: string | null;
  created_at: string;
};
export type DocumentRecord = {
  id: string;
  owner_id: string;
  scope_id: string;
  title: string;
  category: string;
  description: string | null;
  original_filename: string;
  mime_type: string;
  file_size: number;
  status: "draft" | "issued" | "archived" | "revoked";
  legacy_status?: string | null;
  lifecycle_remarks: string | null;
  issued_at: string | null;
  issued_by?: string | null;
  created_at: string;
  owner?: { full_name: string; student_identifier: string | null };
};
export type Activity = {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  result: "success" | "denied" | "failure";
  metadata: Record<string, unknown>;
  created_at: string;
};
export type WorkspaceData = {
  profile: Profile;
  documents: DocumentRecord[];
  activities: Activity[];
  preview: boolean;
  students?: Profile[];
  memberships?: { user_id: string; scope_id: string; membership_type: Role }[];
  scopes?: { id: string; name: string }[];
};
export const categories = [
  "Academic Marksheet",
  "Student Identity",
  "Admission Document",
  "Certificate",
  "Fee Receipt",
  "Other",
] as const;
