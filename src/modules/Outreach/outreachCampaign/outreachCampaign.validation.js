import Joi from "joi";

function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next({ status: 400, message });
    }
    req[property] = value;
    next();
  };
}

export const validateCreateOutreachCampaign = validate(
  Joi.object({
    name: Joi.string().min(2).max(120).required(),
    description: Joi.string().max(1000).allow("", null),
  })
);

export const validateUpdateOutreachCampaign = validate(
  Joi.object({
    name: Joi.string().min(2).max(120),
    description: Joi.string().max(1000).allow("", null),
    status: Joi.string().valid("draft", "active", "archived"),
  })
);

export const validateOutreachCampaignId = validate(
  Joi.object({
    outreachCampaignId: Joi.string().uuid({ version: "uuidv4" }).required(),
  }),
  "params"
);

export const validateCampaignIdParam = validate(
  Joi.object({
    campaignId: Joi.string().uuid({ version: "uuidv4" }).required(),
  }),
  "params"
);

export const validateSendInvitations = validate(
  Joi.object({
    campaignId: Joi.string().uuid({ version: "uuidv4" }).required(),
    recipients: Joi.array()
      .items(
        Joi.object({
          contactId: Joi.string().uuid({ version: "uuidv4" }).required(),
          email: Joi.string().email().required(),
        })
      )
      .min(1)
      .required(),
    message: Joi.string().trim().max(1000).allow("", null),
    prefillAmount: Joi.number().positive().allow(null),
    utmParams: Joi.object({
      utmSource: Joi.string().trim().max(100),
      utmMedium: Joi.string().trim().max(100),
      utmCampaign: Joi.string().trim().max(100),
      utmContent: Joi.string().trim().max(100),
    }).optional(),
  })
);

// Add recipients validator: either segmentIds[] or all=true
export const validateAddRecipients = validate(
  Joi.object({
    segmentIds: Joi.array()
      .items(Joi.string().uuid({ version: "uuidv4" }))
      .min(1)
      .optional(),
    all: Joi.boolean().optional(),
  }).custom((value, helpers) => {
    if (!value.segmentIds && !value.all) {
      return helpers.error("any.custom", "Provide segmentIds or all=true");
    }
    return value;
  })
);

export const validateSendUpdates = validate(
  Joi.object({
    message: Joi.string().trim().max(1000).required(),
    targetAudience: Joi.string()
      .valid("all", "opened-not-clicked", "clicked-not-donated", "donated")
      .required(),
    utmParams: Joi.object({
      utmSource: Joi.string().trim().max(100),
      utmMedium: Joi.string().trim().max(100),
      utmCampaign: Joi.string().trim().max(100),
      utmContent: Joi.string().trim().max(100),
    }).optional(),
  })
);

export const validateSendThanks = validate(
  Joi.object({
    message: Joi.string().trim().max(1000).required(),
    utmParams: Joi.object({
      utmSource: Joi.string().trim().max(100),
      utmMedium: Joi.string().trim().max(100),
      utmCampaign: Joi.string().trim().max(100),
      utmContent: Joi.string().trim().max(100),
    }).optional(),
  })
);
