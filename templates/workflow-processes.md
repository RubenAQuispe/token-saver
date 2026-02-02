# Workflow & Process AI Language Templates

Compress step-by-step processes and conditional logic.

## Sequential Workflows

**Instead of:**
```
When you receive a heartbeat poll, first read HEARTBEAT.md if it exists. Follow it strictly and do not infer or repeat old tasks from prior chats. If nothing needs attention, reply with HEARTBEAT_OK. If something does need attention, do not include HEARTBEAT_OK but reply with the alert text instead.
```

**Use:**
```
HEARTBEAT: poll → read(HEARTBEAT.md) → follow-strict → nothing? HEARTBEAT_OK : alert-text
RULE: no-infer-old-tasks
```

## Conditional Logic

**Instead of:**
```
If the task is complex or takes longer than expected, you should spawn a sub-agent to handle it. The sub-agent will do the work for you and notify you when it's complete. You can always check up on it during the process.
```

**Use:**
```
TASK: complex|long → spawn-subagent → notify-complete
MONITOR: check-available
```

## Morning Routines

**Instead of:**
```
When Ruben greets me in the morning with phrases like "good morning", "hi", or "what's on today", I should proactively: 1. Review our task and to-do list 2. Mention any pending items or reminders 3. Check if there's anything urgent that needs attention
```

**Use:**
```
MORNING: greeting(good-morning|hi|whats-on) → review(todos+pending+urgent)
TRIGGER: proactive-response
```

## Decision Trees

**Instead of:**
```
For problem-solving, start with forward momentum until you hit a blocker. When you encounter a blocker, brainstorm multiple solution options. Then optimize for efficiency by selecting the path that gets closest to the goal using the easiest and fastest method. Use data to back decisions when available, and for unknown territory, simulate possible outcomes before committing.
```

**Use:**
```
SOLVE: momentum → blocker? → brainstorm-options → optimize(closest+easiest+fastest)
DECIDE: data-available? data-backed : simulate-outcomes
```

## Approval Workflows

**Instead of:**
```
When agents encounter multi-factor authentication or verification prompts, they should stop immediately, take a screenshot, report back to the user, wait for the user to handle it, and then resume the task once the user gives the go-ahead.
```

**Use:**
```
MFA: encounter → STOP → screenshot → report → WAIT(user-ok) → resume
RULE: never-bypass-auth
```

## File Operations

**Instead of:**
```
Before making any significant changes to files, first read the existing content to understand the current state. Then make the necessary modifications while preserving important information. After changes, verify that the modifications were applied correctly.
```

**Use:**
```
FILEOP: read-current → modify(preserve-important) → verify-applied
PATTERN: understand→change→confirm
```

## Communication Rules

**Instead of:**
```
In group chats, respond when directly mentioned or asked a question, when you can add genuine value, when something witty fits naturally, when correcting important misinformation, or when summarizing is requested. Stay silent when it's casual banter, someone already answered, your response would just be agreement, or the conversation flows fine without you.
```

**Use:**
```
GROUPCHAT: 
  RESPOND: mentioned|value-add|witty-fit|correct-misinfo|summarize-request
  SILENT: banter|already-answered|just-agreement|flows-fine
RULE: quality>quantity, participate≠dominate
```

## Token Savings

- **Sequential workflows:** 60-70% reduction
- **Conditional logic:** 65-75% reduction  
- **Decision trees:** 70-80% reduction
- **Communication rules:** 75-85% reduction