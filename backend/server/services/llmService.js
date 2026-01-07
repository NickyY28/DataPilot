const {GoogleGenerativeAI} = require('@google/generative-ai');

// Initialize the Gemini client with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class LLMService {
    constructor(){
         // use gemini 1.5 flash model for text
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash'});
    }


async getTextResponse(userPrompt) {
    try{
        console.log("Asking Gemini:", userPrompt);
        const result = await this.model.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();

        return{
            success : true,
            question : userPrompt,
            answer : text
        };
    } catch(error){
        console.error('Gemini API Error:', error);
        return{
            success : false,
            error : error.message
        }
    }
}

async analyzeIntent(userCommand){
    try {
        const prompt = `You are an AI assistant for a data analysis tool. Analyze the user's command and identify their intent.
        User Command: "${userCommand}"
        Response in JSON format with:
        {
          "intent" : "general_query | data_cleaning | visualisation |analysis",
          "action" : "specific action to take",
          "parameters" : {}
        }
        Examples: 
        - "clean this data" → intent: data_cleaning
        - "show me a bar chart" → intent: visualization
        - "what's the weather today?" → intent: general_query 
        `;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // try to parse json from response
        const jsonMatch = text.match(/{[\s\S]*}/);
        if(jsonMatch){
            return{
                success : true,
                intent : JSON.parse(jsonMatch[0])
            };
        }
        return{
            success : true,
            intent : {intent : "general_query", action : "response", parameters : {}}
        };
    } catch(error){
        console.error('Intent Analysis Error:', error);
        return{
            success : false,
            error : error.message
        };
    }
} 

async chatWithContext(messages){
    try {
        const chat = this.model.startChat({
            history : messages.slice(0, -1).map(msg => ({
                role : msg.role === 'user' ? 'user' : 'model',
                parts : [{text : msg.content}]
            })),
            generationConfig :{
                maxOutputTokens : 1000,
            },
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;

        return{
            success : true,
            response : response.text()
        };
    } catch(error){
        console.error('Chat Error:', error);
        return{
            success : false,
            error : error.message
        }
    }
}
}

module.exports = new LLMService();