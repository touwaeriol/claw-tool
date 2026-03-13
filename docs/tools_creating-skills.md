# Creating Skills

Source: https://docs.openclaw.ai/tools/creating-skills

---

Skills

# Creating Skills

# [​
](#creating-custom-skills-)
Creating Custom Skills 🛠

OpenClaw is designed to be easily extensible. “Skills” are the primary way to add new capabilities to your assistant.

## [​
](#what-is-a-skill)
What is a Skill?

A skill is a directory containing a `SKILL.md` file (which provides instructions and tool definitions to the LLM) and optionally some scripts or resources.

## [​
](#step-by-step-your-first-skill)
Step-by-Step: Your First Skill

### [​
](#1-create-the-directory)
1. Create the Directory

Skills live in your workspace, usually `~/.openclaw/workspace/skills/`. Create a new folder for your skill:
Copy

```
mkdir -p ~/.openclaw/workspace/skills/hello-world

```

### [​
](#2-define-the-skill-md)
2. Define the `SKILL.md`

Create a `SKILL.md` file in that directory. This file uses YAML frontmatter for metadata and Markdown for instructions.
Copy

```
---
name: hello_world
description: A simple skill that says hello.
---

# Hello World Skill

When the user asks for a greeting, use the `echo` tool to say "Hello from your custom skill!".

```

### [​
](#3-add-tools-optional)
3. Add Tools (Optional)

You can define custom tools in the frontmatter or instruct the agent to use existing system tools (like `bash` or `browser`).

### [​
](#4-refresh-openclaw)
4. Refresh OpenClaw

Ask your agent to “refresh skills” or restart the gateway. OpenClaw will discover the new directory and index the `SKILL.md`.

## [​
](#best-practices)
Best Practices

- **Be Concise**: Instruct the model on *what* to do, not how to be an AI.

- **Safety First**: If your skill uses `bash`, ensure the prompts don’t allow arbitrary command injection from untrusted user input.

- **Test Locally**: Use `openclaw agent --message "use my new skill"` to test.

## [​
](#shared-skills)
Shared Skills

You can also browse and contribute skills to [ClawHub](https://clawhub.com).
[Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)[Slash Commands](/tools/slash-commands)
⌘I