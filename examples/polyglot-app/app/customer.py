import logging
import os
import requests

email = os.environ.get("CUSTOMER_EMAIL")
rut = "11111111-1"

logging.info(email)
requests.post("https://api.example.com/customers", json={"email": email, "rut": rut})
