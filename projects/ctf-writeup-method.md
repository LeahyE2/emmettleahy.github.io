> **Sample entry.** This one is a short note rather than a project, to show that the same format works for blog-style posts. Delete it or rewrite it as you like.

## Why I write things up

Solving a challenge teaches me something. Explaining it clearly teaches me whether I really understood it. A write-up also gives a reviewer, such as an interviewer or a lecturer, something concrete to read about how I think. You can see an example in [Web challenge walkthrough](#project/ctf-web-writeup).

## The template

I start every write-up from the same skeleton so nothing gets forgotten:

```markdown
## Summary
One paragraph: what the target was and what the problem turned out to be.

## Scope and rules
What I was allowed to touch, and what I was not.

## Approach
The steps, in order, including dead ends that taught me something.

## Findings
A table: finding, impact, recommended fix.

## The fix
What a developer or administrator should change.

## Lessons learned
What I would do differently next time.
```

## Habits that help

- **Take notes while working.** Reconstructing commands from memory is slow and unreliable.
- **Write for the defender too.** Every attack step has a matching control. Naming it turns a trick into a finding.
- **Show your reasoning, not only the result.** The wrong turns are the useful part for a reader.
- **Explain jargon once.** Assume an intelligent reader who is new to the topic.

## Redaction bars

Wrap text in double pipes to hide it behind a bar that readers can click open. Try it: ||redaction is theatre, not security||. The text is still in the page source, so it is for show, not for secrets.

## Before publishing

> **Check three things.** Is the challenge retired, or does the event allow public write-ups? Have I removed flags, credentials, real hostnames and anything that identifies other people? Would I be comfortable if the organiser read it?

If the answer to any of those is no, keep the write-up private. A portfolio that shows good judgement is worth more than one that shows every solve.
