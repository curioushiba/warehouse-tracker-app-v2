import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, type SelectOption } from "./Select";

const options: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

function openDropdown() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("Select", () => {
  it("calls onChange when clicking a dropdown option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select options={options} onChange={onChange} placeholder="Pick fruit" />
    );

    openDropdown();
    // Use userEvent to simulate full browser event sequence (mousedown → click)
    // This reproduces the bug: mousedown fires the outside-click handler which
    // closes the dropdown before the click event reaches the <li>
    await user.click(screen.getByRole("option", { name: "Banana" }));

    expect(onChange).toHaveBeenCalledWith("banana");
  });

  it("closes the dropdown when clicking outside", () => {
    render(
      <div>
        <button>Outside</button>
        <Select options={options} placeholder="Pick fruit" />
      </div>
    );

    openDropdown();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the dropdown after a selection is made", async () => {
    const user = userEvent.setup();
    render(<Select options={options} placeholder="Pick fruit" />);

    openDropdown();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Apple" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation (ArrowDown + Enter)", () => {
    const onChange = vi.fn();
    render(
      <Select options={options} onChange={onChange} placeholder="Pick fruit" />
    );

    const combobox = screen.getByRole("combobox");
    // Open with Enter
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Arrow down to first option and select
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("apple");
  });

  it("updates displayed value in uncontrolled mode", async () => {
    const user = userEvent.setup();
    render(<Select options={options} placeholder="Pick fruit" />);

    openDropdown();
    await user.click(screen.getByRole("option", { name: "Cherry" }));

    // The combobox should now show "Cherry"
    expect(screen.getByRole("combobox")).toHaveTextContent("Cherry");
  });

  it("mirrors selected value in hidden native select", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Select
        options={options}
        name="fruit"
        placeholder="Pick fruit"
      />
    );

    openDropdown();
    await user.click(screen.getByRole("option", { name: "Banana" }));

    const nativeSelect = container.querySelector(
      'select[name="fruit"]'
    ) as HTMLSelectElement;
    expect(nativeSelect.value).toBe("banana");
  });
});
