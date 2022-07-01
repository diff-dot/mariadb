import { PoolConnection } from 'mariadb';
import { RowLevelLockMode } from './RowLevelLockMode';

/**
 * Entity 의 읽기 작업을 수행하는 메소드에 공통적으로 사용되는 옵션
 */
export interface ReadMethodOptions {
  connection?: PoolConnection;
  lock?: RowLevelLockMode;
}
