import { fireEvent, render, screen } from "@testing-library/react-native";
import type { RoadmapSummary, RoadmapUserState } from "@techrat/types";
import { RoadmapCard } from "./RoadmapCard";

const progress = (overrides: Partial<RoadmapUserState> = {}): RoadmapUserState => ({
  isUnlocked: true,
  isStarted: false,
  isCompleted: false,
  completedSteps: 0,
  percentComplete: 0,
  lastActivityAt: null,
  alreadyCompletedModules: 0,
  alreadyCompletedSteps: 0,
  ...overrides,
});

const roadmap = (state: RoadmapUserState | null): RoadmapSummary => ({
  id: "r1",
  slug: "frontend",
  name: "Frontend Developer",
  description: "Build for the browser.",
  category: "Web",
  difficulty: "Medium",
  estimatedHours: 40,
  stepsCount: 20,
  modulesCount: 5,
  icon: "code",
  xpReward: 1000,
  prerequisites: [],
  progress: state,
});

describe("RoadmapCard", () => {
  it("tells the learner how many modules they already have from other roadmaps", async () => {
    const onPress = jest.fn();
    await render(<RoadmapCard roadmap={roadmap(progress({ alreadyCompletedModules: 2, alreadyCompletedSteps: 8 }))} onPress={onPress} />);
    expect(screen.getByText("You already have 2 of 5 modules")).toBeTruthy();
    const card = screen.getByRole("button", { name: /Frontend Developer, Not started, you already have 2 of 5 modules/ });
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });

  it("omits the hint when nothing was completed elsewhere", async () => {
    await render(<RoadmapCard roadmap={roadmap(progress())} onPress={jest.fn()} />);
    expect(screen.queryByText(/You already have/)).toBeNull();
    await render(<RoadmapCard roadmap={roadmap(null)} onPress={jest.fn()} />);
    expect(screen.queryByText(/You already have/)).toBeNull();
  });
});
