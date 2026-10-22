# Agent visualizer

Any AI agent, explained as a learner driver in four stages:

1. **The car:** what it's made of. Who picks the route, its map (tools), rules of the road, engine (model), memory, destination, and the human instructor.
2. **Practice:** how it got better.
3. **The test:** is it any good? Unknown or untested parts are shown hatched rather than hidden.
4. **On the road:** a real run. A funnel for agents that follow a fixed route, a route map for agents that pick their own steps.

Three real agents so far:

| Agent | Route | Data |
|---|---|---|
| Job radar | Fixed: fetch, filter, score, hand off | its own database, digests and changelog |
| Claude Code | Picks each next step | one saved session: the run that deployed this site (step names only) and saved corrections |
| Capability pipeline | Picks each round's experiments | its baselines, pass lines and a real non-AI run; no AI has driven it yet |

```bash
npm install
npm run dev      # http://localhost:5450, ?a=radar|claude-code|capability&s=car|practice|test|road
npm run build
npm run export                     # public/radar.json from ../agents
python3 scripts/export_agents.py   # public/claude-code.json and public/capability.json
```

Adding an agent: write an adapter in `src/agents/` that returns the `Agent` shape in `src/lib/agent.ts`.
