import api from '../../api/client';

/**
 * FC209 F3 — cliente web de Arcsial sobre la API de F2/F3 (`/v1/social/*`, solo con sesión). El handle
 * es la identidad pública: nunca se busca ni se muestra un correo.
 */

export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

export interface PublicProfile {
  readonly id: number;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

export interface OwnProfile extends PublicProfile {
  /** Universo donde la sesión es MU (solo él invita a ese Universo), o null. */
  readonly muUniverse: { id: number; label: string } | null;
}

export interface Contact extends PublicProfile {
  readonly createdAt: string;
}

export interface BlockedUser {
  readonly blockedId: number;
  readonly handle: string | null;
  readonly displayName: string | null;
  readonly createdAt: string;
}

export type InviteType = 'CONTACT' | 'UNIVERSE';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';

export interface Invitation {
  readonly id: number;
  readonly direction: 'RECEIVED' | 'SENT';
  readonly inviteType: InviteType;
  readonly status: InviteStatus;
  readonly tenantName: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly counterpartHandle: string | null;
  readonly counterpartDisplayName: string | null;
}

/** Normaliza lo escrito: sin `@` inicial, sin espacios, en minúsculas. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

/** Perfil propio. */
export async function fetchOwnProfile(): Promise<OwnProfile> {
  const { data } = await api.get<{ success: true } & OwnProfile>('/social/profile');
  return data;
}

/** Contactos vigentes. */
export async function fetchContacts(): Promise<Contact[]> {
  const { data } = await api.get<{ contacts: Contact[] }>('/social/contacts');
  return data.contacts;
}

/** Usuarios que la sesión bloqueó. */
export async function fetchBlocks(): Promise<BlockedUser[]> {
  const { data } = await api.get<{ blocks: BlockedUser[] }>('/social/blocks');
  return data.blocks;
}

/** Busca por handle exacto (404 si no existe o hay bloqueo). */
export async function lookupHandle(handle: string): Promise<PublicProfile> {
  const { data } = await api.get<{ success: true } & PublicProfile>('/social/users/lookup', {
    params: { handle },
  });
  return {
    id: data.id,
    handle: data.handle,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
  };
}

/** Cambia el handle propio. */
export async function updateOwnHandle(handle: string): Promise<void> {
  await api.patch('/social/profile/handle', { handle });
}

/** Bandeja: recibidas y enviadas. */
export async function fetchInvitations(): Promise<Invitation[]> {
  const { data } = await api.get<{ data: Invitation[] }>('/social/invitations');
  return data.data;
}

/** Envía una invitación de contacto o (MU) a su Universo. */
export async function sendInvitation(
  recipientHandle: string,
  inviteType: InviteType
): Promise<void> {
  await api.post('/social/invitations', { recipientHandle, inviteType });
}

export type InviteAction = 'accept' | 'reject' | 'cancel';

/** Acepta, rechaza o cancela una invitación. */
export async function respondInvitation(id: number, action: InviteAction): Promise<void> {
  await api.post(`/social/invitations/${id}/${action}`);
}

/** Bloquea a un usuario (cancela invitaciones y retira el contacto). */
export async function blockUser(userId: number): Promise<void> {
  await api.post(`/social/blocks/${userId}`);
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'El handle solo admite minúsculas, números y guion bajo (3 a 30).',
  USER_NOT_FOUND: 'No encontramos a nadie con ese handle.',
  HANDLE_ALREADY_TAKEN: 'Ese handle ya está en uso.',
  CANNOT_INVITE_SELF: 'No puedes invitarte a ti mismo.',
  ALREADY_CONTACTS: 'Ya son contactos.',
  SENDER_NOT_MASTER_OF_UNIVERSE: 'Solo el Master of Universe invita a su Universo.',
  CANNOT_LINK_OMEGA_USER: 'La cuenta soberana Omega no puede unirse a un Universo.',
  LINKED_USER_INACTIVE: 'Esa persona está suspendida.',
  LINKED_USER_ALREADY_MEMBER: 'Esa persona ya pertenece a un Universo.',
  LINKED_USER_MISSING_BILLING_PROFILE: 'Esa persona no completó su registro fiscal.',
  INVITATION_RATE_LIMIT_EXCEEDED: 'Alcanzaste el límite de invitaciones. Intenta más tarde.',
  MAX_PENDING_INVITATIONS_EXCEEDED: 'Ya tienes invitaciones pendientes a esta persona.',
  INVITATION_EXPIRED: 'La invitación venció.',
  INVITATION_NOT_PENDING: 'La invitación ya fue respondida.',
  BLOCKED_USER: 'No es posible aceptar esta invitación.',
  FORBIDDEN_INVITATION_RECIPIENT: 'Esta invitación no es para ti.',
  FORBIDDEN_INVITATION_SENDER: 'Solo quien la envió puede cancelarla.',
  INVITATION_NOT_FOUND: 'La invitación ya no existe.',
  CANNOT_BLOCK_SELF: 'No puedes bloquearte a ti mismo.',
};

/** Mensaje en español para un error de Arcsial. */
export function describeArcsialError(err: unknown): string {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  return (code && ERROR_MESSAGES[code]) || 'No se pudo completar la acción. Intenta de nuevo.';
}

/** «vence en 3 días», «vence en 5 h», «vence en minutos» o «venció». */
export function describeExpiry(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return 'venció';
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return days === 1 ? 'vence en 1 día' : `vence en ${days} días`;
  return hours >= 1 ? `vence en ${hours} h` : 'vence en minutos';
}
