import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it.each([{ loading: true }, { disabled: true }])(
    "blocks clicks while %o and works again when enabled",
    (state) => {
      const onClick = jest.fn();
      const { rerender } = render(<Button {...state} onClick={onClick}>Save</Button>);
      const button = screen.getByRole("button", { name: "Save" });

      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();

      rerender(<Button onClick={onClick}>Save</Button>);
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    }
  );
});
