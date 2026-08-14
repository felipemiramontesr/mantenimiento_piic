import React, { useEffect, useState } from 'react';
import { Globe, XCircle } from 'lucide-react';
import ArchonModal from '../../../components/UI/ArchonModal';
import { useNhtsaRecalls, NhtsaRecall } from '../../../hooks/useNhtsaRecalls';
import { useFailurePatterns, FailurePatternsList, FailurePattern } from './FailurePatternsList';

type NhtsaResultsModalProps = {
  isOpen: boolean;
  make: string;
  model: string;
  year: number;
  onClose(): void;
  onImported(): void;
  linkRecall(recallId: number): Promise<void>;
};

function NhtsaModalHeader({
  make,
  model,
  year,
  onClose,
}: {
  make: string;
  model: string;
  year: number;
  onClose(): void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <Globe size={18} className="text-sky-400" />
        Recalls NHTSA — {make} {model} {year}
      </h3>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="text-gray-400 hover:text-white transition-colors"
      >
        <XCircle size={20} />
      </button>
    </div>
  );
}

function NhtsaModalTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: 'nhtsa' | 'patterns';
  onTabChange(tab: 'nhtsa' | 'patterns'): void;
}): React.JSX.Element {
  return (
    <div className="flex gap-1 border-b border-white/10">
      {(['nhtsa', 'patterns'] as const).map((tab) => (
        <button
          key={tab}
          onClick={(): void => onTabChange(tab)}
          className={`px-4 py-2 text-archon-sm font-black uppercase tracking-widest transition-colors rounded-t-[4px] ${
            activeTab === tab
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab === 'nhtsa' ? 'NHTSA Oficial' : 'Patrones de Falla'}
        </button>
      ))}
    </div>
  );
}

function NhtsaResultRow({
  r,
  importingCode,
  onImport,
}: {
  r: NhtsaRecall;
  importingCode: string | null;
  onImport(r: NhtsaRecall): void;
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-white/5 rounded-[4px]">
      <div className="flex-1 min-w-0">
        <p className="text-archon-xs font-black text-sky-300 uppercase tracking-widest">
          {r.campaignNumber}
        </p>
        <p className="text-sm text-white mt-0.5 line-clamp-2">{r.subject}</p>
        <p className="text-xs text-gray-400 mt-0.5">{r.component}</p>
      </div>
      <button
        title={`Importar recall ${r.campaignNumber}`}
        onClick={(): void => onImport(r)}
        disabled={importingCode === r.campaignNumber}
        className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 transition-colors rounded-[4px] text-white text-archon-xs font-black uppercase tracking-widest"
      >
        {importingCode === r.campaignNumber ? '…' : 'Importar'}
      </button>
    </div>
  );
}

function NhtsaResultsList({
  loading,
  error,
  results,
  importingCode,
  onImport,
}: {
  loading: boolean;
  error: string | null;
  results: NhtsaRecall[];
  importingCode: string | null;
  onImport(r: NhtsaRecall): void;
}): React.JSX.Element {
  return (
    <div>
      {loading && <p className="text-gray-400 text-sm text-center py-4">Consultando NHTSA…</p>}
      {error && <p className="text-red-400 text-sm text-center py-4">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No se encontraron recalls para este modelo/año.
        </p>
      )}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <NhtsaResultRow
              key={r.campaignNumber}
              r={r}
              importingCode={importingCode}
              onImport={onImport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function useNhtsaSearchResults({
  isOpen,
  make,
  model,
  year,
}: {
  isOpen: boolean;
  make: string;
  model: string;
  year: number;
}): {
  results: NhtsaRecall[];
  loading: boolean;
  error: string | null;
  importRecall: ReturnType<typeof useNhtsaRecalls>['importRecall'];
} {
  const { results, loading, error, search, importRecall } = useNhtsaRecalls();

  useEffect(() => {
    if (isOpen) {
      search(make, model, year);
    }
  }, [isOpen, search, make, model, year]);

  return { results, loading, error, importRecall };
}

type NhtsaImportHandlerArgs = {
  make: string;
  model: string;
  year: number;
  importRecall: ReturnType<typeof useNhtsaRecalls>['importRecall'];
  linkRecall(recallId: number): Promise<void>;
  onImported(): void;
  onClose(): void;
};

function useNhtsaImportHandler({
  make,
  model,
  year,
  importRecall,
  linkRecall,
  onImported,
  onClose,
}: NhtsaImportHandlerArgs): {
  importingCode: string | null;
  handleImport(recall: NhtsaRecall): Promise<void>;
} {
  const [importingCode, setImportingCode] = useState<string | null>(null);

  const handleImport = async (recall: NhtsaRecall): Promise<void> => {
    setImportingCode(recall.campaignNumber);
    try {
      const imported = await importRecall({
        campaignNumber: recall.campaignNumber,
        make,
        model,
        year,
        description: recall.summary,
      });
      await linkRecall(imported.recall_id);
      onImported();
      onClose();
    } finally {
      setImportingCode(null);
    }
  };

  return { importingCode, handleImport };
}

function NhtsaTabContent({
  activeTab,
  loading,
  error,
  results,
  importingCode,
  onImport,
  patternsLoading,
  patternsError,
  patternsResults,
}: {
  activeTab: 'nhtsa' | 'patterns';
  loading: boolean;
  error: string | null;
  results: NhtsaRecall[];
  importingCode: string | null;
  onImport(r: NhtsaRecall): void;
  patternsLoading: boolean;
  patternsError: string | null;
  patternsResults: FailurePattern[];
}): React.JSX.Element {
  if (activeTab === 'patterns') {
    return (
      <FailurePatternsList
        loading={patternsLoading}
        error={patternsError}
        results={patternsResults}
      />
    );
  }
  return (
    <NhtsaResultsList
      loading={loading}
      error={error}
      results={results}
      importingCode={importingCode}
      onImport={onImport}
    />
  );
}

/** Modal for searching/importing NHTSA recalls and reviewing internal failure patterns. */
export function NhtsaResultsModal(props: NhtsaResultsModalProps): React.JSX.Element | null {
  const { isOpen, make, model, year, onClose, onImported, linkRecall } = props;
  const [activeTab, setActiveTab] = useState<'nhtsa' | 'patterns'>('nhtsa');
  const { results, loading, error, importRecall } = useNhtsaSearchResults({
    isOpen,
    make,
    model,
    year,
  });
  const {
    results: patternsResults,
    loading: patternsLoading,
    error: patternsError,
  } = useFailurePatterns(isOpen, activeTab, make, model, year);
  const { importingCode, handleImport } = useNhtsaImportHandler({
    make,
    model,
    year,
    importRecall,
    linkRecall,
    onImported,
    onClose,
  });

  return (
    <ArchonModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      ariaLabel="Buscar recalls en NHTSA"
    >
      <div className="p-6 flex flex-col gap-4">
        <NhtsaModalHeader make={make} model={model} year={year} onClose={onClose} />
        <NhtsaModalTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <NhtsaTabContent
          activeTab={activeTab}
          loading={loading}
          error={error}
          results={results}
          importingCode={importingCode}
          onImport={handleImport}
          patternsLoading={patternsLoading}
          patternsError={patternsError}
          patternsResults={patternsResults}
        />
      </div>
    </ArchonModal>
  );
}

export default NhtsaResultsModal;
