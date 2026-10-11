export type PresetCategory =
  | "Basic & Fundamentals"
  | "Math & Number Theory"
  | "Arrays & Strings"
  | "Divide & Conquer & Sorting"
  | "Subsets & Combinations"
  | "Backtracking & Puzzles"
  | "Dynamic Programming & Memoization";

export interface PresetExample {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  code: string;
  defaultInput?: string;
  explanation: string;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  // -------------------------------------------------------------
  // 1. Basic & Fundamentals
  // -------------------------------------------------------------
  {
    id: "countdown",
    name: "1. Count Down (Tail Recursion)",
    category: "Basic & Fundamentals",
    description: "Stdout printed on descent before recursing to f(n - 1).",
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
    name: "2. Count Up (Head Recursion / Unwinding)",
    category: "Basic & Fundamentals",
    description: "Stdout printed during call stack unwinding on return.",
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
    category: "Basic & Fundamentals",
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
    id: "sum_n",
    name: "4. Sum of First N Numbers",
    category: "Basic & Fundamentals",
    description: "Accumulates 1 + 2 + ... + N via recursion.",
    explanation: "Each call waits for sumN(n - 1) and adds n during stack unwinding.",
    code: `#include <iostream>
using namespace std;

int sumN(int n) {
    if (n <= 0) return 0;
    return n + sumN(n - 1);
}

int main() {
    cout << sumN(5);
}
`,
  },
  {
    id: "even_sum",
    name: "5. Sum of Even Numbers",
    category: "Basic & Fundamentals",
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
    id: "static_var",
    name: "6. Static Variable in Recursion",
    category: "Basic & Fundamentals",
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
    name: "7. Const & Ternary Operator",
    category: "Basic & Fundamentals",
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
  {
    id: "nested_output",
    name: "8. Nested Output Order (A, B, C)",
    category: "Basic & Fundamentals",
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
    id: "sum_digits",
    name: "9. Sum of Digits",
    category: "Basic & Fundamentals",
    description: "Decimal digit accumulation via n % 10 and n / 10.",
    explanation: "Accumulates last digit and recursively processes remaining digits.",
    code: `#include <iostream>
using namespace std;

int sumDigits(int n) {
    if (n == 0) return 0;
    return (n % 10) + sumDigits(n / 10);
}

int main() {
    cout << sumDigits(1234);
}
`,
  },
  {
    id: "count_zeros",
    name: "10. Count Zeros in Number",
    category: "Basic & Fundamentals",
    description: "Counts how many zero digits occur inside an integer.",
    explanation: "Checks last digit for zero and recursively reduces number by factor of 10.",
    code: `#include <iostream>
using namespace std;

int countZeros(int n) {
    if (n == 0) return 0;
    int rem = (n % 10 == 0) ? 1 : 0;
    return rem + countZeros(n / 10);
}

int main() {
    cout << countZeros(102040);
}
`,
  },

  // -------------------------------------------------------------
  // 2. Math & Number Theory
  // -------------------------------------------------------------
  {
    id: "power",
    name: "11. Fast Exponentiation (O(log N))",
    category: "Math & Number Theory",
    description: "Computes base^exp in logarithmic steps via squaring.",
    explanation: "When exp is even, halves exponent and squares result; otherwise multiplies base.",
    code: `#include <iostream>
using namespace std;

int power(int base, int exp) {
    if (exp == 0) return 1;
    if (exp % 2 == 0) {
        int half = power(base, exp / 2);
        return half * half;
    }
    return base * power(base, exp - 1);
}

int main() {
    cout << power(2, 6);
}
`,
  },
  {
    id: "gcd",
    name: "12. Euclidean GCD",
    category: "Math & Number Theory",
    description: "Euclid algorithm calculating gcd(48, 18) = 6.",
    explanation: "Tail-recursive state transition f(b, a % b) until remainder b reaches 0.",
    code: `#include <iostream>
using namespace std;

int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}

int main() {
    cout << gcd(48, 18);
}
`,
  },
  {
    id: "binary",
    name: "13. Decimal to Binary",
    category: "Math & Number Theory",
    description: "Repeated division by 2 printing remainder during unwinding.",
    explanation: "Most-significant bits are printed first as stack returns from quotient 0.",
    code: `#include <iostream>
using namespace std;

void toBinary(int n) {
    if (n == 0) return;
    toBinary(n / 2);
    cout << n % 2;
}

int main() {
    toBinary(13);
}
`,
  },
  {
    id: "collatz",
    name: "14. Collatz Conjecture (3n + 1)",
    category: "Math & Number Theory",
    description: "Traces sequence and counts steps until reaching 1.",
    explanation: "Even numbers divide by 2; odd numbers multiply by 3 and add 1.",
    code: `#include <iostream>
using namespace std;

int collatz(int n) {
    cout << n << " ";
    if (n == 1) return 0;
    if (n % 2 == 0) return 1 + collatz(n / 2);
    return 1 + collatz(3 * n + 1);
}

int main() {
    cout << "steps=" << collatz(6);
}
`,
  },
  {
    id: "pascal_triangle",
    name: "15. Pascal's Triangle C(n, k)",
    category: "Math & Number Theory",
    description: "Calculates binomial coefficient entry at row n, column k.",
    explanation: "Uses recurrence C(n, k) = C(n - 1, k - 1) + C(n - 1, k) with base cases on boundaries.",
    code: `#include <iostream>
using namespace std;

int pascal(int row, int col) {
    if (col == 0 || col == row) return 1;
    return pascal(row - 1, col - 1) + pascal(row - 1, col);
}

int main() {
    cout << pascal(4, 2);
}
`,
  },

  // -------------------------------------------------------------
  // 3. Arrays & Strings
  // -------------------------------------------------------------
  {
    id: "reverse_string",
    name: "16. Reverse String In-Place",
    category: "Arrays & Strings",
    description: "Reverses string using two pointers and swap().",
    explanation: "Swaps outermost characters at indices l and r, then recurses inwards.",
    code: `#include <bits/stdc++.h>
using namespace std;

void reverseStr(string& s, int l, int r) {
    if (l >= r) return;
    swap(s[l], s[r]);
    reverseStr(s, l + 1, r - 1);
}

int main() {
    string s = "recursion";
    reverseStr(s, 0, s.size() - 1);
    cout << s;
}
`,
  },
  {
    id: "is_palindrome",
    name: "17. Palindrome String Checker",
    category: "Arrays & Strings",
    description: "Verifies if string reads identically forwards and backwards.",
    explanation: "Checks s[l] == s[r] at each step; recurses inwards until pointers cross.",
    code: `#include <bits/stdc++.h>
using namespace std;

bool isPalindrome(const string& s, int l, int r) {
    if (l >= r) return true;
    if (s[l] != s[r]) return false;
    return isPalindrome(s, l + 1, r - 1);
}

int main() {
    string s = "racecar";
    cout << (isPalindrome(s, 0, s.size() - 1) ? "true" : "false");
}
`,
  },
  {
    id: "array_sum",
    name: "18. Recursive Array Sum",
    category: "Arrays & Strings",
    description: "Computes total sum of array elements recursively.",
    explanation: "Adds arr[n - 1] to the sum of the first n - 1 elements.",
    code: `#include <iostream>
using namespace std;

int arrSum(int arr[], int n) {
    if (n <= 0) return 0;
    return arr[n - 1] + arrSum(arr, n - 1);
}

int main() {
    int arr[5] = {2, 4, 6, 8, 10};
    cout << arrSum(arr, 5);
}
`,
  },
  {
    id: "array_max",
    name: "19. Find Maximum in Array (D&C)",
    category: "Arrays & Strings",
    description: "Finds max element by dividing array into left and right halves.",
    explanation: "Divides range [l, r] at midpoint; returns max of left half and right half.",
    code: `#include <bits/stdc++.h>
using namespace std;

int findMax(int arr[], int l, int r) {
    if (l == r) return arr[l];
    int mid = (l + r) / 2;
    int leftMax = findMax(arr, l, mid);
    int rightMax = findMax(arr, mid + 1, r);
    return max(leftMax, rightMax);
}

int main() {
    int arr[6] = {3, 14, 1, 7, 25, 9};
    cout << findMax(arr, 0, 5);
}
`,
  },
  {
    id: "linear_search",
    name: "20. Recursive Linear Search",
    category: "Arrays & Strings",
    description: "Searches for target value and returns its zero-based index.",
    explanation: "Compares current element; if mismatch, checks next index until end of array.",
    code: `#include <iostream>
using namespace std;

int search(int arr[], int idx, int n, int target) {
    if (idx >= n) return -1;
    if (arr[idx] == target) return idx;
    return search(arr, idx + 1, n, target);
}

int main() {
    int arr[5] = {10, 25, 30, 45, 50};
    cout << search(arr, 0, 5, 45);
}
`,
  },
  {
    id: "is_sorted",
    name: "21. Check if Array is Sorted",
    category: "Arrays & Strings",
    description: "Checks whether array elements are in non-decreasing order.",
    explanation: "Returns false if arr[idx] > arr[idx + 1]; otherwise checks remaining array.",
    code: `#include <iostream>
using namespace std;

bool isSorted(int arr[], int idx, int n) {
    if (idx >= n - 1) return true;
    if (arr[idx] > arr[idx + 1]) return false;
    return isSorted(arr, idx + 1, n);
}

int main() {
    int arr[5] = {1, 3, 5, 8, 12};
    cout << (isSorted(arr, 0, 5) ? "sorted" : "unsorted");
}
`,
  },

  // -------------------------------------------------------------
  // 4. Divide & Conquer & Sorting
  // -------------------------------------------------------------
  {
    id: "fibonacci",
    name: "22. Fibonacci Tree (Double Recursion)",
    category: "Divide & Conquer & Sorting",
    description: "Binary recursion tree demonstrating exponential subproblem branching.",
    explanation: "Two recursive calls f(n - 1) and f(n - 2) generate an expanding call tree.",
    code: `#include <iostream>
using namespace std;

int fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    cout << fib(4);
}
`,
  },
  {
    id: "tribonacci",
    name: "23. Tribonacci Sequence (Triple Recursion)",
    category: "Divide & Conquer & Sorting",
    description: "Three branches per frame: T(n) = T(n-1) + T(n-2) + T(n-3).",
    explanation: "Generates a 3-way branching tree illustrating how branching factor affects tree width.",
    code: `#include <iostream>
using namespace std;

int trib(int n) {
    if (n == 0) return 0;
    if (n == 1 || n == 2) return 1;
    return trib(n - 1) + trib(n - 2) + trib(n - 3);
}

int main() {
    cout << trib(4);
}
`,
  },
  {
    id: "binary_search",
    name: "24. Binary Search",
    category: "Divide & Conquer & Sorting",
    description: "Logarithmic search halving search space at each recursive step.",
    explanation: "Compares target with mid; recursively discards either left or right half.",
    code: `#include <iostream>
using namespace std;

int binarySearch(int arr[], int l, int r, int target) {
    if (l > r) return -1;
    int mid = (l + r) / 2;
    if (arr[mid] == target) return mid;
    if (target < arr[mid]) return binarySearch(arr, l, mid - 1, target);
    return binarySearch(arr, mid + 1, r, target);
}

int main() {
    int arr[6] = {2, 5, 8, 12, 16, 23};
    cout << binarySearch(arr, 0, 5, 12);
}
`,
  },
  {
    id: "merge_sort",
    name: "25. Merge Sort",
    category: "Divide & Conquer & Sorting",
    description: "Classic divide-and-conquer sorting algorithm.",
    explanation: "Splits array into two halves, recursively sorts each, and merges sorted halves.",
    code: `#include <bits/stdc++.h>
using namespace std;

void merge(int arr[], int l, int mid, int r) {
    vector<int> temp;
    int i = l;
    int j = mid + 1;
    while (i <= mid && j <= r) {
        if (arr[i] <= arr[j]) {
            temp.push_back(arr[i]);
            i++;
        } else {
            temp.push_back(arr[j]);
            j++;
        }
    }
    while (i <= mid) {
        temp.push_back(arr[i]);
        i++;
    }
    while (j <= r) {
        temp.push_back(arr[j]);
        j++;
    }
    for (int k = 0; k < temp.size(); k++) {
        arr[l + k] = temp[k];
    }
}

void mergeSort(int arr[], int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    merge(arr, l, mid, r);
}

int main() {
    int arr[4] = {4, 1, 3, 2};
    mergeSort(arr, 0, 3);
    for (int i = 0; i < 4; i++) cout << arr[i] << " ";
}
`,
  },
  {
    id: "quick_sort",
    name: "26. Quick Sort (Lomuto Partition)",
    category: "Divide & Conquer & Sorting",
    description: "In-place partition sorting via pivot element placement.",
    explanation: "Places pivot at sorted position, then recursively sorts subarrays to left and right.",
    code: `#include <bits/stdc++.h>
using namespace std;

int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    int arr[4] = {10, 7, 8, 9};
    quickSort(arr, 0, 3);
    for (int i = 0; i < 4; i++) cout << arr[i] << " ";
}
`,
  },

  // -------------------------------------------------------------
  // 5. Subsets & Combinations
  // -------------------------------------------------------------
  {
    id: "subsets_power_set",
    name: "27. Generate Subsets (Power Set)",
    category: "Subsets & Combinations",
    description: "Include/exclude decision tree producing all 2^N subsets.",
    explanation: "At each index, branch into excluding nums[idx] or including it into current subset.",
    code: `#include <bits/stdc++.h>
using namespace std;

void subsets(const vector<int>& nums, int idx, vector<int>& cur) {
    if (idx == nums.size()) {
        cout << "[";
        for (int i = 0; i < cur.size(); i++) cout << cur[i];
        cout << "] ";
        return;
    }
    // Choice 1: Exclude nums[idx]
    subsets(nums, idx + 1, cur);
    // Choice 2: Include nums[idx]
    cur.push_back(nums[idx]);
    subsets(nums, idx + 1, cur);
    cur.pop_back(); // backtrack
}

int main() {
    vector<int> nums;
    nums.push_back(1);
    nums.push_back(2);
    vector<int> cur;
    subsets(nums, 0, cur);
}
`,
  },
  {
    id: "subset_sum",
    name: "28. Subset Sum Problem",
    category: "Subsets & Combinations",
    description: "Determines whether any subset sums to target value.",
    explanation: "Binary choice tree branching on whether to include arr[n - 1] in target sum.",
    code: `#include <iostream>
using namespace std;

bool hasSubsetSum(int arr[], int n, int target) {
    if (target == 0) return true;
    if (n == 0 || target < 0) return false;
    return hasSubsetSum(arr, n - 1, target - arr[n - 1]) ||
           hasSubsetSum(arr, n - 1, target);
}

int main() {
    int arr[4] = {3, 34, 4, 12};
    cout << (hasSubsetSum(arr, 4, 7) ? "true" : "false");
}
`,
  },
  {
    id: "combinations",
    name: "29. Combinations of Size K",
    category: "Subsets & Combinations",
    description: "Generates all combinations of k numbers chosen from 1..n.",
    explanation: "Backtracking loop exploring choices >= start; pushes number and pops on return.",
    code: `#include <bits/stdc++.h>
using namespace std;

void combine(int start, int n, int k, vector<int>& cur) {
    if (cur.size() == k) {
        cout << "(";
        for (int i = 0; i < cur.size(); i++) cout << cur[i];
        cout << ") ";
        return;
    }
    for (int i = start; i <= n; i++) {
        cur.push_back(i);
        combine(i + 1, n, k, cur);
        cur.pop_back();
    }
}

int main() {
    vector<int> cur;
    combine(1, 4, 2, cur);
}
`,
  },
  {
    id: "generate_binary_strings",
    name: "30. Generate N-bit Binary Strings",
    category: "Subsets & Combinations",
    description: "Generates all binary strings of length N in lexicographical order.",
    explanation: "Appends '0', recurses, backtracks; then appends '1', recurses, and backtracks.",
    code: `#include <bits/stdc++.h>
using namespace std;

void genBinary(int n, string& cur) {
    if (cur.size() == n) {
        cout << cur << " ";
        return;
    }
    cur.push_back('0');
    genBinary(n, cur);
    cur.pop_back();

    cur.push_back('1');
    genBinary(n, cur);
    cur.pop_back();
}

int main() {
    string cur = "";
    genBinary(3, cur);
}
`,
  },

  // -------------------------------------------------------------
  // 6. Backtracking & Puzzles
  // -------------------------------------------------------------
  {
    id: "hanoi",
    name: "31. Tower of Hanoi (3 Pegs)",
    category: "Backtracking & Puzzles",
    description: "Classic 3-peg recursive puzzle using character peg labels.",
    explanation: "Passes source, destination, and auxiliary peg characters across 2^n - 1 moves.",
    code: `#include <iostream>
using namespace std;

void hanoi(int n, char from, char to, char aux) {
    if (n == 0) return;
    hanoi(n - 1, from, aux, to);
    cout << from << "->" << to << " ";
    hanoi(n - 1, aux, to, from);
}

int main() {
    hanoi(3, 'A', 'C', 'B');
}
`,
  },
  {
    id: "string_permutations",
    name: "32. Permutations of a String",
    category: "Backtracking & Puzzles",
    description: "Generates all N! permutations via swap and backtrack.",
    explanation: "Swaps candidate character to current index, recurses, and restores with second swap.",
    code: `#include <bits/stdc++.h>
using namespace std;

void permute(string& s, int l, int r) {
    if (l == r) {
        cout << s << " ";
        return;
    }
    for (int i = l; i <= r; i++) {
        swap(s[l], s[i]);
        permute(s, l + 1, r);
        swap(s[l], s[i]); // backtrack
    }
}

int main() {
    string s = "ABC";
    permute(s, 0, 2);
}
`,
  },
  {
    id: "generate_parentheses",
    name: "33. Generate Balanced Parentheses",
    category: "Backtracking & Puzzles",
    description: "Generates all valid matched pairs of parentheses for N pairs.",
    explanation: "Only adds '(' if open < n, and adds ')' only if close < open to maintain validity.",
    code: `#include <bits/stdc++.h>
using namespace std;

void generateParens(int open, int close, int n, string& s) {
    if (s.size() == 2 * n) {
        cout << s << " ";
        return;
    }
    if (open < n) {
        s.push_back('(');
        generateParens(open + 1, close, n, s);
        s.pop_back();
    }
    if (close < open) {
        s.push_back(')');
        generateParens(open, close + 1, n, s);
        s.pop_back();
    }
}

int main() {
    string s = "";
    generateParens(0, 0, 2, s);
}
`,
  },
  {
    id: "rat_in_a_maze",
    name: "34. Rat in a Maze (2D Grid)",
    category: "Backtracking & Puzzles",
    description: "Finds exit path in grid with obstacle using Down/Right moves.",
    explanation: "Explores Down (D) and Right (R) cells; backtracks path string on dead-ends.",
    code: `#include <bits/stdc++.h>
using namespace std;

bool solveMaze(int r, int c, int n, vector<vector<int>>& grid, string& path) {
    if (r == n - 1 && c == n - 1) {
        cout << path << endl;
        return true;
    }
    if (r >= n || c >= n || grid[r][c] == 0) return false;

    path.push_back('D');
    if (solveMaze(r + 1, c, n, grid, path)) return true;
    path.pop_back();

    path.push_back('R');
    if (solveMaze(r, c + 1, n, grid, path)) return true;
    path.pop_back();

    return false;
}

int main() {
    int n = 3;
    vector<vector<int>> grid(3, vector<int>(3, 1));
    grid[1][1] = 0; // obstacle
    string path = "";
    solveMaze(0, 0, n, grid, path);
}
`,
  },
  {
    id: "n_queens_4",
    name: "35. 4-Queens Problem",
    category: "Backtracking & Puzzles",
    description: "Places 4 non-attacking queens on a 4x4 chessboard.",
    explanation: "Tests safety of column and diagonals for each row; backtracks on conflict.",
    code: `#include <bits/stdc++.h>
using namespace std;

bool isSafe(int row, int col, vector<int>& queens) {
    for (int r = 0; r < row; r++) {
        int c = queens[r];
        if (c == col || abs(c - col) == abs(r - row)) return false;
    }
    return true;
}

bool solveNQueens(int row, int n, vector<int>& queens) {
    if (row == n) {
        for (int r = 0; r < n; r++) cout << queens[r] << " ";
        return true;
    }
    for (int col = 0; col < n; col++) {
        if (isSafe(row, col, queens)) {
            queens[row] = col;
            if (solveNQueens(row + 1, n, queens)) return true;
            queens[row] = -1; // backtrack
        }
    }
    return false;
}

int main() {
    vector<int> queens(4, -1);
    solveNQueens(0, 4, queens);
}
`,
  },

  // -------------------------------------------------------------
  // 7. Dynamic Programming & Memoization
  // -------------------------------------------------------------
  {
    id: "climbing_stairs",
    name: "36. Climbing Stairs",
    category: "Dynamic Programming & Memoization",
    description: "Number of distinct ways to climb N stairs taking 1 or 2 steps.",
    explanation: "Number of ways to reach step n is climb(n - 1) + climb(n - 2).",
    code: `#include <iostream>
using namespace std;

int climb(int n) {
    if (n <= 2) return n;
    return climb(n - 1) + climb(n - 2);
}

int main() {
    cout << climb(4);
}
`,
  },
  {
    id: "memoized_fibonacci",
    name: "37. Fibonacci with Memoization (Pruning)",
    category: "Dynamic Programming & Memoization",
    description: "Demonstrates branch pruning by caching solved subproblems.",
    explanation: "Checks memo array before recursing; immediately returns cached value to prune redundant branches.",
    code: `#include <bits/stdc++.h>
using namespace std;

int fibMemo(int n, vector<int>& memo) {
    if (n <= 1) return n;
    if (memo[n] != -1) return memo[n]; // pruned branch!
    memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    return memo[n];
}

int main() {
    int n = 5;
    vector<int> memo(n + 1, -1);
    cout << fibMemo(n, memo);
}
`,
  },
  {
    id: "knapsack_01",
    name: "38. 0/1 Knapsack Problem",
    category: "Dynamic Programming & Memoization",
    description: "Maximizes value within capacity by taking or skipping items.",
    explanation: "Compares value obtained by including item (n - 1) versus skipping it.",
    code: `#include <bits/stdc++.h>
using namespace std;

int knapsack(int W, int wt[], int val[], int n) {
    if (n == 0 || W == 0) return 0;
    if (wt[n - 1] > W) return knapsack(W, wt, val, n - 1);
    int take = val[n - 1] + knapsack(W - wt[n - 1], wt, val, n - 1);
    int leave = knapsack(W, wt, val, n - 1);
    return max(take, leave);
}

int main() {
    int val[3] = {60, 100, 120};
    int wt[3] = {10, 20, 30};
    int W = 50;
    cout << knapsack(W, wt, val, 3);
}
`,
  },
  {
    id: "coin_change",
    name: "39. Coin Change (Fewest Coins)",
    category: "Dynamic Programming & Memoization",
    description: "Finds minimum number of coins needed to make amount.",
    explanation: "Tries every coin denomination recursively and tracks the minimal combination.",
    code: `#include <bits/stdc++.h>
using namespace std;

int minCoins(vector<int>& coins, int amount) {
    if (amount == 0) return 0;
    if (amount < 0) return 9999;
    int res = 9999;
    for (int i = 0; i < coins.size(); i++) {
        int sub = minCoins(coins, amount - coins[i]);
        if (sub != 9999) {
            res = min(res, 1 + sub);
        }
    }
    return res;
}

int main() {
    vector<int> coins;
    coins.push_back(1);
    coins.push_back(2);
    coins.push_back(5);
    cout << minCoins(coins, 6);
}
`,
  },
  {
    id: "longest_common_subsequence",
    name: "40. Longest Common Subsequence (LCS)",
    category: "Dynamic Programming & Memoization",
    description: "Computes length of longest subsequence present in both strings.",
    explanation: "If characters match, advances both strings; otherwise takes max of advancing either string.",
    code: `#include <bits/stdc++.h>
using namespace std;

int lcs(const string& s1, const string& s2, int m, int n) {
    if (m == 0 || n == 0) return 0;
    if (s1[m - 1] == s2[n - 1]) {
        return 1 + lcs(s1, s2, m - 1, n - 1);
    }
    return max(lcs(s1, s2, m, n - 1), lcs(s1, s2, m - 1, n));
}

int main() {
    string s1 = "ABCD";
    string s2 = "AEBD";
    cout << lcs(s1, s2, s1.size(), s2.size());
}
`,
  },
];
