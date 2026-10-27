> **Sample entry.** This one is written as a proposal, so its status is *Planned*. Update the status in `projects/index.json` as the work progresses, and rewrite the sections below with your real findings.

## The question

Operational technology (OT) networks that run industrial processes have long been protected by one idea: keep them physically separate from everything else. Stuxnet showed that an air gap is an assumption, not a control. **If the air gap can fail, what should a security policy require instead?**

## Why Stuxnet matters

Stuxnet was malware discovered in 2010 that targeted specific industrial control systems. It reached a network with no direct internet connection by travelling on removable media, then spread between computers until it found the industrial equipment it was built for.

The lesson for policy is not about one piece of malware. It is that the gap was crossed by something ordinary: a person carrying a drive.

## Frameworks I will compare

| Framework | What it offers | Question I will ask of it |
| --- | --- | --- |
| IEC 62443 | A series of standards for securing industrial automation, built around zones and conduits | Would segmentation and controlled conduits have limited the spread? |
| NIST SP 800-82 | Guidance on securing industrial control systems | What does it say about removable media, patching and monitoring in OT? |
| NIS2 | EU directive setting risk-management and reporting duties for essential and important entities | What must an organisation be able to show a regulator? |

## Method

1. Break the Stuxnet attack into stages, from initial access to impact.
2. For each stage, identify which control should have stopped or detected it.
3. Map those controls to the three frameworks and note where they agree, overlap or leave gaps.
4. Draft a short policy for an air-gapped environment based on the results.

## Expected output

- A mapping table from attack stage to control to framework reference
- A draft policy of two pages or fewer that a plant manager could read
- A short reflection on where policy ends and engineering begins

> **A note on scope.** This work is analysis of public information and published standards. It does not include or describe how to build or operate malware.

## Open questions

- How much of the standards' guidance is realistic for a small operator?
- Is detection more achievable than prevention in an environment that cannot patch quickly?
- What evidence would convince an auditor that the policy is actually followed?
