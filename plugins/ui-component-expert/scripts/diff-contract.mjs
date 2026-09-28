import { main } from './cli.mjs';
process.exitCode = await main(['diff-contract', ...process.argv.slice(2)]);
