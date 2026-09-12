import { useAuth } from '../contexts/AuthContext';
import { ROLE_CONFIG } from '../config/roles';

export function usePermissions() {
  const { role, customPermissions } = useAuth();

  const basePermissions = role && ROLE_CONFIG[role] ? ROLE_CONFIG[role].permissions : [];
  const permissions = Array.from(new Set([...basePermissions, ...(customPermissions || [])]));

  const hasPermission = (permission: string) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]) => {
    if (permissions.includes('*')) return true;
    return requiredPermissions.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (requiredPermissions: string[]) => {
    if (permissions.includes('*')) return true;
    return requiredPermissions.every(p => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
