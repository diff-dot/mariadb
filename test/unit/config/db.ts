import { MariadbHostOptions } from '../../../src/type/MariadbHostOptions';

export const hostOptions = {
  name: 'account',
  host: '127.0.0.1',
  user: 'marlboro',
  password: 'gkdlvjakfejsglf!',
  acquireTimeout: 10000,
  connectionLimit: 15,
  namedPlaceholders: true
} as MariadbHostOptions;
