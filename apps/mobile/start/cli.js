#!/usr/bin/env node

const { execSync } = require("child_process");

const projectName = process.argv[2] || "my-new-project";
console.log(`Creating a new project: ${projectName}`);

execSync(`npx create-expo-app@latest ${projectName} --template expo-native`, {
  stdio: "inherit",
});
