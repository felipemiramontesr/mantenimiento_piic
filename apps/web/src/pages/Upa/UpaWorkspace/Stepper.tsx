import React from 'react';
import { CheckCircle } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Triaje' },
  { n: 2, label: 'Serv. Menor' },
  { n: 3, label: 'Cascada' },
  { n: 4, label: 'Diferidos' },
  { n: 5, label: 'Autorización' },
  { n: 6, label: 'Cierre' },
];

function getStepCircleClass(stepN: number, current: number): string {
  if (stepN < current) return 'bg-[#0f2a44] text-white';
  if (stepN === current) return 'bg-[#f2b705] text-[#0f2a44] ring-4 ring-[#f2b705]/20';
  return 'bg-slate-100 text-slate-400';
}

function getStepLabelClass(stepN: number, current: number): string {
  if (stepN < current) return 'text-[#0f2a44]';
  if (stepN === current) return 'text-[#f2b705]';
  return 'text-slate-400';
}

/** Barra de progreso de 6 pasos del pipeline UPA (FC163 F2B4 Sub-Batch 4B-2). */
const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div data-testid="upa-stepper" className="flex items-start w-full my-6 overflow-x-auto pb-2">
    {STEPS.map((step, i) => (
      <React.Fragment key={step.n}>
        <div className="flex flex-col items-center flex-shrink-0 min-w-[60px]">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${getStepCircleClass(
              step.n,
              currentStep
            )}`}
          >
            {step.n < currentStep ? <CheckCircle size={16} /> : step.n}
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 text-center leading-tight ${getStepLabelClass(
              step.n,
              currentStep
            )}`}
          >
            {step.label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={`flex-1 h-[2px] mt-[18px] mx-1 transition-all duration-300 min-w-[12px] ${
              step.n < currentStep ? 'bg-[#0f2a44]' : 'bg-slate-200'
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

export default Stepper;
