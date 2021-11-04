import { SqlComparisonOperator } from './SqlComparisonOperator';

export interface SqlComparisonExpr<K> {
  prop: K;
  value: unknown;
  op?: SqlComparisonOperator;
}
