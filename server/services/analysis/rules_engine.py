"""Custom Rules Engine & Linting Policies."""
import ast
import logging
import re
import os
import yaml
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

# Import the function-based API (not a class)
try:
    from services.analysis.complexity_engine import analyze_complexity as _analyze_complexity
except ImportError:
    _analyze_complexity = None

logger = logging.getLogger(__name__)

@dataclass
class RulePattern:
    type: str  # 'ast_call', 'ast_node', 'regex', 'metric'
    value: Any

@dataclass
class Rule:
    name: str
    description: str
    severity: str  # 'Critical', 'High', 'Medium', 'Low', 'Info'
    category: str
    pattern: RulePattern
    languages: List[str]
    message: str
    autofix: Optional[str] = None
    enabled_by_default: bool = True

@dataclass
class Violation:
    rule_name: str
    line: int
    severity: str
    snippet: str
    message: str
    autofix: Optional[str] = None

    def to_dict(self):
        return {
            "rule_name": self.rule_name,
            "line": self.line,
            "severity": self.severity,
            "snippet": self.snippet,
            "message": self.message,
            "autofix": self.autofix
        }

class _AstMatcher(ast.NodeVisitor):
    def __init__(self, code_lines, rules):
        self.code_lines = code_lines
        self.rules = rules
        self.violations = []

    def visit_Call(self, node):
        func_name = None
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr

        if func_name:
            for rule in self.rules:
                if rule.pattern.type == 'ast_call' and rule.pattern.value == func_name:
                    self._add_violation(node, rule)

        self.generic_visit(node)

    def generic_visit(self, node):
        node_type = type(node).__name__
        for rule in self.rules:
            if rule.pattern.type == 'ast_node' and rule.pattern.value == node_type:
                self._add_violation(node, rule)
        super().generic_visit(node)

    def _add_violation(self, node, rule):
        line = getattr(node, 'lineno', 1)
        snippet = self.code_lines[line - 1].strip() if 0 < line <= len(self.code_lines) else ""
        self.violations.append(Violation(
            rule_name=rule.name,
            line=line,
            severity=rule.severity,
            snippet=snippet,
            message=rule.message,
            autofix=rule.autofix
        ))

class RulesEngine:
    def __init__(self):
        self.packs = {}
        self._load_packs()

    def _load_packs(self):
        rules_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'rules')
        os.makedirs(rules_dir, exist_ok=True)

        for filename in os.listdir(rules_dir):
            if filename.endswith(('.yaml', '.yml')):
                pack_name = os.path.splitext(filename)[0]
                filepath = os.path.join(rules_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        if data and 'rules' in data:
                            self.packs[pack_name] = self._parse_rules(data['rules'])
                except Exception as e:
                    logger.warning("Failed to load rule pack %s: %s", filename, e)

    def _parse_rules(self, raw_rules: list) -> List[Rule]:
        rules = []
        for r in raw_rules:
            try:
                pattern = RulePattern(type=r['pattern']['type'], value=r['pattern']['value'])
                rules.append(Rule(
                    name=r['name'],
                    description=r.get('description', ''),
                    severity=r.get('severity', 'Medium'),
                    category=r.get('category', 'General'),
                    pattern=pattern,
                    languages=r.get('languages', ['*']),
                    message=r['message'],
                    autofix=r.get('autofix'),
                    enabled_by_default=r.get('enabled_by_default', True)
                ))
            except KeyError:
                continue
        return rules

    def get_pack(self, pack_name: str) -> List[Rule]:
        return self.packs.get(pack_name, [])

    def get_all_packs(self) -> Dict[str, List[Rule]]:
        return self.packs

    def evaluate(self, code: str, language: str, rules: List[Rule]) -> List[Violation]:
        violations = []
        lang = language.lower()
        active_rules = [r for r in rules if '*' in r.languages or lang in r.languages]

        if not active_rules or not code.strip():
            return []

        code_lines = code.split('\n')

        # 1. Regex rules
        regex_rules = [r for r in active_rules if r.pattern.type == 'regex']
        for rule in regex_rules:
            try:
                pattern = re.compile(rule.pattern.value)
                for i, line in enumerate(code_lines):
                    if pattern.search(line):
                        violations.append(Violation(
                            rule_name=rule.name, line=i+1, severity=rule.severity,
                            snippet=line.strip()[:100], message=rule.message, autofix=rule.autofix
                        ))
            except re.error:
                continue

        # 2. AST rules (Python only)
        if lang == 'python':
            ast_rules = [r for r in active_rules if r.pattern.type in ('ast_call', 'ast_node')]
            if ast_rules:
                try:
                    tree = ast.parse(code)
                    matcher = _AstMatcher(code_lines, ast_rules)
                    matcher.visit(tree)
                    violations.extend(matcher.violations)
                except SyntaxError:
                    pass

        # 3. Metric rules (uses analyze_complexity function)
        metric_rules = [r for r in active_rules if r.pattern.type == 'metric']
        if metric_rules and _analyze_complexity:
            try:
                report = _analyze_complexity(code, language)
                functions = report.get('functions', [])
                for rule in metric_rules:
                    metric_name = rule.pattern.value.get('metric')
                    threshold = rule.pattern.value.get('threshold')

                    if metric_name == 'max_function_length':
                        for fn in functions:
                            length = fn.get('end_line', 0) - fn.get('line', 0) + 1
                            if length > threshold:
                                violations.append(Violation(
                                    rule_name=rule.name, line=fn.get('line', 1),
                                    severity=rule.severity,
                                    snippet=f"def {fn.get('name', '?')}... ({length} lines)",
                                    message=rule.message.format(threshold=threshold, actual=length),
                                    autofix=rule.autofix
                                ))
                    elif metric_name == 'max_cyclomatic_complexity':
                        for fn in functions:
                            cc = fn.get('cyclomatic_complexity', 0)
                            if cc > threshold:
                                violations.append(Violation(
                                    rule_name=rule.name, line=fn.get('line', 1),
                                    severity=rule.severity,
                                    snippet=f"def {fn.get('name', '?')}...",
                                    message=rule.message.format(threshold=threshold, actual=cc),
                                    autofix=rule.autofix
                                ))
            except Exception:
                pass

        return sorted(violations, key=lambda v: v.line)

def get_compliance_score(violations: List[Violation]) -> int:
    score = 100
    weights = {'Critical': 15, 'High': 10, 'Medium': 5, 'Low': 2, 'Info': 0}
    for v in violations:
        score -= weights.get(v.severity, 0)
    return max(0, score)
