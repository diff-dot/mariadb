import { expect } from 'chai';
import { Expose, plainToClass } from 'class-transformer';
import { Entity, EntityId } from '@diff./repository';
import { MariadbEntity } from '../../src/decorator/MariadbEntity';
import { MariadbRepository } from '../../src/MariadbRepository';
import { MariadbClient } from '../../src/MariadbClient';
import { hostOptions } from './env/host';
import { PoolConnection } from 'mariadb';
import { EntityReadSql } from '../../src/sql';
import { SqlComparisonExpr } from '../../src';

@MariadbEntity({ db: 'test', table: 'mariadb_module_single_pk_test' })
class SinglePkEntity extends Entity {
  @EntityId()
  @Expose()
  testEntityId: string;

  @Expose()
  idx: number;

  @Expose()
  data: string | null;

  @Expose()
  carmelCaseField: number | null;
}

@MariadbEntity({ db: 'test', table: 'mariadb_module_auto_inc_pk' })
class AutoIncPkEntity extends Entity {
  @EntityId()
  @Expose()
  id?: number;

  @Expose()
  data: number;
}

class SinglePkRepo extends MariadbRepository {
  defaultHost() {
    return hostOptions;
  }

  async addTestEntity(entity: SinglePkEntity): Promise<boolean> {
    const res = await this.addEntity(entity);
    return res.affectedRows === 1;
  }

  async upsertTestEntity(entity: SinglePkEntity, updateEntity?: Partial<SinglePkEntity>): Promise<number> {
    const res = await this.upsertEntity(entity, { updateEntity });
    return res.affectedRows;
  }

  async testEntity<K extends keyof SinglePkEntity>(testEntityId: string, props: K[]): Promise<Pick<SinglePkEntity, K> | undefined> {
    return this.entity(SinglePkEntity, props, { exprs: [{ prop: 'testEntityId', value: testEntityId }] });
  }

  async testEntities<K extends keyof SinglePkEntity>(index: number, props: K[]): Promise<Pick<SinglePkEntity, K>[]> {
    return this.entities(
      SinglePkEntity,
      props,
      { exprs: [{ prop: 'idx', value: index }] },
      {
        order: { idx: 'DESC' },
        size: 10
      }
    );
  }

  async testEntityCount(data: string): Promise<number> {
    const res = this.count(SinglePkEntity, { exprs: [{ prop: 'data', value: data }] });
    return res;
  }

  async testEntityByCustomQuery<K extends keyof SinglePkEntity>(data: string, props: K[]): Promise<Pick<SinglePkEntity, K> | undefined> {
    const entitySql = new EntityReadSql(SinglePkEntity, { tableAlias: 'T1' });

    let conn: PoolConnection | undefined;
    try {
      conn = await this.client.connection();
      const res = await conn.query(
        `SELECT ${entitySql.select(props)} FROM ${entitySql.tablePath} WHERE ${entitySql.eq('data', data)}`,
        entitySql.placedValues()
      );
      if (!res.length) return undefined;
      return plainToClass(SinglePkEntity, res[0], { exposeUnsetFields: false });
    } catch (e) {
      throw e;
    } finally {
      if (conn) await conn.release();
    }
  }

  async updateTestEntity(entity: SinglePkEntity): Promise<boolean> {
    const res = await this.updateEntity(entity);
    return res.affectedRows === 1;
  }

  async updateTestEntities<T extends SinglePkEntity>(args: { set: Partial<T>; where: SqlComparisonExpr<keyof SinglePkEntity> }): Promise<number> {
    const { set, where } = args;
    const res = await this.updateEntities(set, where);
    return res.affectedRows;
  }

  async deleteTestEntity(testEntityId: string): Promise<boolean> {
    const res = await this.deleteEntity(SinglePkEntity.partial({ testEntityId }));
    return res.affectedRows === 1;
  }

  async deleteTestEntities(where: SqlComparisonExpr<keyof SinglePkEntity>): Promise<number> {
    const res = await this.deleteEntities(SinglePkEntity, where);
    return res.affectedRows;
  }
}

class AutoIncPkRepo extends MariadbRepository {
  defaultHost() {
    return hostOptions;
  }

  async addTestEntity(entity: AutoIncPkEntity): Promise<number> {
    const res = await this.addEntity(entity);
    return res.insertId;
  }

  async testEntity<K extends keyof AutoIncPkEntity>(id: number, props: K[]): Promise<Pick<AutoIncPkEntity, K> | undefined> {
    return this.entity(AutoIncPkEntity, props, { exprs: [{ prop: 'id', value: id }] });
  }

  async updateTestEntity(entity: AutoIncPkEntity): Promise<boolean> {
    const res = await this.updateEntity(entity);
    return res.affectedRows === 1;
  }

  async deleteTestEntity(id: number): Promise<boolean> {
    const res = await this.deleteEntity(AutoIncPkEntity.partial({ id }));
    return res.affectedRows === 1;
  }
}

const singlePkRepo = new SinglePkRepo();
const autoIncPkRepo = new AutoIncPkRepo();

const singlePkEntity = new SinglePkEntity();
singlePkEntity.testEntityId = 'w';
singlePkEntity.data = 'data';
singlePkEntity.idx = 1;
singlePkEntity.carmelCaseField = 10;

describe('repo > mariadb-repository.test', () => {
  before(async () => {
    const conn = await MariadbClient.instance(hostOptions).connection();
    try {
      await conn.query('TRUNCATE test.mariadb_module_single_pk_test', {
        test_entity_id: singlePkEntity.testEntityId
      });
      await conn.query('TRUNCATE test.mariadb_module_auto_inc_pk');
    } catch (e) {
      console.log(e);
    } finally {
      await conn.release();
    }
  });

  it('Entity 추가', async () => {
    const res = await singlePkRepo.addTestEntity(singlePkEntity);
    expect(res).to.be.true;
  });

  it('Entity 조회', async () => {
    const res = await singlePkRepo.testEntity(singlePkEntity.testEntityId, ['data']);
    expect(res).to.be.not.undefined;
    if (res) {
      expect(res.data).to.be.eq(singlePkEntity.data);
    }
  });

  it('커스텀 쿼리를 통해 Entity 조회', async () => {
    const res = await singlePkRepo.testEntityByCustomQuery('data', ['carmelCaseField']);
    expect(res).to.be.not.undefined;
    if (res) {
      expect(res.carmelCaseField).to.be.eq(singlePkEntity.carmelCaseField);
    }
  });

  it('Entity 업데이트', async () => {
    singlePkEntity.data = 'updated data';
    const res = await singlePkRepo.updateTestEntity(singlePkEntity);
    expect(res).to.be.true;
  });

  it('Entity 일괄 업데이트', async () => {
    singlePkEntity.data = 'updated data2';
    const res = await singlePkRepo.updateTestEntities({
      set: SinglePkEntity.partial({ data: 'updated2' }),
      where: { prop: 'testEntityId', value: 'w' }
    });
    expect(res).to.be.eq(1);
  });

  it('Entity 개수 조회', async () => {
    const res = await singlePkRepo.testEntityCount('updated2');
    expect(res).to.be.eq(1);
  });

  it('Entity 목록 조회', async () => {
    const res = await singlePkRepo.testEntities(1, ['testEntityId']);
    expect(res.length).to.be.eq(1);
    expect(res[0].testEntityId).to.be.eq(singlePkEntity.testEntityId);
  });

  it('Entity 삭제', async () => {
    const res = await singlePkRepo.deleteTestEntity(singlePkEntity.testEntityId);
    expect(res).to.be.true;
  });

  it('Entity upsert', async () => {
    const testEntity = SinglePkEntity.create({
      testEntityId: 'upsertTestEntity',
      idx: 10,
      data: null,
      carmelCaseField: null
    });
    const updatedRows1 = await singlePkRepo.upsertTestEntity(testEntity);
    expect(updatedRows1).to.be.gte(1);

    const updatedRows2 = await singlePkRepo.upsertTestEntity(testEntity, SinglePkEntity.partial({ data: 'w1' }));
    expect(updatedRows2).to.be.gte(1);
  });

  it('Entity 일괄 삭제', async () => {
    // 테스트를 위해 entity 추가
    const testEntity = SinglePkEntity.create({
      testEntityId: 'delTestId',
      idx: 1,
      data: null,
      carmelCaseField: null
    });
    await singlePkRepo.addTestEntity(testEntity);

    const deleteRes = await singlePkRepo.deleteTestEntities({ prop: 'idx', value: testEntity.idx });
    expect(deleteRes).to.be.eq(1);
  });

  it('Auto Increment PK 를 사용하는 Entity 추가', async () => {
    const autoIncPkEntity = AutoIncPkEntity.create({
      data: 1
    });
    const res = await autoIncPkRepo.addTestEntity(autoIncPkEntity);
    expect(res).to.be.eq(1);
  });
});
