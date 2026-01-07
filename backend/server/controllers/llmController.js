const LLMService = require('../services/llmService');

exports.askQuestion = async (req, res) =>{
    try{
        const {question} = req.body;
        if(!question){
            return res.status(400).json({
                success : false,
                message : 'Question is required'
            });
        }
    const result = await LLMService.getTextResponse(question);
        if(!result.success){
            return res.status(500).json({
                success : false,
                message : 'Failed to get answer from LLM',
                error : result.error
            });
        }
        res.json({
            success: result.success,
            question: result.question,
            answer: result.answer
        });
    } catch(error){
        console.error('Ask Question Error:', error);
        res.status(500).json({
            success : false,
            message : 'Server Error',
            error : error.message
        });
    }
}

exports.analyzeIntent = async (req, res)=>{
    try{
        const {command} = req.body;
        if(!command){
            return res.status(400).json({
                success : false,
                message : 'Command is required'
            });
        }
        const result = await LLMService.analyzeIntent(command);
        if(!result.success){
            return res.status(500).json({
                success : false,
                message : 'Failed to analyze intent',
                error : result.error
            });
        }
        res.json({
            success : true,
            command : command,
            intent : result.intent
        });
    }catch(error){
        console.error('Analyze Intent Error:', error);
        res.status(500).json({
            success : false,
            message : 'Server Error',
            error : error.message
        });
    }
};


exports.chat = async(req, res) =>{
    try{
         const {messages} = req.body;
         if(!messages || !Array.isArray(messages) || messages.length === 0){
            return res.status(400).json({
                success : false,
                message : 'Messages array is required'
            });
         }
         const result = await LLMService.chatWithContext(messages);
         if(!result.success){
            return res.status(500).json({
                success : false,
                response : result.response
            });
         }
         res.json({
            success : true,
            response : result.response,
         })
    }catch (error){
        console.error('Chat Error:', error);
        res.status(500).json({
            success : false,
            message : 'Server Error',
            error : error.message
        });
    }
}