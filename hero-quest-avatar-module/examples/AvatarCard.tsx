// AvatarCard.tsx — REFERENCE component (web React). For React Native, swap
// <div>/<img> for <View>/<Image> with absolute fill; logic is identical.
import React from "react";
import type { Manifest, AvatarState } from "../types/avatar";
import { stageForLevel, progressToNext } from "../engine/progression";
import { resolveSlot } from "../engine/assets";

const HOST = "/avatar-module/"; // where you host the assets folder

export function AvatarCard({ manifest, state }: { manifest: Manifest; state: AvatarState }) {
  const stage = stageForLevel(manifest, state.level);
  const prog = progressToNext(state.totalXp, manifest.meta.levelCap);
  const src = (slot: string) => {
    const a = resolveSlot(manifest, state, slot as any);
    return a ? HOST + a : null;
  };
  const overlays = manifest.render.slots
    .filter((s) => s.mode === "overlay")
    .sort((a, b) => a.z - b.z);

  return (
    <div style={{ width: 320, fontFamily: "system-ui" }}>
      <div style={{ position: "relative", width: 320, height: 320, borderRadius: 24, overflow: "hidden", background: "#0f172a" }}>
        {src("background") && <img src={src("background")!} alt="" style={layer(0)} />}
        <img src={src("base")!} alt="hero" style={layer(1)} />
        {overlays.filter((s) => s.id !== "background").map((s) => {
          const a = src(s.id);
          return a ? <img key={s.id} src={a} alt="" style={layer(2 + s.z)} /> : null;
        })}
      </div>
      <div style={{ marginTop: 12, color: "#e2e8f0" }}>
        <strong>{state.name}</strong> — Lv {state.level} · {stage.name}
        <div style={{ height: 10, background: "#1e293b", borderRadius: 999, marginTop: 6 }}>
          <div style={{ width: `${prog.fraction * 100}%`, height: "100%", background: "#22c55e", borderRadius: 999 }} />
        </div>
        <small>{prog.atCap ? "MAX LEVEL" : `${prog.intoLevel} / ${prog.needForLevel} XP`} · 🪙 {state.coins}</small>
      </div>
    </div>
  );
}

const layer = (z: number): React.CSSProperties => ({
  position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: z,
});
