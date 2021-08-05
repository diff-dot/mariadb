import { classToPlain } from 'class-transformer';
import { Entity, EntityIdOptions, getEntityIdProps } from '@diff./repository';
/**
 * Entity 의 CRUD 에 사용할 SQL 쿼리 생성기
 *
 * < property 이름 자동 변환 >
 * - mariadb 는 컬럼명의 대소문자를 구분하지 않기 때문에, carmelcase 로 작성된 entity 의 property 이름을 snakecase 로 변환하여 처리
 * - classTransform 과정에서 property 의 이름의 변경될 경우 오류가 발생할 수 있으므로 @Expose 데코레이터 사용시 이름 변경 금지
 */
export class EntitySql {
  private readonly plainEntity: Record<string, unknown>;
  private readonly entityId: Map<string, EntityIdOptions> | undefined; // entity id 정보
  private readonly idProps: string[]; // entity id 로 사용되는 property 이름 목록
  private readonly props: string[]; // 값이 있는 모든 property 이름 목록

  private readonly fieldIndex: Map<string, string>; // property 이름으로 으로 field 이름을 찾을 떄 사용할 인덱스
  private readonly propIndex: Map<string, string>; // field 이름으로 property 이름을 찾을 때 사용할 인덱스

  constructor(entity: Entity) {
    // entityId 정보 추출
    this.entityId = getEntityIdProps(entity);

    // 저장가능한 형태로 변환하고 값이 지정되지 않은 property 삭제
    this.plainEntity = classToPlain(entity, { exposeUnsetFields: false });

    // entity id 정보 검증 및 분류
    this.idProps = [];
    if (this.entityId) {
      for (const [propName] of this.entityId) {
        this.idProps.push(propName);
        if (!this.plainEntity[propName]) {
          throw new Error(`EntityId(${propName}) not defined to plained ${entity.constructor.name}`);
        }
      }
    }

    // property 목록 추출 및 필드명 인덱스 구축
    this.props = [];
    this.fieldIndex = new Map();
    this.propIndex = new Map();
    for (const propName of Object.keys(this.plainEntity)) {
      if (this.plainEntity[propName] === undefined) continue;

      // 값이 있는 props 의 키 목록 추출
      this.props.push(propName);

      // 인덱스 구축
      this.fieldIndex.set(propName, this.toSnakecase(propName));
      this.propIndex.set(this.toSnakecase(propName), propName);
    }

    if (!this.props.length) throw new Error('Entity converted to a plain object is empty.');
  }

  /**
   * 값이 지정된 property 의 컬럼 이름들을 , 로 구문된 문자열 목록으로 반환
   */
  public columns(): string {
    return `${this.props.map(p => this.fieldIndex.get(p)).join(',')}`;
  }

  /**
   * 컬럼이름 목록을 문자열로 반환
   * 예시 : column1, column2, column3, ...
   *
   * @param {string[]} [args.props=undefined] 지정한 property 의 column 이름을 반환, 미지정시 전체 property 의 column 이름 반환
   * @param {boolean} [args.alias=true] property 이름을 alias 로 지정 ( 예시 : column1 AS propName1, column2 AS propName2 ... )
   * @returns
   */
  public propColumns(args: { props: string[]; alias?: boolean }): string {
    const { props = [], alias = true } = args;
    if (alias) {
      return `${props.map(p => `${this.toSnakecase(p)} AS ${p}`).join(',')}`;
    } else {
      return `${props.map(p => this.toSnakecase(p)).join(',')}`;
    }
  }

  /**
   * insert sql에 사용할 값 이름 목록 생성
   * 예시 :column1, :column2
   */
  public valuesPlaceholder(): string {
    return `${this.props.map(p => ':' + p).join(',')}`;
  }

  /**
   * entityId 를 제외한 값 property 의 업데이트 SQL 조건
   * 예시 : value=:value,  value2=:value2
   */
  public updatePlaceholder(): string {
    return this.props
      .filter(p => !this.idProps.includes(p))
      .map(p => `${this.fieldIndex.get(p)}=:${p}`)
      .join(',');
  }

  /**
   * entity id 를 기준으로 한 업데이트에 사용할 WHERE 조건
   * 예시 : pk=:pk AND second_pk=:second_pk
   */
  public whereById(): string {
    return this.idProps.map(p => `${this.toSnakecase(p)}=:${p}`).join('AND');
  }

  /**
   * 저장 가능한 형태의 값 목록을 반환
   * @returns
   */
  public values(): Record<string, unknown> {
    return this.plainEntity;
  }

  /**
   * carmel case 로 작성된 컬럼명, 테이블명,db 명을 자동으로 snake case 로 변환
   *
   * @param str
   * @returns
   */
  private toSnakecase(str: string): string {
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
}
