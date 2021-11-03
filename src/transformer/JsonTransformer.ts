import { deserialize, serialize, TransformationType } from 'class-transformer';

/**
 * object 를 json string 으로 변환하여 저장하고, 조회시 object 로 재변환하여 반환
 */
export function JsonTransformer<T>(constructor?: { new (...args: unknown[]): T }) {
  return ({ value, type }: { value: T | string; type: TransformationType }): string | T => {
    if (value === undefined || value === null) return value;

    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (typeof value === 'string') {
        if (constructor) {
          return deserialize(constructor, value);
        } else {
          return JSON.parse(value);
        }
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
