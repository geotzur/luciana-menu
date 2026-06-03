import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Regression test for the "choosing a category closes the dialog" bug.
 *
 * A Select renders its dropdown in a portal OUTSIDE the dialog's DOM node, so a
 * pointerdown on a Select option is seen by the dialog as an "outside" click.
 * DialogContent guards against this by ignoring interactions that originate from
 * portaled popper content (marked with [data-radix-popper-content-wrapper]).
 */
describe("DialogContent popper interaction guard", () => {
  it("stays open when the interaction originates from portaled popper content", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>dialog body</DialogContent>
      </Dialog>,
    );

    // Simulate a Select dropdown rendered in a portal outside the dialog.
    const popper = document.createElement("div");
    popper.setAttribute("data-radix-popper-content-wrapper", "");
    const option = document.createElement("div");
    popper.appendChild(option);
    document.body.appendChild(popper);

    fireEvent.pointerDown(option);

    // The dialog must NOT request to close.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
