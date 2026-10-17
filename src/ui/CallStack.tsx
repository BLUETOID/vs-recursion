import React, { useState } from "react";
import type { Frame, EventType, StaticVarInfo, VarChange } from "../interpreter";
import { formatValue, isTruncatedValue } from "./formatValue";
import {
  Layers,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Cpu,
  CornerDownRight,
  Database,
  Lock,
} from "lucide-react";

interface CallStackProps {
  stack: Frame[];
  eventType?: EventType;
  direction?: "DOWN" | "UP";
  returnValue?: any;
  isBaseCase?: boolean;
  staticVars?: Record<string, StaticVarInfo>;
  recentChange?: VarChange;
}

export const CallStack: React.FC<CallStackProps> = ({
  stack,
  eventType,
  direction,
  returnValue,
  isBaseCase,
  staticVars,
  recentChange,
}) => {
  const reversedStack = [...stack].reverse();
  const staticEntries = Object.entries(staticVars || {});
  const [expandedChips, setExpandedChips] = useState<Set<string>>(new Set());

  const toggleChipExpand = (key: string) => {
    setExpandedChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderVarChip = (
    category: "arg" | "local" | "static",
    name: string,
    val: any,
    frameId: string,
    isTop: boolean,
    isConst = false,
    scopePrefix?: string
  ) => {
    const chipKey = `${frameId}-${category}-${name}`;
    const isExpanded = expandedChips.has(chipKey);
    const isTruncated = isTruncatedValue(val);
    const isUpdated =
      isTop &&
      recentChange?.name === name &&
      (recentChange.scope === category || (category === "arg" && recentChange.scope === "local"));

    const displayVal = isExpanded ? JSON.stringify(val) : formatValue(val);
    const fullValJson = JSON.stringify(val, null, 2);

    return (
      <div
        key={chipKey}
        className={`var-chip ${category}-chip ${isUpdated ? "chip-just-updated" : ""} ${
          isTruncated ? "chip-expandable" : ""
        }`}
        title={
          isTruncated
            ? `Full value:\n${fullValJson}\n(Click to ${isExpanded ? "collapse" : "expand"})`
            : `Value: ${JSON.stringify(val)}`
        }
        onClick={isTruncated ? () => toggleChipExpand(chipKey) : undefined}
      >
        {isUpdated && <span className="chip-badge-updated">UPDATED</span>}
        {category === "static" && <span className="chip-badge-static">STATIC</span>}
        {isConst && (
          <span title="Const parameter/variable">
            <Lock className="icon-xs text-amber" />
          </span>
        )}
        {scopePrefix && <span className="static-chip-scope">{scopePrefix}</span>}
        <span className="chip-key">{name}</span>
        <span className="chip-separator">=</span>
        <span className="chip-val">{displayVal}</span>
        {isTruncated && (
          <span className="chip-expand-indicator" title={isExpanded ? "Collapse" : "Expand"}>
            {isExpanded ? "▲" : "…"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="call-stack-panel" id="call-stack-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Layers className="icon-sm text-muted" />
          <span>Call Stack</span>
          <span className="badge-count">{stack.length} frames</span>
          {staticEntries.length > 0 && (
            <span className="badge-count badge-amber" title="Static variables alive in memory">
              {staticEntries.length} static
            </span>
          )}
        </div>
        {direction && (
          <div className={`direction-indicator ${direction.toLowerCase()}`}>
            {direction === "DOWN" ? (
              <>
                <ArrowDown className="icon-xs" />
                <span>Call Descent</span>
              </>
            ) : (
              <>
                <ArrowUp className="icon-xs" />
                <span>Stack Unwinding</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Global & Function Static Memory Strip */}
      {staticEntries.length > 0 && (
        <div className="static-memory-strip" id="static-memory-strip">
          <div className="static-strip-header">
            <Database className="icon-xs text-amber" />
            <span className="static-strip-title">Static Storage (Shared Across All Frames):</span>
          </div>
          <div className="static-chips-list">
            {staticEntries.map(([key, info]) =>
              renderVarChip(
                "static",
                info.name,
                info.value,
                "global-static",
                true,
                info.isConst,
                info.fnName ? `${info.fnName}::` : "global::"
              )
            )}
          </div>
        </div>
      )}

      <div className="frames-container">
        {reversedStack.length === 0 ? (
          <div className="empty-stack">
            <Cpu className="empty-icon" />
            <p>Stack inactive. Step or run trace to begin execution.</p>
          </div>
        ) : (
          reversedStack.map((frame, index) => {
            const isTop = index === 0;
            const hasArgs = Object.keys(frame.args).length > 0;
            const hasLocals = Object.keys(frame.locals).length > 0;
            const frameStatics = frame.staticVars ? Object.entries(frame.staticVars) : [];
            const hasStatics = frameStatics.length > 0;
            const isReturning = isTop && eventType === "RETURN";
            const constSet = new Set(frame.constVars || []);

            return (
              <div
                key={frame.id}
                className={`frame-card ${isTop ? "frame-top" : "frame-parent"} ${
                  isReturning ? (isBaseCase ? "frame-base-case" : "frame-returning") : ""
                }`}
              >
                <div className="frame-card-header">
                  <div className="frame-fn-sig">
                    <span className="frame-index">#{stack.length - index}</span>
                    <span className="fn-name">{frame.fn}</span>
                    <span className="fn-args-inline">
                      (
                      {Object.entries(frame.args)
                        .map(([k, v]) => `${k}=${formatValue(v, { compact: true, maxArrayItems: 3 })}`)
                        .join(", ")}
                      )
                    </span>
                  </div>
                  <div className="frame-meta">
                    <span className="line-badge">:L{frame.line}</span>
                    {isTop && <span className="top-badge">ACTIVE</span>}
                  </div>
                </div>

                {/* Caller resume target */}
                {frame.callerFn && (
                  <div className="frame-caller-hint">
                    <CornerDownRight className="icon-xs text-dim" />
                    <span>Called by <code>{frame.callerFn}</code> at line {frame.callerLine}</span>
                  </div>
                )}

                {/* Return Banner */}
                {isReturning && (
                  <div className={`return-banner ${isBaseCase ? "base-case" : ""}`}>
                    <CornerDownLeft className="icon-xs" />
                    <span>{isBaseCase ? "Base Case Return:" : "Return value:"}</span>
                    <code className="return-val">
                      {returnValue !== undefined ? formatValue(returnValue) : "void"}
                    </code>
                    {isBaseCase && <span className="base-case-badge">BASE CASE</span>}
                  </div>
                )}

                <div className="frame-details">
                  {/* Static variables accessible in this function */}
                  {hasStatics && (
                    <div className="var-group">
                      <span className="var-group-label text-amber">
                        <Database className="icon-xs inline-icon" /> static:
                      </span>
                      <div className="var-chips">
                        {frameStatics.map(([k, v]) =>
                          renderVarChip("static", k, v, frame.id, isTop, false)
                        )}
                      </div>
                    </div>
                  )}

                  {hasArgs && (
                    <div className="var-group">
                      <span className="var-group-label">args:</span>
                      <div className="var-chips">
                        {Object.entries(frame.args).map(([k, v]) =>
                          renderVarChip("arg", k, v, frame.id, isTop, constSet.has(k))
                        )}
                      </div>
                    </div>
                  )}

                  {hasLocals && (
                    <div className="var-group">
                      <span className="var-group-label">locals:</span>
                      <div className="var-chips">
                        {Object.entries(frame.locals).map(([k, v]) =>
                          renderVarChip("local", k, v, frame.id, isTop, constSet.has(k))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallStack;
