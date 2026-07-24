import {
  Archive,
  Binary,
  Circuitry,
  Command,
  List,
  Pulse,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTraceRoom } from "../TraceRoomContext";

const navItems = [
  { to: "/", label: "Command", icon: Command },
  { to: "/room", label: "Agent room", icon: Circuitry },
  { to: "/incidents", label: "Incidents", icon: Archive },
  { to: "/evidence", label: "Evidence", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();
  const { selected, error } = useTraceRoom();

  return (
    <div className="app-frame">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="TraceRoom command center">
          <span className="brand-mark"><Binary weight="bold" /></span>
          <span>TRACEROOM</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="topbar-status">
          <Pulse weight="fill" />
          <span>{selected ? `TRACE ${selected.signoz.traceId.slice(0, 8)}` : "STANDBY"}</span>
        </div>

        <button
          className="icon-button menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <List />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="mobile-nav"
            initial={reduce ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            aria-label="Mobile navigation"
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
                <Icon />
                {label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      {error && <div className="global-error" role="alert">{error}</div>}
      <main>{children}</main>
    </div>
  );
}
