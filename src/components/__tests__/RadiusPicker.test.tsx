import { fireEvent, render, screen } from "@testing-library/react-native";

import { RadiusPicker } from "@/components/RadiusPicker";

const mockUnits = { current: "km" as "km" | "mi" };

jest.mock("@/store/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ get units() { return mockUnits.current; } }),
}));

describe("RadiusPicker", () => {
  beforeEach(() => {
    mockUnits.current = "km";
  });

  it("renders the preset chips with meter labels", async () => {
    await render(<RadiusPicker value={150} onChange={jest.fn()} />);

    expect(screen.getByText("100 m")).toBeTruthy();
    expect(screen.getByText("150 m")).toBeTruthy();
    expect(screen.getByText("250 m")).toBeTruthy();
    expect(screen.getByText("500 m")).toBeTruthy();
  });

  it("marks the matching preset as selected", async () => {
    await render(<RadiusPicker value={250} onChange={jest.fn()} />);

    expect(screen.getByRole("radio", { name: "250 m" })).toHaveProp("accessibilityState", {
      selected: true,
    });
    expect(screen.getByRole("radio", { name: "150 m" })).toHaveProp("accessibilityState", {
      selected: false,
    });
  });

  it("calls onChange with the preset's meter value when pressed", async () => {
    const onChange = jest.fn();
    await render(<RadiusPicker value={150} onChange={onChange} />);

    await fireEvent.press(screen.getByText("500 m"));

    expect(onChange).toHaveBeenCalledWith(500);
  });

  it("shows a selected Custom chip for a non-preset value", async () => {
    await render(<RadiusPicker value={175} onChange={jest.fn()} />);

    expect(screen.getByText("Custom · 175 m")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Custom · 175 m" })).toHaveProp(
      "accessibilityState",
      { selected: true },
    );
  });

  it("formats labels in feet when units is mi", async () => {
    mockUnits.current = "mi";
    await render(<RadiusPicker value={150} onChange={jest.fn()} />);

    expect(screen.getByText("490 ft")).toBeTruthy();
  });
});
