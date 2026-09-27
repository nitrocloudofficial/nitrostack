# CI workflow — one manual step required

`ci/nitrocloud-ci.yml` is the CI + NitroCloud deploy gate for this repository. It
runs the same steps as the Dockerfile, in the same order, and fails a push before
NitroCloud builds it: install both npm projects, typecheck, the full 366-assertion
suite, a production build, and a boot smoke test that asserts the server comes up
with at least **45** registered tools (44 core + `copilot_chat`), then a Docker
image build + container probe.

It lives here rather than at `.github/workflows/deploy.yml` because the GitHub App
that pushes to this repo is not granted the `workflows` permission, so any push
that creates or edits a file under `.github/workflows/` is rejected outright.

**To activate it, run this once locally (with your own credentials):**

```bash
mkdir -p .github/workflows
git mv ci/nitrocloud-ci.yml .github/workflows/deploy.yml
git commit -m "ci: activate the NitroCloud CI workflow"
git push
```

Nothing else references this path, so the move is the whole activation. The
tool-count assertion inside is already bumped to 45 — no edits needed.
