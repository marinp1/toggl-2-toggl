import { LambdaSuccessResponse } from "types";

export const generateDateString = async (date: Date | number) => {
  const [formatDistance, formatISO] = await Promise.all([
    import("date-fns/formatDistance").then((mod) => mod.default),
    import("date-fns/formatISO").then((mod) => mod.default),
  ]);

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
