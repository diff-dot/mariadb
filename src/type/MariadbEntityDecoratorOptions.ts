import { MariadbHostOptions } from './MariadbHostOptions';

export interface MariadbEntityDecoratorOptions {
  db: string;
  table: string;
  host: MariadbHostOptions;
}
