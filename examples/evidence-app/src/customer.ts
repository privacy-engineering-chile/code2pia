export const privacyActivity = "customer_registration";

export interface CreateCustomerDto {
  rut: string;
  email: string;
  fullName: string;
}

export async function registerCustomer(customer: CreateCustomerDto) {
  return fetch("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      rut: customer.rut,
      email: customer.email,
      fullName: customer.fullName
    })
  });
}
