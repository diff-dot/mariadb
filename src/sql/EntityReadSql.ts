import { Entity } from '@diff./repository';
import { classToPlain } from 'class-transformer';
import { MariadbHostOptions } from '../config';
import { getMariadbEntityOptions, MariadbEntityDescriptor } from '../decorator/MariadbEntity';
import { OrderByMode } from '../type/OrderByMode';
import { SqlWhereOperator } from '../type/SqlWhereOperator';
import { EntitySql } from './EntitySql';

export class EntityReadSql<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>> extends EntitySql {
  private readonly entityClass: T;
  public readonly entityOption: MariadbEntityDescriptor;
  private readonly tableAlias?: string;
  private readonly plainWhere?: Record<string, unknown>;

  constructor(entityClass: T, options: { where?: Partial<InstanceType<T>>; tableAlias?: string }) {
    const { where, tableAlias } = options;

    super();

    this.entityClass = entityClass;
    this.entityOption = getMariadbEntityOptions(entityClass);
    this.tableAlias = tableAlias;

    if (where) {
      if (!(where instanceof Entity)) throw new Error('WHERE condition must be entity instance.');
      this.plainWhere = classToPlain(where, { exposeUnsetFields: false });
    }
  }

  /**
   * 프로퍼티명으로 alias가 지정된 컬럼이름 목록을 반환
   * 예시 : data_column1 AS dataColumn1, data_column2 AS dataColumn2 ...
   *
   * @param props
   * @param includeColumnAlias column alias 포함
   */
  public columns(props: K[], options: { alias?: boolean } = {}): string {
    const { alias = true } = options;
    return `${props.map(p => this.column(p, { alias: alias })).join(',')}`;
  }

  /**
   * 프로퍼티명으로 alias가 지정된 컬럼이름을 반환
   *
   * @param props
   * @param includeColumnAlias column alias 포함
   */
  public column(prop: K, options: { alias?: boolean } = {}): string {
    const { alias = true } = options;
    return `${this.tableAlias ? this.tableAlias + '.' : ''}${this.toSnakecase(prop.toString())}${alias ? ' AS ' + prop : ''}`;
  }

  public order(condition: Partial<Record<K, OrderByMode>>): string {
    return Object.entries(condition)
      .map(prop => `${this.column(prop[0] as K, { alias: false })} ${prop[1]}`)
      .join(',');
  }

  public whereEqual(args: { operator?: SqlWhereOperator } = {}): string {
    const { operator = 'AND' } = args;
    if (!this.plainWhere) throw new Error('Entity where condition not defined.');

    const sql = Object.keys(this.plainWhere)
      .map(prop => `${this.column(prop as K, { alias: false })}=:${this.valueAlias(prop)}`)
      .join(` ${operator} `);
    return sql;
  }

  public whereValues(): Record<string, unknown> {
    if (!this.plainWhere) throw new Error('Entity where condition not defined.');

    if (this.tableAlias) {
      const values: Record<string, unknown> = {};
      for (const prop of Object.keys(this.plainWhere)) {
        values[this.valueAlias(prop)] = this.plainWhere[prop];
      }
      return values;
    } else {
      return this.plainWhere;
    }
  }

  private valueAlias(prop: string) {
    return this.tableAlias ? this.tableAlias + '_' + prop : prop;
  }

  public get tablePath(): string {
    return this.entityOption.tablePath + (this.tableAlias ? ' AS `' + this.tableAlias + '`' : '');
  }

  public get host(): MariadbHostOptions {
    return this.entityOption.host;
  }
}
