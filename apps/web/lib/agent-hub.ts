import type { AgentId } from "./types";

/**
 * Lightweight shared state connecting the UI layer to the 3D scene.
 *
 * When an agent card is hovered or selected in the interface, the hub notifies
 * any subscribed scene so the corresponding 3D node can highlight and its data
 * stream can become visible. Kept intentionally tiny — no external store.
 */

type Listener = (id: AgentId | null) => void;

let current: AgentId | null = null;
const listeners = new Set<Listener>();

export function setAgentFocus(id: AgentId | null): void {
  if (current === id) return;
  current = id;
  listeners.forEach((l) => l(id));
}

export function getAgentFocus(): AgentId | null {
  return current;
}

export function subscribeAgentFocus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
