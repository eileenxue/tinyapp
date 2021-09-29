const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.set("view engine", "ejs");

// Simulate unique shortURL by returning a string of 6 random alphanumeric characters
function generateRandomString() {
  let string = Math.random().toString(36).substring(2, 8);
  return string;
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// change from url to urls
app.get('/urls', (req, res) => {
  const templateVars = { urls: urlDatabase, username: req.cookies["username"] };
  res.render("urls_index", templateVars)
})
 
app.get("/urls/new", (req, res) => {
  const templateVars = { username: req.cookies["username"] };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], username: req.cookies["username"] };
  res.render("urls_show", templateVars);
});

// Redirect the shortened URL to original longURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});

app.post("/urls", (req, res) => {
  // console.log(req.body);  // Log the POST request body to the console
  // res.send("Ok");  // Respond with 'Ok' (we will replace this)
  // res.status = 200;

  // Generate shortURL and then log that and longURL to urlDatabase
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;

  // Redirect page to shortURL
  res.redirect(`/urls/${shortURL}`);
});

// Delete the shortURL entry
app.post("/urls/:shortURL/delete", (req, res) => {
  const deleteURL = req.params.shortURL;
  delete urlDatabase[deleteURL];

  // Redirect back to index page
  res.redirect(`/urls`);
})

// Update/Edit URL
app.post("/urls/:shortURL", (req, res) => {
  // extract the shortURL 
  const shortURL = req.params.shortURL;

  // extract new URL content from the form's input's name => req.body
  const longURL = req.body.longURL;

  // update the longURL content in the db associated with that shortURL
  urlDatabase[shortURL] = longURL;

  res.redirect(`/urls`);
})

// Login Functionality
app.post("/login", (req, res) => {
  // Set cookie to username
  const username = req.body.username;
  res.cookie('username', username);

  // Redirect back to urls
  res.redirect(`/urls`);
})

// Logout Functionality
app.post("/logout", (req, res) => {
  // clears the username cookie
  res.clearCookie('username');
  // Redirect back to urls
  res.redirect(`/urls`); 
})


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});