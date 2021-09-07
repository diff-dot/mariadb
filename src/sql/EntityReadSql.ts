import { Entity } from '@diff./repository';
import { classToPlain } from 'class-transformer';
import { OrderByMode } from '../type/OrderByMode';
import { SqlWhereOperator } from '../type/SqlWhereOperator';
import { EntitySql } from './EntitySql';

export class EntityReadSql<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>> extends EntitySql {
  private readonly entityConstructor: T;
  private readonly plainWhere: Record<string, unknown>;
  constructor(entityConstructor: T, where?: Partial<InstanceType<T>>) {
    super();

    this.entityConstructor = entityConstructor;
    if (where) {
      this.plainWhere = classToPlain(where, { exposeUnsetFields: false });
    }
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

  public whereEqual(args: { operator?: SqlWhereOperator; tableAlias?: string } = {}): string {
    const { operator = 'AND', tableAlias } = args;
    if (!this.plainWhere) throw new Error('Entity where condition not defined.');

    const sql = Object.keys(this.plainWhere)
      .map(propName => `${tableAlias ? tableAlias + '.' : ''}${this.toSnakecase(propName)}=:${propName}`)
      .join(` ${operator} `);
    return sql;
  }

  public whereValues(): Record<string, unknown> {
    if (!this.plainWhere) throw new Error('Entity where condition not defined.');
    return this.plainWhere;
  }
}
