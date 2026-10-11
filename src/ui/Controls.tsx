import React from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
} from "lucide-react";
import type { EventType } from "../interpreter";

interface ControlsProps {
  currentIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  currentEventType?: EventType;
  onNext: () => void;
  onPrev: () => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (speed: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentIndex,
  totalSteps,
  isPlaying,
  speed,
  currentEventType,
  onNext,
  onPrev,
  onPlayToggle,
  onReset,
  onJumpToStart,
  onJumpToEnd,
  onSeek,
  onSpeedChange,
}) => {
  const isStart = currentIndex <= 0;
  const isEnd = currentIndex >= totalSteps - 1;

  const getEventBadgeClass = (type?: EventType) => {
    switch (type) {
      case "CALL": return "badge-call";
      case "RETURN": return "badge-return";
      case "PRINT": return "badge-print";
      case "ERROR": return "badge-error";
      case "LINE": return "badge-line";
      default: return "";
    }
  };

  return (
    <div className="controls-container" id="step-controls">
      <div className="controls-timeline">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          className="timeline-slider"
          id="timeline-slider"
          title="Timeline Scrubber"
        />
      </div>

      <div className="controls-main">
        {/* Buttons group */}
        <div className="controls-buttons">
          <button
            className="ctrl-btn"
            onClick={onJumpToStart}
            disabled={isStart}
            title="Jump to Start (Home)"
            id="btn-start"
          >
            <SkipBack className="icon-xs" />
          </button>

          <button
            className="ctrl-btn"
            onClick={onPrev}
            disabled={isStart}
            title="Step Back (Left Arrow)"
            id="btn-prev"
          >
            <ChevronLeft className="icon-sm" />
          </button>

          <button
            className={`ctrl-btn ctrl-btn-primary ${isPlaying ? "playing" : ""}`}
            onClick={onPlayToggle}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            id="btn-play-pause"
          >
            {isPlaying ? <Pause className="icon-sm" /> : <Play className="icon-sm" />}
          </button>

          <button
            className="ctrl-btn"
            onClick={onNext}
            disabled={isEnd}
            title="Step Next (Right Arrow)"
            id="btn-next"
          >
            <ChevronRight className="icon-sm" />
          </button>

          <button
            className="ctrl-btn"
            onClick={onJumpToEnd}
            disabled={isEnd}
            title="Jump to End (End)"
            id="btn-end"
          >
            <SkipForward className="icon-xs" />
          </button>

          <button
            className="ctrl-btn"
            onClick={onReset}
            title="Reset Trace"
            id="btn-reset"
          >
            <RotateCcw className="icon-xs" />
          </button>
        </div>

        {/* Step info and badges */}
        <div className="controls-info">
          <span className="step-count" id="step-count-display">
            Step <strong>{totalSteps > 0 ? currentIndex + 1 : 0}</strong> of{" "}
            <strong>{totalSteps}</strong>
          </span>

          {currentEventType && (
            <span
              className={`event-badge ${getEventBadgeClass(currentEventType)}`}
              id="event-badge"
            >
              {currentEventType}
            </span>
          )}
        </div>

        {/* Speed slider */}
        <div className="controls-speed">
          <Gauge className="icon-xs text-muted" />
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="speed-select"
            id="speed-select"
            title="Playback Speed"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="2">2.0x</option>
            <option value="4">4.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
