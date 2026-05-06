class CustomerController
  attr_accessor :rut, :email, :phone

  def create
    payload = params.require(:customer).permit(:rut, :email, :address, :birthDate)
    Rails.logger.info(payload[:email])
    Faraday.post("https://analytics.example.com/events", payload)
  end
end
