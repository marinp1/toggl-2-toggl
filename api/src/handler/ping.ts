import { LambdaEvent, LambdaResponse } from '../../../types';

import util from '../../../common-resources';

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  util.successResponse('pong');
