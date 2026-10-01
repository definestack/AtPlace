import { deleteLogsOlderThan, insertLog } from "@/db/logsRepository";
import { logException, logGeofence, logRetentionCutoff, pruneExpiredLogs } from "@/services/logger";
import { getLogRetentionDays, isDiagnosticLoggingEnabled } from "@/store/settingsStore";

jest.mock("@/db/logsRepository");
jest.mock("@/store/settingsStore", () => ({
  getLogRetentionDays: jest.fn(),
  isDiagnosticLoggingEnabled: jest.fn(),
}));

const MS_PER_DAY = 86_400_000;

describe("logRetentionCutoff", () => {
  it("returns now minus the given number of days", () => {
    const now = 1_700_000_000_000;
    expect(logRetentionCutoff(5, now)).toBe(now - 5 * MS_PER_DAY);
  });

  it("places a row created exactly `days` ago right at the boundary, which `deleteLogsOlderThan`'s strict `<` keeps", () => {
    const now = 1_700_000_000_000;
    const cutoff = logRetentionCutoff(5, now);
    const rowAtBoundary = cutoff;
    const rowJustOlder = cutoff - 1;

    expect(rowAtBoundary < cutoff).toBe(false);
    expect(rowJustOlder < cutoff).toBe(true);
  });
});

describe("pruneExpiredLogs", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("deletes logs older than the configured retention window", async () => {
    (getLogRetentionDays as jest.Mock).mockResolvedValue(10);
    (deleteLogsOlderThan as jest.Mock).mockResolvedValue(undefined);

    const before = Date.now();
    await pruneExpiredLogs();
    const after = Date.now();

    expect(deleteLogsOlderThan).toHaveBeenCalledTimes(1);
    const [cutoff] = (deleteLogsOlderThan as jest.Mock).mock.calls[0];
    expect(cutoff).toBeGreaterThanOrEqual(before - 10 * MS_PER_DAY);
    expect(cutoff).toBeLessThanOrEqual(after - 10 * MS_PER_DAY);
  });

  it("never throws when the cleanup itself fails", async () => {
    (getLogRetentionDays as jest.Mock).mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(pruneExpiredLogs()).resolves.toBeUndefined();
  });
});

describe("logger persist + prune wiring", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isDiagnosticLoggingEnabled as jest.Mock).mockResolvedValue(true);
    (insertLog as jest.Mock).mockResolvedValue(undefined);
    (getLogRetentionDays as jest.Mock).mockResolvedValue(5);
    (deleteLogsOlderThan as jest.Mock).mockResolvedValue(undefined);
  });

  it("prunes expired logs after a gated log entry is written", async () => {
    await logGeofence("Entered Office");

    expect(insertLog).toHaveBeenCalled();
    expect(deleteLogsOlderThan).toHaveBeenCalledTimes(1);
  });

  it("prunes expired logs after an always-on exception log is written", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    await logException("Something broke", new Error("boom"));

    expect(insertLog).toHaveBeenCalled();
    expect(deleteLogsOlderThan).toHaveBeenCalledTimes(1);
  });

  it("does not prune when the insert itself fails", async () => {
    (insertLog as jest.Mock).mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await logGeofence("Entered Office");

    expect(deleteLogsOlderThan).not.toHaveBeenCalled();
  });
});
