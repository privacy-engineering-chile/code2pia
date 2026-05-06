# Roadmap

code2pia is an MVP. The goal is to make privacy review evidence easier to generate from real code while keeping the tool transparent, extensible, and human-reviewable.

## Near Term

- Improve TypeScript and JavaScript analysis depth.
- Add more framework fixtures for Express, NestJS, Next.js, Rails, Laravel, ASP.NET Core, Spring, Django, and FastAPI.
- Strengthen Chile Ley 21.719 mappings and RAT/DPIA wording.
- Add SARIF output for GitHub code scanning.
- Add a first-class GitHub Action example.
- Improve CLI output ergonomics for CI and local developer workflows.

## Language Adapters

- Replace lightweight adapters with tree-sitter-backed adapters where useful.
- Add better C# / ASP.NET Core, Java / Spring, Python / Django / FastAPI, and Ruby / Rails patterns.
- Add support for more languages based on contributor demand.

## Jurisdiction Packs

- Keep Chile Ley 21.719 as the first-class pack.
- Explore GDPR support.
- Explore Brazil LGPD support.
- Document how to add a new jurisdiction pack.

## Governance and Outputs

- Improve `code2pia.privacy.yaml` examples.
- Add richer gap explanations and remediation cases.
- Add stable JSON schema documentation.
- Add npm package publishing workflow.

## Non-Goals

- Runtime tracing.
- Cloud inventory.
- Fully automated legal compliance decisions.
- Replacing legal, privacy, security, or architecture review.
