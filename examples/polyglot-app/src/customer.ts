export interface CustomerDto {
  rut: string;
  email: string;
}

const customer: CustomerDto = {
  rut: "12345678-9",
  email: "customer@example.com",
};

console.log("customer", customer.email);
