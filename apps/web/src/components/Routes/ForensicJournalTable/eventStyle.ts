import React from 'react';
import { Shield, Clock, Activity, AlertTriangle } from 'lucide-react';

export interface EventStyle {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}

/** Mapea `event_type` a su presentación visual (label/color/ícono). */
export function getEventStyle(type: string): EventStyle {
  switch (type) {
    case 'ROUTE_START':
      return { label: 'SALIDA', color: 'text-pinnacle-navy', bg: 'bg-emerald-50', icon: Activity };
    case 'ROUTE_FINISH':
      return { label: 'ENTRADA', color: 'text-pinnacle-navy', bg: 'bg-blue-50', icon: Shield };
    case 'ROUTE_INCIDENT':
      return {
        label: 'INCIDENCIA',
        color: 'text-pinnacle-navy',
        bg: 'bg-rose-50',
        icon: AlertTriangle,
      };
    case 'ADMIN_EDIT':
      return { label: 'CORRECCIÓN', color: 'text-pinnacle-navy', bg: 'bg-rose-50', icon: Shield };
    default:
      return { label: 'EVENTO', color: 'text-pinnacle-navy', bg: 'bg-gray-50', icon: Clock };
  }
}
