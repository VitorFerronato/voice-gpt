const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({ apiKey: process.env.VUE_API_KEY });
const openai = new OpenAIApi(configuration);

const AWS = require("aws-sdk");
AWS.config.loadFromPath("awsCreds.json");

app.use(bodyParser.json());
app.use(cors({ origin: 'http://localhost:5173' })); // Adicionado: Permitir CORS apenas para o frontend
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos da pasta public

app.post('/api/text-to-audio-file', async (req, res) => {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: req.body.text }],
            max_tokens: 100,
            temperature: 0.5
        });

        let num = (Math.random() * 100000000).toFixed(0);

        const polly = new AWS.Polly({ region: "us-east-1" });
        const params = {
            OutputFormat: "mp3",
            Text: completion.data.choices[0].message.content,
            VoiceId: "Matthew"
        };

        polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                console.error("Polly error:", err);
                res.status(500).send("Error synthesizing speech");
                return;
            }

            let filePath = path.join(__dirname, "public/voice");
            let fileName = num + ".mp3";

            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, { recursive: true });
            }

            if (data.AudioStream) {
                fs.writeFileSync(path.join(filePath, fileName), data.AudioStream);
                res.status(200).json({ fileName: "/voice/" + fileName });
            } else {
                console.error("No audio stream received");
                res.status(500).send("No audio stream received");
            }
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send("Error generating completion");
    }
});

app.listen(4001, () => {
    console.log(`Server is ready at http://localhost:4001`);
});
