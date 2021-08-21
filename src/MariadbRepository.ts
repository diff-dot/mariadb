import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { PoolConnection } from 'mariadb';
import { getMariadbEntityOptions } from './decorator/MariadbEntity';
import { MariadbClient } from './MariaDBClient';
import { EntityReadSql, EntityWriteSql } from './sql';
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
        `SELECT ${entitySql.columns(props)} FROM ${entityOptions.db}.${entityOptions.table} WHERE ${entitySql.whereEqual(where, operator)} LIMIT 1 ${
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

  protected async addEntity(entity: Entity, options: { connection?: PoolConnection } = {}): Promise<WriteResult> {
    const entityOptions = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const connection = options.connection || (await MariadbClient.instance(entityOptions.host).connection());

    try {
      const res = await connection.query(
        `INSERT INTO ${entityOptions.db}.${entityOptions.table}(${entitySql.columns()}) VALUES(${entitySql.valuesPlaceholder()})`,
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
        `UPDATE ${entityOptions.db}.${entityOptions.table} SET ${entitySql.updatePlaceholder()} WHERE ${entitySql.whereById()}`,
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
      const res = await selectedConn.query(
        `DELETE FROM ${entityOptions.db}.${entityOptions.table} WHERE ${entitySql.whereById()}`,
        entitySql.values()
      );
      return res;
    } finally {
      if (!options.connection) await selectedConn.release();
    }
  }
}
