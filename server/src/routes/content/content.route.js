import express from 'express'

import { validate } from '../../middlewares'
import { contentService } from '../../services'
import { catchAsync, pick } from '../../utils'
import { contentValidation } from '../../validations'

const router = express.Router()

// User registers the tx for transfer/register (setOwn)
router.get(
  '/draw',
  validate(contentValidation.draw),
  catchAsync(async (req, res, next) => {
    const options = pick(req.query, ['phrase', 'owner', 'burnIds'])
    const data = await contentService.draw(options)
    res.locals = { data }
    next()
  }),
)

export default router
