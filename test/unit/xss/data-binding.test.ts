import { expect } from 'chai';
import { hostOptions } from '../env/host';
import { MariadbClient } from '../../../src/MariaDBClient';

describe('xss > entidata-binding', () => {
  it('코드가 포함된 데이터 바인딩 체크', async () => {
    const res = await MariadbClient.instance(hostOptions).query('SELECT * FROM test.xss_test WHERE id=:id', {
      id: '111 OR 1'
    });
    console.log(res);
  });
});
