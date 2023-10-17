import { existsSync, statSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import chokidar from 'chokidar'

import { find } from '@liquid-labs/find-plus'

const dirOrPackageJSON = (dirEnt) => dirEnt.isDirectory() || dirEnt.name === 'package.json'

const hasPackageJSON = (dirEnt) => {
  // because we're only looking at directories, we know dirEnt describes a directory
  const pkgPath = fsPath.join(dirEnt.path, dirEnt.name, 'package.json')
  return existsSync(pkgPath)
}

const Playground = class {
  #data = {}
  #depth
  #projects
  #root
  #watcher

  constructor({ depth = 2, root = throw new Error("Must provide 'playgroundRoot' when initalizing Playground.")}) {
    this.#root = root
    this.#depth = depth
  }

  async close() {
    await this.#watcher?.close()
  }

  listProjects(sortFunc) {
    return Object.keys(this.#data).sort(sortFunc)
  }

  getProjectData(projectName) {
    return structuredClone(this.#data[projectName])
  }

  async refreshProjects() {
    if (this.#watcher) {
      this.#watcher.unwatch('**/*')
    }

    const projectDirs = await find({ 
      depth: this.#depth,
      dirsOnly : true,
      root: this.#root, 
      tests : [ hasPackageJSON ]
    })

    this.#data = {}

    const loadPkg = async (pkgPath) => {
      // console.log('considering loading package (' + pkgPath + ')') // DEBUG
      if (pkgPath.endsWith('package.json')) {
        // console.log('loading pkg:', pkgPath)// DEBUG
        const pkgContents = await fs.readFile(pkgPath, { encoding: 'utf8' })
        try {
          const pkgJSON = JSON.parse(pkgContents)

          const { name } = pkgJSON
          this.#data[name] = {
            pkgJSON,
            projectPath: fsPath.dirname(pkgPath)
          }
          // console.log('package ' + pkgPath + ' loaded')
        }
        catch (e) { console.log(e.stack)  // DEBUG
        } // we may get incomplete JSON when updating as the file is written
      }
    }

    for (const projectPath of projectDirs) {
      const pkgPath = fsPath.join(projectPath, 'package.json')
      await loadPkg(pkgPath)
    }

    const toWatch = await find({ depth: this.#depth, root: this.#root, tests: [ dirOrPackageJSON ] })

    this.#watcher = chokidar.watch(toWatch)

    this.#watcher.on('add', loadPkg)
    this.#watcher.on('change', loadPkg)
    this.#watcher.on('unlink', (path) => {
      console.log('considering removing ' + path) // DEBUG
      if (path.endsWith('package.json')) {
        console.log('removing ' + path) // DEBUG
        this.#watcher.unwatch(path)
        const testPath = fsPath.dirname(path)
        for (const [key, {projectPath}] of Object.entries(this.#data)) {
          if (testPath === projectPath) {
            delete this.#data[key]
            console.log(path + ' removed') // DEBUG
            break
          }
        }
      }
    })

    this.#watcher.on('addDir', (path) => { // only watch dirs within 'depth' of #root
      // console.log('considering watching ' + path) // DEBUG
      let testPath = path
      for (let depth = 0; depth <= this.#depth; depth += 1) {
        if (testPath === this.#root) {
          // console.log('watching ' + path) // DEBUG
          this.#watcher.add(path)
        }
        testPath = fsPath.dirname(testPath)
      }
    })
    this.#watcher.on('unlinkDir', (path) => {
      console.log('unwatching ' + path) // DEBUG
      this.#watcher.unwatch(path)
      for (const [key, {projectPath}] of Object.entries(this.#data)) {
        if (path === projectPath) {
          console.log('removing project at ' + path) // DEBUG
          delete this.#data[key]
          break
        }
      }
    })

    return this
  }
}

export { Playground }