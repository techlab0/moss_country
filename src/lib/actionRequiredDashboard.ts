export type ActionRequiredTable = 'contact_inquiries' | 'orders';

export interface ActionRequiredDependencies<RequestType> {
  verifySession: (request: RequestType) => Promise<unknown | null>;
  countByStatuses: (table: ActionRequiredTable, statuses: string[]) => Promise<number | null>;
}

export function createActionRequiredDashboardHandler<RequestType>(
  dependencies: ActionRequiredDependencies<RequestType>,
) {
  return async (request: RequestType) => {
    try {
      const session = await dependencies.verifySession(request);
      if (!session) {
        return { status: 401, body: { error: '認証が必要です' } };
      }

      const [pendingInquiries, unshippedOrders] = await Promise.all([
        dependencies.countByStatuses('contact_inquiries', ['pending']),
        dependencies.countByStatuses('orders', ['pending', 'paid', 'confirmed', 'processing']),
      ]);

      return {
        status: 200,
        body: {
          inquiries: { pending: pendingInquiries },
          orders: { pending: unshippedOrders },
        },
      };
    } catch (error) {
      console.error('Action-required fetch error:', error);
      return { status: 500, body: { error: '要対応件数の取得に失敗しました' } };
    }
  };
}
