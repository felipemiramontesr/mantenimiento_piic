import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, Edit, Mail, Newspaper, UserCircle, Users } from 'lucide-react';
import ProfileEditSlideOver from './ProfileEditSlideOver';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { fetchOwnProfile, HANDLE_PATTERN, OwnProfile } from '../Social/arcsialApi';
import ActorSearch from '../Social/ActorSearch';
import ActorView from '../Social/ActorView';
import FeedTab from '../Social/FeedTab';
import ProfileContactsTab from '../Social/ProfileContactsTab';
import InvitationsInbox from '../Social/InvitationsInbox';

/**
 * FC210 F3 — Arcsial vive entero en `/dashboard/social`, la única ruta del Arc itinerante
 * (`Layout.tsx` compara la ruta exacta): las pestañas son estado local y el perfil de un actor se abre
 * con `?handle=`, sin cambiar de ruta. El muro legado sobre `social_posts` ya no se muestra (D10).
 */
const ARCSIAL_TABS = [
  { key: 'feed', label: 'Feed', Icon: Newspaper },
  { key: 'wall', label: 'Muro Propio', Icon: UserCircle },
  { key: 'contacts', label: 'Contactos', Icon: Users },
  { key: 'invitations', label: 'Invitaciones', Icon: Mail },
] as const;

type ArcsialTab = (typeof ARCSIAL_TABS)[number]['key'];

/** Barra de pestañas. */
function ArcsialTabBar({
  active,
  onSelect,
}: {
  readonly active: ArcsialTab;
  readonly onSelect: (tab: ArcsialTab) => void;
}): React.JSX.Element {
  return (
    <div role="tablist" className="flex flex-wrap gap-6 border-b border-slate-200">
      {ARCSIAL_TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          onClick={(): void => onSelect(key)}
          data-testid={`arcsial-tab-${key}`}
          className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2 text-xs font-black uppercase tracking-widest ${
            active === key
              ? 'border-[#0f2a44] text-[#0f2a44]'
              : 'border-transparent text-[#0f2a44]/40 hover:text-[#0f2a44]'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

interface OwnProfileState {
  readonly own: OwnProfile | null;
  readonly reload: () => void;
}

/** Perfil de Arcsial de la sesión (handle propio y Universo del que es MU). */
function useOwnProfile(): OwnProfileState {
  const [own, setOwn] = useState<OwnProfile | null>(null);
  const reload = useCallback((): void => {
    fetchOwnProfile()
      .then(setOwn)
      .catch(() => setOwn(null));
  }, []);
  useEffect(reload, [reload]);
  return { own, reload };
}

interface ActorNavigation {
  /** Handle del perfil abierto con `?handle=`, o null. Un valor fuera del patrón se ignora. */
  readonly viewed: string | null;
  readonly open: (handle: string) => void;
  readonly close: () => void;
}

/** Navegación al perfil de un actor sin salir de `/dashboard/social`. */
function useActorNavigation(): ActorNavigation {
  const [params, setParams] = useSearchParams();
  const raw = params.get('handle') ?? '';
  return {
    viewed: HANDLE_PATTERN.test(raw) ? raw : null,
    open: (handle): void => setParams({ handle }),
    close: (): void => setParams({}),
  };
}

interface TabPanelProps {
  readonly tab: ArcsialTab;
  readonly profile: OwnProfileState;
  readonly onOpenActor: (handle: string) => void;
}

/** «Muro Propio»: el perfil y el muro del actor de la sesión. */
function OwnWall({ profile, onOpenActor }: Omit<TabPanelProps, 'tab'>): React.JSX.Element {
  const { own } = profile;
  if (!own) {
    return (
      <p className="text-sm text-[#0f2a44]/40" data-testid="own-wall-loading">
        Cargando tu perfil…
      </p>
    );
  }
  return (
    <ActorView
      handle={own.handle}
      ownHandle={own.handle}
      muUniverse={own.muUniverse}
      onOpenActor={onOpenActor}
    />
  );
}

/** Contenido de la pestaña activa. */
function TabPanel({ tab, profile, onOpenActor }: TabPanelProps): React.JSX.Element {
  if (tab === 'feed') {
    return <FeedTab muUniverse={profile.own?.muUniverse ?? null} onOpenActor={onOpenActor} />;
  }
  if (tab === 'wall') return <OwnWall profile={profile} onOpenActor={onOpenActor} />;
  if (tab === 'contacts') return <ProfileContactsTab onProfileSaved={profile.reload} />;
  return <InvitationsInbox />;
}

/** Perfil de otro actor, con el regreso a las pestañas. */
function ViewedActor({
  handle,
  profile,
  navigation,
}: {
  readonly handle: string;
  readonly profile: OwnProfileState;
  readonly navigation: ActorNavigation;
}): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        onClick={navigation.close}
        data-testid="actor-back"
        className="inline-flex items-center gap-1.5 self-start text-xs font-black uppercase tracking-widest text-[#0f2a44]/60 hover:text-[#0f2a44]"
      >
        <ArrowLeft size={14} /> Volver
      </button>
      <ActorView
        key={handle}
        handle={handle}
        ownHandle={profile.own?.handle ?? null}
        muUniverse={profile.own?.muUniverse ?? null}
        onOpenActor={navigation.open}
      />
    </>
  );
}

/** Buscador y acceso a «Editar perfil» (datos de la cuenta). */
function ArcsialToolbar({
  onOpenActor,
  onEdit,
}: {
  readonly onOpenActor: (handle: string) => void;
  readonly onEdit: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <ActorSearch onOpenActor={onOpenActor} />
      </div>
      <button
        type="button"
        data-testid="profile-edit-btn"
        onClick={onEdit}
        className="btn-sentinel-sky-static text-[10px]"
      >
        <Edit className="h-3 w-3" />
        Editar perfil
      </button>
    </div>
  );
}

/** Arcsial (`/dashboard/social`): buscador, pestañas y perfil de actor. */
const ProfileView: React.FC = () => {
  const { setSectionData } = useSovereignLayout();
  const [tab, setTab] = useState<ArcsialTab>('feed');
  const [editOpen, setEditOpen] = useState(false);
  const profile = useOwnProfile();
  const navigation = useActorNavigation();

  useEffect(() => {
    setSectionData('Arcsial', 'Red social de la comunidad Archon');
  }, [setSectionData]);

  return (
    <div data-testid="profile-view" className="mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <ArcsialToolbar onOpenActor={navigation.open} onEdit={(): void => setEditOpen(true)} />
      {navigation.viewed ? (
        <ViewedActor handle={navigation.viewed} profile={profile} navigation={navigation} />
      ) : (
        <>
          <ArcsialTabBar active={tab} onSelect={setTab} />
          <TabPanel tab={tab} profile={profile} onOpenActor={navigation.open} />
        </>
      )}
      <ProfileEditSlideOver isOpen={editOpen} onClose={(): void => setEditOpen(false)} />
    </div>
  );
};

export default ProfileView;
