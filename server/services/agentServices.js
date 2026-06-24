require('dotenv').config();
const { checkOrderStatusTool, searchProductsTool, getRefundpolicyTool } = require('../Tools/shopTools');
process.env.GOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const { createAgent } = require('langchain');



const agent = createAgent({
    model:'google-gemini:gemini-2.5-flash',
    tools: [checkOrderStatusTool],
    systemPrompt:
    'you are a helpful customer support assistant for ShopMATE' +
    'ShopMATE is an online store.' +
    'Use the available tools to answer questions about orders.' +
    'Always be polite and concise.' +
    'if you cannot find the information, say so clearly.',

});
async function runShopAgent(userMesage) {
    const result = await agent.invoke({
        messages: [{role: 'user', content: userMesage}],
    });
    return String(result.messages.at(-1).content);
}

module.exports = { runShopAgent };