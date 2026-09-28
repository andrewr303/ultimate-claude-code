import { main } from './cli.mjs';
process.exitCode = await main(['status', ...process.argv.slice(2)]);
