require("dotenv").config();

const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const bcrypt = require("bcryptjs");

const { body, validationResult } = require("express-validator");

const pool = require("./db/pool");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool: pool,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
     {
      usernameField: "email",
    },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );

        const user = result.rows[0];

         if (!user) {
          return done(null, false, {
            message: "Incorrect email",
          });
        }


        const match = await bcrypt.compare(password, user.password);


        if (!match) {
         return done(null, false, {
            message: "Incorrect password",
        });
        }

        return done(null, user);
        } catch (err) {
        return done(err);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
     done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

app.get("/", async (req, res) => {
  const result = await pool.query(`
    SELECT messages.*, users.first_name, users.last_name
    FROM messages
    JOIN users
    ON messages.author_id = users.id
    ORDER BY created_at DESC
  `);

  res.render("index", {
    user: req.user,
    messages: result.rows,
  });
});


app.get("/sign-up", (req, res) => {
  res.render("sign-up");
});

app.post(
  "/sign-up",
   [
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
    body("email").isEmail(),
    body("password")
      .isLength({ min: 5 }),

      body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }

      return true;
    }),
  ],

  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.send(errors.array());
    }

    const hashedPassword = await bcrypt.hash(
  req.body.password,
  10
);