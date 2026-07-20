#!/usr/bin/env python3
"""Convert content/hld/*.jsx artifact files into PrepStack notes data files.

The artifacts (downloaded from claude.ai) all follow the same shape:

    const topics = [ { id, icon, tag, title, summary, concepts: [{name, explanation, example}] } ];
    const qna    = [ { q, a } ];
    const mock   = [ { q, a } ];

This script parses those three arrays with a small recursive-descent parser for
JS object/array literals (handles "..", '..', `..` template literals, numbers,
booleans, nested structures, trailing commas) and emits
public/data/notes/hld/week<N>-cards-<slug>.js files that self-register via
PrepStackRegister.notes(). The registry MERGES per (track, week), so these
files coexist with the hand-written deep-dive week files.

Usage:  python scripts/convert_artifacts.py
Re-run whenever a new artifact lands in content/hld/ (add it to MAPPING below).
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "content", "hld")
OUT_DIR = os.path.join(ROOT, "public", "data", "notes", "hld")

# artifact file -> (week index, output slug)
MAPPING = {
    "W1D1.jsx":  (0, "lb-hashing"),
    "W1D2.jsx":  (1, "redis-caching"),
    "W1D4.jsx":  (2, "sql-cap-sharding"),
    "W1D4b.jsx": (2, "db-types"),
    "W1D3.jsx":  (3, "kafka-mq"),
    "W1D3b.jsx": (3, "mq-compare"),
    "W1D5.jsx":  (4, "gateway-auth"),
    "W1D6.jsx":  (4, "advanced-patterns"),
}


# ---------------- JS literal parser ----------------

class Parser:
    def __init__(self, text):
        self.text = text
        self.i = 0

    def error(self, msg):
        ctx = self.text[max(0, self.i - 40):self.i + 40].replace("\n", "\\n")
        raise ValueError(f"{msg} at index {self.i}: ...{ctx}...")

    def skip_ws(self):
        while self.i < len(self.text):
            c = self.text[self.i]
            if c in " \t\r\n":
                self.i += 1
            elif self.text.startswith("//", self.i):
                nl = self.text.find("\n", self.i)
                self.i = len(self.text) if nl == -1 else nl + 1
            elif self.text.startswith("/*", self.i):
                end = self.text.find("*/", self.i)
                if end == -1:
                    self.error("unterminated block comment")
                self.i = end + 2
            else:
                return

    def parse_value(self):
        self.skip_ws()
        c = self.text[self.i]
        if c == "{":
            return self.parse_object()
        if c == "[":
            return self.parse_array()
        if c in "\"'`":
            return self.parse_string(c)
        if c.isdigit() or c == "-":
            return self.parse_number()
        # bare identifiers: true/false/null/undefined
        m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.text[self.i:])
        if m:
            word = m.group(0)
            self.i += len(word)
            return {"true": True, "false": False, "null": None, "undefined": None}.get(word, word)
        self.error("unexpected character")

    def parse_string(self, quote):
        assert self.text[self.i] == quote
        self.i += 1
        out = []
        while self.i < len(self.text):
            c = self.text[self.i]
            if c == "\\":
                nxt = self.text[self.i + 1]
                mapping = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "'": "'", '"': '"', "`": "`", "$": "$", "0": "\0"}
                out.append(mapping.get(nxt, nxt))
                self.i += 2
            elif c == quote:
                self.i += 1
                return "".join(out)
            elif quote != "`" and c == "\n":
                self.error("newline in non-template string")
            else:
                out.append(c)
                self.i += 1
        self.error("unterminated string")

    def parse_number(self):
        m = re.match(r"-?\d+(\.\d+)?([eE][+-]?\d+)?", self.text[self.i:])
        if not m:
            self.error("bad number")
        self.i += len(m.group(0))
        s = m.group(0)
        return float(s) if ("." in s or "e" in s or "E" in s) else int(s)

    def parse_array(self):
        assert self.text[self.i] == "["
        self.i += 1
        items = []
        while True:
            self.skip_ws()
            if self.text[self.i] == "]":
                self.i += 1
                return items
            items.append(self.parse_value())
            self.skip_ws()
            if self.text[self.i] == ",":
                self.i += 1
            elif self.text[self.i] == "]":
                self.i += 1
                return items
            else:
                self.error("expected , or ] in array")

    def parse_object(self):
        assert self.text[self.i] == "{"
        self.i += 1
        obj = {}
        while True:
            self.skip_ws()
            if self.text[self.i] == "}":
                self.i += 1
                return obj
            # key: bare identifier or quoted string
            c = self.text[self.i]
            if c in "\"'":
                key = self.parse_string(c)
            else:
                m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.text[self.i:])
                if not m:
                    self.error("bad object key")
                key = m.group(0)
                self.i += len(key)
            self.skip_ws()
            if self.text[self.i] != ":":
                self.error("expected : after key")
            self.i += 1
            obj[key] = self.parse_value()
            self.skip_ws()
            if self.text[self.i] == ",":
                self.i += 1
            elif self.text[self.i] == "}":
                self.i += 1
                return obj
            else:
                self.error("expected , or } in object")


def extract_array(source, const_name):
    """Find `const <name> = [` and parse the array literal that follows."""
    m = re.search(r"const\s+" + re.escape(const_name) + r"\s*=\s*\[", source)
    if not m:
        return None
    p = Parser(source)
    p.i = m.end() - 1  # position of '['
    return p.parse_array()


# ---------------- generators ----------------

def js_escape(text):
    return text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def topics_to_markdown(topics, source_label):
    parts = [f"# Recall Cards — {source_label}"]
    for t in topics:
        icon = t.get("icon", "")
        parts.append(f"## {icon} {t.get('title', 'Untitled')}".strip())
        if t.get("summary"):
            parts.append(f"**TL;DR:** {t['summary']}")
        for c in t.get("concepts", []):
            parts.append(f"### {c.get('name', '')}")
            if c.get("explanation"):
                parts.append(c["explanation"])
            if c.get("example"):
                parts.append("```\n" + c["example"].strip("\n") + "\n```")
    return "\n\n".join(parts)


def emit_week_file(week_idx, slug, concepts_md, qna, mock):
    def qa_entries(pairs):
        rows = []
        for item in pairs:
            q = js_escape(item.get("q", ""))
            a = js_escape(item.get("a", ""))
            rows.append("      { q: `" + q + "`, a: `" + a + "` }")
        return "[\n" + ",\n".join(rows) + "\n    ]" if rows else "[]"

    content = (
        "// GENERATED by scripts/convert_artifacts.py from content/hld/ — do not edit by hand.\n"
        "(function () {\n"
        '  window.PrepStackRegister.notes("hld", ' + str(week_idx) + ", {\n"
        "    concepts: `" + js_escape(concepts_md) + "`,\n"
        "    qa: " + qa_entries(qna) + ",\n"
        "    mock: { easy: [], medium: " + qa_entries(mock) + ", hard: [] }\n"
        "  });\n"
        "})();\n"
    )
    out_path = os.path.join(OUT_DIR, f"week{week_idx}-cards-{slug}.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    return out_path


def main():
    written = []
    for fname, (week_idx, slug) in MAPPING.items():
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"skip (missing): {fname}", file=sys.stderr)
            continue
        with open(path, "r", encoding="utf-8") as f:
            source = f.read()
        topics = extract_array(source, "topics") or []
        qna = extract_array(source, "qna") or []
        mock = extract_array(source, "mock") or []
        if not topics:
            print(f"skip (no topics array): {fname}", file=sys.stderr)
            continue
        label = fname.replace(".jsx", "")
        md = topics_to_markdown(topics, label)
        out = emit_week_file(week_idx, slug, md, qna, mock)
        written.append(out)
        print(f"{fname} -> {os.path.relpath(out, ROOT)}  "
              f"({len(topics)} topics, {len(qna)} qa, {len(mock)} mock)")

    print("\nAdd these <script> tags to public/index.html (after the week files):")
    for out in written:
        rel = os.path.relpath(out, os.path.join(ROOT, "public")).replace(os.sep, "/")
        print(f'  <script src="{rel}"></script>')


if __name__ == "__main__":
    main()
