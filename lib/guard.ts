import { getCurrentUser } from "./auth";
import type { UserRole } from "./auth";

export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user || user.role !== role) {
    return null;
  }
  return user;
}
