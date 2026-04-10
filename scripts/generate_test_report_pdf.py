from __future__ import annotations

import argparse
from pathlib import Path
import textwrap


def escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_content(lines: list[str], start_y: int = 760, leading: int = 22) -> bytes:
    chunks = ["BT", "/F1 12 Tf", f"72 {start_y} Td", f"{leading} TL"]
    for index, line in enumerate(lines):
        if index > 0:
            chunks.append("T*")
        chunks.append(f"({escape_pdf_text(line)}) Tj")
    chunks.append("ET")
    return "\n".join(chunks).encode("latin-1", errors="replace")


def paginate_lines(lines: list[str], start_y: int = 760, leading: int = 22, bottom_margin: int = 50) -> list[list[str]]:
    usable_height = start_y - bottom_margin
    lines_per_page = max(1, usable_height // leading)
    return [lines[index:index + lines_per_page] for index in range(0, len(lines), lines_per_page)] or [[]]


def build_pdf(lines: list[str]) -> bytes:
    pages = paginate_lines(lines)
    objects: list[bytes] = []

    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")

    page_object_numbers = []
    content_object_numbers = []
    first_page_object_number = 4
    first_content_object_number = first_page_object_number + len(pages)

    for page_index in range(len(pages)):
        page_object_numbers.append(first_page_object_number + page_index)
        content_object_numbers.append(first_content_object_number + page_index)

    kids = " ".join(f"{number} 0 R" for number in page_object_numbers)
    objects.append(f"<< /Type /Pages /Count {len(pages)} /Kids [{kids}] >>".encode("ascii"))
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    for page_object_number, content_object_number in zip(page_object_numbers, content_object_numbers):
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_object_number} 0 R >>".encode("ascii")
        )

    for page_lines in pages:
        content_stream = build_content(page_lines)
        objects.append(
            f"<< /Length {len(content_stream)} >>\nstream\n".encode("ascii")
            + content_stream
            + b"\nendstream"
        )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    trailer = (
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    )
    pdf.extend(trailer.encode("ascii"))
    return bytes(pdf)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a simple PDF test report.")
    parser.add_argument("--output", required=True, help="Output PDF path")
    parser.add_argument("--project", required=True, help="Project name")
    parser.add_argument("--branch", required=True, help="Git branch")
    parser.add_argument("--datetime", required=True, help="Execution timestamp")
    parser.add_argument("--command", required=True, help="Executed command")
    parser.add_argument("--summary", required=True, help="Summary line")
    parser.add_argument("--details", nargs="*", default=[], help="Additional report lines")
    args = parser.parse_args()

    lines = [
        "Unit Test Execution Report",
        "",
        f"Project: {args.project}",
        f"Branch: {args.branch}",
        f"Executed: {args.datetime}",
        f"Command: {args.command}",
        "",
        f"Result: {args.summary}",
    ]
    if args.details:
        lines.append("")
        lines.extend(args.details)

    wrapped_lines: list[str] = []
    for line in lines:
        if not line:
            wrapped_lines.append("")
            continue
        wrapped_lines.extend(textwrap.wrap(line, width=88) or [""])

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(build_pdf(wrapped_lines))


if __name__ == "__main__":
    main()
