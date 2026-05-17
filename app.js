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
