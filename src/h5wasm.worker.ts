import * as Comlink from 'comlink'; 
import { api } from './lib_worker';

Comlink.expose(api);

