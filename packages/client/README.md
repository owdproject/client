# Open Web Desktop - Client

<p>
    <img src="https://i.imgur.com/qiBDv2q.png" alt="Open Web Desktop" />
</p>

<p>
    <a href="https://github.com/owdproject/owd-client/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue.svg" /></a>
    <a href="https://github.com/owdproject/owd-client"><img src="https://img.shields.io/badge/owd-client-3A9CB6" /></a>
    <a href="https://github.com/owdproject/owd-client"><img src="https://img.shields.io/github/release/owdproject/owd-client.svg" /></a>
    <a href="https://www.npmjs.com/package/@owd-client/core"><img src="https://img.shields.io/npm/v/@owd-client/core.svg?color=blue" /></a>
    <a href="https://github.com/topics/owd-modules"><img src="https://img.shields.io/badge/owd-modules-888" /></a>
    <a href="https://discord.gg/3KFVP8b"><img src="https://img.shields.io/badge/chat-on%20discord-7289da.svg" /></a>
</p>

## Overview
Open Web Desktop is an experimental project that aims to provide a simple environment to create your own web desktop, and to extend it through modules and other integrations. OWD Client is based on Vue.js 2.

[Check the demo](https://demo.owdproject.org) of this `owd-client` base repository, decked out with some modules.

## Features
- Open-source web desktop client based on Vue.js 2
- Fully extendable through client and server modules
- Fully extendable through pages and Vue components
- Global notifications and terminal commands support
- Vuex, Vue Router & Vuetify implemented by default

## About this project
Open Web Desktop is divided in two main repositories:
- [owd-client](https://github.com/owdproject/owd-client): Open Web Desktop client, made with Vue.js 2
- [owd-server](https://github.com/owdproject/owd-server): Open Web Desktop server, made with Nest.js (TBA)

## Getting started
Required software:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org)

At the moment there is no OWD CLI available to bootstrap a new client instance with a single command,
but you can proceed manually. Once you have everything installed, clone the repository.

```
# Using HTTPS
git clone https://github.com/owdproject/owd-client.git

# Using SSH
git clone git@github.com:owdproject/owd-client.git
```

Copy the `owd-client/packages/client` folder somewhere, install dependencies and then you'll ready to go.
```
# Make a folder for your owd-client instance
mkdir my-owd-client

# Copy the client package files into your instance
cp -a owd-client/packages/client/. my-owd-client

# Navigate to your owd-client instance
cd my-owd-client

# Install dependencies
npm install

# Run owd-client in development mode
npm run serve
```

If you want to publish your desktop, build the source and deploy `my-owd-client/dist`.
```
# Build owd-client for production
npm run build
```

## Modules
OWD modules may include a `client` or a `server` folder. Since there is no OWD CLI available for module installation, you have to install modules manually too.
Here you can find [some modules](https://github.com/topics/owd-modules).

### Install a new module
To install a module, copy the content of the  `owd-module/client` folder into `src/modules/<module-name>`.

Always take a look at the README.md, you may have to move some other folders like `config` or `public`.

#### Install module dependencies
Some modules may require additional dependencies, or other OWD modules to be installed.

Check the `src/modules/<module-name>/module.json` config. If you find some `dependencies`,
install each one by running `npm install <dependency-name>` in the root folder of your owd-client instance.

#### Define the installed module
To allow OWD to load the installed module, you have to define it under `my-owd-client/config/modules.json`.
Be sure to add every module in the `modulesEnabled` property like the example above:

```json
{
  "type": "client",
  "modulesEnabled": {
    "sample": {
      "name": "about",
      "version": "1.4.0",
      "url": "https://www.github.com/owdproject/owd-client"
    },
    "your-module-name": {
      "name": "<your-module-name>",
      "version": "1.0.0",
      "url": "<your-repo-link>"
    }
  }
}
```

## Contributing

### Local development
The OWD Client repository is a [lerna](https://github.com/lerna/lerna) monorepo that includes the client boilerplate, the client core, and in the future also something else (like the docs), just to keep everything in a single place.

### Setting up your environment

Required software:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org)
- [Yarn](https://classic.yarnpkg.com)

Once you have everything installed, clone the repository:

```
# Using HTTPS
git clone https://github.com/owdproject/owd-client.git

# Using SSH
git clone git@github.com:owdproject/owd-client.git
```

Then install dependencies and run Open Web Desktop in development mode.
```
# Navigate to the owd-client folder
cd owd-client

# Install dependencies using yarn
yarn install

# Run OWD in development mode
yarn serve
```
This will bootstrap the lerna monorepo, allowing you to run and edit both client and core packages.   
If you intend to contribute to the project, please join our [community chat](https://discord.gg/3KFVP8b).

## Supporters

See all sponsors & backers in the [BACKERS.md](BACKERS.md).

<a href="https://www.patreon.com/hacklover">
    <img src="https://i.imgur.com/KODHUwR.png" width="160" alt="Become a Patron" />
</a>
&nbsp;
<a href="https://www.liberapay.com/hacklover">
    <img src="https://i.imgur.com/tGMNTUz.png" width="160" alt="Become a Patron" />
</a>

## License
This project is released under the [GNU GPL3 License](LICENSE).