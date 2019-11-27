export * from './lambda';
export * from './timeEntry';
export * from './toggl';

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

export type ExcludeOptionalProps<T> = Pick<T, RequiredKeys<T>>;
