# Business Context AI Language Templates

Efficient ways to encode business information for AI understanding.

## User Roles & Context

**Instead of:**
```
I am a Senior IT engineer working full-time at another company, which takes up most of my day. I'm also the COO of Missing Pieces Psychology, where we simplify operations for doctors and help grow the business. Additionally, I own ORO Homes LLC, a home remodeling company that is currently my top priority.
```

**Use:**
```
ROLES: IT-eng(full-time) + COO(MPP) + owner(ORO-priority)
CONTEXT: day-job-busy, 2businesses, time-limited
```

## Business Status

**Instead of:**
```
ORO Homes is currently struggling financially with debt and employees to pay, which causes sleepless nights. The company desperately needs more revenue and leads. Meanwhile, Missing Pieces Psychology is more stable but needs backend automation.
```

**Use:**
```
STATUS: {oro: "debt+employees=urgent$", mpp: "stable→automate"}
STRESS: oro-financial, time-critical
```

## Goals & Priorities

**Instead of:**
```
My main goals are: 1. Increase ORO Homes revenue urgently 2. Automate ORO Homes backend operations 3. Automate Missing Pieces Psychology backend 4. Buy back time from manual work 5. Build toward an agency model that's sellable
```

**Use:**
```
GOALS: [oro-revenue(URGENT), automate(oro+mpp), buy-time, agency-model]
PRIORITY: revenue>automation>time>scale
```

## Communication Preferences

**Instead of:**
```
I prefer direct, practical communication. I value time efficiency and want proactive help rather than just reactive responses. The key principle is to do the work proactively - have research and data ready BEFORE I ask for it.
```

**Use:**
```
COMM: {style: "direct+practical", help: "proactive", principle: "research-ready-pre-ask"}
VALUES: time-efficiency, forward-momentum
```

## Problem-Solving Style

**Instead of:**
```
My approach is: 1. Forward momentum - move until you hit a blocker, don't overthink early 2. Solution brainstorm - generate multiple options at roadblocks 3. Optimize for efficiency - select the path that gets closest to the goal in the easiest, fastest way
```

**Use:**
```
APPROACH: momentum→blocker→brainstorm→optimize-efficiency
DECISION: multiple-options + data-backed + mental-simulation
```

## Resource Constraints

**Instead of:**
```
I have very limited free time between my day job and two businesses. I can't afford to be the bottleneck - everything that waits on me is a problem. I don't have time to learn new skills like Google Ads or SEO.
```

**Use:**
```
CONSTRAINTS: time-limited, bottleneck-critical, no-learning-time
DELEGATE: ads+seo+anything>30s
```

## Token Savings

- **Original:** ~180 tokens
- **Compressed:** ~45 tokens  
- **Savings:** 75%