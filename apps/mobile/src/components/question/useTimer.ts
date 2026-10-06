import { useEffect, useState } from "react";

/** Counts seconds while `running`; resets whenever `resetKey` changes (e.g. the question id). */
export function useTimer(running: boolean, resetKey: string): number {
  const [state, setState] = useState({ key: resetKey, seconds: 0 });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setState((s) => ({ key: resetKey, seconds: s.key === resetKey ? s.seconds + 1 : 1 })), 1000);
    return () => clearInterval(id);
  }, [running, resetKey]);
  return state.key === resetKey ? state.seconds : 0;
}
