# Social Media Module

## Overview

The Social Media Module provides comprehensive social media sharing functionality for campaigns, including link generation, UTM parameter management, and tracking analytics.

## Features

### Social Media Platforms Supported

- **WhatsApp**: Direct message sharing with custom text
- **Facebook**: Facebook share dialog integration
- **Twitter/X**: Tweet composition with campaign details
- **LinkedIn**: Professional network sharing
- **Telegram**: Direct message sharing

### Key Functionality

- **Link Generation**: Create platform-specific sharing links
- **UTM Tracking**: Comprehensive UTM parameter management
- **Custom Messages**: Personalized sharing messages
- **Analytics**: Track sharing performance and engagement
- **Multi-Platform**: Generate links for all platforms or specific ones

## API Endpoints

### Generate Social Media Links

```
POST /api/v1/outreach/social-media/campaigns/:campaignId/generate-links
```

**Request Body:**

```json
{
  "platform": "all", // or specific platform
  "customMessage": "Check out this amazing campaign!",
  "includeImage": true,
  "utmSource": "social_media",
  "utmMedium": "social"
}
```

**Response:**

```json
{
  "campaignId": "uuid",
  "campaignTitle": "Campaign Name",
  "baseUrl": "https://frontend.com/campaigns/uuid",
  "socialLinks": {
    "whatsapp": {
      "url": "https://wa.me/?text=...",
      "platform": "whatsapp",
      "type": "share",
      "trackingUrl": "https://backend.com/t/click/uuid?..."
    },
    "facebook": { ... },
    "twitter": { ... },
    "linkedin": { ... },
    "telegram": { ... }
  },
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

### Get Social Media Statistics

```
GET /api/v1/outreach/social-media/campaigns/:campaignId/social-stats
```

**Response:**

```json
{
  "campaignId": "uuid",
  "totalSocialShares": 25,
  "totalSocialClicks": 150,
  "byPlatform": {
    "whatsapp": {
      "shares": 10,
      "clicks": 75,
      "clickRate": "750.00"
    },
    "facebook": {
      "shares": 8,
      "clicks": 45,
      "clickRate": "562.50"
    }
  },
  "topPerformingPlatforms": [
    {
      "platform": "whatsapp",
      "clickRate": "750.00",
      "clicks": 75
    }
  ]
}
```

## UTM Parameters

The module automatically generates UTM parameters for tracking:

- **utm_source**: Source of the traffic (default: "social_media")
- **utm_medium**: Medium of the traffic (default: "social")
- **utm_campaign**: Campaign identifier (format: "social\_{platform}")
- **utm_content**: Content identifier (format: "{platform}\_share")

## Usage Examples

### Generate Links for All Platforms

```javascript
const socialLinks = await generateSocialMediaLinks(campaignId, organizerId, {
  platform: "all",
  customMessage: "Support this amazing cause!",
});
```

### Generate Links for Specific Platform

```javascript
const whatsappLinks = await generateSocialMediaLinks(campaignId, organizerId, {
  platform: "whatsapp",
  customMessage: "Check out this campaign!",
  utmSource: "whatsapp_campaign",
});
```

### Get Platform Performance

```javascript
const stats = await getSocialMediaStats(campaignId, organizerId);
console.log(`Top platform: ${stats.topPerformingPlatforms[0].platform}`);
```

## Integration with Analytics

The social media statistics are automatically integrated into the main outreach analytics:

```javascript
const analytics = await getOutreachAnalytics(campaignId, organizerId);
console.log(`Social media engagement: ${analytics.socialMediaEngagement}%`);
console.log(`Total social shares: ${analytics.totalSocialShares}`);
```

## Tracking and Attribution

All social media links include tracking capabilities:

1. **Link Tokens**: Each share generates a unique link token
2. **Click Tracking**: Track clicks through the `/t/click/:linkTokenId` endpoint
3. **UTM Parameters**: Comprehensive UTM tracking for analytics platforms
4. **Donation Attribution**: Link donations back to social media sources

## Error Handling

The module includes comprehensive error handling:

- **Campaign Validation**: Ensures campaign exists and belongs to organizer
- **Platform Validation**: Validates supported social media platforms
- **Input Validation**: Joi schemas for all input parameters
- **Structured Logging**: Detailed logging for debugging and monitoring

## Security Features

- **Authentication Required**: All endpoints require valid authentication
- **Authorization Checks**: Campaign ownership verification
- **Input Sanitization**: Proper encoding of URLs and messages
- **Rate Limiting**: Integrated with existing rate limiting system

## Performance Considerations

- **Efficient Queries**: Optimized database queries for statistics
- **Caching Ready**: Designed for future caching implementation
- **Async Operations**: Non-blocking link generation
- **Batch Processing**: Support for multiple platform generation

## Future Enhancements

- **Image Generation**: Automatic social media image creation
- **Scheduled Sharing**: Automated social media posting
- **A/B Testing**: Test different message variations
- **Influencer Tracking**: Track sharing by influencer contacts
- **Viral Coefficient**: Calculate campaign virality metrics
