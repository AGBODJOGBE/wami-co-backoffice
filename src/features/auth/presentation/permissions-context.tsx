"use client";

import { createContext, useContext, type ReactNode } from "react";

interface PermissionsCtx {
  permissions: readonly string[];
  roleName: string;
}

const Ctx = createContext<PermissionsCtx>({ permissions: [], roleName: "" });

export function PermissionsProvider({
  permissions,
  roleName,
  children,
}: PermissionsCtx & { children: ReactNode }) {
  return <Ctx.Provider value={{ permissions, roleName }}>{children}</Ctx.Provider>;
}

export function usePermissionsCtx(): PermissionsCtx {
  return useContext(Ctx);
}
