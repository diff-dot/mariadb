import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { getMariadbEntityOptions } from './decorator/MariadbEntity';
import { MariadbClient } from './MariaDBClient';
import { EntityReadSql, EntityWriteSql } from './sql';
import { SqlWhereOperator } from './type/SqlWhereOperator';
import { WriteResult } from './type/WriteResult';

/**
 * Entity 를 Mariadb 에서 관리하기 위한 클래스
 */
export abstract class MariadbRepository extends Repository {
  protected async addEntity(entity: Entity): Promise<WriteResult> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `INSERT INTO ${options.db}.${options.table}(${entitySql.columns()}) VALUES(${entitySql.valuesPlaceholder()})`,
      entitySql.values()
    );
    return res;
  }

  protected async entity<T extends Entity, K extends keyof T>(args: {
    entityConstructor: { new (...args: unknown[]): T };
    where: { values: Partial<T>; operator?: SqlWhereOperator };
    props: K[];
  }): Promise<Pick<T, K> | undefined> {
    const { entityConstructor, props, where: condition } = args;

    const options = getMariadbEntityOptions(entityConstructor);
    const entitySql = new EntityReadSql(entityConstructor);

    const res = await MariadbClient.instance(options.host).query(
      `SELECT ${entitySql.columns({ props })} FROM ${options.db}.${options.table} WHERE ${entitySql.whereEqual(condition)} LIMIT 1`,
      condition.values
    );

    if (!res.length) return undefined;
    return plainToClass(entityConstructor, res[0] as Record<string, unknown>);
  }

  protected async updateEntity(entity: Entity): Promise<WriteResult> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `UPDATE ${options.db}.${options.table} SET ${entitySql.updatePlaceholder()} WHERE ${entitySql.whereById()}`,
      entitySql.values()
    );

    return res;
  }

  protected async deleteEntity(entity: Entity): Promise<WriteResult> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntityWriteSql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `DELETE FROM ${options.db}.${options.table} WHERE ${entitySql.whereById()}`,
      entitySql.values()
    );

    return res;
  }
}
