import { fireEvent, render, screen } from "@testing-library/react-native";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { setLocale } from "@/lib/i18n";
import RegisterScreen from "@/app/register";

const mockOpenReference = jest.fn();
jest.mock("@/lib/links", () => ({ openReference: (url: string) => mockOpenReference(url) }));
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ register: jest.fn() }) }));

beforeEach(() => mockOpenReference.mockReset());
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
