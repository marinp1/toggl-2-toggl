import { LambdaEvent, LambdaResponse } from "types";

import util from "../util";

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  util.successResponse("pong");
