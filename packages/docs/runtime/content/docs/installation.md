---
title: "Installation"
description: ""
category: "main"
---

# Installation

This section will guide you through the initial steps to set up your development environment.

We'll cover the necessary prerequisites and walk you through the bootstrapping process, so you can quickly start building your web-based desktop, picking a theme and installing or creating applications.

## Required software

A good code editor (such as Visual Studio Code) is highly recommended, as you’ll be working with configuration files and may need to build or develop applications You will also need:

- [Git](https://git-scm.com)
- [Node](https://nodejs.org)

## Bootstrap a project

When you are ready, bootstrap a new project by running:
```bash
npm create owd
```
Once the process is complete, you can start to develop:
```bash
# Enter the directory you choose
cd owd-client

# Run the dev server with hot-reload
npm run dev
```

## What's next

Well, you've now spawned a new Open Web Desktop project. Here we'll be explained the main structure of the project folders and key configuration files within your Open Web Desktop setup.

### Project structure

| **File/Folder**          | **Description**                                                                                                                          |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **/app**                 | The folder that contains the web app responsible for loading the Desktop.<br/>The entry point for Nuxt is located in `/app/app.vue`      |
| **/app/assets**          | Contains styles that can be used to override the default CSS.<br/>Modify these to customize your design                                  |
| **/app/pages**           | You can add as many pages as needed here and place what you want.<br/>This is a Nuxt-based app, so you can extend it with additional pages |
| **/app/pages/index.vue** | The initial page of the application which includes `<Desktop>`,<br/>the main component provided by the currently active theme            |
| **/dev**                 | This folders provides a structure to help with development.<br/>For example, a new app could be placed in `/dev/apps/<name>`             |
| **/desktop**             | Contains local modules that are considered ready to ship,<br/>as opposed to those still under development in `/dev`                      |
| **nuxt.config.ts**       | Contains the base configuration for Nuxt, including `@owdproject/core`                                                             |
| **desktop.config.ts**        | Defines the app modules you are developing or that you have installed<br/>using `npm install <module>` or downloaded via `git clone <repo>` |
| **package.json**         | Contains the core libraries necessary for Open Web Desktop                                                     |
