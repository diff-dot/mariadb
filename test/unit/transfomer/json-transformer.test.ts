import { Entity } from '@diff./repository';
import { expect } from 'chai';
import { classToPlain, Expose, plainToClass, Transform, Type } from 'class-transformer';
import { JsonTransformer } from '../../../src/transformer/JsonTransformer';

class TestVo {
  @Expose()
  nestedId: string;
}

class TestEntity extends Entity {
  @Expose()
  @Transform(JsonTransformer(TestVo))
  @Type(() => TestVo)
  data: TestVo;
}

describe('transformer > json-transformer.test', () => {
  it('데이터를 json string 으로 변환', async () => {
    const entity = new TestEntity();
    entity.data = new TestVo();
    entity.data.nestedId = '1';

    const plain = classToPlain(entity, { exposeUnsetFields: false });
    expect(plain.data).to.be.eq('{"nestedId":"1"}');

    const unplain = plainToClass(TestEntity, plain);
    expect(unplain.data.nestedId).to.be.eq('1');
  });
});
