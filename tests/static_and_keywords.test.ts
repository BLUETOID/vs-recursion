import { describe, it, expect } from "vitest";
import { runInterpreter } from "../src/interpreter";

describe("New Keywords & Static Variables Support", () => {
  it("Static variable in recursive function: GeeksforGeeks classic (expected: 25)", () => {
    const code = `
#include <iostream>
using namespace std;

int fun(int n) {
    static int x = 0;
    if (n > 0) {
        x++;
        return fun(n - 1) + x;
    }
    return 0;
}

int main() {
    cout << fun(5);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("25");

    // Verify that static variable x exists in trace staticVars
    const staticEvents = result.trace.filter((e) => e.staticVars && Object.keys(e.staticVars).length > 0);
    expect(staticEvents.length).toBeGreaterThan(0);
    const lastStatic = lastEvent.staticVars;
    expect(lastStatic).toBeDefined();
    expect(lastStatic!["fun::x"]?.value).toBe(5);
  });

  it("Static counter across multiple calls", () => {
    const code = `
#include <iostream>
using namespace std;

void countCalls(int n) {
    static int calls = 0;
    calls++;
    if (n == 0) {
        cout << calls;
        return;
    }
    countCalls(n - 1);
}

int main() {
    countCalls(3);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("4");
  });

  it("Const variable reassignment prevention", () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    const int MAX = 10;
    MAX = 20;
    cout << MAX;
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Cannot modify const variable 'MAX'");
  });

  it("Ternary conditional operator in recursion", () => {
    const code = `
#include <iostream>
using namespace std;

int fact(int n) {
    return (n <= 1) ? 1 : n * fact(n - 1);
}

int main() {
    cout << fact(5);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("120");
  });

  it("Multiple variable declarations on a single line", () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    int a = 10, b = 20, c = 30;
    cout << (a + b + c);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("60");
  });

  it("Loop break and continue statements", () => {
    const code = `
#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        if (i == 5) continue;
        if (i > 7) break;
        sum += i;
    }
    cout << sum;
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    // i=1 (1), i=2 (3), i=3 (6), i=4 (10), i=5 (skip), i=6 (16), i=7 (23), i=8 (break) -> sum = 23
    expect(lastEvent.output.trim()).toBe("23");
  });
});
