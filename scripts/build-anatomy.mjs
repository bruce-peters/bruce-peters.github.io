// Builds the static art for every anatomy figure.
//   node scripts/build-anatomy.mjs                      all figures
//   node scripts/build-anatomy.mjs --only superstructure one figure
//   node scripts/build-anatomy.mjs --audit              also run the kit audit
//   node scripts/build-anatomy.mjs --preview <dir>      also write a rest-pose page per figure
const FIGURES = ['superstructure', 'firecontrol', 'offtask', 'robotsim', 'scouting']
const i = process.argv.indexOf('--only')
const only = i > 0 ? process.argv[i + 1] : null
for (const name of FIGURES.filter((n) => !only || n === only)) await import(`./anatomy/${name}.mjs`)
