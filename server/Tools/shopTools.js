const { tool } =require('@langchain/core/tools');
 const { z } = require('zod');
 const { getDB } = require('../config/db');
 const { Pinecone } = require('@pinecone-database/pinecone');
 const { generateEmbeddings} = require('../services/aiService');



 const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
 const index = pinecone.index(process.env.PINECONE_INDEX);




 async function searchProductsFunction({ query }){
    try {
        const vector = await generateEmbeddings(query);

        const response = await index.query({
            vector,
            topK: 5,
            includeMetadata: true,
        });

        const matches = response.matches || [];

        if (matches.length === 0) {
            return 'No products found matching that description.';
    }

    const results = matches
        .map(match => {
            const meta = match.metadata || {};
            return `${i + 1}, ${meta.name} - $${meta.price};`
        })
        .join('\n');

        return `Here are the closest matching products:\n${results}`;
    }catch(error) {
        return `Product search failed: ${error.message}`;
    }
 }





 const searchProductsTool = tool(searchProductsFunction, {
    name: 'search_products',
    description:
    'Search the ShopMATE products catalog for a natural language description. ' +
    'Use this when the customer asks whether a product is available ' +
    'or for product recommendations.',
    schema: z.object({
        query: z
        .string()
        .describe('A natural language description of what the customer is looking for, ' + 
            'for example "wireless headphones under $100" or "red running shoes".'),
    }),
 });




 async function checkOrderStatusFunction({orderId}) {
    try{
        const db = getDB();
        const order = await db.collection('orders').findOne({ _id: new require('mongodb').ObjectId(orderId) });
        if (!order) {
            return `No order found with id ${orderId} `;
        }
        const itemList = order.items
        .map(item => `${item.quantity}x ${item.name}`)
        .join(', ');
        return(
            `Order ${order.orderId} contains: ${itemList}. `+
            `Current status: ${order.status}.`
        );
    } catch (err) {
        return `Could not look up order ${orderId}: ${err.meassage}`;
    }
}



const checkOrderStatusTool = tool(checkOrderStatusFunction, {
    name: 'check_order_status',
    description:
    'Look up the status of a customer order by its order id. ' +
    'Use this when the customer asks where their order is.',
    schema: z.object({
        orderId: z
        .string()
        .describe('The order id to look up, for example ORD-1001.'),
    }),
});



async function getRefundPolicyFunction ({ question }) {
    try {
        const vector = await generateEmbedding(question);
        const response = await index.query({
            vector,
            topK: 3,
            includeMetadata: true,
            filter: { type: 'policy' }
        });


        const matches = response.matches || [];
        if (matches.length === 0) {
            return "No relevant policy information found for that question.";
        }   
        const policyText = matches
        .map((match) => match.metadata.text)
        .join("\n\n");

        return `Relavant policy information:\n${policyText}`;
    } catch (error) {
        return `could not receive policy information: ${error.message}`;

    }
}



const getRefundPolicyTool = tool(getRefundPolicyFunction, {
    name: 'get_refund_policy',
    description:
    `Retrieve the relevant selection for ShopMATE's Refund & Returns Policy .' + 
    'Use this when the customer asks questions about refunds, returns, or exchanges.'`,
        schema: z.object({
        question: z
        .string()
        .describe(
            'The customer question about refunds or returns, ' +
            'for example "Can I return a damaged item?"' +
            'or :How many days do i have to return?"'
        ),
    }),
});


module.exports= { checkOrderStatusTool, searchProductsTool, getRefundPolicyTool };