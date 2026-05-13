import { Router } from 'express'

import { createSessionMediaUploadUrl } from '../../uploads/service'
import { requireAuth } from '../middleware/auth'
import { createSessionMediaUploadSchema } from '../schemas/uploads'
import { parseWithSchema } from '../validation'

export function createUploadsRouter(): Router {
  const router = Router()

  router.use(requireAuth)

  router.post('/uploads/session-media/presign', async (req, res, next) => {
    try {
      const payload = parseWithSchema(createSessionMediaUploadSchema, req.body)
      const response = await createSessionMediaUploadUrl({
        creatorId: req.auth!.creatorId,
        ...payload,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  return router
}
