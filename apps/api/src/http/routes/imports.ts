import { Router } from 'express'

import { importCreatorProgramSessions } from '../../imports/service'
import { requireAuth } from '../middleware/auth'
import { importProgramParamsSchema, importSessionsSchema } from '../schemas/imports'
import { parseWithSchema } from '../validation'

export function createImportsRouter(): Router {
  const router = Router()

  router.use(requireAuth)

  router.post('/programs/:programId/sessions/import', async (req, res, next) => {
    try {
      const params = parseWithSchema(importProgramParamsSchema, req.params)
      const payload = parseWithSchema(importSessionsSchema, req.body)
      const response = await importCreatorProgramSessions({
        creatorId: req.auth!.creatorId,
        ...params,
        ...payload,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  return router
}
