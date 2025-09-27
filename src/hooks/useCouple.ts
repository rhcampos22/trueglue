// src/hooks/useCouple.ts
import { useEffect, useMemo, useState } from "react";
import { myCouple, createCouple, type Couple } from "../features/couple/api";
import { supabase } from "../lib/supabase";

type Status = "idle" | "loading" | "ready" | "error";

export function useCouple() {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Load on auth/session ready
  useEffect(() => {
    let alive = true;

    async function load() {
      setStatus("loading");
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        // not signed in
        if (alive) {
          setCouple(null);
          setStatus("ready");
        }
        return;
      }

      try {
        const c = await myCouple();
        if (!alive) return;
        setCouple(c ?? null);
        setStatus("ready");
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to fetch couple");
        setStatus("error");
      }
    }

    // initial load
    load();

    // refresh if auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      load();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    setStatus("loading");
    try {
      const c = await myCouple();
      setCouple(c ?? null);
      setStatus("ready");
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh couple");
      setStatus("error");
    }
  };

  return useMemo(
    () => ({
      couple,
      status,
      loading: status === "loading",
      error,
      refresh,
      createCouple: async (title?: string) => {
        const c = await createCouple(title);
        setCouple(c);
        return c;
      },
    }),
    [couple, status, error]
  );
}
