export const ALLOWED_LOGINS = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAllowed(login) {
  if (!login) return false;
  return ALLOWED_LOGINS.includes(login.toLowerCase());
}
