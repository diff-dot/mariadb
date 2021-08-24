import { Entity } from '@diff./repository';
import { OrderByMode } from '../type/OrderByMode';
import { SqlWhereOperator } from '../type/SqlWhereOperator';
import { EntitySql } from './EntitySql';

export class EntityReadSql<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>> extends EntitySql {
  private readonly entityConstructor: T;
  constructor(entityConstructor: T) {
    super();

    this.entityConstructor = entityConstructor;
  }

  /**
   * 프로퍼티명으로 이름이 지정된 컬럼이름 목록을 반환
   * 예시 : data_column1 AS dataColumn1, data_column2 AS dataColumn2 ...
   *
   * @returns
   */
  public columns(props: K[], tableAlias?: string): string {
    return `${props.map(p => `${tableAlias ? tableAlias + '.' : ''}${this.toSnakecase(p.toString())} AS ${p}`).join(',')}`;
  }

  public order(condition: Partial<Record<K, OrderByMode>>, tableAlias?: string): string {
    return Object.entries(condition)
      .map(prop => `${tableAlias ? tableAlias + '.' : ''}${this.toSnakecase(prop[0])} ${prop[1]}`)
      .join(',');
  }

  public whereEqual(values: Partial<InstanceType<T>>, operator?: SqlWhereOperator): string {
    return Object.keys(values)
      .map(propName => `${this.toSnakecase(propName)}=:${propName}`)
      .join(` ${operator} `);
  }
}
