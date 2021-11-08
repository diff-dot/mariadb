import { TransformationType } from 'class-transformer';

/**
 * 1 = true, 0 = false
 */
export function BooleanTransformer() {
  return ({ value, type }: { value: boolean | number; type: TransformationType }): boolean | number => {
    if (value === undefined || value === null) return value;

    if (type === TransformationType.PLAIN_TO_CLASS) {
      return value === 1;
    } else if (type === TransformationType.CLASS_TO_PLAIN) {
      return value === true ? 1 : 0;
    } else {
      return value;
    }
  };
}
