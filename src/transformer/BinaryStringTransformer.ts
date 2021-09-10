import { TransformationType } from 'class-transformer';

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';

/**
 * Binary 타입의 컬럼에 저장된 문자열은 Buffer 타입로 반환됨.
 * class-transformer 를 통해 db에서 추출된 plain data 를 class 에 맵핑할 때 문자열로 타입을 변경하는 decorator
 */
export function BinaryStringTransformer(args: { encoding?: BufferEncoding; twoway?: boolean } = {}) {
  const { encoding = 'ascii', twoway = false } = args;
  return ({ value, type }: { value: Buffer | string; type: TransformationType }): string | Buffer => {
    if (value === undefined || value === null) return value;

    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (value instanceof Buffer) {
        return value.toString(encoding);
      } else {
        return value;
      }
    } else if (type === TransformationType.CLASS_TO_PLAIN) {
      if (twoway) {
        if (typeof value === 'string') {
          return Buffer.from(value, encoding);
        } else {
          return value;
        }
      } else {
        return value;
      }
    } else {
      // TransformationType.CLASS_TO_CLASS
      return value;
    }
  };
}
