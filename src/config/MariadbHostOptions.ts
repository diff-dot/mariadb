import { PoolConfig } from 'mariadb';

export interface MariadbHostOptions extends PoolConfig {
  name: string;
}
