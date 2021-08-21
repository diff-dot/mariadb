import { Entity } from '@diff./repository';
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
  public columns(props: K[]): string {
    return `${props.map(p => `${this.toSnakecase(p.toString())} AS ${p}`).join(',')}`;
  }

  public whereEqual(values: Partial<InstanceType<T>>, operator?: SqlWhereOperator): string {
    return Object.keys(values)
      .map(propName => `${this.toSnakecase(propName)}=:${propName}`)
      .join(` ${operator} `);
  }
}
