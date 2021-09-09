import { OrderByMode } from './OrderByMode';

export type OrderByProp<T> = Partial<Record<keyof T, OrderByMode>>;
