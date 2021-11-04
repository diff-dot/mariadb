import { SqlComparisonExpr } from './SqlComparisonExpr';
import { SqlLogicalOperators } from './SqlLogicalOperators';

export interface SqlComparisonExprGroup<K> {
  exprs: (SqlComparisonExpr<K> | SqlComparisonExprGroup<K>)[];
  op?: SqlLogicalOperators;
}

export function isSqlComparisonExprGroup<K>(exprOrGroup: SqlComparisonExpr<K> | SqlComparisonExprGroup<K>): exprOrGroup is SqlComparisonExprGroup<K> {
  return (exprOrGroup as SqlComparisonExprGroup<K>).exprs !== undefined;
}
