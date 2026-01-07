import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/llm/ask', {
        question: question
      });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('Error:', error);
      setAnswer('Error: Could not get response');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Gemini AI Test</h1>
      
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        rows={4}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />
      
      <button 
        onClick={askQuestion} 
        disabled={loading}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        {loading ? 'Loading...' : 'Ask Question'}
      </button>

      {answer && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#000000ff', borderRadius: '5px' }}>
          <h3>Answer:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;