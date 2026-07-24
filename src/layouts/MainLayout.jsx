import { NavLink, Outlet } from "react-router-dom";
import { Plus, Sun, Moon, Settings, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTema } from "../hooks/useTema";
import AuthGate from "../components/AuthGate";

export default function MainLayout() {
  const { session, usuario, loading, inativo, sair } = useAuth();
  const [tema, alternarTema] = useTema();

  if (loading) {
    return (
      <div className="sh-root" data-theme={tema}>
        <style>{shStyles}</style>
        <div className="sh-loading-gate">
          <Loader2 size={18} className="sh-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sh-root" data-theme={tema}>
        <style>{shStyles}</style>
        <AuthGate />
      </div>
    );
  }

  if (inativo) {
    return (
      <div className="sh-root" data-theme={tema}>
        <style>{shStyles}</style>
        <div className="sh-gate">
          <p className="sh-eyebrow">StatusHub · Rede D1000</p>
          <h1 className="sh-title" style={{ marginBottom: 12 }}>
            Acesso desativado
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
            Sua conta foi desativada por um administrador. Fale com o time
            responsável se isso for um engano.
          </p>
          <button type="button" className="sh-ghost-btn" onClick={sair}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sh-root" data-theme={tema}>
      <style>{shStyles}</style>

      <div className="sh-header">
        <div>
          <p className="sh-eyebrow">StatusHub · Rede D1000</p>
          <h1 className="sh-title">Acompanhamento de Chamados</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={alternarTema}
            className="sh-theme-toggle"
            title={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            aria-label="Alternar tema"
          >
            {tema === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Olá, <strong style={{ color: "var(--text)" }}>{usuario}</strong>{" "}
            ·{" "}
            <button
              type="button"
              onClick={sair}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
            >
              sair
            </button>
          </span>
          <div className="sh-tabs">
            <NavLink to="/" end className={({ isActive }) => `sh-tab ${isActive ? "active" : ""}`}>
              Painel
            </NavLink>
            <NavLink to="/novo" className={({ isActive }) => `sh-tab ${isActive ? "active" : ""}`}>
              <Plus size={14} /> Novo chamado
            </NavLink>
            <NavLink to="/configuracoes" className={({ isActive }) => `sh-tab ${isActive ? "active" : ""}`}>
              <Settings size={14} /> Configurações
            </NavLink>
          </div>
        </div>
      </div>

      <Outlet context={{ usuario }} />
    </div>
  );
}

const shStyles = `
        .sh-root[data-theme="dark"] {
          --bg: #12161d;
          --surface: #1a2029;
          --surface-2: #212836;
          --border: #2a3140;
          --text: #e8eaed;
          --text-dim: #8b93a3;
          --text-faint: #5b6472;
          --accent: #4f8fe8;
          --accent-text: #0d1117;
        }
        .sh-root[data-theme="light"] {
          --bg: #f4f5f7;
          --surface: #ffffff;
          --surface-2: #eef0f3;
          --border: #dde1e6;
          --text: #1a2029;
          --text-dim: #5b6472;
          --text-faint: #8b93a3;
          --accent: #2f6fd6;
          --accent-text: #ffffff;
        }
        .sh-root {
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          padding: 28px 24px 60px;
          box-sizing: border-box;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sh-root * { box-sizing: border-box; }
        .sh-theme-toggle {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-dim);
          border-radius: 8px;
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .sh-theme-toggle:hover { border-color: var(--accent); color: var(--text); }
        .sh-theme-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sh-mono {
          font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace;
        }
        .sh-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 22px;
        }
        .sh-eyebrow {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-faint);
          margin: 0 0 4px;
          font-weight: 600;
        }
        .sh-title {
          font-size: 22px;
          font-weight: 750;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .sh-tabs {
          display: flex;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 4px;
        }
        .sh-tab {
          border: none;
          background: transparent;
          color: var(--text-dim);
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
        }
        .sh-tab.active {
          background: var(--accent);
          color: var(--accent-text);
        }
        .sh-tab:not(.active):hover { color: var(--text); }
        .sh-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .sh-toast {
          background: rgba(79, 191, 122, 0.12);
          border: 1px solid #4fbf7a;
          color: #b3e6c4;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sh-spin { animation: sh-spin 0.9s linear infinite; }
        @keyframes sh-spin { to { transform: rotate(360deg); } }

        .sh-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .sh-stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          min-width: 108px;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .sh-stat:hover { border-color: var(--text-faint); }
        .sh-stat.active { border-color: var(--dot); }
        .sh-stat-num { font-size: 20px; font-weight: 750; }
        .sh-stat-label {
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 2px;
        }

        .sh-toolbar {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          align-items: flex-end;
        }
        .sh-filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .sh-filter-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .sh-select, .sh-input {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
        }
        .sh-select:focus-visible, .sh-input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .sh-multiselect-btn {
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 140px;
          justify-content: space-between;
        }
        .sh-multiselect-panel {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 20;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          min-width: 220px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .sh-multiselect-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          padding: 6px 4px;
          cursor: pointer;
          border-radius: 5px;
        }
        .sh-multiselect-option:hover { background: var(--surface-2); }
        .sh-multiselect-clear {
          width: 100%;
          margin-top: 4px;
          background: transparent;
          border: none;
          border-top: 1px solid var(--border);
          color: var(--text-dim);
          font-size: 12px;
          padding: 8px 4px 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sh-multiselect-clear:hover { color: var(--text); }
        .sh-search {
          position: relative;
          flex: 1;
          min-width: 180px;
        }
        .sh-search input {
          width: 100%;
          padding-left: 32px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding-top: 8px;
          padding-bottom: 8px;
          padding-right: 10px;
          font-size: 13px;
        }
        .sh-search input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .sh-search svg {
          position: absolute;
          left: 9px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-faint);
        }

        .sh-table-wrap {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .sh-row {
          display: grid;
          grid-template-columns: 90px 140px 1fr 90px 170px 130px 90px;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .sh-row:last-child { border-bottom: none; }
        .sh-row:hover { background: var(--surface-2); }
        .sh-row.head {
          background: var(--surface-2);
          cursor: default;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-faint);
          font-weight: 600;
        }
        .sh-row.head:hover { background: var(--surface-2); }
        .sh-filial-name { font-size: 13px; }
        .sh-filial-bandeira {
          font-size: 11px;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }
        .sh-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .sh-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 999px;
        }
        .sh-baton {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
        }
        .sh-baton-icon {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sh-detail {
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          padding: 16px 20px;
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.6;
        }
        .sh-detail strong { color: var(--text); }

        .sh-id-btn {
          background: transparent;
          border: none;
          color: inherit;
          font: inherit;
          padding: 3px 6px;
          margin: -3px -6px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          transition: background 0.12s ease;
        }
        .sh-id-btn:hover { background: var(--surface-2); color: var(--text); }
        .sh-id-btn:hover svg { opacity: 1; }
        .sh-id-btn svg { opacity: 0.4; flex-shrink: 0; }
        .sh-id-btn.copied { color: #4fbf7a; }
        .sh-id-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sh-id-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 106px;
        }

        .sh-detail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .sh-detail-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          align-items: center;
          flex-wrap: wrap;
        }
        .sh-ghost-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-dim);
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.12s ease;
        }
        .sh-ghost-btn:hover { border-color: var(--accent); color: var(--text); }
        .sh-ghost-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sh-ghost-btn.primary {
          background: var(--accent);
          border-color: var(--accent);
          color: var(--accent-text);
        }
        .sh-ghost-btn.primary:hover { background: #6ba3ee; }

        .sh-edit-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .sh-edit-grid .sh-field { margin-bottom: 0; }
        .sh-edit-grid.full { grid-template-columns: 1fr; }

        .sh-empty {
          padding: 48px 20px;
          text-align: center;
          color: var(--text-dim);
          background: var(--surface);
        }

        .sh-form {
          max-width: 560px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
        }
        .sh-field { margin-bottom: 16px; }
        .sh-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dim);
          margin-bottom: 6px;
        }
        .sh-field input, .sh-field select, .sh-field textarea {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 13px;
          font-family: inherit;
        }
        .sh-field textarea { resize: vertical; min-height: 70px; }
        .sh-field input:focus-visible,
        .sh-field select:focus-visible,
        .sh-field textarea:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .sh-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .sh-error {
          background: rgba(232, 115, 93, 0.12);
          border: 1px solid #e8735d;
          color: #f3b6ab;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 14px;
        }
        .sh-submit {
          background: var(--accent);
          color: var(--accent-text);
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sh-submit:hover { background: #6ba3ee; }
        .sh-submit:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
        .sh-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 720px) {
          .sh-row {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "id status"
              "filial filial"
              "canal proxima";
          }
          .sh-row.head { display: none; }
          .sh-row2 { grid-template-columns: 1fr; }
          .sh-edit-grid { grid-template-columns: 1fr; }
        }

        .sh-gate {
          max-width: 380px;
          margin: 12vh auto 0;
          text-align: left;
        }
        .sh-gate-form {
          display: flex;
          gap: 8px;
        }
        .sh-gate-form input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 14px;
        }
        .sh-gate-form input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .sh-form-gate {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px;
        }
        .sh-form-gate .sh-field input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 13px;
          font-family: inherit;
        }
        .sh-form-gate .sh-field input:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .sh-form-gate .sh-submit { width: 100%; justify-content: center; }
        .sh-gate-links {
          display: flex;
          justify-content: space-between;
          margin-top: 14px;
        }
        .sh-link-btn {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          font-size: 12px;
          padding: 0;
        }
        .sh-link-btn:hover { text-decoration: underline; }
        .sh-loading-gate {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          color: var(--text-dim);
        }

        .sh-timeline {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }
        .sh-timeline-toggle {
          background: transparent;
          border: none;
          color: var(--text-faint);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
        }
        .sh-timeline-toggle:hover { color: var(--text-dim); }
        .sh-timeline-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .sh-timeline-list { margin-top: 8px; }
        .sh-timeline-item {
          display: flex;
          gap: 10px;
          padding: 6px 0;
          font-size: 12.5px;
        }
        .sh-timeline-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .sh-timeline-meta {
          color: var(--text-faint);
          font-size: 11px;
          margin-top: 1px;
        }

        .sh-subtabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .sh-subtab {
          border: none;
          background: transparent;
          color: var(--text-dim);
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.12s ease;
        }
        .sh-subtab:hover { color: var(--text); }
        .sh-subtab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .sh-subtab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .sh-config-panel { max-width: 820px; }
        .sh-config-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .sh-config-hint {
          font-size: 12.5px;
          color: var(--text-dim);
          margin: 0;
        }
        .sh-config-note {
          font-size: 11.5px;
          color: var(--text-faint);
          margin-top: 10px;
        }
        .sh-config-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr 100px 80px;
          gap: 12px;
          align-items: center;
          padding: 11px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          font-size: 13px;
        }
        .sh-config-row:last-child { border-bottom: none; }
        .sh-config-row.head {
          background: var(--surface-2);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-faint);
          font-weight: 600;
        }
        .sh-config-row-lojas { grid-template-columns: 90px 1.4fr 120px 120px 80px; }
        .sh-config-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }
        .sh-icon-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-dim);
          border-radius: 6px;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .sh-icon-btn:hover { border-color: var(--accent); color: var(--text); }
        .sh-icon-btn.danger:hover { border-color: #e8735d; color: #e8735d; }
        .sh-icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

        .sh-pill-ok {
          background: rgba(79, 191, 122, 0.14);
          color: #4fbf7a;
        }
        .sh-pill-off {
          background: rgba(139, 147, 163, 0.16);
          color: var(--text-dim);
        }
        .sh-text-dim { color: var(--text-dim); }
`;
