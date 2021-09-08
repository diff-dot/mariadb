import { MariadbHostOptions } from '../config/MariadbHostOptions';

export interface MariadbEntityDecoratorOptions {
  db: string;
  table: string;
  host: MariadbHostOptions;
}
