export {}; // this file needs to be a module
declare global {
  type Stringified<T> = string &
    {
      [P in keyof T]: { '_ value': T[P] };
    };
  export interface JSON {
    // stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
    stringify<T>(
      value: T,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replacer?: (key: string, value: any) => any,
      space?: string | number,
    ): string & Stringified<T>;
    // parse(text: string, reviver?: (key: any, value: any) => any): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T;
  }
  type StrigifiedArray<T> = string &
    {
      [P in keyof T]: { '_ value': T[P] };
    };
  export interface Array<T> {
    join<T>(separator?: T): StrigifiedArray<T>;
  }
}
