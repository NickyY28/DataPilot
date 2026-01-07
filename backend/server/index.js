require('dotenv').config();
const express = require('express');
const cors = require('cors');

const llmRoutes = require('./routes/llmRoutes');
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use('/api/llm', llmRoutes);

// test route
app.get('/', (req, res)=>{
  res.json({ message: 'Excel AI Assistant API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// start server
const port = process.env.PORT || 5000;

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})