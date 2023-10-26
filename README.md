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
  await playground.refreshProjects() // must be called to initalize the PlaygroundMonitor

  const { pkgJSON, projectPath } = playground.getProjectData('@liquid-labs/playground-monitor')
}
finally {
  playground.close() // must call to stop watchers and end process
}
```

## Reference

- `PlaygroundMonitor.constructor({ depth = 2, root })`\
  Creates a new `PlaygroundMonitor` watching the playground at `root` which will look for projects (directories with `package.json` files) `depth` levels down.
  - `depth`: _(opt, int, default: 2)_ how many levels of directories under root to watch
  - `root`: _(req, string)_ the path to the playground root
- `PlaygroundMonitor.close()`:\
  Stops the underlying watchers and frees resources. The node process will hang unlesss the `Playground` instance is closed.
- `PlaygroundMonitor.getProjectData(projectName)`\
  Retrieves the `{ pkgJSON, /*and*/ projectPath }` for the project where `pkgJSON` is the contents of the projects `package.json` file as a JSON data object and `projectPath` is the absolute path to the project root (the directory where `package.json` lives).
  - `projectName`: _(req, string)_ the name (from `package.json`) of the project/package.
- `getWatched()`\
  Returns an object representing all the paths on the file system being watched. The object's keys are all the directories (using absolute paths unless the cwd option was used), and the values are arrays of the names of the items contained in each directory.
- `PlaygroundMonitor.listProjects()`\
  Lists the known project names alphabetically as an array of strings.
- `async PlaygroundMonitor.refreshProjects()`\
  Asynchronously initializes the playground. This method _must_ be called for the `PlaygroundMonitor` to function.
