#include <iostream>
#include <string>

struct Patient {
  std::string rut;
  std::string email;
  std::string healthCondition;
};

void send(Patient user) {
  auto value = json["email"];
  std::cout << user.email;
  httpClient.post("https://clinic.example.com/patients", user.email);
}
