import { LambdaEvent, LambdaResponse } from 'service/types';

import { successResponse } from 'service';

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  successResponse('pong');
