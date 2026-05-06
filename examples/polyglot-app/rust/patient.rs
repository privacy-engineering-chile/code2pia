use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct Patient {
    rut: String,
    email: String,
    #[serde(rename = "birthDate")]
    birth_date: String,
    latitude: f64,
}

async fn send(user: Patient) {
    println!("{:?}", user.email);
    reqwest::Client::new()
        .post("https://clinic.example.com/patients")
        .send()
        .await;
}
