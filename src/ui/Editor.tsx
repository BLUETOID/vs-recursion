import React, { useEffect, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditorType } from "monaco-editor";
import type { EventType } from "../interpreter";

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  currentLine?: number;
  eventType?: EventType;
  direction?: "DOWN" | "UP";
  readOnly?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  currentLine,
  eventType,
  direction,
  readOnly = false,
}) => {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Custom dark theme for recursion visualizer
    monaco.editor.defineTheme("recursionDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "7aa2f7", fontStyle: "bold" },
        { token: "type", foreground: "2ac3de" },
        { token: "string", foreground: "9ece6a" },
        { token: "number", foreground: "ff9e64" },
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "identifier", foreground: "c0caf5" },
        { token: "delimiter", foreground: "bb9af7" },
      ],
      colors: {
        "editor.background": "#141416",
        "editorGutter.background": "#141416",
        "editor.foreground": "#e4e4e7",
        "editorLineNumber.foreground": "#52525b",
        "editorLineNumber.activeForeground": "#a1a1aa",
        "editor.selectionBackground": "#27272f",
        "editor.lineHighlightBackground": "#1c1c20",
        "editorCursor.foreground": "#f4f4f5",
      },
    });

    monaco.editor.setTheme("recursionDark");
  };

  useEffect(() => {
    if (!editorRef.current || !currentLine) return;

    const editor = editorRef.current;

    // Pick decoration style based on event and direction
    let className = "line-highlight-exec";
    let glyphMarginClassName = "glyph-exec";

    if (eventType === "ERROR") {
      className = "line-highlight-error";
      glyphMarginClassName = "glyph-error";
    } else if (direction === "DOWN" || eventType === "CALL") {
      className = "line-highlight-down";
      glyphMarginClassName = "glyph-down";
    } else if (direction === "UP" || eventType === "RETURN") {
      className = "line-highlight-up";
      glyphMarginClassName = "glyph-up";
    }

    const newDecorations = [
      {
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className,
          glyphMarginClassName,
        },
      },
    ];

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    editor.revealLineInCenterIfOutsideViewport(currentLine);
  }, [currentLine, eventType, direction]);

  return (
    <div className="editor-container" id="monaco-editor-wrapper">
      <MonacoEditor
        height="100%"
        language="cpp"
        value={code}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        theme="recursionDark"
        loading={<div style={{ height: "100%", background: "#141416" }} />}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          glyphMargin: true,
          lineNumbersMinChars: 3,
          readOnly,
          tabSize: 4,
          automaticLayout: true,
          renderLineHighlight: "all",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};
