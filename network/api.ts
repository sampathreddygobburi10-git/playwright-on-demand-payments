import { Page, Response } from "@playwright/test";

export async function waitForApiResponse(
  page: Page,
  endpoint: string,
  options?: {
    method?: string;
    status?: number;
    timeout?: number;
  }
): Promise<Response> {
  const {
    method = "GET",
    status = 200,
    timeout = 30000,
  } = options ?? {};

  const response = await page.waitForResponse(
    response =>
      response.url().includes(endpoint) &&
      response.request().method() === method &&
      response.status() === status,
    { timeout }
  );

  if (!response.ok()) {
    const body = await response.text();

    throw new Error(`API call failed
        Method : ${method}
        Status : ${response.status()} ${response.statusText()}
        URL    : ${response.url()}
        Body   : ${body}
    `);
  }

  return response;
}