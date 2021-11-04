import { classToPlain } from 'class-transformer';
import { Entity, EntityIdOptions, getEntityIdProps } from '@diff./repository';
import { EntitySql } from './EntitySql';
import { getMariadbEntityOptions, MariadbEntityDescriptor } from '../decorator/MariadbEntity';
import { SqlComparisonOperator } from '../type/SqlComparisonOperator';
/**
 * Entity 의 insert 또는 update 에 사용할 SQL 쿼리 생성기
 *
 * < property 이름 자동 변환 >
 * - mariadb 는 컬럼명의 대소문자를 구분하지 않기 때문에, carmelcase 로 작성된 entity 의 property 이름을 snakecase 로 변환하여 처리
 * - classTransform 과정에서 property 의 이름의 변경될 경우 오류가 발생할 수 있으므로 @Expose 데코레이터 사용시 이름 변경 금지
 */
export class EntityWriteSql<T extends Entity, K extends keyof T> extends EntitySql {
  private readonly entity: T;
  public readonly entityOption: MariadbEntityDescriptor;
  private readonly placedValueMap: Record<string, unknown>;
  private readonly entityIdProps: Map<string, EntityIdOptions> | undefined; // entity id 정보
  private readonly propNames: string[]; // 값이 있는 모든 property 이름 목록
  private readonly columnIndex: Map<string, string>; // property 이름으로 으로 column 이름을 찾을 떄 사용할 인덱스
  private readonly propIndex: Map<string, string>; // column 이름으로 property 이름을 찾을 때 사용할 인덱스
  private readonly placeholderPrefix?: string; // placeholder 이름에 적용할 prefix

  constructor(entity: T, options: { placeholderPrefix?: string } = {}) {
    const { placeholderPrefix } = options;

    super();

    if (!(entity instanceof Entity)) throw new Error('ENTITY must be entity instance.');

    this.entity = entity;
    this.entityOption = getMariadbEntityOptions(entity);

    this.placeholderPrefix = placeholderPrefix;

    // entityId 정보 추출
    this.entityIdProps = getEntityIdProps(entity);

    // 저장가능한 형태로 변환하고 값이 지정되지 않은 property 삭제
    const plainValue = classToPlain(entity, { exposeUnsetFields: false });

    // property 목록 추출 및 필드명 인덱스 구축
    this.propNames = [];
    this.columnIndex = new Map();
    this.propIndex = new Map();
    this.placedValueMap = {};
    for (const propName of Object.keys(plainValue)) {
      this.placedValueMap[this.placeholder(propName)] = plainValue[propName];

      // 값이 있는 props 의 키 목록 추출
      this.propNames.push(propName);

      // 인덱스 구축
      this.columnIndex.set(propName, this.toSnakecase(propName));
      this.propIndex.set(this.toSnakecase(propName), propName);
    }

    if (!this.propNames.length) throw new Error('Entity converted to a plain object is empty.');
  }

  /**
   * entity id 로 사용되는 property 이름 목록
   */
  public get idPropNames(): string[] {
    const idPropNames: string[] = [];
    if (this.entityIdProps) {
      for (const [propName] of this.entityIdProps) {
        idPropNames.push(propName);
      }
    }
    return idPropNames;
  }

  /**
   * 값이 있는 컬럼의 이름 목록을 문자열로 반환
   * 예시 : column1, column2, column3, ...
   */
  public columns(): string {
    return `${this.propNames.map(p => this.columnIndex.get(p)).join(',')}`;
  }

  /**
   * insert sql에 사용할 값 이름 목록 생성
   * 예시 :column1, :column2
   */
  public insertColumns(): string {
    return `${this.propNames.map(p => ':' + this.placeholder(p)).join(',')}`;
  }

  /**
   * entityId 를 제외한 값 property 의 업데이트 SQL 조건
   * 예시 : value=:value,  value2=:value2
   */
  public updateColumns(): string {
    return this.propNames
      .filter(p => !this.idPropNames.includes(p))
      .map(p => `${this.columnIndex.get(p)}=:${this.placeholder(p)}`)
      .join(',');
  }

  /**
   * entity id 를 기준으로 한 업데이트에 사용할 WHERE 조건
   * 예시 : pk=:pk AND second_pk=:second_pk
   */
  public whereById(): string {
    // entityId 의 값이 있는지 확인
    for (const propName of this.idPropNames) {
      if (!this.placedValueMap[this.placeholder(propName)]) {
        throw new Error(`EntityId(${propName}) not defined to plained ${this.entity.constructor.name}`);
      }
    }
    return this.idPropNames.map(p => `${this.toSnakecase(p)}=:${this.placeholder(p)}`).join(' AND ');
  }

  public whereEqual(where: Partial<T>, options: { operator?: SqlComparisonOperator } = {}): string {
    const { operator = 'AND' } = options;

    if (!(where instanceof Entity)) throw new Error('WHERE condition must be entity instance.');
    const plainWhere = classToPlain(where, { exposeUnsetFields: false });

    const terms: string[] = [];
    for (const [prop, value] of Object.entries(plainWhere)) {
      const placeholder = this.placeholder(prop) + '_' + Object.keys(this.placedValueMap).length;

      // SQL 조건문 생성
      terms.push(`${this.toSnakecase(prop)}=:${placeholder}`);

      // SQL 조건문에 포함된 placeholder 를 대치할 값 저장
      this.placedValueMap[placeholder] = value;
    }

    return terms.join(` ${operator} `);
  }

  /**
   * 저장 가능한 형태의 값 목록을 반환
   * @returns
   */
  public placedValues(): Record<string, unknown> {
    return this.placedValueMap;
  }

  private placeholder(prop: string) {
    return this.placeholderPrefix ? this.placeholderPrefix + '_' + prop : prop;
  }

  public get tablePath(): string {
    return this.entityOption.tablePath;
  }
}
