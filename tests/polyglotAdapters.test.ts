import { describe, expect, it } from "vitest";
import { runCode2PiaScan } from "../src/core/scan/engine.js";
import { cppAdapter } from "../src/languages/cpp/index.js";
import { csharpAdapter } from "../src/languages/csharp/index.js";
import { goAdapter } from "../src/languages/go/index.js";
import { javaAdapter } from "../src/languages/java/index.js";
import { phpAdapter } from "../src/languages/php/index.js";
import { pythonAdapter } from "../src/languages/python/index.js";
import { rubyAdapter } from "../src/languages/ruby/index.js";
import { rustAdapter } from "../src/languages/rust/index.js";

describe("polyglot language support", () => {
  it("parses Python variables, requests/http calls, logging and env vars", () => {
    const model = pythonAdapter.parse([
      {
        path: "/repo/app.py",
        text: `import logging
import os
import requests
email = os.environ.get("CUSTOMER_EMAIL")
logging.info(email)
requests.post("https://api.example.com", json={"email": email})`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["email", "CUSTOMER_EMAIL"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("python");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses Java fields, getters, REST clients and logging", () => {
    const model = javaAdapter.parse([
      {
        path: "/repo/Customer.java",
        text: `class Customer {
  private String email;
  public String getRut() { return rut; }
  void send() { log.info(email); new RestTemplate().postForObject("https://api.example.com", this, String.class); }
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["email", "rut"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("java");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses Go struct fields, HTTP calls and logging", () => {
    const model = goAdapter.parse([
      {
        path: "/repo/customer.go",
        text: `type Customer struct {
  Rut string
  Email string
}
func send(c Customer) {
  fmt.Println(c.Email)
  http.Post("https://api.example.com", "application/json", nil)
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["rut", "email"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("go");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses Ruby Rails params, attributes, HTTP calls and logging", () => {
    const model = rubyAdapter.parse([
      {
        path: "/repo/customer_controller.rb",
        text: `class CustomerController
  attr_accessor :rut, :email
  def create
    payload = params.require(:customer).permit(:rut, :email, :phone)
    Rails.logger.info(payload[:email])
    Faraday.post("https://api.example.com", payload)
  end
end`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["rut", "email", "phone"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("ruby");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses PHP request input, superglobals, Laravel fillable and logging", () => {
    const model = phpAdapter.parse([
      {
        path: "/repo/CustomerController.php",
        text: `<?php
class CustomerController {
  protected $fillable = ['rut', 'email'];
  public function store($request) {
    $email = $request->input('email');
    $phone = $_POST['phone'];
    Log::info($email);
    Http::post('https://api.example.com', ['email' => $email]);
  }
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["rut", "email", "phone"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("php");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses C++ struct fields, JSON keys, HTTP calls and logging", () => {
    const model = cppAdapter.parse([
      {
        path: "/repo/patient.cpp",
        text: `struct Patient {
  std::string rut;
  std::string email;
  std::string healthCondition;
};
void send(Patient user) {
  auto value = json["email"];
  std::cout << user.email;
  httpClient.post("https://api.example.com", user.email);
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["rut", "email", "healthCondition"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("cpp");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses Rust struct fields, serde names, reqwest calls and logging", () => {
    const model = rustAdapter.parse([
      {
        path: "/repo/patient.rs",
        text: `#[derive(Serialize, Deserialize)]
struct Patient {
  rut: String,
  email: String,
  #[serde(rename = "birthDate")]
  birth_date: String,
  latitude: f64,
}
async fn send(user: Patient) {
  println!("{:?}", user.email);
  reqwest::Client::new().post("https://api.example.com").send().await;
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["rut", "email", "birthDate", "latitude"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("rust");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("parses C# DTO properties and record parameters", () => {
    const model = csharpAdapter.parse([
      {
        path: "/repo/PatientRequest.cs",
        text: `public record PatientRecord(string Email, string Rut);
public class PatientRequest
{
  public string Email { get; set; }
  public string Rut { get; set; }
  public string BirthDate { get; set; }
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["Email", "Rut", "BirthDate"]));
    expect(model.dataFields[0]?.evidence.language).toBe("csharp");
  });

  it("parses C# ASP.NET request models, logging, HTTP calls and environment usage", () => {
    const model = csharpAdapter.parse([
      {
        path: "/repo/PatientsController.cs",
        text: `using Microsoft.AspNetCore.Mvc;
public class PatientsController : ControllerBase
{
  private readonly HttpClient _httpClient;
  public async Task<IActionResult> Create([FromBody] PatientRequest request, [FromQuery] string email)
  {
    var endpoint = Environment.GetEnvironmentVariable("CUSTOMER_EMAIL");
    _logger.LogInformation("Customer {Email}", request.Email);
    Console.WriteLine(request.Rut);
    await _httpClient.PostAsync("https://api.example.com", new StringContent(request.Email));
  }
}`
      }
    ]);

    expect(model.dataFields.map((field) => field.name)).toEqual(expect.arrayContaining(["request", "email", "CUSTOMER_EMAIL"]));
    expect(model.loggingCalls.map((call) => call.name)).toEqual(expect.arrayContaining(["_logger.LogInformation", "Console.WriteLine"]));
    expect(model.loggingCalls[0]?.evidence.language).toBe("csharp");
    expect(model.externalCalls.length).toBeGreaterThan(0);
  });

  it("runs the same detectors consistently across languages", async () => {
    const report = await runCode2PiaScan("examples/polyglot-app", { jurisdiction: "CL-LEY-21719" });

    expect(report.scan.languagesDetected).toEqual(expect.arrayContaining(["typescript", "python", "java", "go", "ruby", "php", "cpp", "rust", "csharp"]));
    expect(report.scanResult.personalData.map((item) => item.category)).toEqual(
      expect.arrayContaining(["email", "rut", "phone", "address", "birthDate", "health", "accountNumber", "location"])
    );
    expect(report.scanResult.findings.some((finding) => finding.type === "personal_data_in_logs")).toBe(true);
    expect(report.scanResult.findings.some((finding) => finding.evidence.some((item) => item.language === "python"))).toBe(true);
    expect(report.scanResult.findings.map((finding) => finding.language)).toEqual(expect.arrayContaining(["ruby", "php", "cpp", "rust", "csharp"]));
  });
});
