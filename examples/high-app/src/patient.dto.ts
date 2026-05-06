export interface PatientDto {
  rut: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  healthCondition: string;
  accountNumber: string;
  location: {
    latitude: number;
    longitude: number;
  };
}
