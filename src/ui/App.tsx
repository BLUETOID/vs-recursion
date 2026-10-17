import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "./Editor";
import { CallStack } from "./CallStack";
import { Output } from "./Output";
import { Controls } from "./Controls";
import { RecursionTree } from "./RecursionTree";
import { formatValue } from "./formatValue";
import { runInterpreter } from "../interpreter";
import type { TraceEvent } from "../interpreter";
import { PRESET_EXAMPLES } from "../examples/presets";
import {
  Code2,
  GitBranch,
  Layers,
  Info,
  X,
  ChevronRight,
  Activity,
} from "lucide-react";

export const App: React.FC = () => {
  // Preset & Editor state
  const [selectedPresetId, setSelectedPresetId] = useState<string>("fibonacci");
  const currentPreset = PRESET_EXAMPLES.find((p) => p.id === selectedPresetId) || PRESET_EXAMPLES[0];
  const [code, setCode] = useState<string>(currentPreset.code);

  // Interpreter & Trace state
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [runtimeError, setRuntimeError] = useState<string | undefined>(undefined);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const timerRef = useRef<number | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<"stack" | "tree">("stack");
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Resizable Workspace Splitter State
  const [splitPercent, setSplitPercent] = useState<number>(45); // Left column width %
  const [consoleHeight, setConsoleHeight] = useState<number>(170); // Bottom console height px
  const isDraggingSplitterRef = useRef<boolean>(false);
  const isDraggingConsoleRef = useRef<boolean>(false);

  // Re-run interpreter whenever code changes
  const executeTrace = useCallback((sourceCode: string) => {
    setIsPlaying(false);
    const result = runInterpreter(sourceCode);
    setTrace(result.trace);
    setRuntimeError(result.error);
    setCurrentIndex(0);
  }, []);

  // Initial run and when preset changes
  useEffect(() => {
    executeTrace(code);
  }, [code, executeTrace]);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_EXAMPLES.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setCode(preset.code);
    }
  };

  // Step navigation handlers
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < trace.length - 1) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  }, [trace.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleJumpToStart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const handleJumpToEnd = useCallback(() => {
    setCurrentIndex(Math.max(0, trace.length - 1));
    setIsPlaying(false);
  }, [trace.length]);

  const handleReset = useCallback(() => {
    executeTrace(code);
  }, [code, executeTrace]);

  const handleSeek = useCallback((index: number) => {
    setCurrentIndex(Math.min(Math.max(0, index), trace.length - 1));
  }, [trace.length]);

  const handlePlayToggle = useCallback(() => {
    if (currentIndex >= trace.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentIndex, trace.length]);

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(80, 800 / speed);
      timerRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, trace.length]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.classList.contains("monaco-mouse-cursor-text")
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === " ") {
        e.preventDefault();
        handlePlayToggle();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        executeTrace(code);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handlePlayToggle, executeTrace, code]);

  // Splitter drag event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplitterRef.current) {
        const newPercent = (e.clientX / window.innerWidth) * 100;
        setSplitPercent(Math.min(Math.max(newPercent, 25), 75));
      } else if (isDraggingConsoleRef.current) {
        const newHeight = window.innerHeight - e.clientY;
        setConsoleHeight(Math.min(Math.max(newHeight, 80), 450));
      }
    };

    const handleMouseUp = () => {
      isDraggingSplitterRef.current = false;
      isDraggingConsoleRef.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const currentEvent = trace[currentIndex] || {
    index: 0,
    type: "LINE",
    line: 1,
    stack: [],
    output: "",
    treeNodes: [],
  };

  // Jump to specific frame entry
  const handleSeekFrame = (frameId: string) => {
    const callIdx = trace.findIndex((e) => e.activeFrameId === frameId && e.type === "CALL");
    if (callIdx !== -1) {
      handleSeek(callIdx);
    }
  };

  return (
    <div className="app-container" id="recursion-visualizer-app">
      {/* Top Navigation Bar: Minimalist developer toolbar */}
      <header className="navbar">
        <div className="navbar-left">
          <div className="brand-logo-area">
            <div className="brand-icon-wrapper" title="VS-Recursion Visualizer">
              <GitBranch className="icon-sm" />
            </div>
            <span className="brand-title">VS-Recursion</span>
          </div>

          <div className="preset-selector-group">
            <span className="preset-label">Program:</span>
            <select
              id="preset-select"
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="preset-select"
            >
              {Array.from(new Set(PRESET_EXAMPLES.map((p) => p.category))).map((cat) => (
                <optgroup key={cat} label={cat}>
                  {PRESET_EXAMPLES.filter((p) => p.category === cat).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className="btn-icon"
              onClick={() => setShowInfo(!showInfo)}
              title="Show program description"
              id="btn-info-toggle"
            >
              <Info className="icon-xs" />
            </button>
          </div>
        </div>
      </header>

      {/* Program Info Banner */}
      {showInfo && (
        <div className="info-banner animate-fade-in" id="preset-info-banner">
          <div className="info-content">
            <strong>{currentPreset.name}:</strong> {currentPreset.description}{" "}
            <span className="info-detail">{currentPreset.explanation}</span>
          </div>
          <button className="btn-close" onClick={() => setShowInfo(false)} title="Close banner">
            <X className="icon-xs" />
          </button>
        </div>
      )}

      {/* Step Narration Bar: Pedagogical Clarity Strip */}
      <div className="narration-strip" id="step-narration-strip">
        <div className="narration-meta">
          <Activity className="icon-xs text-muted" />
          <span className="narration-step-label">Step {trace.length > 0 ? currentIndex + 1 : 0}:</span>
          <span
            className={`narration-badge ${
              currentEvent.isBaseCase
                ? "badge-basecase"
                : currentEvent.type === "CALL"
                ? "badge-call"
                : currentEvent.type === "RETURN"
                ? "badge-return"
                : currentEvent.type === "PRINT"
                ? "badge-print"
                : "badge-line"
            }`}
          >
            {currentEvent.isBaseCase ? "BASE CASE" : currentEvent.type}
          </span>
          {currentEvent.line && <span className="narration-line">:L{currentEvent.line}</span>}
        </div>

        <div className="narration-text" id="step-explanation-text">
          {currentEvent.explanation || "Execution paused. Step forward to trace code."}
        </div>

        {/* Stack Breadcrumb Chain */}
        {currentEvent.stack.length > 0 && (
          <div className="stack-breadcrumbs" title="Call stack chain (Click to jump to invocation)">
            {currentEvent.stack.map((frame, i) => (
              <React.Fragment key={frame.id}>
                {i > 0 && <ChevronRight className="icon-xs breadcrumb-sep" />}
                <button
                  className={`breadcrumb-item ${i === currentEvent.stack.length - 1 ? "active" : ""}`}
                  onClick={() => handleSeekFrame(frame.id)}
                >
                  {frame.fn}({Object.values(frame.args).map((v) => formatValue(v, { compact: true, maxArrayItems: 2 })).join(", ")})
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Main Resizable Layout */}
      <main className="main-content" style={{ gridTemplateColumns: `${splitPercent}% 6px calc(${100 - splitPercent}% - 6px)` }}>
        {/* Left Column: Code Editor + Output Console */}
        <div className="column-left">
          <div className="editor-card" style={{ height: `calc(100% - ${consoleHeight}px - 6px)` }}>
            <div className="card-header">
              <div className="card-title">
                <Code2 className="icon-xs text-muted" />
                <span>main.cpp</span>
              </div>
              <div className="editor-meta">
                <span className="file-badge">C++ subset</span>
                {currentEvent.line && (
                  <span className="active-line-tag">:L{currentEvent.line}</span>
                )}
              </div>
            </div>

            <div className="editor-wrapper">
              <Editor
                code={code}
                onChange={(newVal) => setCode(newVal)}
                currentLine={currentEvent.line}
                eventType={currentEvent.type}
                direction={currentEvent.direction}
                readOnly={isPlaying}
              />
            </div>
          </div>

          {/* Vertical Console Resizer */}
          <div
            className="resizer-vertical"
            title="Drag to resize terminal output"
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingConsoleRef.current = true;
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
            }}
          />

          {/* Terminal Console */}
          <div className="console-wrapper" style={{ height: `${consoleHeight}px` }}>
            <Output
              output={currentEvent.output}
              error={runtimeError || currentEvent.message}
            />
          </div>
        </div>

        {/* Horizontal Main Splitter */}
        <div
          className="resizer-horizontal"
          title="Drag to resize panels"
          onMouseDown={(e) => {
            e.preventDefault();
            isDraggingSplitterRef.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* Right Column: Execution Controls, Call Stack, Recursion Tree */}
        <div className="column-right">
          {/* Controls Bar */}
          <div className="controls-card">
            <Controls
              currentIndex={currentIndex}
              totalSteps={trace.length}
              isPlaying={isPlaying}
              speed={speed}
              currentEventType={currentEvent.type}
              onNext={handleNext}
              onPrev={handlePrev}
              onPlayToggle={handlePlayToggle}
              onReset={handleReset}
              onJumpToStart={handleJumpToStart}
              onJumpToEnd={handleJumpToEnd}
              onSeek={handleSeek}
              onSpeedChange={setSpeed}
            />
          </div>

          {/* Visualizer Panels: Tabbed Header */}
          <div className="visualizer-card">
            <div className="tab-header">
              <div className="tabs-group">
                <button
                  className={`tab-btn ${activeTab === "stack" ? "active" : ""}`}
                  onClick={() => setActiveTab("stack")}
                  id="tab-call-stack"
                >
                  <Layers className="icon-xs" />
                  <span>Call Stack</span>
                  <span className="tab-badge">{currentEvent.stack.length}</span>
                </button>

                <button
                  className={`tab-btn ${activeTab === "tree" ? "active" : ""}`}
                  onClick={() => setActiveTab("tree")}
                  id="tab-recursion-tree"
                >
                  <GitBranch className="icon-xs" />
                  <span>Call Tree Graph</span>
                  <span className="tab-badge">{currentEvent.treeNodes?.length || 0}</span>
                </button>
              </div>

              <div className="tab-status-chip">
                {currentEvent.isBaseCase ? (
                  <span className="chip-basecase">Base Case Return</span>
                ) : currentEvent.type === "CALL" ? (
                  <span className="chip-call">Stack Push</span>
                ) : currentEvent.type === "RETURN" ? (
                  <span className="chip-return">Stack Pop & Return</span>
                ) : currentEvent.type === "PRINT" ? (
                  <span className="chip-print">Stdout Write</span>
                ) : null}
              </div>
            </div>

            {/* Tab Views */}
            <div className="tab-body">
              {activeTab === "stack" ? (
                <CallStack
                  stack={currentEvent.stack}
                  eventType={currentEvent.type}
                  direction={currentEvent.direction}
                  returnValue={currentEvent.returnValue}
                  isBaseCase={currentEvent.isBaseCase}
                  staticVars={currentEvent.staticVars}
                  recentChange={currentEvent.recentChange}
                />
              ) : (
                <RecursionTree
                  treeNodes={currentEvent.treeNodes || []}
                  activeNodeId={currentEvent.activeTreeNodeId}
                  onSelectNode={(callIdx) => handleSeek(callIdx)}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
