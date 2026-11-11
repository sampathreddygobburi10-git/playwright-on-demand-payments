import { Page } from "@playwright/test";

export async function waitForOnDemandPaymentsResponse(page: Page) {
  const response = await page.waitForResponse(
    response =>
      response.url().includes("/payment-register") &&
      response.request().method() === "GET"
  );

  if (!response.ok()) {
    const body = await response.text();

    throw new Error(`Payment Register API failed.
        Status : ${response.status()} ${response.statusText()}
        URL    : ${response.url()}
        Body   : ${body}
    `);
  }

  return await response.json();
}