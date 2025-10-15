import Joi from "joi";

function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((d) => d.message),
      });
    }

    // For query parameters, we need to be careful not to replace the entire query object
    if (property === "query") {
      // Merge validated values back into the original query object
      Object.assign(req.query, value);
    } else {
      req[property] = value;
    }
    next();
  };
}

const destinationMobileMoney = Joi.object({
  phoneNumber: Joi.string().min(9).max(20).required(),
  network: Joi.string().valid("mtn", "airtel", "zanaco").required(),
});

export const validateCreateWithdrawal = validate(
  Joi.object({
    campaignId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default("ZMW"),
    destinationType: Joi.string().valid("mobile_money", "bank").required(),
    destination: Joi.when("destinationType", {
      is: "mobile_money",
      then: destinationMobileMoney.required(),
      otherwise: Joi.object().required(),
    }),
    notes: Joi.string().allow("").optional(),
  }),
  "body"
);

export const validateListWithdrawals = validate(
  Joi.object({
    campaignId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "processing", "paid", "failed")
      .optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50),
  }),
  "query"
);

export const validateAdminListWithdrawals = validate(
  Joi.object({
    campaignId: Joi.string().uuid().optional(),
    organizerId: Joi.string().uuid().optional(),
    status: Joi.string()
      .valid("pending", "approved", "rejected", "processing", "paid", "failed")
      .optional(),
    minAmount: Joi.number().positive().precision(2).optional(),
    maxAmount: Joi.number().positive().precision(2).optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50),
  }),
  "query"
);

export const validateWithdrawalId = validate(
  Joi.object({ withdrawalRequestId: Joi.string().uuid().required() }),
  "params"
);
