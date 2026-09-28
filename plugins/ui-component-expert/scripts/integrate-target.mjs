import { main } from './cli.mjs';
process.exitCode = await main(['integrate-target', ...process.argv.slice(2)]);
