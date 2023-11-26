/* global afterAll beforeAll describe expect jest test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { PlaygroundMonitor } from '../playground-monitor'

describe('PlaygroundMonitor', () => {
  describe('loads playground', () => {
    const playgroundAPath = fsPath.join(__dirname, 'data', 'playgroundA')
    let playground

    beforeAll(async() => {
      playground = new PlaygroundMonitor({ root : playgroundAPath })
    })

    test('and list projects', async() => expect(await playground.listProjects()).toHaveLength(3))

    test('and retrieve project data', async() => {
      expect(await playground.getProjectData('@orgA/project-01')).toEqual({
        packageJSON     : { name : '@orgA/project-01' },
        projectPath : fsPath.resolve(__dirname, 'data', 'playgroundA', '@orgA', 'project-01')
      })
    })

    test('loads projects regardless of location', async() => {
      expect(await playground.getProjectData('@orgA/project-02')).toBeTruthy() // 'misfiled-project'
    })

    test('can re-load playground', async() => {
      expect(await playground.listProjects()).toHaveLength(3)
      expect(await playground.getProjectData('@orgA/project-02')).toBeTruthy() // 'misfiled-project'
    })
  })

  describe('tracks changes', () => {
    const playgroundBPath = fsPath.join(__dirname, 'data', 'playgroundB')

    test('when a new project is added (existing dir)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })

      const newProjPkgJSONPath = fsPath.join(playgroundBPath, 'empty-dir', 'package.json')
      const newProjPkgJSON = '{ "name": "empty-dir" }'

      await fs.writeFile(newProjPkgJSONPath, newProjPkgJSON)

      expect(await playground.getProjectData('empty-dir')).toBeTruthy()
    })

    test('when a new project is added (dir and package.json added)', async() => {
      const newProjPath = fsPath.join(playgroundBPath, 'new-proj')

      const playground = new PlaygroundMonitor({ root : playgroundBPath })
      try {
        const newProjPkgJSONPath = fsPath.join(newProjPath, 'package.json')
        const newProjPkgJSON = '{ "name": "new-project" }'

        await fs.mkdir(newProjPath)
        await fs.writeFile(newProjPkgJSONPath, newProjPkgJSON)

        expect(await playground.getProjectData('new-project')).toBeTruthy()
      }
      finally {
        await fs.rm(newProjPath, { recursive : true })
      }
    })

    test('when project is deleted (nested dir)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })

      const projPath = fsPath.join(playgroundBPath, '@orgA', 'project-01')

      await fs.rm(projPath, { recursive : true })

      expect(await playground.getProjectData('@orgA/project-01')).toBe(undefined)
    })

    test('when project is deleted (just package.json)', async() => {
      const playground = new PlaygroundMonitor({ root : playgroundBPath })

      const projPath = fsPath.join(playgroundBPath, 'root-proj', 'package.json')

      await fs.rm(projPath, { recursive : true })

      expect(await playground.getProjectData('root-proj')).toBe(undefined)
    })
  })
})
