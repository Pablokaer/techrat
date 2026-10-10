import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ApiError } from "@techrat/api";
import { setLocale } from "@/lib/i18n";
import LoginScreen from "@/app/login";

const mockSignIn = jest.fn();
const mockResend = jest.fn();
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ signIn: mockSignIn, resendConfirmation: mockResend }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));

const SERVER_MESSAGE = "Confirm your email before signing in.";

beforeEach(() => {
  mockSignIn.mockReset();
  mockResend.mockReset().mockResolvedValue(undefined);
});
afterEach(() => setLocale("en"));

async function submit(email = "rat@example.com") {
  await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText("Password"), "Passw0rd1");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
}

describe("Login screen with an unconfirmed email", () => {
  it("shows the server message and a resend button on 403, then the notice after pressing it", async () => {
    mockSignIn.mockRejectedValueOnce(new ApiError(403, "Forbidden", SERVER_MESSAGE));
    await submit();
    expect(await screen.findByText(SERVER_MESSAGE)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Resend confirmation email" }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("rat@example.com"));
    expect(await screen.findByText("If the address has an unconfirmed account, we sent a new link.")).toBeTruthy();
  });

  it("does not offer a resend for wrong credentials", async () => {
    mockSignIn.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    await submit();
    expect(await screen.findByText("Incorrect email or password.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resend confirmation email" })).toBeNull();
  });

  it("offers the resend in Portuguese", async () => {
    setLocale("pt-BR");
    mockSignIn.mockRejectedValueOnce(new ApiError(403, "Forbidden", "Confirme seu e-mail antes de entrar."));
    await submit();
    expect(await screen.findByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeTruthy();
  });
});
