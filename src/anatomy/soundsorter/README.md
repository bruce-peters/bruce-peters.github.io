Ported from `word-wiz-ai` at commit `2ecf0c7` (frontend/src/components/landing/soundSorter),
where the figure is built by `frontend/scripts/anatomy/sound-sorter/build.mjs`.
`model.ts`, `live.ts` and `art.generated.ts` are copied unchanged, so the
machine, the four readings and their scoring match the Word Wiz home page.
To update, rebuild there and copy the three files again.

Only the colours differ: `soundsorter.css` maps the Word Wiz brand colours to
/bp/ (violet hat, green / lime / coral score bands), keeping the Word Wiz
yellow on the listening head and the star.
