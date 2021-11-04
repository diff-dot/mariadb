import { Entity } from '@diff./repository';
import { classToPlain } from 'class-transformer';
import { isSqlComparisonExprGroup, SqlComparisonExpr } from '../type/SqlComparisonExpr';
import { SqlComparisonOperator } from '../type/SqlComparisonOperator';

/**
 * EntityWrite, Read Sql 클래스에서 사용할 공통 메소드 정의
 */
export abstract class EntitySql<T extends new (...args: unknown[]) => Entity, K extends keyof InstanceType<T>> {
  // comparison 조건에 사용할 serialized 된 값을 placeholder 이름으로 팹핑하여 관리할 변수
  protected readonly placedValueMap: Record<string, unknown>;
  protected readonly entityConstructor: T;

  protected constructor(entityConstructor: T) {
    this.entityConstructor = entityConstructor;
    this.placedValueMap = {};
  }

  /**
   * carmel case 로 작성된 컬럼명, 테이블명,db 명을 자동으로 snake case 로 변환
   *
   * @param str
   * @returns
   */
  protected toSnakecase(str: string): string {
    let result = '';
    let beforeCharCase: 'lower' | 'upper' = 'lower';

    for (let i = 0; i < str.length; i++) {
      const char = str.charAt(i);
      const lowerChar = char.toLowerCase();
      const charCase: 'lower' | 'upper' = char !== lowerChar ? 'upper' : 'lower';

      /**
       * 소문자 문자 뒤에 대문자가 발견된 경우 _ 를 추가
       *
       * < 예시 >
       * memberUid -> member_uid
       * memberUID -> member_uid
       */
      if (i !== 0 && charCase === 'upper' && beforeCharCase === 'lower') {
        result += '_';
      }

      result += lowerChar;
      beforeCharCase = charCase;
    }
    return result;
  }

  /**
   * 저장 가능한 형태의 값 목록을 반환
   * @returns
   */
  public placedValues(): Record<string, unknown> {
    return this.placedValueMap;
  }

  /**
   * DB 저장을 위해 serialize 한 값을 반환
   *
   * @param prop
   * @param value
   * @returns
   */
  public serializeValue(prop: K, value: unknown): unknown {
    const entity = new this.entityConstructor();
    Object.assign(entity, { [prop + '']: value });
    const serializedEntity = classToPlain(entity, { exposeUnsetFields: false });
    return serializedEntity[prop + ''];
  }

  /**
   * where 쿼리 반환
   */
  public where(where: SqlComparisonExpr<K>): string {
    const terms: string[] = [];
    if (isSqlComparisonExprGroup(where)) {
      for (const exp of where.exprs) {
        if (isSqlComparisonExprGroup(exp)) {
          terms.push(` (${this.where(exp)}) `);
        } else {
          terms.push(this.comparison(exp.prop, exp.op || '=', exp.value));
        }
      }
    } else {
      terms.push(this.comparison(where.prop, where.op || '=', where.value));
    }

    return terms.join(` ${where.op || 'AND'} `);
  }

  /**
   * 비교 표현식 반환
   */
  public comparison(prop: K, op: SqlComparisonOperator, value: unknown): string {
    const serializedValue = this.serializeValue(prop, value);

    const placeholder = this.placeholder(prop) + '_' + Object.keys(this.placedValueMap).length;
    this.placedValueMap[placeholder] = serializedValue;

    if (op === 'IN') {
      if (Array.isArray(value)) {
        const terms: string[] = [];
        for (const item of value as unknown[]) {
          terms.push(this.comparison(prop, '=', item));
        }
        return `(${terms.join(' OR ')})`;
      } else {
        return `${this.column(prop)}=:${placeholder}`;
      }
    } else {
      return `${this.column(prop)}${op}:${placeholder}`;
    }
  }

  public eq(prop: K, value: unknown): string {
    return this.comparison(prop, '=', value);
  }

  public gt(prop: K, value: unknown): string {
    return this.comparison(prop, '>', value);
  }

  public gte(prop: K, value: unknown): string {
    return this.comparison(prop, '>=', value);
  }

  public lt(prop: K, value: unknown): string {
    return this.comparison(prop, '<', value);
  }

  public lte(prop: K, value: unknown): string {
    return this.comparison(prop, '<=', value);
  }

  public not(prop: K, value: unknown): string {
    return this.comparison(prop, '<>', value);
  }

  public in(prop: K, values: unknown[]): string {
    return this.comparison(prop, 'IN', values);
  }

  /**
   * 프로퍼티의 placeholder 이름 반환
   */
  protected abstract placeholder(prop: K): string;

  /**
   * dbName.tableName 반환
   */
  public abstract get tablePath(): string;

  /**
   * 프로퍼티의 컬럼명 반환
   */
  public abstract column(prop: K): string;
}
