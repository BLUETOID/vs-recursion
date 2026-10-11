import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { TreeNodeSnapshot } from "../interpreter";
import {
  GitBranch,
  CircleDashed,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Crosshair,
} from "lucide-react";

interface RecursionTreeProps {
  treeNodes: TreeNodeSnapshot[];
  activeNodeId?: string;
  onSelectNode?: (callIndex: number) => void;
}

interface PositionedNode {
  node: TreeNodeSnapshot;
  x: number;
  y: number;
  width: number;
  label: string;
  retStr?: string;
  retWidth?: number;
}

export const RecursionTree: React.FC<RecursionTreeProps> = ({
  treeNodes,
  activeNodeId,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isManualView, setIsManualView] = useState<boolean>(false);

  // Compute hierarchical tree layout with dynamic node widths
  const { layoutNodes, edges, bounds } = useMemo(() => {
    if (treeNodes.length === 0) {
      return {
        layoutNodes: [],
        edges: [],
        bounds: { minX: 0, maxX: 600, minY: 0, maxY: 400, width: 600, height: 400 },
      };
    }

    // 1. Calculate labels, dynamic widths, and return value pill widths for every node
    const nodeMetaMap = new Map<
      string,
      { width: number; label: string; retStr?: string; retWidth?: number }
    >();

    for (const node of treeNodes) {
      const argsStr = Object.values(node.args)
        .map((v) => {
          if (typeof v === "string") {
            return JSON.stringify(v.length > 12 ? v.slice(0, 10) + "…" : v);
          }
          if (Array.isArray(v)) {
            if (v.length > 4) {
              return `[${v.slice(0, 3).map((x) => JSON.stringify(x)).join(",")},…]`;
            }
            return JSON.stringify(v);
          }
          return JSON.stringify(v);
        })
        .join(", ");

      const label = `${node.fn}(${argsStr})`;
      // font-size: 10.5px monospace font width is ~7.0px per char + 28px padding
      const width = Math.max(96, Math.ceil(label.length * 7.2) + 28);

      let retStr: string | undefined;
      let retWidth: number | undefined;
      if (node.status === "returned" && node.returnValue !== undefined) {
        retStr = `= ${JSON.stringify(node.returnValue)}`;
        retWidth = Math.max(54, Math.ceil(retStr.length * 7.0) + 18);
      }

      nodeMetaMap.set(node.id, { width, label, retStr, retWidth });
    }

    // 2. Build parent-child relationships and find root(s)
    const childrenMap = new Map<string, TreeNodeSnapshot[]>();
    const allNodeIds = new Set(treeNodes.map((n) => n.id));
    const roots: TreeNodeSnapshot[] = [];

    for (const node of treeNodes) {
      if (!node.parentId || !allNodeIds.has(node.parentId)) {
        roots.push(node);
      } else {
        const list = childrenMap.get(node.parentId) || [];
        list.push(node);
        childrenMap.set(node.parentId, list);
      }
    }

    if (roots.length === 0 && treeNodes.length > 0) {
      roots.push(treeNodes[0]);
    }

    // 3. Compute subtree widths bottom-up to prevent any horizontal collisions
    const subtreeWidths = new Map<string, number>();
    const nodeGapX = 24; // minimum horizontal gap between adjacent subtrees

    function computeSubtreeWidth(id: string): number {
      const nodeMeta = nodeMetaMap.get(id);
      const selfWidth = (nodeMeta?.width || 96) + nodeGapX;
      const children = childrenMap.get(id) || [];

      if (children.length === 0) {
        subtreeWidths.set(id, selfWidth);
        return selfWidth;
      }

      let childrenTotalWidth = 0;
      for (const child of children) {
        childrenTotalWidth += computeSubtreeWidth(child.id);
      }

      const totalWidth = Math.max(selfWidth, childrenTotalWidth);
      subtreeWidths.set(id, totalWidth);
      return totalWidth;
    }

    for (const root of roots) {
      computeSubtreeWidth(root.id);
    }

    // 4. Place nodes top-down with exact center alignment
    const positions = new Map<string, { x: number; y: number }>();
    const levelSpacingY = 90;

    function layoutSubtree(id: string, startX: number, depth: number): void {
      const subWidth = subtreeWidths.get(id) || 120;
      const y = 60 + depth * levelSpacingY;
      const children = childrenMap.get(id) || [];

      if (children.length === 0) {
        const x = startX + subWidth / 2;
        positions.set(id, { x, y });
        return;
      }

      let childrenTotalWidth = 0;
      for (const child of children) {
        childrenTotalWidth += subtreeWidths.get(child.id) || 120;
      }

      const childOffset = (subWidth - childrenTotalWidth) / 2;
      let currentChildX = startX + childOffset;
      const childXs: number[] = [];

      for (const child of children) {
        const cWidth = subtreeWidths.get(child.id) || 120;
        layoutSubtree(child.id, currentChildX, depth + 1);
        childXs.push(currentChildX + cWidth / 2);
        currentChildX += cWidth;
      }

      const midChildX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      positions.set(id, { x: midChildX, y });
    }

    let forestStartX = 60;
    for (const root of roots) {
      layoutSubtree(root.id, forestStartX, 0);
      forestStartX += subtreeWidths.get(root.id) || 120;
    }

    // 5. Build positioned nodes, edges, and viewport bounds
    const posNodes: PositionedNode[] = [];
    const edgeList: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of treeNodes) {
      const pos = positions.get(node.id) || { x: 100, y: 100 };
      const meta = nodeMetaMap.get(node.id)!;
      const halfW = meta.width / 2;

      posNodes.push({
        node,
        x: pos.x,
        y: pos.y,
        width: meta.width,
        label: meta.label,
        retStr: meta.retStr,
        retWidth: meta.retWidth,
      });

      if (pos.x - halfW < minX) minX = pos.x - halfW;
      if (pos.x + halfW > maxX) maxX = pos.x + halfW;
      if (pos.y - 20 < minY) minY = pos.y - 20;
      if (pos.y + 36 > maxY) maxY = pos.y + 36;

      if (node.parentId && positions.has(node.parentId)) {
        const parentPos = positions.get(node.parentId)!;
        edgeList.push({
          id: `${node.parentId}-${node.id}`,
          x1: parentPos.x,
          y1: parentPos.y + 18,
          x2: pos.x,
          y2: pos.y - 18,
        });
      }
    }

    minX = Math.min(minX, 40);
    maxX = Math.max(maxX, 560);
    minY = Math.min(minY, 40);
    maxY = Math.max(maxY, 360);

    return {
      layoutNodes: posNodes,
      edges: edgeList,
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX + 160,
        height: maxY - minY + 160,
      },
    };
  }, [treeNodes]);

  // Center on active node when stepping
  const centerNode = useCallback(
    (targetId?: string) => {
      const target = layoutNodes.find((n) => n.node.id === (targetId || activeNodeId));
      if (!target || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newPanX = rect.width / 2 - target.x * zoom;
      const newPanY = rect.height / 2 - target.y * zoom;
      setPan({ x: newPanX, y: newPanY });
    },
    [layoutNodes, activeNodeId, zoom]
  );

  // Auto-center on active node unless manual pan
  useEffect(() => {
    if (!isManualView && activeNodeId) {
      centerNode(activeNodeId);
    }
  }, [activeNodeId, isManualView, centerNode]);

  // Fit entire tree into view
  const fitToView = useCallback(() => {
    if (!containerRef.current || layoutNodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 60;
    const scaleX = (rect.width - padding) / bounds.width;
    const scaleY = (rect.height - padding) / bounds.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.6);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - centerX * newZoom,
      y: rect.height / 2 - centerY * newZoom,
    });
    setIsManualView(true);
  }, [bounds, layoutNodes.length]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsManualView(true);
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3.0);

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setIsManualView(true);
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  return (
    <div className="recursion-tree-container" id="recursion-tree-panel">
      {/* Top Header */}
      <div className="panel-header">
        <div className="panel-title">
          <GitBranch className="icon-sm text-cyan" />
          <span>Call Tree Graph</span>
          <span className="badge-count">{treeNodes.length} nodes</span>
        </div>
        <div className="tree-legend">
          <span className="legend-item"><span className="legend-dot active" /> Active</span>
          <span className="legend-item"><span className="legend-dot returned" /> Returned</span>
        </div>
      </div>

      {/* Free-form Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        className={`tree-viewport-canvas ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Floating Canvas Controls Overlay */}
        <div className="floating-canvas-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className="canvas-btn"
            onClick={() => {
              setZoom((prev) => Math.min(3.0, prev * 1.2));
              setIsManualView(true);
            }}
            title="Zoom In (Scroll Up)"
          >
            <ZoomIn className="icon-xs" />
          </button>
          <button
            className="canvas-btn"
            onClick={() => {
              setZoom((prev) => Math.max(0.25, prev / 1.2));
              setIsManualView(true);
            }}
            title="Zoom Out (Scroll Down)"
          >
            <ZoomOut className="icon-xs" />
          </button>
          <button
            className="canvas-btn"
            onClick={() => {
              setZoom(1);
              setIsManualView(true);
            }}
            title="100% Zoom"
          >
            <span className="canvas-zoom-text">{Math.round(zoom * 100)}%</span>
          </button>
          <button
            className="canvas-btn"
            onClick={fitToView}
            title="Fit to Screen"
          >
            <Maximize2 className="icon-xs" />
          </button>
          <button
            className={`canvas-btn ${!isManualView ? "active-btn" : ""}`}
            onClick={() => {
              setIsManualView(false);
              centerNode();
            }}
            title="Center on Active Node"
          >
            <Crosshair className="icon-xs" />
          </button>
          <button
            className="canvas-btn"
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
              setIsManualView(false);
            }}
            title="Reset Canvas Position"
          >
            <RotateCcw className="icon-xs" />
          </button>
        </div>

        {treeNodes.length === 0 ? (
          <div className="empty-tree">
            <CircleDashed className="empty-icon" />
            <p>Tree generates dynamically as calls are made.</p>
          </div>
        ) : (
          <svg className="tree-svg-canvas">
            {/* Dot Grid Background Pattern */}
            <defs>
              <pattern
                id="canvas-grid"
                width={24 * zoom}
                height={24 * zoom}
                patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x % (24 * zoom)}, ${pan.y % (24 * zoom)})`}
              >
                <circle cx={2} cy={2} r={1} fill="#1c2638" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#canvas-grid)" />

            {/* Transform Group for Pan & Zoom */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Connecting Edges */}
              <g className="tree-edges">
                {edges.map((e) => (
                  <path
                    key={e.id}
                    d={`M ${e.x1} ${e.y1} C ${e.x1} ${(e.y1 + e.y2) / 2}, ${e.x2} ${(e.y1 + e.y2) / 2}, ${e.x2} ${e.y2}`}
                    className="tree-edge-line"
                  />
                ))}
              </g>

              {/* Call Nodes */}
              <g className="tree-nodes">
                {layoutNodes.map(({ node, x, y, width, label, retStr, retWidth }) => {
                  const isActive = node.id === activeNodeId;
                  const isReturned = node.status === "returned";
                  const halfW = width / 2;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${x}, ${y})`}
                      className={`tree-node-group ${isActive ? "active" : ""} ${isReturned ? "returned" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectNode) onSelectNode(node.callIndex);
                      }}
                      style={{ cursor: onSelectNode ? "pointer" : "default" }}
                    >
                      <title>{node.fn}({Object.entries(node.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})</title>

                      {/* Main Node Background Card */}
                      <rect
                        x={-halfW}
                        y={-18}
                        width={width}
                        height={36}
                        rx={7}
                        className="tree-node-pill"
                      />

                      {/* Active Node Cyan Glow Ring */}
                      {isActive && (
                        <rect
                          x={-halfW - 3}
                          y={-21}
                          width={width + 6}
                          height={42}
                          rx={9}
                          className="active-pulse-ring"
                        />
                      )}

                      {/* Function Call Label */}
                      <text
                        y={0}
                        dominantBaseline="central"
                        textAnchor="middle"
                        className="tree-node-label"
                      >
                        {label}
                      </text>

                      {/* Return Value Badge */}
                      {isReturned && retStr && retWidth && (
                        <g transform="translate(0, 24)">
                          <rect
                            x={-retWidth / 2}
                            y={-7.5}
                            width={retWidth}
                            height={15}
                            rx={4}
                            className="return-pill-bg"
                          />
                          <text
                            y={0}
                            dominantBaseline="central"
                            textAnchor="middle"
                            className="return-pill-text"
                          >
                            {retStr}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
};
