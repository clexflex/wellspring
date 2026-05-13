import { Router } from 'express'

import {
  createCreatorSession,
  deleteCreatorSession,
  getCreatorSession,
  listCreatorProgramSessions,
  reorderCreatorProgramSessions,
  updateCreatorSession,
} from '../../sessions/service'
import { requireAuth } from '../middleware/auth'
import {
  createSessionSchema,
  programSessionParamsSchema,
  reorderSessionsSchema,
  sessionParamsSchema,
  updateSessionSchema,
} from '../schemas/sessions'
import { parseWithSchema } from '../validation'

export function createSessionsRouter(): Router {
  const router = Router()

  router.use(requireAuth)

  router.get('/programs/:programId/sessions', async (req, res, next) => {
    try {
      const params = parseWithSchema(programSessionParamsSchema, req.params)
      const response = await listCreatorProgramSessions({
        creatorId: req.auth!.creatorId,
        ...params,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/programs/:programId/sessions', async (req, res, next) => {
    try {
      const params = parseWithSchema(programSessionParamsSchema, req.params)
      const payload = parseWithSchema(createSessionSchema, req.body)
      const response = await createCreatorSession({
        creatorId: req.auth!.creatorId,
        ...params,
        ...payload,
      })

      res.status(201).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/programs/:programId/sessions/reorder', async (req, res, next) => {
    try {
      const params = parseWithSchema(programSessionParamsSchema, req.params)
      const payload = parseWithSchema(reorderSessionsSchema, req.body)
      const response = await reorderCreatorProgramSessions({
        creatorId: req.auth!.creatorId,
        ...params,
        ...payload,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.get('/sessions/:sessionId', async (req, res, next) => {
    try {
      const params = parseWithSchema(sessionParamsSchema, req.params)
      const response = await getCreatorSession({
        creatorId: req.auth!.creatorId,
        ...params,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.patch('/sessions/:sessionId', async (req, res, next) => {
    try {
      const params = parseWithSchema(sessionParamsSchema, req.params)
      const payload = parseWithSchema(updateSessionSchema, req.body)
      const response = await updateCreatorSession({
        creatorId: req.auth!.creatorId,
        ...params,
        ...payload,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/sessions/:sessionId', async (req, res, next) => {
    try {
      const params = parseWithSchema(sessionParamsSchema, req.params)
      await deleteCreatorSession({
        creatorId: req.auth!.creatorId,
        ...params,
      })

      res.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  return router
}
