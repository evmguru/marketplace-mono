import Joi from 'joi'

export const draw = {
  query: {
    phrase: Joi.string().required(),
    owner: Joi.string().required(),
    burnIds: Joi.string().optional(),
  },
}
