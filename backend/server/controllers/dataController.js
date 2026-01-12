const fs = require('fs');
const dataProcessingService = require('../services/dataProcessingService');
const llmService = require('../services/llmService');

// Store processed data in memory (in production, use database or cache)
const dataStore = new Map();

// Helper function to normalize operation names
const normalizeOperation = (operation) => {
  if (!operation) return 'unknown';

  // Convert to lowercase and replace spaces with underscores
  const normalized = operation.toLowerCase().trim().replace(/\s+/g, '_');

  // Map variations to standard names
  const operationMap = {
    'clean': 'clean',
    'clean_data': 'clean',
    'clean_this_data': 'clean',
    'cleanup': 'clean',
    'remove_duplicates': 'remove_duplicates',
    'remove_duplicate': 'remove_duplicates',
    'duplicates': 'remove_duplicates',
    'fill_missing': 'fill_missing',
    'handle_missing': 'fill_missing',
    'fill_missing_values': 'fill_missing',
    'missing': 'fill_missing',
    'remove_outliers': 'remove_outliers',
    'outliers': 'remove_outliers',
    'standardize': 'standardize',
    'standardize_formats': 'standardize',
    'format': 'standardize',
    'analyze': 'analyze',
    'stats': 'analyze',
    'statistics': 'analyze',
    'show_stats': 'analyze'
  };

  return operationMap[normalized] || normalized;
};

// @desc Upload and parse CSV file
// @route POST /api/data/upload
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse CSV
    const parsedData = await dataProcessingService.parseCSV(req.file.path);

    // Detect column types
    const columnTypes = dataProcessingService.detectColumnTypes(
      parsedData.data,
      parsedData.headers
    );

    // Generate unique ID for this dataset
    const dataId = Date.now().toString();

    // Store data
    dataStore.set(dataId, {
      originalData: parsedData.data,
      currentData: parsedData.data,
      headers: parsedData.headers,
      columnTypes: columnTypes,
      fileName: req.file.originalname,
      uploadedAt: new Date()
    });

    // Delete uploaded file from disk
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'File uploaded and parsed successfully',
      dataId: dataId,
      info: {
        fileName: req.file.originalname,
        rowCount: parsedData.rowCount,
        columnCount: parsedData.headers.length,
        headers: parsedData.headers,
        columnTypes: columnTypes,
        preview: parsedData.data.slice(0, 100) // First 100 rows
      }
    });

  } catch (error) {
    console.error('Upload Error:', error);

    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error processing file',
      error: error.message
    });
  }
};

// @desc Process natural language command on data
// @route POST /api/data/process
exports.processCommand = async (req, res) => {
  try {
    const { dataId, command } = req.body;

    if (!dataId || !command) {
      return res.status(400).json({
        success: false,
        message: 'dataId and command are required'
      });
    }

    const dataset = dataStore.get(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    // Parse command using LLM (with fallback)
    const commandResult = await llmService.processDataCommand(command, {
      columns: dataset.headers,
      rowCount: dataset.currentData.length,
      columnTypes: dataset.columnTypes
    });

    console.log('📝 Command Result:', JSON.stringify(commandResult, null, 2));

    if (!commandResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not understand command',
        error: commandResult.error
      });
    }

    if (commandResult.usedFallback) {
      console.log('ℹ️  Using rule-based command processing (AI unavailable)');
    }

    const rawOperation = commandResult.command.operation;
    const operation = normalizeOperation(rawOperation);
    console.log('🔧 Raw operation:', rawOperation);
    console.log('🔧 Normalized operation:', operation);
    let result;
    let operations = [];

    // Execute the operation
    switch (operation) {
      case 'clean':
        // Full cleaning pipeline
        console.log('🧹 Starting full data cleaning...');

        const dupResult = dataProcessingService.removeDuplicates(dataset.currentData);
        console.log(`   ✓ Removed ${dupResult.duplicatesRemoved} duplicates`);

        const missingResult = dataProcessingService.handleMissingValues(
          dupResult.data,
          dataset.headers,
          'remove'
        );
        console.log(`   ✓ Removed ${missingResult.changes.rowsRemoved} rows with missing values`);

        const formatResult = dataProcessingService.standardizeFormats(
          missingResult.data,
          dataset.headers
        );
        console.log(`   ✓ Standardized ${formatResult.changes.length} columns`);

        result = formatResult;
        operations = [
          { type: 'remove_duplicates', details: { removed: dupResult.duplicatesRemoved } },
          { type: 'handle_missing', details: missingResult.changes },
          { type: 'standardize_formats', details: { columnsAffected: formatResult.changes } }
        ];
        break;

      case 'remove_duplicates':
        console.log('🔍 Removing duplicates...');
        result = dataProcessingService.removeDuplicates(dataset.currentData);
        operations = [{ type: 'remove_duplicates', details: { removed: result.duplicatesRemoved } }];
        console.log(`   ✓ Removed ${result.duplicatesRemoved} duplicates`);
        break;

      case 'fill_missing':
        console.log('📝 Filling missing values...');
        result = dataProcessingService.handleMissingValues(
          dataset.currentData,
          dataset.headers,
          'fill'
        );
        operations = [{ type: 'fill_missing', details: result.changes }];
        console.log(`   ✓ Filled ${result.changes.valuesFilled} missing values`);
        break;

      case 'remove_outliers':
        console.log('📊 Removing outliers...');
        result = dataProcessingService.removeOutliers(dataset.currentData, dataset.headers);
        operations = [{ type: 'remove_outliers', details: result }];
        console.log(`   ✓ Removed ${result.outliersRemoved} outliers`);
        break;

      case 'standardize':
        console.log('✨ Standardizing formats...');
        result = dataProcessingService.standardizeFormats(dataset.currentData, dataset.headers);
        operations = [{ type: 'standardize_formats', details: { columnsAffected: result.changes } }];
        console.log(`   ✓ Standardized ${result.changes.length} columns`);
        break;

      case 'analyze':
        console.log('📈 Analyzing data...');
        const stats = dataProcessingService.getStatistics(dataset.currentData, dataset.headers);
        return res.json({
          success: true,
          operation: 'analyze',
          statistics: stats,
          preview: dataset.currentData.slice(0, 10)
        });

      default:
        console.log('❌ Unknown operation:', operation);
        console.log('💡 Supported operations: clean, remove_duplicates, fill_missing, remove_outliers, standardize, analyze');
        return res.status(400).json({
          success: false,
          message: `Unknown operation: "${operation}". Supported operations: clean, remove_duplicates, fill_missing, remove_outliers, standardize, analyze`
        });
    }

    // Update dataset
    dataset.currentData = result.data;
    dataStore.set(dataId, dataset);

    console.log('💬 Generating explanation...');
    // Get AI explanation of changes
    const explanation = await llmService.explainDataCleaning(operations);

    console.log('✅ Processing complete!');

    res.json({
      success: true,
      operation: operation,
      operations: operations,
      explanation: explanation.explanation,
      aiPowered: !explanation.usedFallback,
      result: {
        rowsBefore: dataset.originalData.length,
        rowsAfter: dataset.currentData.length,
        rowsChanged: dataset.originalData.length - dataset.currentData.length,
        preview: dataset.currentData.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ Process Command Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing command',
      error: error.message
    });
  }
};

// @desc Get insights from data
// @route POST /api/data/insights
exports.getInsights = async (req, res) => {
  try {
    const { dataId } = req.body;

    if (!dataId) {
      return res.status(400).json({
        success: false,
        message: 'dataId is required'
      });
    }

    const dataset = dataStore.get(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.currentData,
      dataset.headers
    );

    // Generate AI insights
    const insights = await llmService.generateInsights(
      statistics,
      dataset.currentData.slice(0, 5)
    );

    res.json({
      success: true,
      statistics: statistics,
      insights: insights.insights
    });

  } catch (error) {
    console.error('Get Insights Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating insights',
      error: error.message
    });
  }
};

// @desc Download processed data
// @route GET /api/data/download/:dataId
exports.downloadData = async (req, res) => {
  try {
    const { dataId } = req.params;

    const dataset = dataStore.get(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    // Convert to CSV
    const Papa = require('papaparse');
    const csv = Papa.unparse(dataset.currentData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cleaned_${dataset.fileName}"`);
    res.send(csv);

  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};

// @desc Ask questions about the dataset
// @route POST /api/data/ask
exports.askQuestion = async (req, res) => {
  try {
    const { dataId, question } = req.body;

    if (!dataId || !question) {
      return res.status(400).json({
        success: false,
        message: 'dataId and question are required'
      });
    }

    const dataset = dataStore.get(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    console.log('💬 User Question:', question);

    // Get statistics for context
    const statistics = dataProcessingService.getStatistics(
      dataset.currentData,
      dataset.headers
    );

    // Prepare data context
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.currentData.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.currentData.slice(0, 5)
    };

    // Get AI answer
    const result = await llmService.answerDatasetQuestion(question, dataContext);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to answer question',
        error: result.error
      });
    }

    console.log('✅ Answer generated');

    res.json({
      success: true,
      question: question,
      answer: result.answer,
      aiPowered: !result.usedFallback
    });

  } catch (error) {
    console.error('❌ Ask Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error answering question',
      error: error.message
    });
  }
};

exports.generateChart = async (req, res) => {
  try {
    const { dataId, question } = req.body;

    if (!dataId || !question) {
      return res.status(400).json({
        success: false,
        message: 'dataId and question are required'
      });
    }

    const dataset = dataStore.get(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    console.log('📊 Generating chart for:', question);

    const chartConfig = await llmService.generateChartConfig(question, {
      columns: dataset.headers,
      columnTypes: dataset.columnTypes,
      sampleData: dataset.currentData.slice(0, 10)
    });

    if (chartConfig) {
      res.json({ success: true, chart: chartConfig });
    } else {
      res.status(500).json({ success: false, message: "Could not generate chart configuration" });
    }
  } catch (error) {
    console.error('❌ Generate Chart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating chart',
      error: error.message
    });
  }
};