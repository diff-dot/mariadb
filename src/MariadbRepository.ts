import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection } from 'mariadb';
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
    entityClass: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    connection?: PoolConnection;
    forUpdate?: boolean;
  }): Promise<Pick<T, K> | undefined> {
    const { entityClass, where, operator = 'AND', props, forUpdate = false } = args;

    const entitySql = new EntityReadSql(entityClass, { where });
    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await connections.query(
        `SELECT ${entitySql.columns(props)} FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual({ operator })} LIMIT 1 ${
          forUpdate ? 'FOR UPDATE' : ''
        }`,
        entitySql.whereValues()
      );

      if (!res.length) return undefined;
      return plainToClass(entityClass, res[0] as Record<string, unknown>);
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async entities<T extends Entity, K extends keyof T>(args: {
    entityClass: { new (...args: unknown[]): T };
    where?: Partial<T>;
    operator?: SqlWhereOperator;
    props: K[];
    order?: Partial<Record<keyof T, OrderByMode>>;
    offset?: number;
    size: number;
    connection?: PoolConnection;
  }): Promise<Pick<T, K>[]> {
    const { entityClass, where, operator = 'AND', props, order, offset = 0, size } = args;

    const entitySql = new EntityReadSql(entityClass, { where });

    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());
    try {
      const res = await connections.query(
        `SELECT ${entitySql.columns(props)} FROM ${entitySql.tablePath}
        ${where ? 'WHERE ' + entitySql.whereEqual({ operator }) : ''}
        ${order ? 'ORDER BY ' + entitySql.order(order) : ''}
        LIMIT ${offset}, ${size}`,
        entitySql.whereValues()
      );

      const entities: Pick<T, K>[] = [];
      for (const row of res) {
        entities.push(plainToClass(entityClass, row));
      }

      return entities;
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async count<T extends Entity, K extends keyof T>(args: {
    entityClass: { new (...args: unknown[]): T };
    where: Partial<T>;
    operator?: SqlWhereOperator;
    connection?: PoolConnection;
    forUpdate?: boolean;
  }): Promise<number> {
    const { entityClass, where, operator = 'AND', forUpdate = false } = args;

    const entitySql = new EntityReadSql(entityClass, { where });
    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await connections.query(
        `SELECT COUNT(*) AS count FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual({ operator })} ${forUpdate ? 'FOR UPDATE' : ''}`,
        entitySql.whereValues()
      );
      return res[0].count;
    } finally {
      if (!args.connection) await connections.release();
    }
  }

  protected async addEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);
    const connection = options.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.valuesPlaceholder()})`,
        entitySql.values()
      );
      return res;
    } finally {
      if (!options.connection) await connection.release();
    }
  }

  protected async updateEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);
    const selectedConn = options.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await selectedConn.query(
        `UPDATE ${entitySql.tablePath} SET ${entitySql.updatePlaceholder()} WHERE ${entitySql.whereById()}`,
        entitySql.values()
      );
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
    }
  }

  protected async deleteEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entitySql = new EntityWriteSql(entity);
    const selectedConn = options.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await selectedConn.query(`DELETE FROM ${entitySql.tablePath} WHERE ${entitySql.whereById()}`, entitySql.values());
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
    }
  }
}
