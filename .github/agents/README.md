# Album Tracker - Custom GitHub Agents

This directory contains custom GitHub Agents configured for the Album Tracker project. Each agent is specialized for specific tasks and can collaborate with other agents.

Each agent file uses the `.agent.md` extension and includes YAML frontmatter with configuration options like `name`, `description`, and `tools`.

## Agent Overview

| Agent | File | Specialty | When to Use |
|-------|------|-----------|-------------|
| React Component Expert | `react-component-expert.agent.md` | React components, hooks, state | Component creation/modification |
| CSS/Tailwind Styling Expert | `tailwind-styling-expert.agent.md` | TailwindCSS, theming, responsive | Styling changes, dark mode, responsive design |
| Firebase/Backend Expert | `firebase-backend-expert.agent.md` | Firebase, data sync, offline-first | Data operations, sync, schema changes |
| Testing & Quality Agent | `testing-quality.agent.md` | Linting, testing, code quality | Before commits, quality checks |
| Documentation Expert | `documentation-expert.agent.md` | Docs, comments, READMEs | Documentation updates, code comments |
| Architecture Advisor | `architecture-advisor.agent.md` | System design, patterns | Major decisions, new features |
| Bug Fixer | `bug-fixer.agent.md` | Debugging, minimal fixes | Bug reports, issue diagnosis |
| Feature Implementation | `feature-implementation.agent.md` | Full feature delivery | New feature development |
| UI/UX Reviewer | `ui-ux-reviewer.agent.md` | Usability, consistency | UI reviews, design feedback |

## Agent File Format

Each agent file follows this structure:

```markdown
---
name: agent_name
description: Brief description of the agent's expertise and purpose
tools:
  - read
  - edit
  - search
---

# Persona
[Agent's role and personality]

# Project Context
[Project-specific information]

# Key Resources
[Files and documentation to consult]

# Boundaries
[What the agent should not do]

# Task Approach
[How the agent should complete tasks]
```

## Collaboration Patterns

### Feature Development Flow
```
1. Architecture Advisor → Design decision
2. Feature Implementation → Build feature
3. React Component Expert → Component structure
4. CSS/Tailwind Styling → Styling polish
5. Testing & Quality → Verification
6. Documentation Expert → Update docs
```

### Bug Fix Flow
```
1. Bug Fixer → Diagnose and fix
2. Testing & Quality → Verify fix
3. (If styling issue) CSS/Tailwind Styling
4. (If data issue) Firebase/Backend Expert
```

### UI Polish Flow
```
1. UI/UX Reviewer → Identify issues
2. CSS/Tailwind Styling → Implement fixes
3. Testing & Quality → Verify all modes
```

## Key Resources

All agents reference these project documents:

| Document | Purpose |
|----------|---------|
| `docs/APP ARCHITECTURE.txt` | Core data models, schemas, relationships |
| `docs/PROJECT_DIRECTION.md` | Project vision, features, constraints |
| `docs/AI_TODO.md` | Implementation phases and status |
| `docs/REMAINING_TODO.md` | Prioritized feature backlog |
| `docs/music-tracker-implementation-plan.md` | Detailed UI specifications |

## Design System

The project uses a brutalist/punk design system:
- **Borders**: 4px solid black (dark: slate-400)
- **Shadows**: Hard-edged (4px offset, no blur)
- **Typography**: Uppercase, monospace
- **Colors**: High contrast with pink/cyan/lime/violet accents
- **Dark Mode**: Full support required

See `src/utils.js` for THEME constants.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + custom theme
- **State**: React Context API
- **Backend**: Firebase Firestore (optional)
- **Icons**: Lucide React

## Communication Style

When instructing these agents:
- Be direct and specific about goals
- Reference relevant documentation sections
- Provide context about related features
- Allow agents to collaborate as needed
- Trust agents to follow established patterns

## Adding New Agents

When creating a new agent:
1. Follow the existing markdown format
2. Define clear expertise boundaries
3. List key resources to consult
4. Document collaboration with other agents
5. Include practical code examples
6. Add to this README's overview table
