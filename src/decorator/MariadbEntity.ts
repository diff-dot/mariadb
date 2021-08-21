/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MariadbEntityDecoratorOptions } from '../type/MariadbEntityDecoratorOptions';

/**
 * Mariadb에 저장되는 entity 의 db 및 테이블 정보
 */
const mariadbEntityOptionsKey = Symbol('mariadbEntityOptions');
export function MariadbEntity(options: MariadbEntityDecoratorOptions) {
  return function<T extends { new (...args: any[]): any }>(constructor: T) {
    // Entity 생성자를 키로하여 옵션 저장
    Reflect.defineMetadata(mariadbEntityOptionsKey, options, constructor);
  };
}

/**
 * MariadbEntity 데코레이터로 지정된 옵션 조회
 *
 * - 클래스 생성자가 target 으로 지정된 경우 : target 을 키로 저장된 entity options 을 반환
 * - 클래스 인스턴스가 target 으로 지정된 경우 : target 의 constructor 를 키워 저장된 entity options 을 반환
 * @param target
 * @returns
 */
export function getMariadbEntityOptions(target: any): MariadbEntityDecoratorOptions {
  const options = Reflect.getMetadata(mariadbEntityOptionsKey, target instanceof Function ? target : target.constructor);
  if (!options) throw new Error('Mariadb entity options not defined. :' + target.constructor.name);
  return options;
}
