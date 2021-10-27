import { expect } from 'chai';
import { Entity, EntityId } from '@diff./repository';
import { Expose } from 'class-transformer';
import { MariadbEntity } from '../../../src/decorator/MariadbEntity';
import { EntityWriteSql } from '../../../src/sql';

@MariadbEntity({ db: 'test', table: 'test' })
class TestEntity extends Entity {
  @EntityId()
  @Expose()
  testEntityId: string;

  @Expose()
  data: string;

  @Expose()
  carmelCaseField: string;
}

const entity = new TestEntity();
entity.testEntityId = 'idValue';
entity.data = 'value';
entity.carmelCaseField = 'cvalue';

describe('repo > entity-write-sql.test', () => {
  it('각 property 를 저장할 컬럼명을 반환', () => {
    const entitySql = new EntityWriteSql(entity);
    expect(entitySql.columns()).to.be.eq('test_entity_id,data,carmel_case_field');
  });

  it('insert sql 에 사용할 컬럼별 placeholder 목록', async () => {
    const entitySql = new EntityWriteSql(entity);
    expect(entitySql.insertColumns()).to.be.eq(':testEntityId,:data,:carmelCaseField');
  });

  it('insert sql 에 사용할 컬럼별 placeholder 목록 (prefix 포함)', async () => {
    const entitySql = new EntityWriteSql(entity, { placeholderPrefix: 'w' });
    expect(entitySql.insertColumns()).to.be.eq(':w_testEntityId,:w_data,:w_carmelCaseField');
  });

  it('entity id 와 일치하는 항목을 검색하는 where 조건 반환', async () => {
    const entitySql = new EntityWriteSql(entity);
    expect(entitySql.whereById()).to.be.eq('test_entity_id=:testEntityId');
  });

  it('entity id 와 일치하는 항목을 검색하는 where 조건 반환 (prefix 포함)', async () => {
    const entitySql = new EntityWriteSql(entity, { placeholderPrefix: 'w' });
    expect(entitySql.whereById()).to.be.eq('test_entity_id=:w_testEntityId');
  });

  it('별도 지정한 where 조건 반환', async () => {
    const entitySql = new EntityWriteSql(entity);
    expect(entitySql.whereEqual(TestEntity.partial({ testEntityId: '1' }))).to.be.eq('test_entity_id=:testEntityId_3');
  });

  it('별도 지정한 where 조건 반환 (prefix 포함)', async () => {
    const entitySql = new EntityWriteSql(entity, { placeholderPrefix: 'w' });
    expect(entitySql.whereEqual(TestEntity.partial({ testEntityId: '1' }))).to.be.eq('test_entity_id=:w_testEntityId_3');
  });

  it('entity 의 키/값 쌍 추출', async () => {
    const entitySql = new EntityWriteSql(entity);
    expect(entitySql.placedValues()).to.be.eql({ testEntityId: 'idValue', data: 'value', carmelCaseField: 'cvalue' });
  });

  it('entity 의 키/값 쌍 추출 (prefix 포함)', async () => {
    const entitySql = new EntityWriteSql(entity, { placeholderPrefix: 'w' });
    expect(entitySql.placedValues()).to.be.eql({ w_testEntityId: 'idValue', w_data: 'value', w_carmelCaseField: 'cvalue' });
  });
});
