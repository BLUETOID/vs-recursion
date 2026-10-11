import { describe, it, expect } from "vitest";
import { runInterpreter } from "../src/interpreter";

describe("Practice Programs (Section 6)", () => {
  it("1. Count down (expected: 4 3 2 1 )", () => {
    const code = `
#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    cout << n << " ";
    f(n - 1);
}

int main() {
    f(4);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("4 3 2 1");
  });

  it("2. Count up on the way back (expected: 1 2 3 4 )", () => {
    const code = `
#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    f(n - 1);
    cout << n << " ";
}

int main() {
    f(4);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("1 2 3 4");
  });

  it("3. Factorial (expected: 120)", () => {
    const code = `
#include <iostream>
using namespace std;

int f(int n) {
    if (n <= 1) return 1;
    return n * f(n - 1);
}

int main() {
    cout << f(5);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("120");
  });

  it("4. Sum of even numbers (expected: 12)", () => {
    const code = `
#include <iostream>
using namespace std;

int f(int n) {
    if (n == 0) return 0;
    if (n % 2 == 0) return n + f(n - 1);
    return f(n - 1);
}

int main() {
    cout << f(6);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("12");
  });

  it("5. Fibonacci (expected: 8)", () => {
    const code = `
#include <iostream>
using namespace std;

int f(int n) {
    if (n < 2) return n;
    return f(n - 1) + f(n - 2);
}

int main() {
    cout << f(6);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("8");
  });

  it("6. Binary digits (expected: 1010)", () => {
    const code = `
#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    f(n / 2);
    cout << n % 2;
}

int main() {
    f(10);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("1010");
  });

  it("7. GCD (expected: 6)", () => {
    const code = `
#include <iostream>
using namespace std;

int f(int a, int b) {
    if (b == 0) return a;
    return f(b, a % b);
}

int main() {
    cout << f(48, 18);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("6");
  });

  it("8. Nested output (expected: AAABCBCBABCC)", () => {
    const code = `
#include <iostream>
using namespace std;

void f(int n) {
    if (n <= 0) return;
    cout << "A";
    f(n - 1);
    cout << "B";
    f(n - 2);
    cout << "C";
}

int main() {
    f(3);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("AAABCBCBABCC");
  });

  it("9. Call counting (expected: 7 15)", () => {
    const code = `
#include <iostream>
using namespace std;

int count = 0;

int f(int n) {
    count++;
    if (n <= 1) return 0;
    return 1 + f(n / 2) + f(n / 2);
}

int main() {
    cout << f(8) << " " << count;
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("7 15");
  });

  it("10. Tower of Hanoi (expected 7 moves for n=3)", () => {
    const code = `
#include <iostream>
using namespace std;

void f(int n, char from, char to, char aux) {
    if (n == 0) return;
    f(n - 1, from, aux, to);
    cout << from << "->" << to << " ";
    f(n - 1, aux, to, from);
}

int main() {
    f(3, 'A', 'C', 'B');
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeUndefined();
    const lastEvent = result.trace[result.trace.length - 1];
    expect(lastEvent.output.trim()).toBe("A->C A->B C->B A->C B->A B->C A->C");
  });
});

describe("Interpreter Error Handling", () => {
  it("detects infinite recursion and stops at depth limit without freezing", () => {
    const code = `
void f(int n) {
    f(n + 1);
}

int main() {
    f(1);
}
`;
    const result = runInterpreter(code, { maxDepth: 50 });
    expect(result.error).toBeDefined();
    expect(result.error).toContain("depth limit (50) exceeded");
  });

  it("reports undefined variables with line number", () => {
    const code = `
int main() {
    int a = 10;
    cout << b;
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Undefined variable 'b'");
  });

  it("reports division by zero with line number", () => {
    const code = `
int main() {
    int x = 10 / 0;
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Division by zero");
  });

  it("reports unsupported language constructs cleanly", () => {
    const code = `
struct Point {
    int x;
};

int main() {
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("unsupported: 'struct'");
  });

  it("reports missing return in non-void function", () => {
    const code = `
int f(int n) {
    if (n == 1) return 1;
}

int main() {
    f(2);
}
`;
    const result = runInterpreter(code);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Missing return statement in non-void function");
  });
});
