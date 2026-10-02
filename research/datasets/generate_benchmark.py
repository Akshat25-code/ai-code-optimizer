"""Generate research/datasets/benchmark.json: 300 runnable programs.

Uniform I/O contract per family (stdin in -> stdout out) so differential
fuzzing, cross-language comparison, and reference-oracle checks all apply.
Every entry: original (inefficient) + reference (efficient) + tests with
expected stdout captured by RUNNING the reference (python) or the compiled
program. Seeded RNG => byte-identical regeneration.

Targets: python 100, java 75, c++ 75, javascript 50.
Usage: python research/datasets/generate_benchmark.py [--check-only]
"""
import json
import os
import random
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "benchmark.json")

# ---------------------------------------------------------------- families
# Each family: inefficiency tag, baseline O, reference O, emitters(lang)->code,
# input generator(rng, size)->stdin, expected(stdout) computed from reference.


def _ints(rng, n, lo=-999, hi=999):
    return [rng.randint(lo, hi) for _ in range(n)]


def _stdin_ints(xs):
    return f"{len(xs)}\n" + (" ".join(map(str, xs)) + "\n" if xs else "")


FAMILIES = {}


def family(name, inefficiency, baseline, reference):
    def deco(fns):
        FAMILIES[name] = {"inefficiency": inefficiency, "baseline": baseline,
                          "reference": reference, "emit": fns}
        return fns
    return deco


# -- sort: bubble O(n^2) -> builtin sort O(n log n) ---------------------------
@family("sort", "nested-loop", "O(n^2)", "O(n log n)")
def _sort():
    return {
        "python": (
            "import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n"
            "            if xs[j] < xs[i]:\n                xs[i], xs[j] = xs[j], xs[i]\n"
            "    print(' '.join(map(str, xs)))\nmain()\n",
            "import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = sorted(map(int, data[1:1 + int(data[0])]))\n"
            "    print(' '.join(map(str, xs)))\nmain()\n"),
        "java": (
            "import java.util.*;\npublic class Main {\n    public static void main(String[] a) {\n"
            "        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n"
            "        int n = sc.nextInt();\n        int[] xs = new int[n];\n"
            "        for (int i = 0; i < n && sc.hasNextInt(); i++) xs[i] = sc.nextInt();\n"
            "        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++)\n"
            "            if (xs[j] < xs[i]) { int t = xs[i]; xs[i] = xs[j]; xs[j] = t; }\n"
            "        StringBuilder sb = new StringBuilder();\n"
            "        for (int i = 0; i < n; i++) { if (i > 0) sb.append(' '); sb.append(xs[i]); }\n"
            "        System.out.println(sb.toString());\n    }\n}\n",
            "import java.util.*;\npublic class Main {\n    public static void main(String[] a) {\n"
            "        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n"
            "        int n = sc.nextInt();\n        int[] xs = new int[n];\n"
            "        for (int i = 0; i < n && sc.hasNextInt(); i++) xs[i] = sc.nextInt();\n"
            "        Arrays.sort(xs);\n"
            "        StringBuilder sb = new StringBuilder();\n"
            "        for (int i = 0; i < n; i++) { if (i > 0) sb.append(' '); sb.append(xs[i]); }\n"
            "        System.out.println(sb.toString());\n    }\n}\n"),
        "cpp": (
            "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
            "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
            "    int n; if (!(cin >> n)) return 0;\n    vector<long long> xs(n);\n"
            "    for (int i = 0; i < n; i++) cin >> xs[i];\n"
            "    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++)\n"
            "        if (xs[j] < xs[i]) swap(xs[i], xs[j]);\n"
            "    for (int i = 0; i < n; i++) { if (i) cout << ' '; cout << xs[i]; }\n"
            "    if (n) cout << '\\n';\n    return 0;\n}\n",
            "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
            "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
            "    int n; if (!(cin >> n)) return 0;\n    vector<long long> xs(n);\n"
            "    for (int i = 0; i < n; i++) cin >> xs[i];\n    sort(xs.begin(), xs.end());\n"
            "    for (int i = 0; i < n; i++) { if (i) cout << ' '; cout << xs[i]; }\n"
            "    if (n) cout << '\\n';\n    return 0;\n}\n"),
        "javascript": (
            "const fs = require('fs');\nconst data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean).map(Number);\n"
            "if (!data.length) process.exit(0);\nconst xs = data.slice(1, 1 + data[0]);\n"
            "for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++)\n"
            "  if (xs[j] < xs[i]) { const t = xs[i]; xs[i] = xs[j]; xs[j] = t; }\n"
            "console.log(xs.join(' '));\n",
            "const fs = require('fs');\nconst data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean).map(Number);\n"
            "if (!data.length) process.exit(0);\nconst xs = data.slice(1, 1 + data[0]).sort((a, b) => a - b);\n"
            "console.log(xs.join(' '));\n"),
    }


def _sort_inputs(rng, size):
    return [("0\n", "0\n"), ("1\n42\n", "1\n42\n"),
            (_stdin_ints(_ints(rng, size)), None)]


# -- max: sort-then-take O(n log n) -> linear scan O(n) ------------------------
@family("max", "sort-for-max", "O(n log n)", "O(n)")
def _max():
    py_o = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = sorted(map(int, data[1:1 + int(data[0])]))\n"
            "    print(xs[-1] if xs else 0)\nmain()\n")
    py_r = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    print(max(xs) if xs else 0)\nmain()\n")
    j_o = ("import java.util.*;\npublic class Main {\n    public static void main(String[] a) {\n"
           "        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n"
           "        int n = sc.nextInt();\n        int[] xs = new int[n];\n"
           "        for (int i = 0; i < n && sc.hasNextInt(); i++) xs[i] = sc.nextInt();\n"
           "        Arrays.sort(xs);\n        System.out.println(n > 0 ? xs[n-1] : 0);\n    }\n}\n")
    j_r = j_o.replace("Arrays.sort(xs);\n        System.out.println(n > 0 ? xs[n-1] : 0);",
                      "int m = xs[0];\n        for (int v : xs) m = Math.max(m, v);\n        System.out.println(n > 0 ? m : 0);")
    return {"python": (py_o, py_r), "java": (j_o, j_r),
            "cpp": (None, None), "javascript": (None, None)}


def _max_inputs(rng, size):
    return [("0\n", "0\n"), ("1\n-7\n", "1\n-7\n"),
            (_stdin_ints(_ints(rng, size)), None)]


# -- fib: naive exponential -> iterative O(n) ---------------------------------
@family("fib", "naive-recursion", "O(2^n)", "O(n)")
def _fib():
    py_o = ("import sys\nsys.setrecursionlimit(10000)\ndef f(n):\n"
            "    return n if n <= 1 else f(n-1) + f(n-2)\n"
            "def main():\n    d = sys.stdin.read().strip().split()\n"
            "    print(f(int(d[0])) if d else 0)\nmain()\n")
    py_r = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    if not d:\n        print(0)\n        return\n    n = int(d[0])\n"
            "    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n"
            "    print(a)\nmain()\n")
    j_o = ("public class Main {\n    static long f(int n) { return n <= 1 ? n : f(n-1) + f(n-2); }\n"
           "    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        System.out.println(sc.hasNextInt() ? f(sc.nextInt()) : 0);\n    }\n}\n")
    j_r = ("public class Main {\n    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        if (!sc.hasNextInt()) { System.out.println(0); return; }\n"
           "        int n = sc.nextInt(); long x = 0, y = 1;\n"
           "        for (int i = 0; i < n; i++) { long t = x + y; x = y; y = t; }\n"
           "        System.out.println(x);\n    }\n}\n")
    js_o = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "function f(n) { return n <= 1 ? n : f(n-1) + f(n-2); }\n"
            "console.log(d.length ? f(Number(d[0])) : 0);\n")
    js_r = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "if (!d.length) { console.log(0); } else {\n  let x = 0, y = 1;\n"
            "  for (let i = 0, n = Number(d[0]); i < n; i++) { const t = x + y; x = y; y = t; }\n"
            "  console.log(x);\n}\n")
    return {"python": (py_o, py_r), "java": (j_o, j_r),
            "cpp": (None, None), "javascript": (js_o, js_r)}


def _fib_inputs(rng, size):
    n = min(size, 25)
    return [("0\n", "0\n"), ("1\n", "1\n"), (f"{n}\n", None)]


# -- sum_sq: loop O(n) -> closed form O(1) ------------------------------------
@family("sum_sq", "loop-vs-formula", "O(n)", "O(1)")
def _sum_sq():
    py_o = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    n = int(d[0]) if d else 0\n    s = 0\n"
            "    for i in range(1, n + 1):\n        s += i * i\n    print(s)\nmain()\n")
    py_r = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    n = int(d[0]) if d else 0\n    print(n * (n + 1) * (2 * n + 1) // 6)\nmain()\n")
    j_o = ("public class Main {\n    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        long n = sc.hasNextLong() ? sc.nextLong() : 0;\n        long s = 0;\n"
           "        for (long i = 1; i <= n; i++) s += i * i;\n"
           "        System.out.println(s);\n    }\n}\n")
    j_r = ("public class Main {\n    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        long n = sc.hasNextLong() ? sc.nextLong() : 0;\n"
           "        System.out.println(n * (n + 1) * (2 * n + 1) / 6);\n    }\n}\n")
    c_o = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    long long n; if (!(cin >> n)) return 0;\n    long long s = 0;\n"
           "    for (long long i = 1; i <= n; i++) s += i * i;\n"
           "    cout << s << '\\n';\n    return 0;\n}\n")
    c_r = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    long long n; if (!(cin >> n)) return 0;\n"
           "    cout << n * (n + 1) * (2 * n + 1) / 6 << '\\n';\n    return 0;\n}\n")
    js_o = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "let n = d.length ? BigInt(d[0]) : 0n, s = 0n;\n"
            "for (let i = 1n; i <= n; i++) s += i * i;\nconsole.log(s.toString());\n")
    js_r = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "let n = d.length ? BigInt(d[0]) : 0n;\n"
            "console.log((n * (n + 1n) * (2n * n + 1n) / 6n).toString());\n")
    return {"python": (py_o, py_r), "java": (j_o, j_r),
            "cpp": (c_o, c_r), "javascript": (js_o, js_r)}


def _sum_sq_inputs(rng, size):
    n = min(size * 200, 200000)
    return [("0\n", "0\n"), ("1\n", "1\n"), (f"{n}\n", None)]


# -- concat: += loop O(n^2) -> builder O(n) -----------------------------------
@family("concat", "string-concat-loop", "O(n^2)", "O(n)")
def _concat():
    def _in(root):
        return [(f"{root} n", "n")]
    py_o = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    if not d:\n        return\n    n = int(d[0]); toks = d[1:1 + n]\n"
            "    s = ''\n    for t in toks:\n        s += t + '\\n'\n    print(s, end='')\nmain()\n")
    py_r = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    if not d:\n        return\n    n = int(d[0]); toks = d[1:1 + n]\n"
            "    sys.stdout.write(''.join(t + '\\n' for t in toks))\nmain()\n")
    c_o = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; if (!(cin >> n)) return 0;\n    string s = \"\", t;\n"
           "    for (int i = 0; i < n && cin >> t; i++) s = s + t + \"\\n\";\n"
           "    cout << s;\n    return 0;\n}\n")
    c_r = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; if (!(cin >> n)) return 0;\n    ostringstream oss;\n    string t;\n"
           "    for (int i = 0; i < n && cin >> t; i++) oss << t << '\\n';\n"
           "    cout << oss.str();\n    return 0;\n}\n")
    js_o = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "if (!d.length) process.exit(0);\nconst toks = d.slice(1, 1 + Number(d[0]));\n"
            "let s = '';\nfor (const t of toks) s += t + '\\n';\nprocess.stdout.write(s);\n")
    js_r = ("const fs = require('fs');\nconst d = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);\n"
            "if (!d.length) process.exit(0);\nconst toks = d.slice(1, 1 + Number(d[0]));\n"
            "process.stdout.write(toks.map(t => t + '\\n').join(''));\n")
    return {"python": (py_o, py_r), "java": (None, None),
            "cpp": (c_o, c_r), "javascript": (js_o, js_r)}


def _words(rng, n):
    alpha = "abcdef"
    return ["".join(rng.choice(alpha) for _ in range(rng.randint(1, 6))) for _ in range(n)]


def _concat_inputs(rng, size):
    ws = _words(rng, size)
    return [("0\n", "0\n"), ("1\nq\n", "1\nq\n"),
            (f"{len(ws)}\n" + "\n".join(ws) + "\n", None)]
# NOTE: hand-written expected values above are cross-checked against actual
# reference runs in build_entry (mismatches warn and use actual output).


# -- dedup: nested scan O(n^2) -> hash set O(n) --------------------------------
@family("dedup", "nested-scan", "O(n^2)", "O(n)")
def _dedup():
    py_o = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    out = []\n    for x in xs:\n        found = False\n"
            "        for y in out:\n            if y == x:\n                found = True\n                break\n"
            "        if not found:\n            out.append(x)\n"
            "    print(' '.join(map(str, out)))\nmain()\n")
    py_r = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    print(' '.join(map(str, dict.fromkeys(xs))))\nmain()\n")
    j_o = ("import java.util.*;\npublic class Main {\n    public static void main(String[] a) {\n"
           "        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n"
           "        int n = sc.nextInt();\n        List<Integer> out = new ArrayList<>();\n"
           "        for (int i = 0; i < n && sc.hasNextInt(); i++) {\n"
           "            int x = sc.nextInt();\n            if (!out.contains(x)) out.add(x);\n        }\n"
           "        StringJoiner sj = new StringJoiner(\" \");\n"
           "        for (int v : out) sj.add(String.valueOf(v));\n"
           "        System.out.println(sj.toString());\n    }\n}\n")
    j_r = ("import java.util.*;\npublic class Main {\n    public static void main(String[] a) {\n"
           "        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n"
           "        int n = sc.nextInt();\n        LinkedHashSet<Integer> out = new LinkedHashSet<>();\n"
           "        for (int i = 0; i < n && sc.hasNextInt(); i++) out.add(sc.nextInt());\n"
           "        StringJoiner sj = new StringJoiner(\" \");\n"
           "        for (int v : out) sj.add(String.valueOf(v));\n"
           "        System.out.println(sj.toString());\n    }\n}\n")
    c_o = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; if (!(cin >> n)) return 0;\n    vector<long long> out;\n"
           "    for (int i = 0; i < n; i++) { long long x; cin >> x;\n"
           "        bool f = false;\n        for (long long y : out) if (y == x) { f = true; break; }\n"
           "        if (!f) out.push_back(x); }\n"
           "    for (size_t i = 0; i < out.size(); i++) { if (i) cout << ' '; cout << out[i]; }\n"
           "    if (!out.empty()) cout << '\\n';\n    return 0;\n}\n")
    c_r = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; if (!(cin >> n)) return 0;\n    vector<long long> out;\n"
           "    unordered_set<long long> seen;\n"
           "    for (int i = 0; i < n; i++) { long long x; cin >> x;\n"
           "        if (seen.insert(x).second) out.push_back(x); }\n"
           "    for (size_t i = 0; i < out.size(); i++) { if (i) cout << ' '; cout << out[i]; }\n"
           "    if (!out.empty()) cout << '\\n';\n    return 0;\n}\n")
    return {"python": (py_o, py_r), "java": (j_o, j_r),
            "cpp": (c_o, c_r), "javascript": (None, None)}


def _dedup_inputs(rng, size):
    return [("0\n", "0\n"), ("3\n5 5 5\n", "3\n5 5 5\n"),
            (_stdin_ints(_ints(rng, size, 0, 9)), None)]


# -- two_sum: nested O(n^2) -> hashmap O(n) ------------------------------------
@family("two_sum", "nested-loop", "O(n^2)", "O(n)")
def _two_sum():
    py_o = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if len(data) < 3:\n        print('-1 -1')\n        return\n"
            "    n, t = int(data[0]), int(data[1])\n    xs = list(map(int, data[2:2 + n]))\n"
            "    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n"
            "            if xs[i] + xs[j] == t:\n                print(f'{i} {j}')\n                return\n"
            "    print('-1 -1')\nmain()\n")
    py_r = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if len(data) < 3:\n        print('-1 -1')\n        return\n"
            "    n, t = int(data[0]), int(data[1])\n    xs = list(map(int, data[2:2 + n]))\n"
            "    seen = {}\n    for i, x in enumerate(xs):\n"
            "        if t - x in seen:\n            print(f'{seen[t - x]} {i}')\n            return\n"
            "        seen[x] = i\n"
            "    print('-1 -1')\nmain()\n")
    py_o = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if len(data) < 3:\n        print('-1 -1')\n        return\n"
            "    n, t = int(data[0]), int(data[1])\n    xs = list(map(int, data[2:2 + n]))\n"
            "    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n"
            "            if xs[i] + xs[j] == t:\n                print(f'{i} {j}')\n                return\n"
            "    print('-1 -1')\nmain()\n")
    py_r = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if len(data) < 3:\n        print('-1 -1')\n        return\n"
            "    n, t = int(data[0]), int(data[1])\n    xs = list(map(int, data[2:2 + n]))\n"
            "    seen = {}\n    for i, x in enumerate(xs):\n"
            "        if t - x in seen:\n            print(f'{seen[t - x]} {i}')\n            return\n"
            "        seen[x] = i\n"
            "    print('-1 -1')\nmain()\n")
    # NOTE: first-found pair can differ between variants on duplicate values;
    # generator below constructs inputs with a UNIQUE solution pair.
    c_o = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; long long t; if (!(cin >> n >> t)) return 0;\n"
           "    vector<long long> xs(n);\n    for (int i = 0; i < n; i++) cin >> xs[i];\n"
           "    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++)\n"
           "        if (xs[i] + xs[j] == t) { cout << i << ' ' << j << '\\n'; return 0; }\n"
           "    cout << \"-1 -1\\n\";\n    return 0;\n}\n")
    c_r = ("#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n"
           "    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n"
           "    int n; long long t; if (!(cin >> n >> t)) return 0;\n"
           "    vector<long long> xs(n);\n    for (int i = 0; i < n; i++) cin >> xs[i];\n"
           "    unordered_map<long long, int> seen;\n"
           "    for (int i = 0; i < n; i++) {\n"
           "        auto it = seen.find(t - xs[i]);\n"
           "        if (it != seen.end()) { cout << it->second << ' ' << i << '\\n'; return 0; }\n"
           "        seen[xs[i]] = i; }\n"
           "    cout << \"-1 -1\\n\";\n    return 0;\n}\n")
    return {"python": (py_o, py_r), "java": (None, None),
            "cpp": (c_o, c_r), "javascript": (None, None)}


def _two_sum_inputs(rng, size):
    # powers of two => every pair sum is unique, so nested-loop and hashmap
    # variants always agree regardless of scan order.
    vals = [2 ** k for k in range(size)]
    rng.shuffle(vals)
    i, j = sorted(rng.sample(range(size), 2))
    t = vals[i] + vals[j]
    return [("2\n3\n1 2\n", "2\n3\n1 2\n"),
            (f"{size}\n{t}\n" + " ".join(map(str, vals)) + "\n", None)]


# -- prime: trial to n O(n) -> trial to sqrt O(sqrt n) -------------------------
@family("prime", "full-trial-division", "O(n)", "O(sqrt n)")
def _prime():
    py_o = ("import sys\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    n = int(d[0]) if d else 0\n    print('composite' if any(n % i == 0 for i in range(2, n)) and n > 1 else ('prime' if n > 1 else 'composite'))\nmain()\n")
    py_r = ("import sys, math\ndef main():\n    d = sys.stdin.read().strip().split()\n"
            "    n = int(d[0]) if d else 0\n    print('composite' if n > 1 and any(n % i == 0 for i in range(2, int(math.isqrt(n)) + 1)) else ('prime' if n > 1 else 'composite'))\nmain()\n")
    j_o = ("public class Main {\n    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        long n = sc.hasNextLong() ? sc.nextLong() : 0;\n"
           "        boolean prime = n > 1;\n"
           "        for (long i = 2; i < n && prime; i++) if (n % i == 0) prime = false;\n"
           "        System.out.println(prime ? \"prime\" : \"composite\");\n    }\n}\n")
    j_r = ("public class Main {\n    public static void main(String[] a) throws Exception {\n"
           "        java.util.Scanner sc = new java.util.Scanner(System.in);\n"
           "        long n = sc.hasNextLong() ? sc.nextLong() : 0;\n"
           "        boolean prime = n > 1;\n"
           "        for (long i = 2; i * i <= n && prime; i++) if (n % i == 0) prime = false;\n"
           "        System.out.println(prime ? \"prime\" : \"composite\");\n    }\n}\n")
    return {"python": (py_o, py_r), "java": (j_o, j_r),
            "cpp": (None, None), "javascript": (None, None)}


def _prime_inputs(rng, size):
    return [("2\n", "2\n"), ("4\n", "4\n"),
            (f"{rng.choice([101, 997, 7919, 104729])}\n", None)]


# -- reverse: prepend loop O(n^2) -> builder O(n) ------------------------------
@family("reverse", "prepend-loop", "O(n^2)", "O(n)")
def _reverse():
    py_o = ("import sys\ndef main():\n    s = sys.stdin.read().rstrip('\\n')\n"
            "    r = ''\n    for ch in s:\n        r = ch + r\n    print(r)\nmain()\n")
    py_r = ("import sys\ndef main():\n    s = sys.stdin.read().rstrip('\\n')\n"
            "    print(s[::-1])\nmain()\n")
    js_o = ("const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf8').replace(/\\n$/, '');\n"
            "let r = '';\nfor (const ch of s) r = ch + r;\nconsole.log(r);\n")
    js_r = ("const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf8').replace(/\\n$/, '');\n"
            "console.log(s.split('').reverse().join(''));\n")
    return {"python": (py_o, py_r), "java": (None, None),
            "cpp": (None, None), "javascript": (js_o, js_r)}


def _reverse_inputs(rng, size):
    s = "".join(rng.choice("abcdefgh") for _ in range(size))
    return [("x\n", "x\n"), ("ab\n", "ab\n"), (s + "\n", None)]


# -- freq/mode: nested count O(n^2) -> hashmap O(n) -----------------------------
@family("freq", "nested-count", "O(n^2)", "O(n)")
def _freq():
    py_o = ("import sys\ndef main():\n    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    best, bestc = None, -1\n    for x in xs:\n"
            "        c = sum(1 for y in xs if y == x)\n"
            "        if c > bestc or (c == bestc and (best is None or x < best)):\n"
            "            best, bestc = x, c\n"
            "    print(best if best is not None else '')\nmain()\n")
    py_r = ("import sys\nfrom collections import Counter\ndef main():\n"
            "    data = sys.stdin.read().strip().split()\n"
            "    if not data:\n        return\n    xs = list(map(int, data[1:1 + int(data[0])]))\n"
            "    if not xs:\n        print('')\n        return\n"
            "    cnt = Counter(xs)\n    top = max(cnt.values())\n"
            "    print(min(x for x, c in cnt.items() if c == top))\nmain()\n")
    return {"python": (py_o, py_r), "java": (None, None),
            "cpp": (None, None), "javascript": (None, None)}


def _freq_inputs(rng, size):
    return [("0\n", "0\n"), ("3\n7 7 7\n", "3\n7 7 7\n"),
            (_stdin_ints(_ints(rng, size, 0, 5)), None)]


INPUTS = {"sort": _sort_inputs, "max": _max_inputs, "fib": _fib_inputs,
          "sum_sq": _sum_sq_inputs, "concat": _concat_inputs,
          "dedup": _dedup_inputs, "two_sum": _two_sum_inputs,
          "prime": _prime_inputs, "reverse": _reverse_inputs,
          "freq": _freq_inputs}

# language -> [(family, count, sizes)]
PLAN = {
    "python": [("sort", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80]),
               ("max", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80]),
               ("fib", 10, [10, 12, 14, 16, 18, 20, 21, 22, 23, 24]),
               ("sum_sq", 10, [100, 500, 1000, 2000, 5000, 8000, 10000, 15000, 20000, 30000]),
               ("concat", 10, [10, 20, 40, 80, 120, 160, 200, 260, 320, 400]),
               ("dedup", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80]),
               ("two_sum", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80]),
               ("prime", 10, [50, 100, 200, 300, 400, 500, 600, 800, 1000, 1200]),
               ("reverse", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80]),
               ("freq", 10, [8, 12, 16, 20, 25, 30, 40, 50, 60, 80])],
    "java": [("sort", 15, [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50]),
             ("max", 12, [8, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70]),
             ("fib", 12, [10, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]),
             ("sum_sq", 12, [100, 500, 1000, 2000, 4000, 6000, 8000, 10000, 15000, 20000, 25000, 30000]),
             ("dedup", 12, [8, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70]),
             ("prime", 12, [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1100, 1200])],
    "cpp": [("sort", 15, [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50]),
            ("max", 0, []),
            ("sum_sq", 12, [100, 500, 1000, 2000, 4000, 6000, 8000, 10000, 15000, 20000, 25000, 30000]),
            ("concat", 12, [10, 20, 40, 60, 80, 100, 140, 180, 220, 260, 300, 360]),
            ("dedup", 12, [8, 12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70]),
            ("two_sum", 12, [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48]),
            ("sort_b", 12, [55, 65, 75, 85, 95, 105, 120, 140, 160, 180, 200, 220])],
    "javascript": [("sort", 12, [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35]),
                   ("fib", 10, [10, 12, 14, 15, 16, 17, 18, 19, 20, 21]),
                   ("sum_sq", 10, [100, 500, 1000, 2000, 4000, 6000, 8000, 10000, 15000, 20000]),
                   ("concat", 10, [10, 20, 40, 60, 80, 100, 140, 180, 220, 260]),
                   ("reverse", 8, [8, 12, 16, 20, 30, 40, 50, 60])],
}
# NOTE: cpp "max" has no template (max covered via sort/max in python+java);
# "sort_b" reuses the sort family with larger sizes (same contract).


# ------------------------------------------------------------------ runners
def _run_capture(cmd, stdin, cwd, timeout):
    try:
        p = subprocess.run(cmd, input=stdin, capture_output=True, text=True,
                           timeout=timeout, cwd=cwd)
    except subprocess.TimeoutExpired:
        return None, "TIMEOUT"
    except FileNotFoundError as e:
        return None, f"MISSING:{e.filename}"
    if p.returncode != 0:
        return None, f"EXIT{p.returncode}:{p.stderr.strip()[:200]}"
    return p.stdout, ""


def compile_java(code, tmpdir):
    src = os.path.join(tmpdir, "Main.java")
    open(src, "w", encoding="utf-8").write(code)
    p = subprocess.run(["javac", src], capture_output=True, text=True,
                       timeout=60, cwd=tmpdir)
    return p.returncode == 0, p.stderr.strip()[:300]


def compile_cpp(code, tmpdir, opt="-O0"):
    src = os.path.join(tmpdir, "prog.cpp")
    exe = os.path.join(tmpdir, "prog.exe" if os.name == "nt" else "prog")
    open(src, "w", encoding="utf-8").write(code)
    p = subprocess.run(["g++", src, "-o", exe, opt], capture_output=True,
                       text=True, timeout=120, cwd=tmpdir)
    return (p.returncode == 0, p.stderr.strip()[:300], exe)


def make_runner(lang, code, tmpdir, opt="-O0"):
    """Compile once (if needed); return (run_fn, error). run_fn(stdin, timeout)
    returns (stdout or None, error). Caller owns tmpdir lifetime."""
    if lang == "python":
        src = os.path.join(tmpdir, "prog.py")
        open(src, "w", encoding="utf-8").write(code)
        return (lambda stdin, timeout=20: _run_capture(
            [sys.executable, src], stdin, tmpdir, timeout)), ""
    if lang == "javascript":
        src = os.path.join(tmpdir, "prog.js")
        open(src, "w", encoding="utf-8").write(code)
        return (lambda stdin, timeout=20: _run_capture(
            ["node", src], stdin, tmpdir, timeout)), ""
    if lang == "java":
        ok, err = compile_java(code, tmpdir)
        if not ok:
            return None, f"COMPILE:{err}"
        return (lambda stdin, timeout=20: _run_capture(
            ["java", "Main"], stdin, tmpdir, timeout)), ""
    if lang == "cpp":
        ok, err, exe = compile_cpp(code, tmpdir, opt=opt)
        if not ok:
            return None, f"COMPILE:{err}"
        return (lambda stdin, timeout=20: _run_capture(
            [exe], stdin, tmpdir, timeout)), ""
    raise ValueError(lang)


# ------------------------------------------------------------------ builder
def plan_entry(lang, fam, idx, size, rng):
    """Serial RNG-ordered phase: compute inputs only (no toolchain)."""
    meta = FAMILIES[fam if fam != "sort_b" else "sort"]
    pair = meta["emit"]()[lang]
    assert pair[0] is not None, f"no {lang} template for {fam}"
    orig, ref = pair
    inputs = INPUTS[fam if fam != "sort_b" else "sort"](rng, size)
    return {"id": f"{lang}_{idx:03d}", "lang": lang, "fam": fam,
            "meta": meta, "orig": orig, "ref": ref, "inputs": inputs,
            "size": size, "seed": rng_state(rng)}


def execute_plan(plan):
    """Thread-safe phase: compile once, run reference + original per input."""
    entry_id, lang = plan["id"], plan["lang"]
    with tempfile.TemporaryDirectory(prefix="benchentry_") as td:
        ref_run, err = make_runner(lang, plan["ref"], td)
        if ref_run is None:
            raise RuntimeError(f"reference compile failed {entry_id}: {err}")
        orig_run, err = make_runner(lang, plan["orig"], td)
        if orig_run is None:
            raise RuntimeError(f"original compile failed {entry_id}: {err}")
        tests = []
        for stdin, expected in plan["inputs"]:
            actual, err = ref_run(stdin, 30)
            if actual is None:
                raise RuntimeError(f"reference failed {entry_id} on {stdin!r}: {err}")
            if expected is not None and expected != actual:
                tests.append({"_note": (f"template-note {entry_id}: hand value "
                                        f"{expected!r} != reference {actual!r}")})
            tests.append({"stdin": stdin, "stdout": actual})
        original_runs = True
        for t in [x for x in tests if "stdin" in x]:
            actual, err = orig_run(t["stdin"], 60)
            if actual is None or actual != t["stdout"]:
                tests.append({"_warn": (f"WARN {entry_id}: original disagrees/fails "
                                        f"({err or 'diff'})")})
                original_runs = False
                break
    return tests, original_runs


def finalize_plan(plan, tests, original_runs):
    for t in tests:
        if "_note" in t:
            print("  " + t["_note"], flush=True)
        if "_warn" in t:
            print("  " + t["_warn"], flush=True)
    tests = [t for t in tests if "stdin" in t]
    meta = plan["meta"]
    return {
        "id": plan["id"],
        "language": plan["lang"],
        "category": "algorithmic",
        "family": plan["fam"],
        "inefficiency": meta["inefficiency"],
        "original_code": plan["orig"],
        "reference_code": plan["ref"],
        "tests": tests,
        "expected_behavior": f"same outputs as reference on {len(tests)} inputs",
        "original_runs": original_runs,
        "baseline_complexity": meta["baseline"],
        "reference_complexity": meta["reference"],
        "params": {"size": plan["size"], "seed": plan["seed"]},
    }


def rng_state(rng):
    return rng.getstate()[1][0]


PARTIAL = os.path.join(HERE, "benchmark.partial.json")


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--check-only", action="store_true",
                    help="validate existing benchmark.json without regenerating")
    ap.add_argument("--limit", type=int, default=0,
                    help="stop after N new entries (for chunked runs)")
    args = ap.parse_args()
    if args.check_only:
        data = json.load(open(OUT, encoding="utf-8"))
        print(f"{OUT}: {len(data)} entries")
        return
    import concurrent.futures
    rng = random.Random(20261002)
    data = []
    if os.path.exists(PARTIAL):
        data = json.load(open(PARTIAL, encoding="utf-8"))
        print(f"resuming with {len(data)} existing entries", flush=True)
    # Replay RNG past already-generated entries so resume is deterministic.
    skip = len(data)
    counts = {}
    # Phase A (serial, RNG-ordered): plan everything remaining.
    plans = []
    for lang, items in PLAN.items():
        for fam, count, sizes in items:
            assert len(sizes) == count, (lang, fam, len(sizes), count)
            for k in range(count):
                if skip > 0:
                    # advance RNG identically without running toolchains
                    _ = INPUTS[fam if fam != "sort_b" else "sort"](rng, sizes[k])
                    skip -= 1
                    continue
                if args.limit and len(plans) >= args.limit:
                    break
                plans.append(plan_entry(lang, fam, len(data) + len(plans) + 1,
                                        sizes[k], rng))
            if args.limit and len(plans) >= args.limit:
                break
        if args.limit and len(plans) >= args.limit:
            break
    # Phase B (threaded): compile + execute. Phase C: assemble in order.
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for i, (plan, (tests, original_runs)) in enumerate(
                zip(plans, ex.map(execute_plan, plans))):
            entry = finalize_plan(plan, tests, original_runs)
            data.append(entry)
            counts[plan["lang"]] = counts.get(plan["lang"], 0) + 1
            if len(data) % 10 == 0:
                print(f"  ...{len(data)} entries", flush=True)
                json.dump(data, open(PARTIAL, "w", encoding="utf-8"), indent=1)
    if args.limit and len(plans) == args.limit and len(data) < 300:
        json.dump(data, open(PARTIAL, "w", encoding="utf-8"), indent=1)
        print(f"checkpoint: {len(data)} entries")
        return
    json.dump(data, open(OUT, "w", encoding="utf-8"), indent=1)
    if os.path.exists(PARTIAL):
        os.unlink(PARTIAL)
    print(f"wrote {OUT}: {len(data)} entries {counts}")


if __name__ == "__main__":
    main()
