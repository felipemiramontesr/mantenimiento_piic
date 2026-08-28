import React from 'react';
import {
  Settings,
  LayoutDashboard,
  Zap,
  Truck,
  Map,
  Users,
  Shield,
  BarChart3,
  Activity,
  FileText,
  Search,
  X,
  Cpu,
  Wrench,
  AlertTriangle,
  Navigation,
  Menu,
} from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import type { SearchSuggestion, UniversalSearchConfig } from '../../context/SovereignLayoutContext';
import ArchonManagementCard from '../UI/ArchonManagementCard';

type LayoutData = ReturnType<typeof useSovereignLayout>['layoutData'];

/** Mapeo de icono principal/secundario según el título de sección (FC163 F1B-2, split Alfa 219_AN). */
function getHeaderIcons(title: string): { main: React.ElementType; sub: React.ElementType } {
  const normalizedTitle = title.trim();
  if (normalizedTitle.includes('Comando')) return { main: LayoutDashboard, sub: Zap };
  if (normalizedTitle.includes('Flota')) return { main: Truck, sub: Settings };
  if (normalizedTitle.includes('Ruta')) return { main: Map, sub: Navigation };
  if (normalizedTitle.includes('Usuario')) return { main: Users, sub: Shield };
  if (normalizedTitle.includes('Financiera')) return { main: BarChart3, sub: Activity };
  if (normalizedTitle.includes('Registro') || normalizedTitle.includes('Log'))
    return { main: FileText, sub: Search };
  if (normalizedTitle.includes('Ajuste') || normalizedTitle.includes('Config'))
    return { main: Settings, sub: Cpu };
  if (normalizedTitle.includes('Mantenimiento')) return { main: Wrench, sub: AlertTriangle };
  return { main: Shield, sub: Zap };
}

/** Slot de acción dinámica del header (headerSlot custom o ArchonManagementCard) (FC163 F1B-2, split Alfa 219_AN). */
function HeaderActionSlot({ layoutData }: { layoutData: LayoutData }): React.ReactNode {
  if (layoutData.headerSlot != null) {
    return <div className="w-full">{layoutData.headerSlot}</div>;
  }
  if (layoutData.headerAction) {
    return (
      <div className="w-full">
        <ArchonManagementCard
          variant={layoutData.headerAction.variant}
          layout="horizontal"
          headerTitle={layoutData.headerAction.headerTitle}
          HeaderIcon={layoutData.headerAction.HeaderIcon}
          PayloadIcon={layoutData.headerAction.PayloadIcon}
          actionTitle={layoutData.headerAction.actionTitle}
          description={layoutData.headerAction.description}
          buttonText={layoutData.headerAction.buttonText}
          isActive={layoutData.headerAction.isActive}
          onClick={layoutData.headerAction.onClick}
          testId={layoutData.headerAction.testId}
          reverseArrow={layoutData.headerAction.reverseArrow}
        />
      </div>
    );
  }
  return null;
}

interface SearchSuggestionItemProps {
  suggestion: SearchSuggestion;
  onSelect: (suggestion: SearchSuggestion) => void;
}

/** Ítem individual de sugerencia de búsqueda (FC163 F1B-2, split Alfa 219_AN). */
function SearchSuggestionItem({
  suggestion,
  onSelect,
}: SearchSuggestionItemProps): React.JSX.Element {
  return (
    <li
      onClick={(): void => onSelect(suggestion)}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(suggestion);
        }
      }}
      role="option"
      aria-selected={false}
      tabIndex={0}
      className="px-4 py-2.5 text-archon-md font-bold text-[#0f2a44] hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors duration-150 uppercase"
    >
      <span className="tracking-tight">
        {suggestion.title} ({suggestion.metaLabel}: {suggestion.metaValue})
      </span>
      <span className="text-archon-sm font-black text-slate-400 tracking-wider">SELECCIONAR</span>
    </li>
  );
}

interface SearchSuggestionsListProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
}

/** Lista desplegable de sugerencias de búsqueda (FC163 F1B-2, split Alfa 219_AN). */
function SearchSuggestionsList({
  suggestions,
  onSelect,
}: SearchSuggestionsListProps): React.JSX.Element {
  return (
    <ul
      style={{ border: '1px solid rgba(15, 42, 68, 0.2)', borderRadius: '4px' }}
      className="absolute left-0 right-0 mt-1.5 bg-white shadow-lg max-h-60 overflow-y-auto z-[9999] py-1 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {suggestions.map((s) => (
        <SearchSuggestionItem key={s.id} suggestion={s} onSelect={onSelect} />
      ))}
    </ul>
  );
}

interface HeaderSearchBarProps {
  containerRef: React.RefObject<HTMLDivElement>;
  searchConfig: UniversalSearchConfig;
  searchTerm: string;
  isOpen: boolean;
  suggestions: SearchSuggestion[];
  onSearchChange: (value: string) => void;
  onOpen: () => void;
  onCloseOnEnter: () => void;
  onClear: () => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
}

interface SearchInputFieldProps {
  placeholder: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpen: () => void;
  onCloseOnEnter: () => void;
  onClear: () => void;
}

/** Input de búsqueda con icono + botón de limpiar (FC163 F2B4 Sub-Batch 4B-1). */
function SearchInputField({
  placeholder: fieldPlaceholder,
  searchTerm,
  onSearchChange,
  onOpen,
  onCloseOnEnter,
  onClear,
}: SearchInputFieldProps): React.JSX.Element {
  return (
    <>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <Search
          size={13}
          className="text-slate-400 group-focus-within:text-[#0f2a44] transition-colors duration-300"
        />
      </span>
      <input
        type="text"
        placeholder={fieldPlaceholder}
        value={searchTerm}
        onChange={(e): void => onSearchChange(e.target.value)}
        onFocus={onOpen}
        onKeyDown={(e): void => {
          if (e.key === 'Enter') onCloseOnEnter();
        }}
        style={{ border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px' }}
        className="w-full pl-9 pr-9 py-3 text-archon-md font-bold text-[#0f2a44] bg-white focus:outline-none placeholder:text-slate-400/80 tracking-[0.02em] shadow-sm shadow-slate-100/50"
      />
      {searchTerm && (
        <button
          type="button"
          data-testid="clear-search-btn"
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-500 border-none bg-transparent cursor-pointer transition-colors duration-200 active:scale-95"
        >
          <X size={13} className="transition-transform duration-200 hover:rotate-90" />
        </button>
      )}
    </>
  );
}

/** Barra de búsqueda predictiva universal (input + limpiar + sugerencias) (FC163 F1B-2, split Alfa 219_AN). */
function HeaderSearchBar({
  containerRef,
  searchConfig: { placeholder: searchPlaceholder },
  searchTerm,
  isOpen,
  suggestions,
  onSearchChange,
  onOpen,
  onCloseOnEnter,
  onClear,
  onSuggestionSelect,
}: HeaderSearchBarProps): React.JSX.Element {
  return (
    <div
      ref={containerRef}
      className="group relative w-full mt-3 animate-in fade-in slide-in-from-top-1 duration-500 z-[999]"
    >
      <SearchInputField
        placeholder={searchPlaceholder}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onOpen={onOpen}
        onCloseOnEnter={onCloseOnEnter}
        onClear={onClear}
      />
      {isOpen && searchTerm.trim() && suggestions.length > 0 && (
        <SearchSuggestionsList suggestions={suggestions} onSelect={onSuggestionSelect} />
      )}
    </div>
  );
}

interface HeaderTitleBlockProps {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  MainIcon: React.ElementType;
  SubIcon: React.ElementType;
  title: string;
  description: string;
}

/** Bloque de título de sección + toggle de menú móvil (FC163 F1B-2, split Alfa 219_AN). */
function HeaderTitleBlock({
  isMobileMenuOpen,
  onToggleMobileMenu,
  MainIcon,
  SubIcon,
  title,
  description,
}: HeaderTitleBlockProps): React.JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden flex items-center justify-center p-2.5 -ml-2.5 rounded hover:bg-slate-100 text-pinnacle-navy"
          aria-label="Toggle Menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu size={24} />
        </button>
        <MainIcon size={20} className="text-pinnacle-yellow" strokeWidth={2.5} />
        <h2 className="text-pinnacle-navy tracking-tighter font-black text-xl md:text-2xl m-0 p-0 leading-[0.9]">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <SubIcon size={10} className="text-pinnacle-yellow opacity-70" strokeWidth={3} />
        <p className="text-pinnacle-navy text-archon-base font-bold uppercase tracking-[0.25em] opacity-50">
          {description}
        </p>
      </div>
    </div>
  );
}

/** Cierra el buscador al hacer click fuera o presionar Escape (FC163 F1B-2, split Alfa 219_AN). */
function useCloseOnOutsideOrEscape(
  containerRef: React.RefObject<HTMLDivElement>,
  setIsOpen: (open: boolean) => void
): void {
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, [containerRef, setIsOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);
}

interface SovereignHeaderIdentityColumnProps {
  layoutData: LayoutData;
  searchConfig: UniversalSearchConfig | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  suggestions: SearchSuggestion[];
  containerRef: React.RefObject<HTMLDivElement>;
}

/** Handlers de la barra de búsqueda predictiva, aislados de la columna de identidad (FC163 F1B-2, split Alfa 219_AN). */
function useHeaderSearchHandlers(
  searchConfig: UniversalSearchConfig | null,
  setSearchTerm: (v: string) => void,
  setIsOpen: (open: boolean) => void
): {
  handleSearchChange: (v: string) => void;
  handleClearSearch: () => void;
  handleSuggestionSelect: (s: SearchSuggestion) => void;
} {
  const handleSearchChange = (v: string): void => {
    setSearchTerm(v);
    setIsOpen(true);
  };
  const handleClearSearch = (): void => {
    setSearchTerm('');
    setIsOpen(false);
  };
  const handleSuggestionSelect = (s: SearchSuggestion): void => {
    searchConfig?.onSuggestionSelect(s);
    setIsOpen(false);
  };
  return { handleSearchChange, handleClearSearch, handleSuggestionSelect };
}

/** Columna de identidad de sección: título + buscador predictivo (Col Alfa) (FC163 F1B-2, split Alfa 219_AN). */
function SovereignHeaderIdentityColumn({
  layoutData,
  searchConfig,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  searchTerm,
  setSearchTerm,
  isOpen,
  setIsOpen,
  suggestions,
  containerRef,
}: SovereignHeaderIdentityColumnProps): React.JSX.Element {
  const { main: MainIcon, sub: SubIcon } = getHeaderIcons(layoutData.title);
  const { handleSearchChange, handleClearSearch, handleSuggestionSelect } = useHeaderSearchHandlers(
    searchConfig,
    setSearchTerm,
    setIsOpen
  );

  return (
    <div
      className={`flex flex-col w-full ${
        searchConfig ? 'justify-between h-auto md:h-[105px] py-0.5' : 'justify-center'
      }`}
    >
      <HeaderTitleBlock
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={(): void => setIsMobileMenuOpen(!isMobileMenuOpen)}
        MainIcon={MainIcon}
        SubIcon={SubIcon}
        title={layoutData.title}
        description={layoutData.description}
      />
      {searchConfig && (
        <HeaderSearchBar
          containerRef={containerRef}
          searchConfig={searchConfig}
          searchTerm={searchTerm}
          isOpen={isOpen}
          suggestions={suggestions}
          onSearchChange={handleSearchChange}
          onOpen={(): void => setIsOpen(true)}
          onCloseOnEnter={(): void => setIsOpen(false)}
          onClear={handleClearSearch}
          onSuggestionSelect={handleSuggestionSelect}
        />
      )}
    </div>
  );
}

/**
 * 🔱 Archon Component: SovereignHeader
 * Implementation: Sovereign Identity & Section Metadata Orchestration (Polymorphic)
 * Objective: High-density header with dynamic titles and universal predictive search.
 * v.2.0.0 - Universal Predictive Search (DRY Compliant)
 */
const SovereignHeader: React.FC = () => {
  const {
    layoutData,
    searchTerm,
    setSearchTerm,
    searchConfig,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useSovereignLayout();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useCloseOnOutsideOrEscape(containerRef, setIsOpen);

  const suggestions = React.useMemo(() => {
    if (!searchConfig || !searchTerm.trim()) return [];
    return searchConfig.getSuggestions(searchTerm.trim()).slice(0, 8);
  }, [searchConfig, searchTerm]);

  return (
    <header className="flex flex-row items-center w-full border-b border-pinnacle-navy/5 px-4 md:pl-10 md:pr-[46px] min-h-[10vh] py-2 bg-white relative z-50 mt-[10px]">
      <div className="archon-grid-2-sovereign items-center w-full flex-col md:flex-row gap-4 md:gap-10">
        <SovereignHeaderIdentityColumn
          layoutData={layoutData}
          searchConfig={searchConfig}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          suggestions={suggestions}
          containerRef={containerRef}
        />
        <div className="flex justify-end items-center w-full">
          <HeaderActionSlot layoutData={layoutData} />
        </div>
      </div>
    </header>
  );
};

export default SovereignHeader;
