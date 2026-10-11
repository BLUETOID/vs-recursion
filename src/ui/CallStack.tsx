import React from "react";
import type { Frame, EventType } from "../interpreter";
import {
  Layers,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Cpu,
  CornerDownRight,
} from "lucide-react";

interface CallStackProps {
  stack: Frame[];
  eventType?: EventType;
  direction?: "DOWN" | "UP";
  returnValue?: any;
  isBaseCase?: boolean;
}

export const CallStack: React.FC<CallStackProps> = ({
  stack,
  eventType,
  direction,
  returnValue,
  isBaseCase,
}) => {
  const reversedStack = [...stack].reverse();

  return (
    <div className="call-stack-panel" id="call-stack-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Layers className="icon-sm text-blue" />
          <span>Call Stack</span>
          <span className="badge-count">{stack.length} frames</span>
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
            const isReturning = isTop && eventType === "RETURN";

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
                        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
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
                      {returnValue !== undefined ? JSON.stringify(returnValue) : "void"}
                    </code>
                    {isBaseCase && <span className="base-case-badge">BASE CASE</span>}
                  </div>
                )}

                <div className="frame-details">
                  {hasArgs && (
                    <div className="var-group">
                      <span className="var-group-label">args:</span>
                      <div className="var-chips">
                        {Object.entries(frame.args).map(([k, v]) => (
                          <div key={k} className="var-chip arg-chip">
                            <span className="chip-key">{k}</span>
                            <span className="chip-separator">=</span>
                            <span className="chip-val">{JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasLocals && (
                    <div className="var-group">
                      <span className="var-group-label">locals:</span>
                      <div className="var-chips">
                        {Object.entries(frame.locals).map(([k, v]) => (
                          <div key={k} className="var-chip local-chip">
                            <span className="chip-key">{k}</span>
                            <span className="chip-separator">=</span>
                            <span className="chip-val">{JSON.stringify(v)}</span>
                          </div>
                        ))}
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
