import type { UserDto } from "../user.dto";

export async function createUser(user: UserDto) {
  console.log("creating user", user.email, user.rut);

  return fetch(process.env.CRM_API_URL ?? "https://crm.example.com/users", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      rut: user.rut,
      healthCondition: user.healthCondition,
      location: user.location
    })
  });
}
