/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mariadb, { Pool, PoolConnection, QueryOptions } from 'mariadb';
import { MariadbHostOptions } from './type/MariadbHostOptions';

/**
 * 커넥션풀을 관리하는 싱글톤
 * 이후 클러스터 대응이 필요할 경우 별도 클래스로 구현
 */
export class MariadbClient {
  private static instances: Map<string, MariadbClient> = new Map();
  private options: MariadbHostOptions;
  private _pool?: Pool;

  private constructor(options: MariadbHostOptions) {
    this.options = options;
  }

  public static instance(options: MariadbHostOptions): MariadbClient {
    const hostName = options.name || `${options.host}:${options.user}`;

    let instance: MariadbClient | undefined = this.instances.get(hostName);
    if (!instance) {
      instance = new this(options);
      this.instances.set(hostName, instance);
      return instance;
    } else {
      return instance;
    }
  }

  public pool(): Pool {
    if (!this._pool) {
      this._pool = mariadb.createPool(this.options);
    }
    return this._pool;
  }

  public async connection(): Promise<PoolConnection> {
    const pool = this.pool();
    return await pool.getConnection();
  }

  public async query(sql: string | QueryOptions, values?: any): Promise<any> {
    const conn = await this.connection();
    try {
      return await conn.query(sql, values);
    } catch (e) {
      throw e;
    } finally {
      await conn.release();
    }
  }
}
