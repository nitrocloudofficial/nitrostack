import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REPOS = ['apiguard-react-consumer', 'apiguard-python-consumer', 'apiguard-go-consumer'];
const BASE_DIR = join(process.cwd(), '.demo-repos');

function run(cmd: string, cwd?: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd() });
}

function main() {
  // Ensure base dir exists
  try { rmSync(BASE_DIR, { recursive: true, force: true }); } catch (e) {}
  mkdirSync(BASE_DIR, { recursive: true });

  for (const repo of REPOS) {
    const repoPath = join(BASE_DIR, repo);
    console.log(`\n=== Setting up ${repo} ===`);
    
    // Create remote repo
    try {
      run(`gh repo create ${repo} --public`);
    } catch (err) {
      console.log(`Repo ${repo} might already exist, continuing...`);
    }

    // Initialize local repo
    mkdirSync(repoPath, { recursive: true });
    run('git init', repoPath);
    
    // Create CODEOWNERS
    const githubDir = join(repoPath, '.github');
    mkdirSync(githubDir, { recursive: true });
    writeFileSync(join(githubDir, 'CODEOWNERS'), '* @arckrisofficial\n');

    // Create consumer code matching risky scenario
    const srcDir = join(repoPath, 'src');
    mkdirSync(srcDir, { recursive: true });
    
    let code = '';
    if (repo.includes('react')) {
      code = `
// Using the legacy user API
export async function fetchUser() {
  const res = await fetch('/api/v1/users/123');
  return res.json();
}
      `;
    } else if (repo.includes('python')) {
      code = `
import requests

def fetch_user():
    # Calling the deprecated user endpoint
    response = requests.get('https://api.example.com/v1/users/123')
    return response.json()
      `;
    } else {
      code = `
package main

import (
	"fmt"
	"net/http"
)

func fetchUser() {
	// Accessing old user path
	resp, _ := http.Get("https://api.example.com/v1/users/123")
	fmt.Println(resp.Status)
}
      `;
    }
    
    writeFileSync(join(srcDir, 'consumer' + (repo.includes('react') ? '.js' : repo.includes('python') ? '.py' : '.go')), code);
    
    // Commit and push
    run('git add .', repoPath);
    try {
      run('git commit -m "Initial commit with legacy consumer"', repoPath);
      run(`git remote add origin https://github.com/arckrisofficial/${repo}.git`, repoPath);
      run('git branch -M main', repoPath);
      run('git push -u origin main -f', repoPath); // Force push just in case
    } catch (err) {
      console.error(`Failed to push ${repo}:`, err);
    }
  }
}

main();
