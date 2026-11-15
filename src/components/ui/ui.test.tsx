import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Chip, FilterThumb, Input, StepCard, Toggle } from ".";

describe("Button", () => {
  it("defaults to type=button and full width", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.className).toContain("w-full");
  });

  it("applies the variant", () => {
    render(<Button variant="secondary">Album</Button>);
    expect(screen.getByRole("button").className).toContain("border-sage");
  });
});

describe("Input", () => {
  it("is described by the hint, or by the error that replaces it", () => {
    const { rerender } = render(<Input label="Your name" hint="Shown on your photo" />);
    const input = screen.getByLabelText("Your name");
    expect(input).toHaveAccessibleDescription("Shown on your photo");
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(<Input label="Your name" hint="Shown on your photo" error="Required" />);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Required");
  });

  it("shows a character count", () => {
    render(<Input label="Wish" value="hello" maxLength={120} showCount onChange={() => {}} />);
    expect(screen.getByText("5 / 120")).toBeInTheDocument();
  });
});

describe("Chip and FilterThumb", () => {
  it("expose the selected state", () => {
    render(
      <>
        <Chip selected>Script</Chip>
        <FilterThumb label="Kodak Gold" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Script" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Kodak Gold" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Toggle", () => {
  it("is a labelled switch that reports the next value", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Date" checked onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Date" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("StepCard", () => {
  it("shows the step number until done", () => {
    const { rerender } = render(<StepCard step={2} title="Connect Google Photos" />);
    expect(screen.getByText("2")).toBeInTheDocument();
    rerender(<StepCard step={2} title="Connect Google Photos" done status="Connected" />);
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
