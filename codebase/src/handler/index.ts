import { LambdaEvent, LambdaResponse } from "types";

import { successResponse } from "../util";

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  successResponse("pong");
