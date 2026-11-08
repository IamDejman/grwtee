import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactPage from "../page";

let fetchMock: jest.Mock;
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

function fill(fields: Partial<Record<"name" | "email" | "phone" | "service" | "message", string>> & { agree?: boolean }) {
  const set = (label: RegExp, value: string | undefined) => {
    if (value !== undefined) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  };
  set(/Full Name/, fields.name);
  set(/Email Address/, fields.email);
  set(/Phone Number/, fields.phone);
  set(/Service Interest/, fields.service);
  set(/^Message/, fields.message);
  if (fields.agree) fireEvent.click(screen.getByRole("checkbox"));
}

const send = () => fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

const valid = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "08031234567",
  service: "general-inquiry",
  agree: true
};

describe("contact form", () => {
  it("shows every field's message when sent empty, and sends nothing", async () => {
    render(<ContactPage />);
    send();
    await screen.findByText("Please enter at least 2 characters");
    // Errors are alerts; "Select a service" is also the dropdown's placeholder.
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual(
      expect.arrayContaining([
        "Please enter at least 2 characters",
        "Enter a valid email address",
        "Enter a valid phone number",
        "Select a service",
        "You must agree to the Terms & Policies"
      ])
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a one-letter name, a malformed email and a six-digit phone", async () => {
    render(<ContactPage />);
    fill({ ...valid, name: "A", email: "ada@example", phone: "080312" });
    send();
    expect(await screen.findByText("Please enter at least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid phone number")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a valid message and thanks the visitor", async () => {
    render(<ContactPage />);
    fill(valid);
    send();
    expect(await screen.findByText("Thank you! We'll be in touch soon.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(JSON.parse(init.body)).toEqual({
      name: "Ada Obi",
      email: "ada@example.com",
      phone: "08031234567",
      service: "general-inquiry",
      message: "No additional message.",
      turnstileToken: ""
    });
  });

  it("asks for a permanent address before sending, as the server would", async () => {
    render(<ContactPage />);
    fill({ ...valid, email: "ada@mailinator.com" });
    send();
    expect(await screen.findByText("Please use a permanent email address")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts an email typed with a trailing space", async () => {
    render(<ContactPage />);
    fill({ ...valid, email: "ada@example.com " });
    send();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).email).toBe("ada@example.com");
  });
});
