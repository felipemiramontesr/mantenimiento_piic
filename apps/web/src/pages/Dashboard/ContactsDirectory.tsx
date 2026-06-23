import React, { useState } from 'react';
import { Users, Mail, Phone, Building2, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useContacts, Contact } from '../../hooks/useContacts';
import AT from '../../styles/archonTypography';

const ContactCard: React.FC<{ contact: Contact }> = ({ contact }) => (
  <div
    data-testid="contact-card"
    className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow duration-150"
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className={AT.cellValue}>{contact.fullName}</p>
        {contact.roleLabel && <p className={AT.cellMeta}>{contact.roleLabel}</p>}
      </div>
      <span
        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-widest ${
          contact.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {contact.isActive ? 'Activo' : 'Inactivo'}
      </span>
    </div>

    {contact.company && (
      <div className="flex items-center gap-1.5 text-archon-sm text-slate-600">
        <Building2 size={13} className="shrink-0 text-slate-400" />
        <span>{contact.company}</span>
      </div>
    )}

    {contact.email && (
      <div className="flex items-center gap-1.5 text-archon-sm text-[#0f2a44]/70">
        <Mail size={13} className="shrink-0 text-slate-400" />
        <a href={`mailto:${contact.email}`} className="hover:underline truncate">
          {contact.email}
        </a>
      </div>
    )}

    {contact.phone && (
      <div className="flex items-center gap-1.5 text-archon-sm text-[#0f2a44]/70">
        <Phone size={13} className="shrink-0 text-slate-400" />
        <a href={`tel:${contact.phone}`} className="hover:underline">
          {contact.phone}
        </a>
      </div>
    )}

    {contact.notes && (
      <p className="text-archon-xs text-slate-400 italic border-t border-slate-100 pt-2 mt-1 line-clamp-2">
        {contact.notes}
      </p>
    )}
  </div>
);

const ContactsDirectory: React.FC = () => {
  const { contacts, isLoading, error, refresh } = useContacts();
  const [query, setQuery] = useState('');

  const filtered = contacts.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full gap-4 pt-4" data-testid="contacts-directory">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#f2b705]" />
          <h1 className={AT.sectionTitle}>Directorio CRM</h1>
        </div>
        <button
          onClick={(): void => {
            refresh().catch(() => undefined);
          }}
          disabled={isLoading}
          aria-label="Recargar directorio"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, empresa o correo..."
          value={query}
          onChange={(e): void => setQuery(e.target.value)}
          data-testid="contacts-search"
          className="w-full pl-8 pr-4 py-2 text-archon-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2a44]/20"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-archon-sm gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Cargando directorio…
        </div>
      )}

      {!isLoading && error && (
        <div
          data-testid="contacts-error"
          className="flex items-center gap-2 text-red-600 text-archon-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3"
          role="alert"
        >
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 text-archon-sm">
          <Users size={32} className="text-slate-200" />
          {query ? 'Sin resultados para esta búsqueda' : 'No hay contactos registrados'}
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div
          data-testid="contacts-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4"
        >
          {filtered.map((c) => (
            <ContactCard key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactsDirectory;
