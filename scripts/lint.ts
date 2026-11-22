// stand-in lint: fail on console.log in src/
import { Glob } from "bun";
let bad = 0;
for await (const f of new Glob("src/**/*.ts").scan(".")) {
  if ((await Bun.file(f).text()).includes("console.log")) { console.error(`lint: console.log in ${f}`); bad++; }
}
process.exit(bad ? 1 : 0);
