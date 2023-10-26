/* global afterAll beforeAll describe expect jest test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { PlaygroundMonitor } from '../playground-monitor'

const TRY_COUNT = 50
const SETTLE_TIME = 250

const tryAgain = async(func, count) => {
  for (let i = 0; i < count; i += 1) {
    try {
      await func()
      return
    }
    catch (e) {
      if (i + 1 === count) {
        throw e
      }
      await new Promise(resolve => setTimeout(resolve, SETTLE_TIME))
    }
  }
}

jest.setTimeout(TRY_COUNT * SETTLE_TIME * 1.1)

describe('PlaygroundMonitor', () => {
  describe('loads playground', () => {
    const playgroundAPath = fsPath.join(__dirname, 'data', 'playgroundA')
    let playground

    beforeAll(async() => {
      playground = new PlaygroundMonitor({ root : playgroundAPath })
      await playground.refreshProjects()
    })

    afterAll(async() => {
      await playground.close()
    })

    test('and list projects', () => expect(playground.listProjects()).toHaveLength(3))

    test('and retrieve project data', () => {
      expect(playground.getProjectData('@orgA/project-01')).toEqual({
        pkgJSON     : { name : '@orgA/project-01' },
        projectPath : fsPath.resolve(__dirname, 'data', 'playgroundA', '@orgA', 'project-01')
      })
    })

    test('loads projects regardless of location (within depth)', () => {
      expect(playground.getProjectData('@orgA/project-02')).toBeTruthy() // 'misfiled-project'
    })

    test('does not pick up packages beyond depth', () => {
      expect(playground.getProjectData('@acme/deep')).toBe(undefined)
    })

    test('can re-load playground', async() => {
      await playground.refreshProjects()

      expect(playground.listProjects()).toHaveLength(3)
      expect(playground.getProjectData('@orgA/project-02')).toBeTruthy() // 'misfiled-project'
    })
  })

  describe('tracks changes', () => {
    const playgroundBPath = fsPath.join(__dirname, 'data', 'playgroundB')

    test('when a new project is added (existing dir)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        await playground.refreshProjects()

        const newProjPkgJSONPath = fsPath.join(playgroundBPath, 'empty-dir', 'package.json')
        const newProjPkgJSON = '{ "name": "empty-dir" }'

        await fs.writeFile(newProjPkgJSONPath, newProjPkgJSON)

        await tryAgain(async() => {
          expect(playground.getProjectData('empty-dir')).toBeTruthy()
        })
      }
      finally {
        await playground.close()
      }
    })

    test('when a new project is added (dir and package.json added)', async() => {
      const newProjPath = fsPath.join(playgroundBPath, 'new-proj')

      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        await playground.refreshProjects()

        const newProjPkgJSONPath = fsPath.join(newProjPath, 'package.json')
        const newProjPkgJSON = '{ "name": "new-project" }'

        await fs.mkdir(newProjPath)
        await fs.writeFile(newProjPkgJSONPath, newProjPkgJSON)

        await tryAgain(async() => {
          expect(playground.getProjectData('new-project')).toBeTruthy()
        }, TRY_COUNT)
      }
      finally {
        await playground.close()
        await fs.rm(newProjPath, { recursive : true })
      }
    })

    test('when project is deleted (nested dir)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        await playground.refreshProjects()

        const projPath = fsPath.join(playgroundBPath, '@orgA', 'project-01')

        await fs.rm(projPath, { recursive : true })

        await tryAgain(async() => {
          expect(playground.getProjectData('@orgA/project-01')).toBe(undefined)
        }, TRY_COUNT)
      }
      finally {
        await playground.close()
      }
    })

    test('when project is deleted (just package.json)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        await playground.refreshProjects()

        const projPath = fsPath.join(playgroundBPath, 'root-proj', 'package.json')

        await fs.rm(projPath, { recursive : true })

        await tryAgain(async() => {
          expect(playground.getProjectData('root-proj')).toBe(undefined)
        }, TRY_COUNT)
      }
      finally {
        await playground.close()
      }
    })

    test('ignores when package.json is created outside of depth', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        await playground.refreshProjects()

        const deepPkgPath = fsPath.join(playgroundBPath, 'deep-pkg', 'nested-dir', 'deep-dir-2', 'package.json')

        fs.writeFile(deepPkgPath, '{ "name": "@acme/deep2" }')

        await tryAgain(async() => {
          expect(playground.getProjectData('@acme/deep2')).toBe(undefined)
        }, TRY_COUNT)
      }
      finally {
        await playground.close()
      }
    })
  })
})
