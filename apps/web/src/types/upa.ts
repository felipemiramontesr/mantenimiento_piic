export type UpaFleetType = 'urban' | 'mining';
export type UpaTaskStage = 'triage' | 'minor_service' | 'cascade' | 'deferred' | 'closure';
export type UpaPackageLevel = '10k' | '20k' | '30k' | '50k';
export type UpaTaskStatus = 'pending' | 'completed' | 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL';
export type UpaOrderStatus = 'IN_PROGRESS' | 'AWAITING_AUTH' | 'CLOSED';
export type UpaDeferredType = 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL';

export interface UpaTaskDetail {
  taskId: string;
  stage: UpaTaskStage;
  packageLevel: UpaPackageLevel | null;
  description: string;
  status: UpaTaskStatus;
  evidenceUrls: string[] | null;
  evidenceNotes: string | null;
  completedAt: string | null;
}

export interface UpaWorkOrderDetail {
  id: number;
  uuid: string;
  vehicleId: string;
  fleetType: UpaFleetType;
  status: UpaOrderStatus;
  pendingSince: string | null;
  openedAt: string;
  closedAt: string | null;
  tasks: UpaTaskDetail[];
}

export interface UpaInitPayload {
  vehicleId: string;
}

export interface UpaInitResult {
  workOrderId: number;
  uuid: string;
  taskCount: number;
}

export interface UpaUpdateTaskPayload {
  status: UpaTaskStatus;
  evidenceUrls?: string[];
  evidenceNotes?: string;
}
