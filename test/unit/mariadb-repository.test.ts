import { expect } from 'chai';
import { Expose, plainToClass } from 'class-transformer';
import { Entity, EntityId } from '@diff./repository';
import { MariadbEntity } from '../../src/decorator/MariadbEntity';
import { MariadbRepository } from '../../src/MariadbRepository';
import { MariadbClient } from '../../src/MariadbClient';
import { hostOptions } from './env/host';
import { PoolConnection } from 'mariadb';
import { EntityReadSql } from '../../src/sql';

@MariadbEntity({ db: 'test', table: 'single_pk_test', host: hostOptions })
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

@MariadbEntity({ db: 'test', table: 'auto_inc_pk', host: hostOptions })
class AutoIncPkEntity extends Entity {
  @EntityId()
  @Expose()
  id?: number;

  @Expose()
  data: number;
}

class SinglePkRepo extends MariadbRepository {
  async addTestEntity(entity: SinglePkEntity): Promise<boolean> {
    const res = await this.addEntity(entity);
    return res.affectedRows === 1;
  }

  async testEntity<K extends keyof SinglePkEntity>(testEntityId: string, props: K[]): Promise<Pick<SinglePkEntity, K> | undefined> {
    return this.entity({
      entityConstructor: SinglePkEntity,
      where: SinglePkEntity.partial({ testEntityId }),
      operator: 'AND',
      props
    });
  }

  async testEntities<K extends keyof SinglePkEntity>(index: number, props: K[]): Promise<Pick<SinglePkEntity, K>[]> {
    return this.entities({
      entityConstructor: SinglePkEntity,
      props,
      where: SinglePkEntity.partial({ idx: index }),
      order: { idx: 'DESC' },
      size: 10
    });
  }

  async testEntityCount(data: string): Promise<number> {
    const res = this.count({ entityConstructor: SinglePkEntity, where: SinglePkEntity.partial({ data }) });
    return res;
  }

  async testEntityByCustomQuery<K extends keyof SinglePkEntity>(data: string, props: K[]): Promise<Pick<SinglePkEntity, K> | undefined> {
    const entitySql = new EntityReadSql(SinglePkEntity, { where: SinglePkEntity.partial({ data }), tableAlias: 'T1' });

    let conn: PoolConnection | undefined;
    try {
      conn = await MariadbClient.instance(entitySql.host).connection();
      const res = await conn.query(
        `SELECT ${entitySql.columns(props)} FROM ${entitySql.tablePath} WHERE ${entitySql.whereEqual()}`,
        entitySql.whereValues()
      );
      if (!res.length) return undefined;
      return plainToClass(SinglePkEntity, res[0]);
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

  async deleteTestEntity(testEntityId: string): Promise<boolean> {
    const res = await this.deleteEntity(SinglePkEntity.partial({ testEntityId }));
    return res.affectedRows === 1;
  }
}

class AutoIncPkRepo extends MariadbRepository {
  async addTestEntity(entity: AutoIncPkEntity): Promise<number> {
    const res = await this.addEntity(entity);
    return res.insertId;
  }

  async testEntity<K extends keyof AutoIncPkEntity>(id: number, props: K[]): Promise<Pick<AutoIncPkEntity, K> | undefined> {
    return this.entity({
      entityConstructor: AutoIncPkEntity,
      props,
      where: AutoIncPkEntity.partial({ id })
    });
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
const singlePkEntity = new SinglePkEntity();
singlePkEntity.testEntityId = 'w';
singlePkEntity.data = 'data';
singlePkEntity.idx = 1;
singlePkEntity.carmelCaseField = 10;

const autoIncPkRepo = new AutoIncPkRepo();
const autoIncPkEntity = AutoIncPkEntity.create({
  data: 1
});

describe('repo > mariadb-repository.test', () => {
  after(async () => {
    const conn = await MariadbClient.instance(hostOptions).connection();
    try {
      await conn.query('DELETE FROM test.single_pk_test WHERE test_entity_id=:test_entity_id', {
        test_entity_id: singlePkEntity.testEntityId
      });
      await conn.query('TRUNCATE test.auto_inc_pk');
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

  it('Entity 개수 조회', async () => {
    const res = await singlePkRepo.testEntityCount('updated data');
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

  it('Auto Increment PK 를 사용하는 Entity 추가', async () => {
    const res = await autoIncPkRepo.addTestEntity(autoIncPkEntity);
    expect(res).to.be.eq(1);
  });
});
