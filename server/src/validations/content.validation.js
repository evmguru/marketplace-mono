import Joi from 'joi'

export const draw = {
  query: {
    words: Joi.string().required(),
    burnIds: Joi.string().required(),
  },
}
