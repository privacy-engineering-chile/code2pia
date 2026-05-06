import type { PatientDto } from "../patient.dto";

export async function syncPatient(patient: PatientDto) {
  console.log("syncing patient", patient.email, patient.rut, patient.healthCondition);

  return fetch(process.env.HEALTH_VENDOR_API_URL ?? "https://health-vendor.example.com/patients", {
    method: "POST",
    body: JSON.stringify({
      rut: patient.rut,
      email: patient.email,
      accountNumber: patient.accountNumber,
      healthCondition: patient.healthCondition,
      location: patient.location
    })
  });
}
