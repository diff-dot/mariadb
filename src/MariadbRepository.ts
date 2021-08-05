import { Entity, Repository } from '@diff./repository';
import { plainToClass } from 'class-transformer';
import { getMariadbEntityOptions } from './decorator/MariadbEntity';
import { EntitySql } from './EntitySql';
import { MariadbClient } from './MariaDBClient';

/**
 * Entity 를 Mariadb 에서 관리하기 위한 클래스
 */
export abstract class MariadbRepository extends Repository {
  protected async addEntity(entity: Entity): Promise<boolean> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntitySql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `INSERT INTO ${options.db}.${options.table}(${entitySql.columns()}) VALUES(${entitySql.valuesPlaceholder()})`,
      entitySql.values()
    );
    return res.affectedRows === 1;
  }

  protected async entity<T extends Entity>(args: {
    entityClass: { new (...args: unknown[]): T };
    entity: Entity;
    props: string[];
  }): Promise<T | undefined> {
    const { entity, entityClass, props } = args;

    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntitySql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `SELECT ${entitySql.propColumns({ props, alias: true })} FROM ${options.db}.${options.table} WHERE ${entitySql.whereById()}`,
      entitySql.values()
    );

    if (!res.length) return undefined;
    return plainToClass(entityClass, res[0] as Record<string, unknown>);
  }

  protected async updateEntity(entity: Entity): Promise<boolean> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntitySql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `UPDATE ${options.db}.${options.table} SET ${entitySql.updatePlaceholder()} WHERE ${entitySql.whereById()}`,
      entitySql.values()
    );

    return res.affectedRows === 1;
  }

  protected async deleteEntity(entity: Entity): Promise<boolean> {
    const options = getMariadbEntityOptions(entity);
    const entitySql = new EntitySql(entity);

    const res = await MariadbClient.instance(options.host).query(
      `DELETE FROM ${options.db}.${options.table} WHERE ${entitySql.whereById()}`,
      entitySql.values()
    );

    return res.affectedRows === 1;
  }
}
