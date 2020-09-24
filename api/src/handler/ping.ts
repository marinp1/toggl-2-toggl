import { LambdaEvent, LambdaResponse } from '../../../types';

import { successResponse } from '../../../common-resources';

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  successResponse('pong');
