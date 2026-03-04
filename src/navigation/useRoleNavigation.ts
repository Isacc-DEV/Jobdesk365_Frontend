import { useMemo } from "react";
import { getRoleBucketFromRoles, isEmployeeByRoles } from "../lib/roleBucket";
import { getAdminNavigation } from "./adminNavigation";
import { getManagersNavigation } from "./managersNavigation";
import type { NavigationItem } from "./types";
import { getUsersNavigation } from "./usersNavigation";

export const useRoleNavigation = (roles: unknown): NavigationItem[] => {
  const roleBucket = getRoleBucketFromRoles(roles);
  const isEmployee = isEmployeeByRoles(roles);

  return useMemo(() => {
    if (roleBucket === "admin") return getAdminNavigation();
    if (roleBucket === "manager") return getManagersNavigation();
    return getUsersNavigation({ includeSupport: isEmployee });
  }, [isEmployee, roleBucket]);
};

