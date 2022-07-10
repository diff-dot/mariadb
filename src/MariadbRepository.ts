import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection, QueryOptions } from 'mariadb';
import { MariadbHostOptions } from './config/MariadbHostOptions';
import { MariadbClient } from './MariadbClient';
import { EntityReadSql, EntityWriteSql } from './sql';
import { ReadMethodOptions } from './type';
import { Limit } from './type/Limit';
import { OrderByProp } from './type/OrderByProp';
import { SqlComparisonExpr } from './type/SqlComparisonExpr';
import { WriteMethodOptions } from './type/WriteMethodOptions';
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

  protected async entity<T extends Entity, K extends keyof T>(
    entityConstructor: { new (...args: unknown[]): T },
    props: K[],
    where: SqlComparisonExpr<keyof T> | undefined | null,
    options: ReadMethodOptions = {}
  ): Promise<Pick<T, K> | undefined> {
    const { lock } = options;
    const entitySql = new EntityReadSql(entityConstructor);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `SELECT ${entitySql.select(props)}
        FROM ${entitySql.tablePath}
        ${where ? `WHERE ${entitySql.where(where)}` : ''}
        LIMIT 1 ${lock ? entitySql.rowLevelLock(lock) : ''}`,
        entitySql.placedValues()
      );

      if (!res.length) return undefined;
      return plainToClass(entityConstructor, res[0] as Record<string, unknown>, { exposeUnsetFields: false });
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async entities<T extends Entity, K extends keyof T>(
    entityConstructor: { new (...args: unknown[]): T },
    props: K[],
    where: SqlComparisonExpr<keyof T> | undefined | null,
    order: OrderByProp<T> | undefined | null,
    limit?: Limit | null,
    options: ReadMethodOptions = {}
  ): Promise<Pick<T, K>[]> {
    const entitySql = new EntityReadSql(entityConstructor);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const cons: string[] = [];
      if (where) cons.push('WHERE ' + entitySql.where(where));
      if (order) cons.push('ORDER BY ' + entitySql.order(order));
      if (limit) cons.push(entitySql.limit(limit));
      if (options.lock) cons.push(entitySql.rowLevelLock(options.lock));

      const res = await connection.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath}
        ${cons.join(' ')}`,
        entitySql.placedValues()
      );

      const entities: Pick<T, K>[] = [];
      for (const row of res) {
        entities.push(plainToClass(entityConstructor, row, { exposeUnsetFields: false }));
      }

      return entities;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async count<T extends Entity>(
    entityConstructor: { new (...args: unknown[]): T },
    where: SqlComparisonExpr<keyof T> | undefined | null,
    options: ReadMethodOptions = {}
  ): Promise<number> {
    const { lock } = options;
    const entitySql = new EntityReadSql(entityConstructor);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `SELECT COUNT(*) AS count FROM ${entitySql.tablePath}
        ${where ? `WHERE ${entitySql.where(where)}` : ''}
        ${lock ? entitySql.rowLevelLock(lock) : ''}`,
        entitySql.placedValues()
      );
      return res[0].count;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async addEntity(entity: Entity, options: WriteMethodOptions = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.insertColumns()})`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await connection.release();
    }
  }

  /**
   * EntityId 를 기준으로 update / insert
   *
   * @param args.entity
   * @param args.updateEntity 업데이트 수행시 변경할 데이터를 별도 지정하길 희망할 경우, 미지정시 entity 에 정의된 모든 데이터 반영
   * @param options
   * @returns
   */
  protected async upsertEntity(entity: Entity, options: { updateEntity?: Entity } & WriteMethodOptions): Promise<WriteResult> {
    const { updateEntity } = options;

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const entitySql = new EntityWriteSql(entity);
      if (updateEntity) {
        // insert 할 데이터와 update 할 데이터가 별도 지정된 경우
        const updateEntitySql = new EntityWriteSql(updateEntity, { placeholderPrefix: 'update_' });
        const res = await connection.query(
          `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.insertColumns()})
          ON DUPLICATE KEY UPDATE ${updateEntitySql.updateColumns()}`,
          { ...entitySql.placedValues(), ...updateEntitySql.placedValues() }
        );
        return res;
      } else {
        const res = await connection.query(
          `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.insertColumns()})
          ON DUPLICATE KEY UPDATE ${entitySql.updateColumns()}`,
          entitySql.placedValues()
        );
        return res;
      }
    } finally {
      if (localConnection) await connection.release();
    }
  }

  protected async updateEntity(entity: Entity, options: WriteMethodOptions = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `UPDATE ${entitySql.tablePath} SET ${entitySql.updateColumns()} WHERE ${entitySql.whereId()}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async updateEntities<T extends Entity>(
    set: T,
    where: SqlComparisonExpr<keyof T>,
    options: WriteMethodOptions = {}
  ): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(set);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `UPDATE ${entitySql.tablePath}
        SET ${entitySql.updateColumns()}
        WHERE ${entitySql.where(where)}`,
        entitySql.placedValues()
      );
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async deleteEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(`DELETE FROM ${entitySql.tablePath} WHERE ${entitySql.whereId()}`, entitySql.placedValues());
      return res;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }

  protected async deleteEntities<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>>(
    entityConstructor: T,
    where: SqlComparisonExpr<K>,
    options: WriteMethodOptions = {}
  ): Promise<WriteResult> {
    const entitySql = new EntityReadSql(entityConstructor);

    let localConnection: PoolConnection | undefined;
    const connection = options.connection ? options.connection : (localConnection = await this.client.connection());

    try {
      const res = await connection.query(
        `DELETE FROM ${entitySql.tablePath}
        WHERE ${entitySql.where(where)}`,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async query(sql: string | QueryOptions, values?: Record<string, unknown>, connection?: PoolConnection): Promise<any> {
    let localConnection: PoolConnection | undefined;
    const sourceConnection = connection || (localConnection = await this.client.connection());

    try {
      return await sourceConnection.query(sql, values);
    } catch (e) {
      throw e;
    } finally {
      if (localConnection) await localConnection.release();
    }
  }
}
