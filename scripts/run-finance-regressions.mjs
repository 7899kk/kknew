// Node 24: run the finance logic without installing React Native dependencies.
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      if (url.protocol === 'file:' && existsSync(fileURLToPath(url) + '.ts')) {
        return { url: url.href + '.ts', shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) {
      return { format: 'module', source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), 'utf8')), shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const tests = new URL('../artifacts/wealthtrack/tests/', import.meta.url);
for (const name of readdirSync(tests).filter(name => name.endsWith('.test.ts')).sort()) {
  await import(new URL(name, tests).href);
}
await import(new URL('./finance-ledger-stress.test.ts', import.meta.url).href);
