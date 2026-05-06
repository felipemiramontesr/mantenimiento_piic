import { FleetUnit } from '../../../types/fleet';
import { SelectOption } from '../../ArchonSelect';

export interface RouteAssignmentFormData {
  unitId: string;
  operatorId: string;
  origin: string;
  destination: string;
  description: string;
  fuelLevel: number;
  startReading: number;
  endReading: number;
  fuelLitersLoaded: number;
  fuelTicketImage: string;
}

export interface RouteAssignmentPanelProps {
  formData: RouteAssignmentFormData;
  updateForm: (updates: Partial<RouteAssignmentFormData>) => void;
  isEdit: boolean;
  isFinished: boolean;
}

export interface RouteIdentityPanelProps extends RouteAssignmentPanelProps {
  availableUnits: SelectOption[];
  operatorOptions: SelectOption[];
  selectedUnitData?: FleetUnit | null;
}
