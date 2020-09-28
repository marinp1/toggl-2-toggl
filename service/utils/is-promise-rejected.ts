export const isRejected = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseRejectedResult => val.status === 'rejected';
