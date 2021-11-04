import { expect } from 'chai';
import { Entity, EntityId } from '@diff./repository';
import { Expose, Transform, TransformationType } from 'class-transformer';
import { MariadbEntity } from '../../../src/decorator/MariadbEntity';
import { EntityReadSql } from '../../../src/sql';

@MariadbEntity({ db: 'test', table: 'test' })
class TestEntity extends Entity {
  @EntityId()
  @Expose()
  testEntityId: string;

  @Expose()
  stringProp: string;

  @Expose()
  numberProp: number;

  @Expose()
  carmelCaseField: string;

  @Expose()
  @Transform(({ value, type }) => {
    // undefined 또는 null 인 경우 데이터를 변환하지 않고 반환
    if (value === undefined || value === null) return value;

    if (type == TransformationType.PLAIN_TO_CLASS) {
      return JSON.parse(value);
    } else if (type === TransformationType.CLASS_TO_PLAIN) {
      return JSON.stringify(value);
    } else {
      return value;
    }
  })
  nested: Record<string, string>;
}

describe('repo > entity-read-sql.test', () => {
  it('프로퍼티명으로 이름이 지정된 컬럼이름 목록을 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.select(['carmelCaseField'])).to.be.eq('T1.carmel_case_field AS carmelCaseField');
  });

  it('컬럼별 alias 를 별도 지정', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.select(['carmelCaseField'], { alias: { carmelCaseField: 'w' } })).to.be.eq('T1.carmel_case_field AS w');
  });

  it('tableAlias 를 컬럼별 alias 에 prefix로 적용', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.select(['carmelCaseField'], { tableAliasPrefix: true })).to.be.eq('T1.carmel_case_field AS T1_carmelCaseField');
  });

  it('tableAlias 를 별도 지정된 컬럼별 alias 에 prefix로 적용', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.select(['carmelCaseField'], { tableAliasPrefix: true, alias: { carmelCaseField: 'w' } })).to.be.eq(
      'T1.carmel_case_field AS T1_w'
    );
  });

  it('order 쿼리 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.order({ testEntityId: 'ASC', stringProp: 'DESC' })).to.be.eq('T1.test_entity_id ASC,T1.string_prop DESC');
  });

  it('지정된 컬럼으로 목록을 소팅(order by)하기 위한 쿼리 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.order({ testEntityId: 'ASC', stringProp: 'DESC' })).to.be.eq('T1.test_entity_id ASC,T1.string_prop DESC');
  });

  it('컬럼 이름 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.column('carmelCaseField')).to.be.eq('T1.carmel_case_field');
  });

  it('테이블 경로 ( ${DB}.${Table} AS ${TableAlias} ) 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.tablePath).to.be.eq('`test`.`test` AS `T1`');
  });

  it('serialized value 반환', () => {
    const sql = new EntityReadSql(TestEntity);
    expect(sql.serializeValue('nested', { a: 1 })).to.be.eq('{"a":1}');
  });

  it('조건문 반환 : 일치(eq)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '=', 1)).to.be.eq('T1.number_prop=:T1_numberProp_0');
  });

  it('조건문 반환 : 크다(gt)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '>', 1)).to.be.eq('T1.number_prop>:T1_numberProp_0');
  });

  it('조건문 반환 : 크거나 같다(gte)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '>=', 1)).to.be.eq('T1.number_prop>=:T1_numberProp_0');
  });

  it('조건문 반환 : 작다(lt)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '<', 1)).to.be.eq('T1.number_prop<:T1_numberProp_0');
  });

  it('조건문 반환 : 작거나 같다(lte)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '<=', 1)).to.be.eq('T1.number_prop<=:T1_numberProp_0');
  });

  it('조건문 반환 : 불일치(not)', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(sql.comparison('numberProp', '<>', 1)).to.be.eq('T1.number_prop<>:T1_numberProp_0');
  });

  it('복합 조건문', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(
      sql.where({
        exprs: [
          { prop: 'numberProp', value: 1 },
          { prop: 'stringProp', value: '1' }
        ]
      })
    ).to.be.eq('T1.number_prop=:T1_numberProp_0 AND T1.string_prop=:T1_stringProp_1');
  });

  it('조건 그룹이 포함된 복합 조건', () => {
    const sql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(
      sql.where({
        exprs: [
          { prop: 'numberProp', value: 1 },
          { prop: 'stringProp', value: '1' },
          {
            exprs: [
              { prop: 'testEntityId', value: 1 },
              { prop: 'stringProp', value: '1' }
            ]
          }
        ],
        op: 'OR'
      })
    ).to.be.eq(
      'T1.number_prop=:T1_numberProp_0 OR T1.string_prop=:T1_stringProp_1 OR  (T1.test_entity_id=:T1_testEntityId_2 AND T1.string_prop=:T1_stringProp_3) '
    );
  });
});
