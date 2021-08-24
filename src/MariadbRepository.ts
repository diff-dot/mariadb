import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection } from 'mariadb';
import { getMariadbEntityOptions } from './decorator/MariadbEntity';
import { MariadbClient } from './MariaDBClient';
import { EntityReadSql, EntityWriteSql } from './sql';
import { OrderByMode } from './type/OrderByMode';
import { SqlWhereOperator } from './type/SqlWhereOperator';
import { WriteResult } from './type/WriteResult';

/**
 * Entity 를 Mariadb 에서 관리하기 위한 클래스
 */
export abstract class MariadbRepository extends Repository {
  protected async entity<T extends Entity, K extends keyof T>(args: {
    entityConstructor: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    connection?: PoolConnection;
    forUpdate?: boolean;
  }): Promise<Pick<T, K> | undefined> {
    const { entityConstructor, where, operator = 'AND', props, forUpdate = false } = args;

    const entityOptions = getMariadbEntityOptions(entityConstructor);
    const entitySql = new EntityReadSql(entityConstructor);

    const connections = args.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await connections.query(
        `SELECT ${entitySql.columns(props)} FROM ${entityOptions.tablePath} WHERE ${entitySql.whereEqual(where, operator)} LIMIT 1 ${
          forUpdate ? 'FOR UPDATE' : ''
        }`,
        where
      );

      if (!res.length) return undefined;
      return plainToClass(entityConstructor, res[0] as Record<string, unknown>);
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async entities<T extends Entity, K extends keyof T>(args: {
    entityConstructor: { new (...args: unknown[]): T };
    where?: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    order?: Partial<Record<keyof T, OrderByMode>>;
    offset?: number;
    size: number;
    connection?: PoolConnection;
  }): Promise<Pick<T, K>[]> {
    const { entityConstructor, where, operator = 'AND', props, order, offset = 0, size } = args;

    const entityOptions = getMariadbEntityOptions(entityConstructor);
    const entitySql = new EntityReadSql(entityConstructor);

    const connections = args.connection || (await MariadbClient.instance(entityOptions.host).connection());
    try {
      const res = await connections.query(
        `SELECT ${entitySql.columns(props)} FROM ${entityOptions.tablePath}
        ${where ? 'WHERE ' + entitySql.whereEqual(where, operator) : ''}
        ${order ? 'ORDER BY ' + entitySql.order(order) : ''}
        LIMIT ${offset}, ${size}`,
        where
      );

      const entities: Pick<T, K>[] = [];
      for (const row of res) {
        entities.push(plainToClass(entityConstructor, row));
      }

      return entities;
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async count<T extends Entity, K extends keyof T>(args: {
    entityConstructor: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    connection?: PoolConnection;
    forUpdate?: boolean;
  }): Promise<number> {
    const { entityConstructor, where, operator = 'AND', forUpdate = false } = args;

    const entityOptions = getMariadbEntityOptions(entityConstructor);
    const entitySql = new EntityReadSql(entityConstructor);

    const connections = args.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await connections.query(
        `SELECT COUNT(*) AS count FROM ${entityOptions.tablePath} WHERE ${entitySql.whereEqual(where, operator)} ${forUpdate ? 'FOR UPDATE' : ''}`,
        where
      );
      return res[0].count;
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async addEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entityOptions = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const connection = options.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entityOptions.tablePath}(${entitySql.columns()}) VALUES(${entitySql.valuesPlaceholder()})`,
        entitySql.values()
      );
      return res;
    } finally {
      if (!options.connection) await connection.release();
    }
  }

  protected async updateEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entityOptions = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const selectedConn = options.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await selectedConn.query(
        `UPDATE ${entityOptions.tablePath} SET ${entitySql.updatePlaceholder()} WHERE ${entitySql.whereById()}`,
        entitySql.values()
      );
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
    }
  }

  protected async deleteEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entityOptions = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const selectedConn = options.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await selectedConn.query(`DELETE FROM ${entityOptions.tablePath} WHERE ${entitySql.whereById()}`, entitySql.values());
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
    }
  }
}
