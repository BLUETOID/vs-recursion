export interface PresetExample {
  id: string;
  name: string;
  description: string;
  category: "Basic" | "Divide & Conquer" | "Backtracking" | "Math";
  code: string;
  defaultInput?: string;
  explanation: string;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: "countdown",
    name: "1. Count Down",
    category: "Basic",
    description: "Tail recursion: stdout emitted before the recursive call.",
    explanation: "Output is generated on the descent phase before invoking f(n - 1).",
    code: `#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    cout << n << " ";
    f(n - 1);
}

int main() {
    f(4);
}
`,
  },
  {
    id: "countup",
    name: "2. Count Up (Unwinding)",
    category: "Basic",
    description: "Post-recursion work: stdout emitted during call stack unwinding.",
    explanation: "Recursive calls descend first to base case n == 0; printing executes on return.",
    code: `#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    f(n - 1);
    cout << n << " ";
}

int main() {
    f(4);
}
`,
  },
  {
    id: "factorial",
    name: "3. Factorial",
    category: "Math",
    description: "Computes 5! = 120 via linear recursion.",
    explanation: "Frame evaluates n * f(n - 1) upon receiving the return value from the child call.",
    code: `#include <iostream>
using namespace std;

int f(int n) {
    if (n <= 1) return 1;
    return n * f(n - 1);
}

int main() {
    cout << f(5);
}
`,
  },
  {
    id: "even_sum",
    name: "4. Sum of Even Numbers",
    category: "Math",
    description: "Conditional recursion accumulating even integers.",
    explanation: "Evaluates parity condition (n % 2 == 0) to branch return value accumulation.",
    code: `#include <iostream>
using namespace std;

int f(int n) {
    if (n == 0) return 0;
    if (n % 2 == 0) return n + f(n - 1);
    return f(n - 1);
}

int main() {
    cout << f(6);
}
`,
  },
  {
    id: "fibonacci",
    name: "5. Fibonacci Tree",
    category: "Divide & Conquer",
    description: "Binary recursion tree demonstrating subproblem branching.",
    explanation: "Two recursive invocations per frame f(n - 1) + f(n - 2) generate an exponential call tree.",
    code: `#include <iostream>
using namespace std;

int f(int n) {
    if (n < 2) return n;
    return f(n - 1) + f(n - 2);
}

int main() {
    cout << f(5);
}
`,
  },
  {
    id: "binary",
    name: "6. Binary Digits",
    category: "Math",
    description: "Repeated division by 2 printing remainder during unwinding.",
    explanation: "Most-significant bits are printed first as the stack returns from quotient 0.",
    code: `#include <iostream>
using namespace std;

void f(int n) {
    if (n == 0) return;
    f(n / 2);
    cout << n % 2;
}

int main() {
    f(10);
}
`,
  },
  {
    id: "gcd",
    name: "7. Euclidean GCD",
    category: "Math",
    description: "Euclid algorithm calculating gcd(48, 18) = 6.",
    explanation: "Tail-recursive state transition f(b, a % b) until remainder b reaches 0.",
    code: `#include <iostream>
using namespace std;

int f(int a, int b) {
    if (b == 0) return a;
    return f(b, a % b);
}

int main() {
    cout << f(48, 18);
}
`,
  },
  {
    id: "nested_output",
    name: "8. Nested Output (A, B, C)",
    category: "Basic",
    description: "Interleaved side-effects across multi-branch recursion.",
    explanation: "Shows exact interleaving order between stdout prints and recursive calls.",
    code: `#include <iostream>
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
`,
  },
  {
    id: "call_counting",
    name: "9. Call Counting with Global",
    category: "Divide & Conquer",
    description: "Global variable mutation across branching recursive invocations.",
    explanation: "Global counter variable increments across each call to record total invocation count.",
    code: `#include <iostream>
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
`,
  },
  {
    id: "hanoi",
    name: "10. Tower of Hanoi",
    category: "Backtracking",
    description: "Classic 3-peg recursive puzzle using character arguments.",
    explanation: "Passes source, destination, and auxiliary peg characters across 2^n - 1 moves.",
    code: `#include <iostream>
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
`,
  },
  {
    id: "power",
    name: "11. Fast Power",
    category: "Math",
    description: "Exponentiation via recursive reduction.",
    explanation: "Computes base^exp recursively with linear reduction step.",
    code: `#include <iostream>
using namespace std;

int power(int base, int exp) {
    if (exp == 0) return 1;
    return base * power(base, exp - 1);
}

int main() {
    cout << power(2, 8);
}
`,
  },
  {
    id: "sum_digits",
    name: "12. Sum of Digits",
    category: "Math",
    description: "Decimal digit accumulation via n % 10 and n / 10.",
    explanation: "Accumulates last digit and recursively processes remaining digits.",
    code: `#include <iostream>
using namespace std;

int sumDigits(int n) {
    if (n == 0) return 0;
    return (n % 10) + sumDigits(n / 10);
}

int main() {
    cout << sumDigits(12345);
}
`,
  },
  {
    id: "static_var",
    name: "13. Static Variable in Recursion",
    category: "Basic",
    description: "Demonstrates local static memory persistence across recursive frames.",
    explanation: "static int x = 0 is initialized only once. As calls descend, x increments across calls. On return unwinding, every frame accesses the shared static variable.",
    code: `#include <iostream>
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
`,
  },
  {
    id: "const_ternary",
    name: "14. Const & Ternary Operator",
    category: "Math",
    description: "Clean recursive logic using const variables and ternary operator.",
    explanation: "Employs const immutability and ternary base case branch for idiomatic recursion.",
    code: `#include <iostream>
using namespace std;

int fact(const int n) {
    return (n <= 1) ? 1 : n * fact(n - 1);
}

int main() {
    const int num = 5;
    cout << fact(num);
}
`,
  },
];
