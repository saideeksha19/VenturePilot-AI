import { Crown, Crosshair, FlaskConical, Handshake, LineChart, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgentId } from "@/lib/types";

export const AGENT_ICONS: Record<AgentId, LucideIcon> = {
  ceo: Crown,
  research: FlaskConical,
  prospecting: Crosshair,
  sales: Handshake,
  marketing: Megaphone,
  analytics: LineChart,
};

export default function AgentIcon({
  agentId,
  size = 18,
  strokeWidth = 1.9,
}: {
  agentId: AgentId;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = AGENT_ICONS[agentId];
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
