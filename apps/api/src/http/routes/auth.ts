import { Router } from 'express'

import {
  confirmPasswordReset,
  getCurrentCreatorProfile,
  loginCreator,
  requestPasswordReset,
  signupCreator,
} from '../../auth/service'
import { parseWithSchema } from '../validation'
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signupSchema,
} from '../schemas/auth'
import { requireAuth } from '../middleware/auth'

export function createAuthRouter(): Router {
  const router = Router()

  router.post('/signup', async (req, res, next) => {
    try {
      const payload = parseWithSchema(signupSchema, req.body)
      const response = await signupCreator(payload)
      res.status(201).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/login', async (req, res, next) => {
    try {
      const payload = parseWithSchema(loginSchema, req.body)
      const response = await loginCreator(payload)
      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/password-reset/request', async (req, res, next) => {
    try {
      const payload = parseWithSchema(passwordResetRequestSchema, req.body)
      const response = await requestPasswordReset(payload)
      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.post('/password-reset/confirm', async (req, res, next) => {
    try {
      const payload = parseWithSchema(passwordResetConfirmSchema, req.body)
      const response = await confirmPasswordReset(payload)
      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const response = await getCurrentCreatorProfile(req.auth!.creatorId)
      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  })

  return router
}
