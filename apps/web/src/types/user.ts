/**
 * 🔱 Archon Types: User
 * Implementation: Industrial Personnel Schema
 * v.28.23.4 - Build Stabilization
 */

export type UserPanel = 'DIRECTORY' | 'SIGNUP';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface UserIndustrial {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  department: string;
  employee_number: string;
  is_active: boolean;
  role?: Role;
  created_at?: string;
  updated_at?: string;
}
