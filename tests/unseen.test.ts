import { describe, it, expect } from "vitest";
import { runInterpreter } from "../src/interpreter";

describe("Unseen Programs (Section 6)", () => {
  it("computes recursive power(base, exp)", () => {
    const code = `
int power(int base, int exp) {
    if (exp == 0) return 1;
    return base * power(base, exp - 1);
}

int main() {
    cout << power(2, 10);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("1024");
  });

  it("computes sumDigits(n)", () => {
    const code = `
int sumDigits(int n) {
    if (n == 0) return 0;
    return (n % 10) + sumDigits(n / 10);
}

int main() {
    cout << sumDigits(12345);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("15");
  });

  it("handles mutual recursion between isEven and isOdd", () => {
    const code = `
bool isOdd(int n);

bool isEven(int n) {
    if (n == 0) return true;
    return isOdd(n - 1);
}

bool isOdd(int n) {
    if (n == 0) return false;
    return isEven(n - 1);
}

int main() {
    if (isEven(6)) cout << "E";
    if (!isEven(5)) cout << "O";
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("EO");
  });

  it("runs a recursive function with a for loop inside it", () => {
    const code = `
void printStars(int depth) {
    if (depth == 0) return;
    for (int i = 0; i < depth; i++) {
        cout << "*";
    }
    cout << "\\n";
    printStars(depth - 1);
}

int main() {
    printStars(3);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("***\n**\n*");
  });

  it("runs code without main() by auto-invoking the primary function", () => {
    const code = `
int solve(int n) {
    if (n <= 1) return 1;
    return n + solve(n - 1);
}
`;
    // solve(4) should be 4 + 3 + 2 + 1 = 10
    const result = runInterpreter(code, { entryFunction: "solve", entryArgs: [4] });
    expect(result.error).toBeUndefined();
    const returnEvents = result.trace.filter((e) => e.type === "RETURN");
    const lastReturn = returnEvents[returnEvents.length - 1];
    expect(lastReturn.returnValue).toBe(10);
  });

  it("correctly handles arbitrary function names like dfs and deep calls", () => {
    const code = `
int steps = 0;

void dfs(int node, int target) {
    steps++;
    if (node == target) {
        cout << "found @" << steps << " ";
        return;
    }
    dfs(node + 1, target);
}

int main() {
    dfs(1, 5);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("found @5");
  });
});
