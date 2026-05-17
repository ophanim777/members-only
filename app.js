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