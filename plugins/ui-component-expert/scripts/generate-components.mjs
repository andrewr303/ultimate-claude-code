import { main } from './cli.mjs';
process.exitCode = await main(['generate-components', ...process.argv.slice(2)]);
