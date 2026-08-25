import express from 'express'
import { getGoogleReviews } from '../controllers/googleReviewsController.js'

const publicRouter = express.Router()

publicRouter.get('/google-reviews', getGoogleReviews)

export default publicRouter
