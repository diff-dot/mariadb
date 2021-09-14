import { expect } from 'chai';
import { Entity, EntityId } from '@diff./repository';
import { Expose } from 'class-transformer';
import { MariadbEntity } from '../../../src/decorator/MariadbEntity';
import { EntityReadSql } from '../../../src/sql';
import { hostOptions } from '../env/host';

@MariadbEntity({ db: 'test', table: 'test', host: hostOptions })
class TestEntity extends Entity {
  @EntityId()
  @Expose()
  testEntityId: string;

  @Expose()
  data: string;

  @Expose()
  carmelCaseField: string;
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

  it('order 쿼리 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.order({ testEntityId: 'ASC', data: 'DESC' })).to.be.eq('T1.test_entity_id ASC,T1.data DESC');
  });

  it('지정된 컬럼으로 목록을 소팅(order by)하기 위한 쿼리 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.order({ testEntityId: 'ASC', data: 'DESC' })).to.be.eq('T1.test_entity_id ASC,T1.data DESC');
  });

  it('지정된 값과 정확하기 일치하는 행을 찾기위한 where 쿼리 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.whereEqual(TestEntity.partial({ carmelCaseField: '1' }))).to.be.eq('T1.carmel_case_field=:T1_carmelCaseField');
    expect(entitySql.placedValues()).to.be.eql({ T1_carmelCaseField: '1' });
  });

  it('컬럼 이름 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.column('carmelCaseField')).to.be.eq('T1.carmel_case_field');
  });

  it('테이블 경로 ( ${DB}.${Table} AS ${TableAlias} ) 반환', () => {
    const entitySql = new EntityReadSql(TestEntity, { tableAlias: 'T1' });
    expect(entitySql.tablePath).to.be.eq('`test`.`test` AS `T1`');
  });
});
