# endurance-coach

An evidence-based endurance coach for triathlon, running and cycling, packaged as a Claude Code plugin. It covers training structure, load, fueling, strength and recovery, and it can ground its advice in your real Strava, Garmin and Oura data.

For adults only. Educational information, not medical advice (see the disclaimer at the bottom).

## Install

From Claude Code, add the marketplace and install the plugin:

```
/plugin marketplace add arthurbossuyt/endurance-coach
/plugin install endurance-coach@endurance-coach-marketplace
```

To try it from a local clone instead:

```
claude --plugin-dir /path/to/endurance-coach
```

The skill then shows up as `endurance-coach:endurance-coach`.

## Without a profile

If you have not set up an athlete home yet, the coach answers the generic part of your question and adds one line saying personal setup is not available yet. It calls no Strava, Garmin or Oura tool in that case.

## The athlete home

All personal data lives outside this repo, in a folder called the athlete home. It is `$ENDURANCE_COACH_HOME` if you set that, otherwise `~/.endurance-coach/`.

```
~/.endurance-coach/
  profile.yaml            stable facts: zones, devices, weight, preferences
  plans/<id>/plan.yaml    one folder per training block: race, rhythm, rules
  secrets/                tokens, for example secrets/oura
```

`profile.yaml` holds what rarely changes. Each `plans/<id>/plan.yaml` holds the rules for one block. If you keep more than one plan, the coach asks which is active. Keep `secrets/` out of version control and out of any synced folder you share.

## Data sources

Each source has an adapter in `skills/endurance-coach/adapters/`.

- **Strava** is the main source for activities. Connect the official Strava connector in Claude. It is required for automatic data about your training.
- **Garmin** is opt-in. It uses a community MCP server that logs in with your Garmin password, and you will need to re-authenticate about every 6 months. This repo ships no `.mcp.json`, so nothing connects until you add the server yourself and accept those trade-offs.
- **Oura** is read through the script at `skills/endurance-coach/scripts/oura`. The token comes from the file named in `OURA_TOKEN_FILE`, or else from `<home>/secrets/oura`. Nothing else is checked.
- **Notion** is an optional adapter for keeping the plan as a dated schedule.

## Schemas and the example athlete

JSON Schemas for `profile.yaml`, `plan.yaml` and the session log live in `schemas/`. They are version 0: `schema_version` and the core keys are required, and extra keys are allowed.

A fully invented athlete lives in `examples/triathlete/` (plan id `lakeside-2027`). Copy it as a starting point for your own home folder. To validate the examples:

```
npm install
npm run validate:examples
```

To check your own files against the same schemas, run `npm run validate:local`. It reads your athlete home, so run it on your machine only.

If you push changes from a machine that has an athlete home, turn on the pre-push hook once per clone. It scans every commit you push for values from your profile and plans and blocks the push on a hit:

```
git config core.hooksPath .githooks
```

## License

MIT. See `LICENSE`.

## Disclaimer

This project gives educational information about training and nutrition. It is not medical advice, and it does not replace a doctor, dietitian or qualified coach. Check with a health professional before you start or change a training program, especially if you have a medical condition.
