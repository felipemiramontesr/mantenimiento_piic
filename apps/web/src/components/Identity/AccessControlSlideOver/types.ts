export interface PersonnelRecord {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName?: string;
  is_active?: boolean;
}

export interface PersonnelFormData {
  username: string;
  email: string;
  password: string;
  roleId: number;
}
