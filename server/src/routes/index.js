import express from 'express'

import contentRoute from './content/content.route'
import finalResponder from '../middlewares/finalResponder'

const router = express.Router()

const defaultRoutes = [
  {
    // path: '/content',
    path: '/',
    route: contentRoute,
  },
]

defaultRoutes.forEach((route) => router.use(route.path, route.route))

// API route catch-all final responder
// Skips if invalid route
router.use(finalResponder)

export default router
