import mixpanel from "mixpanel-browser";

export function trackPatientPortalLogin(email: string) {
  mixpanel.track("patient_portal_login", { email });
}
