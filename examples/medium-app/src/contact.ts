export interface ContactRequest {
  email: string;
  message: string;
}

export const processingPurpose = "Respond to inbound support requests.";
export const retentionPeriod = "Keep contact requests for 90 days.";

export async function submitContactRequest(request: ContactRequest) {
  return fetch("/api/contact", {
    method: "POST",
    body: JSON.stringify({
      email: request.email,
      message: request.message
    })
  });
}
