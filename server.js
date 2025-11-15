require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// API endpoint to generate interview questions using Gemini
app.post('/api/generate-question', async (req, res) => {
    try {
        const { answerText } = req.body;
        
        if (!answerText) {
            return res.status(400).json({ error: 'Answer text is required' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            console.error('Gemini API key not found in environment variables');
            return res.status(500).json({ error: 'Gemini API key not configured on server', message: 'Please set GEMINI_API_KEY in .env file' });
        }
        
        console.log('Generating question for answer:', answerText.substring(0, 50) + '...');

        const prompt = `
You are an AI Interviewer conducting a technical interview. Ask the next interview question based on the candidate's last answer.

Candidate's last answer:
"${answerText}"

IMPORTANT RULES:
1. Ask ONLY ONE question at a time
2. Be conversational and natural
3. NO greetings, NO "thank you", NO extra comments - just the question
4. Make the question DIRECTLY relevant to what the candidate just said
5. If they mentioned skills (Python, SQL, JavaScript), ask about those specifically
6. If they mentioned projects, ask for details about those projects
7. If they mentioned experience, ask about specific challenges or outcomes
8. Keep it short (max 2 sentences)
9. Do NOT repeat questions you've already asked
10. Progress the conversation forward - don't ask the same type of question twice

Example good questions:
- "Can you walk me through a specific Python project you worked on?"
- "What challenges did you face while working with SQL databases?"
- "Tell me about a time when you had to debug a complex JavaScript issue."

Now ask your next question (ONLY the question, nothing else):
        `;

        // Use gemini-1.5-flash (faster) or gemini-1.5-pro (more capable)
        const modelName = 'gemini-1.5-flash'; // Change to 'gemini-1.5-pro' for better quality
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 150
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || '';
            
            console.error('Gemini API error:', response.status, errorMsg);
            
            if (response.status === 429) {
                return res.status(429).json({ error: 'API quota exceeded', message: errorMsg });
            }
            
            return res.status(response.status).json({ error: 'Gemini API error', message: errorMsg });
        }

        const data = await response.json();
        const nextQuestion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        
        if (!nextQuestion) {
            console.error('Empty response from Gemini API:', JSON.stringify(data));
            return res.status(500).json({ error: 'Empty response from Gemini API', message: 'No question generated' });
        }

        console.log('Generated question:', nextQuestion.substring(0, 50) + '...');
        res.json({ question: nextQuestion });
        
    } catch (error) {
        console.error('Error generating question:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// API endpoint to execute Python code
app.post('/api/execute-python', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        // For security, we'll use a simple Python execution service
        // In production, use a proper sandboxed environment
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: 'python',
                version: '3.10.0',
                files: [{
                    content: code
                }],
                stdin: '',
                args: [],
                compile_timeout: 10000,
                run_timeout: 10000
            })
        });

        if (!response.ok) {
            throw new Error('Code execution service unavailable');
        }

        const data = await response.json();
        
        // Log the full response for debugging
        console.log('Piston API Response:', JSON.stringify(data, null, 2));
        
        // Check for compilation errors
        if (data.compile) {
            const compileOutput = data.compile.stdout || data.compile.stderr || '';
            if (data.compile.code !== 0) {
                return res.json({ 
                    output: `COMPILATION ERROR:\n${compileOutput}`,
                    success: false,
                    errorType: 'compilation'
                });
            }
        }
        
        // Check for runtime errors
        const stdout = data.run?.stdout || '';
        const stderr = data.run?.stderr || '';
        const exitCode = data.run?.code || 0;
        
        // Check if there's an error in the response
        const hasError = data.run?.signal || exitCode !== 0;
        
        // Check for common error patterns in stdout (sometimes errors go to stdout)
        const errorPatterns = [
            /Traceback \(most recent call last\)/i,
            /TypeError:/i,
            /NameError:/i,
            /ValueError:/i,
            /IndexError:/i,
            /KeyError:/i,
            /AttributeError:/i,
            /IndentationError:/i,
            /SyntaxError:/i,
            /FileNotFoundError:/i,
            /ZeroDivisionError:/i
        ];
        
        const stdoutHasError = errorPatterns.some(pattern => pattern.test(stdout));
        const stderrHasError = stderr.trim().length > 0;
        
        let output = '';
        let success = true;
        
        // If there's an error (in stderr, stdout, or exit code)
        if (stderrHasError || stdoutHasError || hasError) {
            // Combine stderr and stdout if both have content
            let errorText = '';
            
            if (stderr) {
                errorText = stderr;
            } else if (stdoutHasError) {
                errorText = stdout;
            } else {
                errorText = `Program exited with code ${exitCode}`;
            }
            
            // Format error messages better
            const errorLines = errorText.split('\n');
            const formattedError = errorLines.map(line => {
                // Highlight common Python errors
                if (line.includes('TypeError')) {
                    const errorMsg = line.split('TypeError:')[1]?.trim() || line;
                    return `❌ TypeError: ${errorMsg}`;
                } else if (line.includes('NameError')) {
                    const errorMsg = line.split('NameError:')[1]?.trim() || line;
                    return `❌ NameError: ${errorMsg}`;
                } else if (line.includes('IndentationError')) {
                    const errorMsg = line.split('IndentationError:')[1]?.trim() || line;
                    return `❌ IndentationError: ${errorMsg}`;
                } else if (line.includes('SyntaxError')) {
                    const errorMsg = line.split('SyntaxError:')[1]?.trim() || line;
                    return `❌ SyntaxError: ${errorMsg}`;
                } else if (line.includes('AttributeError')) {
                    const errorMsg = line.split('AttributeError:')[1]?.trim() || line;
                    return `❌ AttributeError: ${errorMsg}`;
                } else if (line.includes('ValueError')) {
                    const errorMsg = line.split('ValueError:')[1]?.trim() || line;
                    return `❌ ValueError: ${errorMsg}`;
                } else if (line.includes('IndexError')) {
                    const errorMsg = line.split('IndexError:')[1]?.trim() || line;
                    return `❌ IndexError: ${errorMsg}`;
                } else if (line.includes('Traceback')) {
                    return `\n🔴 ${line}`;
                } else if (line.trim().startsWith('File')) {
                    return `   ${line}`;
                }
                return line;
            }).join('\n');
            
            output = `ERROR!\n\n${formattedError}`;
            success = false;
        } else if (stdout) {
            output = `✅ SUCCESS!\n\n${stdout}`;
            success = true;
        } else {
            output = '✅ Code executed successfully (no output)';
            success = true;
        }
        
        res.json({ 
            output: output.trim(), 
            success: success,
            exitCode: exitCode
        });
        
    } catch (error) {
        console.error('Error executing Python code:', error);
        res.status(500).json({ 
            error: 'Failed to execute code', 
            message: error.message,
            output: `❌ Execution Error: ${error.message}\n\nPlease check your code and try again.`
        });
    }
});

// API endpoint to validate SQL queries (simplified - just syntax check)
app.post('/api/validate-sql', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'SQL query is required' });
        }

        // Basic SQL validation (in production, use a proper SQL parser)
        const sqlUpper = query.toUpperCase().trim();
        const isValid = sqlUpper.includes('SELECT') || sqlUpper.includes('INSERT') || 
                       sqlUpper.includes('UPDATE') || sqlUpper.includes('DELETE');
        
        // Check for common SQL keywords
        const hasValidStructure = sqlUpper.includes('FROM') || sqlUpper.includes('WHERE') || 
                                 sqlUpper.includes('GROUP BY') || sqlUpper.includes('ORDER BY');
        
        // For demo purposes, we'll return a mock validation
        // In production, you'd use a real SQL parser or test database
        const mockOutput = `Query validated successfully.\n\nExecuting query would return:\n[Sample data based on query structure]`;
        
        res.json({ 
            output: mockOutput, 
            success: isValid,
            message: isValid ? 'SQL query structure looks valid' : 'Please check your SQL query syntax'
        });
        
    } catch (error) {
        console.error('Error validating SQL:', error);
        res.status(500).json({ error: 'Failed to validate SQL', message: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Interview Chatbot server running on http://localhost:${PORT}`);
    console.log('Make sure to allow camera and microphone permissions when prompted.');
});

