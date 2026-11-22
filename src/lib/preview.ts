import type { WorkspaceData, Role, DocumentRecord } from "./types";
export function previewData(role: Role): WorkspaceData {
  const specs = [
    [
      "Semester 4 Marksheet",
      "Academic Marksheet",
      "issued",
      "marksheet_sem4.pdf",
      245000,
    ],
    [
      "Student Identity Card",
      "Student Identity",
      "issued",
      "student_identity.pdf",
      1250000,
    ],
    [
      "Fee Receipt — Fall 2026",
      "Fee Receipt",
      "draft",
      "fee_receipt_2026.pdf",
      182000,
    ],
    [
      "Bonafide Certificate",
      "Certificate",
      "archived",
      "bonafide_certificate.pdf",
      340000,
    ],
    [
      "Semester 3 Marksheet",
      "Academic Marksheet",
      "issued",
      "marksheet_sem3.pdf",
      287000,
    ],
    [
      "Admission Letter",
      "Admission Document",
      "issued",
      "admission_letter.pdf",
      476000,
    ],
    [
      "Academic Achievement",
      "Certificate",
      "issued",
      "achievement.pdf",
      865000,
    ],
    [
      "Previous Fee Receipt",
      "Fee Receipt",
      "revoked",
      "fee_receipt_previous.pdf",
      156000,
    ],
  ];
  const documents = specs.map((s, i) => ({
    id: `preview-${i + 1}`,
    owner_id:
      i % 2 === 0
        ? "11111111-1111-4111-8111-111111111111"
        : "22222222-2222-4222-8222-222222222222",
    scope_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: s[0],
    category: s[1],
    status: s[2],
    original_filename: s[3],
    file_size: s[4],
    mime_type: "application/pdf",
    description: "Demonstration document. No real student data.",
    lifecycle_remarks:
      i === 7 ? "Superseded university record; access revoked." : null,
    issued_at:
      s[2] === "issued"
        ? `2026-11-${String(22 - i).padStart(2, "0")}T06:00:00Z`
        : null,
    issued_by: s[2] !== "draft" ? "33333333-3333-4333-8333-333333333333" : null,
    created_at: `2026-11-${String(22 - i).padStart(2, "0")}T05:00:00Z`,
    owner: {
      full_name: i % 2 === 0 ? "Nirdesh Jain" : "Ananya Sharma",
      student_identifier: i % 2 === 0 ? "KRMU2024CS0142" : "KRMU2024CS0086",
    },
  })) as DocumentRecord[];
  return {
    preview: true,
    profile: {
      id:
        role === "student"
          ? "11111111-1111-4111-8111-111111111111"
          : "33333333-3333-4333-8333-333333333333",
      full_name: role === "student" ? "Nirdesh Jain" : "Shreya Patel",
      email:
        role === "student"
          ? "nirdesh.jain@example.edu"
          : "shreya.patel@example.edu",
      role,
      student_identifier: role === "student" ? "KRMU2024CS0142" : null,
      department: "Computer Science & Engineering",
      created_at: "2024-08-12T00:00:00Z",
    },
    documents:
      role === "student"
        ? documents.filter(
            (d) =>
              d.status === "issued" &&
              d.owner_id === "11111111-1111-4111-8111-111111111111",
          )
        : documents,
    students: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        full_name: "Nirdesh Jain",
        email: "nirdesh.jain@example.edu",
        role: "student",
        student_identifier: "KRMU2024CS0142",
        department: "Computer Science & Engineering",
        created_at: "2024-08-12T00:00:00Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        full_name: "Ananya Sharma",
        email: "ananya.sharma@example.edu",
        role: "student",
        student_identifier: "KRMU2024CS0086",
        department: "Computer Science & Engineering",
        created_at: "2024-08-12T00:00:00Z",
      },
    ],
    scopes: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Computer Science — Document Issuance",
      },
    ],
    memberships: [
      ["11111111-1111-4111-8111-111111111111", "student"],
      ["22222222-2222-4222-8222-222222222222", "student"],
      ["33333333-3333-4333-8333-333333333333", "staff"],
    ].map(([user_id, membership_type]) => ({
      user_id,
      scope_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      membership_type: membership_type as Role,
    })),
    activities: [
      ["document_issued", "success", 0],
      ["document_drafted", "success", 2],
      ["document_previewed", "success", 1],
      ["document_revoked", "success", 7],
      ["unauthorized_document_access", "denied", null],
    ]
      .map((a, i) => ({
        id: `event-${i}`,
        actor_id: "11111111-1111-4111-8111-111111111111",
        action: a[0] as string,
        result: a[1] as "success" | "denied",
        resource_type: "document",
        resource_id: a[2] === null ? null : documents[a[2] as number].id,
        metadata: {},
        created_at: `2026-11-22T0${9 - i}:20:00Z`,
      }))
      .filter(
        (a) =>
          role === "staff" ||
          a.resource_id === null ||
          documents.some(
            (d) =>
              d.id === a.resource_id &&
              d.status === "issued" &&
              d.owner_id === "11111111-1111-4111-8111-111111111111",
          ),
      ),
  };
}
