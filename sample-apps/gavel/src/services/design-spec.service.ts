import { DesignSpec, DesignSpecSchema } from "../schemas/recommendation.schemas.js";
import { ProjectAnalyzerService } from "./project-analyzer.service.js";

export class DesignSpecService {
  private analyzer = new ProjectAnalyzerService();

  private motionPresets: Record<string, { durationMs: number; easing: string }> = {
    "Framer Motion": { durationMs: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    GSAP: { durationMs: 600, easing: "power2.out" },
    Lenis: { durationMs: 1200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    "Magic UI": { durationMs: 400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    "React Bits": { durationMs: 350, easing: "ease-out" },
    "Three.js": { durationMs: 1000, easing: "linear" },
  };

  async generate(projectPath: string, selectedLibrary?: string): Promise<DesignSpec> {
    const profile = await this.analyzer.analyze(projectPath);

    // 1. Resolve Target Library
    const targetLibrary = selectedLibrary || this.resolveLibraryFromIntent(profile.intent?.visualGoal);

    // 2. Map Colors from Extracted Theme Tokens
    const extractedColors = profile.themeTokens.colors;
    const colors: Record<string, string> = {
      primary: extractedColors[0] || "#6366F1",
      secondary: extractedColors[1] || "#10B981",
      accent: extractedColors[2] || "#0F172A",
      background: extractedColors[3] || "#0F172A",
    };

    // 3. Motion Preset Lookup
    const motion = this.motionPresets[targetLibrary] || {
      durationMs: 300,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    };

    // 4. Target Files Selection
    const targetFiles = this.resolveTargetFiles(profile);

    // 5. Code Snippet Generation
    const codeSnippet = this.generateCodeSnippet(targetLibrary, profile.framework, colors);

    const spec: DesignSpec = {
      library: targetLibrary,
      colors,
      motion,
      targetFiles,
      codeSnippet,
    };

    // Validate against Zod schema
    return DesignSpecSchema.parse(spec);
  }

  private resolveLibraryFromIntent(visualGoal?: string): string {
    switch (visualGoal) {
      case "smooth-scroll":
        return "Lenis";
      case "3d-showcase":
        return "Three.js";
      case "micro-interactions":
        return "React Bits";
      case "minimal":
        return "Magic UI";
      default:
        return "Framer Motion";
    }
  }

  private resolveTargetFiles(profile: any): string[] {
    const files: string[] = [];
    if (profile.framework === "next") {
      files.push("app/page.tsx", "components/Hero.tsx");
    } else {
      files.push("src/App.tsx", "src/components/Hero.tsx");
    }
    return files;
  }

  private generateCodeSnippet(library: string, framework: string, colors: Record<string, string>): string {
    switch (library) {
      case "Framer Motion":
        return `import { motion } from "framer-motion";

export function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="p-6 rounded-lg bg-[${colors.primary}] text-white"
    >
      <h3>Framer Motion Component</h3>
    </motion.div>
  );
}`;

      case "GSAP":
        return `import { useEffect, useRef } from "react";
import gsap from "gsap";

export function GsapHero() {
  const heroRef = useRef(null);

  useEffect(() => {
    gsap.from(heroRef.current, {
      opacity: 0,
      y: 40,
      duration: 0.6,
      ease: "power2.out"
    });
  }, []);

  return <div ref={heroRef} style={{ color: "${colors.primary}" }}>GSAP Animated Hero</div>;
}`;

      case "Lenis":
        return `import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}`;

      case "Magic UI":
        return `import { ShineBorder } from "@/components/magicui/shine-border";

export function MagicCard() {
  return (
    <ShineBorder color={["${colors.primary}", "${colors.secondary}"]} borderRadius={8}>
      <div className="p-8">Magic UI Shine Component</div>
    </ShineBorder>
  );
}`;

      case "React Bits":
        return `import Particles from "@/components/reactbits/Particles";

export function BackgroundCanvas() {
  return (
    <div className="relative w-full h-64 bg-[${colors.background}]">
      <Particles particleColors={["${colors.primary}", "${colors.secondary}"]} particleCount={200} />
    </div>
  );
}`;

      case "Three.js":
        return `import { Canvas } from "@react-three/fiber";

export function ThreeScene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="${colors.primary}" />
      </mesh>
    </Canvas>
  );
}`;

      default:
        return `// Starter code snippet for ${library}`;
    }
  }
}
