import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class GoogleGeminiApi implements ICredentialType {
    name = 'googleGeminiApi';
    displayName = 'Google Gemini API';
    documentationUrl = 'https://ai.google.dev/tutorials/get_started_web';
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string' as NodePropertyTypes,
            typeOptions: { password: true },
            default: '',
            description: 'Your Google AI Studio API Key or Vertex AI API Key',
            required: true,
        },
    ];
}