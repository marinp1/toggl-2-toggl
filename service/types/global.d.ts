export {}; // this file needs to be a module

declare global {
  type Await<T> = T extends PromiseLike<infer U> ? U : T;
  type Stringified<T> = string &
    {
      [P in keyof T]: { '_ value': T[P] };
    };
  export interface JSON {
    stringify<T>(
      value: T,
      replacer?: (key: string, value: any) => any,
      space?: string | number,
    ): string & Stringified<T>;
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
