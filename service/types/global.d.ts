export {}; // this file needs to be a module

declare global {
  type Await<T> = T extends PromiseLike<infer U> ? U : T;
  type Stringified<T> = T extends { toJSON(): infer U }
    ? U
    : T extends object
    ? {
        [k in keyof T]: Stringified<T[k]>;
      }
    : T;
  export interface JSON {
    stringify<T>(
      value: T,
      replacer?: (key: string, value: any) => any,
      space?: string | number,
    ): Stringified<T>;
    parse<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T;
  }
  export interface Array<T> {
    join<T>(separator?: T): Stringified<T>;
    uniq<U extends T>(): Array<U>;
    uniqBy<U extends T>(iteratee: (value: U) => string): Array<U>;
    intersectBy<U>(
      arr: U[],
      iteratee: (value: Record<Extract<keyof U, keyof T>, any>) => string,
    ): T[];
    differenceBy<U>(
      arr: U[],
      iteratee: (value: Record<Extract<keyof U, keyof T>, any>) => string,
    ): T[];
    chunk<U extends T>(size: number): Array<Array<U>>;
  }
}
