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

const entitySql = new EntityReadSql(TestEntity);

describe('repo > entity-read-sql.test', () => {
  it('프로퍼티명으로 이름이 지정된 컬럼이름 목록을 반환', () => {
    expect(entitySql.columns(['carmelCaseField'])).to.be.eq('carmel_case_field AS carmelCaseField');
  });

  it('order 쿼리 반환', () => {
    expect(entitySql.order({ testEntityId: 'ASC', data: 'DESC' })).to.be.eq('testEntityId ASC,data DESC');
  });

  it('지정된 값을 가지는 entity 반환(AND)', () => {
    expect(entitySql.whereEqual({ carmelCaseField: '1' })).to.be.eq('carmel_case_field=:carmelCaseField');
  });
});
