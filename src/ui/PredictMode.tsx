import React, { useState } from "react";
import { Check, X, ArrowRight, Crosshair } from "lucide-react";
import type { TraceEvent } from "../interpreter";

interface PredictModeProps {
  currentEvent: TraceEvent;
  nextEvent?: TraceEvent;
  onAdvance: () => void;
}

export const PredictMode: React.FC<PredictModeProps> = ({
  currentEvent,
  nextEvent,
  onAdvance,
}) => {
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const isReturnComing = nextEvent?.type === "RETURN" && nextEvent.returnValue !== undefined;
  const isPrintComing = nextEvent?.type === "PRINT";

  const question = isReturnComing
    ? `Evaluate upcoming return value for frame ${nextEvent.stack[nextEvent.stack.length - 1]?.fn || "f"}:`
    : isPrintComing
    ? "Predict upcoming stdout token:"
    : "Predict next execution transition:";

  const expectedAnswer = isReturnComing
    ? String(nextEvent.returnValue)
    : isPrintComing
    ? nextEvent.output.slice(currentEvent.output.length).trim()
    : "";

  const handleCheck = () => {
    if (!expectedAnswer) {
      onAdvance();
      return;
    }

    const trimmedGuess = guess.trim();
    const isCorrect = trimmedGuess === expectedAnswer;

    setTotalAttempts((prev) => prev + 1);
    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({
        isCorrect: true,
        message: `Match: Value is ${expectedAnswer}`,
      });
    } else {
      setFeedback({
        isCorrect: false,
        message: `Mismatch: Expected ${expectedAnswer}`,
      });
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setGuess("");
    onAdvance();
  };

  return (
    <div className="predict-mode-card" id="predict-mode-card">
      <div className="predict-header">
        <div className="predict-title">
          <Crosshair className="icon-xs text-cyan" />
          <span>Checkpoint</span>
        </div>
        <div className="predict-score">
          Accuracy: <strong>{score}</strong> / {totalAttempts}
        </div>
      </div>

      <div className="predict-question">
        <p className="q-text">{question}</p>
      </div>

      {!feedback ? (
        <div className="predict-input-row">
          <input
            type="text"
            className="predict-input"
            id="predict-input"
            placeholder="Enter expected value..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={handleCheck}
            id="btn-check-prediction"
          >
            Evaluate
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNext}
          >
            Skip
          </button>
        </div>
      ) : (
        <div className={`predict-feedback ${feedback.isCorrect ? "correct" : "incorrect"}`}>
          <div className="feedback-content">
            {feedback.isCorrect ? (
              <Check className="icon-sm text-green" />
            ) : (
              <X className="icon-sm text-red" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleNext}>
            <span>Continue</span>
            <ArrowRight className="icon-xs" />
          </button>
        </div>
      )}
    </div>
  );
};
