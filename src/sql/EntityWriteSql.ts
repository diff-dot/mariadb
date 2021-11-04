import { classToPlain } from 'class-transformer';
import { Entity, EntityIdOptions, getEntityIdProps } from '@diff./repository';
import { EntitySql } from './EntitySql';
import { getMariadbEntityOptions, MariadbEntityDescriptor } from '../decorator/MariadbEntity';
import { SqlComparisonExprItem } from '..';
/**
 * Entity 의 insert 또는 update 에 사용할 SQL 쿼리 생성기
 *
 * < property 이름 자동 변환 >
 * - mariadb 는 컬럼명의 대소문자를 구분하지 않기 때문에, carmelcase 로 작성된 entity 의 property 이름을 snakecase 로 변환하여 처리
 * - classTransform 과정에서 property 의 이름의 변경될 경우 오류가 발생할 수 있으므로 @Expose 데코레이터 사용시 이름 변경 금지
 */
export class EntityWriteSql<T extends Entity, K extends keyof T, C extends new (...args: unknown[]) => T> extends EntitySql<C, K> {
  private readonly entity: T;
  public readonly entityOption: MariadbEntityDescriptor;
  private readonly entityIdProps: Map<K, EntityIdOptions> | undefined; // entity id 정보
  private readonly props: K[]; // 값이 있는 모든 property 이름 목록
  private readonly columnIndex: Map<K, string>; // property 이름으로 으로 column 이름을 찾을 떄 사용할 인덱스
  private readonly propIndex: Map<string, K>; // column 이름으로 property 이름을 찾을 때 사용할 인덱스
  private readonly placeholderPrefix?: string; // placeholder 이름에 적용할 prefix

  constructor(entity: T, options: { placeholderPrefix?: string } = {}) {
    const { placeholderPrefix } = options;
    super(entity.constructor as C);

    if (!(entity instanceof Entity)) throw new Error('ENTITY must be entity instance.');

    this.entity = entity;
    this.entityOption = getMariadbEntityOptions(entity);

    this.placeholderPrefix = placeholderPrefix;

    // entityId 정보 추출
    this.entityIdProps = getEntityIdProps(entity);

    // 저장가능한 형태로 변환하고 값이 지정되지 않은 property 삭제
    const serializedEntity = classToPlain(entity, { exposeUnsetFields: false }) as Record<K, unknown>;

    // property 목록 추출 및 필드명 인덱스 구축
    this.props = [];
    this.columnIndex = new Map();
    this.propIndex = new Map();
    for (const prop of Object.keys(serializedEntity) as K[]) {
      this.placedValueMap[this.placeholder(prop)] = serializedEntity[prop];

      // 값이 있는 props 의 키 목록 추출
      this.props.push(prop);

      // 인덱스 구축
      this.columnIndex.set(prop, this.toSnakecase(prop.toString()));
      this.propIndex.set(this.toSnakecase(prop.toString()), prop);
    }

    if (!this.props.length) throw new Error('Entity converted to a serialized object is empty.');
  }

  /**
   * entity id 로 사용되는 property 이름 목록
   */
  public get idProps(): K[] {
    const props: K[] = [];
    if (this.entityIdProps) {
      for (const [prop] of this.entityIdProps) {
        props.push(prop);
      }
    }
    return props;
  }

  /**
   * 값이 있는 컬럼의 이름 목록을 문자열로 반환
   * 예시 : column1, column2, column3, ...
   */
  public columns(): string {
    return `${this.props.map(p => this.columnIndex.get(p)).join(',')}`;
  }

  public column(prop: K): string {
    return this.toSnakecase(prop.toString());
  }

  /**
   * insert sql에 사용할 값 이름 목록 생성
   * 예시 :column1, :column2
   */
  public insertColumns(): string {
    return `${this.props.map(p => ':' + this.placeholder(p)).join(',')}`;
  }

  /**
   * entityId 를 제외한 값 property 의 업데이트 SQL 조건
   * 예시 : value=:value,  value2=:value2
   */
  public updateColumns(): string {
    return this.props
      .filter(p => !this.idProps.includes(p))
      .map(p => `${this.columnIndex.get(p)}=:${this.placeholder(p)}`)
      .join(',');
  }

  /**
   * entity id 를 기준으로 한 업데이트에 사용할 WHERE 조건
   * 예시 : pk=:pk AND second_pk=:second_pk
   */
  public whereId(): string {
    const exprs: SqlComparisonExprItem<K>[] = [];
    for (const prop of this.idProps) {
      exprs.push({ prop: prop, value: this.entity[prop] });
    }
    return this.where({ exprs });
  }

  protected placeholder(prop: K): string {
    return this.placeholderPrefix ? this.placeholderPrefix + '_' + prop.toString() : prop.toString();
  }

  public get tablePath(): string {
    return this.entityOption.tablePath;
  }
}
