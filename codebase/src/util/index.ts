import { LambdaSuccessResponse } from "types";
import formatDistance from "date-fns/formatDistance";
import formatISO from "date-fns/formatISO";

export const generateDateString = (date: Date | number) => {
  const readable = formatDistance(date, Date.now(), { addSuffix: true });
  return `${formatISO(date)} (${readable})`;
};

export const successResponse = <T extends Record<string, any> | null | string>(
  body: T
): Promise<LambdaSuccessResponse<T>> =>
  Promise.resolve({
    statusCode: 200,
    body:
      typeof body === "string" || body === null
        ? (body as string | null)
        : JSON.stringify(body),
    headers: {
      "Content-Type":
        typeof body === "string" ? "text/plain" : "application/json",
    },
  });
