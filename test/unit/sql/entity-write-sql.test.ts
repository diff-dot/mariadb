import { expect } from 'chai';
import { Entity, EntityId } from '@diff./repository';
import { Expose } from 'class-transformer';
import { MariadbEntity } from '../../../src/decorator/MariadbEntity';
import { EntityWriteSql } from '../../../src/sql';
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

const entity = new TestEntity();
entity.testEntityId = 'idValue';
entity.data = 'value';
entity.carmelCaseField = 'cvalue';
const entitySql = new EntityWriteSql(entity);

describe('repo > entity-write-sql.test', () => {
  it('각 property 를 저장할 컬럼명을 반환', () => {
    expect(entitySql.columns()).to.be.eq('test_entity_id,data,carmel_case_field');
  });

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
