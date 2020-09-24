import { LambdaSuccessResponse } from "types";

const generateDateString = (date: Date | number) =>
  Promise.all([
    import("date-fns/formatDistance").then((mod) => mod.default),
    import("date-fns/formatISO").then((mod) => mod.default),
  ]).then(([formatDistance, formatISO]) => {
    const readable = formatDistance(date, Date.now(), { addSuffix: true });
    return `${formatISO(date)} (${readable})`;
  });

const successResponse = <T extends Record<string, any> | null | string>(
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

export default {
  generateDateString,
  successResponse,
};
