import { Entity } from '@diff./repository';
import { Expose, Transform } from 'class-transformer';
import { MariadbClient } from '../../../src/MariadbClient';
import { BinaryStringTransformer } from '../../../src/transformer/BinaryStringTransformer';
import { hostOptions } from '../env/host';

class TestEntity extends Entity {
  @Expose()
  @Transform(BinaryStringTransformer())
  data: string;
}

describe('mariadb > binary-string-transformer.test', () => {
  it('커넥션 풀에서 커넥션 획득 후 쿼리', async () => {
    const res = await MariadbClient.instance(hostOptions).query('SELECT * FROM `test`.`binary_column` WHERE data=:data', {
      data: Buffer.from('1\0\0\0\0\0\0\0\0\0\0\0')
    });
    console.log(res);
    // console.log(res[0].data);
    console.log(Buffer.from('Y1R4-Rd---Dq'));
  });
});
