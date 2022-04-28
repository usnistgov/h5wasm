import {dirname} from "path";
globalThis.__dirname = dirname(import.meta.url);
import { createRequire } from 'module';
globalThis.require = createRequire(import.meta.url);
