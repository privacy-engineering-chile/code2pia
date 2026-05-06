# code2pia

Generate RAT and DPIA drafts directly from your code.

code2pia scans your repositories and tells you:

- where personal data is used
- what privacy risks exist
- whether you likely need a DPIA under Ley 21.719, Art. 15 ter
- what evidence is missing
- and generates RAT / DPIA drafts automatically

> This tool generates drafts. Human review is required.

## Quick Example

Run:

```bash
code2pia scan ./app --jurisdiction CL-LEY-21719
```

You get:

- RUT, email, health data, financial data, or location data detected
- external data transfers identified
- logs containing personal data flagged
- missing purpose, lawful basis, and retention evidence highlighted
- DPIA trigger assessment for Ley 21.719, Art. 15 ter
- RAT draft generated from code evidence

## Quick Start

```bash
npm install
npm run build
npm link
```

```bash
code2pia scan ./my-app
```

For local development:

```bash
npm run dev -- scan ./examples/sample-app
```

## What You Get

- JSON report: canonical, evidence-first output
- RAT draft: Chile-ready Registro de Actividades de Tratamiento
- DPIA / AIPD draft: structured privacy impact assessment draft
- Findings: risks with file, line, snippet, and language evidence
- Risk score: `low`, `medium`, or `high`
- Gap analysis: declared governance vs detected code reality

## Basic Usage

Scan and print a summary:

```bash
code2pia scan ./my-app
```

Write the canonical JSON report:

```bash
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --json report.json
```

Write a Markdown PIA / DPIA draft:

```bash
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --markdown pia.md
```

Write a Chilean RAT draft:

```bash
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --rat rat.json
```

Write a DPIA / AIPD draft:

```bash
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --dpia dpia.md
```

## Chile Support

code2pia is Chile-first.

It currently supports:

- Ley 21.719 as the first jurisdiction pack
- RAT generation aligned with the Gobierno de Chile table format
- DPIA / AIPD trigger assessment for Ley 21.719, Art. 15 ter
- Chilean-style data categories for RAT records
- mapping findings to Chilean privacy principles

The Chilean RAT output uses these columns:

| Actividad de tratamiento | Responsable o encargado | Categoría de datos | Universo de titulares | Finalidad | Base de legitimidad/interés legítimo | Destinatarios previstos | Período de conservación | Fuente de la cual provienen los datos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Customer registration | Responsable | Datos identificatorios; Datos de contacto | Clientes | Register a customer account | Contract execution | Internal customer API | Account lifetime plus legal retention | Titular de datos personales |

## Why This Exists

Privacy reviews usually happen too late.

By the time a questionnaire reaches engineering, the system already exists, the data flows are hard to reconstruct, and the privacy inventory is stale.

code2pia moves the first review closer to the code. It does not replace legal, privacy, security, or architecture review. It gives those teams a better first draft.

## Why It's Different

code2pia:

- scans real code
- shows evidence for each finding
- detects personal data and risky patterns
- compares detected behavior with declared governance
- generates living RAT and DPIA drafts

## Privacy Declaration

Use `code2pia.privacy.yaml` to declare governance evidence that usually should not live directly in application code:

- purpose
- lawful basis
- retention
- owners and controller
- recipients and processors
- security measures

code2pia compares declared intent against detected code behavior.

Minimal example:

```yaml
jurisdiction:
  id: CL-LEY-21719
service: customer-api
owner: Privacy Engineering
controller: Example SpA
processingActivities:
  - id: customer_registration
    activityName: Customer registration
    role: Responsable
    purpose: Register a new customer account and verify identity.
    lawfulBasisOrLegitimateInterest: Contract execution
    dataSubjectUniverse:
      - Clientes
    personalData:
      - rut
      - email
    retentionPeriod: Account lifetime plus legal retention.
    expectedRecipients:
      - Internal customer API
    dataSource:
      - Titular de datos personales
```

## Supported Languages

code2pia scans mixed-language repositories.

Supported languages:

- TypeScript / JavaScript
- Python
- Java
- Go
- Ruby
- PHP
- C++
- Rust
- C#

Each finding includes source evidence:

```json
{
  "file": "src/customer.ts",
  "line": 12,
  "column": 4,
  "snippet": "console.log(customer.email)",
  "language": "typescript"
}
```

## Important Disclaimer

code2pia is not legal advice.

It generates drafts based on static analysis and transparent heuristics. Outputs must be reviewed by legal, privacy, security, and architecture teams before being used as formal compliance evidence.

Expect false positives and false negatives, especially in dynamic code, framework-heavy code, or systems with data flows outside the repository.

## JSON Report

The JSON report is the canonical output. It is designed to be boring, explicit, and auditable.

It includes:

- `jurisdictionAssessment`
- `ropaDraft`
- `ratDraft`
- `dpiaTriggerAssessment`
- `dpiaDraft`
- `gaps`
- `remediationCases`
- normalized scan results
- source evidence
- disclaimer

Example shape:

```json
{
  "schemaVersion": "0.2.0",
  "tool": {
    "name": "code2pia",
    "version": "0.1.0"
  },
  "scan": {
    "repository": "customer-api",
    "languagesDetected": ["typescript", "csharp"],
    "filesScanned": 42
  },
  "dpiaTriggerAssessment": {
    "required": true,
    "confidence": "high",
    "lawReference": "Ley 21.719, Art. 15 ter"
  }
}
```

## Markdown PIA / DPIA Draft

The Markdown output is generated from the JSON report and includes:

1. Executive Summary
2. Description of Processing
3. Personal Data Detected
4. Data Flows
5. Chilean Law 21.719 Review
6. Risks Identified
7. Recommended Controls
8. Missing Evidence
9. Human Review Checklist

## RAT Outputs

For Chile, code2pia can generate RAT outputs in multiple formats:

```bash
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --rat rat.json
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --rat-markdown rat.md
code2pia scan ./my-app --jurisdiction CL-LEY-21719 --rat-csv rat.csv
```

The JSON `ratDraft` keeps evidence-first details internally:

- `sourceEvidence[]`
- `dataCategories[].evidence[]`
- `reviewStatus`
- `gaps[]`

Common RAT gaps include:

- `missing_activity_name`
- `missing_role`
- `missing_data_subject_universe`
- `missing_purpose`
- `missing_lawful_basis`
- `missing_recipients`
- `missing_retention_period`
- `missing_data_source`
- `detected_recipient_not_declared`
- `detected_data_category_not_declared`
- `sensitive_data_requires_review`

## DPIA Trigger Assessment

The Chile pack evaluates Ley 21.719, Art. 15 ter triggers:

- systematic and exhaustive automated evaluation or profiling with significant effects
- massive or large-scale processing
- systematic monitoring of public access areas
- sensitive or specially protected data processed under exceptions to consent

The output includes:

- `required`
- `confidence`
- `lawReference`
- `triggers[]`
- recommendation

## Risk Scoring

The MVP scoring model is intentionally simple:

- sensitive data increases risk
- logs and external transfers increase risk
- missing purpose, retention, recipient, or legal-basis evidence increases risk

The final risk score is:

- `low`
- `medium`
- `high`

## Architecture

code2pia is designed to stay extensible without hardcoding laws or programming languages into the core scanner.

```text
src/
  cli/             Commander.js CLI entrypoint
  core/
    scan/          language-agnostic scan engine and normalized model
    findings/      reusable detectors over NormalizedCodeModel
    gaps/          detected-vs-declared gap engine
    risk/          generic risk scoring
  languages/       language adapters
  jurisdictions/   jurisdiction packs
  declarations/    code2pia.privacy.yaml schema and parser
  outputs/         JSON, Markdown, RAT renderers
tests/             unit tests
examples/          sample apps and workflow examples
```

## Language Adapters

Adapters convert source files into a shared intermediate representation.

```ts
export interface LanguageAdapter {
  id: string;
  name: string;
  supportedExtensions: string[];
  parse(files: SourceFile[]): NormalizedCodeModel;
}
```

Detectors run only on `NormalizedCodeModel`, not on language-specific ASTs.

Current adapters prioritize useful static scanning over deep semantic analysis. Tree-sitter-backed adapters can replace lightweight adapters later if they keep the same interface.

To add a language:

1. Create `src/languages/<language>/`.
2. Implement `LanguageAdapter`.
3. Normalize fields, calls, imports, comments, logs, and external calls.
4. Register the adapter in the scan engine.
5. Add fixtures and tests.

## Jurisdiction Packs

Jurisdiction packs evaluate the scan result for a specific legal context.

```ts
export interface JurisdictionPack {
  id: string;
  country: string;
  lawName: string;
  version: string;
  evaluate(scanResult: ScanResult, declaration?: PrivacyDeclaration): JurisdictionAssessment;
  generateRopaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): RopaDraft;
  generateDpiaDraft(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaDraft;
  evaluateDpiaTriggers(scanResult: ScanResult, declaration?: PrivacyDeclaration): DpiaTriggerAssessment;
}
```

Chile Ley 21.719 is the first pack. GDPR, LGPD, and other laws can be added under `src/jurisdictions/` without changing the core scanner.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Run sample apps:

```bash
npm run scan:sample:low
npm run scan:sample:medium
npm run scan:sample:high
```

Sample fixtures:

- `examples/low-app`: product catalog code with no personal data indicators
- `examples/medium-app`: contact request code with email and governance gaps
- `examples/high-app`: health, financial, location, logging, analytics, and external transfer signals
- `examples/polyglot-app`: mixed-language repository fixture

## Contributing

code2pia is open source and contributions are welcome.

Good first contributions:

- more framework-specific fixtures
- better language adapters
- new jurisdiction packs
- personal data dictionaries
- CI / GitHub Action hardening
- documentation improvements

Read [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
