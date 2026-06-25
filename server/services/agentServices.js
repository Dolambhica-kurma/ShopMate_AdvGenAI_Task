require('dotenv').config();

const {
  checkOrderStatusTool,
  searchProductsTool,
  getRefundPolicyTool,
} = require('../Tools/shopTools');

const { createAgent } = require('langchain');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
});

const agent = createAgent({
  model,
  tools: [
    checkOrderStatusTool,
    searchProductsTool,
    getRefundPolicyTool,
  ],
  systemPrompt:
    'You are a helpful customer support assistant for ShopMATE. ' +
    'ShopMATE is an online store. ' +
    'Use the available tools to answer questions about orders. ' +
    'Always be polite and concise. ' +
    'If you cannot find the information, say so clearly.',
});

async function runShopAgent(userMessage) {
  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  return String(result.messages.at(-1).content);
}

module.exports = { runShopAgent };
