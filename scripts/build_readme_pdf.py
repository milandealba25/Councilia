"""
Genera COUNCILia_README.pdf a partir del README.md con un estilo
editorial inspirado en COUNCILia_MVP.pdf.

Uso:
    python3 scripts/build_readme_pdf.py
"""

from __future__ import annotations

import os
import re
from typing import List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


# --------------------------------------------------------------------------- #
# Paleta y configuración base
# --------------------------------------------------------------------------- #

INK = HexColor("#1B1B1F")
INK_SOFT = HexColor("#2E2E33")
MUTED = HexColor("#6B6B73")
ACCENT = HexColor("#1E3A8A")        # azul profundo (Council)
ACCENT_SOFT = HexColor("#E5EBF7")
RULE = HexColor("#D4D4D8")
CODE_BG = HexColor("#F4F4F5")
TABLE_HEAD_BG = HexColor("#1B1B1F")
TABLE_ROW_ALT = HexColor("#FAFAFA")
QUOTE_BAR = HexColor("#1E3A8A")
QUOTE_BG = HexColor("#F8FAFF")

PAGE_W, PAGE_H = LETTER
MARGIN_X = 0.85 * inch
MARGIN_TOP = 0.95 * inch
MARGIN_BOTTOM = 0.95 * inch

DOC_TITLE = "COUNCILia"
DOC_SUBTITLE = "Documento de Producto"
DOC_FOOTER_LEFT = "COUNCILia · Documento de Producto"


# --------------------------------------------------------------------------- #
# Estilos
# --------------------------------------------------------------------------- #

def build_styles() -> dict:
    base = getSampleStyleSheet()

    styles = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=54,
            leading=60,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=16,
            leading=22,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "cover_tag": ParagraphStyle(
            "cover_tag",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=12,
            leading=18,
            textColor=ACCENT,
            alignment=TA_CENTER,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=INK,
            spaceBefore=18,
            spaceAfter=10,
            keepWithNext=1,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=ACCENT,
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=1,
        ),
        "h3": ParagraphStyle(
            "h3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=INK_SOFT,
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=1,
        ),
        "h4": ParagraphStyle(
            "h4",
            parent=base["Heading4"],
            fontName="Helvetica-BoldOblique",
            fontSize=11,
            leading=15,
            textColor=INK_SOFT,
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=1,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15.5,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=INK,
            leftIndent=18,
            bulletIndent=6,
            spaceAfter=2,
        ),
        "ordered": ParagraphStyle(
            "ordered",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=INK,
            leftIndent=22,
            bulletIndent=6,
            spaceAfter=2,
        ),
        "quote": ParagraphStyle(
            "quote",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=11,
            leading=16,
            textColor=INK_SOFT,
            leftIndent=10,
            rightIndent=6,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "code": ParagraphStyle(
            "code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=8.6,
            leading=11.5,
            textColor=INK,
            leftIndent=0,
            rightIndent=0,
            spaceBefore=2,
            spaceAfter=2,
        ),
        "table_head": ParagraphStyle(
            "table_head",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12.5,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "toc_item": ParagraphStyle(
            "toc_item",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=18,
            textColor=INK,
            leftIndent=0,
        ),
        "callout": ParagraphStyle(
            "callout",
            parent=base["BodyText"],
            fontName="Helvetica-BoldOblique",
            fontSize=12,
            leading=18,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceBefore=8,
            spaceAfter=8,
        ),
    }
    return styles


# --------------------------------------------------------------------------- #
# Inline markdown -> mini-HTML
# --------------------------------------------------------------------------- #

_INLINE_CODE_RE = re.compile(r"`([^`]+)`")
_BOLD_RE = re.compile(r"\*\*([^\*]+)\*\*")
_ITALIC_RE = re.compile(r"(?<!\*)\*([^\*\n]+)\*(?!\*)")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def md_inline_to_html(text: str, on_dark: bool = False) -> str:
    """Convierte markdown inline a los tags soportados por reportlab."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    code_color = "#FFFFFF" if on_dark else "#1E3A8A"
    link_color = "#9DB6E8" if on_dark else "#1E3A8A"
    text = _LINK_RE.sub(
        lambda m: f'<font color="{link_color}"><u>{m.group(1)}</u></font>', text
    )
    text = _INLINE_CODE_RE.sub(
        lambda m: f'<font face="Courier" size="9.5" color="{code_color}">{m.group(1)}</font>',
        text,
    )
    text = _BOLD_RE.sub(r"<b>\1</b>", text)
    text = _ITALIC_RE.sub(r"<i>\1</i>", text)
    return text


# --------------------------------------------------------------------------- #
# Parser ad-hoc del README
# --------------------------------------------------------------------------- #

class Block:
    """Bloque crudo del documento."""

    def __init__(self, kind: str, lines: List[str], extra: Optional[dict] = None):
        self.kind = kind
        self.lines = lines
        self.extra = extra or {}


def parse_markdown(md_text: str) -> List[Block]:
    raw_lines = md_text.splitlines()
    blocks: List[Block] = []
    i = 0
    n = len(raw_lines)

    while i < n:
        line = raw_lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped.startswith("```"):
            i += 1
            buf: List[str] = []
            while i < n and not raw_lines[i].strip().startswith("```"):
                buf.append(raw_lines[i])
                i += 1
            if i < n:
                i += 1
            blocks.append(Block("code", buf))
            continue

        if stripped.startswith("---") and set(stripped) == {"-"}:
            blocks.append(Block("hr", []))
            i += 1
            continue

        h_match = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if h_match:
            level = len(h_match.group(1))
            blocks.append(Block(f"h{level}", [h_match.group(2).strip()]))
            i += 1
            continue

        if stripped.startswith(">"):
            buf = []
            while i < n and raw_lines[i].lstrip().startswith(">"):
                buf.append(raw_lines[i].lstrip()[1:].strip())
                i += 1
            blocks.append(Block("quote", buf))
            continue

        if stripped.startswith("|") and i + 1 < n and re.match(
            r"^\|?\s*:?-+", raw_lines[i + 1].strip()
        ):
            buf = [raw_lines[i]]
            i += 1
            while i < n and raw_lines[i].lstrip().startswith("|"):
                buf.append(raw_lines[i])
                i += 1
            blocks.append(Block("table", buf))
            continue

        ul_match = re.match(r"^\s*[-*]\s+", line)
        ol_match = re.match(r"^\s*(\d+)\.\s+", line)
        if ul_match or ol_match:
            kind = "ul" if ul_match else "ol"
            buf = []
            while i < n:
                cur = raw_lines[i]
                if not cur.strip():
                    break
                if (kind == "ul" and re.match(r"^\s*[-*]\s+", cur)) or (
                    kind == "ol" and re.match(r"^\s*\d+\.\s+", cur)
                ):
                    buf.append(cur)
                elif cur.startswith("   ") or cur.startswith("\t"):
                    if buf:
                        buf[-1] += " " + cur.strip()
                    else:
                        break
                else:
                    break
                i += 1
            blocks.append(Block(kind, buf))
            continue

        buf = [line]
        i += 1
        while i < n:
            nxt = raw_lines[i]
            if (
                not nxt.strip()
                or re.match(r"^#{1,6}\s+", nxt.strip())
                or nxt.lstrip().startswith(">")
                or nxt.lstrip().startswith("```")
                or re.match(r"^\s*[-*]\s+", nxt)
                or re.match(r"^\s*\d+\.\s+", nxt)
                or nxt.lstrip().startswith("|")
                or (nxt.strip().startswith("---") and set(nxt.strip()) == {"-"})
            ):
                break
            buf.append(nxt)
            i += 1
        blocks.append(Block("p", buf))

    return blocks


# --------------------------------------------------------------------------- #
# Construcción de Flowables
# --------------------------------------------------------------------------- #

def parse_table_rows(lines: List[str]) -> List[List[str]]:
    rows: List[List[str]] = []
    for ln in lines:
        ln = ln.strip()
        if not ln.startswith("|"):
            continue
        if re.match(r"^\|?\s*:?-+", ln):
            continue
        parts = [p.strip() for p in ln.strip().strip("|").split("|")]
        rows.append(parts)
    return rows


def build_table(rows: List[List[str]], styles: dict, available_w: float) -> Table:
    if not rows:
        return Table([[""]])

    header = rows[0]
    body = rows[1:]
    ncols = len(header)

    head_cells = [
        Paragraph(md_inline_to_html(c, on_dark=True), styles["table_head"]) for c in header
    ]
    data = [head_cells]
    for r in body:
        r = (r + [""] * ncols)[:ncols]
        data.append([Paragraph(md_inline_to_html(c), styles["table_cell"]) for c in r])

    col_w = available_w / ncols
    col_widths = [col_w] * ncols
    if ncols >= 3:
        first = available_w * 0.22
        rest = (available_w - first) / (ncols - 1)
        col_widths = [first] + [rest] * (ncols - 1)

    tbl = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEAD_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9.5),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 1), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, INK),
            ("INNERGRID", (0, 1), (-1, -1), 0.25, RULE),
            ("BOX", (0, 0), (-1, -1), 0.5, INK),
        ]
    )
    for idx in range(1, len(data)):
        if idx % 2 == 0:
            style.add("BACKGROUND", (0, idx), (-1, idx), TABLE_ROW_ALT)
    tbl.setStyle(style)
    return tbl


def build_quote(lines: List[str], styles: dict, available_w: float) -> Table:
    text = " ".join(l for l in lines if l).strip()
    p = Paragraph(md_inline_to_html(text), styles["quote"])
    tbl = Table([[p]], colWidths=[available_w])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), QUOTE_BG),
                ("LINEBEFORE", (0, 0), (0, -1), 3, QUOTE_BAR),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return tbl


def _looks_like_box_diagram(lines: List[str]) -> bool:
    joined = "\n".join(lines)
    box_chars = "┌┐└┘├┤┬┴┼─│"
    return sum(joined.count(ch) for ch in box_chars) >= 8


class FlowDiagram(Flowable):
    """Diagrama del flujo COUNCILia dibujado nativamente."""

    def __init__(self, width: float):
        super().__init__()
        self.width = width
        self.height = 0
        self._layout()

    def _layout(self):
        self.box_h = 36
        self.gap = 14
        self.arrow_h = 14
        self.parallel_h = 56

        self.steps = [
            ("0. ENCUESTA DE ENTRADA",
             "4–6 preguntas → genera userContext", "single"),
            ("1. PRESENTACIÓN DEL COUNCIL",
             "Avatares + 1 línea de presentación cada uno", "single"),
            ("2. USUARIO ESCRIBE SU SITUACIÓN", "", "single"),
            ("3. ORQUESTADOR (invisible · ~1s)",
             "Clasifica intención · Elige council · Decide orden", "single"),
            ("4. POSTURAS INICIALES (en PARALELO)",
             ["RAFAEL", "SOFÍA", "ELENA"], "parallel"),
            ("5. PUNTO DE DECISIÓN DEL USUARIO",
             ["Quiero responder", "Que deliberen", "Dame la síntesis"], "choice"),
            ("6. DELIBERACIÓN SELECTIVA",
             "Tension Detector → \"X responde a Y\" · máx. 2 réplicas", "single"),
            ("7. SÍNTESIS CON TRADEOFFS",
             "No decide. Nombra la tensión.", "single"),
        ]

        h = 0
        for _, _, kind in self.steps:
            if kind in ("parallel", "choice"):
                h += self.parallel_h
            else:
                h += self.box_h
            h += self.arrow_h
        h += 30
        self.height = h

    def wrap(self, *args):
        return (self.width, self.height)

    def _draw_arrow(self, c, x, y_top):
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.4)
        c.line(x, y_top, x, y_top - self.arrow_h + 4)
        c.setFillColor(ACCENT)
        p = c.beginPath()
        p.moveTo(x, y_top - self.arrow_h + 1)
        p.lineTo(x - 4, y_top - self.arrow_h + 7)
        p.lineTo(x + 4, y_top - self.arrow_h + 7)
        p.close()
        c.drawPath(p, stroke=0, fill=1)

    def _draw_box(self, c, x, y, w, h, title, subtitle="",
                  fill=ACCENT_SOFT, border=ACCENT, title_color=ACCENT):
        c.setFillColor(fill)
        c.setStrokeColor(border)
        c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
        c.setFillColor(title_color)
        c.setFont("Helvetica-Bold", 10)
        if subtitle:
            c.drawCentredString(x + w / 2, y + h - 14, title)
            c.setFillColor(INK_SOFT)
            c.setFont("Helvetica", 8.5)
            c.drawCentredString(x + w / 2, y + h - 27, subtitle)
        else:
            c.drawCentredString(x + w / 2, y + h / 2 - 4, title)

    def draw(self):
        c = self.canv
        cx = self.width / 2
        y = self.height - 6

        for title, payload, kind in self.steps:
            if kind == "single":
                w = self.width * 0.78
                x = cx - w / 2
                top = y
                self._draw_box(
                    c,
                    x,
                    top - self.box_h,
                    w,
                    self.box_h,
                    title,
                    payload if isinstance(payload, str) else "",
                )
                y = top - self.box_h
                self._draw_arrow(c, cx, y)
                y -= self.arrow_h
            elif kind in ("parallel", "choice"):
                w = self.width * 0.92
                x = cx - w / 2
                top = y
                outer_h = self.parallel_h
                c.setFillColor(HexColor("#FFFFFF"))
                c.setStrokeColor(ACCENT)
                c.setLineWidth(0.8)
                c.roundRect(x, top - outer_h, w, outer_h, 6, fill=1, stroke=1)
                c.setFillColor(ACCENT)
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(cx, top - 14, title)

                items = payload if isinstance(payload, list) else []
                inner_w = (w - 32) / max(len(items), 1) - 10
                start_x = x + 16
                inner_y = top - outer_h + 10
                inner_h = outer_h - 28
                for i, label in enumerate(items):
                    bx = start_x + i * (inner_w + 10)
                    c.setFillColor(ACCENT)
                    c.setStrokeColor(ACCENT)
                    c.roundRect(bx, inner_y, inner_w, inner_h, 4, fill=1, stroke=1)
                    c.setFillColor(colors.white)
                    c.setFont("Helvetica-Bold", 9.5)
                    c.drawCentredString(bx + inner_w / 2, inner_y + inner_h / 2 - 3, label)

                y = top - outer_h
                self._draw_arrow(c, cx, y)
                y -= self.arrow_h

        c.setFillColor(QUOTE_BG)
        c.setStrokeColor(ACCENT)
        c.setLineWidth(0.5)
        note_h = 22
        nx = cx - self.width * 0.45
        c.roundRect(nx, y - note_h + 6, self.width * 0.9, note_h, 4, fill=1, stroke=1)
        c.setFillColor(ACCENT)
        c.setFont("Helvetica-BoldOblique", 9.5)
        c.drawCentredString(
            cx,
            y - note_h + 14,
            "Interrupción del usuario posible en cualquier fase 4–6",
        )


_ASCII_FALLBACK = {
    "←": "<-", "→": "->", "↓": "v", "↑": "^",
    "•": "*", "—": "--", "…": "...",
}


def _to_courier_safe(text: str) -> str:
    for src, dst in _ASCII_FALLBACK.items():
        text = text.replace(src, dst)
    return text


def build_code(lines: List[str], styles: dict, available_w: float):
    if _looks_like_box_diagram(lines):
        return FlowDiagram(available_w)
    text = _to_courier_safe("\n".join(lines).rstrip())
    pre = Preformatted(text, styles["code"])
    tbl = Table([[pre]], colWidths=[available_w])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.4, RULE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return tbl


def list_items(lines: List[str], ordered: bool) -> List[Tuple[str, str]]:
    items: List[Tuple[str, str]] = []
    for ln in lines:
        if ordered:
            m = re.match(r"^\s*(\d+)\.\s+(.*)$", ln)
            if m:
                items.append((m.group(1) + ".", m.group(2)))
            elif items:
                prev = items[-1]
                items[-1] = (prev[0], prev[1] + " " + ln.strip())
        else:
            m = re.match(r"^\s*[-*]\s+(.*)$", ln)
            if m:
                items.append(("•", m.group(1)))
            elif items:
                prev = items[-1]
                items[-1] = (prev[0], prev[1] + " " + ln.strip())
    return items


def blocks_to_flowables(blocks: List[Block], styles: dict, available_w: float):
    story = []
    for b in blocks:
        if b.kind in {"h1", "h2", "h3", "h4"}:
            text = md_inline_to_html(b.lines[0])
            story.append(Paragraph(text, styles[b.kind]))
            if b.kind == "h1":
                hr = Table(
                    [[""]], colWidths=[available_w], rowHeights=[1.2]
                )
                hr.setStyle(
                    TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)])
                )
                story.append(hr)
                story.append(Spacer(1, 6))
        elif b.kind == "p":
            text = md_inline_to_html(" ".join(l.strip() for l in b.lines).strip())
            story.append(Paragraph(text, styles["body"]))
        elif b.kind == "quote":
            story.append(build_quote(b.lines, styles, available_w))
            story.append(Spacer(1, 4))
        elif b.kind == "code":
            story.append(build_code(b.lines, styles, available_w))
            story.append(Spacer(1, 4))
        elif b.kind == "ul":
            for marker, txt in list_items(b.lines, ordered=False):
                p = Paragraph(md_inline_to_html(txt), styles["bullet"], bulletText="•")
                story.append(p)
            story.append(Spacer(1, 4))
        elif b.kind == "ol":
            for marker, txt in list_items(b.lines, ordered=True):
                p = Paragraph(md_inline_to_html(txt), styles["ordered"], bulletText=marker)
                story.append(p)
            story.append(Spacer(1, 4))
        elif b.kind == "table":
            rows = parse_table_rows(b.lines)
            story.append(build_table(rows, styles, available_w))
            story.append(Spacer(1, 8))
        elif b.kind == "hr":
            hr = Table([[""]], colWidths=[available_w], rowHeights=[0.5])
            hr.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), RULE)]))
            story.append(Spacer(1, 4))
            story.append(hr)
            story.append(Spacer(1, 6))
    return story


# --------------------------------------------------------------------------- #
# Plantillas de página (cover + cuerpo) y header/footer
# --------------------------------------------------------------------------- #

def draw_cover(canv: canvas.Canvas, doc):
    canv.saveState()

    canv.setFillColor(HexColor("#FFFFFF"))
    canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canv.setFillColor(ACCENT)
    canv.rect(0, PAGE_H - 0.55 * inch, PAGE_W, 0.55 * inch, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawString(MARGIN_X, PAGE_H - 0.35 * inch, "C O U N C I L I A")
    canv.setFont("Helvetica", 9)
    canv.drawRightString(
        PAGE_W - MARGIN_X, PAGE_H - 0.35 * inch, "Documento de Producto · v1.1"
    )

    canv.setFillColor(INK)
    canv.setFont("Helvetica-Bold", 64)
    canv.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 1.3 * inch, "COUNCILia")

    canv.setStrokeColor(ACCENT)
    canv.setLineWidth(1.2)
    bar_w = 1.6 * inch
    y = PAGE_H / 2 + 0.95 * inch
    canv.line(PAGE_W / 2 - bar_w / 2, y, PAGE_W / 2 + bar_w / 2, y)

    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 14)
    canv.drawCentredString(
        PAGE_W / 2, PAGE_H / 2 + 0.45 * inch, "Plataforma Conversacional Multiagente"
    )

    canv.setFillColor(ACCENT)
    canv.setFont("Helvetica-Oblique", 12)
    canv.drawCentredString(
        PAGE_W / 2,
        PAGE_H / 2 + 0.10 * inch,
        "Una mesa redonda de IA donde se delibera, no se valida.",
    )

    canv.setFillColor(INK_SOFT)
    canv.setFont("Helvetica-Bold", 10)
    items = [
        "Visión",
        "Onboarding diagnóstico",
        "Generación dinámica de agentes",
        "Flujo conversacional",
        "Síntesis con tradeoffs",
        "Principios irrenunciables",
    ]
    yy = PAGE_H / 2 - 0.45 * inch
    for it in items:
        canv.setFillColor(ACCENT)
        canv.circle(PAGE_W / 2 - 1.85 * inch, yy + 3, 2, stroke=0, fill=1)
        canv.setFillColor(INK_SOFT)
        canv.drawString(PAGE_W / 2 - 1.7 * inch, yy, it)
        yy -= 0.28 * inch

    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 10)
    canv.drawCentredString(
        PAGE_W / 2, 1.05 * inch, "Documento de producto · README extendido"
    )
    canv.setFont("Helvetica-Bold", 10)
    canv.setFillColor(INK)
    canv.drawCentredString(PAGE_W / 2, 0.85 * inch, "Versión 1.1 · 2026")

    canv.setStrokeColor(ACCENT)
    canv.setLineWidth(0.8)
    canv.line(MARGIN_X, 0.65 * inch, PAGE_W - MARGIN_X, 0.65 * inch)

    canv.restoreState()


def draw_body_chrome(canv: canvas.Canvas, doc):
    canv.saveState()
    canv.setFont("Helvetica", 9)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN_X, PAGE_H - 0.55 * inch, DOC_FOOTER_LEFT)

    title_right = "COUNCILia · README"
    canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 0.55 * inch, title_right)

    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.4)
    canv.line(
        MARGIN_X,
        PAGE_H - 0.65 * inch,
        PAGE_W - MARGIN_X,
        PAGE_H - 0.65 * inch,
    )

    canv.setFont("Helvetica", 9)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN_X, 0.55 * inch, "COUNCILia · 2026")
    canv.drawRightString(
        PAGE_W - MARGIN_X, 0.55 * inch, f"Página {doc.page - 1}"
    )

    canv.setStrokeColor(RULE)
    canv.line(MARGIN_X, 0.7 * inch, PAGE_W - MARGIN_X, 0.7 * inch)

    canv.restoreState()


# --------------------------------------------------------------------------- #
# TOC manual basado en headings detectados
# --------------------------------------------------------------------------- #

def build_toc(blocks: List[Block], styles: dict, available_w: float):
    items = []
    for b in blocks:
        if b.kind == "h2":
            txt = b.lines[0]
            if txt.strip().lower().startswith("tabla de contenidos"):
                continue
            items.append(txt)
    if not items:
        return []

    flow = []
    flow.append(Paragraph("Tabla de contenidos", styles["h1"]))
    hr = Table([[""]], colWidths=[available_w], rowHeights=[1.2])
    hr.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
    flow.append(hr)
    flow.append(Spacer(1, 12))

    rows = []
    for it in items:
        m = re.match(r"^(\d+)\.\s*(.*)$", it.strip())
        if m:
            num, title = m.group(1), m.group(2)
        else:
            num, title = "", it
        left = Paragraph(
            f'<font color="#1E3A8A"><b>{num}</b></font>  {md_inline_to_html(title)}',
            styles["toc_item"],
        )
        rows.append([left])

    tbl = Table(rows, colWidths=[available_w])
    tbl.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, RULE),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    flow.append(tbl)
    return flow


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    readme_path = os.path.join(root, "README.md")
    out_path = os.path.join(root, "COUNCILia_README.pdf")

    with open(readme_path, "r", encoding="utf-8") as f:
        md = f.read()

    blocks = parse_markdown(md)

    # Quitamos la TOC manual del README (se reemplaza por la nuestra)
    cleaned: List[Block] = []
    skipping_toc = False
    for b in blocks:
        if b.kind == "h2" and b.lines and b.lines[0].strip().lower().startswith(
            "tabla de contenidos"
        ):
            skipping_toc = True
            continue
        if skipping_toc:
            if b.kind == "ol":
                continue
            if b.kind == "hr":
                skipping_toc = False
                continue
            if b.kind in {"h1", "h2"}:
                skipping_toc = False
            else:
                continue
        cleaned.append(b)

    if cleaned and cleaned[0].kind == "h1":
        cleaned = cleaned[1:]
    while cleaned and cleaned[0].kind == "hr":
        cleaned = cleaned[1:]

    styles = build_styles()

    doc = BaseDocTemplate(
        out_path,
        pagesize=LETTER,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="COUNCILia – Documento de Producto",
        author="COUNCILia",
        subject="Plataforma Conversacional Multiagente",
    )

    available_w = PAGE_W - 2 * MARGIN_X

    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0, id="cover")
    body_frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        available_w,
        PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        id="body",
    )

    doc.addPageTemplates(
        [
            PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover),
            PageTemplate(id="Body", frames=[body_frame], onPage=draw_body_chrome),
        ]
    )

    story = []
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())

    story.extend(build_toc(blocks, styles, available_w))
    story.append(PageBreak())

    story.extend(blocks_to_flowables(cleaned, styles, available_w))

    doc.build(story)
    print(f"Generado: {out_path}")


if __name__ == "__main__":
    main()
