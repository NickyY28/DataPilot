const fs = require("fs");
const dataProcessingService = require("../services/dataProcessingService");
const llmService = require("../services/llmService");
const codeExecutorService = require("../services/codeExecutorService");
const operationRegistry = require("../services/operationRegistry");
const Dataset = require("../models/Dataset");
// const Dataset = require("../models/Dataset");
const ExcelJS = require("exceljs");
const { logPrompt } = require("../services/promptLogger");
const SystemConfig = require("../models/SystemConfig");

// Helper function to normalize operation names
const normalizeOperation = (operation) => {
  if (!operation) return "unknown";

  // Convert to lowercase and replace spaces with underscores
  const normalized = operation.toLowerCase().trim().replace(/\s+/g, "_");

  // Map variations to standard names
  const operationMap = {
    clean: "clean",
    clean_data: "clean",
    clean_this_data: "clean",
    cleanup: "clean",
    remove_duplicates: "remove_duplicates",
    remove_duplicate: "remove_duplicates",
    duplicates: "remove_duplicates",
    fill_missing: "fill_missing",
    handle_missing: "fill_missing",
    fill_missing_values: "fill_missing",
    missing: "fill_missing",
    remove_outliers: "remove_outliers",
    outliers: "remove_outliers",
    standardize: "standardize",
    standardize_formats: "standardize",
    format: "standardize",
    analyze: "analyze",
    stats: "analyze",
    statistics: "analyze",
    show_stats: "analyze",
    filter_rows: "filter_rows",
    filter: "filter_rows",
    remove_rows: "filter_rows",
    delete_rows: "filter_rows",
  };

  return operationMap[normalized] || normalized;
};

// Validation helpers
const validateDataId = (dataId) => {
  if (!dataId) {
    return { valid: false, error: "dataId is required" };
  }
  if (typeof dataId !== "string" && typeof dataId !== "object") {
    return { valid: false, error: "dataId must be a valid string or ObjectId" };
  }
  return { valid: true };
};

const validateRequest = (request) => {
  if (!request) {
    return { valid: false, error: "request is required" };
  }
  if (typeof request !== "string") {
    return { valid: false, error: "request must be a string" };
  }
  if (request.trim().length === 0) {
    return { valid: false, error: "request cannot be empty" };
  }
  if (request.length > 1000) {
    return { valid: false, error: "request is too long (max 1000 characters)" };
  }
  return { valid: true };
};

const validateDataset = (dataset) => {
  if (!dataset) {
    return { valid: false, error: "Dataset not found" };
  }
  if (!dataset.data || !Array.isArray(dataset.data)) {
    return { valid: false, error: "Dataset data is invalid or empty" };
  }
  if (dataset.data.length === 0) {
    return { valid: false, error: "Dataset is empty" };
  }
  return { valid: true };
};

// @desc Upload and parse CSV file
// @route POST /api/data/upload
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Check dynamic file size limit
    const config = await SystemConfig.findOne({ key: "maxFileSize" });
    const maxMB = config ? config.value : 10; // Default 10MB
    const fileSizeMB = req.file.size / (1024 * 1024);

    if (fileSizeMB > maxMB) {
      // Remove file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `File size exceeds the limit of ${maxMB}MB`,
      });
    }

    // Parse CSV
    const parsedData = await dataProcessingService.parseCSV(req.file.path);

    // Detect column types
    const columnTypes = dataProcessingService.detectColumnTypes(
      parsedData.data,
      parsedData.headers
    );

    // Create new Dataset in MongoDB
    // Assuming req.user is populated by auth middleware
    const dataset = await Dataset.create({
      user: req.user._id,
      fileName: req.file.originalname,
      rowCount: parsedData.rowCount,
      columnCount: parsedData.headers.length,
      headers: parsedData.headers,
      columnTypes: columnTypes,
      data: parsedData.data,
      insights: [],
    });

    // Delete uploaded file from disk
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "File uploaded and parsed successfully",
      dataId: dataset._id,
      info: {
        fileName: dataset.fileName,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        headers: dataset.headers,
        columnTypes: dataset.columnTypes,
        preview: dataset.data.slice(0, 100), // First 100 rows
      },
    });
  } catch (error) {
    console.error("Upload Error:", error);

    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error processing file",
      error: error.message,
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
        message: "dataId and command are required",
      });
    }

    const dataset = await Dataset.findById(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    // Check ownership
    // Optional: if (dataset.user.toString() !== req.user.id) return res.status(401)...;

    // Log prompt
    await logPrompt(req.user._id, "process", command);

    // Parse command using LLM (with fallback)
    const commandResult = await llmService.processDataCommand(command, {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
    });

    console.log("📝 Command Result:", JSON.stringify(commandResult, null, 2));

    if (!commandResult.success) {
      // Try to generate code if standard parsing fails
      console.log("⚠️  Standard parsing failed, attempting code generation...");
      try {
        const codeResult = await llmService.generateTransformationCode(
          command,
          {
            columns: dataset.headers,
            rowCount: dataset.data.length,
            columnTypes: dataset.columnTypes,
            sampleData: dataset.data.slice(0, 3),
          }
        );

        if (codeResult.success) {
          console.log("✅ Generated code as fallback");
          const executionResult = await executeCode(
            codeResult.code,
            dataset.data,
            dataset.headers
          );

          if (executionResult.success) {
            dataset.data = executionResult.data;
            dataset.headers = executionResult.headers || dataset.headers;
            dataset.rowCount = executionResult.data.length;
            await dataset.save();

            return res.json({
              success: true,
              type: "code",
              explanation: `Executed: ${command}`,
              result: {
                rowsBefore: executionResult.originalCount,
                rowsAfter: executionResult.data.length,
                headers: executionResult.headers,
                preview: executionResult.data.slice(0, 100),
              },
            });
          }
        }
      } catch (fallbackError) {
        console.error("Fallback code generation also failed:", fallbackError);
      }

      return res.status(400).json({
        success: false,
        message: "Could not understand command",
        error: commandResult.error,
        suggestion:
          "Try rephrasing your command or be more specific about what you want to do with the data.",
      });
    }

    if (commandResult.usedFallback) {
      console.log("ℹ️  Using rule-based command processing (AI unavailable)");
    }

    const commandPlan = commandResult.command;
    console.log("🔧 Command Plan:", JSON.stringify(commandPlan, null, 2));

    // Execute based on plan type
    let executionResult;
    let operations = [];

    if (commandPlan.type === "chain") {
      // Execute multi-step chain
      console.log("🔗 Executing operation chain...");
      executionResult = await executeChain(
        commandPlan.steps,
        dataset.data,
        dataset.headers,
        dataset.columnTypes
      );
      operations = executionResult.operations || [];
    } else if (commandPlan.type === "code") {
      // Execute custom code
      console.log("💻 Executing custom code...");
      executionResult = await executeCode(
        commandPlan.code,
        dataset.data,
        dataset.headers
      );
      operations = [
        { type: "custom_code", details: executionResult.changes || {} },
      ];
    } else if (commandPlan.type === "operation") {
      // Execute standard operation
      const operation = normalizeOperation(commandPlan.operation);
      console.log("⚙️  Executing operation:", operation);

      // Validate filter_rows operation has conditions
      if (operation === "filter_rows") {
        if (
          !commandPlan.parameters ||
          !commandPlan.parameters.conditions ||
          commandPlan.parameters.conditions.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Could not parse filter conditions from your command",
            error:
              'Please specify which column and what condition (e.g., "remove rows where age > 25")',
            suggestion:
              'Try rephrasing: "remove rows where [column name] [condition] [value]"',
            availableColumns: dataset.headers,
          });
        }
      }

      executionResult = await executeOperation(
        operation,
        commandPlan.parameters,
        dataset.data,
        dataset.headers,
        dataset.columnTypes
      );
      operations = [
        { type: operation, details: executionResult.changes || {} },
      ];
    } else {
      // Fallback: try to use legacy operation format for backward compatibility
      const rawOperation = commandPlan.operation || commandPlan.type;
      const operation = normalizeOperation(rawOperation);
      console.log("⚙️  Executing legacy operation:", operation);

      executionResult = await executeOperation(
        operation,
        commandPlan.parameters,
        dataset.data,
        dataset.headers,
        dataset.columnTypes
      );
      if (executionResult && executionResult.success) {
        operations = [
          { type: operation, details: executionResult.changes || {} },
        ];
      }
    }

    if (!executionResult) {
      return res.status(500).json({
        success: false,
        message: "Execution failed",
        error: "No execution result returned",
        suggestion: "Please try rephrasing your command",
      });
    }

    if (!executionResult.success) {
      return res.status(400).json({
        success: false,
        message: "Execution failed",
        error: executionResult?.error || "Unknown error during execution",
        suggestion:
          executionResult?.suggestion || "Please try rephrasing your command",
      });
    }

    // Validate execution result has data
    if (!executionResult.data || !Array.isArray(executionResult.data)) {
      return res.status(500).json({
        success: false,
        message: "Execution failed",
        error: "Execution result is missing valid data array",
        suggestion: "Please try rephrasing your command",
      });
    }

    // Update dataset
    dataset.data = executionResult.data;
    dataset.headers = executionResult.headers || dataset.headers;
    dataset.rowCount = executionResult.data.length;

    // Update column types if headers changed
    if (
      executionResult.headers &&
      executionResult.headers.length > 0 &&
      executionResult.data.length > 0
    ) {
      dataset.columnTypes = dataProcessingService.detectColumnTypes(
        executionResult.data,
        executionResult.headers
      );
    }

    await dataset.save();

    console.log("💬 Generating explanation...");
    // Get AI explanation of changes
    const explanation = await llmService.explainDataCleaning(operations);

    console.log("✅ Processing complete!");

    res.json({
      success: true,
      type: commandPlan.type || "operation",
      operations: operations,
      explanation: explanation.explanation,
      aiPowered: !explanation.usedFallback,
      result: {
        rowsBefore: executionResult.originalCount || dataset.data.length,
        rowsAfter: executionResult.data.length,
        rowsChanged:
          (executionResult.originalCount || dataset.data.length) -
          executionResult.data.length,
        headers: executionResult.headers || dataset.headers,
        preview: executionResult.data.slice(0, 100),
      },
    });
  } catch (error) {
    console.error("❌ Process Command Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error processing command",
        error: error.message,
      });
    }
  }
};

/**
 * Execute a standard operation
 */
async function executeOperation(
  operation,
  parameters,
  data,
  headers,
  columnTypes
) {
  const op = operationRegistry.get(operation);

  if (!op) {
    return {
      success: false,
      error: `Unknown operation: ${operation}`,
      suggestion: `Available operations: ${operationRegistry
        .list()
        .map((o) => o.name)
        .join(", ")}`,
      data: data,
      headers: headers,
    };
  }

  try {
    const result = await op.handler(data, headers, parameters || {});
    return {
      success: true,
      data: result.data,
      headers: result.headers,
      changes: result.changes,
      originalCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: data,
      headers: headers,
    };
  }
}

/**
 * Execute custom JavaScript code
 */
async function executeCode(code, data, headers) {
  // Validate code
  const validation = codeExecutorService.validateCode(code);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      suggestion:
        "Code contains potentially dangerous patterns. Please rephrase your request.",
      data: data,
      headers: headers,
    };
  }

  // Execute code
  const result = codeExecutorService.executeCode(code, data, headers);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Code execution failed",
      suggestion:
        "The generated code had an error. Try rephrasing your command.",
      data: data,
      headers: headers,
    };
  }

  return {
    success: true,
    data: result.data,
    headers: result.headers,
    changes: result.changes,
    originalCount: data.length,
  };
}

/**
 * Execute a chain of operations
 */
async function executeChain(steps, data, headers, columnTypes) {
  let currentData = data;
  let currentHeaders = headers;
  const operations = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`   Step ${i + 1}/${steps.length}: ${step.type}`);

    let stepResult;

    if (step.type === "operation") {
      stepResult = await executeOperation(
        step.operation,
        step.parameters,
        currentData,
        currentHeaders,
        columnTypes
      );
      operations.push({
        type: step.operation,
        details: stepResult.changes || {},
      });
    } else if (step.type === "code") {
      stepResult = await executeCode(step.code, currentData, currentHeaders);
      operations.push({
        type: "custom_code",
        details: stepResult.changes || {},
      });
    } else {
      return {
        success: false,
        error: `Unknown step type: ${step.type}`,
        data: currentData,
        headers: currentHeaders,
        operations: operations,
      };
    }

    if (!stepResult.success) {
      return {
        success: false,
        error: `Step ${i + 1} failed: ${stepResult.error}`,
        data: currentData,
        headers: currentHeaders,
        operations: operations,
      };
    }

    currentData = stepResult.data;
    currentHeaders = stepResult.headers || currentHeaders;
  }

  return {
    success: true,
    data: currentData,
    headers: currentHeaders,
    changes: {},
    originalCount: data.length,
    operations: operations,
  };
}

// Legacy code removed - now using dynamic execution system
// Old switch statement has been replaced with operationRegistry and dynamic dispatcher

// @desc Get insights from data
// @route POST /api/data/insights
exports.getInsights = async (req, res) => {
  try {
    const { dataId } = req.body;

    if (!dataId) {
      return res.status(400).json({
        success: false,
        message: "dataId is required",
      });
    }

    const dataset = await Dataset.findById(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Generate AI insights
    const insightsResult = await llmService.generateInsights(
      statistics,
      dataset.data.slice(0, 5)
    );

    // Store insights in DB
    dataset.insights = insightsResult.insights || [];
    await dataset.save();

    res.json({
      success: true,
      statistics: statistics,
      insights: insightsResult.insights,
    });
  } catch (error) {
    console.error("Get Insights Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating insights",
      error: error.message,
    });
  }
};

// @desc Download processed data with Chart
// @route GET /api/data/download/:dataId
exports.downloadData = async (req, res) => {
  try {
    const { dataId } = req.params;

    const dataset = await Dataset.findById(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Add headers
    worksheet.columns = dataset.headers.map((header) => ({
      header: header,
      key: header,
      width: 20,
    }));

    // Add rows
    worksheet.addRows(dataset.data);

    // Determine columns for chart
    let xColName, yColName;
    const CHART_TYPE = "bar"; // Default to bar for now

    // Check if we have a context-aware config from previous interaction
    if (
      dataset.latestChartConfig &&
      dataset.latestChartConfig.xAxisColumn &&
      dataset.latestChartConfig.yAxisColumn
    ) {
      xColName = dataset.latestChartConfig.xAxisColumn;
      yColName = dataset.latestChartConfig.yAxisColumn;
      console.log(
        `📊 Using context-aware config: X=${xColName}, Y=${yColName}`
      );
    } else {
      // Heuristic: First string = X, First number = Y
      // We need to re-detect column types or rely on stored ones. Stored ones might be old if we didn't update them on cleaning.
      // Let's rely on stored columnTypes for now or re-detect quickly.

      const numericCols = Object.keys(dataset.columnTypes).filter(
        (col) => dataset.columnTypes[col] === "number"
      );
      const stringCols = Object.keys(dataset.columnTypes).filter(
        (col) => dataset.columnTypes[col] !== "number"
      );

      // Prefer string for X, but if none, use first numeric
      xColName =
        stringCols.length > 0
          ? stringCols[0]
          : numericCols.length > 0
          ? numericCols[0]
          : dataset.headers[0];
      // Prefer numeric for Y
      yColName =
        numericCols.length > 0
          ? numericCols[0]
          : numericCols.length > 1
          ? numericCols[1]
          : dataset.headers[1]; // Fallback
      console.log(`📊 Using heuristic config: X=${xColName}, Y=${yColName}`);
    }

    // Simply verifying columns exist
    const xIndex = dataset.headers.indexOf(xColName);
    const yIndex = dataset.headers.indexOf(yColName);

    if (xIndex !== -1 && yIndex !== -1) {
      // Helper to get column letter (0 -> A, 1 -> B)
      const getLetter = (colIndex) => {
        let temp,
          letter = "";
        let index = colIndex;
        while (index >= 0) {
          temp = index % 26;
          letter = String.fromCharCode(temp + 65) + letter;
          index = Math.floor((index - temp) / 26) - 1;
        }
        return letter;
      };

      const xLetter = getLetter(xIndex);
      const yLetter = getLetter(yIndex);
      const rowCount = dataset.data.length + 1; // +1 for header

      const chart = {
        type: CHART_TYPE,
        percentages: false,
        title: { text: dataset.latestChartConfig?.title || "Data Analysis" },
        legend: { position: "bottom" },
        axes: [
          {
            type: "category",
            position: "bottom",
            // Reference X-axis labels
            categories: {
              reference: `Data!$${xLetter}$2:$${xLetter}$${rowCount}`,
            },
          },
          {
            type: "value",
            position: "left",
          },
        ],
        series: [
          {
            name: yColName,
            // Reference Y-axis values
            data: {
              reference: `Data!$${yLetter}$2:$${yLetter}$${rowCount}`,
            },
          },
        ],
      };

      // Position the chart to the right of data (starts 2 columns after data)
      const chartColStart = dataset.headers.length + 2;

      try {
        worksheet.addChart(chart, {
          tl: { col: chartColStart, row: 1 },
          ext: { width: 600, height: 400 },
        });
      } catch (chartErr) {
        console.warn(
          "Could not add chart (exceljs might not support it):",
          chartErr.message
        );
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analysis_${dataset.fileName}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
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
        message: "dataId and question are required",
      });
    }

    const dataset = await Dataset.findById(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    console.log("💬 User Question:", question);

    // Get statistics for context
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Prepare data context
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 5),
    };

    // Get AI answer
    const result = await llmService.answerDatasetQuestion(
      question,
      dataContext
    );

    // Log prompt
    await logPrompt(req.user._id, "ask", question, 0, { dataId });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to answer question",
        error: result.error,
      });
    }

    console.log("✅ Answer generated");

    res.json({
      success: true,
      question: question,
      answer: result.answer,
      aiPowered: !result.usedFallback,
    });
  } catch (error) {
    console.error("❌ Ask Question Error:", error);
    res.status(500).json({
      success: false,
      message: "Error answering question",
      error: error.message,
    });
  }
};

exports.generateChart = async (req, res) => {
  try {
    const { dataId, question } = req.body;

    if (!dataId || !question) {
      return res.status(400).json({
        success: false,
        message: "dataId and question are required",
      });
    }

    const dataset = await Dataset.findById(dataId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: "Dataset not found",
      });
    }

    console.log("📊 Generating chart for:", question);

    // Derive current headers from data to ensure accuracy
    const currentHeaders =
      dataset.data.length > 0 ? Object.keys(dataset.data[0]) : [];

    if (currentHeaders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dataset is empty, cannot generate chart.",
      });
    }

    // Filter columnTypes to match current headers (remove stale keys)
    const validColumnTypes = {};
    if (dataset.columnTypes) {
      currentHeaders.forEach((header) => {
        if (dataset.columnTypes[header]) {
          validColumnTypes[header] = dataset.columnTypes[header];
        }
      });
    }

    const chartConfig = await llmService.generateChartConfig(question, {
      columns: currentHeaders,
      columnTypes: validColumnTypes,
      sampleData: dataset.data.slice(0, 10),
    });

    if (chartConfig) {
      // Save chart config to dataset for export
      dataset.latestChartConfig = chartConfig;
      await dataset.save();

      res.json({ success: true, chart: chartConfig });
    } else {
      res.status(500).json({
        success: false,
        message: "Could not generate chart configuration",
      });
    }
  } catch (error) {
    console.error("❌ Generate Chart Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating chart",
      error: error.message,
    });
  }
};

// @desc Get all datasets for the logged-in user
// @route GET /api/data/history
exports.getUserDatasets = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    // Fetch datasets for the user, excluding the heavy 'data' field
    const datasets = await Dataset.find({ user: req.user._id })
      .select("-data")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: datasets.length,
      datasets: datasets,
    });
  } catch (error) {
    console.error("Get User Datasets Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching history",
      error: error.message,
    });
  }
};

// @desc Get a specific dataset by ID
// @route GET /api/data/:id
exports.getDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);

    if (!dataset) {
      return res
        .status(404)
        .json({ success: false, message: "Dataset not found" });
    }

    // Check ownership? Assuming if you have ID you can view it, OR enforce owner
    // if (dataset.user.toString() !== req.user.id) ...

    res.json({
      success: true,
      dataId: dataset._id,
      info: {
        fileName: dataset.fileName,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        headers: dataset.headers,
        columnTypes: dataset.columnTypes,
        preview: dataset.data.slice(0, 500), // Send a good chunk for preview or Full?
        // For Dashboard Data Table we usually need all data if it's client side paged.
        // But above we used preview 100 on upload.
        // Let's send 500 for preview and if they need FULL table they might need another call or just this one.
        // Actually the frontend seems to expect 'preview' for the table.
        // Let's send the whole data if it's reasonable size, or paginate.
        // Given previous implementation: dataset.currentData was used.
        // Let's attach full data as 'preview' or just 'allData'
      },
      fullData: dataset.data, // Sending full data for client-side processing for now
    });
  } catch (error) {
    console.error("Get Dataset Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dataset",
      error: error.message,
    });
  }
};

// @desc Generate and apply formula
// @route POST /api/data/formula
exports.generateFormula = async (req, res) => {
  try {
    const { dataId, request } = req.body;

    // Validate input
    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const requestValidation = validateRequest(request);
    if (!requestValidation.valid) {
      return res.status(400).json({
        success: false,
        message: requestValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("📐 Generating formula for:", request);

    // Prepare data context
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 5),
    };

    // Generate formula
    const formulaResult = await llmService.generateFormula(
      request.trim(),
      dataContext
    );

    if (!formulaResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate formula",
        error:
          formulaResult.error ||
          "AI service unavailable. Please try again or rephrase your request.",
        suggestion:
          'Try being more specific about what calculation you want (e.g., "calculate profit margin as revenue minus cost")',
      });
    }

    // Validate formula structure
    if (
      !formulaResult.formula ||
      !formulaResult.formula.formula ||
      !formulaResult.formula.newColumnName
    ) {
      return res.status(500).json({
        success: false,
        message: "Invalid formula structure generated",
        error:
          "The AI generated an incomplete formula. Please try rephrasing your request.",
      });
    }

    // Apply formula to dataset
    const applyResult = dataProcessingService.applyFormula(
      dataset.data,
      dataset.headers,
      formulaResult.formula
    );

    // Check for errors in formula application
    if (applyResult.errors > dataset.data.length * 0.5) {
      return res.status(400).json({
        success: false,
        message: "Formula failed on more than 50% of rows",
        error:
          "The generated formula may not be compatible with your data. Please check your column names and data types.",
        formula: formulaResult.formula,
        errors: applyResult.errors,
        totalRows: dataset.data.length,
      });
    }

    // Update dataset
    dataset.data = applyResult.data;
    if (
      applyResult.newColumn &&
      !dataset.headers.includes(applyResult.newColumn)
    ) {
      dataset.headers.push(applyResult.newColumn);
    }
    // Update column types
    if (applyResult.newColumn && applyResult.data.length > 0) {
      const sampleValue = applyResult.data[0][applyResult.newColumn];
      if (sampleValue !== undefined) {
        dataset.columnTypes[applyResult.newColumn] =
          typeof sampleValue === "number" ? "number" : "text";
      }
    }
    await dataset.save();

    console.log("✅ Formula applied successfully");

    res.json({
      success: true,
      formula: formulaResult.formula,
      result: {
        newColumn: applyResult.newColumn,
        errors: applyResult.errors,
        totalRows: dataset.data.length,
        successRate:
          (
            ((dataset.data.length - applyResult.errors) / dataset.data.length) *
            100
          ).toFixed(1) + "%",
        preview: applyResult.data.slice(0, 10),
      },
      aiPowered: !formulaResult.usedFallback,
    });
  } catch (error) {
    console.error("❌ Generate Formula Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating formula",
      error: error.message,
    });
  }
};

// @desc Manipulate column directly
// @route POST /api/data/manipulate
exports.manipulateColumn = async (req, res) => {
  try {
    const { dataId, request } = req.body;

    // Validate input
    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const requestValidation = validateRequest(request);
    if (!requestValidation.valid) {
      return res.status(400).json({
        success: false,
        message: requestValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("🔧 Processing manipulation request:", request);

    // Prepare data context
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 5),
    };

    // Parse manipulation request
    const manipulationResult = await llmService.parseManipulationRequest(
      request.trim(),
      dataContext
    );

    if (!manipulationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Could not understand manipulation request",
        error:
          manipulationResult.error ||
          "Please specify which column to manipulate and what transformation to apply.",
        suggestion:
          'Try: "Convert the price column to uppercase" or "Extract year from date column"',
      });
    }

    // Validate manipulation structure
    if (
      !manipulationResult.manipulation ||
      !manipulationResult.manipulation.operation ||
      !manipulationResult.manipulation.targetColumn
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid manipulation request structure",
        error:
          "Could not identify the target column or operation. Please be more specific.",
      });
    }

    // Apply transformation
    const transformResult = dataProcessingService.transformColumn(
      dataset.data,
      dataset.headers,
      manipulationResult.manipulation
    );

    // Check for excessive errors
    if (transformResult.errors > dataset.data.length * 0.3) {
      return res.status(400).json({
        success: false,
        message: "Transformation failed on many rows",
        error: `Transformation failed on ${transformResult.errors} out of ${dataset.data.length} rows. Please check your data and try again.`,
        manipulation: manipulationResult.manipulation,
      });
    }

    // Update dataset
    dataset.data = transformResult.data;
    if (
      transformResult.columnName &&
      !dataset.headers.includes(transformResult.columnName)
    ) {
      dataset.headers.push(transformResult.columnName);
    }
    // Update column types if needed
    if (transformResult.columnName) {
      const sampleValue = transformResult.data[0]?.[transformResult.columnName];
      if (sampleValue !== undefined) {
        dataset.columnTypes[transformResult.columnName] =
          typeof sampleValue === "number" ? "number" : "text";
      }
    }
    await dataset.save();

    console.log("✅ Column manipulation completed");

    res.json({
      success: true,
      manipulation: manipulationResult.manipulation,
      result: {
        columnName: transformResult.columnName,
        errors: transformResult.errors,
        totalRows: dataset.data.length,
        successRate:
          (
            ((dataset.data.length - transformResult.errors) /
              dataset.data.length) *
            100
          ).toFixed(1) + "%",
        preview: transformResult.data.slice(0, 10),
      },
      aiPowered: !manipulationResult.usedFallback,
    });
  } catch (error) {
    console.error("❌ Manipulate Column Error:", error);
    res.status(500).json({
      success: false,
      message: "Error manipulating column",
      error: error.message,
    });
  }
};

// @desc Generate validation rules
// @route POST /api/data/validate
exports.generateValidationRules = async (req, res) => {
  try {
    const { dataId } = req.body;

    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("🔍 Generating validation rules");

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Prepare data context
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 5),
    };

    // Generate validation rules
    const validationResult = await llmService.generateValidationRules(
      dataContext
    );

    if (!validationResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate validation rules",
        error:
          validationResult.error || "AI service unavailable. Please try again.",
        fallback:
          "You can manually check for missing values, duplicates, and data type inconsistencies.",
      });
    }

    res.json({
      success: true,
      rules: validationResult.rules,
      aiPowered: !validationResult.usedFallback,
    });
  } catch (error) {
    console.error("❌ Generate Validation Rules Error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating validation rules",
      error: error.message,
    });
  }
};

// @desc Detect column relationships
// @route POST /api/data/relationships
exports.detectRelationships = async (req, res) => {
  try {
    const { dataId } = req.body;

    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("🔗 Detecting column relationships");

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Prepare data context
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 10),
    };

    // Detect relationships using both AI and algorithmic methods
    const [aiResult, algorithmicRelationships] = await Promise.all([
      llmService.detectColumnRelationships(dataContext),
      Promise.resolve(
        dataProcessingService.detectRelationships(
          dataset.data,
          dataset.headers,
          dataset.columnTypes
        )
      ),
    ]);

    // Combine results
    const allRelationships = [
      ...(algorithmicRelationships || []),
      ...(aiResult.success ? aiResult.relationships?.relationships || [] : []),
    ];

    res.json({
      success: true,
      relationships: {
        detected: allRelationships,
        summary: aiResult.success
          ? aiResult.relationships?.summary
          : "Relationships detected algorithmically",
      },
      aiPowered: aiResult.success && !aiResult.usedFallback,
    });
  } catch (error) {
    console.error("❌ Detect Relationships Error:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting relationships",
      error: error.message,
    });
  }
};

// @desc Calculate data quality score
// @route POST /api/data/quality
exports.getQualityScore = async (req, res) => {
  try {
    const { dataId } = req.body;

    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("📊 Calculating data quality score");

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Calculate quality score
    const qualityResult = dataProcessingService.calculateQualityScore(
      dataset.data,
      dataset.headers,
      statistics
    );

    res.json({
      success: true,
      quality: qualityResult,
    });
  } catch (error) {
    console.error("❌ Get Quality Score Error:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating quality score",
      error: error.message,
    });
  }
};

// @desc Detect anomalies with AI explanations
// @route POST /api/data/anomalies
exports.detectAnomalies = async (req, res) => {
  try {
    const { dataId } = req.body;

    const dataIdValidation = validateDataId(dataId);
    if (!dataIdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dataIdValidation.error,
      });
    }

    const dataset = await Dataset.findById(dataId);
    const datasetValidation = validateDataset(dataset);
    if (!datasetValidation.valid) {
      return res.status(404).json({
        success: false,
        message: datasetValidation.error,
      });
    }

    console.log("🔍 Detecting anomalies");

    // Get statistics
    const statistics = dataProcessingService.getStatistics(
      dataset.data,
      dataset.headers
    );

    // Detect anomalies algorithmically
    const anomalies = dataProcessingService.detectAnomalies(
      dataset.data,
      dataset.headers,
      statistics
    );

    // Get AI explanations
    const dataContext = {
      columns: dataset.headers,
      rowCount: dataset.data.length,
      columnTypes: dataset.columnTypes,
      statistics: statistics,
      sampleData: dataset.data.slice(0, 5),
    };

    const explanationResult = await llmService.explainAnomalies(
      anomalies,
      dataContext
    );

    res.json({
      success: true,
      anomalies: anomalies,
      count: anomalies.length,
      explanations: explanationResult.success
        ? explanationResult.explanations
        : null,
      summary: explanationResult.success
        ? explanationResult.explanations?.summary
        : anomalies.length > 0
        ? `${anomalies.length} anomalies detected. Review the data for outliers, missing values, and duplicates.`
        : "No significant anomalies detected.",
      aiPowered: explanationResult.success && !explanationResult.usedFallback,
    });
  } catch (error) {
    console.error("❌ Detect Anomalies Error:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting anomalies",
      error: error.message,
    });
  }
};
