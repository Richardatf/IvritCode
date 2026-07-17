import ast

import pytest

from ivritcode_bridge import UnsafeIRError, build_module, compile_ir, validate_module


def test_acceptance_program_uses_real_python_ast_and_unparse():
    output = compile_ir([{"operation": "add_int", "opcode": "י", "register": "r1", "value": 5}])
    assert output["source"] == "r1 = int(r1) + 5"
    assert "Assign" in output["ast"]


@pytest.mark.parametrize("register", ["__import__", "r0", "r23", "r1.__class__", "open"])
def test_unsafe_names_are_rejected(register):
    with pytest.raises(UnsafeIRError):
        build_module([{"operation": "add_int", "register": register, "value": 5}])


@pytest.mark.parametrize("node", [ast.Import(names=[]), ast.Attribute(value=ast.Name(id="r1"), attr="x"), ast.While(test=ast.Constant(True), body=[], orelse=[])])
def test_disallowed_nodes_are_rejected(node):
    with pytest.raises(UnsafeIRError):
        validate_module(ast.Module(body=[node], type_ignores=[]))


def test_unsupported_ir_is_rejected():
    with pytest.raises(UnsafeIRError):
        build_module([{"operation": "exec", "source": "open('x')"}])
