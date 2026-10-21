/* A calm English voice, if the device has one; otherwise whatever it defaults to. Shared by the
   reading toolbar (components/Access.tsx). */
export function pickVoice(): SpeechSynthesisVoice | null {
  const all = typeof window !== "undefined" ? window.speechSynthesis?.getVoices?.() ?? [] : [];
  const en = all.filter((v) => /^en[-_]/i.test(v.lang));
  const liked = /(daniel|alex|aaron|fred|arthur|oliver|google uk english male|google us english|microsoft (guy|mark|david|ryan|george)|male)/i;
  return en.find((v) => liked.test(v.name)) ?? en.find((v) => /en[-_](gb|us)/i.test(v.lang)) ?? en[0] ?? null;
}
