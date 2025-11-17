require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
/*
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
*/


// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// CORS middleware - Allow requests from Vercel frontend
app.use((req, res, next) => {
    // Allow requests from Vercel frontend (update with your Vercel URL)
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        process.env.FRONTEND_URL,
        'https://*.vercel.app'
    ].filter(Boolean);
    
    const origin = req.headers.origin;
    if (allowedOrigins.some(allowed => 
        origin === allowed || 
        (allowed.includes('*') && origin && origin.includes(allowed.replace('*', '')))
    )) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.header('Access-Control-Allow-Origin', '*'); // Fallback for development
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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
        
        console.log('API Request received:', { answerText: answerText ? answerText.substring(0, 50) : 'null' });
        
        if (!answerText) {
            console.error('No answerText provided');
            return res.status(400).json({ error: 'Answer text is required' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            console.error('Gemini API key not found in environment variables');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')));
            return res.status(500).json({ error: 'Gemini API key not configured on server', message: 'Please set GEMINI_API_KEY in .env file' });
        }
        
        console.log('Gemini API key found, generating question for answer:', answerText.substring(0, 50) + '...');

        const prompt = `You are an AI Interviewer. Ask ONE short question based on this answer: "${answerText}"

Rules: ONE question only. No greetings. Be direct. Keep it under 15 words.`;

        // Try multiple model names in order of preference
        // Prioritize models that don't use thinking tokens (which consume output budget)
        // Try standard model names first (without -latest suffix)
        const modelNames = [
            'gemini-1.5-flash',         // Fast model without thinking tokens
            'gemini-1.5-pro',           // Pro model without thinking tokens
            'gemini-1.5-flash-latest',   // Fallback with -latest suffix
            'gemini-1.5-pro-latest',     // Fallback pro with -latest
            'gemini-pro',                // Older stable model
            'gemini-2.5-flash',          // Newer but uses thinking tokens (needs higher limit)
            'gemini-2.5-pro'             // Newer pro but uses thinking tokens
        ];
        
        let lastError = null;
        let response = null;
        let success = false;
        
        // Try each model until one works
        // Try v1beta first (supports more models, may avoid thinking tokens), then v1
        const apiVersions = ['v1beta', 'v1'];
        
        outerLoop: for (const apiVersion of apiVersions) {
            for (const modelName of modelNames) {
                try {
                    const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${geminiApiKey}`;
                    console.log(`Trying Gemini API (${apiVersion}) with model: ${modelName}`);
                
                    response = await fetch(apiUrl, {
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
                            maxOutputTokens: 2000,  // Increased to handle thinking tokens for gemini-2.5 models
                            topP: 0.95,
                            topK: 40
                        }
                    })
                    });

                    if (response.ok) {
                        console.log(`✅ Successfully using model: ${modelName} with API version: ${apiVersion}`);
                        success = true;
                        break outerLoop; // Break out of both loops
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        const errorMsg = errorData.error?.message || '';
                        lastError = { status: response.status, message: errorMsg };
                        
                        // If it's a 404 (model not found), try next model/version
                        if (response.status === 404) {
                            console.log(`❌ Model ${modelName} not found (404) with ${apiVersion}, trying next...`);
                            continue; // Try next model
                        }
                        
                        // For other errors (429, 500, etc.), try next version or break
                        console.error(`Gemini API error with ${modelName} (${apiVersion}):`, response.status, errorMsg);
                        if (response.status === 429) {
                            // Quota exceeded - don't try more
                            break outerLoop;
                        }
                        continue; // Try next model/version
                    }
                } catch (fetchError) {
                    console.error(`Error calling model ${modelName} (${apiVersion}):`, fetchError.message);
                    lastError = { status: 500, message: fetchError.message };
                    continue; // Try next model/version
                }
            }
        }

        // If we tried all models and none worked, return error
        if (!success || !response || !response.ok) {
            const errorMsg = lastError?.message || 'All model attempts failed';
            const status = lastError?.status || 500;
            
            console.error('Gemini API error after trying all models:', status, errorMsg);
            
            if (status === 429) {
                return res.status(429).json({ error: 'API quota exceeded', message: errorMsg });
            }
            
            return res.status(status).json({ error: 'Gemini API error', message: errorMsg });
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason;
        
        // Try to get the question text
        let nextQuestion = candidate?.content?.parts?.[0]?.text?.trim() || null;
        
        // If no text but finishReason is MAX_TOKENS, the response was cut off
        if (!nextQuestion && finishReason === 'MAX_TOKENS') {
            console.warn('Response was truncated due to MAX_TOKENS. The model used thinking tokens.');
            console.warn('Usage metadata:', JSON.stringify(data.usageMetadata));
            
            // Try to get any partial content that might exist
            const allParts = candidate?.content?.parts || [];
            for (const part of allParts) {
                if (part.text && part.text.trim()) {
                    nextQuestion = part.text.trim();
                    console.log('Found partial question from truncated response:', nextQuestion.substring(0, 50));
                    break;
                }
            }
            
            // If still no question, return error
            if (!nextQuestion) {
                return res.status(500).json({ 
                    error: 'Response truncated', 
                    message: 'The generated question was cut off due to token limit. The model used thinking tokens which reduced available output space.' 
                });
            }
        }
        
        if (!nextQuestion) {
            console.error('Empty response from Gemini API:', JSON.stringify(data));
            console.error('Finish reason:', finishReason);
            console.error('Candidate data:', JSON.stringify(candidate));
            
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
    console.log(`\n========================================`);
    console.log(`Interview Chatbot server running on http://localhost:${PORT}`);
    console.log(`========================================\n`);
    
    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
        console.log('✅ Gemini API key is configured');
        console.log(`   API Key: ${geminiApiKey.substring(0, 10)}...${geminiApiKey.substring(geminiApiKey.length - 4)}`);
    } else {
        console.log('⚠️  WARNING: Gemini API key NOT configured');
        console.log('   AI question generation will use fallback questions');
        console.log('   To enable AI questions: Set GEMINI_API_KEY in .env file\n');
    }
    
    console.log('Make sure to allow camera and microphone permissions when prompted.\n');
});

