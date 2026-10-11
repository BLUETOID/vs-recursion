import { describe, it, expect } from "vitest";
import { Lexer } from "../src/interpreter/lexer";
import { Parser } from "../src/interpreter/parser";
import { Evaluator } from "../src/interpreter/evaluator";

function runCode(code: string, options = {}) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const program = parser.parse();
  const evaluator = new Evaluator(program);
  return evaluator.run(options);
}

describe("C++ Competitive Programming & Standard Library Features", () => {
  it("supports #include <bits/stdc++.h>, using namespace std, and #define macros", () => {
    const code = `
#include <bits/stdc++.h>
#define ll long long
using namespace std;

ll solve(ll n) {
  if (n <= 1) return 1;
  return n * solve(n - 1);
}

int main() {
  ll ans = solve(5);
  cout << "ans=" << ans << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const lastEvent = trace[trace.length - 1];
    expect(lastEvent.output).toContain("ans=120\n");
  });

  it("supports std:: prefixes without crash", () => {
    const code = `
#include <iostream>

int main() {
  int a = 10;
  int b = 25;
  int m = std::max(a, b);
  std::cout << "max=" << m << std::endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("max=25\n");
  });

  it("supports vector push_back, pop_back, size, indexing", () => {
    const code = `
#include <bits/stdc++.h>
using namespace std;

void generate(int n, vector<int>& v) {
  if (n == 0) return;
  v.push_back(n);
  generate(n - 1, v);
}

int main() {
  vector<int> v;
  generate(3, v);
  cout << "size=" << v.size() << " first=" << v[0] << " last=" << v[2] << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("size=3 first=3 last=1\n");
  });

  it("supports array declarations, indexing, and swap(arr[i], arr[j])", () => {
    const code = `
#include <bits/stdc++.h>
using namespace std;

int main() {
  int arr[3] = {10, 20, 30};
  swap(arr[0], arr[2]);
  cout << arr[0] << " " << arr[1] << " " << arr[2] << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("30 20 10\n");
  });

  it("supports string mutation and swap on string indices", () => {
    const code = `
#include <bits/stdc++.h>
using namespace std;

void permute(string& s, int l, int r) {
  if (l == r) {
    cout << s << " ";
    return;
  }
  for (int i = l; i <= r; i++) {
    swap(s[l], s[i]);
    permute(s, l + 1, r);
    swap(s[l], s[i]);
  }
}

int main() {
  string s = "ab";
  permute(s, 0, 1);
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toBe("ab ba ");
  });

  it("supports cin >> inputs", () => {
    const code = `
#include <iostream>
using namespace std;

int fib(int n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

int main() {
  int n;
  cin >> n;
  cout << "fib=" << fib(n) << endl;
  return 0;
}
`;
    const trace = runCode(code, { input: "6" });
    const last = trace[trace.length - 1];
    expect(last.output).toContain("fib=8\n");
  });

  it("supports pass-by-reference for primitives like count", () => {
    const code = `
#include <iostream>
using namespace std;

void countCalls(int n, int& cnt) {
  cnt++;
  if (n <= 1) return;
  countCalls(n - 1, cnt);
  countCalls(n - 1, cnt);
}

int main() {
  int cnt = 0;
  countCalls(3, cnt);
  cout << "cnt=" << cnt << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("cnt=7\n");
  });

  it("supports vector iterators with reverse and sort", () => {
    const code = `
#include <vector>
#include <algorithm>
#include <iostream>
using namespace std;

int main() {
  vector<int> v;
  v.push_back(30);
  v.push_back(10);
  v.push_back(20);
  sort(v.begin(), v.end());
  cout << v[0] << " " << v[1] << " " << v[2] << endl;
  reverse(v.begin(), v.end());
  cout << v[0] << " " << v[1] << " " << v[2] << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("10 20 30\n30 20 10\n");
  });

  it("supports 2D vectors, INT_MAX, and math functions", () => {
    const code = `
#include <bits/stdc++.h>
using namespace std;

int main() {
  vector<vector<int>> dp(2, vector<int>(2, -1));
  dp[0][0] = 5;
  dp[1][1] = 10;
  int m = max(dp[0][0], dp[1][1]);
  int inf = INT_MAX;
  cout << "max=" << m << " hasInf=" << (inf > 100000) << " dp00=" << dp[0][0] << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("max=10 hasInf=true dp00=5\n");
  });

  it("supports pair<int, int> with first and second", () => {
    const code = `
#include <iostream>
#include <utility>
using namespace std;

int main() {
  pair<int, int> p = make_pair(42, 99);
  cout << "first=" << p.first << " second=" << p.second << endl;
  p.first = 100;
  cout << "updated=" << p.first << endl;
  return 0;
}
`;
    const trace = runCode(code);
    const last = trace[trace.length - 1];
    expect(last.output).toContain("first=42 second=99\nupdated=100\n");
  });
});
