import { Router } from 'express'

import { listCreatorAuditLogs } from '../../audit/service'
import { requireAuth } from '../middleware/auth'
import { auditLogsQuerySchema } from '../schemas/audit-logs'
import { parseWithSchema } from '../validation'

export function createAuditLogsRouter(): Router {
  const router = Router()

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const query = parseWithSchema(auditLogsQuerySchema, req.query)
      const response = await listCreatorAuditLogs({
        creatorId: req.auth!.creatorId,
        ...query,
      })

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  return router
}
