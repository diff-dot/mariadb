import { MariadbHostOptions } from '../../../src/type/MariadbHostOptions';

export const hostOptions = {
  name: 'account',
  host: '127.0.0.1',
  user: 'test',
  password: 'test',
  acquireTimeout: 10000,
  connectionLimit: 15,
  namedPlaceholders: true
} as MariadbHostOptions;
