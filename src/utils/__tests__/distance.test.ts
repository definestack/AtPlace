import { formatRadius } from "@/utils/distance";

describe("formatRadius", () => {
  it("formats meters as-is for km units", () => {
    expect(formatRadius(150, "km")).toBe("150 m");
    expect(formatRadius(100, "km")).toBe("100 m");
  });

  it("converts to feet, rounded to the nearest 10, for mi units", () => {
    expect(formatRadius(150, "mi")).toBe("490 ft");
    expect(formatRadius(500, "mi")).toBe("1640 ft");
  });
});
