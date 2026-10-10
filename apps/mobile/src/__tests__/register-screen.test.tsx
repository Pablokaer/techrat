import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { setLocale } from "@/lib/i18n";
import RegisterScreen from "@/app/register";

const mockOpenReference = jest.fn();
jest.mock("@/lib/links", () => ({ openReference: (url: string) => mockOpenReference(url) }));
const mockRegister = jest.fn();
const mockResend = jest.fn();
const mockReplace = jest.fn();
const mockSignIn = jest.fn();
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ register: mockRegister, resendConfirmation: mockResend, signIn: mockSignIn }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));

beforeEach(() => {
  mockOpenReference.mockReset();
  mockRegister.mockReset().mockResolvedValue(undefined);
  mockResend.mockReset().mockResolvedValue(undefined);
  mockReplace.mockReset();
  mockSignIn.mockReset();
});
afterEach(() => setLocale("en"));

describe("Register screen consent", () => {
  it("tells the person that creating an account accepts the terms and the privacy policy", async () => {
    await render(<RegisterScreen />);
    expect(screen.getByText(/By creating an account you agree to the/)).toBeTruthy();
  });

  it("opens the terms and the privacy policy", async () => {
    await render(<RegisterScreen />);
    await fireEvent.press(screen.getByRole("link", { name: "Terms of Service" }));
    expect(mockOpenReference).toHaveBeenLastCalledWith(TERMS_URL);
    await fireEvent.press(screen.getByRole("link", { name: "Privacy Policy" }));
    expect(mockOpenReference).toHaveBeenLastCalledWith(PRIVACY_URL);
  });

  it("is shown in Portuguese on a Portuguese device", async () => {
    setLocale("pt-BR");
    await render(<RegisterScreen />);
    expect(screen.getByText(/Ao criar uma conta, você concorda com os/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toBeTruthy();
  });
});

async function fillAndSubmit() {
  await render(<RegisterScreen />);
  await fireEvent.changeText(screen.getByLabelText("Email"), "rat@example.com");
  await fireEvent.changeText(screen.getByLabelText("Username"), "ratty");
  await fireEvent.changeText(screen.getByLabelText("Password"), "Passw0rd1");
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
}

describe("Register screen email confirmation", () => {
  it("shows the check-your-email state after sign-up and does not sign in", async () => {
    await fillAndSubmit();
    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(screen.getByText(/We sent a confirmation link to rat@example\.com\. It works for 24 hours/)).toBeTruthy();
    expect(screen.getByText(/spam/)).toBeTruthy();
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("resends the email to the address that was typed", async () => {
    await fillAndSubmit();
    await fireEvent.press(await screen.findByRole("button", { name: "Resend the email" }));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("rat@example.com"));
    expect(await screen.findByText(/we sent a new link/)).toBeTruthy();
  });

  it("goes to the sign-in screen", async () => {
    await fillAndSubmit();
    await fireEvent.press(await screen.findByRole("button", { name: "Go to sign in" }));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("is shown in Portuguese on a Portuguese device", async () => {
    setLocale("pt-BR");
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "rat@example.com");
    await fireEvent.changeText(screen.getByLabelText("Username"), "ratty");
    await fireEvent.changeText(screen.getByLabelText("Password"), "Passw0rd1");
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Confira seu e-mail")).toBeTruthy();
    expect(screen.getByText(/Ele vale por 24 horas/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reenviar o e-mail" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ir para o login" })).toBeTruthy();
  });
});
