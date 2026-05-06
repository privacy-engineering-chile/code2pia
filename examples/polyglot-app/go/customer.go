package main

import (
  "fmt"
  "net/http"
)

type Customer struct {
  Rut string
  Email string
}

func send(customer Customer) {
  fmt.Println(customer.Email)
  http.Post("https://api.example.com/customers", "application/json", nil)
}
