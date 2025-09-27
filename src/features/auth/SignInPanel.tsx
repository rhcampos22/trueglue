import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignInPanel() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setBusy(false);
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  };

  const signOut = async () => { await supabase.auth.signOut(); setMsg("Signed out."); };

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 10, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Sign in</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button disabled={!email || busy} onClick={signIn} style={{ padding: "8px 12px", borderRadius: 8 }}>
          {busy ? "Sending…" : "Magic link"}
        </button>
        <button onClick={signOut} style={{ padding: "8px 12px", borderRadius: 8 }}>Sign out</button>
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}
