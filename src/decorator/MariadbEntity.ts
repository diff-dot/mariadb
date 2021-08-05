/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { MariadbEntityDecoratorOptions } from '../type/MariadbEntityDecoratorOptions';

/**
 * Mariadb에 저장되는 entity 의 db 및 테이블 정보
 */
export function MariadbEntity(options: MariadbEntityDecoratorOptions) {
  return function<T extends { new (...args: any[]): any }>(constructor: T) {
    constructor.prototype.__mariadb_options = options;
  };
}

export function getMariadbEntityOptions(target: any): MariadbEntityDecoratorOptions {
  const options = target.__mariadb_options;
  if (!options) throw new Error('Mariadb entity options not defined. :' + target.constructor.name);
  return options;
}
