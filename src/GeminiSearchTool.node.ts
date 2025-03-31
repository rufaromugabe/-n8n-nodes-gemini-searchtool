import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
    NodeConnectionType,
    IHttpRequestOptions,
    INodePropertyOptions,
    ILoadOptionsFunctions
} from 'n8n-workflow';

export class GeminiSearchTool implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Gemini Google Search Tool',
        name: 'geminiSearchTool',
        group: ['ai', 'tools'],
        version: 1,
        description: 'Uses Google Gemini API to perform a grounded Google Search',
        defaults: {
            name: 'Gemini Search',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        outputNames: ['Result'],
        credentials: [
            {
                name: 'googleGeminiApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Search Query',
                name: 'query',
                type: 'string',
                default: '',
                required: true,
                placeholder: 'e.g., What is the weather in London?',
                description: 'The question or topic to search for on Google via Gemini.',
            },
            {
                displayName: 'System Instruction',
                name: 'instruction',
                type: 'string',
                default: '',
                required: false,
                placeholder: 'e.g., You are a helpful assistant that provides concise answers',
                description: 'System-level instructions for how to process the search results',
            },
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getModels',
                },
                default: 'gemini-1.5-flash-latest',
                required: true,
                description: 'Choose a Gemini model that supports tool usage (Google Search).',
            },
        ],
    };

    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('googleGeminiApi');
                const apiKey = credentials.apiKey as string;
                const baseUrl = 'https://generativelanguage.googleapis.com';

                const options: IHttpRequestOptions = {
                    url: `${baseUrl}/v1beta/models`,
                    method: 'GET',
                    qs: { key: apiKey },
                    json: true,
                };

                try {
                    const response = await this.helpers.httpRequest(options);
                    const models = response.models || [];
                    
                    return models
                        .filter((model: any) => 
                            model.name.includes('gemini') && 
                            model.supportedGenerationMethods?.includes('generateContent')
                        )
                        .map((model: any) => ({
                            name: model.displayName || model.name.split('/').pop(),
                            value: model.name.split('/').pop(),
                            description: model.description || '',
                        }));
                } catch (error) {
                    console.error('Failed to fetch models:', error);
                    return [
                        { name: 'Gemini 1.5 Flash (latest)', value: 'gemini-1.5-flash-latest' },
                        { name: 'Gemini 1.5 Pro (latest)', value: 'gemini-1.5-pro-latest' },
                    ];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const credentials = await this.getCredentials('googleGeminiApi');
                const apiKey = credentials.apiKey as string;
                if (!apiKey) {
                    throw new NodeOperationError(this.getNode(), 'Google Gemini API key is missing!', { itemIndex: i });
                }
                const baseUrl = 'https://generativelanguage.googleapis.com';

                const model = this.getNodeParameter('model', i, 'gemini-1.5-flash-latest') as string;
                const searchQuery = this.getNodeParameter('query', i, '') as string;
                const instruction = this.getNodeParameter('instruction', i, '') as string;

                if (!searchQuery) {
                    throw new NodeOperationError(this.getNode(), 'Search Query parameter is required.', { itemIndex: i });
                }

                const requestBody: any = {
                    contents: [{
                        parts: [{ text: `Please use the Google Search tool to find information about: "${searchQuery}"` }],
                    }],
                    tools: [{
                        googleSearch: {}
                    }],
                    generationConfig: {
                        temperature: 0.2,
                    },
                };

                if (instruction) {
                    requestBody.systemInstruction = {
                        parts: [{
                            text: instruction
                        }]
                    };
                }

                const options: IHttpRequestOptions = {
                    url: `${baseUrl}/v1beta/models/${model}:generateContent`,
                    method: 'POST',
                    qs: { key: apiKey },
                    body: requestBody,
                    json: true,
                    headers: { 'Content-Type': 'application/json' },
                };

                const responseData = await this.helpers.httpRequest(options);

                if (responseData.promptFeedback?.blockReason) {
                    throw new NodeOperationError(this.getNode(), `Gemini API blocked the prompt: ${responseData.promptFeedback.blockReason}`, { 
                        itemIndex: i,
                        description: responseData.promptFeedback,
                    });
                }

                if (!responseData.candidates || responseData.candidates.length === 0 || !responseData.candidates[0].content?.parts?.[0]?.text) {
                    const finishReason = responseData.candidates?.[0]?.finishReason;
                    throw new NodeOperationError(this.getNode(), `Gemini API did not return a valid text response. Finish Reason: ${finishReason ?? 'N/A'}`);
                }

                const resultText = responseData.candidates[0].content.parts[0].text;
                const citationMetadata = responseData.candidates[0].citationMetadata;

                const resultItem = {
                    json: {
                        searchResult: resultText,
                        ...(citationMetadata && { citations: citationMetadata }),
                        _query: searchQuery,
                        _instruction: instruction,
                        _model: model,
                        _fullApiResponse: responseData,
                    },
                    pairedItem: { item: i },
                };

                returnData.push(resultItem);

            } catch (error) {
                if (this.continueOnFail()) {
                    const errorItem = {
                        json: {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            query: this.getNodeParameter('query', i, '') as string,
                        },
                        pairedItem: { item: i },
                    };
                    returnData.push(errorItem);
                    continue;
                }
                throw new NodeOperationError(this.getNode(), 'Error during Gemini Search', { itemIndex: i });
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}