import { getDatabase } from "@/db/database";
import { deleteLogsOlderThan } from "@/db/logsRepository";

jest.mock("@/db/database");

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
