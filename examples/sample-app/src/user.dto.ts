export interface UserDto {
  rut: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  healthCondition?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}
