import { useEffect, useMemo, useRef, useState } from "react";
import type { RecordedSession } from "../types";

interface AgentCanvasProps {
  session: RecordedSession | null;
  phase?: number;
  compact?: boolean;
}

interface CanvasAgent {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
}

const fallbackAgents: CanvasAgent[] = [
  { id: "momentum", name: "MOMENTUM", role: "trend hunter", x: 0.22, y: 0.3 },
  { id: "mean-reversion", name: "REVERSION", role: "price skeptic", x: 0.78, y: 0.3 },
  { id: "market-skeptic", name: "SKEPTIC", role: "adversarial review", x: 0.5, y: 0.76 },
];

export function AgentCanvas({ session, phase = 0.58, compact = false }: AgentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const agents = useMemo<CanvasAgent[]>(
    () =>
      session?.agents.slice(0, 3).map((agent, index) => ({
        id: agent.agentId,
        name: agent.displayName.toUpperCase(),
        role: agent.persona.toLowerCase().replaceAll("_", " "),
        x: fallbackAgents[index]?.x ?? 0.5,
        y: fallbackAgents[index]?.y ?? 0.5,
      })) ?? fallbackAgents,
    [session],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animationId = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = () => {
      frame += reduceMotion ? 0 : 1;
      context.clearRect(0, 0, width, height);

      const center = { x: width * 0.5, y: height * 0.49 };
      context.lineWidth = 1;
      agents.forEach((agent, index) => {
        const x = agent.x * width;
        const y = agent.y * height;
        const hostile = session?.evidenceValidation.blocked && index === 0;
        const gradient = context.createLinearGradient(x, y, center.x, center.y);
        gradient.addColorStop(0, hostile ? "rgba(255,92,53,.78)" : "rgba(178,187,196,.3)");
        gradient.addColorStop(1, "rgba(178,187,196,.04)");
        context.strokeStyle = gradient;
        context.beginPath();
        context.moveTo(x, y);
        context.quadraticCurveTo(center.x, y, center.x, center.y);
        context.stroke();

        const travel = ((frame * 0.006 + index * 0.31) % 1);
        const px = (1 - travel) * x + travel * center.x;
        const py = (1 - travel) * y + travel * center.y - Math.sin(travel * Math.PI) * height * 0.08;
        context.fillStyle = hostile ? "#ff5c35" : "#d7ff64";
        context.beginPath();
        context.arc(px, py, hostile ? 4.5 : 3.2, 0, Math.PI * 2);
        context.fill();
      });

      const gatePulse = 7 + Math.sin(frame * 0.04) * 3;
      context.fillStyle = session?.execution.status === "BLOCKED" ? "#ff5c35" : "#d7ff64";
      context.globalAlpha = 0.18;
      context.beginPath();
      context.arc(center.x, center.y, 34 + gatePulse, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(center.x, center.y, 25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#111315";
      context.font = "700 10px 'JetBrains Mono Variable', monospace";
      context.textAlign = "center";
      context.fillText(session?.execution.status === "BLOCKED" ? "LOCK" : "GATE", center.x, center.y + 3);

      agents.forEach((agent, index) => {
        const x = agent.x * width;
        const y = agent.y * height;
        const selected = index === selectedAgent;
        const hostile = session?.evidenceValidation.blocked && index === 0;
        context.strokeStyle = hostile ? "#ff5c35" : selected ? "#d7ff64" : "#56606a";
        context.lineWidth = selected ? 2.5 : 1;
        context.fillStyle = selected ? "#20252a" : "#171a1d";
        context.beginPath();
        context.arc(x, y, selected ? 37 : 31, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        context.fillStyle = hostile ? "#ff5c35" : "#f2f4ef";
        context.font = "700 11px 'JetBrains Mono Variable', monospace";
        context.textAlign = "center";
        context.fillText(agent.name.split(" ")[0], x, y + 3);
        context.fillStyle = "#8d969e";
        context.font = "500 9px 'JetBrains Mono Variable', monospace";
        context.fillText(agent.role, x, y + 54);
      });

      if (!reduceMotion) animationId = requestAnimationFrame(draw);
    };
    draw();

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = agents.findIndex((agent) =>
        Math.hypot(x - agent.x * rect.width, y - agent.y * rect.height) < 48,
      );
      if (hit >= 0) setSelectedAgent(hit);
    };
    canvas.addEventListener("pointerdown", onPointer);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, [agents, selectedAgent, session, phase]);

  const proposal = session?.proposals.find((item) => item.agentId === agents[selectedAgent]?.id);
  return (
    <div className={compact ? "agent-canvas compact" : "agent-canvas"}>
      <canvas ref={canvasRef} aria-label="Interactive agent decision network" />
      <div className="canvas-caption" aria-live="polite">
        <strong>{agents[selectedAgent]?.name}</strong>
        <span>{proposal?.position ?? "LISTENING"} {proposal ? `${Math.round(proposal.confidence * 100)}%` : ""}</span>
      </div>
    </div>
  );
}

