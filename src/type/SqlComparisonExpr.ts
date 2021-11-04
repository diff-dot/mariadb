import { SqlComparisonOperator } from './SqlComparisonOperator';
import { SqlLogicalOperators } from './SqlLogicalOperators';

export interface SqlComparisonExprItem<K> {
  prop: K;
  value: unknown;
  op?: SqlComparisonOperator;
}

export interface SqlComparisonExprGroup<K> {
  exprs: (SqlComparisonExprItem<K> | SqlComparisonExprGroup<K>)[];
  op?: SqlLogicalOperators;
}

export type SqlComparisonExpr<K> = SqlComparisonExprItem<K> | SqlComparisonExprGroup<K>;

export function isSqlComparisonExprGroup<K>(expr: SqlComparisonExpr<K>): expr is SqlComparisonExprGroup<K> {
  return (expr as SqlComparisonExprGroup<K>).exprs !== undefined;
}
