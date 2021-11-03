import { deserialize, serialize, TransformationType } from 'class-transformer';

/**
 * Binary 타입의 컬럼에 저장된 문자열은 Buffer 타입로 반환됨.
 * class-transformer 를 통해 db에서 추출된 plain data 를 class 에 맵핑할 때 문자열로 타입을 변경하는 decorator
 */
export function JsonTransformer<T>(constructor: { new (...args: unknown[]): T }) {
  return ({ value, type }: { value: T | string; type: TransformationType }): string | T => {
    if (value === undefined || value === null) return value;

    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (typeof value === 'string') {
        return deserialize(constructor, value);
      } else {
        return value;
      }
    } else if (type === TransformationType.CLASS_TO_PLAIN) {
      return serialize(value);
    } else {
      // TransformationType.CLASS_TO_CLASS
      return value;
    }
  };
}
