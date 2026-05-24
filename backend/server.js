require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const sound = require('sound-play');
const { EdgeTTS } = require('node-edge-tts');
const osTools = require('./tools');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize Edge Neural TTS with a British English voice
const tts = new EdgeTTS({
  voice: 'en-GB-RyanNeural', // High quality British English male neural voice
  lang: 'en-GB',
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online' });
});

app.post('/api/chat', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const groqToolsSchema = [
    {
      type: "function",
      function: {
        name: "open_websites",
        description: "Opens one or multiple website URLs in the default browser. ALWAYS use this for websites like YouTube, Netflix, Instagram, Facebook, Google, etc.",
        parameters: {
          type: "object",
          properties: { 
            urls: { 
              type: "array", 
              items: { type: "string" },
              description: "An array of full URLs to open (e.g. ['https://www.youtube.com', 'https://www.instagram.com'])" 
            } 
          },
          required: ["urls"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "close_tabs",
        description: "Closes a specific number of tabs in Google Chrome.",
        parameters: {
          type: "object",
          properties: { count: { type: "integer", description: "Number of tabs to close" } },
          required: ["count"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "open_application",
        description: "Opens a local desktop application (e.g., capcut, calculator, notepad). Do NOT use this for websites like Netflix or YouTube.",
        parameters: {
          type: "object",
          properties: { app_name: { type: "string", description: "The name of the app to open (e.g. capcut, calculator)" } },
          required: ["app_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "count_desktop_folders",
        description: "Counts the number of folders on the user's desktop.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "brave_search",
        description: "Searches the internet for facts, news, and information.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "The search query" } },
          required: ["query"]
        }
      }
    }
  ];

  try {
    let messages = [
      { role: "system", content: "You are J.A.R.V.I.S., a highly advanced, witty AI assistant. You have access to tools to control the computer. ALWAYS reply strictly in English. CRITICAL INSTRUCTION: You MUST strictly converse normally unless the user explicitly asks you to open a website, application, or perform a specific task. DO NOT call any tools for conversational greetings like 'hello' or 'can you hear me'. Keep your responses short." },
      { role: "user", content: text }
    ];

    // Initial non-streaming request to check for tool calls
    let response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages: messages,
      tools: groqToolsSchema,
      tool_choice: "auto"
    }, {
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    let responseMessage = response.data.choices[0].message;

    // Check if the AI wants to use a tool
    if (responseMessage.tool_calls) {
      messages.push(responseMessage); // Append assistant's tool call

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = "";
        let finalContent = "Task complete, sir.";

        console.log(`[J.A.R.V.I.S] Executing Tool: ${functionName}`, args);

        if (functionName === "open_websites") {
          let urlsArray = args.urls || (args.url ? [args.url] : []);
          if (!Array.isArray(urlsArray)) urlsArray = [urlsArray];
          toolResult = await osTools.openWebsites(urlsArray);
          finalContent = "Right away, sir. Opening the requested websites.";
        } else if (functionName === "close_tabs") {
          toolResult = await osTools.closeTabs(args.count);
          finalContent = `Closing ${args.count} tabs for you, sir.`;
        } else if (functionName === "open_application") {
          toolResult = await osTools.openApplication(args.app_name);
          finalContent = `Launching ${args.app_name} now, sir.`;
        } else if (functionName === "count_desktop_folders") {
          toolResult = await osTools.countDesktopFolders();
          finalContent = toolResult; // Speaks the actual count
        } else if (functionName === "brave_search") {
          finalContent = `I am unable to search the internet for that right now, sir, as my web module is disconnected.`;
        }

        // Halve the latency by completely skipping the second LLM call!
        return res.json({ response: finalContent });
      }
    }

    const finalContent = responseMessage.content || "Done, sir.";

    // Instantly return the full text to the frontend so it can use native local TTS with 0.0s latency!
    res.json({ response: finalContent });

  } catch (error) {
    console.error("Error connecting to Groq:", error.message);
    if (error.response && error.response.data) {
      console.error("Groq API Error Details:", JSON.stringify(error.response.data, null, 2));
    }
    
    // Instead of crashing the frontend with an ugly error, gracefully recover so J.A.R.V.I.S seamlessly speaks a fallback
    if (!res.headersSent) {
      res.json({ response: "I'm sorry sir, I encountered a slight static interference with my systems. Could you please repeat that?" });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S Backend running on http://localhost:${PORT}`);
});
