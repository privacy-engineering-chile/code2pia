import org.springframework.web.client.RestTemplate;

public class CustomerDto {
  private String rut;
  private String email;

  public String getEmail() {
    return email;
  }

  public void send(CustomerDto customer) {
    log.info(customer.email);
    new RestTemplate().postForObject("https://api.example.com/customers", customer, String.class);
  }
}
