export interface ProfileFormData {
  fullName: string;
  email: string;
  employeeNumber: string;
  imageUrl: string;
  password: string;
  confirmPassword: string;
}

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  fullName: '',
  email: '',
  employeeNumber: '',
  imageUrl: '',
  password: '',
  confirmPassword: '',
};
