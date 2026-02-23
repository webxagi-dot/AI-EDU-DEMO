import { getCurrentUser } from "./auth";
import type { UserRole } from "./auth";

export function requireRole(role: UserRole) {
  const user = getCurrentUser();
  if (!user || user.role !== role) {
    return null;
  }
  return user;
}
