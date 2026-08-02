# The Combined State Frontier Law

**Site:** https://frontierstatelaw.com/

One bill, assembled verbatim from enacted US state frontier-AI law — for each
obligation, the strictest enacted version, in the words of the state that enacted
it, with a click-through to the identical text in the source bill. Around it:
text-centered annotated pages for every state with a frontier law (CA SB 53,
NY RAISE as amended, IL PA 104-0538, CT PA 26-15, and the live MA bill in
conference), each read against the California SB 53 baseline.

## Why trust the quotations

Nothing on the site rests on an author's memory. Before every build, a verifier
loads each quotation and requires a whitespace-normalized string match against an
archived copy of the official text (retrieved 1 August 2026, URL and timestamp
recorded). The same match generates and validates the `#:~:text=` deep links, so
source links land on the highlighted words on the official page. After HTML
generation the verifier runs again over the rendered pages. A single mismatch
stops the build.

## What this repo is

A generated publish artifact — the built static site, synced one-way from a
private working tree. Direct edits here get overwritten by the next sync, so
please don't PR content changes against these files.

**Corrections are welcome, and an unsourced claim is a bug.** File an
[issue](https://github.com/JayIoAurelius/frontier-ai-state-laws/issues) or email
jay.ifp.automation@gmail.com. If a quotation does not match the enacted text, if
a section is attributed to the wrong state, or if a law has moved since
1 August 2026, that is a defect and it will be fixed.

## Attribution

All statutory text is quoted from official state sources, linked per quotation.
Obligation-category vocabulary follows the field's existing usage (Secure AI
Project / Encode). The annotated-statute format owes a debt to
[sb53.info](https://sb53.info/), Miles Kodama's annotated SB 53 (AI Futures
Project). Base map by [Simplemaps](https://simplemaps.com/resources/svg-license)
(free license). Site data compilation and code by Jay Kim.
