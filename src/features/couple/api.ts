// src/features/couple/api.ts
import { supabase } from "../../lib/supabase";

export type Couple = {
  id: string;
  title: string | null;
  created_at: string;
  created_by: string;
};

export type Invite = {
  id: string;
  couple_id: string;
  code: string;
  status: "active" | "claimed" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  created_by: string;
  claimed_by: string | null;
  claimed_at: string | null;
};

export async function myCouple(): Promise<Couple | null> {
  const { data, error } = await supabase.rpc("my_couple");
  if (error) throw error;
  return (data as Couple) ?? null;
}

export async function createCouple(title?: string): Promise<Couple> {
  const { data, error } = await supabase.rpc("couple_create", {
    p_title: title ?? null,
  });
  if (error) throw error;
  return data as Couple;
}

export async function generateInvite(
  coupleId: string,
  ttlMinutes = 15
): Promise<Invite> {
  const { data, error } = await supabase.rpc("invite_create", {
    p_couple: coupleId,
    p_ttl_minutes: ttlMinutes,
  });
  if (error) throw error;
  return data as Invite;
}

export async function claimInvite(code: string): Promise<Couple> {
  const { data, error } = await supabase.rpc("invite_claim", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as Couple;
}

export async function revokeInvite(code: string): Promise<void> {
  const { error } = await supabase.rpc("invite_revoke", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
}
