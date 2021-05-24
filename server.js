const express = require("express");
const app = express();
const path = require("path");
const cors = require('cors')
const twitchWebhook = require('twitch-webhook')
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");




app.use(cors())


app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf
    }
  }))


app.use('/channels',require('./routes/Channels'));
app.use('/Twitter',require('./routes/Twitter'));
app.use('/Youtube',require('./routes/Youtube'));


// Serve static assets if in production
if (process.env.NODE_ENV === "production") {

 
  app.use(express.static("client/build"));

  
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "build", "index.html"));
  });
}

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Server Listening on ${port}`)
});