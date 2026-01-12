const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class LLMService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Simple rule-based command parser (fallback when AI fails)
   */
  parseCommandFallback(command) {
    const lowerCommand = command.toLowerCase().trim();

    // Clean/cleanup commands
    if (lowerCommand.includes('clean') || lowerCommand.includes('cleanup')) {
      return {
        operation: 'clean',
        parameters: {},
        explanation: 'Will remove duplicates, handle missing values, and standardize formats'
      };
    }

    // Remove duplicates
    if (lowerCommand.includes('duplicate') || lowerCommand.includes('remove duplicate')) {
      return {
        operation: 'remove_duplicates',
        parameters: {},
        explanation: 'Will remove duplicate rows from the dataset'
      };
    }

    // Fill/handle missing values
    if (lowerCommand.includes('fill') || lowerCommand.includes('missing') || lowerCommand.includes('null')) {
      return {
        operation: 'fill_missing',
        parameters: {},
        explanation: 'Will fill missing values with appropriate defaults (mean for numbers, mode for categories)'
      };
    }

    // Remove outliers
    if (lowerCommand.includes('outlier')) {
      return {
        operation: 'remove_outliers',
        parameters: {},
        explanation: 'Will remove statistical outliers using the IQR method'
      };
    }

    // Standardize
    if (lowerCommand.includes('standardize') || lowerCommand.includes('format')) {
      return {
        operation: 'standardize',
        parameters: {},
        explanation: 'Will standardize text formats and remove extra whitespace'
      };
    }

    // Analyze
    if (lowerCommand.includes('analyze') || lowerCommand.includes('stats') || lowerCommand.includes('statistics')) {
      return {
        operation: 'analyze',
        parameters: {},
        explanation: 'Will show statistical analysis of the dataset'
      };
    }

    // Default
    return {
      operation: 'analyze',
      parameters: {},
      explanation: 'Command not recognized. Showing analysis instead.'
    };
  }

  // Suggested addition to LLMService class
  async verifyConnection() {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent("Hello");
      console.log(result.response.text() + "✅ AI Service Connected Successfully");
    } catch (error) {
      console.error("❌ AI Service Connection Failed:", error.message);
    }
  }

  /**
   * Process natural language data commands with fallback
   */
  async processDataCommand(command, dataContext) {
    try {
      const prompt = `
You are a data processing assistant. The user has a CSV file with the following structure:

Columns: ${dataContext.columns.join(', ')}
Row count: ${dataContext.rowCount}
Column types: ${JSON.stringify(dataContext.columnTypes)}

User command: "${command}"

Determine what data operation the user wants and respond with EXACTLY ONE of these operation names:
- "clean" → remove duplicates and handle missing values
- "remove_duplicates" → only remove duplicate rows  
- "fill_missing" → fill missing values
- "remove_outliers" → remove statistical outliers
- "standardize" → standardize text formats
- "analyze" → show statistics

Respond in JSON format with ONLY these exact operation names (no spaces, no variations):
{
  "operation": "clean",
  "parameters": {},
  "explanation": "brief explanation"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          success: true,
          command: JSON.parse(jsonMatch[0]),
          usedFallback: false
        };
      }

      // If can't parse, use fallback
      console.log('⚠️  Using fallback parser - could not parse AI response');
      return {
        success: true,
        command: this.parseCommandFallback(command),
        usedFallback: true
      };

    } catch (error) {
      console.error('❌ AI Command Processing Error:', error.message);
      console.log('✅ Using fallback rule-based parser');

      // Use fallback on any error
      return {
        success: true,
        command: this.parseCommandFallback(command),
        usedFallback: true
      };
    }
  }

  /**
   * Explain data cleaning operations with fallback
   */
  async explainDataCleaning(operations) {
    try {
      const prompt = `
You are a data analysis assistant. Explain the following data cleaning operations in simple, clear language.

Operations performed:
${JSON.stringify(operations, null, 2)}

Provide:
1. A brief summary of what was done
2. Why each operation was necessary
3. The impact on the data quality

Keep the explanation concise and easy to understand for non-technical users.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return {
        success: true,
        explanation: response.text(),
        usedFallback: false
      };
    } catch (error) {
      console.error('❌ AI Explanation Error:', error.message);
      console.log('✅ Using fallback explanation generator');

      // Generate simple explanation without AI
      return {
        success: true,
        explanation: this.generateFallbackExplanation(operations),
        usedFallback: true
      };
    }
  }

  /**
   * Generate simple explanation without AI
   */
  generateFallbackExplanation(operations) {
    let explanation = "Here's what was done to your data:\n\n";

    operations.forEach((op, index) => {
      switch (op.type) {
        case 'remove_duplicates':
          explanation += `${index + 1}. **Removed Duplicates**: Found and removed ${op.details.removed} duplicate rows. This ensures each record is unique and prevents data redundancy.\n\n`;
          break;

        case 'handle_missing':
          explanation += `${index + 1}. **Handled Missing Values**: Removed ${op.details.rowsRemoved} rows with missing data. This improves data quality by eliminating incomplete records.\n\n`;
          break;

        case 'fill_missing':
          explanation += `${index + 1}. **Filled Missing Values**: Filled ${op.details.valuesFilled} missing values in columns: ${op.details.columnsAffected.join(', ')}. Used statistical methods (mean for numbers, mode for categories).\n\n`;
          break;

        case 'standardize_formats':
          explanation += `${index + 1}. **Standardized Formats**: Cleaned up text formatting in ${op.details.columnsAffected.length} columns. Removed extra spaces and standardized text case.\n\n`;
          break;

        case 'remove_outliers':
          explanation += `${index + 1}. **Removed Outliers**: Removed ${op.details.outliersRemoved} statistical outliers from columns: ${op.details.affectedColumns.join(', ')}. This prevents extreme values from skewing analysis.\n\n`;
          break;
      }
    });

    explanation += "**Impact**: Your data is now cleaner, more consistent, and ready for analysis!";

    return explanation;
  }

  /**
   * Generate insights with fallback
   */
  async generateInsights(statistics, sampleData) {
    try {
      const prompt = `
You are a data analyst. Analyze the following dataset statistics and provide actionable insights.

Statistics:
${JSON.stringify(statistics, null, 2)}

Sample Data (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

Provide:
1. Key findings from the data
2. Interesting patterns or trends
3. Potential data quality issues
4. Recommendations for further analysis

Keep insights practical and concise.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return {
        success: true,
        insights: response.text(),
        usedFallback: false
      };
    } catch (error) {
      console.error('❌ AI Insights Error:', error.message);
      console.log('✅ Using fallback insights generator');

      return {
        success: true,
        insights: this.generateFallbackInsights(statistics),
        usedFallback: true
      };
    }
  }

  /**
   * Generate basic insights without AI
   */
  generateFallbackInsights(statistics) {
    let insights = "**Dataset Overview:**\n\n";

    const columns = Object.keys(statistics);
    const numericColumns = columns.filter(col => statistics[col].type === 'number');
    const categoricalColumns = columns.filter(col => statistics[col].type === 'categorical');

    insights += `- Total columns: ${columns.length}\n`;
    insights += `- Numeric columns: ${numericColumns.length}\n`;
    insights += `- Categorical columns: ${categoricalColumns.length}\n\n`;

    insights += "**Key Findings:**\n\n";

    // Analyze numeric columns
    if (numericColumns.length > 0) {
      insights += `1. **Numeric Data**: Found ${numericColumns.length} numeric columns:\n`;
      numericColumns.slice(0, 3).forEach(col => {
        const stats = statistics[col];
        insights += `   - ${col}: Range ${stats.min} to ${stats.max}, Average: ${stats.mean}\n`;
      });
      insights += "\n";
    }

    // Analyze categorical columns
    if (categoricalColumns.length > 0) {
      insights += `2. **Categorical Data**: Found ${categoricalColumns.length} categorical columns:\n`;
      categoricalColumns.slice(0, 3).forEach(col => {
        const stats = statistics[col];
        insights += `   - ${col}: ${stats.uniqueValues} unique values\n`;
      });
      insights += "\n";
    }

    // Check for missing data
    const columnsWithMissing = columns.filter(col => statistics[col].missing > 0);
    if (columnsWithMissing.length > 0) {
      insights += `3. **Data Quality**: ${columnsWithMissing.length} columns have missing values:\n`;
      columnsWithMissing.slice(0, 3).forEach(col => {
        insights += `   - ${col}: ${statistics[col].missing} missing values\n`;
      });
      insights += "\n";
    }

    insights += "**Recommendations:**\n";
    insights += "- Consider filling or removing missing values\n";
    insights += "- Look for patterns in numeric data distributions\n";
    insights += "- Explore relationships between categorical and numeric variables\n";

    return insights;
  }

  /**
   * Answer questions about the dataset
   */
  async answerDatasetQuestion(question, dataContext) {
    try {
      const prompt = `
You are a data analysis assistant. Answer the user's question about their dataset.

Dataset Information:
- Columns: ${dataContext.columns.join(', ')}
- Row count: ${dataContext.rowCount}
- Column types: ${JSON.stringify(dataContext.columnTypes, null, 2)}

Statistics Summary:
${JSON.stringify(dataContext.statistics, null, 2)}

Sample Data (first 5 rows):
${JSON.stringify(dataContext.sampleData, null, 2)}

User Question: "${question}"

Provide a clear, concise answer based on the dataset information. If the answer requires calculation or analysis that you can see in the data, provide it. If you need more specific data analysis, suggest what operation they should run.

Keep your response conversational and helpful.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return {
        success: true,
        answer: response.text(),
        usedFallback: false
      };
    } catch (error) {
      console.error('❌ AI Q&A Error:', error.message);
      console.log('✅ Using fallback answer generator');

      return {
        success: true,
        answer: this.generateFallbackAnswer(question, dataContext),
        usedFallback: true
      };
    }
  }

  /**
   * Generate basic answer without AI
   */
  generateFallbackAnswer(question, dataContext) {
    const lowerQuestion = question.toLowerCase();

    // How many rows/records?
    if (lowerQuestion.includes('how many') && (lowerQuestion.includes('row') || lowerQuestion.includes('record'))) {
      return `Your dataset contains **${dataContext.rowCount} rows**.`;
    }

    // How many columns?
    if (lowerQuestion.includes('how many') && lowerQuestion.includes('column')) {
      return `Your dataset has **${dataContext.columns.length} columns**: ${dataContext.columns.join(', ')}.`;
    }

    // What columns?
    if (lowerQuestion.includes('what') && lowerQuestion.includes('column')) {
      return `Your dataset has the following columns:\n\n${dataContext.columns.map((col, i) => `${i + 1}. **${col}** (${dataContext.columnTypes[col]})`).join('\n')}`;
    }

    // Missing values?
    if (lowerQuestion.includes('missing') || lowerQuestion.includes('null')) {
      const columnsWithMissing = Object.keys(dataContext.statistics)
        .filter(col => dataContext.statistics[col].missing > 0)
        .map(col => `- ${col}: ${dataContext.statistics[col].missing} missing values`);

      if (columnsWithMissing.length === 0) {
        return "Great news! Your dataset has **no missing values**. All cells are populated.";
      } else {
        return `Your dataset has missing values in the following columns:\n\n${columnsWithMissing.join('\n')}`;
      }
    }

    // Data types?
    if (lowerQuestion.includes('type') || lowerQuestion.includes('data type')) {
      return `Here are the data types for each column:\n\n${Object.entries(dataContext.columnTypes).map(([col, type]) => `- **${col}**: ${type}`).join('\n')}`;
    }

    // Summary/overview?
    if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview') || lowerQuestion.includes('about')) {
      const numericCols = Object.keys(dataContext.columnTypes).filter(col => dataContext.columnTypes[col] === 'number').length;
      const categoricalCols = Object.keys(dataContext.columnTypes).filter(col => dataContext.columnTypes[col] === 'categorical').length;

      return `**Dataset Overview:**\n\n- Total rows: ${dataContext.rowCount}\n- Total columns: ${dataContext.columns.length}\n- Numeric columns: ${numericCols}\n- Categorical columns: ${categoricalCols}\n\nYou can ask more specific questions about the data!`;
    }

    // Default response
    return `I can help you understand your dataset! Here's what I know:\n\n- **Rows**: ${dataContext.rowCount}\n- **Columns**: ${dataContext.columns.length}\n- **Column names**: ${dataContext.columns.slice(0, 5).join(', ')}${dataContext.columns.length > 5 ? '...' : ''}\n\nTry asking:\n- "How many missing values are there?"\n- "What are the column types?"\n- "Show me a summary"\n- "What's the range of [column name]?"`;
  }

  /**
   * Simple text response (for general queries)
   */
  async getTextResponse(userPrompt) {
    try {
      const result = await this.model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async chatWithContext(messages) {
    try {
      // Construct chat history
      const chat = this.model.startChat({
        history: messages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });
      const lastMessage = messages[messages.length - 1].content;
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;

      return {
        success: true,
        response: response.text()
      };
    } catch (error) {
      console.error('Chat Error:', error);
      return { success: false, response: "I'm having trouble connecting to the AI right now." };
    }
  }

  /**
   * Generate a chart configuration based on data and user request
   */
  async generateChartConfig(question, dataContext) {
    try {
      const prompt = `
You are a data visualization expert.
Dataset Columns: ${dataContext.columns.join(', ')}
Column Types: ${JSON.stringify(dataContext.columnTypes)}
Sample Data: ${JSON.stringify(dataContext.sampleData)}
User Request: "${question}"
Based on the request and data, generate a JSON configuration for a chart.
Supported types: "bar", "line", "pie", "scatter".
Rules:
1. "labels": Array of strings for the X-axis (or pie segments).
2. "datasets": Array of objects with "label" and "data" (numbers).
3. If the request is vague, pick the best visualization.
4. Respond ONLY with valid JSON.
Example JSON Structure:
{
  "type": "bar",
  "title": "Sales by Region",
  "labels": ["North", "South", "East"],
  "datasets": [
    {
      "label": "Revenue",
      "data": [12000, 9000, 15000]
    }
  ]
}
`;
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // Extract JSON from response (robust method)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in response:", text);
        return null;
      }

      const jsonStr = jsonMatch[0];
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Chart Gen Error:", error);
      return null;
    }
  }

}

module.exports = new LLMService();