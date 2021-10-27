import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection } from 'mariadb';
import { MariadbHostOptions } from './config/MariadbHostOptions';
import { MariadbClient } from './MariadbClient';
import { EntityReadSql, EntityWriteSql } from './sql';
import { OrderByProp } from './type/OrderByProp';
import { RowLevelLockMode } from './type/RowLevelLockMode';
import { SqlWhereOperator } from './type/SqlWhereOperator';
import { WriteResult } from './type/WriteResult';

/**
 * Entity 를 Mariadb 에서 관리하기 위한 클래스
 */
export abstract class MariadbRepository extends Repository {
  protected readonly client: MariadbClient;
  constructor(args: { host?: MariadbHostOptions } = {}) {
    super();
    const { host } = args;

    this.client = MariadbClient.instance(host || this.defaultHost());
  }

  protected abstract defaultHost(): MariadbHostOptions;

  protected async entity<T extends Entity, K extends keyof T>(args: {
    entityClass: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    connection?: PoolConnection;
    lock?: RowLevelLockMode;
  }): Promise<Pick<T, K> | undefined> {
    const { entityClass, where, operator = 'AND', props, lock } = args;
    const entitySql = new EntityReadSql(entityClass);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = args.connection ? args.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual(where, { operator })} LIMIT 1 ${
          lock ? entitySql.rowLevelLock(lock) : ''
        }`,
        entitySql.placedValues()
      );

      if (!res.length) return undefined;
      return plainToClass(entityClass, res[0] as Record<string, unknown>, { exposeUnsetFields: false });
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async entities<T extends Entity, K extends keyof T>(args: {
    entityClass: { new (...args: unknown[]): T };
    where?: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    order?: OrderByProp<T>;
    offset?: number;
    size?: number;
    connection?: PoolConnection;
    lock?: RowLevelLockMode;
  }): Promise<Pick<T, K>[]> {
    const { entityClass, where, operator = 'AND', props, order, offset = 0, size, lock } = args;
    const entitySql = new EntityReadSql(entityClass);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = args.connection ? args.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath}
        ${where ? 'WHERE ' + entitySql.whereEqual(where, { operator }) : ''}
        ${order ? 'ORDER BY ' + entitySql.order(order) : ''}
        ${size ? 'LIMIT ' + entitySql.limit({ offset, size }) : ''}
        ${lock ? entitySql.rowLevelLock(lock) : ''}`,
        entitySql.placedValues()
      );

      const entities: Pick<T, K>[] = [];
      for (const row of res) {
        entities.push(plainToClass(entityClass, row, { exposeUnsetFields: false }));
      }

      return entities;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async count<T extends Entity, K extends keyof T>(args: {
    entityClass: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    connection?: PoolConnection;
    lock?: RowLevelLockMode;
  }): Promise<number> {
    const { entityClass, where, operator = 'AND', lock } = args;
    const entitySql = new EntityReadSql(entityClass);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = args.connection ? args.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `SELECT COUNT(*) AS count FROM ${entitySql.tablePath}
        WHERE ${entitySql.whereEqual(where, { operator })}
        ${lock ? entitySql.rowLevelLock(lock) : ''}`,
        entitySql.placedValues()
      );
      return res[0].count;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async addEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.props()})`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await connection.release();
    }
  }

  /**
   * EntityId 를 기준으로 update / insert
   * @param entity
   * @param options
   * @returns
   */
  protected async upsertEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.props()})
        ON DUPLICATE KEY UPDATE ${entitySql.updateProps()}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await connection.release();
    }
  }

  protected async updateEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `UPDATE ${entitySql.tablePath} SET ${entitySql.updateProps()} WHERE ${entitySql.whereById()}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async updateEntities<T extends Entity>(
    set: Partial<T>,
    where: Partial<T>,
    options: { connection?: PoolConnection } = {}
  ): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(set);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `UPDATE ${entitySql.tablePath}
        SET ${entitySql.updateProps()}
        WHERE ${entitySql.whereEqual(where)}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async deleteEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(`DELETE FROM ${entitySql.tablePath} WHERE ${entitySql.whereById()}`, entitySql.placedValues());
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async deleteEntities<T extends Entity>(where: Partial<T>, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(where);

    let localConnection: PoolConnection | undefined = undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `DELETE FROM ${entitySql.tablePath}
        WHERE ${entitySql.whereEqual(where)}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  /**
   * tableAlias 를 prefix 로 가지는 property 들을 tableAlias에 따라 분류하여 반환
   */
  protected groupingPropByTableAlias<K extends string>(
    record: Record<string, unknown>,
    prefixes: K[],
    delimiter = '_'
  ): Record<K, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    for (const propName of Object.keys(record)) {
      const delimiterPos = propName.indexOf(delimiter);

      const prefix = delimiterPos != -1 ? propName.substr(0, delimiterPos) : undefined;
      if (!prefix || !prefixes.includes(prefix as K)) continue;

      const orgPropName = propName.substr(delimiterPos + delimiter.length);
      if (!result[prefix]) result[prefix] = {};
      result[prefix][orgPropName] = record[propName];
    }

    return result as Record<K, Record<string, unknown>>;
  }
}
