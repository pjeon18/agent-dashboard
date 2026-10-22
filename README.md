# Job radar, as a learner driver

A dashboard that explains one AI agent, the job radar (a private agent that reads company job boards and scores new-grad roles), in four stages anyone can follow:

1. **The car:** what it's made of. Job boards, free code checks, Claude, your profile, and you.
2. **Practice:** how it got better. Every rule change and what it fixed.
3. **The test:** is it any good? Four checks, with the evidence.
4. **On the road:** a real trip, from 9,088 postings to 12 strong matches.

Every number comes from the radar's own database, digests and changelog.

```bash
npm install
npm run dev      # http://localhost:5450, ?s=car|practice|test|road
npm run build
npm run export   # rebuild public/radar.json from ../agents (needs that repo and its .venv)
```
