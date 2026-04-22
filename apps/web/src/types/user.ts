/**
 * 🔱 Archon Types: User
 * Implementation: Industrial Personnel Schema
 * v.28.23.6 - Build Stabilization & CamelCase Standardization
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
  fullName: string;
  email: string;
  roleId: number;
  department: string;
  employeeNumber: string;
  is_active: boolean;
  imageUrl?: string;
  password?: string;
  role?: Role;
  created_at?: string;
  updated_at?: string;
}
