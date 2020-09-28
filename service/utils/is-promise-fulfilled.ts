export const isFulfilled = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseFulfilledResult<T> => val.status === 'fulfilled';
