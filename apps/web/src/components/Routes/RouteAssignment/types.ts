import { FleetUnit } from '../../../types/fleet';
import { SelectOption } from '../../ArchonSelect';

export interface RouteAssignmentFormData {
  unitId: string;
  operatorId: string;
  origin: string;
  destination: string;
  destinationColoniaId?: number;
  description: string;
  fuelLevel: number | string;
  arrivalFuelLevel: number | string;
  startReading: number | string;
  endReading: number | string;
  fuelLitersLoaded: number | string;
  fuelAmount: number | string;
  fuelTicketImage: string;
  additivesCheck: boolean;
  tirePressureJson: string;
  checklistJson: string;
}

export interface RouteAssignmentPanelProps {
  formData: RouteAssignmentFormData;
  updateForm: (updates: Partial<RouteAssignmentFormData>) => void;
  isEdit: boolean;
}

export interface RouteIdentityPanelProps extends RouteAssignmentPanelProps {
  availableUnits: SelectOption[];
  operatorOptions: SelectOption[];
  selectedUnitData?: FleetUnit | null;
  isFinished: boolean;
}
export interface RouteClosurePanelProps extends RouteAssignmentPanelProps {
  tankCapacity: number;
}
