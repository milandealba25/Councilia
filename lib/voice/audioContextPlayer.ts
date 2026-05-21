"use client";

export interface VoicePlaybackHandle {
  context: AudioContext;
  done: Promise<void>;
  stop: () => void;
}

let sharedAudioContext: AudioContext | null = null;
const activeSources = new Set<AudioBufferSourceNode>();

export function stopAllVoicePlayback(): void {
  for (const source of activeSources) {
    try { source.stop(); } catch { /* no-op */ }
  }
  activeSources.clear();
}

export function pauseVoicePlayback(): void {
  const ctx = getOrCreateVoiceAudioContext();
  if (ctx && ctx.state === "running") {
    void ctx.suspend();
  }
  if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
    window.speechSynthesis.pause();
  }
}

export function resumeVoicePlayback(): void {
  const ctx = getOrCreateVoiceAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
  if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
    window.speechSynthesis.resume();
  }
}

function getAudioContextCtor():
  | (new (contextOptions?: AudioContextOptions) => AudioContext)
  | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    // Compat Safari iOS/macOS antiguos
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

export function getOrCreateVoiceAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  sharedAudioContext = new Ctor();
  return sharedAudioContext;
}

export async function unlockVoicePlayback(): Promise<void> {
  const ctx = getOrCreateVoiceAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  const silentBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = silentBuffer;
  source.connect(ctx.destination);
  source.start(0);
}

export async function startVoiceContextPlayback(
  blob: Blob,
  signal?: AbortSignal,
): Promise<VoicePlaybackHandle> {
  const ctx = getOrCreateVoiceAudioContext();
  if (!ctx) {
    throw new Error("audio_context_unsupported");
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
    await new Promise((r) => setTimeout(r, 30));
  }

  const data = await blob.arrayBuffer();
  // Safari puede mutar el buffer internamente; usamos copia segura.
  const audioBuffer = await ctx.decodeAudioData(data.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  activeSources.add(source);

  const done = new Promise<void>((resolve) => {
    function cleanup() {
      activeSources.delete(source);
      source.onended = null;
      signal?.removeEventListener("abort", onAbort);
    }
    function onAbort() {
      try {
        source.stop();
      } catch {
        // no-op
      }
      cleanup();
      resolve();
    }
    source.onended = () => {
      cleanup();
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

  source.start(0);

  return {
    context: ctx,
    done,
    stop: () => {
      try {
        source.stop();
      } catch {
        // no-op
      }
    },
  };
}
