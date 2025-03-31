# n8n Gemini Google Search Tool Node

This package provides a custom node for [n8n](https://n8n.io/) that allows you to perform Google searches using the Google Gemini API's built-in search tool (`googleSearchRetrieval`).

## Features

* Leverages Gemini API for grounded search results
* Configurable Gemini model (supports 1.5 Flash/Pro)
* Simple input for search query
* Outputs structured results including the summarized text and citation metadata
* Can be easily integrated as a Tool in n8n AI Agents

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Install in n8n:**
   - Copy the entire project folder to your n8n custom nodes directory
   - Or publish to npm and install via n8n's community nodes interface

4. **Restart n8n** after installation

## Usage

### Standalone Node
1. Add the "Gemini Google Search Tool" node to your workflow
2. Configure with your Google Gemini API credentials
3. Enter your search query
4. Select the desired Gemini model
5. Execute the workflow

### As an AI Agent Tool
1. In your AI Agent node configuration, add a new Tool
2. Select the "Gemini Google Search Tool" node type
3. Map the Agent's input to the node's `query` parameter
4. Configure the tool name and description for the Agent

## Credentials
You need a Google Gemini API key from [Google AI Studio](https://ai.google.dev/).

## Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the code: `npm run build`
4. Test changes in your n8n instance