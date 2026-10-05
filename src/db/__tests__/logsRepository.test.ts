import { getDatabase } from "@/db/database";
import { deleteAllLogs, deleteLogsOlderThan, getRecentLogs } from "@/db/logsRepository";

jest.mock("@/db/database");

describe("deleteAllLogs (issue #109)", () => {
  it("deletes rows through an exclusive transaction, not the shared connection", async () => {
    const txnRunAsync = jest.fn().mockResolvedValue({ changes: 2 });
    const withExclusiveTransactionAsync = jest.fn(async (task: (txn: unknown) => Promise<void>) =>
      task({ runAsync: txnRunAsync }),
    );
    const sharedRunAsync = jest.fn();
    (getDatabase as jest.Mock).mockResolvedValue({
      runAsync: sharedRunAsync,
      isInTransactionAsync: jest.fn().mockResolvedValue(false),
      withExclusiveTransactionAsync,
    });

    await deleteAllLogs();

    expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(txnRunAsync).toHaveBeenCalledWith("DELETE FROM logs");
    expect(sharedRunAsync).not.toHaveBeenCalled();
  });

  it("leaves no rows behind, so the list is empty on the next read", async () => {
    let rows = [
      { id: "a", category: "info", message: "one", detail: null, created_at: 1 },
      { id: "b", category: "app", message: "two", detail: null, created_at: 2 },
    ];
    const db = {
      isInTransactionAsync: jest.fn().mockResolvedValue(false),
      withExclusiveTransactionAsync: jest.fn(async (task: (txn: unknown) => Promise<void>) =>
        task({
          runAsync: jest.fn(async (sql: string) => {
            if (sql === "DELETE FROM logs") rows = [];
          }),
        }),
      ),
      getAllAsync: jest.fn(async () => rows),
    };
    (getDatabase as jest.Mock).mockResolvedValue(db);

    await deleteAllLogs();

    expect(await getRecentLogs()).toEqual([]);
  });

  it("rejects when the exclusive transaction fails, so the failure is not silent", async () => {
    (getDatabase as jest.Mock).mockResolvedValue({
      isInTransactionAsync: jest.fn().mockResolvedValue(false),
      withExclusiveTransactionAsync: jest.fn().mockRejectedValue(new Error("SQLITE_BUSY")),
    });

    await expect(deleteAllLogs()).rejects.toThrow("SQLITE_BUSY");
  });
});

describe("deleteLogsOlderThan", () => {
  it("deletes rows strictly older than the given cutoff", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 3 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });

    const cutoff = 1_700_000_000_000;
    await deleteLogsOlderThan(cutoff);

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = runAsync.mock.calls[0];
    expect(sql).toMatch(/^\s*DELETE FROM logs WHERE created_at < \?\s*$/i);
    expect(params).toEqual([cutoff]);
  });
});
