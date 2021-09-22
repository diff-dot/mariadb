import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection } from 'mariadb';
import { MariadbClient } from './MariaDBClient';
import { EntityReadSql, EntityWriteSql } from './sql';
import { OrderByProp } from './type/OrderByProp';
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

    const entitySql = new EntityReadSql(entityClass);
    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await connections.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual(where, { operator })} LIMIT 1 ${
          forUpdate ? 'FOR UPDATE' : ''
        }`,
        entitySql.placedValues()
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
    order?: OrderByProp<T>;
    offset?: number;
    size?: number;
    connection?: PoolConnection;
  }): Promise<Pick<T, K>[]> {
    const { entityClass, where, operator = 'AND', props, order, offset = 0, size } = args;

    const entitySql = new EntityReadSql(entityClass);

    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());
    try {
      const res = await connections.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath}
        ${where ? 'WHERE ' + entitySql.whereEqual(where, { operator }) : ''}
        ${order ? 'ORDER BY ' + entitySql.order(order) : ''}
        ${size ? 'LIMIT ' + entitySql.limit({ offset, size }) : ''}`,
        entitySql.placedValues()
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

    const entitySql = new EntityReadSql(entityClass);
    const connections = args.connection || (await MariadbClient.instance(entitySql.host).connection());

    try {
      const res = await connections.query(
        `SELECT COUNT(*) AS count FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual(where, { operator })} ${forUpdate ? 'FOR UPDATE' : ''}`,
        entitySql.placedValues()
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
        `INSERT INTO ${entitySql.tablePath}(${entitySql.columns()}) VALUES(${entitySql.props()})`,
        entitySql.placedValues()
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
        `UPDATE ${entitySql.tablePath} SET ${entitySql.updateProps()} WHERE ${entitySql.whereById()}`,
        entitySql.placedValues()
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
      const res = await selectedConn.query(`DELETE FROM ${entitySql.tablePath} WHERE ${entitySql.whereById()}`, entitySql.placedValues());
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
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
