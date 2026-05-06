using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

public record PatientRecord(string Email, string Rut);

public class PatientRequest
{
    public string Email { get; set; }
    public string Rut { get; set; }
    public string BirthDate { get; set; }
    public string HealthCondition { get; set; }
}

[ApiController]
public class PatientsController : ControllerBase
{
    private readonly ILogger<PatientsController> _logger;
    private readonly HttpClient _httpClient;

    public async Task<IActionResult> Create([FromBody] PatientRequest request, [FromQuery] string email)
    {
        var endpoint = Environment.GetEnvironmentVariable("PATIENT_API_URL");
        _logger.LogInformation("Creating patient {Email}", request.Email);
        await _httpClient.PostAsync("https://clinic.example.com/patients", new StringContent(request.Email));
        return Ok();
    }
}
