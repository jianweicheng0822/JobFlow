// Uploaded photos never reach the server, so they're kept in this browser per account.
// It used to be one shared key, which showed the last person's photo to whoever signed in next.
const LEGACY_KEY = 'jobflow-avatar'

function keyFor(email: string): string {
  return `jobflow-avatar:${email}`
}

export function getStoredAvatar(email: string | undefined): string | null {
  // Nobody can tell whose the old shared photo was, so it just goes
  localStorage.removeItem(LEGACY_KEY)
  return email ? localStorage.getItem(keyFor(email)) : null
}

export function storeAvatar(email: string, dataUrl: string): void {
  localStorage.setItem(keyFor(email), dataUrl)
}

export function removeStoredAvatar(email: string): void {
  localStorage.removeItem(keyFor(email))
}
