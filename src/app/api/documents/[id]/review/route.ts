import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await authorize("staff");
    throw new HttpError(
      410,
      "Document verification is retired. Use issuance management.",
    );
  } catch (e) {
    return failure(e);
  }
}
