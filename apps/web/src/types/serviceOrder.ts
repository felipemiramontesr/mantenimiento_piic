import React from 'react';
import { CatalogOption } from './fleet';

/**
 * 🔱 Archon Service Order Interface
 * Industrial contract for maintenance record entries.
 */
export interface ServiceOrder {
  id?: number;
  unitId: string;
  folio?: string;
  serviceDate: string;
  odometerAtService: number;
  serviceTypeId: number;
  providerId: number;
  statusId: number;
  laborCost: number;
  partsCost: number;
  totalCost?: number;
  description: string;
  technicianName: string;
  invoiceNumber: string;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 🔱 Payload for creating a new Service Order
 */
export type CreateServiceOrder = Omit<
  ServiceOrder,
  'id' | 'folio' | 'totalCost' | 'createdAt' | 'updatedAt'
>;

/**
 * 🔱 Hook Return Interface for Service Order Forms
 */
export interface UseServiceOrderFormReturn {
  formData: CreateServiceOrder;
  setFormData: (data: CreateServiceOrder) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  resetError: () => void;
  // Catalogs
  serviceTypes: CatalogOption[];
  serviceStatuses: CatalogOption[];
  providers: CatalogOption[];
  // Actions
  handleSubmit: (e: React.FormEvent, onSuccess?: () => void) => Promise<void>;
}
