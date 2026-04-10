import ast
import json
import sys


def fail(reason: str):
    return {
        "passed": False,
        "reason": reason,
    }


def has_keyed_return(solution_node: ast.FunctionDef) -> bool:
    for node in ast.walk(solution_node):
        if isinstance(node, ast.Return) and isinstance(node.value, ast.Dict):
            keys = {
                key.value
                for key in node.value.keys
                if isinstance(key, ast.Constant) and isinstance(key.value, str)
            }
            if "suspicious_ips" in keys and "total_packets_analyzed" in keys:
                return True
    return False


def has_threshold_check(solution_node: ast.FunctionDef) -> bool:
    for node in ast.walk(solution_node):
        if isinstance(node, ast.Compare):
            for comparator in node.comparators:
                if isinstance(comparator, ast.Constant) and comparator.value == 20:
                    if any(isinstance(op, (ast.Gt, ast.GtE)) for op in node.ops):
                        return True
    return False


def has_window_check(solution_node: ast.FunctionDef) -> bool:
    for node in ast.walk(solution_node):
        if isinstance(node, ast.Compare):
            for comparator in node.comparators:
                if isinstance(comparator, ast.Constant) and comparator.value in (1, 1.0):
                    if any(isinstance(op, (ast.GtE, ast.Lt, ast.LtE)) for op in node.ops):
                        return True
    return False


def has_syn_without_ack(solution_node: ast.FunctionDef) -> bool:
    saw_syn = False
    saw_ack = False

    for node in ast.walk(solution_node):
        if isinstance(node, ast.Constant) and node.value in (0x02, 0x10):
            if node.value == 0x02:
                saw_syn = True
            if node.value == 0x10:
                saw_ack = True

        if isinstance(node, ast.Attribute):
            if node.attr == "TH_SYN":
                saw_syn = True
            if node.attr == "TH_ACK":
                saw_ack = True

    return saw_syn and saw_ack


def has_packet_parsing(solution_node: ast.FunctionDef) -> bool:
    saw_pcap_reader = False
    saw_dpkt_reader = False

    for node in ast.walk(solution_node):
        if isinstance(node, ast.Name) and node.id == "PcapReader":
            saw_pcap_reader = True
        if isinstance(node, ast.Attribute) and node.attr in {"Reader", "PcapReader"}:
            if isinstance(node.value, ast.Attribute) and node.value.attr in {"pcap", "pcapng"}:
                saw_dpkt_reader = True

    return saw_pcap_reader or saw_dpkt_reader


def grade_source(source_code: str):
    try:
        tree = ast.parse(source_code)
    except SyntaxError as err:
        line = err.lineno or "?"
        return fail(f"Tu codigo tiene un error de sintaxis o indentacion en la linea {line}.")

    solution_node = next(
        (node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "solution"),
        None,
    )
    if solution_node is None:
        return fail("No se encontro la funcion solution().")

    if not has_packet_parsing(solution_node):
        return fail("La solucion no muestra una lectura valida del archivo PCAP.")

    if not has_syn_without_ack(solution_node):
        return fail("La logica no evidencia una verificacion de SYN sin ACK.")

    if not has_threshold_check(solution_node):
        return fail("La solucion no refleja el umbral de mas de 20 puertos unicos.")

    if not has_window_check(solution_node):
        return fail("La solucion no refleja la ventana temporal de 1 segundo.")

    if not has_keyed_return(solution_node):
        return fail("La salida debe retornar suspicious_ips y total_packets_analyzed.")

    return {
        "passed": True,
        "reason": "La solucion cumple el contrato y la logica visible esperada para el reto demo.",
    }


def main():
    payload = json.load(sys.stdin)
    source_code = payload.get("source_code", "")
    result = grade_source(source_code)
    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
