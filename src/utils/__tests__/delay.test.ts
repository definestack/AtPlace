import { delayHelpText, delayLabel, delaySuffix, parseDelayMinutes } from "@/utils/delay";

describe("parseDelayMinutes", () => {
  it("parses each valid option", () => {
    expect(parseDelayMinutes("0")).toBe(0);
    expect(parseDelayMinutes("1")).toBe(1);
    expect(parseDelayMinutes("3")).toBe(3);
    expect(parseDelayMinutes(5)).toBe(5);
    expect(parseDelayMinutes(10)).toBe(10);
  });

  it("returns null for an out-of-range or non-numeric value", () => {
    expect(parseDelayMinutes("2")).toBeNull();
    expect(parseDelayMinutes("999")).toBeNull();
    expect(parseDelayMinutes("abc")).toBeNull();
    expect(parseDelayMinutes(null)).toBeNull();
    expect(parseDelayMinutes(undefined)).toBeNull();
  });
});

describe("delayLabel", () => {
  it("labels Immediately, singular, and plural minutes", () => {
    expect(delayLabel(0)).toBe("Immediately");
    expect(delayLabel(1)).toBe("1 minute");
    expect(delayLabel(5)).toBe("5 minutes");
  });
});

describe("delaySuffix", () => {
  it("is empty for Immediately and a short suffix otherwise", () => {
    expect(delaySuffix(0)).toBe("");
    expect(delaySuffix(3)).toBe(" · after 3 min");
  });
});

describe("delayHelpText", () => {
  it("reflects both trigger and delay", () => {
    expect(delayHelpText("arrive", 3)).toBe("Notify 3 min after arriving");
    expect(delayHelpText("leave", 5)).toBe("Notify 5 min after leaving");
    expect(delayHelpText("arrive", 0)).toBe("Notify immediately when arriving");
    expect(delayHelpText("leave", 0)).toBe("Notify immediately when leaving");
  });
});
