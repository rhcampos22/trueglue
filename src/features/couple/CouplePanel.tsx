// src/features/couple/CouplePanel.tsx
import React, { useState } from "react";
import { useCouple } from "../../hooks/useCouple";
import { generateInvite, claimInvite } from "./api";

export default function CouplePanel() {
  const { couple, loading, error, refresh, createCouple } = useCouple();
  const [invite, setInvite] = useState<{ code: string; expires_at: string } | null>(null);
  const [joinCode, setJoinCode] = useState("");

  if (loading) return <div>Loading couple…</div>;
  if (error) return <div style={{ color: "tomato" }}>Error: {error}</div>;

  return (
    <div style={{ border: "1px solid var(--border, #ccc)", padding: 16, borderRadius: 12 }}>
      <h3>Couple Linking</h3>

      {couple ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Couple:</strong> {couple.title ?? couple.id}
          </div>

          <button
            onClick={async () => {
              const inv = await generateInvite(couple.id);
              setInvite(inv);
            }}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Generate Invite Code
          </button>

          {invite && (
            <div style={{ marginTop: 10 }}>
              <div>
                <strong>Code:</strong> {invite.code}
              </div>
              <div>
                <strong>Expires at:</strong> {new Date(invite.expires_at).toLocaleString()}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button onClick={refresh} style={{ padding: "6px 10px", borderRadius: 8 }}>
              Refresh
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                await createCouple("Our Couple");
                await refresh();
              }}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Create Couple
            </button>

            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter invite code"
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && joinCode.trim()) {
                  await claimInvite(joinCode);
                  setJoinCode("");
                  await refresh();
                }
              }}
            />
            <button
              disabled={!joinCode.trim()}
              onClick={async () => {
                await claimInvite(joinCode);
                setJoinCode("");
                await refresh();
              }}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Join
            </button>
          </div>
        </>
      )}
    </div>
  );
}
