# THREAT MODEL ATLAS

Source: https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS

---

Security

# THREAT MODEL ATLAS

# [​
](#openclaw-threat-model-v1-0)
OpenClaw Threat Model v1.0

## [​
](#mitre-atlas-framework)
MITRE ATLAS Framework

**Version:** 1.0-draft
**Last Updated:** 2026-02-04
**Methodology:** MITRE ATLAS + Data Flow Diagrams
**Framework:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### [​
](#framework-attribution)
Framework Attribution

This threat model is built on [MITRE ATLAS](https://atlas.mitre.org/), the industry-standard framework for documenting adversarial threats to AI/ML systems. ATLAS is maintained by [MITRE](https://www.mitre.org/) in collaboration with the AI security community.
**Key ATLAS Resources:**

- [ATLAS Techniques](https://atlas.mitre.org/techniques/)

- [ATLAS Tactics](https://atlas.mitre.org/tactics/)

- [ATLAS Case Studies](https://atlas.mitre.org/studies/)

- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)

- [Contributing to ATLAS](https://atlas.mitre.org/resources/contribute)

### [​
](#contributing-to-this-threat-model)
Contributing to This Threat Model

This is a living document maintained by the OpenClaw community. See [CONTRIBUTING-THREAT-MODEL.md](/security/CONTRIBUTING-THREAT-MODEL) for guidelines on contributing:

- Reporting new threats

- Updating existing threats

- Proposing attack chains

- Suggesting mitigations

## [​
](#1-introduction)
1. Introduction

### [​
](#1-1-purpose)
1.1 Purpose

This threat model documents adversarial threats to the OpenClaw AI agent platform and ClawHub skill marketplace, using the MITRE ATLAS framework designed specifically for AI/ML systems.

### [​
](#1-2-scope)
1.2 Scope

ComponentIncludedNotesOpenClaw Agent RuntimeYesCore agent execution, tool calls, sessionsGatewayYesAuthentication, routing, channel integrationChannel IntegrationsYesWhatsApp, Telegram, Discord, Signal, Slack, etc.ClawHub MarketplaceYesSkill publishing, moderation, distributionMCP ServersYesExternal tool providersUser DevicesPartialMobile apps, desktop clients

### [​
](#1-3-out-of-scope)
1.3 Out of Scope

Nothing is explicitly out of scope for this threat model.

## [​
](#2-system-architecture)
2. System Architecture

### [​
](#2-1-trust-boundaries)
2.1 Trust Boundaries

Copy

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WhatsApp   │  │  Telegram   │  │   Discord   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 1: Channel Access                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      GATEWAY                              │   │
│  │  • Device Pairing (30s grace period)                      │   │
│  │  • AllowFrom / AllowList validation                       │   │
│  │  • Token/Password/Tailscale auth                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 2: Session Isolation              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AGENT SESSIONS                          │   │
│  │  • Session key = agent:channel:peer                       │   │
│  │  • Tool policies per agent                                │   │
│  │  • Transcript logging                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 3: Tool Execution                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION SANDBOX                        │   │
│  │  • Docker sandbox OR Host (exec-approvals)                │   │
│  │  • Node remote execution                                  │   │
│  │  • SSRF protection (DNS pinning + IP blocking)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 4: External Content               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FETCHED URLs / EMAILS / WEBHOOKS             │   │
│  │  • External content wrapping (XML tags)                   │   │
│  │  • Security notice injection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 5: Supply Chain                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLAWHUB                              │   │
│  │  • Skill publishing (semver, SKILL.md required)           │   │
│  │  • Pattern-based moderation flags                         │   │
│  │  • VirusTotal scanning (coming soon)                      │   │
│  │  • GitHub account age verification                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

```

### [​
](#2-2-data-flows)
2.2 Data Flows

FlowSourceDestinationDataProtectionF1ChannelGatewayUser messagesTLS, AllowFromF2GatewayAgentRouted messagesSession isolationF3AgentToolsTool invocationsPolicy enforcementF4AgentExternalweb_fetch requestsSSRF blockingF5ClawHubAgentSkill codeModeration, scanningF6AgentChannelResponsesOutput filtering

## [​
](#3-threat-analysis-by-atlas-tactic)
3. Threat Analysis by ATLAS Tactic

### [​
](#3-1-reconnaissance-aml-ta0002)
3.1 Reconnaissance (AML.TA0002)

#### [​
](#t-recon-001-agent-endpoint-discovery)
T-RECON-001: Agent Endpoint Discovery

AttributeValue**ATLAS ID**AML.T0006 - Active Scanning**Description**Attacker scans for exposed OpenClaw gateway endpoints**Attack Vector**Network scanning, shodan queries, DNS enumeration**Affected Components**Gateway, exposed API endpoints**Current Mitigations**Tailscale auth option, bind to loopback by default**Residual Risk**Medium - Public gateways discoverable**Recommendations**Document secure deployment, add rate limiting on discovery endpoints

#### [​
](#t-recon-002-channel-integration-probing)
T-RECON-002: Channel Integration Probing

AttributeValue**ATLAS ID**AML.T0006 - Active Scanning**Description**Attacker probes messaging channels to identify AI-managed accounts**Attack Vector**Sending test messages, observing response patterns**Affected Components**All channel integrations**Current Mitigations**None specific**Residual Risk**Low - Limited value from discovery alone**Recommendations**Consider response timing randomization

### [​
](#3-2-initial-access-aml-ta0004)
3.2 Initial Access (AML.TA0004)

#### [​
](#t-access-001-pairing-code-interception)
T-ACCESS-001: Pairing Code Interception

AttributeValue**ATLAS ID**AML.T0040 - AI Model Inference API Access**Description**Attacker intercepts pairing code during 30s grace period**Attack Vector**Shoulder surfing, network sniffing, social engineering**Affected Components**Device pairing system**Current Mitigations**30s expiry, codes sent via existing channel**Residual Risk**Medium - Grace period exploitable**Recommendations**Reduce grace period, add confirmation step

#### [​
](#t-access-002-allowfrom-spoofing)
T-ACCESS-002: AllowFrom Spoofing

AttributeValue**ATLAS ID**AML.T0040 - AI Model Inference API Access**Description**Attacker spoofs allowed sender identity in channel**Attack Vector**Depends on channel - phone number spoofing, username impersonation**Affected Components**AllowFrom validation per channel**Current Mitigations**Channel-specific identity verification**Residual Risk**Medium - Some channels vulnerable to spoofing**Recommendations**Document channel-specific risks, add cryptographic verification where possible

#### [​
](#t-access-003-token-theft)
T-ACCESS-003: Token Theft

AttributeValue**ATLAS ID**AML.T0040 - AI Model Inference API Access**Description**Attacker steals authentication tokens from config files**Attack Vector**Malware, unauthorized device access, config backup exposure**Affected Components**~/.openclaw/credentials/, config storage**Current Mitigations**File permissions**Residual Risk**High - Tokens stored in plaintext**Recommendations**Implement token encryption at rest, add token rotation

### [​
](#3-3-execution-aml-ta0005)
3.3 Execution (AML.TA0005)

#### [​
](#t-exec-001-direct-prompt-injection)
T-EXEC-001: Direct Prompt Injection

AttributeValue**ATLAS ID**AML.T0051.000 - LLM Prompt Injection: Direct**Description**Attacker sends crafted prompts to manipulate agent behavior**Attack Vector**Channel messages containing adversarial instructions**Affected Components**Agent LLM, all input surfaces**Current Mitigations**Pattern detection, external content wrapping**Residual Risk**Critical - Detection only, no blocking; sophisticated attacks bypass**Recommendations**Implement multi-layer defense, output validation, user confirmation for sensitive actions

#### [​
](#t-exec-002-indirect-prompt-injection)
T-EXEC-002: Indirect Prompt Injection

AttributeValue**ATLAS ID**AML.T0051.001 - LLM Prompt Injection: Indirect**Description**Attacker embeds malicious instructions in fetched content**Attack Vector**Malicious URLs, poisoned emails, compromised webhooks**Affected Components**web_fetch, email ingestion, external data sources**Current Mitigations**Content wrapping with XML tags and security notice**Residual Risk**High - LLM may ignore wrapper instructions**Recommendations**Implement content sanitization, separate execution contexts

#### [​
](#t-exec-003-tool-argument-injection)
T-EXEC-003: Tool Argument Injection

AttributeValue**ATLAS ID**AML.T0051.000 - LLM Prompt Injection: Direct**Description**Attacker manipulates tool arguments through prompt injection**Attack Vector**Crafted prompts that influence tool parameter values**Affected Components**All tool invocations**Current Mitigations**Exec approvals for dangerous commands**Residual Risk**High - Relies on user judgment**Recommendations**Implement argument validation, parameterized tool calls

#### [​
](#t-exec-004-exec-approval-bypass)
T-EXEC-004: Exec Approval Bypass

AttributeValue**ATLAS ID**AML.T0043 - Craft Adversarial Data**Description**Attacker crafts commands that bypass approval allowlist**Attack Vector**Command obfuscation, alias exploitation, path manipulation**Affected Components**exec-approvals.ts, command allowlist**Current Mitigations**Allowlist + ask mode**Residual Risk**High - No command sanitization**Recommendations**Implement command normalization, expand blocklist

### [​
](#3-4-persistence-aml-ta0006)
3.4 Persistence (AML.TA0006)

#### [​
](#t-persist-001-malicious-skill-installation)
T-PERSIST-001: Malicious Skill Installation

AttributeValue**ATLAS ID**AML.T0010.001 - Supply Chain Compromise: AI Software**Description**Attacker publishes malicious skill to ClawHub**Attack Vector**Create account, publish skill with hidden malicious code**Affected Components**ClawHub, skill loading, agent execution**Current Mitigations**GitHub account age verification, pattern-based moderation flags**Residual Risk**Critical - No sandboxing, limited review**Recommendations**VirusTotal integration (in progress), skill sandboxing, community review

#### [​
](#t-persist-002-skill-update-poisoning)
T-PERSIST-002: Skill Update Poisoning

AttributeValue**ATLAS ID**AML.T0010.001 - Supply Chain Compromise: AI Software**Description**Attacker compromises popular skill and pushes malicious update**Attack Vector**Account compromise, social engineering of skill owner**Affected Components**ClawHub versioning, auto-update flows**Current Mitigations**Version fingerprinting**Residual Risk**High - Auto-updates may pull malicious versions**Recommendations**Implement update signing, rollback capability, version pinning

#### [​
](#t-persist-003-agent-configuration-tampering)
T-PERSIST-003: Agent Configuration Tampering

AttributeValue**ATLAS ID**AML.T0010.002 - Supply Chain Compromise: Data**Description**Attacker modifies agent configuration to persist access**Attack Vector**Config file modification, settings injection**Affected Components**Agent config, tool policies**Current Mitigations**File permissions**Residual Risk**Medium - Requires local access**Recommendations**Config integrity verification, audit logging for config changes

### [​
](#3-5-defense-evasion-aml-ta0007)
3.5 Defense Evasion (AML.TA0007)

#### [​
](#t-evade-001-moderation-pattern-bypass)
T-EVADE-001: Moderation Pattern Bypass

AttributeValue**ATLAS ID**AML.T0043 - Craft Adversarial Data**Description**Attacker crafts skill content to evade moderation patterns**Attack Vector**Unicode homoglyphs, encoding tricks, dynamic loading**Affected Components**ClawHub moderation.ts**Current Mitigations**Pattern-based FLAG_RULES**Residual Risk**High - Simple regex easily bypassed**Recommendations**Add behavioral analysis (VirusTotal Code Insight), AST-based detection

#### [​
](#t-evade-002-content-wrapper-escape)
T-EVADE-002: Content Wrapper Escape

AttributeValue**ATLAS ID**AML.T0043 - Craft Adversarial Data**Description**Attacker crafts content that escapes XML wrapper context**Attack Vector**Tag manipulation, context confusion, instruction override**Affected Components**External content wrapping**Current Mitigations**XML tags + security notice**Residual Risk**Medium - Novel escapes discovered regularly**Recommendations**Multiple wrapper layers, output-side validation

### [​
](#3-6-discovery-aml-ta0008)
3.6 Discovery (AML.TA0008)

#### [​
](#t-disc-001-tool-enumeration)
T-DISC-001: Tool Enumeration

AttributeValue**ATLAS ID**AML.T0040 - AI Model Inference API Access**Description**Attacker enumerates available tools through prompting**Attack Vector**”What tools do you have?” style queries**Affected Components**Agent tool registry**Current Mitigations**None specific**Residual Risk**Low - Tools generally documented**Recommendations**Consider tool visibility controls

#### [​
](#t-disc-002-session-data-extraction)
T-DISC-002: Session Data Extraction

AttributeValue**ATLAS ID**AML.T0040 - AI Model Inference API Access**Description**Attacker extracts sensitive data from session context**Attack Vector**”What did we discuss?” queries, context probing**Affected Components**Session transcripts, context window**Current Mitigations**Session isolation per sender**Residual Risk**Medium - Within-session data accessible**Recommendations**Implement sensitive data redaction in context

### [​
](#3-7-collection-&-exfiltration-aml-ta0009-aml-ta0010)
3.7 Collection & Exfiltration (AML.TA0009, AML.TA0010)

#### [​
](#t-exfil-001-data-theft-via-web_fetch)
T-EXFIL-001: Data Theft via web_fetch

AttributeValue**ATLAS ID**AML.T0009 - Collection**Description**Attacker exfiltrates data by instructing agent to send to external URL**Attack Vector**Prompt injection causing agent to POST data to attacker server**Affected Components**web_fetch tool**Current Mitigations**SSRF blocking for internal networks**Residual Risk**High - External URLs permitted**Recommendations**Implement URL allowlisting, data classification awareness

#### [​
](#t-exfil-002-unauthorized-message-sending)
T-EXFIL-002: Unauthorized Message Sending

AttributeValue**ATLAS ID**AML.T0009 - Collection**Description**Attacker causes agent to send messages containing sensitive data**Attack Vector**Prompt injection causing agent to message attacker**Affected Components**Message tool, channel integrations**Current Mitigations**Outbound messaging gating**Residual Risk**Medium - Gating may be bypassed**Recommendations**Require explicit confirmation for new recipients

#### [​
](#t-exfil-003-credential-harvesting)
T-EXFIL-003: Credential Harvesting

AttributeValue**ATLAS ID**AML.T0009 - Collection**Description**Malicious skill harvests credentials from agent context**Attack Vector**Skill code reads environment variables, config files**Affected Components**Skill execution environment**Current Mitigations**None specific to skills**Residual Risk**Critical - Skills run with agent privileges**Recommendations**Skill sandboxing, credential isolation

### [​
](#3-8-impact-aml-ta0011)
3.8 Impact (AML.TA0011)

#### [​
](#t-impact-001-unauthorized-command-execution)
T-IMPACT-001: Unauthorized Command Execution

AttributeValue**ATLAS ID**AML.T0031 - Erode AI Model Integrity**Description**Attacker executes arbitrary commands on user system**Attack Vector**Prompt injection combined with exec approval bypass**Affected Components**Bash tool, command execution**Current Mitigations**Exec approvals, Docker sandbox option**Residual Risk**Critical - Host execution without sandbox**Recommendations**Default to sandbox, improve approval UX

#### [​
](#t-impact-002-resource-exhaustion-dos)
T-IMPACT-002: Resource Exhaustion (DoS)

AttributeValue**ATLAS ID**AML.T0031 - Erode AI Model Integrity**Description**Attacker exhausts API credits or compute resources**Attack Vector**Automated message flooding, expensive tool calls**Affected Components**Gateway, agent sessions, API provider**Current Mitigations**None**Residual Risk**High - No rate limiting**Recommendations**Implement per-sender rate limits, cost budgets

#### [​
](#t-impact-003-reputation-damage)
T-IMPACT-003: Reputation Damage

AttributeValue**ATLAS ID**AML.T0031 - Erode AI Model Integrity**Description**Attacker causes agent to send harmful/offensive content**Attack Vector**Prompt injection causing inappropriate responses**Affected Components**Output generation, channel messaging**Current Mitigations**LLM provider content policies**Residual Risk**Medium - Provider filters imperfect**Recommendations**Output filtering layer, user controls

## [​
](#4-clawhub-supply-chain-analysis)
4. ClawHub Supply Chain Analysis

### [​
](#4-1-current-security-controls)
4.1 Current Security Controls

ControlImplementationEffectivenessGitHub Account Age`requireGitHubAccountAge()`Medium - Raises bar for new attackersPath Sanitization`sanitizePath()`High - Prevents path traversalFile Type Validation`isTextFile()`Medium - Only text files, but can still be maliciousSize Limits50MB total bundleHigh - Prevents resource exhaustionRequired SKILL.mdMandatory readmeLow security value - Informational onlyPattern ModerationFLAG_RULES in moderation.tsLow - Easily bypassedModeration Status`moderationStatus` fieldMedium - Manual review possible

### [​
](#4-2-moderation-flag-patterns)
4.2 Moderation Flag Patterns

Current patterns in `moderation.ts`:
Copy

```
// Known-bad identifiers
/(keepcold131\/ClawdAuthenticatorTool|ClawdAuthenticatorTool)/i

// Suspicious keywords
/(malware|stealer|phish|phishing|keylogger)/i
/(api[-_ ]?key|token|password|private key|secret)/i
/(wallet|seed phrase|mnemonic|crypto)/i
/(discord\.gg|webhook|hooks\.slack)/i
/(curl[^\n]+\|\s*(sh|bash))/i
/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd)/i

```

**Limitations:**

- Only checks slug, displayName, summary, frontmatter, metadata, file paths

- Does not analyze actual skill code content

- Simple regex easily bypassed with obfuscation

- No behavioral analysis

### [​
](#4-3-planned-improvements)
4.3 Planned Improvements

ImprovementStatusImpactVirusTotal IntegrationIn ProgressHigh - Code Insight behavioral analysisCommunity ReportingPartial (`skillReports` table exists)MediumAudit LoggingPartial (`auditLogs` table exists)MediumBadge SystemImplementedMedium - `highlighted`, `official`, `deprecated`, `redactionApproved`

## [​
](#5-risk-matrix)
5. Risk Matrix

### [​
](#5-1-likelihood-vs-impact)
5.1 Likelihood vs Impact

Threat IDLikelihoodImpactRisk LevelPriorityT-EXEC-001HighCritical**Critical**P0T-PERSIST-001HighCritical**Critical**P0T-EXFIL-003MediumCritical**Critical**P0T-IMPACT-001MediumCritical**High**P1T-EXEC-002HighHigh**High**P1T-EXEC-004MediumHigh**High**P1T-ACCESS-003MediumHigh**High**P1T-EXFIL-001MediumHigh**High**P1T-IMPACT-002HighMedium**High**P1T-EVADE-001HighMedium**Medium**P2T-ACCESS-001LowHigh**Medium**P2T-ACCESS-002LowHigh**Medium**P2T-PERSIST-002LowHigh**Medium**P2

### [​
](#5-2-critical-path-attack-chains)
5.2 Critical Path Attack Chains

**Attack Chain 1: Skill-Based Data Theft**
Copy

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)

```

**Attack Chain 2: Prompt Injection to RCE**
Copy

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)

```

**Attack Chain 3: Indirect Injection via Fetched Content**
Copy

```
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)

```

## [​
](#6-recommendations-summary)
6. Recommendations Summary

### [​
](#6-1-immediate-p0)
6.1 Immediate (P0)

IDRecommendationAddressesR-001Complete VirusTotal integrationT-PERSIST-001, T-EVADE-001R-002Implement skill sandboxingT-PERSIST-001, T-EXFIL-003R-003Add output validation for sensitive actionsT-EXEC-001, T-EXEC-002

### [​
](#6-2-short-term-p1)
6.2 Short-term (P1)

IDRecommendationAddressesR-004Implement rate limitingT-IMPACT-002R-005Add token encryption at restT-ACCESS-003R-006Improve exec approval UX and validationT-EXEC-004R-007Implement URL allowlisting for web_fetchT-EXFIL-001

### [​
](#6-3-medium-term-p2)
6.3 Medium-term (P2)

IDRecommendationAddressesR-008Add cryptographic channel verification where possibleT-ACCESS-002R-009Implement config integrity verificationT-PERSIST-003R-010Add update signing and version pinningT-PERSIST-002

## [​
](#7-appendices)
7. Appendices

### [​
](#7-1-atlas-technique-mapping)
7.1 ATLAS Technique Mapping

ATLAS IDTechnique NameOpenClaw ThreatsAML.T0006Active ScanningT-RECON-001, T-RECON-002AML.T0009CollectionT-EXFIL-001, T-EXFIL-002, T-EXFIL-003AML.T0010.001Supply Chain: AI SoftwareT-PERSIST-001, T-PERSIST-002AML.T0010.002Supply Chain: DataT-PERSIST-003AML.T0031Erode AI Model IntegrityT-IMPACT-001, T-IMPACT-002, T-IMPACT-003AML.T0040AI Model Inference API AccessT-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002AML.T0043Craft Adversarial DataT-EXEC-004, T-EVADE-001, T-EVADE-002AML.T0051.000LLM Prompt Injection: DirectT-EXEC-001, T-EXEC-003AML.T0051.001LLM Prompt Injection: IndirectT-EXEC-002

### [​
](#7-2-key-security-files)
7.2 Key Security Files

PathPurposeRisk Level`src/infra/exec-approvals.ts`Command approval logic**Critical**`src/gateway/auth.ts`Gateway authentication**Critical**`src/web/inbound/access-control.ts`Channel access control**Critical**`src/infra/net/ssrf.ts`SSRF protection**Critical**`src/security/external-content.ts`Prompt injection mitigation**Critical**`src/agents/sandbox/tool-policy.ts`Tool policy enforcement**Critical**`convex/lib/moderation.ts`ClawHub moderation**High**`convex/lib/skillPublish.ts`Skill publishing flow**High**`src/routing/resolve-route.ts`Session isolation**Medium**

### [​
](#7-3-glossary)
7.3 Glossary

TermDefinition**ATLAS**MITRE’s Adversarial Threat Landscape for AI Systems**ClawHub**OpenClaw’s skill marketplace**Gateway**OpenClaw’s message routing and authentication layer**MCP**Model Context Protocol - tool provider interface**Prompt Injection**Attack where malicious instructions are embedded in input**Skill**Downloadable extension for OpenClaw agents**SSRF**Server-Side Request Forgery

*This threat model is a living document. Report security issues to [security@openclaw.ai](mailto:security@openclaw.ai)*
[README](/security/README)[CONTRIBUTING THREAT MODEL](/security/CONTRIBUTING-THREAT-MODEL)
⌘I