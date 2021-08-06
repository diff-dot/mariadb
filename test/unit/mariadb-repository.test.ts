import { expect } from 'chai';
import { Expose } from 'class-transformer';
import { Entity, EntityId } from '@diff./repository';
import { MariadbEntity } from '../../src/decorator/MariadbEntity';
import { MariadbRepository } from '../../src/MariadbRepository';
import { MariadbClient } from '../../src/MariadbClient';
import { hostOptions } from './env/host';

@MariadbEntity({ db: 'test', table: 'single_pk_test', host: hostOptions })
class TestEntity extends Entity {
  @EntityId()
  @Expose()
  testEntityId: string;

  @Expose()
  data: string | null;

  @Expose()
  carmelCaseField: number | null;
}

class TestRepo extends MariadbRepository {
  async addTestEntity(entity: TestEntity) {
    return await this.addEntity(entity);
  }

  async testEntity<K extends keyof TestEntity>(testEntityId: string, props: K[]): Promise<Pick<TestEntity, K> | undefined> {
    return this.entity({
      entityClass: TestEntity,
      entity: TestEntity.partial({
        testEntityId
      }),
      props
    });
  }

  async updateTestEntity(entity: TestEntity) {
    return await this.updateEntity(entity);
  }

  async deleteTestEntity(testEntityId: string) {
    return await this.deleteEntity(TestEntity.partial({ testEntityId }));
  }
}

const testRepo = new TestRepo();
const testEntity = new TestEntity();
testEntity.testEntityId = 'w';
testEntity.data = 'dummy data';
testEntity.carmelCaseField = 10;

describe('repo > mariadb-repository.test', () => {
  after(async () => {
    try {
      const client = MariadbClient.instance(hostOptions);
      await client.query('DELETE FROM test.single_pk_test WHERE test_entity_id=:test_entity_id', {
        test_entity_id: testEntity.testEntityId
      });
    } catch (e) {
      console.log(e);
    }
  });

  it('Entity 추가', async () => {
    const res = await testRepo.addTestEntity(testEntity);
    expect(res).to.be.true;
  });

  it('Entity 업데이트', async () => {
    testEntity.data = 'updated dummy data';
    const res = await testRepo.updateTestEntity(testEntity);
    expect(res).to.be.true;
  });

  it('Entity 조회', async () => {
    const res = await testRepo.testEntity(testEntity.testEntityId, ['data']);
    expect(res).to.be.not.undefined;
    if (res) {
      expect(res.data).to.be.eq(testEntity.data);
    }
  });

  it('Entity 삭제', async () => {
    const res = await testRepo.deleteTestEntity(testEntity.testEntityId);
    expect(res).to.be.true;
  });
});
