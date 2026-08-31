import { registerProvider } from './provider';
import { ShiprocketProvider } from './shiprocket-provider';

// Register built-in providers. Add Delhivery/ExpressBees adapters here later
// without touching order logic.
registerProvider('shiprocket', async () => new ShiprocketProvider());

export * from './provider';
export { ShiprocketProvider } from './shiprocket-provider';
