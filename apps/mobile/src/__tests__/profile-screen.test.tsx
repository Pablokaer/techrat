import { render, screen } from "@testing-library/react-native";
import { setLocale } from "@/lib/i18n";
import ProfileScreen from "@/app/(tabs)/profile";

jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "1.0.0" } } }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ signOut: jest.fn() }) }));
jest.mock("@/components/domain/AvatarPicker", () => ({ AvatarPicker: () => null }));
jest.mock("@/components/domain/LevelSummary", () => ({ LevelSummary: () => null }));

const user = {
  id: "u1", username: "rat", displayName: "Rat", email: "rat@example.com", bio: null, avatarUrl: null,
  level: { level: 3, totalXp: 120 }, currentStreak: 2, longestStreak: 5, questionsAnswered: 10, accuracy: 80,
  showOnLeaderboard: true, globalRank: 7,
};
jest.mock("@/lib/queries", () => ({
  useMe: () => ({ data: user, isLoading: false, error: null, refetch: jest.fn() }),
  useProfile: () => ({ data: { achievements: [], topicProgress: [] }, isLoading: false, error: null, isRefetching: false, refetch: jest.fn() }),
}));

afterEach(() => setLocale("en"));

describe("Profile screen", () => {
  it("shows the app version at the bottom, from the Expo config", async () => {
    await render(<ProfileScreen />);
    expect(screen.getByText("Version 1.0.0")).toBeTruthy();
  });

  it("shows the version in Portuguese on a Portuguese device", async () => {
    setLocale("pt-BR");
    await render(<ProfileScreen />);
    expect(screen.getByText("Versão 1.0.0")).toBeTruthy();
  });
});
