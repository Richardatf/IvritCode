"""Allowlisted Python AST backend for verified IvritCode QEC IR.

This module emits inspectable Python. It never executes generated source.
"""

from __future__ import annotations

import ast
import json
import re
import sys
from typing import Any

SAFE_REGISTER = re.compile(r"r(?:[1-9]|1\d|2[0-2])\Z")
ALLOWED_NODES = (ast.Module, ast.Assign, ast.Name, ast.Store, ast.Load, ast.BinOp, ast.Add, ast.Call, ast.Constant, ast.Expr)


class UnsafeIRError(ValueError):
    """Raised when IR cannot be represented by the allowlisted backend."""


def _register(value: object) -> str:
    if not isinstance(value, str) or not SAFE_REGISTER.fullmatch(value) or "__" in value:
        raise UnsafeIRError("register must be r1 through r22")
    return value


def build_module(ir: list[dict[str, Any]]) -> ast.Module:
    body: list[ast.stmt] = []
    for instruction in ir:
        if instruction.get("operation") != "add_int":
            raise UnsafeIRError(f"unsupported operation: {instruction.get('operation')!r}")
        register = _register(instruction.get("register"))
        value = instruction.get("value")
        if isinstance(value, bool) or not isinstance(value, int):
            raise UnsafeIRError("add_int requires an integer literal")
        body.append(
            ast.Assign(
                targets=[ast.Name(id=register, ctx=ast.Store())],
                value=ast.BinOp(
                    left=ast.Call(
                        func=ast.Name(id="int", ctx=ast.Load()),
                        args=[ast.Name(id=register, ctx=ast.Load())],
                        keywords=[],
                    ),
                    op=ast.Add(),
                    right=ast.Constant(value=value),
                ),
            )
        )
    module = ast.fix_missing_locations(ast.Module(body=body, type_ignores=[]))
    validate_module(module)
    return module


def validate_module(module: ast.AST) -> None:
    for node in ast.walk(module):
        if not isinstance(node, ALLOWED_NODES):
            raise UnsafeIRError(f"disallowed Python AST node: {type(node).__name__}")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id != "int" or node.keywords:
                raise UnsafeIRError("only int(register) calls are allowed")
        if isinstance(node, ast.Name) and node.id != "int":
            _register(node.id)


def compile_ir(ir: list[dict[str, Any]]) -> dict[str, object]:
    module = build_module(ir)
    return {"ast": ast.dump(module, indent=2), "source": ast.unparse(module)}


def main() -> int:
    payload = json.load(sys.stdin)
    if not isinstance(payload, list):
        raise UnsafeIRError("input must be a JSON array of QEC IR instructions")
    json.dump(compile_ir(payload), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
