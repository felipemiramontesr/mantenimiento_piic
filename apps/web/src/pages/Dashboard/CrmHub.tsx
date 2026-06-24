import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Contact, FileText, Layers, MessageSquare, Mail } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';

interface CrmCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  accent: string;
  testId: string;
  omnipotentOnly: boolean;
}

const CRM_CARDS: CrmCard[] = [
  {
    title: 'Directorio',
    description: 'Clientes y contactos del portafolio',
    icon: <Contact size={20} />,
    path: '/dashboard/contacts',
    accent: '#0f2a44',
    testId: 'crm-card-directorio',
    omnipotentOnly: false,
  },
  {
    title: 'Contratos',
    description: 'Vigencia de contratos y SLAs',
    icon: <FileText size={20} />,
    path: '/dashboard/contracts',
    accent: '#0ea5e9',
    testId: 'crm-card-contratos',
    omnipotentOnly: false,
  },
  {
    title: 'Pipeline',
    description: 'Embudo de negociaciones y oportunidades',
    icon: <Layers size={20} />,
    path: '/dashboard/pipeline',
    accent: '#8b5cf6',
    testId: 'crm-card-pipeline',
    omnipotentOnly: false,
  },
  {
    title: 'Interacciones',
    description: 'Bitácora de llamadas y contactos',
    icon: <MessageSquare size={20} />,
    path: '/dashboard/interactions',
    accent: '#10b981',
    testId: 'crm-card-interacciones',
    omnipotentOnly: false,
  },
  {
    title: 'Campañas',
    description: 'Automatización de comunicaciones y campañas',
    icon: <Mail size={20} />,
    path: '/dashboard/campaigns',
    accent: '#f2b705',
    testId: 'crm-card-campanas',
    omnipotentOnly: true,
  },
];

const CrmHub: React.FC = () => {
  const navigate = useNavigate();
  const { setSectionData } = useSovereignLayout();
  const { hasPermission, isOmnipotent } = usePermissions();

  const visibleCards = CRM_CARDS.filter((card) =>
    card.omnipotentOnly ? isOmnipotent() : hasPermission('fleet:view')
  );

  useEffect(() => {
    setSectionData('CRM', 'Gestión de Relaciones con Clientes', null);
  }, [setSectionData]);

  useEffect(() => {
    if (visibleCards.length === 0) {
      navigate('/dashboard');
    }
  }, [navigate, visibleCards.length]);

  return (
    <div className="animate-in fade-in duration-700" data-testid="crm-hub">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="archon-grid-sovereign">
              {visibleCards.map((card) => (
                <div
                  key={card.testId}
                  className="card-archon-sovereign"
                  style={{ '--card-accent': card.accent } as React.CSSProperties}
                  data-testid={card.testId}
                >
                  <div className="card-sovereign-header">
                    <span style={{ color: card.accent }}>{card.icon}</span>
                    <span className="card-sovereign-title">{card.title}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center pb-8">
                    <p className="card-sovereign-kpi-label text-center">{card.description}</p>
                  </div>
                  <button
                    onClick={(): void => navigate(card.path)}
                    className="btn-archon-card-action"
                    data-testid={`${card.testId}-btn`}
                  >
                    ABRIR MÓDULO <ArrowRight size={12} className="ml-2" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CrmHub;
