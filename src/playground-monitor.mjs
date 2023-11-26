import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { find } from 'find-plus'

const PlaygroundMonitor = class {
  #containers
  #data
  #root

  constructor({ root = throw new Error("Must provide 'playgroundRoot' when initalizing PlaygroundMonitor.") }) {
    this.#root = root
  }

  async listProjects(sortFunc) {
    await this.refreshProjects()

    return Object.keys(this.#data).sort(sortFunc)
  }

  async getProjectData(projectName) {
    await this.refreshProjects()
    
    const { projectPath } = this.#data[projectName] || {}
    if (projectPath === undefined) {
      return undefined
    }
    const packagePath = fsPath.join(projectPath, 'package.json')

    return structuredClone(await this.#loadPackage(packagePath))
  }

  async refreshProjects() {
    this.#containers = {}
    this.#data = {}

    const rootPkg = fsPath.join(this.#root, 'package.json')
    if (existsSync(rootPkg)) {
      this.#containers = []
      await this.#loadPackage(rootPkg)

      return
    }
    // else
    await this.#loadContainer(this.#root)
  }

  async #loadContainer(containerPath) {
    console.log('loading container:', containerPath) // DEBUG
    const containerStat = await fs.stat(containerPath)
    this.#containers[containerPath] = containerStat

    const subDirs = await find({
      depth    : 1,
      onlyDirs : true,
      root     : containerPath,
      excludeRoot: true
    })

    console.log('found subdirs:', subDirs, 'of containerPath:', containerPath) // DEBUG

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
    console.log('loading package:', packagePath) // DEBUG
    try {
      const packageContents = await fs.readFile(packagePath, { encoding : 'utf8' })
    
      const packageJSON = JSON.parse(packageContents)

      const { name } = packageJSON
      const data = {
        packageJSON,
        projectPath : fsPath.dirname(packagePath)
      }
      this.#data[name] = data

      return data
    } // we may get incomplete JSON when updating as the file is written
    catch (e) { 
      if (e.code === 'ENONT') {
        for (const [name, data] of Object.entries(this.#data)) {
          if (data.packagePath === packagePath) {
            delete this.#data[name]
          }
        }

        return undefined
      }
      else {
        throw e
      }
    }
  }
}

export { PlaygroundMonitor }
