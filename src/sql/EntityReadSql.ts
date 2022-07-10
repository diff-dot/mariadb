import { Entity } from '@diff./repository';
import { getMariadbEntityOptions, MariadbEntityDescriptor } from '../decorator/MariadbEntity';
import { EntityRange } from '../type';
import { OrderByMode } from '../type/OrderByMode';
import { RowLevelLockMode } from '../type/RowLevelLockMode';
import { EntitySql } from './EntitySql';

export class EntityReadSql<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>> extends EntitySql<T, K> {
  public readonly entityOption: MariadbEntityDescriptor;
  private readonly tableAlias?: string;

  constructor(entityConstructor: T, options: { tableAlias?: string } = {}) {
    const { tableAlias } = options;
    super(entityConstructor);

    this.entityOption = getMariadbEntityOptions(entityConstructor);
    this.tableAlias = tableAlias;
  }

  /**
   * 프로퍼티명으로 alias가 지정된 컬럼이름 목록을 반환
   * 예시 : data_column1 AS dataColumn1, data_column2 AS dataColumn2 ...
   *
   * @param props
   * @param options.tableAliasPrefix 테이블 alias 가 있을 경우 프로퍼티 이름의 prefix로 적용
   * @param options.alias 칼 컬럼의 alias 를 별도 지정, 지정되지 않은 컬럼은 프로퍼티명을 사용
   */
  public select(props: K[], options: { tableAliasPrefix?: boolean; alias?: Partial<Record<K, string>> } = {}): string {
    const { tableAliasPrefix, alias } = options;
    const propPrefix = tableAliasPrefix && this.tableAlias ? this.tableAlias + '_' : '';
    return props
      .map(prop => {
        const columnAlias = propPrefix + (alias && alias[prop] ? alias[prop] : prop);
        return `${this.tableAlias ? this.tableAlias + '.' : ''}${this.toSnakecase(prop.toString())}${' AS ' + columnAlias}`;
      })
      .join(',');
  }

  /**
   * 프로퍼티의 컬럼 이름 반환
   *
   * @param prop
   */
  public column(prop: K): string {
    return `${this.tableAlias ? this.tableAlias + '.' : ''}${this.toSnakecase(prop.toString())}`;
  }

  public order(condition: Partial<Record<K, OrderByMode>>): string {
    return Object.entries(condition)
      .map(prop => `${this.column(prop[0] as K)} ${prop[1]}`)
      .join(',');
  }

  public range(range: EntityRange) {
    if (typeof range === 'number') {
      return `LIMIT ${range}`;
    } else {
      const cons: string[] = [];
      if (range.size) cons.push(`LIMIT ${range.size}`);
      if (range.offset) cons.push(`OFFSET ${range.offset}`);
      return cons.join(' ');
    }
  }

  public rowLevelLock(mode: RowLevelLockMode) {
    if (mode === 'shared') return 'LOCK IN SHARE MODE';
    else if (mode === 'exclusive') return 'FOR UPDATE';
    else {
      throw new Error('Unsupport row level lock mode : ' + mode);
    }
  }

  protected placeholder(prop: K): string {
    return this.tableAlias ? this.tableAlias + '_' + prop.toString() : prop.toString();
  }

  public get tablePath(): string {
    return this.entityOption.tablePath + (this.tableAlias ? ' AS `' + this.tableAlias + '`' : '');
  }
}
