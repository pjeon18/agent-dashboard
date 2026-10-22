"""Build public/claude-code.json and public/capability.json.

claude-code.json  one real Claude Code run, read from its saved session
                  transcript: the "deploy it publicly" turn that shipped this
                  dashboard. Only step names, tools and timings are kept; no
                  messages, file contents or command output.
capability.json   the capability pipeline, read from the Agent Workbench's
                  export (../agent-workbench/public/workbench.json).

    python3 scripts/export_agents.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT.parent
MEMORY = Path.home() / ".claude/projects/-Users-pauljeon-Downloads-assets/memory"
TRANSCRIPT = Path.home() / ".claude/projects/-Users-pauljeon-Downloads-assets/48533f97-0e45-4614-afd7-925f9b9a9234.jsonl"
REQUEST = "Deploy it publicly as is."
NEXT_REQUEST = "Make the dashboard rebuild automatically"

# Each tool call in the run, in order: (kind, plain label). Kinds drive the route map.
STEPS = [
    ("plan", "Lays out a 4-step plan"),
    ("look", "Checks the data for secrets; finds no GitHub CLI"),
    ("act", "Adds the deploy workflow and README, builds"),
    ("act", "Commits the dashboard"),
    ("look", "Checks which name and email your other repos use"),
    ("publish", "Creates the public GitHub repo"),
    ("publish", "Pushes, turns on Pages, starts the deploy"),
    ("plan", "Updates the plan"),
    ("wait", "Waits for the deploy"),
    ("problem", "Deploy failed, site returns 404"),
    ("look", "Finds the failing step: the build"),
    ("look", "Reads the build log: a missing Linux package"),
    ("fix", "Regenerates the lockfile, rebuilds, pushes the fix"),
    ("wait", "Waits for the second deploy"),
    ("verify", "Deploy passed, site returns 200"),
    ("verify", "Opens the live site"),
    ("verify", "Checks the headline, lanes and logos load"),
    ("verify", "Checks the console for errors"),
    ("note", "Saves the deploy details to memory"),
    ("note", "Adds the live link to CLAUDE.md"),
    ("note", "Writes the summary for you"),
]


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(x.get("text", "") for x in content if isinstance(x, dict) and x.get("type") == "text")
    return ""


def claude_code() -> dict:
    rows = [json.loads(l) for l in TRANSCRIPT.read_text().splitlines() if l.strip()]
    start = next(i for i, r in enumerate(rows) if r.get("type") == "user" and text_of((r.get("message") or {}).get("content")).startswith(REQUEST))
    end = next(i for i in range(start + 1, len(rows)) if rows[i].get("type") == "user"
               and NEXT_REQUEST in text_of((rows[i].get("message") or {}).get("content")))
    calls, model, out_tokens = [], None, 0
    for r in rows[start:end]:
        if r.get("type") != "assistant":
            continue
        msg = r["message"]
        model = model or msg.get("model")
        out_tokens += (msg.get("usage") or {}).get("output_tokens", 0)
        for c in msg.get("content") or []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                calls.append({"tool": c["name"], "at": r["timestamp"]})
    assert len(calls) == len(STEPS), f"expected {len(STEPS)} tool calls, found {len(calls)}"
    steps = [{"n": i + 1, "kind": k, "label": label, "tool": tool_name(c["tool"]), "at": c["at"]}
             for i, ((k, label), c) in enumerate(zip(STEPS, calls))]

    tools = sorted({s["tool"] for s in steps})
    lessons = feedback_memories()
    return {
        "request": text_of(rows[start]["message"]["content"]).strip(),
        "model": model,
        "permissionMode": rows[start].get("permissionMode"),
        "start": rows[start]["timestamp"], "end": rows[end - 1]["timestamp"],
        "outputTokens": out_tokens,
        "steps": steps, "tools": tools,
        "memoryFiles": len(list(MEMORY.glob("*.md"))) - 1,
        "lessons": lessons,
    }


def tool_name(raw: str) -> str:
    if raw.startswith("mcp__Claude_Browser__"):
        return "Browser"
    if raw.startswith("mcp__ccd_turn__"):
        return "Task list"
    return {"Bash": "Shell", "Edit": "Edit file", "Write": "Write file", "Read": "Read file"}.get(raw, raw)


def feedback_memories() -> list[dict]:
    """Your standing corrections to Claude Code: the feedback-type memory files."""
    out = []
    for line in (MEMORY / "MEMORY.md").read_text().splitlines():
        m = re.match(r"- \[(.+?)\]\((.+?\.md)\) — (.+)", line)
        if not m:
            continue
        title, name, hook = m.groups()
        path = MEMORY / name
        if not path.exists():
            continue
        head = path.read_text().split("---")[1] if path.read_text().startswith("---") else ""
        if not re.search(r"type:\s*feedback", head):
            continue
        out.append({"title": title, "hook": hook})
    return out


def capability() -> dict:
    wb = json.loads((ASSETS / "agent-workbench/public/workbench.json").read_text())
    head = wb["commits"][-1]
    gates_at = [c for c in wb["commits"] if c.get("gates")]
    baselines = next(c["baselines"] for c in reversed(wb["commits"]) if c.get("baselines"))
    gates = {g: [c["gates"][g]["value"] for c in gates_at] for g in ("C1", "C2", "C3")}

    # The non-AI driver: Bayesian optimization's worst trap-family campaign
    worst = max((r for r in wb["records"] if r[0] == "gp_ei" and "deceptive" in r[1]), key=lambda r: r[4])
    key = f"{worst[0]}|{worst[1]}|{worst[2]}"
    task = next(t for t in wb["tasks"] if t["id"] == worst[1])
    ceilings = {s["name"]: s["ceiling"] for s in wb["solvents"]}
    trace = [{"n": r[0], "solvent": r[1], "temp": r[2], "ceiling": ceilings.get(r[1]), "ok": r[5] == "ok",
              "yield": r[6], "best": r[7]} for r in wb["traces"][key]]
    return {
        "name": wb["agent"]["name"], "title": wb["agent"]["title"],
        "budget": task["budget"], "batch": task["batch"], "fStar": task["fStar"], "family": task["family"],
        "solvents": wb["solvents"],
        "baselines": {m: baselines[m] for m in ("random", "lhs", "gp_ei", "gp_ei_oracle")},
        "methods": {m["id"]: m["label"] for m in wb["methods"]},
        "gates": gates,
        "replay": wb["replay"],
        "run": {"regret": worst[3], "wasted": worst[4], "trace": trace},
        "commits": len(wb["commits"]), "headDate": head["date"],
    }


def main() -> None:
    cc = claude_code()
    (ROOT / "public/claude-code.json").write_text(json.dumps(cc, separators=(",", ":"), ensure_ascii=False))
    cap = capability()
    (ROOT / "public/capability.json").write_text(json.dumps(cap, separators=(",", ":"), ensure_ascii=False))
    print(f"claude-code: {len(cc['steps'])} steps, {len(cc['lessons'])} lessons, model {cc['model']}, "
          f"{cc['outputTokens']} output tokens; capability: run wasted {cap['run']['wasted']}")


if __name__ == "__main__":
    main()
