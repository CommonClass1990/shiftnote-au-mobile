@echo off
setlocal EnableDelayedExpansion
title Push ShiftNote AU Mobile to GitHub
echo ============================================================
echo   ShiftNote AU Mobile - GitHub Push Utility
echo ============================================================
echo.
rem Uses your normal Git credentials (Git Credential Manager or `gh auth login`).
rem It never asks for a token and never force-pushes, so remote history is safe.

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed or not on PATH. Install it from https://git-scm.com/
  goto :end
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo This folder is not a Git repository. Run "git init" and add a remote first.
  goto :end
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  set /p REPO_URL="Enter GitHub repository URL (e.g. https://github.com/you/shiftnote-au-mobile.git): "
  git remote add origin "!REPO_URL!"
)

echo Pushing branch "%BRANCH%" to origin...
git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo Push failed. If the remote has new commits, run "git pull --rebase" and try again.
) else (
  echo Successfully pushed ShiftNote AU Mobile to GitHub.
)

:end
endlocal
pause
