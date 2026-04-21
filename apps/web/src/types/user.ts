import { Role } from './auth';

/**
 * 🔱 Archon Type: UserIndustrial
 * Purpose: Industrial-grade identity for personnel management.
 * v.28.23.0 - Sovereign Identity Enabled
 */

export type UserPanel = 'DIRECTORY' | 'SIGNUP';

export interface UserIndustrial {
  id: string; // Internal UUID
  employee_number?: string; // Encrypted/Clear depending on decrypt filter
  employee_number_hash?: string;
  username: string;
  full_name: string;
  email: string;
  email_hash?: string;
  role_id: number;
  role?: Role;
  department?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserRegistrationPayload {
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  department?: string;
  employee_number?: string;
}

export interface RegistrationResponse {
  success: boolean;
  user?: UserIndustrial;
  tempPassword?: string; // System-generated temporary password
  error?: string;
}
