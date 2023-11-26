import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { find } from 'find-plus'

const PlaygroundMonitor = class {
  #data
  #root

  constructor({ root = throw new Error("Must provide 'playgroundRoot' when initalizing PlaygroundMonitor.") } = {}) {
    this.#root = root
  }

  async listProjects(sortFunc) {
    await this.#refreshProjects()

    return Object.keys(this.#data).sort(sortFunc)
  }

  async getProjectData(projectName) {
    await this.#refreshProjects()

    return structuredClone(this.#data[projectName])
  }

  async #loadContainer(containerPath) {
    const subDirs = await find({
      depth       : 1,
      onlyDirs    : true,
      root        : containerPath,
      excludeRoot : true
    })

    const ops = []
    for (const subDir of subDirs) {
      const packagePath = fsPath.join(subDir, 'package.json')
      if (existsSync(packagePath)) {
        ops.push(this.#loadPackage(packagePath))
      }
      else {
        ops.push(this.#loadContainer(subDir))
      }
    }

    await Promise.all(ops)
  }

  async #loadPackage(packagePath) {
    const packageContents = await fs.readFile(packagePath, { encoding : 'utf8' })

    const packageJSON = JSON.parse(packageContents)

    const { name } = packageJSON
    const data = {
      packageJSON,
      projectPath : fsPath.dirname(packagePath)
    }
    this.#data[name] = data

    return data
  }

  async #refreshProjects() {
    this.#data = {}

    const rootPkg = fsPath.join(this.#root, 'package.json')
    if (existsSync(rootPkg)) {
      await this.#loadPackage(rootPkg)

      return
    }
    // else
    await this.#loadContainer(this.#root)
  }
}

export { PlaygroundMonitor }
