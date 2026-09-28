import { main } from './cli.mjs';
process.exitCode = await main(['inspect-target', ...process.argv.slice(2)]);
