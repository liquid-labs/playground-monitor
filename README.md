# playground-monitor
[![coverage: 97%](./.readme-assets/coverage.svg)](https://github.com/liquid-labs/playground-monitor/pulls?q=is%3Apr+is%3Aclosed) [![Unit tests](https://github.com/liquid-labs/playground-monitor/actions/workflows/unit-tests-node.yaml/badge.svg)](https://github.com/liquid-labs/playground-monitor/actions/workflows/unit-tests-node.yaml)

A file-watching utility to track changes to a developers "playground". Specifically, creates a manifest of projects and watches for the introduction, removal, or changes in project directories and `package.json` files and updates the project manifest accordingly. Built on top of [chokidar](https://github.com/paulmillr/chokidar).

## Installation

```bash
npm i @liquid-labs/playground-monitor
```

## Usage

```javascript
import * as path from 'node:path'

import { PlaygroundMonitor } from '@liquid-labs/playground-monitor' // ESM
// const { PlaygroundMonitor } = require('@liquid-labs/playground-monitor') // CJS

const playgroundPath = fsPath.join(process.env.HOME, 'playground')
const playground = new PlaygroundMonitor({ root: playgroundPath})
try {
  playground.refreshProjects() // must be called to initalize the PlaygroundMonitor

  console.log(playground.listProjects())

  const { pkgJSON, projectPath } = playground.getProjectData('@liquid-labs/playground-monitor')
}
finally {
  playground.close() // must call to stop watchers and end process
}
```

## Reference

___`PlaygroundMonitor.constructor({ /*int:*/ depth = 2, /*path string:*/ root})`___: creates a new `PlaygroundMonitor` watching the playground at `root` (a path string) which will look for projects (directories with `package.json` files) `depth` (an integer, default 2) levels down.

___`PlaygroundMonitor.close()`___: stops the underlying watchers and frees resources. The node process will hang unlesss the `Playground` instance is closed.

___`PlaygroundMonitor.getProjectData(/*string:*/ projectName)`___: retrieves the `{ pkgJSON, /*and*/ projectPath }` for the project where `pkgJSON` is the contents of the projects `package.json` file as a JSON data object aand `projectPath` is the absolute path to the project root (the directory where `package.json` lives).

___`getWatched()`___: Returns an object representing all the paths on the file system being watched. The object's keys are all the directories (using absolute paths unless the cwd option was used), and the values are arrays of the names of the items contained in each directory.

___`PlaygroundMonitor.listProjects()`___: lists the known project names alphabetically as an array of strings.

___`PlaygroundMonitor.refreshProjects()`___: used to initialize the playground tracking