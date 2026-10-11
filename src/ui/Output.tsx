import React, { useState } from "react";
import {
  Terminal,
  AlertCircle,
  Copy,
  Check,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Columns,
  Maximize2,
  Lock,
} from "lucide-react";
import type { TraceEvent } from "../interpreter";

interface OutputProps {
  output: string;
  error?: string;
  currentEvent?: TraceEvent;
  totalCalls?: number;
  maxStackDepth?: number;
  currentIndex?: number;
  totalSteps?: number;
}

export const Output: React.FC<OutputProps> = ({
  output,
  error,
  currentEvent,
  totalCalls = 0,
  maxStackDepth = 0,
  currentIndex = 0,
  totalSteps = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "variables" | "inspector">("terminal");
  const [isSplitView, setIsSplitView] = useState(true);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const topFrame = currentEvent?.stack && currentEvent.stack.length > 0
    ? currentEvent.stack[currentEvent.stack.length - 1]
    : null;

  const staticEntries = Object.entries(currentEvent?.staticVars || {});
  const globalEntries = Object.entries(currentEvent?.globals || {});
  const localEntries = topFrame ? Object.entries(topFrame.locals) : [];
  const argEntries = topFrame ? Object.entries(topFrame.args) : [];
  const constSet = new Set(topFrame?.constVars || []);

  const totalVarCount = staticEntries.length + globalEntries.length + localEntries.length + argEntries.length;

  return (
    <div className="output-panel" id="terminal-output-panel">
      {/* Console Header with Navigation Tabs & View Toggles */}
      <div className="panel-header terminal-header">
        <div className="terminal-tabs-left">
          <button
            className={`console-tab-btn ${activeTab === "terminal" ? "active" : ""}`}
            onClick={() => setActiveTab("terminal")}
            title="Standard output stream (cout)"
          >
            <Terminal className="icon-xs text-cyan" />
            <span>Standard Output</span>
            {output && <span className="tab-pill-count">{output.split("\n").filter(Boolean).length} lines</span>}
          </button>

          <button
            className={`console-tab-btn ${activeTab === "variables" ? "active" : ""}`}
            onClick={() => setActiveTab("variables")}
            title="Variable memory watch: static, globals, locals"
          >
            <Database className="icon-xs text-amber" />
            <span>Memory Watch</span>
            {totalVarCount > 0 && <span className="tab-pill-count badge-amber">{totalVarCount} vars</span>}
          </button>

          <button
            className={`console-tab-btn ${activeTab === "inspector" ? "active" : ""}`}
            onClick={() => setActiveTab("inspector")}
            title="Step diagnostics and execution metrics"
          >
            <Cpu className="icon-xs text-blue" />
            <span>Step Diagnostics</span>
          </button>
        </div>

        <div className="terminal-actions">
          {/* Split View Toggle */}
          <button
            className={`terminal-btn ${isSplitView ? "btn-active-toggle" : ""}`}
            onClick={() => setIsSplitView(!isSplitView)}
            title={isSplitView ? "Switch to single tab view" : "Switch to side-by-side split view"}
          >
            {isSplitView ? (
              <>
                <Maximize2 className="icon-xs" />
                <span>Single View</span>
              </>
            ) : (
              <>
                <Columns className="icon-xs text-cyan" />
                <span>Split View</span>
              </>
            )}
          </button>

          {output && (
            <button
              className="terminal-btn"
              onClick={handleCopy}
              title="Copy output to clipboard"
            >
              {copied ? (
                <>
                  <Check className="icon-xs text-green" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="icon-xs" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error banner if present */}
      {error && (
        <div className="terminal-error" id="terminal-error-banner">
          <AlertCircle className="icon-sm text-red" />
          <div className="error-content">
            <strong>Runtime Error:</strong>
            <pre>{error}</pre>
          </div>
        </div>
      )}

      {/* Main Console Content Body */}
      <div className={`terminal-body ${isSplitView ? "split-mode" : "single-mode"}`}>
        {/* Left Side: Standard Output Terminal */}
        {(isSplitView || activeTab === "terminal") && (
          <div className="terminal-section terminal-stdout-pane" id="terminal-text">
            <div className="subpanel-header">
              <div className="subpanel-title">
                <Terminal className="icon-xs text-cyan" />
                <span>Standard Output (cout)</span>
              </div>
              <span className="subpanel-meta">{output.length} chars</span>
            </div>

            <div className="stdout-content-scroll">
              {output ? (
                <pre className="stdout-text">{output}</pre>
              ) : (
                <div className="terminal-empty">
                  <span>No output generated yet. Run or step trace to execute cout.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side in Split View, or Selected Tab View: Variables Watch */}
        {(isSplitView || activeTab === "variables") && (
          <div className="terminal-section terminal-variables-pane" id="terminal-variables-watch">
            <div className="subpanel-header">
              <div className="subpanel-title">
                <Database className="icon-xs text-amber" />
                <span>Variables & Memory Watch</span>
              </div>
              {currentEvent?.recentChange && (
                <div className="recent-change-pill" title="Recently mutated variable">
                  <Sparkles className="icon-xs text-amber" />
                  <span>
                    {currentEvent.recentChange.name} = {JSON.stringify(currentEvent.recentChange.newValue)}
                  </span>
                </div>
              )}
            </div>

            <div className="variables-watch-scroll">
              {/* Static Variables Section */}
              {staticEntries.length > 0 && (
                <div className="memory-category static-category">
                  <div className="category-title">
                    <Database className="icon-xs text-amber" />
                    <span>Static Storage (Persistent Across Recursion)</span>
                    <span className="category-badge badge-amber">{staticEntries.length}</span>
                  </div>
                  <div className="var-cards-grid">
                    {staticEntries.map(([key, info]) => {
                      const isJustChanged = currentEvent?.recentChange?.name === info.name && currentEvent.recentChange.scope === "static";
                      return (
                        <div key={key} className={`memory-card static-card ${isJustChanged ? "card-highlight-pulse" : ""}`}>
                          <div className="card-top">
                            <span className="type-tag">{info.varType || "int"}</span>
                            <span className="scope-tag">{info.fnName ? `${info.fnName}()` : "global"}</span>
                            {info.isConst && <span className="const-tag"><Lock className="icon-xxs" /> const</span>}
                            <span className="badge-static">STATIC</span>
                          </div>
                          <div className="card-val-row">
                            <span className="var-name">{info.name}</span>
                            <span className="var-eq">=</span>
                            <span className="var-val text-amber">{JSON.stringify(info.value)}</span>
                          </div>
                          <span className="card-hint">Retains value across recursive calls</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global Variables Section */}
              {globalEntries.length > 0 && (
                <div className="memory-category global-category">
                  <div className="category-title">
                    <Layers className="icon-xs text-cyan" />
                    <span>Global Variables</span>
                    <span className="category-badge">{globalEntries.length}</span>
                  </div>
                  <div className="var-cards-grid">
                    {globalEntries.map(([name, info]) => {
                      const isJustChanged = currentEvent?.recentChange?.name === name && currentEvent.recentChange.scope === "global";
                      return (
                        <div key={name} className={`memory-card global-card ${isJustChanged ? "card-highlight-pulse" : ""}`}>
                          <div className="card-top">
                            <span className="type-tag">{info.varType || "int"}</span>
                            {info.isConst && <span className="const-tag"><Lock className="icon-xxs" /> const</span>}
                            <span className="scope-tag">global</span>
                          </div>
                          <div className="card-val-row">
                            <span className="var-name">{name}</span>
                            <span className="var-eq">=</span>
                            <span className="var-val text-cyan">{JSON.stringify(info.value)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Call Frame Locals & Arguments */}
              {topFrame && (argEntries.length > 0 || localEntries.length > 0) && (
                <div className="memory-category frame-category">
                  <div className="category-title">
                    <Cpu className="icon-xs text-blue" />
                    <span>Active Frame: <code>{topFrame.fn}()</code></span>
                    <span className="category-badge">:L{topFrame.line}</span>
                  </div>
                  <div className="var-cards-grid">
                    {argEntries.map(([k, v]) => (
                      <div key={`arg-${k}`} className="memory-card arg-card">
                        <div className="card-top">
                          <span className="type-tag">param</span>
                          {constSet.has(k) && <span className="const-tag"><Lock className="icon-xxs" /> const</span>}
                        </div>
                        <div className="card-val-row">
                          <span className="var-name">{k}</span>
                          <span className="var-eq">=</span>
                          <span className="var-val">{JSON.stringify(v)}</span>
                        </div>
                      </div>
                    ))}

                    {localEntries.map(([k, v]) => (
                      <div key={`local-${k}`} className="memory-card local-card">
                        <div className="card-top">
                          <span className="type-tag">local</span>
                          {constSet.has(k) && <span className="const-tag"><Lock className="icon-xxs" /> const</span>}
                        </div>
                        <div className="card-val-row">
                          <span className="var-name">{k}</span>
                          <span className="var-eq">=</span>
                          <span className="var-val">{JSON.stringify(v)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalVarCount === 0 && (
                <div className="terminal-empty">
                  <span>No variables defined or active in this step.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab View: Step Diagnostics */}
        {!isSplitView && activeTab === "inspector" && (
          <div className="terminal-section inspector-pane">
            <div className="subpanel-header">
              <div className="subpanel-title">
                <Cpu className="icon-xs text-blue" />
                <span>Step Diagnostics & Trace Metrics</span>
              </div>
            </div>

            <div className="inspector-grid">
              <div className="inspector-metric-card">
                <span className="metric-label">Step Index</span>
                <span className="metric-val">{currentIndex + 1} / {totalSteps}</span>
              </div>
              <div className="inspector-metric-card">
                <span className="metric-label">Event Type</span>
                <span className="metric-val text-blue">{currentEvent?.type || "LINE"}</span>
              </div>
              <div className="inspector-metric-card">
                <span className="metric-label">Call Depth</span>
                <span className="metric-val">{currentEvent?.stack?.length || 0} (Max: {maxStackDepth})</span>
              </div>
              <div className="inspector-metric-card">
                <span className="metric-label">Total Calls</span>
                <span className="metric-val text-amber">{totalCalls}</span>
              </div>
              {currentEvent?.returnValue !== undefined && (
                <div className="inspector-metric-card return-card">
                  <span className="metric-label">Return Value</span>
                  <span className="metric-val text-green">{JSON.stringify(currentEvent.returnValue)}</span>
                </div>
              )}
            </div>

            {currentEvent?.explanation && (
              <div className="inspector-explanation-box">
                <span className="box-title">Step Explanation:</span>
                <p>{currentEvent.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
