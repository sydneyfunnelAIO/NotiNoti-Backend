const express = require("express");
const router = express.Router();
const axios = require("axios");
const CryptoJS = require("crypto-js");
const admin = require("firebase-admin");
const serviceAccount = require("../notinoti-524fc-firebase-adminsdk-4qgvv-bdeabf5743.json");

const { TOKEN, SERVER_API } = require("../Config");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const onRegister = (req, res) => {
  let isExists = db.collection("Channels").doc(req.body.channelName).get();

  isExists.then((doc) => {
    if (doc.exists) {
      let users = doc.data().Users;
      if (!users.includes(req.body.userId)) {
        db.collection("Channels")
          .doc(req.body.channelName)
          .update({
            Users: [...users, req.body.userId],
          });
      } else {
      }
    } else {
      axios
        .get(
          `https://api.twitch.tv/kraken/users?login=${req.body.channelName}`,
          {
            headers: {
              Accept: `application/vnd.twitchtv.v5+json`,
              "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
            },
          }
        )
        .then((resp) => {
          axios
            .get(
              `https://api.twitch.tv/helix/streams?user_login=${req.body.channelName}`,
              {
                headers: {
                  "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
                  Authorization: `Bearer ${TOKEN}`,
                },
              }
            )
            .then((respon) => {
              if (respon.data.data.length > 0) {
                db.collection("Channels")
                  .doc(req.body.channelName)
                  .set({
                    ChannelId: resp.data.users[0]._id,
                    ChannelName: req.body.channelName,
                    Users: [req.body.userId],
                    reachedMessages: [],
                    ChannelPic: resp.data.users[0].logo,
                    type: "live",
                  })
                  .then(() => {
                    axios
                        .post(
                          "https://api.twitch.tv/helix/eventsub/subscriptions",
                          {
                            type: "stream.online",
                            version: "1",
                            condition: {
                              broadcaster_user_id: resp.data.users[0]._id,
                            },
                            transport: {
                              method: "webhook",
                              callback: `${SERVER_API}/verify`,
                              secret: "123352462462",
                            },
                          },
                          {
                            headers: {
                              "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
                              Authorization: `Bearer ${TOKEN}`,
                              "Content-Type": "application/json",
                            },
                          }
                        )
                        .then((e) =>
                          axios
                            .post(
                              "https://api.twitch.tv/helix/eventsub/subscriptions",
                              {
                                type: "stream.offline",
                                version: "1",
                                condition: {
                                  broadcaster_user_id: resp.data.users[0]._id,
                                },
                                transport: {
                                  method: "webhook",
                                  callback: `${SERVER_API}/verify`,
                                  secret: "123352462462",
                                },
                              },
                              {
                                headers: {
                                  "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
                                  Authorization: `Bearer ${TOKEN}`,
                                  "Content-Type": "application/json",
                                },
                              }
                            )
                            .then(
                              (e) =>
                                new Promise((resolve) => {
                                  return resolve;
                                })
                            )
                            .catch((e) => {
                              throw new Error(e);
                            })
                        )
                        .catch((e) => {
                          throw new Error(e);
                        });
                  });
              } else {
                try {
                  console.log(TOKEN);
                  db.collection("Channels")
                    .doc(req.body.channelName)
                    .set({
                      ChannelId: resp.data.users[0]._id,
                      ChannelName: req.body.channelName,
                      Users: [req.body.userId],
                      reachedMessages: [],
                      ChannelPic: resp.data.users[0].logo,
                      type: "",
                    })
                    .then(() => {
                      axios
                        .post(
                          "https://api.twitch.tv/helix/eventsub/subscriptions",
                          {
                            type: "stream.online",
                            version: "1",
                            condition: {
                              broadcaster_user_id: resp.data.users[0]._id,
                            },
                            transport: {
                              method: "webhook",
                              callback: `${SERVER_API}/verify`,
                              secret: "123352462462",
                            },
                          },
                          {
                            headers: {
                              "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
                              Authorization: `Bearer ${TOKEN}`,
                              "Content-Type": "application/json",
                            },
                          }
                        )
                        .then((e) =>
                          axios
                            .post(
                              "https://api.twitch.tv/helix/eventsub/subscriptions",
                              {
                                type: "stream.offline",
                                version: "1",
                                condition: {
                                  broadcaster_user_id: resp.data.users[0]._id,
                                },
                                transport: {
                                  method: "webhook",
                                  callback: `${SERVER_API}/verify`,
                                  secret: "123352462462",
                                },
                              },
                              {
                                headers: {
                                  "Client-ID": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
                                  Authorization: `Bearer ${TOKEN}`,
                                  "Content-Type": "application/json",
                                },
                              }
                            )
                            .then(
                              (e) =>
                                new Promise((resolve) => {
                                  return resolve;
                                })
                            )
                            .catch((e) => {
                              throw new Error(e);
                            })
                        )
                        .catch((e) => {
                          throw new Error(e);
                        });
                    });
                } catch (error) {
                  // console.log(error);
                }
              }
            });
        });
    }
  });
};

router.post("/verify", (req, res) => {
  console.log(req.body);
  if (typeof req.body.challenge !== "undefined") {
    let hmac_message =
      req.headers["twitch-eventsub-message-id"] +
      req.headers["twitch-eventsub-message-timestamp"] +
      req.rawBody;
    let signature =
      "sha256=" + CryptoJS.HmacSHA256(hmac_message, "123352462462");
    if (signature !== req.headers["twitch-eventsub-message-signature"]) {
      res.status(403);
    } else {
      res.send(req.body.challenge);
    }
  } else if (
    typeof req.body.event !== "undefined" &&
    req.body.subscription.type == "stream.online"
  ) {
    let event = req.body.event;
    let data = db
      .collection("Channels")
      .doc(event.broadcaster_user_name.toLowerCase())
      .get();
    data.then((doc) => {
      let reached = doc.data().reachedMessages;
      let users = doc.data().Users;
      if (reached.includes(event.id)) {
        // do not send notification.
      } else {
        //TODO: Send Notification
        let tokens = users.map((user) => {
          return user;
        });

        admin.messaging().sendMulticast({
          tokens,
          data: {
            body: `${event.broadcaster_user_name} is Live! `,
            title: event.broadcaster_user_name,
            image: doc.data().ChannelPic,
            router: event.broadcaster_user_name,
            tag: "twitch",
          },
          android: {
            priority: "high",
          },
          priority: "high",
          show_in_foreground: true,
          color: "#16e6b4",
          sound: "default",
        });
        db.collection("Channels")
          .doc(event.broadcaster_user_name.toLowerCase())
          .update({
            reachedMessages: [...reached, event.id],
            type: event.type,
          });
        res.status(200).send("200");
      }
    });
  } else if (
    typeof req.body.event !== "undefined" &&
    req.body.subscription.type == "stream.offline"
  ) {
    let event = req.body.event;

    db.collection("Channels")
      .doc(event.broadcaster_user_name.toLowerCase())
      .update({
        type: "",
      })
      .then((resp) => {
        res.status(200).send("200");
      });
  }
});
router.post("/register", (req, res) => {
  try {
    onRegister(req, res).then(() => {
      res.status(200).json({ success: true });
    });
  } catch (error) {
    res.status(200).json(error);
  }
});

router.post("/registerUser", (req, res) => {
  let data = req.body;
  console.log(SERVER_API);

  db.collection("Users")
    .doc(`${data.userId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        db.collection("Users")
          .doc(`${data.userId}`)
          .set({
            userId: data.userId,
            channels: [data.channelName],
            Twitter: [],
            Youtube: [],
          })
          .then(() =>
            axios
              .post(`${SERVER_API}/register`, {
                userId: data.userId,
                channelName: data.channelName,
              })
              .then(() => {
                res.status(200).json({ success: true });
              })
          );
      } else {
        let arr = doc.data().channels;
        if (arr.includes(data.channelName)) {
          res.json({
            success: false,
            msg: "This Channel already Exists",
          });
        } else {
          db.collection("Users")
            .doc(`${data.userId}`)
            .update({
              channels: [...arr, data.channelName],
            })
            .then(() => {
              axios
                .post(`${SERVER_API}/register`, {
                  userId: data.userId,
                  channelName: data.channelName,
                })
                .then(() => {
                  res.status(200).json({ success: true });
                });
            });
        }
      }
    });
});
router.post("/deleteUser", (req, res) => {
  let userId = req.body.userId;
  let channel = req.body.channelName;
  db.collection("Users")
    .doc(userId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        let newData = doc.data().channels.filter((flt) => flt !== channel);
        db.collection("Users")
          .doc(userId)
          .update({
            channels: [...newData],
          })
          .then(() => {
            db.collection("Channels")
              .doc(channel)
              .get()
              .then((doc) => {
                if (doc.exists) {
                  let newData = doc
                    .data()
                    .Users.filter((flt) => flt !== userId);
                  db.collection("Channels")
                    .doc(channel)
                    .update({
                      Users: [...newData],
                    })
                    .then(() => {
                      res.status(200).json({ success: true });
                    })
                    .catch((e) =>
                      res.status(400).json({ success: false, msg: e })
                    );
                } else {
                  res.status(400).json({
                    success: false,
                    msg: "There is No Users Called that",
                  });
                }
              });
          })
          .catch((e) => res.status(400).json({ success: false, msg: e }));
      } else {
        res
          .status(400)
          .json({ success: false, msg: "There is No Users Called that" });
      }
    });
});

router.get("/getUser/:userId", (req, res) => {
  const id = req.params.userId;
  console.log(id);
  db.collection("Users")
    .doc(`${id}`)
    .get()
    .then((resp) => {
      res.json({
        channels: resp.data().channels,
        userId: resp.data().userId,
        Twitter: resp.data().Twitter,
        Youtube: resp.data().Youtube,
        success: true,
      });
    });
});
router.get("/getChannel/:name", (req, res) => {
  let channelName = req.params.name;

  db.collection("Channels")
    .doc(channelName)
    .get()
    .then((doc) => {
      if (doc.exists) {
        res.json({
          channelName: doc.data().ChannelName,
          type: doc.data().type,
          ChannelPic: doc.data().ChannelPic,
          success: true,
        });
      } else {
        res.status(200).json({ success: false });
      }
    });
});
router.get("/DeleteAll", (req, res) => {
  let config = {
    method: "get",
    url: "https://api.twitch.tv/helix/eventsub/subscriptions",
    headers: {
      "client-id": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  axios(config)
    .then((response) => {
      response.data.data.map((resp) => {
        let con = {
          method: "delete",
          url: `https://api.twitch.tv/helix/eventsub/subscriptions?id=${resp.id}`,
          headers: {
            "client-id": "ne63ji40tcy0jfrvc4qlofq0ryx1m8",
            Authorization: `Bearer ${TOKEN}`,
          },
        };

        axios(con)
          .then(function (response) {
            console.log(JSON.stringify(response.data));
          })
          .catch(function (error) {
            console.log(error);
          });
      });
    })
    .catch(function (error) {
      console.log(error);
    });
});
module.exports = router;
