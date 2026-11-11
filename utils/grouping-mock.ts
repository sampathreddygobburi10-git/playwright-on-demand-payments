import { type Page, type Request } from '@playwright/test';
import { endpoints } from '../network/odc-mocks';

export const GROUPING_FLAG = 'dms_accounting_payments_grouping';

type EisGroup = {
  groupId: string;
  name: string;
  type: string;
  organizationUnits: string[];
};

type UserDetails = {
  iamUser: { assignments: Array<{ stores: Array<{ storeId: string }> }> };
  eisGroups?: { groups?: EisGroup[] };
};

export type StoreScopedRequest = {
  url: string;
  storeId: string;
};

const compareIds = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true });

const descending = (a: string, b: string): number => compareIds(b, a);

const lowestId = (ids: string[]): string | undefined =>
  [...ids].sort(compareIds)[0];

export class GroupingMock {
  static withOutOfOrderGrouping(page: Page): Promise<UserDetails> {
    return new Promise(resolve => {
      void page.route(endpoints.getUserDetails, async route => {
        const response = await route.fetch();
        const body = (await response.json()) as UserDetails;
        const groups = body.eisGroups?.groups ?? [];
        const storeIds =
          body.iamUser.assignments[0]?.stores.map(({ storeId }) => storeId) ??
          [];
        const highestStoreId = [...storeIds].sort(descending)[0];

        GroupingMock.getAccountingGroups(body).forEach(accountingGroup => {
          const lowestGlGroupId = lowestId(
            accountingGroup.organizationUnits.filter(id =>
              groups.some(({ groupId }) => groupId === id)
            )
          );
          const glGroup = groups.find(
            ({ groupId }) => groupId === lowestGlGroupId
          );
          const hasUserStore = glGroup?.organizationUnits.some(id =>
            storeIds.includes(id)
          );
          if (
            highestStoreId &&
            glGroup &&
            hasUserStore &&
            !glGroup.organizationUnits.includes(highestStoreId)
          ) {
            glGroup.organizationUnits.push(highestStoreId);
          }
        });

        body.iamUser.assignments.forEach(assignment => {
          assignment.stores.sort((a, b) => descending(a.storeId, b.storeId));
        });
        groups.forEach(group => group.organizationUnits.sort(descending));
        groups.sort((a, b) => descending(a.groupId, b.groupId));

        await route.fulfill({ response, json: body });
        resolve(body);
      });
    });
  }

  static getAccountingGroups(userDetails: UserDetails): EisGroup[] {
    return (userDetails.eisGroups?.groups ?? []).filter(
      ({ type }) => type === 'ACCOUNTING_GROUP'
    );
  }

  static getAccountingGroupByName(
    userDetails: UserDetails,
    name: string
  ): EisGroup | undefined {
    return GroupingMock.getAccountingGroups(userDetails).find(
      group => group.name === name
    );
  }

  static getExpectedStoreId(
    userDetails: UserDetails,
    accountingGroup: EisGroup
  ): string | undefined {
    const groups = userDetails.eisGroups?.groups ?? [];
    const storeIds =
      userDetails.iamUser.assignments[0]?.stores.map(
        ({ storeId }) => storeId
      ) ?? [];

    const lowestGlGroupId = lowestId(
      accountingGroup.organizationUnits.filter(id =>
        groups.some(({ groupId }) => groupId === id)
      )
    );
    const glGroup = groups.find(({ groupId }) => groupId === lowestGlGroupId);

    return lowestId(
      glGroup?.organizationUnits.filter(id => storeIds.includes(id)) ?? []
    );
  }

  static captureStoreScopedRequests(page: Page): StoreScopedRequest[] {
    const captured: StoreScopedRequest[] = [];
    page.on('request', (request: Request) => {
      const storeId = request.headers()['x-store-id'];
      if (storeId) captured.push({ url: request.url(), storeId });
    });
    return captured;
  }
}
