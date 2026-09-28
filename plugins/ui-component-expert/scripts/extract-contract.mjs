import { main } from './cli.mjs';
process.exitCode = await main(['extract-contract', ...process.argv.slice(2)]);
