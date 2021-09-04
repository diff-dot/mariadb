import { TransformationType } from 'class-transformer';

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';

export function BinaryStringTransformer(encoding: BufferEncoding = 'ascii') {
  return ({ value, type }: { value: Buffer | string; type: TransformationType }): string | Buffer => {
    if (value === undefined || value === null) return value;

    if (type == TransformationType.PLAIN_TO_CLASS) {
      if (value instanceof Buffer) {
        return value.toString(encoding);
      } else {
        return value;
      }
    } else {
      if (typeof value === 'string') {
        return Buffer.from(value, encoding);
      } else {
        return value;
      }
    }
  };
}
