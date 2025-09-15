import Joi from "joi";

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    req[property] = value;
    next();
  };
};

const createPostSchema = Joi.object({
  type: Joi.string()
    .valid("standalone", "update", "success_story", "thank_you")
    .required()
    .messages({
      "any.only":
        "Post type must be one of: standalone, update, success_story, thank_you",
      "any.required": "Post type is required",
    }),
  title: Joi.string().max(200).optional().allow("").messages({
    "string.max": "Title cannot exceed 200 characters",
  }),
  body: Joi.string().max(5000).optional().allow("").messages({
    "string.max": "Body cannot exceed 5000 characters",
  }),
  campaignId: Joi.when("type", {
    is: "standalone",
    then: Joi.string().allow(null).default(null),
    otherwise: Joi.string().uuid().optional().allow(null).messages({
      "string.uuid": "Campaign ID must be a valid UUID",
    }),
  }),
  isPinnedToCampaign: Joi.boolean().default(false),
})
  .custom((value, helpers) => {
    // Custom validation: campaign-related posts should have content
    if (value.type !== "standalone" && !value.campaignId) {
      return helpers.error("custom.campaignRequired");
    }

    // Ensure standalone posts don't have campaignId
    if (value.type === "standalone") {
      value.campaignId = null;
      value.isPinnedToCampaign = false;
    }

    return value;
  })
  .messages({
    "custom.campaignRequired":
      "Campaign-related posts must be associated with a campaign",
  });

const validateCreatePost = validate(createPostSchema);

const validatePostId = validate(
  Joi.object({
    postId: Joi.string().uuid().required().messages({
      "string.uuid": "Post ID must be a valid UUID",
      "any.required": "Post ID is required",
    }),
  }),
  "params"
);

export { validateCreatePost, validatePostId };
