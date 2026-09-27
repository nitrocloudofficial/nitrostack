import mongoose from "mongoose";

// ── Minimal inline schemas (avoids importing from main Next.js project
//    which uses @/ path aliases incompatible with a standalone Node process) ──

const roadmapSchema = new mongoose.Schema({
  title: String,
  steps: [String],
  resources: [String],
  completedSteps: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      stepIndices: [Number],
    },
  ],
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  roadmaps: [{ type: mongoose.Schema.Types.ObjectId, ref: "Roadmap" }],
}, { timestamps: true });

// Avoid "Cannot overwrite model once compiled" in long-running process
const RoadmapModel =
  mongoose.models.Roadmap || mongoose.model("Roadmap", roadmapSchema);
const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);

// ── Structured context shape returned by this resource ──────────────────────
export interface UserContextResult {
  userId: string;
  studentName: string;
  hasRoadmap: boolean;
  targetRoles: string[];
  currentWeakAreas: string[];
  latestInterview: {
    weakArea: string;
    executionSucceeded: boolean;
    timeComplexity: string;
    spaceComplexity: string;
    finalFeedback: string;
    completedAt: string;
  } | null;
}

// ── Safe empty fallback returned on any DB error ─────────────────────────────
const EMPTY_CONTEXT = (userId: string): UserContextResult => ({
  userId,
  studentName: "",
  hasRoadmap: false,
  targetRoles: [],
  currentWeakAreas: [],
  latestInterview: null,
});

// ── Best-effort: infer weak areas from roadmap steps ─────────────────────────
// Assumption: "weak areas" aren't stored as a separate field on the roadmap.
// We treat the first 2 foundational steps as current weak areas, since they
// represent the most basic topics the student is still working through.
function inferWeakAreas(steps: string[]): string[] {
  if (!steps || steps.length === 0) return [];

  const foundationalKeywords = [
    "basic", "beginner", "intro", "introduction", "fundamentals",
    "foundation", "setup", "install", "overview", "concepts",
  ];

  const foundational = steps.filter((step) =>
    foundationalKeywords.some((kw) => step.toLowerCase().includes(kw))
  );

  // Fall back to first 2 steps if no keyword matches
  return foundational.length > 0
    ? foundational.slice(0, 3)
    : steps.slice(0, 2);
}

// ── Main resource handler ─────────────────────────────────────────────────────
export async function getUserContext(userId: string): Promise<UserContextResult> {
  try {
    // Connect if not already connected (this server manages its own connection)
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI;
      if (!uri) throw new Error("MONGODB_URI not set");
      await mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 5 });
    }

    const user = await UserModel.findById(userId)
      .populate<{ roadmaps: any[] }>("roadmaps")
      .lean();

    if (!user) return EMPTY_CONTEXT(userId);

    const roadmaps: any[] = user.roadmaps ?? [];

    if (roadmaps.length === 0) {
      return {
        ...EMPTY_CONTEXT(userId),
        studentName: user.name ?? "",
      };
    }

    // Use the most recently created roadmap (last in array = most recent)
    const latestRoadmap = roadmaps[roadmaps.length - 1];
    const targetRoles: string[] = roadmaps
      .map((r: any) => r.title)
      .filter(Boolean);
    const weakAreas = inferWeakAreas(latestRoadmap?.steps ?? []);

    // latestInterview: null until interviewSession.model.ts is built
    // (placeholder — wire in by querying InterviewSession.findOne({ userId }).sort({ createdAt: -1 }))
    const latestInterview = null;

    return {
      userId,
      studentName: user.name ?? "",
      hasRoadmap: true,
      targetRoles,
      currentWeakAreas: weakAreas,
      latestInterview,
    };
  } catch (err) {
    // Never throw from here — mentor chat must never break due to context fetch
    console.error("[mentor-context] getUserContext error:", err);
    return EMPTY_CONTEXT(userId);
  }
}
