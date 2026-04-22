const COOKIE_NAME = 'imf_ref';
const COOKIE_DAYS = 30;

/** Guarda o sobreescribe la cookie de referral (último click gana) */
export function setReferralCookie(slug: string): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DAYS);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(slug)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/** Lee el slug de la cookie de referral activa, o null si no existe */
export function getReferralSlug(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Borra la cookie de referral (útil después de registrar una solicitud) */
export function clearReferralCookie(): void {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
