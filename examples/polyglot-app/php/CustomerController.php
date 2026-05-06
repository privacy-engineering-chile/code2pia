<?php

use Illuminate\Support\Facades\Log;

class CustomerController
{
    protected $fillable = ['rut', 'email', 'phone', 'accountNumber'];

    public function store($request)
    {
        $email = $request->input('email');
        $phone = $_POST['phone'];
        Log::info($email);
        Http::post('https://billing.example.com/customers', ['email' => $email, 'phone' => $phone]);
    }
}
