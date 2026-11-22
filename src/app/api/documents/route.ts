import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
// The previous student multipart endpoint is deliberately retired, not redirected into issuance.
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await authorize("staff");
    throw new HttpError(410, "Use the Staff issuance upload workflow.");
  } catch (e) {
    return failure(e);
  }
}
