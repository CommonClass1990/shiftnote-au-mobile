@echo off
title Push ShiftNote AU Mobile to GitHub
echo ============================================================
echo   ShiftNote AU Mobile — GitHub Push Utility
echo ============================================================
echo.
set /p REPO_URL="Enter GitHub repository URL: "
set /p GH_TOKEN="Enter GitHub Personal Access Token: "
node -e "
const git = require('../shiftnote-au/node_modules/isomorphic-git');
const http = require('../shiftnote-au/node_modules/isomorphic-git/http/node');
const fs = require('fs');

const token = process.env.GH_TOKEN;
const url = process.env.REPO_URL;

(async () => {
  console.log('Pushing to', url);
  try {
    await git.push({
      fs,
      http,
      dir: '.',
      url,
      remoteRef: 'refs/heads/main',
      ref: 'main',
      force: true,
      onAuth: () => ({ username: token })
    });
    console.log('Successfully pushed ShiftNote AU Mobile to GitHub!');
  } catch (err) {
    console.error('Push error:', err.message);
  }
})();
"
pause
