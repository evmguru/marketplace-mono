import { catchAsync, deepExtend } from '../utils'

/**
 * Final middleware before sending response to user
 * Named the "finalResponder"
 */
export default catchAsync(async (req, res, next) => {
  // skip if route is invalid
  if (!req.route) return next()

  // READ: http://expressjs.com/en/api.html#res.locals
  const passOn = res.locals

  // Unify response syntax
  const resJson = {
    error: null,
    status: 'success',
    msg: '',
    payload: {},
  }

  // check for error
  if (passOn.error) {
    resJson.error = passOn.error
    resJson.status = 'error'
  }

  // bump up `msg` if passed (and delete passOn.msg)
  if (passOn.msg) {
    resJson.msg = passOn.msg
    delete passOn.msg
  }

  // finally, deep extend (to copy everything from passOn to resJson.payload
  resJson.payload = deepExtend(resJson.payload, passOn)

  if (resJson.error) res.status(passOn.error.statusCode || 500).send(resJson)
  else res.status(200).send(resJson)
})
