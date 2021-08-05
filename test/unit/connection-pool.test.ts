import { expect } from 'chai';
import { MariadbClient } from '../../src/MariadbClient';
import { hostOptions } from './config/db';

describe('mariadb > connection-pool', () => {
  it('커넥션 풀에서 커넥션 획득 후 쿼리', async () => {
    const conn = await MariadbClient.instance(hostOptions).connection();
    const res = await conn.query('select :val as val', { val: 1 });
    expect(res[0]).to.be.eql({ val: 1 });
    await conn.release();
  });

  it('숏컷 통해 쿼리 후 커넥션 릴리즈', async () => {
    const res = await MariadbClient.instance(hostOptions).query('select :t1 as val', { t1: 1 });
    expect(res[0]).to.be.eql({ val: 1 });
  });
});
