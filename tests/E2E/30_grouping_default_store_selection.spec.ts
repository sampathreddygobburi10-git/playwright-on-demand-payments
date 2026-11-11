import { test, expect } from '../../fixtures';
import { endpoints, waitForResponse } from '../../network/odc-mocks';
import { HarnessFlags } from '../../utils/harness-flags';
import {
  GROUPING_FLAG,
  GroupingMock,
  type StoreScopedRequest
} from '../../utils/grouping-mock';
import type { Page, Request } from '@playwright/test';

const storeIdOf = (request: Request): string =>
  request.headers()['x-store-id'] ?? '';

/** Waits for a request to the endpoint that carries an x-store-id header. */
const waitForStoreScopedRequest = (
  page: Page,
  pattern: RegExp
): Promise<Request> =>
  page.waitForRequest(
    request => pattern.test(request.url()) && !!storeIdOf(request),
    { timeout: 60000 }
  );

const expectAllRequestsSince = (
  captured: StoreScopedRequest[],
  fromIndex: number,
  expectedStoreId: string
): void => {
  const mismatched = captured
    .slice(fromIndex)
    .filter(({ storeId }) => storeId !== expectedStoreId);
  expect(
    mismatched,
    `requests sent with a store other than ${expectedStoreId}`
  ).toEqual([]);
};

const latestStoreIdSince = (
  captured: StoreScopedRequest[],
  fromIndex: number,
  pattern: RegExp
): string | undefined =>
  captured
    .slice(fromIndex)
    .filter(({ url }) => pattern.test(url))
    .at(-1)?.storeId;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe(
  'Grouping — default store selection sent in x-store-id @odc',
  () => {
    let captured: StoreScopedRequest[];
    let userDetails: Awaited<
      ReturnType<typeof GroupingMock.withOutOfOrderGrouping>
    >;
    let initialStoreId: string;

    test.beforeEach(async ({ page, odcPage }) => {
      await HarnessFlags.set(page, { [GROUPING_FLAG]: true });
      const userDetailsPromise = GroupingMock.withOutOfOrderGrouping(page);
      captured = GroupingMock.captureStoreScopedRequests(page);

      const [initRequest] = await Promise.all([
        waitForStoreScopedRequest(page, endpoints.onDemandCheckInitialization),
        waitForResponse(page, endpoints.glCOACall),
        odcPage.gotoOdc()
      ]);
      userDetails = await userDetailsPromise;
      initialStoreId = storeIdOf(initRequest);

      await odcPage.expectAccountingGroupLoaded();
    });

    test('MODDWTC-9630 || on page load, x-store-id is the lowest store in the lowest GL group of the default accounting group', async ({
      odcPage
    }) => {
      const defaultGroupName = await odcPage
        .getAccountingGroupPicker()
        .inputValue();
      const defaultGroup = GroupingMock.getAccountingGroupByName(
        userDetails,
        defaultGroupName
      );
      expect(
        defaultGroup,
        `accounting group "${defaultGroupName}" not found in user details`
      ).toBeTruthy();

      const expectedStoreId = GroupingMock.getExpectedStoreId(
        userDetails,
        defaultGroup!
      );
      expect(
        expectedStoreId,
        'default accounting group has no stores'
      ).toBeTruthy();
      test.info().annotations.push({
        type: 'log',
        description: `MODDWTC-9630 - default accounting group ${
          defaultGroup!.groupId
        } expects ${expectedStoreId}`
      });

      expect(initialStoreId).toBe(expectedStoreId);

      const initIndex = captured.findIndex(({ url }) =>
        endpoints.onDemandCheckInitialization.test(url)
      );
      expectAllRequestsSince(captured, initIndex, expectedStoreId!);
    });

    test('MODDWTC-9630 || on accounting group change, x-store-id is the lowest store in the lowest GL group of the selected accounting group', async ({
      page,
      odcPage
    }) => {
      const picker = odcPage.getAccountingGroupPicker();
      const currentGroupName = await picker.inputValue();
      const currentGroup = GroupingMock.getAccountingGroupByName(
        userDetails,
        currentGroupName
      );
      const currentExpectedStoreId =
        currentGroup &&
        GroupingMock.getExpectedStoreId(userDetails, currentGroup);

      // The target must resolve to a different store: the initialization and GL-COA queries are keyed
      // by store, so switching to a group with the same store sends no new requests to assert on.
      // Compare against the current group's expected store rather than the store that was sent,
      // which is wrong when the bug is present.
      const targetGroup = GroupingMock.getAccountingGroups(userDetails).find(
        group => {
          const storeId = GroupingMock.getExpectedStoreId(userDetails, group);
          return (
            group.name !== currentGroupName &&
            !!storeId &&
            storeId !== currentExpectedStoreId
          );
        }
      );
      test.skip(
        !targetGroup,
        'No other accounting group resolves to a different store in this environment'
      );

      const expectedStoreId = GroupingMock.getExpectedStoreId(
        userDetails,
        targetGroup!
      )!;
      test.info().annotations.push({
        type: 'log',
        description: `MODDWTC-9630 - selected accounting group ${
          targetGroup!.groupId
        } expects ${expectedStoreId}`
      });

      await picker.click();
      const option = page
        .locator('[data-testid^="menu-item-"]')
        .filter({ hasText: new RegExp(`^${escapeRegExp(targetGroup!.name)}$`) })
        .first();
      await expect(option).toBeVisible();

      const fromIndex = captured.length;
      await option.click();
      await expect(picker).toHaveValue(targetGroup!.name);

      // Poll the latest request rather than waiting for a store change: with the bug, the wrong
      // store can be the same one that was sent before the change.
      await expect
        .poll(
          () =>
            latestStoreIdSince(
              captured,
              fromIndex,
              endpoints.onDemandCheckInitialization
            ),
          {
            message:
              'x-store-id on /odc/initialization after the accounting group change',
            timeout: 30000
          }
        )
        .toBe(expectedStoreId);
      await expect
        .poll(
          () => latestStoreIdSince(captured, fromIndex, endpoints.glCOACall),
          {
            message: 'x-store-id on gl-coa after the accounting group change',
            timeout: 30000
          }
        )
        .toBe(expectedStoreId);

      expectAllRequestsSince(captured, fromIndex, expectedStoreId);
    });
  }
);
