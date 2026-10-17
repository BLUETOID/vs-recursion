import React, { useState, useRef, useEffect } from "react";
import { Terminal, AlertCircle, Copy, Check } from "lucide-react";

interface OutputProps {
  output: string;
  error?: string;
}

export const Output: React.FC<OutputProps> = ({ output, error }) => {
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [output]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="output-panel" id="terminal-output-panel">
      <div className="panel-header terminal-header">
        <div className="panel-title">
          <Terminal className="icon-xs" />
          <span>Terminal Output</span>
        </div>
        <div className="terminal-actions">
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

      <div className="terminal-body" ref={bodyRef}>
        {error && (
          <div className="terminal-error" id="terminal-error-banner">
            <AlertCircle className="icon-xs text-red" />
            <div className="error-content">
              <strong>Error:</strong>
              <pre>{error}</pre>
            </div>
          </div>
        )}

        <div className="terminal-text" id="terminal-text">
          {output ? (
            <pre>{output}</pre>
          ) : (
            <span className="terminal-empty">No output generated</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Output;
