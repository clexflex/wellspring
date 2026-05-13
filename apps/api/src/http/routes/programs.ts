import { Router } from 'express'

import {
  createCreatorProgram,
  deleteCreatorProgram,
  getCreatorProgram,
  listCreatorPrograms,
  updateCreatorProgram,
} from '../../programs/service'
import { requireAuth } from '../middleware/auth'
import {
  createProgramSchema,
  listProgramsQuerySchema,
  programParamsSchema,
  updateProgramSchema,
} from '../schemas/programs'
import { parseWithSchema } from '../validation'

export function createProgramsRouter(): Router {
  const router = Router()

  router.use(requireAuth)

  router.get('/', async (req, res, next) => {
    try {
      const query = parseWithSchema(listProgramsQuerySchema, req.query)
      const response = await listCreatorPrograms({
        creatorId: req.auth!.creatorId,
        ...query,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/', async (req, res, next) => {
    try {
      const payload = parseWithSchema(createProgramSchema, req.body)
      const response = await createCreatorProgram({
        creatorId: req.auth!.creatorId,
        ...payload,
      })

      res.status(201).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.get('/:programId', async (req, res, next) => {
    try {
      const params = parseWithSchema(programParamsSchema, req.params)
      const response = await getCreatorProgram({
        creatorId: req.auth!.creatorId,
        ...params,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:programId', async (req, res, next) => {
    try {
      const params = parseWithSchema(programParamsSchema, req.params)
      const payload = parseWithSchema(updateProgramSchema, req.body)
      const response = await updateCreatorProgram({
        creatorId: req.auth!.creatorId,
        ...params,
        ...payload,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:programId', async (req, res, next) => {
    try {
      const params = parseWithSchema(programParamsSchema, req.params)
      await deleteCreatorProgram({
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
