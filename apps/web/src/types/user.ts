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
  uuid?: string;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  department: string;
  employeeNumber: string;
  is_active: boolean;
  imageUrl?: string;
  permissions?: string[];
  password?: string;
  created_at?: string;
  updated_at?: string;
  // FC 082 F3b Cond.6 — catálogo real post-mig.164 es {FLOTILLA, ARCHONAUT}
  // (PRIVATE/CENTER retirados en owner_types_catalog, mig.164 directriz 5).
  ownerType?: 'FLOTILLA' | 'ARCHONAUT' | null;
  tenantId?: number | null;
  availableTenants?: number[];
}
