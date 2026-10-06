import { render, screen } from "@testing-library/react-native";
import type { RoadmapModule, RoadmapStep } from "@techrat/types";
import { ModuleHeader } from "./ModuleHeader";
import { StepRow } from "./StepRow";

const step = (overrides: Partial<RoadmapStep> = {}): RoadmapStep => ({
  id: "step-1",
  title: "Branching basics",
  description: "",
  order: 1,
  difficulty: "Easy",
  estimatedMinutes: 15,
  topicSlug: "git",
  topicName: "Git",
  subtopicSlug: null,
  subtopicName: null,
  minimumQuestions: 5,
  minimumAccuracy: 70,
  xpReward: 50,
  status: "Locked",
  criteria: null,
  isNew: false,
  ...overrides,
});

const roadmapModule = (overrides: Partial<RoadmapModule> = {}): RoadmapModule => ({
  id: "m1",
  title: "Version control",
  order: 2,
  xpReward: 200,
  isCompleted: false,
  steps: [step()],
  moduleSlug: "version-control",
  kind: "Core",
  isRequired: true,
  description: "Track and share changes with Git.",
  usedInRoadmaps: [],
  completedElsewhere: false,
  version: 1,
  status: "Current",
  ...overrides,
});

describe("ModuleHeader", () => {
  it("renders a plain required core module without extra badges", async () => {
    await render(<ModuleHeader module={roadmapModule()} />);
    expect(screen.getByRole("header", { name: "Module 2: Version control" })).toBeTruthy();
    expect(screen.getByText("Track and share changes with Git.")).toBeTruthy();
    expect(screen.queryByText("Shared")).toBeNull();
    expect(screen.queryByText(/Also in/)).toBeNull();
    expect(screen.queryByText("Optional")).toBeNull();
    expect(screen.queryByText("Capstone")).toBeNull();
    expect(screen.queryByText("Completed in another roadmap")).toBeNull();
  });

  it("shows the Shared badge and the other roadmaps that reuse the module", async () => {
    await render(
      <ModuleHeader
        module={roadmapModule({
          usedInRoadmaps: [
            { slug: "frontend", name: "Frontend Developer" },
            { slug: "backend", name: "Backend Developer" },
          ],
        })}
      />,
    );
    expect(screen.getByText("Shared")).toBeTruthy();
    expect(screen.getByLabelText("Shared module")).toBeTruthy();
    expect(screen.getByText("Also in: Frontend Developer, Backend Developer")).toBeTruthy();
  });

  it("states completion in another roadmap with an icon and text, not color alone", async () => {
    await render(<ModuleHeader module={roadmapModule({ isCompleted: true, completedElsewhere: true, status: "Completed" })} />);
    expect(screen.getByText("Completed in another roadmap")).toBeTruthy();
    expect(screen.getByLabelText("Module already completed in another roadmap")).toBeTruthy();
    // The generic completion icon would repeat the same information.
    expect(screen.queryByLabelText("Module completed")).toBeNull();
  });

  it("keeps the plain completed icon when the module was completed in this roadmap", async () => {
    await render(<ModuleHeader module={roadmapModule({ isCompleted: true, status: "Completed" })} />);
    expect(screen.getByLabelText("Module completed")).toBeTruthy();
    expect(screen.queryByText("Completed in another roadmap")).toBeNull();
  });

  it("labels optional, capstone and best-practices modules", async () => {
    await render(<ModuleHeader module={roadmapModule({ isRequired: false, kind: "Capstone" })} />);
    expect(screen.getByText("Optional")).toBeTruthy();
    expect(screen.getByLabelText("Optional module, not required to complete this roadmap")).toBeTruthy();
    expect(screen.getByText("Capstone")).toBeTruthy();
    expect(screen.getByLabelText("Capstone module")).toBeTruthy();

    await render(<ModuleHeader module={roadmapModule({ kind: "BestPractices" })} />);
    expect(screen.getByText("Best practices")).toBeTruthy();
    expect(screen.getByLabelText("Best practices module")).toBeTruthy();
    expect(screen.queryByText("Optional")).toBeNull();
  });
});

describe("StepRow", () => {
  it("shows a New badge for steps added after the module was completed", async () => {
    await render(<StepRow step={step({ isNew: true, status: "Current" })} />);
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByLabelText("New step")).toBeTruthy();
  });

  it("has no New badge for existing steps", async () => {
    await render(<StepRow step={step()} />);
    expect(screen.queryByText("New")).toBeNull();
  });
});
