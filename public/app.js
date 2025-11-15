// Global variables
let mediaStream = null;
let videoRecorder = null;
let audioRecorder = null;
let screenshotInterval = null;
let isRecording = false;
let startTime = null;
let pausedTime = null; // Track when recording was paused
let totalPausedDuration = 0; // Track total paused time
let durationInterval = null;
let screenshots = [];
let videoChunks = [];
let audioChunks = [];
let answeredCount = 0;
let speechEnabled = false;
let speechRecognition = null;
let recognitionActive = false;
let latestTranscript = '';
let sentimentHistory = [];
let lastVoiceAnswer = '';
let lastPrompt = '';
let recognitionPausedByAI = false;
let reportShown = false;
let availableVoices = [];
let selectedVoice = null;
let isGeneratingQuestion = false; // Prevent multiple simultaneous API calls
let lastErrorTime = 0; // Track when last error occurred to prevent spam
let apiQuotaExceeded = false; // Track if API quota is exceeded (429 error)
let askedQuestions = []; // Track questions that have been asked to avoid repetition

// Setup wizard state
let setupComplete = localStorage.getItem('interviewSetupComplete') === 'true';
const setupStepsOrder = ['camera', 'microphone', 'speaker', 'screen'];
let currentSetupStep = 0;
const setupState = {
    camera: false,
    microphone: false,
    speaker: false,
    screen: false
};
let cameraTestStream = null;
let micTestStream = null;
let micAudioContext = null;
let micAnalyser = null;
let micLevelAnimation = null;
let speakerTonePlayed = false;
let screenShareStream = null;
let bandwidthInterval = null;
const performanceHistory = [];

// --- STEP 1: DELETION ---
// The following block has been deleted:
/*
const interviewQuestions = [
    "Hello! Welcome to the interview. Let's start with a simple introduction. Can you tell me about yourself?",
    "What interests you most about this position?",
    "Can you describe a challenging project you've worked on and how you handled it?",
    "What are your greatest strengths?",
    "How do you handle stress and pressure?",
    "Where do you see yourself in 5 years?",
    "Do you have any questions for us?",
    "Thank you for your time! The interview is complete."
];
let currentQuestionIndex = 0;
const totalQuestions = interviewQuestions.length;
*/
// The following variables are kept for performance metrics and flow control,
// but their role in the sequence is now AI-driven.
let currentQuestionIndex = 0;
const totalQuestions = 999; // Retained a nominal value for UI/Progress, but sequence is now AI-controlled.

// Interview completion settings
const MAX_QUESTIONS = 8; // Maximum number of regular questions before coding section
const MAX_DURATION_MINUTES = 30; // Maximum interview duration in minutes
const MAX_CODING_QUESTIONS = 3; // Maximum coding questions (Python + SQL)
let interviewEndCheckInterval = null;
let codingSectionActive = false; // Track if we're in coding section
let currentCodingLanguage = null; // 'python' or 'sql'
let codingQuestionCount = 0;
// --- END DELETION ---

const evaluationCategories = {
    intro: { label: 'Self Introduction', score: 0, samples: 0 },
    project: { label: 'Project Explanation', score: 0, samples: 0 },
    pythonCoding: { label: 'Python Coding', score: 0, samples: 0 },
    sql: { label: 'SQL', score: 0, samples: 0 },
    communication: { label: 'Communication', score: 0, samples: 0 }
};

// --- STEP 1: DELETION ---
// Removed questionCategoryMap as its sequential use is no longer strictly valid
// with dynamic AI questions, but keeping the categories for score mapping.
/*
const questionCategoryMap = [
    'intro',
    'project',
    'project',
    'communication',
    'communication',
    'python',
    'sql',
    'pythonCoding'
];
*/
// A new function to map answers to categories is needed, but for now, we'll
// use a simple sequential or fallback approach in the recordPerformanceMetric.
// For the refactored code, we will simplify the category assignment.
// --- END DELETION ---


// DOM elements
const videoPreview = document.getElementById('videoPreview');
const stopBtn = document.getElementById('stopBtn');
const resumeBtn = document.getElementById('resumeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingText = document.getElementById('recording-text');
const screenshotCount = document.getElementById('screenshot-count');
const durationDisplay = document.getElementById('duration');
const questionProgress = document.getElementById('question-progress');
const voiceToggle = document.getElementById('voiceToggle');
const voiceToggleLabel = voiceToggle ? voiceToggle.querySelectorAll('span')[1] : null;
const voiceStatus = document.getElementById('voiceStatus');
const nextQuestionDisplay = document.getElementById('nextQuestion');
const transcriptStatus = document.getElementById('transcript-status');
const liveTranscript = document.getElementById('liveTranscript');
const analyticsFeed = document.getElementById('analyticsFeed');
const aiAvatar = document.getElementById('aiAvatar');
const agentPhoto = document.getElementById('agentPhoto');
const agentRibbon = document.getElementById('agentRibbon');
const agentRole = document.getElementById('agentRole');
const agentVoiceLabel = document.getElementById('agentVoice');
const agentSelect = document.getElementById('agentSelect');
const shuffleAgentBtn = document.getElementById('shuffleAgentBtn');
const setupOverlay = document.getElementById('setupOverlay');
const setupStepNodes = document.querySelectorAll('.setup-step-node');
const setupStages = document.querySelectorAll('.setup-stage');
const setupNextBtn = document.getElementById('setupNextBtn');
const setupBackBtn = document.getElementById('setupBackBtn');
const setupBandwidth = document.getElementById('setupBandwidth');
const setupHelpBtn = document.getElementById('setupHelpBtn');
const cameraStatus = document.getElementById('cameraStatus');
const cameraRetryBtn = document.getElementById('cameraRetryBtn');
const setupCameraPreview = document.getElementById('setupCameraPreview');
const microphoneStatus = document.getElementById('microphoneStatus');
const microphoneRetryBtn = document.getElementById('microphoneRetryBtn');
const micLevelBar = document.getElementById('micLevelBar');
const playSpeakerTestBtn = document.getElementById('playSpeakerTest');
const confirmSpeakerTestBtn = document.getElementById('confirmSpeakerTest');
const speakerStatus = document.getElementById('speakerStatus');
const startScreenShareBtn = document.getElementById('startScreenShare');
const screenStatus = document.getElementById('screenStatus');
const screenPreview = document.getElementById('screenPreview');
const reportOverlay = document.getElementById('reportOverlay');
const reportCandidateName = document.getElementById('reportCandidateName');
const reportInterviewName = document.getElementById('reportInterviewName');
const reportOverallScore = document.getElementById('reportOverallScore');
const reportTotalTime = document.getElementById('reportTotalTime');
const reportQuestionCount = document.getElementById('reportQuestionCount');
const reportCategoryList = document.getElementById('reportCategoryList');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const closeReportBtn = document.getElementById('closeReportBtn');
const completionOverlay = document.getElementById('completionOverlay');
const feedbackForm = document.getElementById('feedbackForm');
const skipFeedbackBtn = document.getElementById('skipFeedbackBtn');
const codingOverlay = document.getElementById('codingOverlay');
const codingQuestionText = document.getElementById('codingQuestionText');
const codingLanguageLabel = document.getElementById('codingLanguageLabel');
const codeEditor = document.getElementById('codeEditor');
const codeOutput = document.getElementById('codeOutput');
const runCodeBtn = document.getElementById('runCodeBtn');
const submitCodeBtn = document.getElementById('submitCodeBtn');
const closeCodingBtn = document.getElementById('closeCodingBtn');
const codingSectionTitle = document.getElementById('codingSectionTitle');
const codingSectionSubtitle = document.getElementById('codingSectionSubtitle');
const finalCompletionScreen = document.getElementById('finalCompletionScreen');
const closeTabBtn = document.getElementById('closeTabBtn');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const speechSupported = 'speechSynthesis' in window;
const positiveLexicon = ['great', 'excited', 'confident', 'happy', 'love', 'passion', 'enjoy', 'proud', 'optimistic', 'enthusiastic', 'success', 'grateful', 'accomplished', 'improved'];
const negativeLexicon = ['difficult', 'stress', 'hard', 'problem', 'fail', 'worry', 'concern', 'issue', 'challenge', 'struggle', 'conflict', 'pressure', 'risk', 'delay'];
const skillKeywordMap = {
    javascript: ['javascript', 'js', 'node.js', 'nodejs', 'typescript'],
    python: ['python', 'django', 'flask', 'fastapi', 'pandas'],
    react: ['react', 'react.js', 'reactjs', 'hooks'],
    data: ['data science', 'machine learning', 'ml', 'ai', 'analytics']
};
const skillQuestionBank = {
    javascript: [
        'You said you know JavaScript. Can you explain Event Loop behavior and how it affects async code?',
        'Walk me through a complex JavaScript bug you fixed and how you diagnosed it.',
        'How do you structure large front-end codebases in JavaScript to keep them maintainable?'
    ],
    python: [
        'Tell me about a Python project you are proud of. What made it challenging?',
        'How do you manage dependencies and environments in Python projects?',
        'Explain how you would optimize a slow Python script processing large datasets.'
    ],
    react: [
        'What was the trickiest state-management challenge you solved in React?',
        'How do you decide between custom hooks and lifting state up in React?',
        'Describe how you guard React apps against performance bottlenecks.'
    ],
    data: [
        'You mentioned ML experience. Which model evaluation metrics do you reach for first?',
        'Describe a time when data quality issues almost derailed your project. How did you react?',
        'How do you balance experimentation speed vs. reproducibility in data workflows?'
    ]
};
const candidateProfile = {
    name: 'Vinay Kumar',
    interviewName: 'Mock Interview'
};

const aiAgents = [
    {
        id: 'ava',
        name: 'Ava Morgan',
        role: 'Behavioral Specialist',
        voicePref: ['Google US English', 'Samantha', 'Microsoft Aria Online (Natural) - English (United States)'],
        image: 'Ava.png',
        ribbon: 'Calm Mentor'
    },
    {
        id: 'liam',
        name: 'Liam Chen',
        role: 'Full-Stack Engineer',
        voicePref: ['Google UK English Male', 'Daniel', 'Microsoft Guy Online (Natural) - English (United States)'],
        image: 'liam.png',
        ribbon: 'Technical Lead'
    },
    {
        id: 'sofia',
        name: 'Sofia Alvarez',
        role: 'Product Strategist',
        voicePref: ['Google español de Estados Unidos', 'Microsoft Ana Online (Natural) - Spanish (Mexico)', 'Victoria'],
        image: 'sofia.png',
        ribbon: 'Product Partner'
    },
    {
        id: 'noah',
        name: 'Noah Maco',
        role: 'Data Science Coach',
        voicePref: ['Google US English', 'Microsoft Christopher Online (Natural) - English (United States)', 'Alex'],
        image: 'noah.png',
        ribbon: 'Data Expert'
    },
    {
        id: 'mira',
        name: 'Mira Patel',
        role: 'AI Ethics Interviewer',
        voicePref: ['Google UK English Female', 'Karen', 'Microsoft Neerja Online (Natural) - English (India)'],
        image: 'mira.png',
        ribbon: 'Future Thinker'
    }
];
let activeAgent = aiAgents[0];

const evaluationRubric = {
    intro: [
        { type: 'length', minWords: 25, weight: 2, description: 'Provides enough background detail' },
        { type: 'keyword', keywords: ['experience', 'background', 'education', 'skills'], weight: 2, description: 'Mentions experience/education/skills' },
        { type: 'structure', keywords: ['currently', 'previously', 'looking', 'passion'], weight: 1.5, description: 'Explains current role and goals' }
    ],
    project: [
        { type: 'keyword', keywords: ['project', 'built', 'developed', 'implemented'], weight: 1.5, description: 'References a concrete project' },
        { type: 'impact', keywords: ['result', 'impact', 'improved', 'reduced', 'increased'], weight: 2, description: 'Mentions measurable impact' },
        { type: 'challenge', keywords: ['challenge', 'problem', 'issue', 'difficult'], weight: 1.5, description: 'Describes challenges and resolution' }
    ],
    python: [
        { type: 'keyword', keywords: ['python', 'module', 'package', 'async', 'pandas', 'numpy'], weight: 2, description: 'References Python tools/features' },
        { type: 'depth', keywords: ['optimiz', 'performance', 'complexity', 'scalab'], weight: 2, description: 'Discusses depth/performance' },
        { type: 'length', minWords: 20, weight: 1, description: 'Provides a sufficiently detailed answer' }
    ],
    pythonCoding: [
        { type: 'keyword', keywords: ['function', 'class', 'loop', 'recursion', 'data structure'], weight: 2, description: 'Mentions coding constructs' },
        { type: 'example', keywords: ['for example', 'for instance', 'e.g.', 'such as'], weight: 1.5, description: 'Provides concrete example' },
        { type: 'depth', keywords: ['algorithm', 'optimiz', 'edge case'], weight: 1.5, description: 'Shows reasoning/edge cases' }
    ],
    sql: [
        { type: 'keyword', keywords: ['join', 'query', 'index', 'transaction', 'aggregate'], weight: 2, description: 'References SQL concepts' },
        { type: 'impact', keywords: ['optimiz', 'performance', 'latency'], weight: 1.5, description: 'Speaks about optimization/impact' },
        { type: 'length', minWords: 18, weight: 1, description: 'Answer has enough detail' }
    ],
    communication: [
        { type: 'keyword', keywords: ['team', 'collaborat', 'stakeholder', 'communication'], weight: 2, description: 'Mentions teamwork/communication' },
        { type: 'sentiment', minSentiment: 0.1, weight: 1.5, description: 'Keeps positive/constructive tone' },
        { type: 'structure', keywords: ['first', 'then', 'finally', 'overall'], weight: 1, description: 'Uses structured storytelling' }
    ]
};

// Theme Management
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleText = document.getElementById('themeToggleText');
    const html = document.documentElement;
    
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeToggleText(savedTheme, themeToggleText);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleText(newTheme, themeToggleText);
        });
    }
}

function updateThemeToggleText(theme, element) {
    if (element) {
        element.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    addMessage('bot', 'Welcome to the advanced Interview Chatbot! Click "Start Interview" to activate video, audio, screenshots, AI voice, live transcription and adaptive insights.');
    updateQuestionProgress();
    // previewNextQuestion(0); // Removed as next question is dynamic
    if (nextQuestionDisplay) {
        nextQuestionDisplay.textContent = 'Next question will be dynamically generated by the AI.';
    }
    setVoicePreference(false);
    initSetupFlow();
    initAgents();
    if (speechSupported) {
        initVoices();
    } else if (agentVoiceLabel) {
        agentVoiceLabel.textContent = 'Voice not supported in this browser';
    }
    if (voiceToggle && !speechSupported) {
        voiceToggle.disabled = true;
        voiceToggle.title = 'AI voice not supported in this browser';
        if (voiceToggleLabel) {
            voiceToggleLabel.textContent = 'AI Voice: Unavailable';
        }
    }
    downloadReportBtn?.addEventListener('click', downloadPerformanceReport);
    closeReportBtn?.addEventListener('click', () => {
        reportOverlay?.classList.add('hidden');
        // Show completion popup after report is closed
        setTimeout(() => {
            showCompletionPopup();
        }, 500);
    });
    
    // Feedback form handlers
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFeedbackSubmit();
        });
    }
    
    if (skipFeedbackBtn) {
        skipFeedbackBtn.addEventListener('click', () => {
            completionOverlay?.classList.add('hidden');
            showInterviewCompleteMessage();
        });
    }
    
    // Coding section handlers
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', () => {
            executeCode();
        });
    }
    
    if (submitCodeBtn) {
        submitCodeBtn.addEventListener('click', () => {
            submitCodingAnswer();
        });
    }
    
    if (closeCodingBtn) {
        closeCodingBtn.addEventListener('click', () => {
            skipCodingSection();
        });
    }
    
    // Final completion screen handler
    if (closeTabBtn) {
        closeTabBtn.addEventListener('click', () => {
            // Try to close the tab (may not work if not opened by script)
            window.close();
            // If closing fails, show message
            setTimeout(() => {
                if (!document.hidden) {
                    alert('Please close this tab manually. Your interview data has been saved.');
                }
            }, 100);
        });
    }
});

// Start interview

// Stop interview
stopBtn.addEventListener('click', async () => {
    // Prevent multiple stops
    if (!isRecording) {
        console.log("Interview is already stopped or not recording.");
        return;
    }

    console.log("Stopping interview...");

    // 1. Stop Video and Audio Recorders
    if (videoRecorder && videoRecorder.state !== 'inactive') {
        videoRecorder.stop();
        console.log("Video recorder stopped.");
    }
    if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.stop();
        console.log("Audio recorder stopped.");
    }

    // 2. Stop Media Stream Tracks (Camera & Microphone)
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Track stopped: ${track.kind}`);
        });
        mediaStream = null; // Clear the stream reference
        videoPreview.srcObject = null; // Clear the video element
        console.log("Media stream tracks stopped and video preview cleared.");
    }

    // 3. Stop Screenshot Capture
    stopScreenshotCapture(); // Call your dedicated function for this
    console.log("Screenshot capture halted.");

    // 4. Stop Duration Timer
    if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
        console.log("Duration timer stopped.");
    }
    
    // Stop interview end check
    if (interviewEndCheckInterval) {
        clearInterval(interviewEndCheckInterval);
        interviewEndCheckInterval = null;
        console.log("Interview end check stopped.");
    }

    // 5. Stop Speech Recognition
    if (speechRecognition) {
        recognitionActive = false; // Set flag before stopping
        try {
            speechRecognition.stop();
        } catch (e) {
            console.warn("Error stopping speech recognition:", e);
        }
        // Clear onend handler to prevent it from immediately restarting or handling
        // any lingering recognition results after an intentional stop.
        speechRecognition.onend = null;
        console.log("Speech recognition stopped.");
    }

    // 5a. Stop any ongoing speech synthesis (AI voice)
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        if (aiAvatar) {
            aiAvatar.classList.remove('speaking');
        }
        if (voiceStatus) {
            voiceStatus.textContent = 'Muted';
        }
        console.log("Speech synthesis cancelled.");
    }

    // 6. Record pause time for duration calculation
    pausedTime = Date.now();
    console.log("Pause time recorded.");

    // 7. Update UI and internal state
    isRecording = false;
    recordingIndicator.classList.remove('recording');
    recordingText.textContent = 'Not Recording';
    if (transcriptStatus) { // Assuming transcriptStatus exists
        transcriptStatus.textContent = 'Offline';
    }
    // Update transcript display to indicate it's offline
    updateTranscriptDisplay('Speech recognition offline.');


    // Button states
    stopBtn.disabled = true; // Disable Stop
    resumeBtn.disabled = false; // Enable Resume
    downloadBtn.disabled = false; // Enable Download (recordings are now finalized)

    // User input / AI voice
    userInput.disabled = true; // Disable user input
    sendBtn.disabled = true; // Disable send button
    if (voiceToggle) {
        voiceToggle.disabled = true; // Disable AI voice toggle
        setVoicePreference(false); // Turn off AI voice
    }

    addInsight('Interview paused • Recording and AI dialogue stopped.');
    console.log("Interview stopped completely. UI updated.");
});
// Add this event listener somewhere near your other button event listeners
resumeBtn.addEventListener('click', async () => {
    console.log("Resuming interview...");

    // Calculate paused duration and add to total paused time
    if (pausedTime) {
        const pauseDuration = Date.now() - pausedTime;
        totalPausedDuration += pauseDuration;
        pausedTime = null;
        console.log(`Paused for ${Math.floor(pauseDuration / 1000)} seconds. Total paused: ${Math.floor(totalPausedDuration / 1000)} seconds.`);
    }

    // Re-activate media and recorders
    const mediaActivated = await activateMediaAndRecorders(); // This function will start duration & screenshots and interview end check

    if (!mediaActivated) {
        alert('Failed to resume camera/microphone. Please check permissions and try again.');
        return; // Do not proceed if media cannot be reactivated
    }
    
    // Restart speech recognition
    if (speechRecognition) {
        // Restore onend handler if it was cleared during stop
        if (!speechRecognition.onend) {
            speechRecognition.onend = () => {
                recognitionActive = false;
                if (recognitionPausedByAI) {
                    updateTranscriptState('Paused');
                    return;
                }
                // Only restart if recording is active AND not manually stopped
                if (isRecording && !recognitionPausedByAI) {
                    updateTranscriptState('Reconnecting…');
                    setTimeout(() => {
                        // Double-check recording is still active before restarting
                        if (isRecording) {
                            startSpeechRecognition();
                        }
                    }, 800);
                } else {
                    updateTranscriptState('Offline');
                }
            };
        }
    } else {
        // Initialize if it doesn't exist
        initSpeechRecognition();
    }
    startSpeechRecognition(); // Start speech recognition again
    updateTranscriptDisplay('Calibrating microphone…');
    if (transcriptStatus) {
        transcriptStatus.textContent = 'Online'; // Update transcript status
    }


    // UI Updates
    stopBtn.disabled = false; // Enable Stop
    resumeBtn.disabled = true; // Disable Resume
    downloadBtn.disabled = true; // Disable download while recording
    userInput.disabled = false; // Enable user input
    sendBtn.disabled = false; // Enable send button
    if (voiceToggle) {
        voiceToggle.disabled = false; // Enable AI voice toggle
        setVoicePreference(true); // Turn on AI voice (or keep previous setting)
    }

    addInsight('Interview resumed • Recording and AI dialogue restarted.');

    // Potentially re-engage AI by repeating the last question or prompting for a response
    // Only speak if the bot was waiting for a response and hasn't received one yet.
    if (lastPrompt && latestTranscript === '') { // If lastPrompt exists and no new input was given
        setTimeout(() => {
            addMessage('bot', `Resuming. ${lastPrompt}`); // Reiterate last question
            speakQuestion(lastPrompt);
        }, 300);
    } else if (latestTranscript !== '') {
        // If user had started typing or speaking before stopping, just let them continue.
        addMessage('bot', 'Okay, we are back. Please continue your response or let me know when you are ready for the next question.');
    }
    console.log("Interview resumed. UI updated.");
});
// Send message
sendBtn.addEventListener('click', () => {
    sendMessage();
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
        sendMessage();
    }
});

if (voiceToggle) {
    voiceToggle.addEventListener('click', () => {
        if (voiceToggle.disabled || !speechSupported) return;
        setVoicePreference(!speechEnabled);
        addInsight(`AI voice ${speechEnabled ? 'enabled' : 'muted'}.`);
    });
}

// Initialize recorders
async function initializeRecorders() {
    // Video recorder
    videoChunks = [];
    videoRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9'
    });

    videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            videoChunks.push(event.data);
        }
    };
    videoRecorder.onstop = () => {
        enableDownload();
    };

    // Audio recorder
    audioChunks = [];
    const audioStream = new MediaStream(mediaStream.getAudioTracks());
    audioRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm'
    });

    audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
}

// Start screenshot capture
function startScreenshotCapture() {
    // Don't reset screenshots if resuming - preserve existing screenshots
    // Only initialize as empty array if it doesn't exist (shouldn't happen, but safety check)
    if (!screenshots) {
        screenshots = [];
    }
    // Clear any existing interval before starting a new one
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
    }
    screenshotInterval = setInterval(() => {
        captureScreenshot();
    }, 10000); // Every 10 seconds

    // Capture first screenshot immediately only if starting fresh (no existing screenshots)
    if (screenshots.length === 0) {
        captureScreenshot();
    }
}
function stopScreenshotCapture() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
        console.log("Screenshot capture stopped.");
    }
}
// Capture screenshot
function captureScreenshot() {
    const canvas = document.createElement('canvas');
    canvas.width = videoPreview.videoWidth || 1280;
    canvas.height = videoPreview.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        const timestamp = new Date().toISOString();
        screenshots.push({
            blob: blob,
            timestamp: timestamp,
            filename: `screenshot_${timestamp.replace(/[:.]/g, '-')}.png`
        });
        screenshotCount.textContent = screenshots.length;
    }, 'image/png');
}

// Stop recording
function stopRecording() {
    if (!isRecording) return;

    // Stop media stream
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    // Stop recorders
    if (videoRecorder && videoRecorder.state !== 'inactive') {
        videoRecorder.stop();
    }
    if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.stop();
    }

    // Stop screenshot capture
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
    }

    // Stop duration timer
    if (durationInterval) {
        clearInterval(durationInterval);
    }

    // Update UI
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    downloadBtn.disabled = false;
    userInput.disabled = true;
    sendBtn.disabled = true;
    recordingIndicator.classList.remove('recording');
    recordingText.textContent = 'Recording Stopped';
    if (voiceToggle) {
        voiceToggle.disabled = true;
    }
    setVoicePreference(false);
    stopSpeechRecognition();
    updateTranscriptState('Offline');
    addInsight('Interview stopped • Recordings ready for download.');
    showPerformanceReport();

    // Wait for recorders to finish handled via recorder events
}
// Add this function somewhere after stopRecording()
async function activateMediaAndRecorders() {
    try {
        // Request media access (Video and Audio)
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: true
        });

        videoPreview.srcObject = mediaStream;

        // Initialize recorders
        await initializeRecorders();

        // Start recording
        videoRecorder.start();
        audioRecorder.start();

        // Start screenshot capture (preserves existing screenshots if resuming)
        startScreenshotCapture();

        // Start duration timer (preserve original startTime, only set if first time)
        if (!startTime) {
            // First time starting
            startTime = Date.now();
        }
        // If resuming, startTime is already set and totalPausedDuration tracks pauses
        durationInterval = setInterval(updateDuration, 1000);
        
        // Start checking if interview should auto-end
        startInterviewEndCheck();

        // Reset analytics panels and UI state for recording
        isRecording = true;
        recordingIndicator.classList.add('recording');
        recordingText.textContent = 'Recording...';
        if (transcriptStatus) {
             transcriptStatus.textContent = 'Online'; // Set transcript status to online
        }
        
        // Return true to indicate successful activation
        return true; 
        
    } catch (error) {
        console.error('Error activating media:', error);
        alert('Error accessing camera/microphone. Please ensure permissions are granted.');
        isRecording = false; // Ensure state is reset on failure
        return false;
    }
}
// Enable download button
function enableDownload() {
    downloadBtn.disabled = false;
}

// Download recordings
downloadBtn.addEventListener('click', () => {
    downloadAll();
});

// Download all files
function downloadAll() {
    // Download video
    if (videoChunks.length > 0) {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        const videoLink = document.createElement('a');
        videoLink.href = videoUrl;
        videoLink.download = `interview_video_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        videoLink.click();
        URL.revokeObjectURL(videoUrl);
    }

    // Download audio
    if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioLink = document.createElement('a');
        audioLink.href = audioUrl;
        audioLink.download = `interview_audio_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        audioLink.click();
        URL.revokeObjectURL(audioUrl);
    }

    // Download screenshots
    screenshots.forEach((screenshot, index) => {
        setTimeout(() => {
            const url = URL.createObjectURL(screenshot.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = screenshot.filename;
            link.click();
            URL.revokeObjectURL(url);
        }, index * 100); // Stagger downloads
    });

    alert(`Downloaded:\n- 1 Video file\n- 1 Audio file\n- ${screenshots.length} Screenshot files`);
}

// Update duration
function updateDuration() {
    if (!startTime) return;
    // Calculate elapsed time minus total paused duration
    const elapsed = Math.floor((Date.now() - startTime - totalPausedDuration) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    durationDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Check if interview should end based on questions or duration
function shouldEndInterview() {
    // Don't end if we haven't completed regular questions yet (coding section should start)
    if (answeredCount < MAX_QUESTIONS && !codingSectionActive) {
        return false;
    }
    
    // Don't end if we're in coding section and haven't completed it
    if (codingSectionActive && codingQuestionCount < MAX_CODING_QUESTIONS) {
        return false;
    }
    
    // Check if coding section is complete
    if (codingSectionActive && codingQuestionCount >= MAX_CODING_QUESTIONS) {
        addInsight(`Coding section completed. Interview finished.`);
        return true;
    }
    
    // Check total questions (regular + coding)
    const totalQuestionsAnswered = answeredCount + (codingSectionActive ? codingQuestionCount : 0);
    if (totalQuestionsAnswered >= MAX_QUESTIONS + MAX_CODING_QUESTIONS) {
        addInsight(`Interview reached maximum questions.`);
        return true;
    }
    
    // Check duration
    if (startTime) {
        const elapsedMs = Date.now() - startTime - totalPausedDuration;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        if (elapsedMinutes >= MAX_DURATION_MINUTES) {
            addInsight(`Interview reached maximum duration of ${MAX_DURATION_MINUTES} minutes.`);
            return true;
        }
    }
    
    return false;
}

// Start periodic check for interview completion
function startInterviewEndCheck() {
    if (interviewEndCheckInterval) {
        clearInterval(interviewEndCheckInterval);
    }
    
    // Check every 30 seconds if interview should end
    interviewEndCheckInterval = setInterval(() => {
        if (isRecording && shouldEndInterview()) {
            endInterviewAutomatically();
        }
    }, 30000); // Check every 30 seconds
}

// Automatically end interview and show report
function endInterviewAutomatically() {
    if (!isRecording) return;
    
    console.log("Automatically ending interview...");
    
    // Stop all recording activities
    if (videoRecorder && videoRecorder.state !== 'inactive') {
        videoRecorder.stop();
    }
    if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.stop();
    }
    
    // Stop screenshot capture
    stopScreenshotCapture();
    
    // Stop duration timer
    if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
    }
    
    // Stop interview end check
    if (interviewEndCheckInterval) {
        clearInterval(interviewEndCheckInterval);
        interviewEndCheckInterval = null;
    }
    
    // Stop speech recognition
    if (speechRecognition) {
        recognitionActive = false;
        try {
            speechRecognition.stop();
        } catch (e) {
            console.warn("Error stopping speech recognition:", e);
        }
        speechRecognition.onend = null;
    }
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Update UI
    isRecording = false;
    recordingIndicator.classList.remove('recording');
    recordingText.textContent = 'Interview Complete';
    
    // Disable buttons
    stopBtn.disabled = true;
    resumeBtn.disabled = true;
    downloadBtn.disabled = false;
    userInput.disabled = true;
    sendBtn.disabled = true;
    
    if (voiceToggle) {
        voiceToggle.disabled = true;
        setVoicePreference(false);
    }
    
    // Show completion message
    const reason = answeredCount >= MAX_QUESTIONS 
        ? `completed ${MAX_QUESTIONS} questions` 
        : `reached ${MAX_DURATION_MINUTES} minutes`;
    
    addMessage('bot', `Thank you for your time! The interview is complete. We've ${reason}.`);
    speakQuestion('Thank you for your time! The interview is complete.');
    addInsight(`Interview automatically completed: ${reason}.`);
    
    // Show performance report
    setTimeout(() => {
        showPerformanceReport();
    }, 1000);
}

// Add message to chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-modern message-${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add fade-in animation
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = sender === 'bot' ? 'translateX(-20px)' : 'translateX(20px)';
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
    }, 10);
}

// Send message
function sendMessage() {
    processAnswer(userInput.value, 'text');
}

function processAnswer(rawText, source = 'text') {
    if (!rawText) return;
    const text = rawText.trim();
    if (!text) return;
    
    // Prevent processing error messages or system messages as user input
    const errorMessage = "I seem to have experienced a small technical glitch. Can you tell me more about that, or perhaps elaborate on your last point?";
    if (text.toLowerCase().includes('technical glitch') || text.toLowerCase() === errorMessage.toLowerCase()) {
        addInsight('Ignored system error message as user input.');
        return;
    }
    
    // Prevent processing if a question is already being generated
    if (isGeneratingQuestion) {
        addInsight('Please wait, generating next question...');
        return;
    }
    
    if (source === 'voice') {
        if (text.length < 3) {
            addInsight('Ignored very short voice transcript.');
            return;
        }
        if (lastPrompt && text.toLowerCase() === lastPrompt.toLowerCase()) {
            addInsight('Ignored transcript that matched AI question.');
            return;
        }
    }
    
    // Filter out very short or unclear responses (less than 5 words and no meaningful content)
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3 && !text.match(/[a-zA-Z]{4,}/)) {
        addInsight('Ignored unclear or too short response.');
        return;
    }
    
    // Filter out questions from user (they should be answering, not asking)
    if (text.trim().endsWith('?') && words.length < 8) {
        addInsight('Ignored user question - waiting for answer.');
        // Respond to user's question instead
        setTimeout(() => {
            addMessage('bot', "I'd be happy to answer that after the interview. For now, could you tell me more about your background or experience?");
            speakQuestion("I'd be happy to answer that after the interview. For now, could you tell me more about your background or experience?");
            lastPrompt = "I'd be happy to answer that after the interview. For now, could you tell me more about your background or experience?";
        }, 500);
        return;
    }

    const messageLabel = source === 'voice' ? `${text} (voice)` : text;
    addMessage('user', messageLabel);
    if (source === 'text') {
        userInput.value = '';
    }

    handleUserAnswer(text, source);
    answeredCount = Math.min(answeredCount + 1, totalQuestions);
    updateQuestionProgress();
    
    // Simplified category logic for dynamic flow
    const categories = Object.keys(evaluationCategories);
    const categoryIndex = (currentQuestionIndex - 1) % categories.length;
    const currentCategory = categories[categoryIndex] || 'communication';

    recordPerformanceMetric(currentCategory, text, sentimentHistory[sentimentHistory.length - 1] ?? 0, source);

   setTimeout(() => {
        // Check if user explicitly wants to end
        if (text.toLowerCase().includes('end interview')) {
            endInterviewAutomatically();
        } 
        // Check if we should transition to coding section (after 8 regular questions)
        else if (answeredCount >= MAX_QUESTIONS && !codingSectionActive) {
            // Transition to coding section after regular questions
            startCodingSection();
        } 
        // Check if interview should end (after coding section or time limit)
        else if (shouldEndInterview()) {
            endInterviewAutomatically();
        } 
        else if (!isRecording) {
            // Don't generate questions if interview is not recording
            addInsight('Interview has ended. No more questions will be asked.');
        } 
        else if (codingSectionActive) {
            // In coding section, don't generate regular questions
            // Coding questions are handled separately via submitCodingAnswer
            addInsight('Please use the coding interface to submit your solutions.');
        } 
        else if (currentQuestionIndex >= totalQuestions) {
            // Fallback: if we somehow exceed total questions
            endInterviewAutomatically();
        }
        else {
            // Continue with regular questions
            generateAIQuestion(text);
        }
        currentQuestionIndex++;
        // --- END MODIFICATION ---

}, 500);

}



function handleUserAnswer(answerText, source = 'text') {
    if (!answerText) return;
    addInsight(`Captured ${source === 'voice' ? 'voice' : 'text'} answer.`);
    const sentiment = analyzeSentiment(answerText);
    sentimentHistory.push(sentiment);
    // Sentiment UI removed - no longer displaying sentiment
    // Sentiment tracking removed from UI
    if (source === 'voice') {
        addInsight(`Voice response captured: "${answerText}"`);
    } else if (latestTranscript) {
        addInsight(`Transcript captured: "${latestTranscript}"`);
    }
}

function analyzeSentiment(text) {
    if (!text) return 0;
    const tokens = text.toLowerCase().split(/[^a-zA-Z]+/).filter(Boolean);
    if (!tokens.length) return 0;
    let score = 0;
    tokens.forEach((token) => {
        if (positiveLexicon.some(word => token.includes(word))) score += 1;
        if (negativeLexicon.some(word => token.includes(word))) score -= 1;
    });
    return Math.max(-1, Math.min(1, score / tokens.length));
}

// Sentiment UI feature removed - no longer needed

// Removed the old generateAdaptiveQuestion function to use the new AI logic

function recordPerformanceMetric(categoryId, answerText, sentiment, source) {
    const category = evaluationCategories[categoryId];
    if (!category || !answerText) return;
    const rubric = evaluationRubric[categoryId];
    const scoreDetails = calculateScoreForAnswer(categoryId, answerText, sentiment);
    const score = scoreDetails.score;
    if (rubric) {
        category.criteriaMet = (category.criteriaMet || 0) + scoreDetails.criteriaMet;
        category.criteriaTotal = (category.criteriaTotal || 0) + scoreDetails.criteriaTotal;
    }
    category.score += score;
    category.samples += 1;
    performanceHistory.push({
        timestamp: Date.now(),
        categoryId,
        questionIndex: currentQuestionIndex,
        answer: answerText,
        sentiment,
        score,
        source
    });
}

function calculateScoreForAnswer(categoryId, answerText, sentiment) {
    const rubric = evaluationRubric[categoryId];
    if (!rubric) {
        const fallback = Math.max(0, Math.min(10, 5 + sentiment * 3 + Math.min(2, answerText.length / 120)));
        return { score: Number(fallback.toFixed(1)), criteriaMet: 0, criteriaTotal: 0 };
    }
    const lower = answerText.toLowerCase();
    let earned = 0;
    let totalWeight = 0;
    let met = 0;

    rubric.forEach(criterion => {
        totalWeight += criterion.weight;
        const achieved = evaluateCriterion(criterion, lower, answerText, sentiment);
        if (achieved) {
            earned += criterion.weight;
            met += 1;
        }
    });

    const baseScore = totalWeight ? (earned / totalWeight) * 10 : 5;
    return {
        score: Number(Math.max(0, Math.min(10, baseScore)).toFixed(1)),
        criteriaMet: met,
        criteriaTotal: rubric.length
    };
}

function evaluateCriterion(criterion, lowerAnswer, rawAnswer, sentiment) {
    switch (criterion.type) {
        case 'length': {
            const words = rawAnswer.trim().split(/\s+/).length;
            return words >= (criterion.minWords || 0);
        }
        case 'keyword':
            return (criterion.keywords || []).some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
        case 'structure':
            return (criterion.keywords || []).filter(keyword => lowerAnswer.includes(keyword.toLowerCase())).length >= 2;
        case 'impact':
        case 'challenge':
        case 'example':
        case 'depth':
            return (criterion.keywords || []).some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
        case 'sentiment':
            return sentiment >= (criterion.minSentiment ?? 0);
        default:
            return false;
    }
}

function setVoicePreference(enabled) {
    if (!speechSupported) {
        speechEnabled = false;
        if (voiceToggleLabel) {
            voiceToggleLabel.textContent = 'AI Voice: Unavailable';
        }
        return;
    }
    speechEnabled = enabled;
    if (voiceToggle) {
        voiceToggle.classList.toggle('active', speechEnabled);
        voiceToggle.setAttribute('aria-pressed', speechEnabled);
    }
    if (voiceToggleLabel) {
        voiceToggleLabel.textContent = speechEnabled ? 'AI Voice: On' : 'AI Voice: Off';
    }
    if (voiceStatus) {
        voiceStatus.textContent = speechEnabled ? 'Active' : 'Muted';
    }
    if (!speechEnabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        if (aiAvatar) {
            aiAvatar.classList.remove('speaking');
        }
        resumeRecognitionAfterAI();
    }
}

function speakQuestion(text) {
    if (!speechEnabled || !speechSupported || !text) return;
    window.speechSynthesis.cancel();
    pauseRecognitionForAI();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.03;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    const voice = pickVoiceForAgent();
    if (voice) {
        utterance.voice = voice;
    }
    utterance.onstart = () => {
        if (aiAvatar) aiAvatar.classList.add('speaking');
        if (voiceStatus) voiceStatus.textContent = 'Speaking';
    };
    utterance.onend = () => {
        if (aiAvatar) aiAvatar.classList.remove('speaking');
        if (voiceStatus) voiceStatus.textContent = 'Active';
        resumeRecognitionAfterAI();
    };
    speechSynthesis.speak(utterance);
}

function updateQuestionProgress() {
    if (!questionProgress) return;
    questionProgress.textContent = `${Math.min(currentQuestionIndex, totalQuestions)} / ${totalQuestions}`;
}

function previewNextQuestion(nextIndex) {
    // This function is largely obsolete as the next question is unknown until generated
    if (!nextQuestionDisplay) return;
    nextQuestionDisplay.textContent = 'Next question will be dynamically generated by the AI.';
}

function initSpeechRecognition() {
    if (!SpeechRecognition || speechRecognition) return;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
        recognitionActive = true;
        updateTranscriptState('Listening');
    };

    speechRecognition.onerror = (event) => {
        recognitionActive = false;
        addInsight(`Speech recognition error: ${event.error}`);
        updateTranscriptState('Error');
    };

    speechRecognition.onend = () => {
        recognitionActive = false;
        if (recognitionPausedByAI) {
            updateTranscriptState('Paused');
            return;
        }
        // Only restart if recording is active AND not manually stopped
        if (isRecording && !recognitionPausedByAI) {
            updateTranscriptState('Reconnecting…');
            setTimeout(() => {
                // Double-check recording is still active before restarting
                if (isRecording) {
                    startSpeechRecognition();
                }
            }, 800);
        } else {
            updateTranscriptState('Offline');
        }
    };

    speechRecognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript.trim();
            if (!transcript) continue;
            if (result.isFinal) {
                latestTranscript = transcript;
                if (transcript && transcript !== lastVoiceAnswer) {
                    lastVoiceAnswer = transcript;
                    processAnswer(transcript, 'voice');
                }
            } else {
                interimTranscript = transcript;
            }
        }
        const displayText = [latestTranscript, interimTranscript].filter(Boolean).join(' / ');
        updateTranscriptDisplay(displayText || 'Listening…');
    };
}

function startSpeechRecognition() {
    if (!SpeechRecognition) {
        updateTranscriptState('Unsupported');
        return;
    }
    initSpeechRecognition();
    if (!speechRecognition || recognitionActive) return;
    try {
        speechRecognition.start();
    } catch (error) {
        addInsight(`Speech recognition start issue: ${error.message}`);
    }
}

function stopSpeechRecognition() {
    if (speechRecognition && recognitionActive) {
        speechRecognition.stop();
    }
    recognitionActive = false;
    recognitionPausedByAI = false;
}

function updateTranscriptState(state) {
    if (!transcriptStatus) return;
    let badgeClass = 'badge badge-neutral';
    if (state === 'Listening') badgeClass = 'badge badge-positive';
    if (state === 'Offline' || state === 'Unsupported' || state === 'Error') badgeClass = 'badge badge-negative';
    transcriptStatus.textContent = state;
    transcriptStatus.className = badgeClass;
}

function updateTranscriptDisplay(text) {
    if (!liveTranscript) return;
    liveTranscript.textContent = text;
}

function addInsight(message) {
    if (!analyticsFeed || !message) return;
    
    // Remove placeholder if it exists
    const placeholder = analyticsFeed.querySelector('.insight-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    const entry = document.createElement('div');
    entry.className = 'analytics-entry-modern';
    entry.innerHTML = `
        <div class="insight-time">${new Date().toLocaleTimeString()}</div>
        <div class="insight-message">${message}</div>
    `;
    analyticsFeed.prepend(entry);
    
    // Limit to 10 entries
    const entries = analyticsFeed.querySelectorAll('.analytics-entry-modern');
    if (entries.length > 10) {
        entries[entries.length - 1].remove();
    }
    
    // Add fade-in animation
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        entry.style.transition = 'all 0.3s ease';
        entry.style.opacity = '1';
        entry.style.transform = 'translateY(0)';
    }, 10);
}

function pauseRecognitionForAI() {
    if (!SpeechRecognition) return;
    recognitionPausedByAI = true;
    if (speechRecognition && recognitionActive) {
        try {
            speechRecognition.stop();
        } catch (err) {
            console.warn('Failed to pause recognition:', err);
        }
    }
}

function resumeRecognitionAfterAI() {
    if (!SpeechRecognition) return;
    if (!recognitionPausedByAI) return;
    recognitionPausedByAI = false;
    if (isRecording) {
        startSpeechRecognition();
    } else {
        updateTranscriptState('Offline');
    }
}

function initAgents() {
    if (!agentSelect) return;
    agentSelect.innerHTML = aiAgents.map(agent => `<option value="${agent.id}">${agent.name}</option>`).join('');
    agentSelect.addEventListener('change', (e) => setActiveAgent(e.target.value));
    shuffleAgentBtn?.addEventListener('click', () => {
        const pool = aiAgents.filter(agent => agent.id !== activeAgent.id);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setActiveAgent(pick.id);
    });
    setActiveAgent(activeAgent.id);
}

function setActiveAgent(agentId) {
    const agent = aiAgents.find(a => a.id === agentId) || aiAgents[0];
    activeAgent = agent;
    if (agentSelect) agentSelect.value = agent.id;
    if (agentPhoto) {
        agentPhoto.src = agent.image;
        agentPhoto.alt = `${agent.name} - ${agent.role}`;
    }
    if (agentRole) agentRole.textContent = agent.role;
    if (agentRibbon) agentRibbon.textContent = agent.ribbon || 'AI Interviewer';
    updateAgentVoiceLabel();
}

function initVoices() {
    if (!speechSupported) return;
    const loadVoices = () => {
        availableVoices = speechSynthesis.getVoices();
        updateAgentVoiceLabel();
    };
    loadVoices();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function updateAgentVoiceLabel() {
    if (!agentVoiceLabel) return;
    const voice = pickVoiceForAgent();
    if (voice) {
        selectedVoice = voice;
        agentVoiceLabel.textContent = `${voice.name} (${voice.lang})`;
    } else if (speechSupported) {
        agentVoiceLabel.textContent = 'Using default voice';
    } else {
        agentVoiceLabel.textContent = 'Voice unavailable';
    }
}

function pickVoiceForAgent() {
    if (!speechSupported) return null;
    if (!availableVoices.length) {
        availableVoices = speechSynthesis.getVoices();
    }
    if (!availableVoices.length) return selectedVoice;
    if (activeAgent.voicePref) {
        const preferred = availableVoices.find(voice => activeAgent.voicePref.includes(voice.name));
        if (preferred) return preferred;
    }
    return availableVoices[0];
}

// ===== Device setup flow =====
function initSetupFlow() {
    // If setup is already complete, bypass the overlay and directly proceed
    if (setupComplete) {
        if (setupOverlay) {
            setupOverlay.classList.add('hidden'); // Ensure overlay is hidden
        }
        // Directly initiate the interview on reload if setup is complete
        completeSetupFlow(true); // Pass true to indicate it's a bypass/reload
        return;
    }

    // If setup is NOT complete, show the overlay and set up listeners
    setupOverlay.classList.remove('hidden');

    // Attach event listeners only once
    setupNextBtn?.addEventListener('click', handleSetupNext);
    setupBackBtn?.addEventListener('click', handleSetupBack);
    cameraRetryBtn?.addEventListener('click', startCameraTest);
    microphoneRetryBtn?.addEventListener('click', startMicrophoneTest);
    playSpeakerTestBtn?.addEventListener('click', handleSpeakerPlayback);
    confirmSpeakerTestBtn?.addEventListener('click', confirmSpeakerHeard);
    startScreenShareBtn?.addEventListener('click', requestScreenShare);
    setupHelpBtn?.addEventListener('click', () => {
        alert('Grant camera, microphone, speaker and screen permissions to ensure a smooth interview experience.');
    });

    goToSetupStep(0); // Start at the first step
    updateBandwidthIndicator();
    bandwidthInterval = setInterval(updateBandwidthIndicator, 3000);
}

function goToSetupStep(index) {
    // Clean up resources for the step we are *leaving*
    cleanupStepResources(setupStepsOrder[currentSetupStep]);
    currentSetupStep = index;
    updateSetupUI(); // Update UI for the new step
    // Run entry logic for the step we are *entering*
    runStepEntry(setupStepsOrder[currentSetupStep]);
}

function handleSetupNext() {
    const stepKey = setupStepsOrder[currentSetupStep];
    // Ensure the current step is actually completed before proceeding
    if (!setupState[stepKey]) {
        console.warn(`Attempted to proceed from uncompleted step: ${stepKey}`);
        return; // Don't proceed if current step is not complete
    }

    if (currentSetupStep < setupStepsOrder.length - 1) {
        goToSetupStep(currentSetupStep + 1);
    } else {
        // All steps completed, initiate the main interview flow
        completeSetupFlow();
    }
}

function handleSetupBack() {
    if (currentSetupStep === 0) return; // Cannot go back from the first step
    goToSetupStep(currentSetupStep - 1);
}

function updateSetupUI() {
    setupStepNodes.forEach(node => {
        const index = Number(node.dataset.stepIndex);
        node.classList.toggle('active', index === currentSetupStep);
        // A step is 'complete' if its index is less than the current step OR
        // if it's the current step AND its corresponding setupState property is true.
        node.classList.toggle('complete', index < currentSetupStep || (setupState[setupStepsOrder[index]] && index === currentSetupStep));
    });

    setupStages.forEach(stage => {
        const stageKey = stage.id.replace('Step', '').toLowerCase(); // Ensure lowercase for comparison
        stage.classList.toggle('visible', setupStepsOrder[currentSetupStep] === stageKey);
    });

    setupBackBtn.disabled = currentSetupStep === 0;

    const currentKey = setupStepsOrder[currentSetupStep];
    setupNextBtn.textContent = currentSetupStep === setupStepsOrder.length - 1 ? 'Start Interview' : 'Next';
    // setupNextBtn is enabled ONLY if the current step is completed successfully.
    setupNextBtn.disabled = !setupState[currentKey];
}

function updateBandwidthIndicator() {
    if (!setupBandwidth) return;
    const value = (1.8 + Math.random() * 2.2).toFixed(1);
    setupBandwidth.textContent = `${value} mb/s`;
}

function runStepEntry(step) {
    if (step === 'camera') startCameraTest();
    else if (step === 'microphone') startMicrophoneTest();
    else if (step === 'speaker') prepareSpeakerStep();
    else if (step === 'screen') requestScreenShare(); // Should be requestScreenShare, not prepareScreenStep
}

function cleanupStepResources(step) {
    if (step === 'camera') stopCameraTestStream();
    else if (step === 'microphone') stopMicrophoneTest();
    else if (step === 'screen') stopScreenSharePreview();
}

// ===== INDIVIDUAL SETUP STEP FUNCTIONS =====

async function startCameraTest() {
    if (!setupCameraPreview) return;
    setupState.camera = false; // Assume not complete until proven otherwise
    // setupNextBtn.disabled = true; // This will be handled by updateSetupUI() based on setupState.camera
    cameraStatus.textContent = 'Requesting camera access…';
    stopCameraTestStream();
    try {
        cameraTestStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setupCameraPreview.srcObject = cameraTestStream;
        setupState.camera = true; // Camera successful
        cameraStatus.textContent = 'Camera feed detected. Looks good!';
    } catch (error) {
        cameraStatus.textContent = `Camera access denied: ${error.message}`;
        setupState.camera = false; // Camera failed
    } finally {
        updateSetupUI(); // Always update UI after camera test result
    }
}

function stopCameraTestStream() {
    if (cameraTestStream) {
        cameraTestStream.getTracks().forEach(track => track.stop());
        cameraTestStream = null;
    }
    if (setupCameraPreview) {
        setupCameraPreview.srcObject = null;
    }
}

async function startMicrophoneTest() {
    if (!micLevelBar) return;
    setupState.microphone = false; // Assume not complete
    updateSetupUI(); // Update UI to reflect incomplete state
    microphoneStatus.textContent = 'Listening for your voice…';
    stopMicrophoneTest();
    try {
        micTestStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = micAudioContext.createMediaStreamSource(micTestStream);
        micAnalyser = micAudioContext.createAnalyser();
        micAnalyser.fftSize = 2048;
        source.connect(micAnalyser);
        monitorMicLevel();
    } catch (error) {
        microphoneStatus.textContent = `Microphone error: ${error.message}`;
        updateSetupUI(); // Update UI if mic access fails
    }
}

function monitorMicLevel() {
    if (!micAnalyser) return;
    const bufferLength = micAnalyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
        if (!micAnalyser) return;
        micAnalyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] - 128;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / bufferLength) / 128;
        const level = Math.min(1, rms * 4);
        micLevelBar.style.width = `${level * 100}%`;
        if (!setupState.microphone && level > 0.2) { // Voice detected
            setupState.microphone = true;
            microphoneStatus.textContent = 'Great! We detected your voice.';
            stopMicrophoneTest(true); // Stop monitoring but keep status
            updateSetupUI(); // Crucial: update UI to enable Next button
        } else if (!setupState.microphone) {
            micLevelAnimation = requestAnimationFrame(analyze);
        }
    };
    micLevelAnimation = requestAnimationFrame(analyze);
}

function stopMicrophoneTest(keepStatus = false) {
    if (micLevelAnimation) {
        cancelAnimationFrame(micLevelAnimation);
        micLevelAnimation = null;
    }
    if (micAnalyser) {
        micAnalyser.disconnect();
        micAnalyser = null;
    }
    if (micAudioContext) {
        micAudioContext.close(); // Close context to release resources
        micAudioContext = null;
    }
    if (micTestStream) {
        micTestStream.getTracks().forEach(track => track.stop());
        micTestStream = null;
    }
    micLevelBar.style.width = '0%'; // Always reset bar visualization
    if (!keepStatus) {
        microphoneStatus.textContent = 'Awaiting microphone input…';
    }
}

function prepareSpeakerStep() {
    speakerTonePlayed = false;
    confirmSpeakerTestBtn.disabled = true; // Ensure button is disabled initially
    speakerStatus.textContent = 'Waiting for playback…';
    setupState.speaker = false; // Reset speaker state
    updateSetupUI(); // Update UI based on initial speaker state
}

function handleSpeakerPlayback() {
    const base64Tone =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRQAAAAgICAhISEgICAfHx8eHh4dHR0cHBwcGxsbGhoaGBgYF9fX15eXl1dXVxcXFtbW1paWllZWVhYWFdXV1ZWVlhYWFdXV1ZWVlhYWFhYWFhYWFhYWFhYWFhYWBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYG";
    const tone = new Audio(base64Tone);
    tone.volume = 1.0;

    tone.play().then(() => {
        speakerStatus.textContent = "Playing test tone…";
        speakerTonePlayed = true; // Tone started playing

        tone.onended = () => {
            speakerStatus.textContent = "Did you hear the tone? Confirm to proceed.";
            confirmSpeakerTestBtn.disabled = false; // Enable confirm button
        };
    }).catch(err => {
        speakerStatus.textContent = `Unable to play tone: ${err.message}`;
        confirmSpeakerTestBtn.disabled = true; // Keep disabled if tone fails
    });
}

function confirmSpeakerHeard() {
    if (!speakerTonePlayed) return; // Only confirm if tone was actually played
    setupState.speaker = true;
    speakerStatus.textContent = 'Speaker output confirmed.';
    updateSetupUI(); // Crucial: update UI to enable Next button
}

function prepareScreenStep() {
    screenStatus.textContent = 'Screen share not started.';
    setupState.screen = false; // Reset screen state
    updateSetupUI(); // Update UI based on initial screen state
}

async function requestScreenShare() {
    setupState.screen = false; // Assume not complete
    updateSetupUI(); // Update UI to reflect incomplete state
    screenStatus.textContent = 'Requesting share permissions…';
    stopScreenSharePreview();
    try {
        screenShareStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenPreview.srcObject = screenShareStream;
        screenStatus.textContent = 'Screen sharing granted.';
        setupState.screen = true; // Screen share successful
    } catch (error) {
        screenStatus.textContent = `Screen share cancelled: ${error.message}`;
        setupState.screen = false; // Screen share failed
    } finally {
        updateSetupUI(); // Always update UI after screen share result
    }
}

function stopScreenSharePreview() {
    if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
        screenShareStream = null;
    }
    if (screenPreview) {
        screenPreview.srcObject = null;
    }
}

// ===== Device setup flow =====
async function completeSetupFlow(isBypass = false) { // Added isBypass parameter
    setupComplete = true;
    localStorage.setItem('interviewSetupComplete', 'true'); // Persist state

    // --- Start Media and Recorders ---
    // AWAIT this crucial step to ensure media is ready before proceeding
    const mediaActivated = await activateMediaAndRecorders();

    if (!mediaActivated && !isBypass) {
        // If media activation failed (and it's not a bypass/reload from storage)
        // then don't proceed to the main interview.
        alert('Failed to activate camera/microphone for the interview. Please check permissions and try again.');
        setupOverlay.classList.remove('hidden'); // Keep setup visible for retry
        setupComplete = false; // Reset state
        localStorage.setItem('interviewSetupComplete', 'false');
        return; // Stop function execution
    }

    // --- Hide Setup Overlay ---
    setupOverlay.classList.add('hidden');

    // --- Clear bandwidth interval if active ---
    if (bandwidthInterval) {
        clearInterval(bandwidthInterval);
        bandwidthInterval = null;
    }

    // --- Cleanup resources from setup steps ---
    cleanupStepResources('camera');
    cleanupStepResources('microphone');
    cleanupStepResources('screen');
    addInsight('Device setup complete • Camera, microphone, speaker, and screen permissions are ready.');

    // --- DIRECTLY START THE INTERVIEW FLOW (replaces startBtn click) ---
    // Reset flow counters and UI elements
    answeredCount = 0;
    currentQuestionIndex = 0;
    sentimentHistory = [];
    latestTranscript = '';
    askedQuestions = []; // Reset asked questions for new interview
    codingSectionActive = false; // Reset coding section
    codingQuestionCount = 0; // Reset coding question count
    currentCodingLanguage = null; // Reset coding language
    if (analyticsFeed) {
        analyticsFeed.innerHTML = '';
    }
    updateQuestionProgress();
    // Sentiment UI removed
    updateTranscriptDisplay('Calibrating microphone…');

    // Enable stop and download buttons, and user input
    stopBtn.disabled = false;
    resumeBtn.disabled = true;
    downloadBtn.disabled = true; // Still disabled until recording actually stops

    userInput.disabled = false;
    sendBtn.disabled = false;

    if (voiceToggle && speechSupported) {
        voiceToggle.disabled = false;
        setVoicePreference(true);
    }
    initSpeechRecognition();
    startSpeechRecognition();
    addInsight('Interview started • AI dialogue and tracking are live.');

    // Start interview with a dynamic question
    const initialQuestion = "Hello! Welcome to the interview. Let's start with a simple introduction. Can you tell me about yourself?";
    setTimeout(() => {
        addMessage('bot', initialQuestion);
        speakQuestion(initialQuestion);
        lastPrompt = initialQuestion;
        currentQuestionIndex++;
    }, 300);
    // --- END DIRECT INTERVIEW START ---
}

// Ensure initSetupFlow is called when the DOM is ready
document.addEventListener('DOMContentLoaded', initSetupFlow);

// ===== Performance report =====
function showPerformanceReport() {
    if (!reportOverlay) return;
    // Reset reportShown flag if needed
    reportShown = false;
    
    const totalSamples = Object.values(evaluationCategories).reduce((acc, cat) => acc + cat.samples, 0);
    // Show report even if no samples (interview was too short)
    if (totalSamples === 0) {
        addInsight('Interview completed but no answers were evaluated. Showing summary anyway.');
    }
    const totalScore = Object.values(evaluationCategories).reduce((acc, cat) => acc + cat.score, 0);
    const overall = totalSamples ? (totalScore / totalSamples).toFixed(1) : '0';

    const elapsedMs = startTime ? Date.now() - startTime : 0;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);

    reportCandidateName.textContent = candidateProfile.name;
    reportInterviewName.textContent = candidateProfile.interviewName;
    reportOverallScore.textContent = `${overall}/10`;
    reportTotalTime.textContent = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    reportQuestionCount.textContent = answeredCount;

    reportCategoryList.innerHTML = '';
    Object.entries(evaluationCategories).forEach(([id, cat]) => {
        const average = cat.samples ? (cat.score / cat.samples).toFixed(1) : '0.0';
        const criteriaMet = cat.criteriaMet || 0;
        const criteriaTotal = cat.criteriaTotal || (evaluationRubric[id]?.length || 0);
        const card = document.createElement('div');
        card.className = 'report-category-card';
        card.innerHTML = `
            <div class="category-info">
                <h4>${cat.label}</h4>
                <p class="report-label">Candidate Score</p>
                <p class="report-criteria">Criteria: ${criteriaMet}/${criteriaTotal}</p>
            </div>
            <div class="score-ring">${average}</div>
        `;
        reportCategoryList.appendChild(card);
    });

    reportOverlay.classList.remove('hidden');
    reportShown = true;
}

// Show completion popup with feedback form
function showCompletionPopup() {
    if (!completionOverlay) return;
    completionOverlay.classList.remove('hidden');
    // Reset form
    if (feedbackForm) {
        feedbackForm.reset();
    }
}

// Handle feedback submission
function handleFeedbackSubmit() {
    const formData = new FormData(feedbackForm);
    const rating = formData.get('rating');
    const comments = document.getElementById('feedbackComments')?.value || '';
    
    if (!rating) {
        alert('Please select a rating before submitting.');
        return;
    }
    
    // Save feedback (you can send this to a server)
    const feedback = {
        rating: parseInt(rating),
        comments: comments,
        timestamp: new Date().toISOString(),
        candidateName: candidateProfile.name,
        interviewName: candidateProfile.interviewName,
        totalQuestions: answeredCount,
        totalTime: reportTotalTime?.textContent || 'N/A'
    };
    
    console.log('Feedback submitted:', feedback);
    
    // You can send this to your backend API here
    // fetch('/api/feedback', { method: 'POST', body: JSON.stringify(feedback) });
    
    // Close popup and show final message (no alert, smoother transition)
    completionOverlay?.classList.add('hidden');
    
    // Small delay for smooth transition
    setTimeout(() => {
        showInterviewCompleteMessage();
    }, 300);
}

// Show final completion message
function showInterviewCompleteMessage() {
    // Hide all other overlays
    if (completionOverlay) completionOverlay.classList.add('hidden');
    if (reportOverlay) reportOverlay.classList.add('hidden');
    if (codingOverlay) codingOverlay.classList.add('hidden');
    
    // Show final completion screen
    if (finalCompletionScreen) {
        finalCompletionScreen.classList.remove('hidden');
        
        // Hide the main content
        const mainContent = document.querySelector('.main-content');
        const header = document.querySelector('header');
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Stop all recording and timers
        if (isRecording) {
            stopBtn.click(); // Trigger stop to clean up resources
        }
    }
    
    addInsight('Interview session ended. Final completion screen displayed.');
}

function downloadPerformanceReport() {
    const summary = {
        candidate: candidateProfile.name,
        interview: candidateProfile.interviewName,
        overallScore: reportOverallScore.textContent,
        totalTime: reportTotalTime.textContent,
        questions: answeredCount,
        categories: Object.entries(evaluationCategories).map(([id, cat]) => ({
            id,
            label: cat.label,
            average: cat.samples ? (cat.score / cat.samples).toFixed(1) : '0.0',
            responses: performanceHistory.filter(entry => entry.categoryId === id)
        }))
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_report_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// --- STEP 3: ADDITION ---
/**
 * Generates the next question using an external AI service based on the candidate's last answer.
 * @param {string} answerText The candidate's last response.
 */
async function generateAIQuestion(answerText) {
    // Prevent multiple simultaneous calls
    if (isGeneratingQuestion) {
        console.log("Question generation already in progress, skipping...");
        return;
    }
    
    // If quota exceeded, use fallback immediately (don't even try API)
    if (apiQuotaExceeded) {
        console.log("API quota exceeded, using fallback question");
        useFallbackQuestion(answerText);
        return;
    }
    
    // Prevent error message spam (don't show error more than once per 10 seconds)
    const now = Date.now();
    if (now - lastErrorTime < 10000) {
        console.log("Recent error occurred, using fallback question instead");
        useFallbackQuestion(answerText);
        return;
    }
    
    isGeneratingQuestion = true;
    
    try {
        const prompt = `
You are an AI Interviewer. Ask the next interview question based ONLY on the candidate's last answer.

Candidate answer:
"${answerText}"

Guidelines:
- Ask ONLY ONE question at a time
- Be conversational and natural
- No greetings, no extra comments
- Make each question relevant to the candidate's previous answer
- Keep it short and professional
        `;

        let nextQuestion = null;
        
        // Try backend API endpoint (which uses server-side API key from .env)
        nextQuestion = await generateWithBackendAPI(answerText);
        
        if (nextQuestion) {
            // Success - display the question
            addMessage("bot", nextQuestion);
            speakQuestion(nextQuestion);
            lastPrompt = nextQuestion;
            // Track this question to avoid repetition
            if (!askedQuestions.includes(nextQuestion)) {
                askedQuestions.push(nextQuestion);
            }
            lastErrorTime = 0; // Reset error time on success
            apiQuotaExceeded = false; // Reset quota flag on success
        } else {
            throw new Error("Failed to generate question from API");
        }
        
    } catch (err) {
        console.error("AI question error:", err);
        lastErrorTime = now;
        
        // Check if it's a 429 error (quota exceeded)
        if (err.message.includes('429') || err.message.includes('quota')) {
            apiQuotaExceeded = true;
            addInsight('Gemini API quota exceeded. Using fallback questions.');
            console.warn("API quota exceeded - will use fallback questions from now on");
        } else if (err.message.includes('not configured')) {
            // API key not set - this is expected, just use fallback
            console.log("Gemini API key not set, using fallback questions");
        }
        
        useFallbackQuestion(answerText);
    } finally {
        isGeneratingQuestion = false;
    }
}

// Generate question using backend API (secure - API key stays on server)
async function generateWithBackendAPI(answerText) {
    const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answerText })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || errorData.error || '';
        
        if (response.status === 429) {
            throw new Error(`API quota exceeded (429). ${errorMsg}`);
        }
        
        if (response.status === 500 && errorMsg.includes('not configured')) {
            throw new Error("Gemini API key not configured on server. Please set GEMINI_API_KEY in .env file.");
        }
        
        throw new Error(`API call failed with status: ${response.status}. ${errorMsg}`);
    }

    const data = await response.json();
    return data.question || null;
}

// Check API status (API key is now on server, not client)
window.getApiStatus = async () => {
    try {
        const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answerText: 'test' })
        });
        
        if (response.status === 500) {
            const data = await response.json();
            if (data.error && data.error.includes('not configured')) {
                return {
                    provider: 'gemini',
                    quotaExceeded: false,
                    hasApiKey: false,
                    message: 'API key not configured on server. Set GEMINI_API_KEY in .env file.'
                };
            }
        }
        
        return {
            provider: 'gemini',
            quotaExceeded: response.status === 429,
            hasApiKey: response.status !== 500
        };
    } catch (error) {
        return {
            provider: 'gemini',
            quotaExceeded: false,
            hasApiKey: false,
            error: error.message
        };
    }
};

// Fallback question generator when API fails
function useFallbackQuestion(answerText) {
    let nextQuestion;
    const lowerAnswer = answerText.toLowerCase();
    const words = lowerAnswer.split(/\s+/);
    
    // Generate contextually relevant questions based on answer
    const candidateQuestions = [];
    
    // Check for Python mentions
    if (lowerAnswer.includes('python')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('python'))) {
            candidateQuestions.push("You mentioned Python. Can you tell me about a specific Python project you've worked on?");
            candidateQuestions.push("What Python libraries or frameworks are you most comfortable with?");
            candidateQuestions.push("Can you explain a Python problem you solved recently?");
        }
    }
    
    // Check for SQL mentions
    if (lowerAnswer.includes('sql')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('sql'))) {
            candidateQuestions.push("You mentioned SQL. What's the most complex SQL query you've written?");
            candidateQuestions.push("Can you describe a database optimization challenge you've faced?");
        }
    }
    
    // Check for JavaScript mentions
    if (lowerAnswer.includes('javascript') || lowerAnswer.includes('js')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('javascript'))) {
            candidateQuestions.push("You mentioned JavaScript. What JavaScript frameworks or libraries have you used?");
            candidateQuestions.push("Can you explain a JavaScript concept you find interesting?");
        }
    }
    
    // Check for project mentions
    if (lowerAnswer.includes('project') || lowerAnswer.includes('built') || lowerAnswer.includes('developed') || 
        lowerAnswer.includes('created') || lowerAnswer.includes('application') || lowerAnswer.includes('assistant')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('project') || q.toLowerCase().includes('role'))) {
            candidateQuestions.push("That project sounds interesting. What was your specific role and contribution?");
            candidateQuestions.push("What technologies did you use in that project?");
            candidateQuestions.push("What was the biggest challenge you faced while working on that project?");
            candidateQuestions.push("What was the outcome or impact of that project?");
        }
    }
    
    // Check for experience/internship
    if (lowerAnswer.includes('internship') || lowerAnswer.includes('experience') || lowerAnswer.includes('worked')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('experience') || q.toLowerCase().includes('internship'))) {
            candidateQuestions.push("Can you tell me more about your internship experience?");
            candidateQuestions.push("What did you learn from that experience?");
            candidateQuestions.push("What was the most valuable skill you gained?");
        }
    }
    
    // Check for skills
    if (lowerAnswer.includes('skill') || lowerAnswer.includes('technical') || lowerAnswer.includes('problem solving')) {
        if (!askedQuestions.some(q => q.toLowerCase().includes('skill') || q.toLowerCase().includes('applied'))) {
            candidateQuestions.push("Can you give me a concrete example of how you've applied those skills?");
            candidateQuestions.push("What's a real-world problem you solved using those skills?");
        }
    }
    
    // If we have candidate questions that haven't been asked, use one
    const unaskedQuestions = candidateQuestions.filter(q => !askedQuestions.includes(q));
    if (unaskedQuestions.length > 0) {
        nextQuestion = unaskedQuestions[0];
    } else {
        // Use context-based questions
        if (lowerAnswer.includes('education') || lowerAnswer.includes('btech') || lowerAnswer.includes('engineering')) {
            if (!askedQuestions.some(q => q.toLowerCase().includes('motivated') || q.toLowerCase().includes('pursue'))) {
                nextQuestion = "What motivated you to pursue this field of study?";
            } else if (!askedQuestions.some(q => q.toLowerCase().includes('challenging') || q.toLowerCase().includes('difficult'))) {
                nextQuestion = "What was the most challenging aspect of your studies?";
            } else {
                nextQuestion = "How do you plan to apply your education in your career?";
            }
        } else if (words.length < 8) {
            nextQuestion = "I'd like to hear more details. Could you elaborate on that?";
        } else {
            // Progressive questions based on question count
            const progressiveQuestions = [
                "That's interesting. Can you provide more specific details?",
                "What was the outcome or result of that?",
                "How did that experience help you grow professionally?",
                "What would you do differently if you had the chance?",
                "What's the most important lesson you learned from that?",
                "How does that relate to your career goals?",
                "Can you walk me through the process step by step?",
                "What challenges did you encounter and how did you overcome them?"
            ];
            
            // Pick a question that hasn't been asked
            const availableQuestions = progressiveQuestions.filter(q => !askedQuestions.includes(q));
            if (availableQuestions.length > 0) {
                nextQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
            } else {
                // All questions asked, use a generic one
                nextQuestion = "Thank you for sharing. Is there anything else you'd like to add?";
            }
        }
    }
    
    // Track this question to avoid repetition
    if (nextQuestion && !askedQuestions.includes(nextQuestion)) {
        askedQuestions.push(nextQuestion);
    }
    
    addMessage("bot", nextQuestion);
    speakQuestion(nextQuestion);
    lastPrompt = nextQuestion;
    addInsight('Using fallback question (API unavailable).');
}

// Start coding section
function startCodingSection() {
    if (codingSectionActive) return;
    
    codingSectionActive = true;
    addMessage('bot', "Great! We've completed the initial questions. Now let's move on to the coding section where you'll solve some programming problems.");
    speakQuestion("Great! We've completed the initial questions. Now let's move on to the coding section where you'll solve some programming problems.");
    addInsight('Transitioning to coding section...');
    
    // Show coding overlay
    if (codingOverlay) {
        codingOverlay.classList.remove('hidden');
    }
    
    // Start with Python
    askCodingQuestion('python');
}

// Ask a coding question
function askCodingQuestion(language) {
    currentCodingLanguage = language;
    
    const pythonQuestions = [
        {
            question: "Write a Python function that takes a list of numbers and returns the sum of all even numbers in the list.",
            example: "Example: sum_even([1, 2, 3, 4, 5, 6]) should return 12",
            starterCode: "def sum_even(numbers):\n    # Your code here\n    pass\n\n# Test your function\nprint(sum_even([1, 2, 3, 4, 5, 6]))"
        },
        {
            question: "Write a Python function that checks if a string is a palindrome (reads the same forwards and backwards).",
            example: "Example: is_palindrome('racecar') should return True, is_palindrome('hello') should return False",
            starterCode: "def is_palindrome(s):\n    # Your code here\n    pass\n\n# Test your function\nprint(is_palindrome('racecar'))\nprint(is_palindrome('hello'))"
        },
        {
            question: "Write a Python function that finds the maximum number in a list without using the built-in max() function.",
            example: "Example: find_max([3, 7, 2, 9, 1]) should return 9",
            starterCode: "def find_max(numbers):\n    # Your code here\n    pass\n\n# Test your function\nprint(find_max([3, 7, 2, 9, 1]))"
        }
    ];
    
    const sqlQuestions = [
        {
            question: "Write a SQL query to find all employees who have a salary greater than 50000 and work in the 'Engineering' department.",
            example: "Table: employees (id, name, salary, department)",
            starterCode: "-- Write your SQL query here\nSELECT * FROM employees\nWHERE salary > 50000 AND department = 'Engineering';"
        },
        {
            question: "Write a SQL query to find the average salary for each department.",
            example: "Table: employees (id, name, salary, department)",
            starterCode: "-- Write your SQL query here\nSELECT department, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department;"
        },
        {
            question: "Write a SQL query to find the top 3 highest paid employees.",
            example: "Table: employees (id, name, salary)",
            starterCode: "-- Write your SQL query here\nSELECT * FROM employees\nORDER BY salary DESC\nLIMIT 3;"
        }
    ];
    
    let questionData;
    if (language === 'python') {
        questionData = pythonQuestions[(codingQuestionCount) % pythonQuestions.length];
        if (codingLanguageLabel) codingLanguageLabel.textContent = 'Python';
    } else {
        questionData = sqlQuestions[(codingQuestionCount) % sqlQuestions.length];
        if (codingLanguageLabel) codingLanguageLabel.textContent = 'SQL';
    }
    
    if (codingQuestionText) {
        codingQuestionText.innerHTML = `<strong>${questionData.question}</strong><br><br><em style="opacity: 0.8;">${questionData.example}</em>`;
    }
    
    if (codeEditor) {
        codeEditor.value = questionData.starterCode;
    }
    
    if (codeOutput) {
        codeOutput.textContent = 'Output will appear here after running your code...';
        codeOutput.style.color = '#d4d4d4';
    }
    
    if (codingSectionTitle) {
        codingSectionTitle.textContent = `${language.toUpperCase()} Coding Question ${codingQuestionCount + 1}`;
    }
    
    if (codingSectionSubtitle) {
        codingSectionSubtitle.textContent = `Solve the ${language} problem below`;
    }
}

// Execute code (Python or SQL)
async function executeCode() {
    if (!codeEditor || !codeOutput) return;
    
    const code = codeEditor.value.trim();
    if (!code) {
        codeOutput.textContent = 'Error: Please write some code first.';
        codeOutput.style.color = '#ff6b6b';
        return;
    }
    
    runCodeBtn.disabled = true;
    runCodeBtn.textContent = 'Running...';
    codeOutput.textContent = 'Executing code...';
    codeOutput.style.color = '#d4d4d4';
    
    try {
        let response;
        if (currentCodingLanguage === 'python') {
            response = await fetch('/api/execute-python', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
        } else {
            response = await fetch('/api/validate-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: code })
            });
        }
        
        const data = await response.json();
        
        if (data.success === false || data.error) {
            // Show error with better formatting
            codeOutput.textContent = data.output || data.message || 'Execution failed';
            codeOutput.style.color = '#ff6b6b';
            codeOutput.style.whiteSpace = 'pre-wrap';
        } else if (data.success === true) {
            // Show success
            codeOutput.textContent = data.output || 'Code executed successfully.';
            codeOutput.style.color = '#51cf66';
            codeOutput.style.whiteSpace = 'pre-wrap';
        } else {
            // Default case
            codeOutput.textContent = data.output || 'Code executed.';
            codeOutput.style.color = '#d4d4d4';
            codeOutput.style.whiteSpace = 'pre-wrap';
        }
    } catch (error) {
        codeOutput.textContent = `Error: ${error.message}`;
        codeOutput.style.color = '#ff6b6b';
    } finally {
        runCodeBtn.disabled = false;
        runCodeBtn.textContent = 'Run Code';
    }
}

// Submit coding answer
function submitCodingAnswer() {
    if (!codeEditor) return;
    
    const code = codeEditor.value.trim();
    if (!code) {
        alert('Please write some code before submitting.');
        return;
    }
    
    // Evaluate the code answer (don't call processAnswer to avoid triggering regular question flow)
    const category = currentCodingLanguage === 'python' ? 'pythonCoding' : 'sql';
    recordPerformanceMetric(category, code, 0, 'coding');
    
    // Add message to chat
    addMessage('user', `[${currentCodingLanguage.toUpperCase()} Code Submitted]`);
    addMessage('bot', `Thank you for submitting your ${currentCodingLanguage.toUpperCase()} solution.`);
    
    codingQuestionCount++;
    addInsight(`Submitted ${currentCodingLanguage.toUpperCase()} coding solution (${codingQuestionCount}/${MAX_CODING_QUESTIONS}).`);
    
    // Move to next coding question or finish
    if (codingQuestionCount < MAX_CODING_QUESTIONS) {
        // Switch between Python and SQL
        const nextLanguage = currentCodingLanguage === 'python' ? 'sql' : 'python';
        setTimeout(() => {
            askCodingQuestion(nextLanguage);
        }, 1000);
    } else {
        // Coding section complete
        finishCodingSection();
    }
}

// Skip coding section
function skipCodingSection() {
    if (confirm('Are you sure you want to skip the coding section? You can still complete the interview.')) {
        codingOverlay?.classList.add('hidden');
        codingSectionActive = false;
        endInterviewAutomatically();
    }
}

// Finish coding section
function finishCodingSection() {
    codingOverlay?.classList.add('hidden');
    codingSectionActive = false;
    
    addMessage('bot', 'Excellent! You\'ve completed the coding section. Let me prepare your performance report.');
    speakQuestion('Excellent! You\'ve completed the coding section. Let me prepare your performance report.');
    addInsight('Coding section completed. Generating performance report...');
    
    setTimeout(() => {
        endInterviewAutomatically();
    }, 2000);
}
// --- END ADDITION ---