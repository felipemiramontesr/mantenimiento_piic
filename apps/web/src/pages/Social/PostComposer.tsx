import React, { useState } from 'react';
import { ImagePlus, PlusCircle, X } from 'lucide-react';
import { describeArcsialError } from './arcsialApi';
import {
  createPost,
  isHttpsUrl,
  POST_IMAGES_MAX,
  POST_TEXT_MAX,
  PostVisibility,
} from './arcsialCoreApi';

/**
 * FC210 F3 — caja de publicación: texto (1 a 1000), hasta 4 imágenes por URL https con vista previa,
 * visibilidad y autoría (personal, o a nombre del Universo si la sesión es su MU). El servidor repite
 * cada validación, incluido el filtro de placas y VIN.
 */

type MuUniverse = { id: number; label: string };

const VISIBILITY_OPTIONS: ReadonlyArray<{ value: PostVisibility; label: string }> = [
  { value: 'PUBLIC', label: 'Pública' },
  { value: 'FOLLOWERS', label: 'Solo seguidores' },
  { value: 'CONTACTS', label: 'Solo contactos' },
];

const IMAGE_URL_ERROR = 'La imagen debe ser una dirección https.';

interface ImageDraft {
  readonly urls: string[];
  readonly input: string;
  readonly error: string | null;
  readonly setInput: (value: string) => void;
  readonly add: () => void;
  readonly remove: (url: string) => void;
  readonly clear: () => void;
}

/** Lista de URL de imagen del borrador: solo https, sin repetidas, máximo 4. */
function useImageDraft(): ImageDraft {
  const [urls, setUrls] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = (): void => {
    const url = input.trim();
    if (!isHttpsUrl(url)) {
      setError(IMAGE_URL_ERROR);
      return;
    }
    setUrls((current) => (current.includes(url) ? current : [...current, url]));
    setInput('');
    setError(null);
  };
  const remove = (url: string): void => setUrls((current) => current.filter((u) => u !== url));
  return { urls, input, error, setInput, add, remove, clear: (): void => setUrls([]) };
}

/** Miniaturas de las imágenes agregadas, cada una con su botón para quitarla. */
function ImagePreviews({ images }: { readonly images: ImageDraft }): React.JSX.Element | null {
  if (images.urls.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" data-testid="composer-images">
      {images.urls.map((url, index) => (
        <li key={url} className="relative">
          <img
            src={url}
            alt={`Imagen ${index + 1} de la publicación`}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={(): void => images.remove(url)}
            aria-label={`Quitar imagen ${index + 1}`}
            data-testid={`composer-image-remove-${index}`}
            className="absolute -right-1 -top-1 rounded-full bg-white text-red-500 shadow"
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Campo para agregar una imagen por URL; se oculta al llegar al máximo. */
function ImageUrlField({ images }: { readonly images: ImageDraft }): React.JSX.Element | null {
  if (images.urls.length >= POST_IMAGES_MAX) return null;
  return (
    <div className="flex items-center gap-2">
      <input
        value={images.input}
        onChange={(e): void => images.setInput(e.target.value)}
        placeholder="https://… dirección de una imagen (opcional)"
        aria-label="Dirección de la imagen"
        data-testid="composer-image-input"
        className="archon-input flex-1"
      />
      <button
        type="button"
        onClick={images.add}
        data-testid="composer-image-add"
        className="btn-sentinel-sky-static text-xs"
      >
        <ImagePlus size={12} /> Agregar
      </button>
    </div>
  );
}

/** Visibilidad de la publicación. */
function VisibilitySelect({
  value,
  onChange,
}: {
  readonly value: PostVisibility;
  readonly onChange: (value: PostVisibility) => void;
}): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e): void => onChange(e.target.value as PostVisibility)}
      aria-label="Visibilidad de la publicación"
      data-testid="composer-visibility"
      className="archon-input w-auto"
    >
      {VISIBILITY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** A nombre de quién publica el MU: él mismo o su Universo. */
function AuthorshipSelect({
  muUniverse,
  universeId,
  onUniverse,
}: {
  readonly muUniverse: MuUniverse;
  /** Id del Universo a cuyo nombre se publica, o null si es personal. */
  readonly universeId: number | null;
  readonly onUniverse: (tenantId: number | null) => void;
}): React.JSX.Element {
  return (
    <select
      value={universeId === null ? 'personal' : 'universe'}
      onChange={(e): void => onUniverse(e.target.value === 'universe' ? muUniverse.id : null)}
      aria-label="Publicar como"
      data-testid="composer-authorship"
      className="archon-input w-auto"
    >
      <option value="personal">Como yo</option>
      <option value="universe">Como {muUniverse.label}</option>
    </select>
  );
}

interface ComposerDraft {
  readonly text: string;
  readonly setText: (value: string) => void;
  readonly visibility: PostVisibility;
  readonly setVisibility: (value: PostVisibility) => void;
  readonly universeId: number | null;
  readonly setUniverseId: (tenantId: number | null) => void;
  readonly error: string | null;
  readonly submit: (event: React.FormEvent) => void;
}

/** Estado del borrador y su envío; al publicarse se limpia y avisa con `onPosted`. */
function useComposerDraft(images: ImageDraft, onPosted: () => void): ComposerDraft {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [universeId, setUniverseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const published = (): void => {
    setText('');
    images.clear();
    setError(null);
    onPosted();
  };
  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const authorship = universeId === null ? {} : { asUniverseTenantId: universeId };
    createPost({ contentText: text.trim(), imageUrls: images.urls, visibility, ...authorship })
      .then(published)
      .catch((err) => setError(describeArcsialError(err)));
  };
  return { text, setText, visibility, setVisibility, universeId, setUniverseId, error, submit };
}

/** Campo de texto de la publicación. */
function ComposerText({ draft }: { readonly draft: ComposerDraft }): React.JSX.Element {
  return (
    <textarea
      value={draft.text}
      onChange={(e): void => draft.setText(e.target.value)}
      maxLength={POST_TEXT_MAX}
      rows={3}
      placeholder="¿Qué quieres compartir?"
      aria-label="Texto de la publicación"
      data-testid="composer-text"
      className="archon-input w-full resize-none"
    />
  );
}

/** Pie de la caja: motivo del rechazo, contador de caracteres y botón de publicar. */
function ComposerFooter({
  text,
  error,
}: {
  readonly text: string;
  readonly error: string | null;
}): React.JSX.Element {
  return (
    <>
      {error && (
        <p role="alert" data-testid="composer-error" className="text-sm font-medium text-red-500">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#0f2a44]/40" data-testid="composer-count">
          {text.length} / {POST_TEXT_MAX}
        </span>
        <button
          type="submit"
          disabled={!text.trim()}
          data-testid="composer-submit"
          className="btn-sentinel-sky text-xs disabled:opacity-50"
        >
          <PlusCircle size={14} /> Publicar
        </button>
      </div>
    </>
  );
}

interface PostComposerProps {
  /** Universo del que la sesión es MU, o null. */
  readonly muUniverse: MuUniverse | null;
  readonly onPosted: () => void;
}

/** Caja de publicación del feed y del muro propio. */
export default function PostComposer({
  muUniverse,
  onPosted,
}: PostComposerProps): React.JSX.Element {
  const images = useImageDraft();
  const draft = useComposerDraft(images, onPosted);
  return (
    <form
      onSubmit={draft.submit}
      data-testid="post-composer"
      className="card-archon-sovereign space-y-3 bg-white p-6 [--card-accent:#0f2a44]"
    >
      <ComposerText draft={draft} />
      <ImagePreviews images={images} />
      <ImageUrlField images={images} />
      <div className="flex flex-wrap gap-3">
        <VisibilitySelect value={draft.visibility} onChange={draft.setVisibility} />
        {muUniverse && (
          <AuthorshipSelect
            muUniverse={muUniverse}
            universeId={draft.universeId}
            onUniverse={draft.setUniverseId}
          />
        )}
      </div>
      <ComposerFooter text={draft.text} error={draft.error ?? images.error} />
    </form>
  );
}
