"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "@/lib/services";
import type { Business } from "@/lib/types";

type BusinessStatus = "loading" | "ready" | "error";

interface BusinessContextValue {
  /** The active business, or null once loading finishes and none exists. */
  business: Business | null;
  status: BusinessStatus;
  /** Human-friendly reason when status === "error". */
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: BusinessInput) => Promise<Business>;
  update: (patch: BusinessPatch) => Promise<Business>;
}

export interface BusinessInput {
  name: string;
  industry: string | null;
  size: string | null;
  description: string | null;
  goals: string | null;
}

export type BusinessPatch = Partial<BusinessInput>;

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [status, setStatus] = useState<BusinessStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const found = await API.getBusiness();
      setBusiness(found);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the business profile.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (input: BusinessInput) => {
    const created = await API.createBusiness(input);
    setBusiness(created);
    setStatus("ready");
    return created;
  }, []);

  const update = useCallback(async (patch: BusinessPatch) => {
    if (!business) throw new Error("No business to update.");
    const updated = await API.updateBusiness(business.id, patch);
    setBusiness(updated);
    return updated;
  }, [business]);

  const value = useMemo(
    () => ({ business, status, error, refresh, create, update }),
    [business, status, error, refresh, create, update]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside <BusinessProvider>.");
  return ctx;
}
