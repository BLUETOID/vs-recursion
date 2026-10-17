export interface FormatValueOptions {
  maxArrayItems?: number;
  maxStrLen?: number;
  maxDepth?: number;
  compact?: boolean;
}

/**
 * Checks if a value exceeds compact display limits.
 */
export function isTruncatedValue(val: any, maxArrayItems = 3, maxStrLen = 16): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.length > maxStrLen;
  if (Array.isArray(val)) {
    const isPrimitiveArray = val.every(
      (x) => typeof x === "number" || typeof x === "boolean" || typeof x === "string"
    );
    const limit = isPrimitiveArray ? Math.max(maxArrayItems, 4) : maxArrayItems;
    if (val.length > limit) return true;
    return val.some((item) => isTruncatedValue(item, maxArrayItems, maxStrLen));
  }
  if (typeof val === "object") {
    if (val.__iter) return false;
    const entries = Object.entries(val);
    if (entries.length > 3) return true;
    return entries.some(([, v]) => isTruncatedValue(v, maxArrayItems, maxStrLen));
  }
  return false;
}

/**
 * Formats a runtime value for display in the debugger UI.
 * If arrays or strings exceed compact thresholds, truncates with '...'.
 */
export function formatValue(val: any, options: FormatValueOptions = {}): string {
  const { maxArrayItems = 3, maxStrLen = 16, maxDepth = 2, compact = false } = options;

  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  if (typeof val === "string") {
    if (val.length > maxStrLen) {
      return JSON.stringify(val.slice(0, maxStrLen - 1) + "…");
    }
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    if (maxDepth <= 0) return "[…]";

    // Small 1D primitive arrays (like [-1, 0, 1, 2]) fit nicely up to 4 elements
    const isPrimitiveArray = val.every(
      (x) => typeof x === "number" || typeof x === "boolean" || typeof x === "string"
    );
    const limit = isPrimitiveArray ? Math.max(maxArrayItems, 4) : maxArrayItems;

    const formattedItems = val
      .slice(0, limit)
      .map((item) =>
        formatValue(item, {
          maxArrayItems: 3,
          maxStrLen: 12,
          maxDepth: maxDepth - 1,
          compact,
        })
      );

    if (val.length > limit) {
      formattedItems.push("...");
    }

    const sep = compact ? "," : ", ";
    return `[${formattedItems.join(sep)}]`;
  }

  if (typeof val === "object") {
    if (val.__iter) return `iter(idx: ${val.idx})`;
    const entries = Object.entries(val);
    if (entries.length === 0) return "{}";
    if (maxDepth <= 0) return "{…}";

    const limit = 3;
    const formatted = entries.slice(0, limit).map(([k, v]) => {
      const vStr = formatValue(v, {
        maxArrayItems: 2,
        maxStrLen: 10,
        maxDepth: maxDepth - 1,
        compact,
      });
      return `${k}: ${vStr}`;
    });

    if (entries.length > limit) {
      formatted.push("...");
    }
    return `{${formatted.join(compact ? "," : ", ")}}`;
  }

  return String(val);
}
