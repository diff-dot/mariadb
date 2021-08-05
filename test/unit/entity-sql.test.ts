import { expect } from 'chai';
import { Entity, EntityId } from '@diff./repository';
import { Expose } from 'class-transformer';
import { MariadbEntity } from '../../src/decorator/MariadbEntity';
import { EntitySql } from '../../src/EntitySql';
import { hostOptions } from './config/db';

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

const entity = new TestEntity();
entity.testEntityId = 'idValue';
entity.data = 'value';
entity.carmelCaseField = 'cvalue';
const entitySql = new EntitySql(entity);

describe('repo > entity-sql.test', () => {
  it('각 property 를 저장할 컬럼명을 반환', () => {
    expect(entitySql.columns()).to.be.eq('test_entity_id,data,carmel_case_field');
  });

  // it('property 의 이름을 alias 로 가지는 컬럼명을 반환', () => {
  //   expect(entitySql.columns({ alias: true })).to.be.eq('test_entity_id AS testEntityId,data AS data,carmel_case_field AS carmelCaseField');
  // });

  // it('선택한 property 를 저장할 컬럼명을 반환', () => {
  //   expect(entitySql.columns({ props: ['data'] })).to.be.eq('data');
  // });

  it('각 property 의 값으로 대체할 placeholder 반환', async () => {
    expect(entitySql.valuesPlaceholder()).to.be.eq(':testEntityId,:data,:carmelCaseField');
  });

  it('entity id 와 일치하는 항목을 검색하는 where 조건 반환', async () => {
    expect(entitySql.whereById()).to.be.eq('test_entity_id=:testEntityId');
  });

  it('entity 의 키/값 쌍 추출', async () => {
    expect(entitySql.values()).to.be.eql({ testEntityId: 'idValue', data: 'value', carmelCaseField: 'cvalue' });
  });
});
