import { Injectable } from '@nitrostack/core';
import type { RepositoryAnalysis } from './github.types.js';

/**
 * Detects repository technologies from file paths and selected file contents.
 */
@Injectable()
export class RepositoryAnalyzerService {
  analyze(paths: string[], fileContents: Record<string, string> = {}): RepositoryAnalysis {
    const normalizedPaths = paths.map((path) => path.toLowerCase());
    const frameworks = new Set<string>();
    const languages = new Set<string>();
    const signals: RepositoryAnalysis['signals'] = [];

    const hasPath = (predicate: (path: string) => boolean): boolean =>
      normalizedPaths.some(predicate);

    const hasFile = (name: string): boolean =>
      normalizedPaths.some((path) => path === name || path.endsWith(`/${name}`));

    const addFramework = (name: string, reason: string, path: string): void => {
      frameworks.add(name);
      signals.push({ type: 'framework', path, reason });
    };

    const addLanguage = (name: string): void => {
      languages.add(name);
    };

    if (hasFile('next.config.js') || hasFile('next.config.mjs') || hasPath((path) => path.startsWith('.next/'))) {
      addFramework('Next.js', 'Detected Next.js config/build artifacts', 'next.config.*');
      addLanguage('Node');
      addLanguage('React');
    }

    if (hasPath((path) => path.endsWith('.tsx')) || hasPath((path) => path.includes('/src/components/'))) {
      addFramework('React', 'Detected React component conventions', 'src/components');
      addLanguage('React');
      addLanguage('Node');
    }

    if (hasFile('angular.json') || hasPath((path) => path.includes('@angular/'))) {
      addFramework('Angular', 'Detected Angular workspace indicators', 'angular.json');
      addLanguage('Node');
    }

    if (hasFile('vue.config.js') || hasPath((path) => path.endsWith('.vue'))) {
      addFramework('Vue', 'Detected Vue single-file components/config', '*.vue');
      addLanguage('Node');
    }

    if (hasPath((path) => path.endsWith('main.py')) || hasFile('requirements.txt') || hasFile('pyproject.toml')) {
      addLanguage('Python');
    }

    if (hasPath((path) => path.endsWith('.go')) || hasFile('go.mod')) {
      addLanguage('Go');
      signals.push({ type: 'language', path: 'go.mod', reason: 'Detected Go module file' });
    }

    if (hasPath((path) => path.endsWith('.rs')) || hasFile('cargo.toml')) {
      addLanguage('Rust');
      signals.push({ type: 'language', path: 'Cargo.toml', reason: 'Detected Rust package manifest' });
    }

    if (
      hasPath((path) => path.endsWith('.ts')) ||
      hasPath((path) => path.endsWith('.js')) ||
      hasFile('package.json')
    ) {
      addLanguage('Node');
    }

    if (hasPath((path) => path.endsWith('.java')) || hasFile('pom.xml') || hasFile('build.gradle')) {
      addFramework('Spring Boot', 'Detected Java service build files', 'pom.xml/build.gradle');
    }

    const packageJsonContent = fileContents['package.json'] ?? fileContents['/package.json'];
    if (packageJsonContent) {
      try {
        const packageJson = JSON.parse(packageJsonContent) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const allDeps = {
          ...(packageJson.dependencies ?? {}),
          ...(packageJson.devDependencies ?? {}),
        };
        const depNames = Object.keys(allDeps);

        if (depNames.includes('express')) {
          addFramework('Express', 'Detected express dependency', 'package.json');
        }
        if (depNames.includes('@nestjs/core')) {
          addFramework('NestJS', 'Detected @nestjs/core dependency', 'package.json');
        }
        if (depNames.includes('next')) {
          addFramework('Next.js', 'Detected next dependency', 'package.json');
        }
        if (depNames.includes('react')) {
          addFramework('React', 'Detected react dependency', 'package.json');
        }
        if (depNames.includes('vue')) {
          addFramework('Vue', 'Detected vue dependency', 'package.json');
        }
        if (depNames.includes('@angular/core')) {
          addFramework('Angular', 'Detected @angular/core dependency', 'package.json');
        }
      } catch {
        signals.push({
          type: 'warning',
          path: 'package.json',
          reason: 'Unable to parse package.json while analyzing repository.',
        });
      }
    }

    if (hasFile('requirements.txt') || hasFile('pyproject.toml')) {
      const requirements = (fileContents['requirements.txt'] ?? '').toLowerCase();
      const pyproject = (fileContents['pyproject.toml'] ?? '').toLowerCase();

      if (requirements.includes('fastapi') || pyproject.includes('fastapi')) {
        addFramework('FastAPI', 'Detected fastapi dependency', 'requirements.txt/pyproject.toml');
      }
      if (requirements.includes('flask') || pyproject.includes('flask')) {
        addFramework('Flask', 'Detected flask dependency', 'requirements.txt/pyproject.toml');
      }
      if (requirements.includes('django') || pyproject.includes('django')) {
        addFramework('Django', 'Detected django dependency', 'requirements.txt/pyproject.toml');
      }
    }

    let packageManager: RepositoryAnalysis['packageManager'] = 'unknown';
    if (hasFile('pnpm-lock.yaml')) {
      packageManager = 'pnpm';
    } else if (hasFile('yarn.lock')) {
      packageManager = 'yarn';
    } else if (hasFile('bun.lockb') || hasFile('bun.lock')) {
      packageManager = 'bun';
    } else if (hasFile('package-lock.json')) {
      packageManager = 'npm';
    } else if (hasFile('poetry.lock')) {
      packageManager = 'poetry';
    } else if (hasFile('requirements.txt')) {
      packageManager = 'pip';
    }

    const hasDockerfile = hasFile('dockerfile');
    const hasGitHubActions = hasPath((path) => path.startsWith('.github/workflows/'));

    if (hasDockerfile) {
      signals.push({
        type: 'infrastructure',
        path: 'Dockerfile',
        reason: 'Detected Dockerfile',
      });
    }
    if (hasGitHubActions) {
      signals.push({
        type: 'infrastructure',
        path: '.github/workflows',
        reason: 'Detected GitHub Actions workflows',
      });
    }

    return {
      frameworks: Array.from(frameworks).sort(),
      languages: Array.from(languages).sort(),
      packageManager,
      hasDockerfile,
      hasGitHubActions,
      signals,
    };
  }
}
