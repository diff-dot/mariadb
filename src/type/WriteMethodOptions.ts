import { PoolConnection } from 'mariadb';

/**
 * Entity 의 쓰기작업을 수행하는 메소드에 공통적으로 사용되는 옵션
 */
export interface WriteMethodOptions {
  connection?: PoolConnection;
}
