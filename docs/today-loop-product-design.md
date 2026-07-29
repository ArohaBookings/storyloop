# Today Loop product design

## Problem

ECE educators do not need another compulsory daily sheet. They need a fast way
to remember a real moment while staying with children, then decide later whether
it deserves a learning story, a planning response, or no further work.

## Job and interaction contract

- Morning: show at most three focus prompts drawn from unfinished captures,
  existing next steps, and the oldest recent child story.
- During the day: capture one text-first moment in roughly 20 seconds. A child
  is optional and a photo is never required.
- Later: take exactly one action — turn it into a story, hold it for planning,
  or archive it.
- StoryLoop never scores children or implies every captured moment must become
  formal documentation.

## Data and analytics contract

| Field | Purpose |
| --- | --- |
| `daily_captures.user_id` | ownership and RLS boundary |
| `child_id` / `child_name` | optional continuity and readable snapshot |
| `note` | the educator's exact observation |
| `status` | `captured`, `planned`, `story_ready`, or `archived` |
| `observed_at` | ordering and daily/weekly usage |

Operational monitoring uses captures, active capture users, and capture-to-story
decisions. It must never rank educators or children. Empty, loading, error, and
free-limit states stay explicit in the product.

## Pricing boundary

- Free: 10 captured moments per calendar month and three stories.
- Educator and above: unlimited captured moments.
- Higher tiers keep their existing differentiation in family continuity,
  centre planning, calibration, and leadership visibility.

## Accessibility and responsive behaviour

All values have text labels, actions work without hover, cards stack at small
widths, and the capture form remains usable at 320px without horizontal scroll.
